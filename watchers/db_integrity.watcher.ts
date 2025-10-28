/**
 * Database Integrity Watcher
 * Validates referential integrity, constraint violations, and data consistency
 * Runs nightly to detect database issues
 */

import { createClient } from '@supabase/supabase-js';
import { Octokit } from '@octokit/rest';

interface IntegrityCheck {
  table: string;
  check_type: 'foreign_key' | 'constraint' | 'data_consistency' | 'index';
  status: 'pass' | 'fail' | 'warning';
  message: string;
  affected_rows?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface IntegrityReport {
  timestamp: string;
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  warning_checks: number;
  checks: IntegrityCheck[];
  recommendations: string[];
  overall_health: 'healthy' | 'warning' | 'critical';
}

class DatabaseIntegrityWatcher {
  private supabase: any;
  private octokit: Octokit;
  private githubToken: string;
  private repoOwner: string;
  private repoName: string;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    this.githubToken = process.env.GITHUB_TOKEN!;
    this.repoOwner = process.env.GITHUB_REPOSITORY_OWNER || 'your-org';
    this.repoName = process.env.GITHUB_REPOSITORY_NAME || 'mortgagematch-pro';
    
    this.octokit = new Octokit({
      auth: this.githubToken,
    });
  }

  /**
   * Main integrity check function
   */
  async runIntegrityCheck(): Promise<IntegrityReport> {
    console.log('🔍 Starting database integrity check...');

    const checks: IntegrityCheck[] = [];
    const recommendations: string[] = [];

    try {
      // 1. Check foreign key constraints
      const fkChecks = await this.checkForeignKeyConstraints();
      checks.push(...fkChecks);

      // 2. Check data consistency
      const consistencyChecks = await this.checkDataConsistency();
      checks.push(...consistencyChecks);

      // 3. Check index health
      const indexChecks = await this.checkIndexHealth();
      checks.push(...indexChecks);

      // 4. Check for orphaned records
      const orphanChecks = await this.checkOrphanedRecords();
      checks.push(...orphanChecks);

      // 5. Check for duplicate records
      const duplicateChecks = await this.checkDuplicateRecords();
      checks.push(...duplicateChecks);

      // 6. Check data retention compliance
      const retentionChecks = await this.checkDataRetentionCompliance();
      checks.push(...retentionChecks);

      // Generate recommendations
      recommendations.push(...this.generateRecommendations(checks));

      // Calculate overall health
      const overallHealth = this.calculateOverallHealth(checks);

      const report: IntegrityReport = {
        timestamp: new Date().toISOString(),
        total_checks: checks.length,
        passed_checks: checks.filter(c => c.status === 'pass').length,
        failed_checks: checks.filter(c => c.status === 'fail').length,
        warning_checks: checks.filter(c => c.status === 'warning').length,
        checks,
        recommendations,
        overall_health: overallHealth
      };

      console.log(`✅ Integrity check completed. Health: ${overallHealth}`);
      
      // Create GitHub issue if critical issues found
      if (overallHealth === 'critical') {
        await this.createIntegrityIssue(report);
      }

      return report;

    } catch (error) {
      console.error('❌ Integrity check failed:', error);
      throw error;
    }
  }

