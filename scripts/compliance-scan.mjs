#!/usr/bin/env node

/**
 * Compliance Scan Script - MortgageMatchPro v1.4.0
 * 
 * This script performs automated compliance scanning to identify:
 * - PII (Personally Identifiable Information) leakage
 * - Insecure headers and configurations
 * - Expired keys and certificates
 * - Security vulnerabilities
 * - Compliance violations
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';

// Configuration
const CONFIG = {
  // PII patterns to scan for
  PII_PATTERNS: {
    SSN: /\b\d{3}-?\d{2}-?\d{4}\b/g,
    EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    PHONE: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    CREDIT_CARD: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    API_KEY: /\b[A-Za-z0-9]{32,}\b/g,
    PASSWORD: /password\s*[:=]\s*["']?[^"'\s]+["']?/gi,
    TOKEN: /token\s*[:=]\s*["']?[^"'\s]+["']?/gi,
    SECRET: /secret\s*[:=]\s*["']?[^"'\s]+["']?/gi,
    PRIVATE_KEY: /-----BEGIN PRIVATE KEY-----/g,
    CERTIFICATE: /-----BEGIN CERTIFICATE-----/g
  },
  
  // File extensions to scan
  SCAN_EXTENSIONS: ['.js', '.ts', '.tsx', '.jsx', '.json', '.md', '.yml', '.yaml', '.env', '.config'],
  
  // Directories to exclude
  EXCLUDE_DIRS: ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '__tests__'],
  
  // Security headers to check
  SECURITY_HEADERS: [
    'Strict-Transport-Security',
    'X-Content-Type-Options',
    'X-Frame-Options',
    'X-XSS-Protection',
    'Content-Security-Policy',
    'Referrer-Policy',
    'Permissions-Policy'
  ],
  
  // Compliance thresholds
  THRESHOLDS: {
    MAX_PII_FINDINGS: 0,
    MAX_SECURITY_ISSUES: 5,
    MAX_EXPIRED_KEYS: 0,
    MAX_VULNERABILITIES: 0
  }
};

// Scan results
const scanResults = {
  piiFindings: [],
  securityIssues: [],
  expiredKeys: [],
  vulnerabilities: [],
  complianceScore: 100,
  recommendations: []
};

/**
 * Main compliance scan function
 */
async function runComplianceScan() {
  console.log('🔍 Starting Compliance Scan - MortgageMatchPro v1.4.0\n');
  
  try {
    // Get all files to scan
    const files = await getAllFiles(process.cwd());
    console.log(`📁 Scanning ${files.length} files...\n`);
    
    // Run all scans
    await Promise.all([
      scanForPII(files),
      scanSecurityHeaders(files),
      scanForExpiredKeys(files),
      scanForVulnerabilities(files),
      scanComplianceViolations(files)
    ]);
    
    // Calculate compliance score
    calculateComplianceScore();
    
    // Generate report
    generateReport();
    
  } catch (error) {
    console.error('❌ Compliance scan failed:', error.message);
    process.exit(1);
  }
}

/**
 * Get all files to scan
 */
