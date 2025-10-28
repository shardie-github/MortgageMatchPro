#!/usr/bin/env ts-node

/**
 * EMC (Expand/Migrate/Contract) Migration Script
 * 
 * This script implements the EMC pattern for safe database migrations:
 * 1. Expand: Add nullable columns, new tables, views
 * 2. Migrate: Backfill data in batches with retry/backoff
 * 3. Contract: Remove old columns after verification window
 */

import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

interface EMCStep {
  id: string;
  type: 'expand' | 'migrate' | 'contract';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  description: string;
  sql?: string;
  backfillScript?: string;
  verificationQuery?: string;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

interface MigrationConfig {
  batchSize: number;
  maxRetries: number;
  retryDelayMs: number;
  verificationWindowDays: number;
}

class EMCMigrationManager {
  private supabase: any;
  private prisma: PrismaClient;
  private config: MigrationConfig;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || process.env.SUPABASE_URL
        }
      }
    });

    this.config = {
      batchSize: 1000,
      maxRetries: 3,
      retryDelayMs: 5000,
      verificationWindowDays: 7
    };
  }

  async detectPendingSteps(): Promise<EMCStep[]> {
    console.log('🔍 Detecting pending EMC steps...');
    
    const steps: EMCStep[] = [];
    
    // Check for pending migrations
    try {
      const { data: migrations, error } = await this.supabase
        .from('migration_steps')
        .select('*')
        .eq('status', 'pending')
        .order('created_at');

      if (error) throw error;

      if (migrations && migrations.length > 0) {
        console.log(`Found ${migrations.length} pending migration steps`);
        return migrations.map(m => ({
          id: m.id,
          type: m.type,
          status: m.status,
          description: m.description,
          sql: m.sql,
          backfillScript: m.backfill_script,
          verificationQuery: m.verification_query,
          createdAt: new Date(m.created_at),
          completedAt: m.completed_at ? new Date(m.completed_at) : undefined,
          error: m.error
        }));
      }
    } catch (error) {
      console.log('No migration_steps table found, checking Prisma migrations...');
    }

    // Fallback: Check Prisma migration status
    try {
      const migrationStatus = await this.prisma.$queryRaw`
        SELECT * FROM _prisma_migrations 
        WHERE finished_at IS NULL
        ORDER BY started_at DESC
      `;

      if (Array.isArray(migrationStatus) && migrationStatus.length > 0) {
        console.log(`Found ${migrationStatus.length} pending Prisma migrations`);
        // Convert Prisma migrations to EMC steps
        return migrationStatus.map((m: any, index: number) => ({
          id: `prisma-${m.id}`,
          type: 'expand' as const,
          status: 'pending' as const,
          description: `Prisma migration: ${m.migration_name}`,
          createdAt: new Date(m.started_at || Date.now())
        }));
      }
    } catch (error) {
      console.log('No pending Prisma migrations found');
    }

    return steps;
  }

  async executeStep(step: EMCStep): Promise<void> {
    console.log(`🚀 Executing ${step.type} step: ${step.description}`);
    
    try {
      // Update status to in_progress
      await this.updateStepStatus(step.id, 'in_progress');

      switch (step.type) {
        case 'expand':
          await this.executeExpand(step);
          break;
        case 'migrate':
          await this.executeMigrate(step);
          break;
        case 'contract':
          await this.executeContract(step);
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      // Mark as completed
      await this.updateStepStatus(step.id, 'completed');
      console.log(`✅ Completed ${step.type} step: ${step.description}`);

    } catch (error) {
      console.error(`❌ Failed ${step.type} step: ${step.description}`, error);
      await this.updateStepStatus(step.id, 'failed', error.message);
      throw error;
    }
  }

  private async executeExpand(step: EMCStep): Promise<void> {
    if (!step.sql) {
      throw new Error('Expand step requires SQL');
    }

    console.log('Executing expand SQL...');
    const { error } = await this.supabase.rpc('exec_sql', { sql: step.sql });
    
    if (error) {
      throw new Error(`Expand SQL failed: ${error.message}`);
    }
  }

  private async executeMigrate(step: EMCStep): Promise<void> {
    if (!step.backfillScript) {
      console.log('No backfill script provided, skipping migrate step');
      return;
    }

    console.log('Executing backfill migration...');
    
    // Execute backfill script with batching and retry logic
    const backfillFunction = new Function('supabase', 'prisma', 'config', step.backfillScript);
    
    await this.executeWithRetry(async () => {
      return await backfillFunction(this.supabase, this.prisma, this.config);
    });
  }

  private async executeContract(step: EMCStep): Promise<void> {
    if (!step.sql) {
      throw new Error('Contract step requires SQL');
    }

    // Verify the step is old enough to contract
    const daysSinceCreated = (Date.now() - step.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated < this.config.verificationWindowDays) {
      throw new Error(`Contract step too recent (${daysSinceCreated.toFixed(1)} days). Minimum: ${this.config.verificationWindowDays} days`);
    }

    // Run verification query if provided
    if (step.verificationQuery) {
      console.log('Running verification query...');
      const { data, error } = await this.supabase.rpc('exec_sql', { sql: step.verificationQuery });
      
      if (error) {
        throw new Error(`Verification query failed: ${error.message}`);
      }
      
      console.log('Verification query passed');
    }

    console.log('Executing contract SQL...');
    const { error } = await this.supabase.rpc('exec_sql', { sql: step.sql });
    
    if (error) {
      throw new Error(`Contract SQL failed: ${error.message}`);
    }
  }

  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        console.log(`Attempt ${attempt}/${this.config.maxRetries} failed:`, error.message);
        
        if (attempt < this.config.maxRetries) {
          console.log(`Retrying in ${this.config.retryDelayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs));
        }
      }
    }
    
    throw lastError!;
  }

  private async updateStepStatus(stepId: string, status: EMCStep['status'], error?: string): Promise<void> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      if (error) {
        updateData.error = error;
      }

      await this.supabase
        .from('migration_steps')
        .update(updateData)
        .eq('id', stepId);
    } catch (error) {
      console.warn('Failed to update step status:', error);
    }
  }

  async run(): Promise<void> {
    console.log('🚀 Starting EMC Migration Process');
    
    try {
      const steps = await this.detectPendingSteps();
      
      if (steps.length === 0) {
        console.log('✅ No pending EMC steps found');
        return;
      }

      console.log(`Found ${steps.length} pending steps`);

      for (const step of steps) {
        await this.executeStep(step);
      }

      console.log('🎉 All EMC steps completed successfully');

    } catch (error) {
      console.error('❌ EMC Migration failed:', error);
      process.exit(1);
    } finally {
      await this.prisma.$disconnect();
    }
  }
}

// CLI interface
if (require.main === module) {
  const manager = new EMCMigrationManager();
  manager.run().catch(console.error);
}

export { EMCMigrationManager };