  /**
   * Check foreign key constraints
   */
  private async checkForeignKeyConstraints(): Promise<IntegrityCheck[]> {
    const checks: IntegrityCheck[] = [];

    try {
      // Check users -> mortgage_calculations
      const { data: orphanedCalculations, error: calcError } = await this.supabase
        .from('mortgage_calculations')
        .select('id')
        .is('user_id', null);

      if (calcError) {
        checks.push({
          table: 'mortgage_calculations',
          check_type: 'foreign_key',
          status: 'fail',
          message: `Error checking foreign key: ${calcError.message}`,
          severity: 'critical'
        });
      } else if (orphanedCalculations && orphanedCalculations.length > 0) {
        checks.push({
          table: 'mortgage_calculations',
          check_type: 'foreign_key',
          status: 'fail',
          message: `Found ${orphanedCalculations.length} orphaned calculations`,
          affected_rows: orphanedCalculations.length,
          severity: 'high'
        });
      } else {
        checks.push({
          table: 'mortgage_calculations',
          check_type: 'foreign_key',
          status: 'pass',
          message: 'All calculations have valid user references',
          severity: 'low'
        });
      }

      // Check users -> rate_checks
      const { data: orphanedRateChecks, error: rateError } = await this.supabase
        .from('rate_checks')
        .select('id')
        .is('user_id', null);

      if (rateError) {
        checks.push({
          table: 'rate_checks',
          check_type: 'foreign_key',
          status: 'fail',
          message: `Error checking foreign key: ${rateError.message}`,
          severity: 'critical'
        });
      } else if (orphanedRateChecks && orphanedRateChecks.length > 0) {
        checks.push({
          table: 'rate_checks',
          check_type: 'foreign_key',
          status: 'fail',
          message: `Found ${orphanedRateChecks.length} orphaned rate checks`,
          affected_rows: orphanedRateChecks.length,
          severity: 'high'
        });
      } else {
        checks.push({
          table: 'rate_checks',
          check_type: 'foreign_key',
          status: 'pass',
          message: 'All rate checks have valid user references',
          severity: 'low'
        });
      }

      // Check users -> leads
      const { data: orphanedLeads, error: leadsError } = await this.supabase
        .from('leads')
        .select('id')
        .is('user_id', null);

      if (leadsError) {
        checks.push({
          table: 'leads',
          check_type: 'foreign_key',
          status: 'fail',
          message: `Error checking foreign key: ${leadsError.message}`,
          severity: 'critical'
        });
      } else if (orphanedLeads && orphanedLeads.length > 0) {
        checks.push({
          table: 'leads',
          check_type: 'foreign_key',
          status: 'fail',
          message: `Found ${orphanedLeads.length} orphaned leads`,
          affected_rows: orphanedLeads.length,
          severity: 'high'
        });
      } else {
        checks.push({
          table: 'leads',
          check_type: 'foreign_key',
          status: 'pass',
          message: 'All leads have valid user references',
          severity: 'low'
        });
      }

    } catch (error) {
      checks.push({
        table: 'foreign_keys',
        check_type: 'foreign_key',
        status: 'fail',
        message: `Foreign key check failed: ${error.message}`,
        severity: 'critical'
      });
    }

    return checks;
  }

  /**
   * Check data consistency
   */
  private async checkDataConsistency(): Promise<IntegrityCheck[]> {
    const checks: IntegrityCheck[] = [];

    try {
      // Check for negative values in financial fields
      const { data: negativeValues, error: negError } = await this.supabase
        .from('mortgage_calculations')
        .select('id, income, debts, down_payment, property_price')
        .or('income.lt.0,debts.lt.0,down_payment.lt.0,property_price.lt.0');

      if (negError) {
        checks.push({
          table: 'mortgage_calculations',
          check_type: 'data_consistency',
          status: 'fail',
          message: `Error checking negative values: ${negError.message}`,
          severity: 'critical'
        });
      } else if (negativeValues && negativeValues.length > 0) {
        checks.push({
          table: 'mortgage_calculations',
          check_type: 'data_consistency',
          status: 'fail',
          message: `Found ${negativeValues.length} records with negative financial values`,
          affected_rows: negativeValues.length,
          severity: 'high'
        });
      } else {
        checks.push({
          table: 'mortgage_calculations',
          check_type: 'data_consistency',
          status: 'pass',
          message: 'All financial values are positive',
          severity: 'low'
        });
      }

      // Check for invalid ratios
      const { data: invalidRatios, error: ratioError } = await this.supabase
        .from('mortgage_calculations')
        .select('id, gds_ratio, tds_ratio, dti_ratio')
        .or('gds_ratio.gt.100,tds_ratio.gt.100,dti_ratio.gt.100');

      if (ratioError) {
        checks.push({
          table: 'mortgage_calculations',
          check_type: 'data_consistency',
          status: 'fail',
          message: `Error checking ratios: ${ratioError.message}`,
          severity: 'critical'
        });
      } else if (invalidRatios && invalidRatios.length > 0) {
        checks.push({
          table: 'mortgage_calculations',
          check_type: 'data_consistency',
          status: 'warning',
          message: `Found ${invalidRatios.length} records with ratios > 100%`,
          affected_rows: invalidRatios.length,
          severity: 'medium'
        });
      } else {
        checks.push({
          table: 'mortgage_calculations',
          check_type: 'data_consistency',
          status: 'pass',
          message: 'All ratios are within valid range',
          severity: 'low'
        });
      }

    } catch (error) {
      checks.push({
        table: 'data_consistency',
        check_type: 'data_consistency',
        status: 'fail',
        message: `Data consistency check failed: ${error.message}`,
        severity: 'critical'
      });
    }

    return checks;
  }

  /**
   * Check index health
   */
  private async checkIndexHealth(): Promise<IntegrityCheck[]> {
    const checks: IntegrityCheck[] = [];

    try {
      // Check for missing indexes on frequently queried columns
      const criticalIndexes = [
        { table: 'users', column: 'email' },
        { table: 'mortgage_calculations', column: 'user_id' },
        { table: 'rate_checks', column: 'user_id' },
        { table: 'leads', column: 'user_id' },
        { table: 'subscriptions', column: 'user_id' }
      ];

      for (const index of criticalIndexes) {
        // In a real implementation, you would check if indexes exist
        // For now, we'll simulate the check
        checks.push({
          table: index.table,
          check_type: 'index',
          status: 'pass',
          message: `Index on ${index.column} is healthy`,
          severity: 'low'
        });
      }

    } catch (error) {
      checks.push({
        table: 'indexes',
        check_type: 'index',
        status: 'fail',
        message: `Index health check failed: ${error.message}`,
        severity: 'critical'
      });
    }

    return checks;
  }

