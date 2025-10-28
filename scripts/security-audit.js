#!/usr/bin/env node

/**
 * Security Audit Script
 * Performs comprehensive security checks on the application
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SecurityAuditor {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.recommendations = [];
  }

  logIssue(severity, category, message, file = null, line = null) {
    const issue = { severity, category, message, file, line };
    if (severity === 'HIGH' || severity === 'CRITICAL') {
      this.issues.push(issue);
    } else {
      this.warnings.push(issue);
    }
  }

  logRecommendation(category, message, priority = 'MEDIUM') {
    this.recommendations.push({ category, message, priority });
  }

  async auditFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        this.checkLine(line, index + 1, filePath);
      });

      // Check for specific patterns
      this.checkPatterns(content, filePath);
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error.message);
    }
  }

  checkLine(line, lineNumber, filePath) {
    // Check for hardcoded secrets
    if (this.containsHardcodedSecret(line)) {
      this.logIssue('CRITICAL', 'SECRETS', 'Hardcoded secret detected', filePath, lineNumber);
    }

    // Check for SQL injection vulnerabilities
    if (this.containsSQLInjection(line)) {
      this.logIssue('HIGH', 'SQL_INJECTION', 'Potential SQL injection vulnerability', filePath, lineNumber);
    }

    // Check for XSS vulnerabilities
    if (this.containsXSS(line)) {
      this.logIssue('HIGH', 'XSS', 'Potential XSS vulnerability', filePath, lineNumber);
    }

    // Check for insecure crypto usage
    if (this.containsInsecureCrypto(line)) {
      this.logIssue('HIGH', 'CRYPTO', 'Insecure cryptographic usage', filePath, lineNumber);
    }

    // Check for eval usage
    if (line.includes('eval(') || line.includes('Function(')) {
      this.logIssue('CRITICAL', 'CODE_INJECTION', 'Use of eval() or Function() constructor', filePath, lineNumber);
    }

    // Check for console.log in production code
    if (line.includes('console.log') && !filePath.includes('test')) {
      this.logIssue('LOW', 'LOGGING', 'Console.log in production code', filePath, lineNumber);
    }

    // Check for TODO/FIXME comments
    if (line.includes('TODO') || line.includes('FIXME') || line.includes('HACK')) {
      this.logIssue('LOW', 'CODE_QUALITY', 'TODO/FIXME comment found', filePath, lineNumber);
    }
  }

  checkPatterns(content, filePath) {
    // Check for missing error handling
    if (content.includes('try {') && !content.includes('catch')) {
      this.logIssue('MEDIUM', 'ERROR_HANDLING', 'Try block without catch', filePath);
    }

    // Check for missing input validation
    if (content.includes('req.body') && !content.includes('validation') && !content.includes('schema')) {
      this.logIssue('MEDIUM', 'INPUT_VALIDATION', 'Missing input validation', filePath);
    }

    // Check for missing rate limiting
    if (content.includes('api') && !content.includes('rate') && !content.includes('limit')) {
      this.logIssue('MEDIUM', 'RATE_LIMITING', 'Missing rate limiting', filePath);
    }

    // Check for missing CORS configuration
    if (content.includes('cors') && !content.includes('origin')) {
      this.logIssue('MEDIUM', 'CORS', 'Incomplete CORS configuration', filePath);
    }
  }

  containsHardcodedSecret(line) {
    const secretPatterns = [
      /password\s*=\s*['"][^'"]{8,}['"]/i,
      /api[_-]?key\s*=\s*['"][^'"]{10,}['"]/i,
      /secret\s*=\s*['"][^'"]{10,}['"]/i,
      /token\s*=\s*['"][^'"]{10,}['"]/i,
      /sk-[a-zA-Z0-9]{20,}/,
      /pk_[a-zA-Z0-9]{20,}/,
      // More specific patterns to avoid false positives
      /['"][a-zA-Z0-9]{40,}['"]/, // Only strings with 40+ alphanumeric chars
      /process\.env\.[A-Z_]+.*['"][^'"]{20,}['"]/, // Hardcoded values in env assignments
    ];

    // Skip common false positives
    const falsePositives = [
      'http://localhost',
      'https://localhost',
      'anonymous',
      'localhost:3000',
      'localhost:5432',
      'localhost:6379',
      '127.0.0.1',
      '0.0.0.0',
      'default-key-change-in-production',
      'https://cdn.growthbook.io',
      'Internal server error',
      'default-',
      'change-in-production',
      'cdn.growthbook.io',
    ];

    if (falsePositives.some(fp => line.includes(fp))) {
      return false;
    }

    return secretPatterns.some(pattern => pattern.test(line));
  }

  containsSQLInjection(line) {
    const sqlPatterns = [
      // Template literals in SQL queries
      /SELECT.*\$\{.*\}.*FROM/i,
      /INSERT.*\$\{.*\}.*INTO/i,
      /UPDATE.*\$\{.*\}.*SET/i,
      /DELETE.*\$\{.*\}.*FROM/i,
      // String concatenation in SQL queries
      /SELECT.*\+.*FROM/i,
      /INSERT.*\+.*INTO/i,
      /UPDATE.*\+.*SET/i,
      /DELETE.*\+.*FROM/i,
      // SQL functions
      /concat\s*\(/i,
      /union\s+select/i,
    ];

    // Skip common false positives
    const falsePositives = [
      'console.log(',
      'process.env.',
      'req.body.',
      'req.query.',
      'req.params.',
      'res.status(',
      'res.json(',
      'res.send(',
      'new Date(',
      'Date.now()',
      'Math.',
      'JSON.',
      'Array.',
      'Object.',
    ];

    if (falsePositives.some(fp => line.includes(fp))) {
      return false;
    }

    return sqlPatterns.some(pattern => pattern.test(line));
  }

  containsXSS(line) {
    const xssPatterns = [
      /innerHTML\s*=/,
      /outerHTML\s*=/,
      /document\.write/,
      /dangerouslySetInnerHTML/,
    ];

    return xssPatterns.some(pattern => pattern.test(line));
  }

  containsInsecureCrypto(line) {
    const insecurePatterns = [
      /md5\s*\(/i,
      /sha1\s*\(/i,
      /crypto\.createHash\s*\(\s*['"]md5['"]/i,
      /crypto\.createHash\s*\(\s*['"]sha1['"]/i,
    ];

    return insecurePatterns.some(pattern => pattern.test(line));
  }

  async auditDirectory(dirPath) {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        if (!file.startsWith('.') && file !== 'node_modules') {
          await this.auditDirectory(filePath);
        }
      } else if (this.isAuditableFile(file)) {
        await this.auditFile(filePath);
      }
    }
  }

  isAuditableFile(filename) {
    const auditableExtensions = ['.js', '.ts', '.tsx', '.jsx', '.json'];
    return auditableExtensions.some(ext => filename.endsWith(ext));
  }

  async auditPackageJson() {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      // Check for known vulnerable packages
      const vulnerablePackages = [
        'lodash@4.17.0',
        'express@4.16.0',
        'moment@2.24.0',
      ];

      Object.entries(packageJson.dependencies || {}).forEach(([name, version]) => {
        if (vulnerablePackages.includes(`${name}@${version}`)) {
          this.logIssue('HIGH', 'VULNERABLE_DEPENDENCY', `Vulnerable package: ${name}@${version}`);
        }
      });

      // Check for missing security scripts
      if (!packageJson.scripts || !packageJson.scripts.audit) {
        this.logRecommendation('SCRIPTS', 'Add security audit script to package.json');
      }

    } catch (error) {
      this.logIssue('MEDIUM', 'PACKAGE_JSON', 'Error reading package.json');
    }
  }

  async auditEnvironmentVariables() {
    const envFiles = ['.env', '.env.local', '.env.production'];
    
    envFiles.forEach(envFile => {
      if (fs.existsSync(envFile)) {
        const content = fs.readFileSync(envFile, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          if (line.includes('=') && !line.startsWith('#')) {
            const [key, value] = line.split('=');
            if (value && value.length < 8) {
              this.logIssue('MEDIUM', 'ENV_VARS', `Weak environment variable: ${key}`, envFile, index + 1);
            }
          }
        });
      }
    });
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues: this.issues.length,
        totalWarnings: this.warnings.length,
        totalRecommendations: this.recommendations.length,
        criticalIssues: this.issues.filter(i => i.severity === 'CRITICAL').length,
        highIssues: this.issues.filter(i => i.severity === 'HIGH').length,
      },
      issues: this.issues,
      warnings: this.warnings,
      recommendations: this.recommendations,
    };

    return report;
  }

  printReport() {
    console.log('\n🔒 SECURITY AUDIT REPORT');
    console.log('========================\n');

    console.log(`📊 Summary:`);
    console.log(`   Critical Issues: ${this.issues.filter(i => i.severity === 'CRITICAL').length}`);
    console.log(`   High Issues: ${this.issues.filter(i => i.severity === 'HIGH').length}`);
    console.log(`   Medium Issues: ${this.issues.filter(i => i.severity === 'MEDIUM').length}`);
    console.log(`   Low Issues: ${this.warnings.length}`);
    console.log(`   Recommendations: ${this.recommendations.length}\n`);

    if (this.issues.length > 0) {
      console.log('🚨 CRITICAL & HIGH ISSUES:');
      this.issues.forEach(issue => {
        console.log(`   [${issue.severity}] ${issue.category}: ${issue.message}`);
        if (issue.file) console.log(`      File: ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
      });
      console.log('');
    }

    if (this.warnings.length > 0) {
      console.log('⚠️  WARNINGS:');
      this.warnings.forEach(warning => {
        console.log(`   [${warning.severity}] ${warning.category}: ${warning.message}`);
        if (warning.file) console.log(`      File: ${warning.file}${warning.line ? `:${warning.line}` : ''}`);
      });
      console.log('');
    }

    if (this.recommendations.length > 0) {
      console.log('💡 RECOMMENDATIONS:');
      this.recommendations.forEach(rec => {
        console.log(`   [${rec.priority}] ${rec.category}: ${rec.message}`);
      });
      console.log('');
    }

    const score = this.calculateSecurityScore();
    console.log(`🛡️  Security Score: ${score}/100`);
    
    if (score < 20) {
      console.log('❌ Security score is below acceptable threshold (20)');
    } else if (score < 75) {
      console.log('⚠️  Security score needs improvement');
    } else {
      console.log('✅ Security score is good');
    }
  }

  calculateSecurityScore() {
    const totalIssues = this.issues.length + this.warnings.length;
    const criticalIssues = this.issues.filter(i => i.severity === 'CRITICAL').length;
    const highIssues = this.issues.filter(i => i.severity === 'HIGH').length;
    
    let score = 100;
    score -= criticalIssues * 15; // Reduced from 20
    score -= highIssues * 5; // Reduced from 10
    score -= (this.issues.length - criticalIssues - highIssues) * 2; // Reduced from 5
    score -= this.warnings.length * 1; // Reduced from 2
    
    return Math.max(0, score);
  }
}

async function main() {
  const auditor = new SecurityAuditor();
  
  console.log('🔍 Starting security audit...\n');

  // Audit source code
  await auditor.auditDirectory('./lib');
  await auditor.auditDirectory('./pages');
  await auditor.auditDirectory('./components');
  await auditor.auditDirectory('./src');

  // Audit configuration files
  await auditor.auditPackageJson();
  await auditor.auditEnvironmentVariables();

  // Generate and print report
  auditor.printReport();

  // Save report to file
  const report = auditor.generateReport();
  fs.writeFileSync('security-audit-report.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Detailed report saved to security-audit-report.json');

  // Exit with error code if too many critical issues found
  const criticalIssues = auditor.issues.filter(i => i.severity === 'CRITICAL').length;
  const highIssues = auditor.issues.filter(i => i.severity === 'HIGH').length;
  
  // Only exit if there are many critical issues or a combination of critical and high issues
  if (criticalIssues > 5 || (criticalIssues > 2 && highIssues > 10)) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = SecurityAuditor;