async function getAllFiles(dir, files = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (!CONFIG.EXCLUDE_DIRS.includes(entry.name)) {
        await getAllFiles(fullPath, files);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (CONFIG.SCAN_EXTENSIONS.includes(ext)) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

/**
 * Scan for PII leakage
 */
async function scanForPII(files) {
  console.log('🔍 Scanning for PII leakage...');
  
  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf8');
      
      for (const [patternName, pattern] of Object.entries(CONFIG.PII_PATTERNS)) {
        const matches = content.match(pattern);
        if (matches) {
          scanResults.piiFindings.push({
            file: file.replace(process.cwd(), ''),
            pattern: patternName,
            matches: matches.length,
            severity: getPIISeverity(patternName),
            line: findLineNumber(content, matches[0])
          });
        }
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }
  
  console.log(`   Found ${scanResults.piiFindings.length} PII findings`);
}

/**
 * Scan security headers
 */
async function scanSecurityHeaders(files) {
  console.log('🔍 Scanning security headers...');
  
  const headerFiles = files.filter(f => f.includes('next.config') || f.includes('vercel.json') || f.includes('middleware'));
  
  for (const file of headerFiles) {
    try {
      const content = await fs.readFile(file, 'utf8');
      
      // Check for security header configurations
      for (const header of CONFIG.SECURITY_HEADERS) {
        if (!content.includes(header)) {
          scanResults.securityIssues.push({
            file: file.replace(process.cwd(), ''),
            issue: `Missing security header: ${header}`,
            severity: 'medium',
            recommendation: `Add ${header} header to improve security`
          });
        }
      }
      
      // Check for insecure configurations
      if (content.includes('http://') && !content.includes('localhost')) {
        scanResults.securityIssues.push({
          file: file.replace(process.cwd(), ''),
          issue: 'Insecure HTTP protocol detected',
          severity: 'high',
          recommendation: 'Use HTTPS for all external communications'
        });
      }
      
    } catch (error) {
      // Skip files that can't be read
    }
  }
  
  console.log(`   Found ${scanResults.securityIssues.length} security issues`);
}

/**
 * Scan for expired keys and certificates
 */
async function scanForExpiredKeys(files) {
  console.log('🔍 Scanning for expired keys and certificates...');
  
  const keyFiles = files.filter(f => f.includes('.pem') || f.includes('.key') || f.includes('.crt') || f.includes('.p12'));
  
  for (const file of keyFiles) {
    try {
      const content = await fs.readFile(file, 'utf8');
      
      // Check for certificate expiration
      if (content.includes('-----BEGIN CERTIFICATE-----')) {
        const cert = content.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/);
        if (cert) {
          try {
            const certData = cert[0];
            // Simple check for expiration (this is a simplified version)
            if (certData.includes('2023') || certData.includes('2022')) {
              scanResults.expiredKeys.push({
                file: file.replace(process.cwd(), ''),
                type: 'Certificate',
                issue: 'Potentially expired certificate',
                severity: 'high',
                recommendation: 'Update certificate with current date'
              });
            }
          } catch (error) {
            // Skip invalid certificates
          }
        }
      }
      
    } catch (error) {
      // Skip files that can't be read
    }
  }
  
  console.log(`   Found ${scanResults.expiredKeys.length} expired keys/certificates`);
}

/**
 * Scan for vulnerabilities
 */
async function scanForVulnerabilities(files) {
  console.log('🔍 Scanning for vulnerabilities...');
  
  // Check package.json for known vulnerabilities
  const packageFiles = files.filter(f => f.includes('package.json'));
  
  for (const file of packageFiles) {
    try {
      const content = await fs.readFile(file, 'utf8');
      const pkg = JSON.parse(content);
      
      // Check for vulnerable dependencies
      const vulnerableDeps = [
        'lodash@4.17.20',
        'axios@0.21.0',
        'moment@2.29.0'
      ];
      
      for (const dep of vulnerableDeps) {
        if (pkg.dependencies && pkg.dependencies[dep.split('@')[0]]) {
          scanResults.vulnerabilities.push({
            file: file.replace(process.cwd(), ''),
            dependency: dep,
            issue: 'Known vulnerable dependency',
            severity: 'high',
            recommendation: `Update ${dep.split('@')[0]} to latest version`
          });
        }
      }
      
    } catch (error) {
      // Skip invalid JSON files
    }
  }
  
  console.log(`   Found ${scanResults.vulnerabilities.length} vulnerabilities`);
}

/**
 * Scan for compliance violations
 */
async function scanComplianceViolations(files) {
  console.log('🔍 Scanning for compliance violations...');
  
  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf8');
      
      // Check for hardcoded secrets
      if (content.includes('sk-') || content.includes('pk_') || content.includes('rk_')) {
        scanResults.securityIssues.push({
          file: file.replace(process.cwd(), ''),
          issue: 'Potential hardcoded API key detected',
          severity: 'high',
          recommendation: 'Move API keys to environment variables'
        });
      }
      
      // Check for console.log in production code
      if (file.includes('src/') && content.includes('console.log')) {
        scanResults.securityIssues.push({
          file: file.replace(process.cwd(), ''),
          issue: 'Console.log found in production code',
          severity: 'low',
          recommendation: 'Remove or replace with proper logging'
        });
      }
      
      // Check for TODO comments in production code
      if (file.includes('src/') && content.includes('TODO')) {
        scanResults.securityIssues.push({
          file: file.replace(process.cwd(), ''),
          issue: 'TODO comment found in production code',
          severity: 'low',
          recommendation: 'Address TODO items before production deployment'
        });
      }
      
    } catch (error) {
      // Skip files that can't be read
    }
  }
}

/**
 * Calculate compliance score
 */
function calculateComplianceScore() {
  let score = 100;
  
  // Deduct points for findings
  score -= scanResults.piiFindings.length * 10; // 10 points per PII finding
  score -= scanResults.securityIssues.length * 5; // 5 points per security issue
  score -= scanResults.expiredKeys.length * 15; // 15 points per expired key
  score -= scanResults.vulnerabilities.length * 20; // 20 points per vulnerability
  
  // Ensure score doesn't go below 0
  score = Math.max(0, score);
  
  scanResults.complianceScore = score;
}

/**
 * Generate compliance report
 */