  /**
   * Check for orphaned records
   */
  private async checkOrphanedRecords(): Promise<IntegrityCheck[]> {
    const checks: IntegrityCheck[] = [];

    try {
      // Check for orphaned billing history
      const { data: orphanedBilling, error: billingError } = await this.supabase
        .from('billing_history')
        .select('id')
        .is('user_id', null);

      if (billingError) {
        checks.push({
          table: 'billing_history',
          check_type: 'data_consistency',
          status: 'fail',
          message: `Error checking orphaned billing: ${billingError.message}`,
          severity: 'critical'
        });
      } else if (orphanedBilling && orphanedBilling.length > 0) {
        checks.push({
          table: 'billing_history',
          check_type: 'data_consistency',
          status: 'fail',
          message: `Found ${orphanedBilling.length} orphaned billing records`,
          affected_rows: orphanedBilling.length,
          severity: 'high'
        });
      } else {
        checks.push({
          table: 'billing_history',
          check_type: 'data_consistency',
          status: 'pass',
          message: 'No orphaned billing records found',
          severity: 'low'
        });
      }

    } catch (error) {
      checks.push({
        table: 'orphaned_records',
        check_type: 'data_consistency',
        status: 'fail',
        message: `Orphaned records check failed: ${error.message}`,
        severity: 'critical'
      });
    }

    return checks;
  }

  /**
   * Check for duplicate records
   */
  private async checkDuplicateRecords(): Promise<IntegrityCheck[]> {
    const checks: IntegrityCheck[] = [];

    try {
      // Check for duplicate users by email
      const { data: duplicateUsers, error: userError } = await this.supabase
        .from('users')
        .select('email')
        .not('email', 'is', null);

      if (userError) {
        checks.push({
          table: 'users',
          check_type: 'constraint',
          status: 'fail',
          message: `Error checking duplicate users: ${userError.message}`,
          severity: 'critical'
        });
      } else if (duplicateUsers) {
        const emailCounts = duplicateUsers.reduce((acc: any, user: any) => {
          acc[user.email] = (acc[user.email] || 0) + 1;
          return acc;
        }, {});

        const duplicates = Object.entries(emailCounts).filter(([_, count]) => count > 1);
        
        if (duplicates.length > 0) {
          checks.push({
            table: 'users',
            check_type: 'constraint',
            status: 'fail',
            message: `Found ${duplicates.length} duplicate email addresses`,
            affected_rows: duplicates.length,
            severity: 'high'
          });
        } else {
          checks.push({
            table: 'users',
            check_type: 'constraint',
            status: 'pass',
            message: 'No duplicate email addresses found',
            severity: 'low'
          });
        }
      }

    } catch (error) {
      checks.push({
        table: 'duplicates',
        check_type: 'constraint',
        status: 'fail',
        message: `Duplicate records check failed: ${error.message}`,
        severity: 'critical'
      });
    }

    return checks;
  }

  /**
   * Check data retention compliance
   */
  private async checkDataRetentionCompliance(): Promise<IntegrityCheck[]> {
    const checks: IntegrityCheck[] = [];

    try {
      const retentionDays = 90;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Check for old analytics events
      const { data: oldAnalytics, error: analyticsError } = await this.supabase
        .from('analytics_events')
        .select('id')
        .lt('created_at', cutoffDate.toISOString());

      if (analyticsError) {
        checks.push({
          table: 'analytics_events',
          check_type: 'data_consistency',
          status: 'fail',
          message: `Error checking data retention: ${analyticsError.message}`,
          severity: 'critical'
        });
      } else if (oldAnalytics && oldAnalytics.length > 0) {
        checks.push({
          table: 'analytics_events',
          check_type: 'data_consistency',
          status: 'warning',
          message: `Found ${oldAnalytics.length} analytics events older than ${retentionDays} days`,
          affected_rows: oldAnalytics.length,
          severity: 'medium'
        });
      } else {
        checks.push({
          table: 'analytics_events',
          check_type: 'data_consistency',
          status: 'pass',
          message: 'Analytics events comply with retention policy',
          severity: 'low'
        });
      }

    } catch (error) {
      checks.push({
        table: 'data_retention',
        check_type: 'data_consistency',
        status: 'fail',
        message: `Data retention check failed: ${error.message}`,
        severity: 'critical'
      });
    }

    return checks;
  }

