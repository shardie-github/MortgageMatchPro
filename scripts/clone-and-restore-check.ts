#!/usr/bin/env ts-node

/**
 * Disaster Recovery: Clone and Restore Check
 * 
 * This script performs disaster recovery rehearsals by:
 * 1. Creating a temporary shadow database
 * 2. Restoring from latest backup/PITR timestamp
 * 3. Running checksum validation on critical tables
 * 4. Generating a DR report
 */

import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

interface DRConfig {
  sourceProjectRef: string;
  shadowProjectRef?: string;
  checksumTables: string[];
  maxRestoreTimeMinutes: number;
  reportPath: string;
}

interface DRReport {
  timestamp: string;
  sourceProjectRef: string;
  shadowProjectRef: string;
  restoreTimeMs: number;
  checksumResults: Record<string, {
    sourceRows: number;
    shadowRows: number;
    checksumMatch: boolean;
    error?: string;
  }>;
  overallStatus: 'PASS' | 'FAIL' | 'PARTIAL';
  recommendations: string[];
}

class DRRehearsalManager {
  private sourceSupabase: any;
  private shadowSupabase: any;
  private sourcePrisma: PrismaClient;
  private shadowPrisma: PrismaClient;
  private config: DRConfig;

  constructor(config: DRConfig) {
    this.config = config;

    // Initialize source database connection
    this.sourceSupabase = createClient(
      `https://${config.sourceProjectRef}.supabase.co`,
      process.env.SUPABASE_SERVICE_KEY!
    );

    this.sourcePrisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.SUPABASE_URL || `postgresql://postgres:${process.env.SUPABASE_SERVICE_KEY}@db.${config.sourceProjectRef}.supabase.co:5432/postgres`
        }
      }
    });

    // Initialize shadow database connection (if provided)
    if (config.shadowProjectRef) {
      this.shadowSupabase = createClient(
        `https://${config.shadowProjectRef}.supabase.co`,
        process.env.SUPABASE_SERVICE_KEY!
      );

      this.shadowPrisma = new PrismaClient({
        datasources: {
          db: {
            url: `postgresql://postgres:${process.env.SUPABASE_SERVICE_KEY}@db.${config.shadowProjectRef}.supabase.co:5432/postgres`
          }
        }
      });
    }
  }

  async createShadowDatabase(): Promise<string> {
    console.log('🔄 Creating shadow database...');
    
    try {
      // Create a new Supabase project for shadow database
      const { data: project, error } = await this.sourceSupabase
        .from('projects')
        .insert({
          name: `dr-shadow-${Date.now()}`,
          region: 'us-east-1',
          plan: 'free'
        })
        .select()
        .single();

      if (error) throw error;

      console.log(`✅ Shadow database created: ${project.id}`);
      return project.id;

    } catch (error) {
      console.error('❌ Failed to create shadow database:', error);
      throw error;
    }
  }

  async restoreFromBackup(shadowProjectRef: string, restoreTime?: Date): Promise<number> {
    console.log('🔄 Restoring from backup...');
    
    const startTime = Date.now();

    try {
      // Get latest backup or PITR restore point
      const { data: backups, error: backupError } = await this.sourceSupabase
        .from('backups')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (backupError) {
        console.warn('No backup data found, using PITR...');
      }

      // Perform PITR restore to shadow database
      const { error: restoreError } = await this.sourceSupabase.rpc('restore_database', {
        target_project_ref: shadowProjectRef,
        restore_time: restoreTime?.toISOString() || new Date().toISOString(),
        source_project_ref: this.config.sourceProjectRef
      });

      if (restoreError) throw restoreError;

      const restoreTimeMs = Date.now() - startTime;
      console.log(`✅ Restore completed in ${restoreTimeMs}ms`);
      
      return restoreTimeMs;

    } catch (error) {
      console.error('❌ Restore failed:', error);
      throw error;
    }
  }

  async runChecksumValidation(shadowProjectRef: string): Promise<Record<string, any>> {
    console.log('🔍 Running checksum validation...');
    
    const results: Record<string, any> = {};

    for (const tableName of this.config.checksumTables) {
      try {
        console.log(`Checking table: ${tableName}`);
        
        // Get source table checksum
        const sourceChecksum = await this.getTableChecksum(tableName, this.sourcePrisma);
        
        // Get shadow table checksum
        const shadowPrisma = new PrismaClient({
          datasources: {
            db: {
              url: `postgresql://postgres:${process.env.SUPABASE_SERVICE_KEY}@db.${shadowProjectRef}.supabase.co:5432/postgres`
            }
          }
        });

        const shadowChecksum = await this.getTableChecksum(tableName, shadowPrisma);
        
        results[tableName] = {
          sourceRows: sourceChecksum.rowCount,
          shadowRows: shadowChecksum.rowCount,
          checksumMatch: sourceChecksum.checksum === shadowChecksum.checksum,
          sourceChecksum: sourceChecksum.checksum,
          shadowChecksum: shadowChecksum.checksum
        };

        await shadowPrisma.$disconnect();

      } catch (error) {
        console.error(`❌ Checksum validation failed for ${tableName}:`, error);
        results[tableName] = {
          sourceRows: 0,
          shadowRows: 0,
          checksumMatch: false,
          error: error.message
        };
      }
    }

    return results;
  }

  private async getTableChecksum(tableName: string, prisma: PrismaClient): Promise<{ rowCount: number; checksum: string }> {
    try {
      // Get row count
      const rowCountResult = await prisma.$queryRaw`SELECT COUNT(*) as count FROM ${tableName}`;
      const rowCount = parseInt((rowCountResult as any)[0].count);

      // Get checksum of all data
      const checksumResult = await prisma.$queryRaw`
        SELECT md5(string_agg(md5((${tableName}.*)::text), '')) as checksum 
        FROM ${tableName}
      `;
      const checksum = (checksumResult as any)[0].checksum;

      return { rowCount, checksum };

    } catch (error) {
      console.warn(`Could not get checksum for ${tableName}:`, error.message);
      return { rowCount: 0, checksum: '' };
    }
  }

  async cleanupShadowDatabase(shadowProjectRef: string): Promise<void> {
    console.log('🧹 Cleaning up shadow database...');
    
    try {
      // Delete the shadow project
      const { error } = await this.sourceSupabase
        .from('projects')
        .delete()
        .eq('id', shadowProjectRef);

      if (error) throw error;

      console.log('✅ Shadow database cleaned up');

    } catch (error) {
      console.warn('⚠️ Failed to cleanup shadow database:', error);
    }
  }

  generateDRReport(
    shadowProjectRef: string,
    restoreTimeMs: number,
    checksumResults: Record<string, any>
  ): DRReport {
    const timestamp = new Date().toISOString();
    const failedChecksums = Object.values(checksumResults).filter((r: any) => !r.checksumMatch);
    const overallStatus = failedChecksums.length === 0 ? 'PASS' : 
                         failedChecksums.length === Object.keys(checksumResults).length ? 'FAIL' : 'PARTIAL';

    const recommendations: string[] = [];
    
    if (overallStatus === 'FAIL') {
      recommendations.push('Critical: All checksums failed. Review backup integrity and restore process.');
    } else if (overallStatus === 'PARTIAL') {
      recommendations.push('Warning: Some checksums failed. Investigate specific table issues.');
    } else {
      recommendations.push('Success: All checksums passed. DR process is working correctly.');
    }

    if (restoreTimeMs > this.config.maxRestoreTimeMinutes * 60 * 1000) {
      recommendations.push(`Warning: Restore time (${restoreTimeMs}ms) exceeded target (${this.config.maxRestoreTimeMinutes} minutes).`);
    }

    return {
      timestamp,
      sourceProjectRef: this.config.sourceProjectRef,
      shadowProjectRef,
      restoreTimeMs,
      checksumResults,
      overallStatus,
      recommendations
    };
  }

  async saveDRReport(report: DRReport): Promise<void> {
    const reportPath = path.join(this.config.reportPath, `dr-report-${Date.now()}.json`);
    
    // Ensure directory exists
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    
    // Save JSON report
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Generate markdown report
    const markdownReport = this.generateMarkdownReport(report);
    const markdownPath = reportPath.replace('.json', '.md');
    fs.writeFileSync(markdownPath, markdownReport);
    
    console.log(`📄 DR report saved to: ${reportPath}`);
    console.log(`📄 Markdown report saved to: ${markdownPath}`);
  }

  private generateMarkdownReport(report: DRReport): string {
    return `# Disaster Recovery Report

**Generated**: ${report.timestamp}
**Source Project**: ${report.sourceProjectRef}
**Shadow Project**: ${report.shadowProjectRef}
**Overall Status**: ${report.overallStatus}

## Restore Performance
- **Restore Time**: ${report.restoreTimeMs}ms
- **Target Time**: ${this.config.maxRestoreTimeMinutes} minutes
- **Status**: ${report.restoreTimeMs <= this.config.maxRestoreTimeMinutes * 60 * 1000 ? '✅ PASS' : '❌ FAIL'}

## Checksum Validation Results

| Table | Source Rows | Shadow Rows | Checksum Match | Status |
|-------|-------------|-------------|----------------|--------|
${Object.entries(report.checksumResults).map(([table, result]: [string, any]) => 
  `| ${table} | ${result.sourceRows} | ${result.shadowRows} | ${result.checksumMatch ? '✅' : '❌'} | ${result.error || 'OK'} |`
).join('\n')}

## Recommendations
${report.recommendations.map(rec => `- ${rec}`).join('\n')}

## Next Steps
1. Review any failed checksums
2. Update DR procedures if needed
3. Schedule next DR rehearsal
4. Update runbooks based on findings
`;
  }

  async runDRRehearsal(): Promise<DRReport> {
    console.log('🚀 Starting DR Rehearsal');
    
    let shadowProjectRef = this.config.shadowProjectRef;
    let restoreTimeMs = 0;
    let checksumResults: Record<string, any> = {};

    try {
      // Create shadow database if not provided
      if (!shadowProjectRef) {
        shadowProjectRef = await this.createShadowDatabase();
      }

      // Restore from backup
      restoreTimeMs = await this.restoreFromBackup(shadowProjectRef);

      // Run checksum validation
      checksumResults = await this.runChecksumValidation(shadowProjectRef);

      // Generate report
      const report = this.generateDRReport(shadowProjectRef, restoreTimeMs, checksumResults);
      
      // Save report
      await this.saveDRReport(report);

      console.log(`🎉 DR Rehearsal completed with status: ${report.overallStatus}`);
      
      return report;

    } catch (error) {
      console.error('❌ DR Rehearsal failed:', error);
      throw error;
    } finally {
      // Cleanup shadow database if we created it
      if (!this.config.shadowProjectRef && shadowProjectRef) {
        await this.cleanupShadowDatabase(shadowProjectRef);
      }
      
      // Disconnect from databases
      await this.sourcePrisma.$disconnect();
      if (this.shadowPrisma) {
        await this.shadowPrisma.$disconnect();
      }
    }
  }
}

// CLI interface
if (require.main === module) {
  const config: DRConfig = {
    sourceProjectRef: process.env.SUPABASE_PROJECT_REF || 'ghqyxhbyyirveptgwoqm',
    shadowProjectRef: process.env.SHADOW_PROJECT_REF,
    checksumTables: [
      'users',
      'mortgage_applications',
      'broker_profiles',
      'rate_quotes',
      'analytics_events'
    ],
    maxRestoreTimeMinutes: 30,
    reportPath: './reports/dr'
  };

  const manager = new DRRehearsalManager(config);
  manager.runDRRehearsal().catch(console.error);
}

export { DRRehearsalManager };