function generateReport() {
  console.log('\n📊 Compliance Scan Report\n');
  console.log('=' .repeat(50));
  
  // Summary
  console.log('\n📈 Summary:');
  console.log(`   Compliance Score: ${scanResults.complianceScore}/100`);
  console.log(`   PII Findings: ${scanResults.piiFindings.length}`);
  console.log(`   Security Issues: ${scanResults.securityIssues.length}`);
  console.log(`   Expired Keys: ${scanResults.expiredKeys.length}`);
  console.log(`   Vulnerabilities: ${scanResults.vulnerabilities.length}`);
  
  // PII Findings
  if (scanResults.piiFindings.length > 0) {
    console.log('\n🚨 PII Findings:');
    scanResults.piiFindings.forEach(finding => {
      console.log(`   ${finding.severity.toUpperCase()}: ${finding.file}:${finding.line} - ${finding.pattern} (${finding.matches} matches)`);
    });
  }
  
  // Security Issues
  if (scanResults.securityIssues.length > 0) {
    console.log('\n🔒 Security Issues:');
    scanResults.securityIssues.forEach(issue => {
      console.log(`   ${issue.severity.toUpperCase()}: ${issue.file} - ${issue.issue}`);
      console.log(`      Recommendation: ${issue.recommendation}`);
    });
  }
  
  // Expired Keys
  if (scanResults.expiredKeys.length > 0) {
    console.log('\n🔑 Expired Keys/Certificates:');
    scanResults.expiredKeys.forEach(key => {
      console.log(`   ${key.severity.toUpperCase()}: ${key.file} - ${key.issue}`);
      console.log(`      Recommendation: ${key.recommendation}`);
    });
  }
  
  // Vulnerabilities
  if (scanResults.vulnerabilities.length > 0) {
    console.log('\n🐛 Vulnerabilities:');
    scanResults.vulnerabilities.forEach(vuln => {
      console.log(`   ${vuln.severity.toUpperCase()}: ${vuln.file} - ${vuln.dependency}`);
      console.log(`      Recommendation: ${vuln.recommendation}`);
    });
  }
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  if (scanResults.complianceScore < 80) {
    console.log('   - Address all high and medium severity issues');
    console.log('   - Implement automated security scanning in CI/CD');
    console.log('   - Regular security training for development team');
  }
  if (scanResults.piiFindings.length > 0) {
    console.log('   - Implement PII detection in pre-commit hooks');
    console.log('   - Use data masking for development environments');
  }
  if (scanResults.securityIssues.length > 0) {
    console.log('   - Implement security headers middleware');
    console.log('   - Regular security configuration reviews');
  }
  
  // Compliance status
  console.log('\n✅ Compliance Status:');
  if (scanResults.complianceScore >= 90) {
    console.log('   🟢 EXCELLENT - Ready for enterprise deployment');
  } else if (scanResults.complianceScore >= 80) {
    console.log('   🟡 GOOD - Minor issues to address');
  } else if (scanResults.complianceScore >= 70) {
    console.log('   🟠 FAIR - Several issues need attention');
  } else {
    console.log('   🔴 POOR - Major compliance issues detected');
  }
  
  console.log('\n' + '=' .repeat(50));
  
  // Save detailed report
  saveDetailedReport();
}

/**
 * Save detailed report to file
 */
async function saveDetailedReport() {
  const report = {
    timestamp: new Date().toISOString(),
    version: '1.4.0',
    complianceScore: scanResults.complianceScore,
    summary: {
      piiFindings: scanResults.piiFindings.length,
      securityIssues: scanResults.securityIssues.length,
      expiredKeys: scanResults.expiredKeys.length,
      vulnerabilities: scanResults.vulnerabilities.length
    },
    findings: {
      pii: scanResults.piiFindings,
      security: scanResults.securityIssues,
      expiredKeys: scanResults.expiredKeys,
      vulnerabilities: scanResults.vulnerabilities
    },
    recommendations: generateRecommendations()
  };
  
  try {
    await fs.writeFile('compliance-scan-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Detailed report saved to: compliance-scan-report.json');
  } catch (error) {
    console.error('Failed to save detailed report:', error.message);
  }
}

/**
 * Generate recommendations based on findings
 */
function generateRecommendations() {
  const recommendations = [];
  
  if (scanResults.piiFindings.length > 0) {
    recommendations.push({
      category: 'PII Protection',
      priority: 'high',
      action: 'Implement PII detection and masking',
      details: 'Add automated PII scanning to pre-commit hooks and development workflows'
    });
  }
  
  if (scanResults.securityIssues.length > 0) {
    recommendations.push({
      category: 'Security Headers',
      priority: 'medium',
      action: 'Implement comprehensive security headers',
      details: 'Add security headers middleware and regular security configuration reviews'
    });
  }
  
  if (scanResults.expiredKeys.length > 0) {
    recommendations.push({
      category: 'Certificate Management',
      priority: 'high',
      action: 'Update expired certificates and keys',
      details: 'Implement automated certificate renewal and monitoring'
    });
  }
  
  if (scanResults.vulnerabilities.length > 0) {
    recommendations.push({
      category: 'Dependency Security',
      priority: 'high',
      action: 'Update vulnerable dependencies',
      details: 'Implement automated dependency scanning and regular updates'
    });
  }
  
  return recommendations;
}

/**
 * Get PII severity level
 */
function getPIISeverity(patternName) {
  const highSeverity = ['SSN', 'CREDIT_CARD', 'PRIVATE_KEY', 'API_KEY'];
  const mediumSeverity = ['EMAIL', 'PHONE', 'PASSWORD', 'TOKEN', 'SECRET'];
  
  if (highSeverity.includes(patternName)) return 'high';
  if (mediumSeverity.includes(patternName)) return 'medium';
  return 'low';
}

/**
 * Find line number for a match
 */
function findLineNumber(content, match) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(match)) {
      return i + 1;
    }
  }
  return 1;
}

// Run the scan
runComplianceScan().catch(console.error);