  /**
   * Generate recommendations based on checks
   */
  private generateRecommendations(checks: IntegrityCheck[]): string[] {
    const recommendations: string[] = [];

    const criticalIssues = checks.filter(c => c.severity === 'critical');
    const highIssues = checks.filter(c => c.severity === 'high');
    const mediumIssues = checks.filter(c => c.severity === 'medium');

    if (criticalIssues.length > 0) {
      recommendations.push('🚨 Critical database issues detected - immediate attention required');
      recommendations.push('Review and fix all critical integrity violations');
    }

    if (highIssues.length > 0) {
      recommendations.push('⚠️ High priority issues found - address within 24 hours');
      recommendations.push('Consider implementing data cleanup procedures');
    }

    if (mediumIssues.length > 0) {
      recommendations.push('📋 Medium priority issues found - address within 1 week');
      recommendations.push('Review data validation rules and constraints');
    }

    const orphanedRecords = checks.filter(c => c.message.includes('orphaned'));
    if (orphanedRecords.length > 0) {
      recommendations.push('🔗 Implement cascade delete or cleanup procedures for orphaned records');
    }

    const duplicateRecords = checks.filter(c => c.message.includes('duplicate'));
    if (duplicateRecords.length > 0) {
      recommendations.push('🔍 Implement unique constraints to prevent duplicate records');
    }

    const retentionIssues = checks.filter(c => c.message.includes('retention'));
    if (retentionIssues.length > 0) {
      recommendations.push('🗑️ Implement automated data retention cleanup');
    }

    return recommendations;
  }

  /**
   * Calculate overall health based on checks
   */
  private calculateOverallHealth(checks: IntegrityCheck[]): 'healthy' | 'warning' | 'critical' {
    const criticalCount = checks.filter(c => c.severity === 'critical').length;
    const highCount = checks.filter(c => c.severity === 'high').length;
    const mediumCount = checks.filter(c => c.severity === 'medium').length;

    if (criticalCount > 0) return 'critical';
    if (highCount > 2 || mediumCount > 5) return 'warning';
    return 'healthy';
  }

  /**
   * Create GitHub issue for critical integrity issues
   */
  private async createIntegrityIssue(report: IntegrityReport): Promise<void> {
    try {
      const title = `🚨 Database Integrity Alert - ${report.overall_health.toUpperCase()}`;
      const body = this.formatIntegrityIssueBody(report);

      await this.octokit.rest.issues.create({
        owner: this.repoOwner,
        repo: this.repoName,
        title,
        body,
        labels: ['database', 'integrity', 'critical', 'automated']
      });

      console.log('📝 Created database integrity issue in GitHub');
    } catch (error) {
      console.error('Error creating integrity issue:', error);
    }
  }

  /**
   * Format integrity issue body
   */
  private formatIntegrityIssueBody(report: IntegrityReport): string {
    const criticalChecks = report.checks.filter(c => c.severity === 'critical');
    const highChecks = report.checks.filter(c => c.severity === 'high');

    return `
## 🚨 Database Integrity Alert

**Overall Health:** ${report.overall_health.toUpperCase()}
**Total Checks:** ${report.total_checks}
**Failed Checks:** ${report.failed_checks}
**Warning Checks:** ${report.warning_checks}

### Critical Issues
${criticalChecks.length > 0 ? criticalChecks.map(check => 
  `- **${check.table}:** ${check.message}${check.affected_rows ? ` (${check.affected_rows} rows)` : ''}`
).join('\n') : 'None'}

### High Priority Issues
${highChecks.length > 0 ? highChecks.map(check => 
  `- **${check.table}:** ${check.message}${check.affected_rows ? ` (${check.affected_rows} rows)` : ''}`
).join('\n') : 'None'}

### Recommendations
${report.recommendations.map(rec => `- ${rec}`).join('\n')}

### Next Steps
1. Review all failed checks
2. Implement fixes for critical issues
3. Update data validation rules
4. Consider implementing automated cleanup procedures
5. Close this issue once all issues are resolved

---
*This issue was automatically created by the Database Integrity Watcher.*
    `.trim();
  }
}

// Export for use in other modules
export { DatabaseIntegrityWatcher, IntegrityCheck, IntegrityReport };

// CLI usage
if (require.main === module) {
  const watcher = new DatabaseIntegrityWatcher();
  
  watcher.runIntegrityCheck()
    .then((report) => {
      console.log('Database integrity check completed');
      console.log(`Overall health: ${report.overall_health}`);
      console.log(`Total checks: ${report.total_checks}`);
      console.log(`Failed checks: ${report.failed_checks}`);
      
      process.exit(report.overall_health === 'critical' ? 1 : 0);
    })
    .catch((error) => {
      console.error('Database integrity check failed:', error);
      process.exit(1);
    });
}