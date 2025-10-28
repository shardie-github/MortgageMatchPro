/**
 * Privacy Guard System
 * Redacts PII before any prompt or telemetry export
 * Enforces privacy compliance in CI
 * Implements privacy by design principles
 */

import { createClient } from '@supabase/supabase-js';

interface PIIPattern {
  name: string;
  pattern: RegExp;
  replacement: string;
  category: 'email' | 'phone' | 'ssn' | 'credit_card' | 'address' | 'name' | 'ip' | 'custom';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface PrivacyAuditResult {
  total_checks: number;
  violations: PrivacyViolation[];
  compliance_score: number;
  recommendations: string[];
  timestamp: string;
}

interface PrivacyViolation {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  file?: string;
  line?: number;
  suggestion: string;
}

class PrivacyGuard {
  private supabase: any;
  private piiPatterns: PIIPattern[];
  private complianceRules: any;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    this.piiPatterns = this.initializePIIPatterns();
    this.complianceRules = this.initializeComplianceRules();
  }

  /**
   * Initialize PII detection patterns
   */
  private initializePIIPatterns(): PIIPattern[] {
    return [
      // Email addresses
      {
        name: 'email',
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        replacement: '[EMAIL_REDACTED]',
        category: 'email',
        severity: 'high'
      },
      // Phone numbers (US/Canada format)
      {
        name: 'phone_us_ca',
        pattern: /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
        replacement: '[PHONE_REDACTED]',
        category: 'phone',
        severity: 'high'
      },
      // SSN (US format)
      {
        name: 'ssn_us',
        pattern: /\b\d{3}-?\d{2}-?\d{4}\b/g,
        replacement: '[SSN_REDACTED]',
        category: 'ssn',
        severity: 'critical'
      },
      // Credit card numbers
      {
        name: 'credit_card',
        pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
        replacement: '[CARD_REDACTED]',
        category: 'credit_card',
        severity: 'critical'
      },
      // IP addresses
      {
        name: 'ipv4',
        pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
        replacement: '[IP_REDACTED]',
        category: 'ip',
        severity: 'medium'
      },
      // Names (common patterns)
      {
        name: 'name_pattern',
        pattern: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
        replacement: '[NAME_REDACTED]',
        category: 'name',
        severity: 'medium'
      },
      // Address patterns
      {
        name: 'address',
        pattern: /\b\d+\s+[A-Za-z0-9\s,.-]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl)\b/gi,
        replacement: '[ADDRESS_REDACTED]',
        category: 'address',
        severity: 'high'
      },
      // Custom patterns for mortgage data
      {
        name: 'mortgage_account',
        pattern: /\b[A-Z]{2}\d{6,12}\b/g,
        replacement: '[ACCOUNT_REDACTED]',
        category: 'custom',
        severity: 'high'
      },
      // Bank routing numbers
      {
        name: 'routing_number',
        pattern: /\b\d{9}\b/g,
        replacement: '[ROUTING_REDACTED]',
        category: 'custom',
        severity: 'critical'
      }
    ];
  }

  /**
   * Initialize compliance rules
   */
  private initializeComplianceRules(): any {
    return {
      gdpr: {
        enabled: true,
        data_retention_days: 90,
        right_to_erasure: true,
        data_portability: true,
        consent_required: true
      },
      ccpa: {
        enabled: true,
        opt_out_required: true,
        data_disclosure: true,
        deletion_rights: true
      },
      pipeda: {
        enabled: true,
        consent_required: true,
        purpose_limitation: true,
        data_minimization: true
      }
    };
  }

  /**
   * Main function to redact PII from text
   */
  redactPII(text: string, options: { 
    preserveFormatting?: boolean;
    customPatterns?: PIIPattern[];
    logViolations?: boolean;
  } = {}): {
    redactedText: string;
    violations: PrivacyViolation[];
    redactionCount: number;
  } {
    const { preserveFormatting = true, customPatterns = [], logViolations = true } = options;
    
    let redactedText = text;
    const violations: PrivacyViolation[] = [];
    let redactionCount = 0;

    // Combine default and custom patterns
    const allPatterns = [...this.piiPatterns, ...customPatterns];

    for (const pattern of allPatterns) {
      const matches = redactedText.match(pattern.pattern);
      
      if (matches) {
        redactedText = redactedText.replace(pattern.pattern, pattern.replacement);
        redactionCount += matches.length;

        if (logViolations) {
          violations.push({
            type: pattern.name,
            severity: pattern.severity,
            description: `Found ${matches.length} ${pattern.category} pattern(s)`,
            suggestion: `Use ${pattern.replacement} for redaction`
          });
        }
      }
    }

    return {
      redactedText,
      violations,
      redactionCount
    };
  }

  /**
   * Redact PII from object/JSON data
   */
  redactObjectPII(obj: any, options: { 
    deep?: boolean;
    preserveKeys?: boolean;
  } = {}): any {
    const { deep = true, preserveKeys = true } = options;

    if (typeof obj !== 'object' || obj === null) {
      return typeof obj === 'string' ? this.redactPII(obj).redactedText : obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.redactObjectPII(item, options));
    }

    const redacted: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const redactedKey = preserveKeys ? key : this.redactPII(key).redactedText;
      
      if (typeof value === 'string') {
        redacted[redactedKey] = this.redactPII(value).redactedText;
      } else if (deep && typeof value === 'object') {
        redacted[redactedKey] = this.redactObjectPII(value, options);
      } else {
        redacted[redactedKey] = value;
      }
    }

    return redacted;
  }

  /**
   * Audit codebase for privacy violations
   */
  async auditCodebase(options: { 
    includeTests?: boolean;
    includeDocs?: boolean;
    strictMode?: boolean;
  } = {}): Promise<PrivacyAuditResult> {
    const { includeTests = false, includeDocs = true, strictMode = false } = options;
    
    console.log('🔍 Starting privacy audit...');

    const violations: PrivacyViolation[] = [];
    let totalChecks = 0;

    try {
      // Get all source files
      const sourceFiles = await this.getSourceFiles(includeTests, includeDocs);
      
      for (const file of sourceFiles) {
        const fileViolations = await this.auditFile(file, strictMode);
        violations.push(...fileViolations);
        totalChecks++;
      }

      // Check for hardcoded secrets
      const secretViolations = await this.auditSecrets();
      violations.push(...secretViolations);

      // Check for data retention compliance
      const retentionViolations = await this.auditDataRetention();
      violations.push(...retentionViolations);

      // Check for consent management
      const consentViolations = await this.auditConsentManagement();
      violations.push(...consentViolations);

      // Calculate compliance score
      const complianceScore = this.calculateComplianceScore(violations, totalChecks);

      // Generate recommendations
      const recommendations = this.generateRecommendations(violations);

      const result: PrivacyAuditResult = {
        total_checks: totalChecks,
        violations,
        compliance_score: complianceScore,
        recommendations,
        timestamp: new Date().toISOString()
      };

      console.log(`✅ Privacy audit completed. Score: ${complianceScore}/100`);
      
      return result;

    } catch (error) {
      console.error('❌ Privacy audit failed:', error);
      throw error;
    }
  }

  /**
   * Audit individual file for privacy violations
   */
  private async auditFile(filePath: string, strictMode: boolean): Promise<PrivacyViolation[]> {
    const violations: PrivacyViolation[] = [];

    try {
      const content = await require('fs').promises.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;

        // Check for PII patterns
        for (const pattern of this.piiPatterns) {
          if (pattern.pattern.test(line)) {
            violations.push({
              type: 'pii_detected',
              severity: pattern.severity,
              description: `PII pattern '${pattern.name}' detected`,
              file: filePath,
              line: lineNumber,
              suggestion: `Use redaction: ${pattern.replacement}`
            });
          }
        }

        // Check for hardcoded secrets
        if (this.hasHardcodedSecret(line)) {
          violations.push({
            type: 'hardcoded_secret',
            severity: 'critical',
            description: 'Potential hardcoded secret detected',
            file: filePath,
            line: lineNumber,
            suggestion: 'Move to environment variables or secure storage'
          });
        }

        // Check for console.log with sensitive data
        if (this.hasSensitiveConsoleLog(line)) {
          violations.push({
            type: 'sensitive_logging',
            severity: 'high',
            description: 'Console log may contain sensitive data',
            file: filePath,
            line: lineNumber,
            suggestion: 'Use redacted logging or remove sensitive data'
          });
        }

        // Check for data retention violations
        if (this.hasDataRetentionViolation(line)) {
          violations.push({
            type: 'data_retention',
            severity: 'medium',
            description: 'Data retention policy not implemented',
            file: filePath,
            line: lineNumber,
            suggestion: 'Implement automatic data deletion after retention period'
          });
        }
      }

    } catch (error) {
      console.warn(`⚠️ Could not audit file ${filePath}:`, error.message);
    }

    return violations;
  }

  /**
   * Audit for hardcoded secrets
   */
  private async auditSecrets(): Promise<PrivacyViolation[]> {
    const violations: PrivacyViolation[] = [];
    const secretPatterns = [
      { name: 'api_key', pattern: /['"]([A-Za-z0-9]{32,})['"]/g, severity: 'critical' },
      { name: 'password', pattern: /password\s*[:=]\s*['"][^'"]+['"]/gi, severity: 'critical' },
      { name: 'token', pattern: /token\s*[:=]\s*['"][A-Za-z0-9._-]{20,}['"]/gi, severity: 'high' },
      { name: 'secret', pattern: /secret\s*[:=]\s*['"][^'"]+['"]/gi, severity: 'critical' }
    ];

    const sourceFiles = await this.getSourceFiles(true, false);
    
    for (const file of sourceFiles) {
      try {
        const content = await require('fs').promises.readFile(file, 'utf-8');
        
        for (const secretPattern of secretPatterns) {
          if (secretPattern.pattern.test(content)) {
            violations.push({
              type: 'hardcoded_secret',
              severity: secretPattern.severity,
              description: `Hardcoded ${secretPattern.name} detected`,
              file,
              suggestion: 'Move to environment variables or secure storage'
            });
          }
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    return violations;
  }

  /**
   * Audit data retention compliance
   */
  private async auditDataRetention(): Promise<PrivacyViolation[]> {
    const violations: PrivacyViolation[] = [];

    // Check if data retention policies are implemented
    const hasRetentionPolicy = await this.checkRetentionPolicy();
    if (!hasRetentionPolicy) {
      violations.push({
        type: 'data_retention',
        severity: 'high',
        description: 'No data retention policy found',
        suggestion: 'Implement automatic data deletion after retention period'
      });
    }

    return violations;
  }

  /**
   * Audit consent management
   */
  private async auditConsentManagement(): Promise<PrivacyViolation[]> {
    const violations: PrivacyViolation[] = [];

    // Check if consent management is implemented
    const hasConsentManagement = await this.checkConsentManagement();
    if (!hasConsentManagement) {
      violations.push({
        type: 'consent_management',
        severity: 'high',
        description: 'No consent management system found',
        suggestion: 'Implement user consent tracking and management'
      });
    }

    return violations;
  }

  /**
   * Get source files for auditing
   */
  private async getSourceFiles(includeTests: boolean, includeDocs: boolean): Promise<string[]> {
    const { glob } = require('glob');
    const patterns = ['**/*.{ts,tsx,js,jsx}'];
    
    if (includeTests) {
      patterns.push('**/*.test.{ts,tsx,js,jsx}', '**/*.spec.{ts,tsx,js,jsx}');
    }
    
    if (includeDocs) {
      patterns.push('**/*.md', '**/*.mdx');
    }

    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, { 
        ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'] 
      });
      files.push(...matches);
    }

    return files;
  }

  /**
   * Check if line has hardcoded secret
   */
  private hasHardcodedSecret(line: string): boolean {
    const secretPatterns = [
      /['"]([A-Za-z0-9]{32,})['"]/,
      /password\s*[:=]\s*['"][^'"]+['"]/i,
      /token\s*[:=]\s*['"][A-Za-z0-9._-]{20,}['"]/i,
      /secret\s*[:=]\s*['"][^'"]+['"]/i
    ];

    return secretPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Check if line has sensitive console log
   */
  private hasSensitiveConsoleLog(line: string): boolean {
    const sensitiveKeywords = ['password', 'token', 'secret', 'key', 'ssn', 'email', 'phone'];
    const consoleLogPattern = /console\.(log|warn|error|info)/i;
    
    if (!consoleLogPattern.test(line)) return false;
    
    return sensitiveKeywords.some(keyword => 
      line.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Check if line has data retention violation
   */
  private hasDataRetentionViolation(line: string): boolean {
    const retentionKeywords = ['delete', 'remove', 'purge', 'retention'];
    const dataKeywords = ['user', 'data', 'record', 'log'];
    
    return retentionKeywords.some(retention => 
      dataKeywords.some(data => 
        line.toLowerCase().includes(retention) && 
        line.toLowerCase().includes(data)
      )
    );
  }

  /**
   * Check if retention policy exists
   */
  private async checkRetentionPolicy(): Promise<boolean> {
    try {
      const { glob } = require('glob');
      const files = await glob('**/*retention*', { 
        ignore: ['node_modules/**', '.git/**'] 
      });
      return files.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Check if consent management exists
   */
  private async checkConsentManagement(): Promise<boolean> {
    try {
      const { glob } = require('glob');
      const files = await glob('**/*consent*', { 
        ignore: ['node_modules/**', '.git/**'] 
      });
      return files.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Calculate compliance score
   */
  private calculateComplianceScore(violations: PrivacyViolation[], totalChecks: number): number {
    if (totalChecks === 0) return 100;

    const severityWeights = {
      low: 1,
      medium: 3,
      high: 7,
      critical: 15
    };

    const totalWeight = violations.reduce((sum, violation) => 
      sum + severityWeights[violation.severity], 0
    );

    const maxPossibleWeight = totalChecks * severityWeights.critical;
    const score = Math.max(0, 100 - (totalWeight / maxPossibleWeight) * 100);

    return Math.round(score);
  }

  /**
   * Generate recommendations based on violations
   */
  private generateRecommendations(violations: PrivacyViolation[]): string[] {
    const recommendations: string[] = [];
    const violationTypes = new Set(violations.map(v => v.type));

    if (violationTypes.has('pii_detected')) {
      recommendations.push('Implement PII redaction before logging or data export');
      recommendations.push('Use privacy-preserving data analysis techniques');
    }

    if (violationTypes.has('hardcoded_secret')) {
      recommendations.push('Move all secrets to environment variables or secure storage');
      recommendations.push('Implement secret scanning in CI/CD pipeline');
    }

    if (violationTypes.has('sensitive_logging')) {
      recommendations.push('Implement redacted logging for sensitive data');
      recommendations.push('Use structured logging with privacy controls');
    }

    if (violationTypes.has('data_retention')) {
      recommendations.push('Implement automatic data deletion after retention period');
      recommendations.push('Create data retention policies and procedures');
    }

    if (violationTypes.has('consent_management')) {
      recommendations.push('Implement user consent tracking and management');
      recommendations.push('Add consent withdrawal mechanisms');
    }

    return recommendations;
  }

  /**
   * Generate privacy compliance report
   */
  async generateComplianceReport(): Promise<string> {
    const auditResult = await this.auditCodebase();
    
    const report = `
# Privacy Compliance Report

**Generated:** ${auditResult.timestamp}
**Compliance Score:** ${auditResult.compliance_score}/100
**Total Checks:** ${auditResult.total_checks}

## Violations Summary
- **Critical:** ${auditResult.violations.filter(v => v.severity === 'critical').length}
- **High:** ${auditResult.violations.filter(v => v.severity === 'high').length}
- **Medium:** ${auditResult.violations.filter(v => v.severity === 'medium').length}
- **Low:** ${auditResult.violations.filter(v => v.severity === 'low').length}

## Critical Issues
${auditResult.violations
  .filter(v => v.severity === 'critical')
  .map(v => `- **${v.type}:** ${v.description}${v.file ? ` (${v.file}:${v.line})` : ''}`)
  .join('\n') || 'None'}

## Recommendations
${auditResult.recommendations.map(rec => `- ${rec}`).join('\n')}

## Compliance Status
${auditResult.compliance_score >= 90 ? '✅ Excellent' : 
  auditResult.compliance_score >= 70 ? '⚠️ Needs Improvement' : 
  '❌ Critical Issues Found'}

---
*This report was generated by the Privacy Guard system.*
    `.trim();

    return report;
  }
}

// Export for use in other modules
export { PrivacyGuard, PIIPattern, PrivacyAuditResult, PrivacyViolation };

// CLI usage
if (require.main === module) {
  const guard = new PrivacyGuard();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'audit':
      guard.auditCodebase()
        .then(async (result) => {
          console.log(await guard.generateComplianceReport());
          process.exit(result.compliance_score >= 70 ? 0 : 1);
        })
        .catch(error => {
          console.error('Audit failed:', error);
          process.exit(1);
        });
      break;
      
    case 'redact':
      const text = process.argv[3];
      if (!text) {
        console.error('Usage: node privacy_guard.ts redact "text to redact"');
        process.exit(1);
      }
      const result = guard.redactPII(text);
      console.log('Redacted text:', result.redactedText);
      console.log('Violations found:', result.violations.length);
      break;
      
    default:
      console.log(`
Usage: node privacy_guard.ts <command> [options]

Commands:
  audit                    Run privacy compliance audit
  redact <text>           Redact PII from text
  help                    Show this help message

Examples:
  node privacy_guard.ts audit
  node privacy_guard.ts redact "Contact john@example.com at 555-1234"
      `.trim());
      process.exit(0);
  }
}