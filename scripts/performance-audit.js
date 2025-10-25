#!/usr/bin/env node

/**
 * Performance Audit Script
 * Analyzes and optimizes application performance
 */

const fs = require('fs');
const path = require('path');

class PerformanceAuditor {
  constructor() {
    this.issues = [];
    this.recommendations = [];
    this.metrics = {};
  }

  logIssue(severity, category, message, file = null, line = null) {
    this.issues.push({ severity, category, message, file, line });
  }

  logRecommendation(category, message, impact = 'MEDIUM') {
    this.recommendations.push({ category, message, impact });
  }

  async auditFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        this.checkPerformanceIssues(line, index + 1, filePath);
      });

      this.analyzeFilePatterns(content, filePath);
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error.message);
    }
  }

  checkPerformanceIssues(line, lineNumber, filePath) {
    // Check for inefficient loops
    if (this.containsInefficientLoop(line)) {
      this.logIssue('MEDIUM', 'LOOPS', 'Inefficient loop detected', filePath, lineNumber);
    }

    // Check for memory leaks
    if (this.containsMemoryLeak(line)) {
      this.logIssue('HIGH', 'MEMORY', 'Potential memory leak', filePath, lineNumber);
    }

    // Check for blocking operations
    if (this.containsBlockingOperation(line)) {
      this.logIssue('HIGH', 'BLOCKING', 'Blocking operation detected', filePath, lineNumber);
    }

    // Check for large bundle imports
    if (this.containsLargeImport(line)) {
      this.logIssue('MEDIUM', 'BUNDLE_SIZE', 'Large library import', filePath, lineNumber);
    }

    // Check for missing memoization
    if (this.shouldBeMemoized(line)) {
      this.logIssue('LOW', 'OPTIMIZATION', 'Consider memoization', filePath, lineNumber);
    }

    // Check for unnecessary re-renders
    if (this.causesUnnecessaryRerender(line)) {
      this.logIssue('MEDIUM', 'RENDER', 'Potential unnecessary re-render', filePath, lineNumber);
    }
  }

  analyzeFilePatterns(content, filePath) {
    // Check for missing lazy loading
    if (content.includes('import') && content.includes('Component') && !content.includes('lazy')) {
      this.logRecommendation('BUNDLE', 'Consider lazy loading for large components');
    }

    // Check for missing code splitting
    if (content.includes('import') && content.split('import').length > 10) {
      this.logRecommendation('BUNDLE', 'Consider code splitting for large files');
    }

    // Check for missing caching
    if (content.includes('fetch') && !content.includes('cache')) {
      this.logRecommendation('NETWORK', 'Consider implementing caching for API calls');
    }

    // Check for missing debouncing
    if (content.includes('onChange') && !content.includes('debounce')) {
      this.logRecommendation('UX', 'Consider debouncing user input handlers');
    }
  }

  containsInefficientLoop(line) {
    const inefficientPatterns = [
      /for\s*\(\s*let\s+\w+\s*=\s*0\s*;\s*\w+\s*<\s*array\.length\s*;\s*\w+\+\+\)/,
      /for\s*\(\s*let\s+\w+\s*in\s*\w+\)/,
      /\.forEach\s*\(\s*\(\s*\w+\s*,\s*\w+\s*\)\s*=>/,
    ];

    return inefficientPatterns.some(pattern => pattern.test(line));
  }

  containsMemoryLeak(line) {
    const leakPatterns = [
      /addEventListener.*(?!removeEventListener)/,
      /setInterval.*(?!clearInterval)/,
      /setTimeout.*(?!clearTimeout)/,
      /new\s+EventTarget/,
    ];

    return leakPatterns.some(pattern => pattern.test(line));
  }

  containsBlockingOperation(line) {
    const blockingPatterns = [
      /JSON\.parse\s*\(\s*[^)]{1000,}/,
      /JSON\.stringify\s*\(\s*[^)]{1000,}/,
      /\.sort\s*\(\s*[^)]{100,}/,
      /\.filter\s*\(\s*[^)]{100,}/,
    ];

    return blockingPatterns.some(pattern => pattern.test(line));
  }

  containsLargeImport(line) {
    const largeLibraries = [
      'lodash',
      'moment',
      'jquery',
      'bootstrap',
      'material-ui',
      'antd',
    ];

    return largeLibraries.some(lib => line.includes(`import.*${lib}`));
  }

  shouldBeMemoized(line) {
    const memoizablePatterns = [
      /const\s+\w+\s*=\s*\(\s*[^)]*\)\s*=>\s*{/,
      /function\s+\w+\s*\(\s*[^)]*\)\s*{/,
      /useCallback/,
      /useMemo/,
    ];

    return memoizablePatterns.some(pattern => pattern.test(line));
  }

  causesUnnecessaryRerender(line) {
    const rerenderPatterns = [
      /style\s*=\s*{\s*{[^}]*}\s*}/,
      /onClick\s*=\s*{\s*\(\s*\)\s*=>/,
      /onChange\s*=\s*{\s*\(\s*[^)]*\)\s*=>/,
    ];

    return rerenderPatterns.some(pattern => pattern.test(line));
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
    const auditableExtensions = ['.js', '.ts', '.tsx', '.jsx'];
    return auditableExtensions.some(ext => filename.endsWith(ext));
  }

  async auditBundleSize() {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const dependencies = Object.keys(packageJson.dependencies || {});
      
      // Check for heavy dependencies
      const heavyDependencies = [
        'lodash',
        'moment',
        'jquery',
        'bootstrap',
        'material-ui',
        'antd',
        'react-router-dom',
      ];

      heavyDependencies.forEach(dep => {
        if (dependencies.includes(dep)) {
          this.logRecommendation('BUNDLE', `Consider replacing ${dep} with lighter alternatives`);
        }
      });

      // Check bundle size
      this.metrics.bundleSize = this.estimateBundleSize(dependencies);
      
    } catch (error) {
      this.logIssue('MEDIUM', 'BUNDLE', 'Error analyzing bundle size');
    }
  }

  estimateBundleSize(dependencies) {
    // Rough estimation based on common library sizes
    const librarySizes = {
      'react': 45,
      'react-dom': 130,
      'lodash': 70,
      'moment': 67,
      'jquery': 87,
      'bootstrap': 150,
      'material-ui': 200,
      'antd': 300,
    };

    let totalSize = 0;
    dependencies.forEach(dep => {
      if (librarySizes[dep]) {
        totalSize += librarySizes[dep];
      }
    });

    return totalSize;
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues: this.issues.length,
        totalRecommendations: this.recommendations.length,
        highIssues: this.issues.filter(i => i.severity === 'HIGH').length,
        mediumIssues: this.issues.filter(i => i.severity === 'MEDIUM').length,
        lowIssues: this.issues.filter(i => i.severity === 'LOW').length,
      },
      metrics: this.metrics,
      issues: this.issues,
      recommendations: this.recommendations,
    };

    return report;
  }

  printReport() {
    console.log('\n⚡ PERFORMANCE AUDIT REPORT');
    console.log('===========================\n');

    console.log(`📊 Summary:`);
    console.log(`   High Issues: ${this.issues.filter(i => i.severity === 'HIGH').length}`);
    console.log(`   Medium Issues: ${this.issues.filter(i => i.severity === 'MEDIUM').length}`);
    console.log(`   Low Issues: ${this.issues.filter(i => i.severity === 'LOW').length}`);
    console.log(`   Recommendations: ${this.recommendations.length}\n`);

    if (this.issues.length > 0) {
      console.log('🚨 PERFORMANCE ISSUES:');
      this.issues.forEach(issue => {
        console.log(`   [${issue.severity}] ${issue.category}: ${issue.message}`);
        if (issue.file) console.log(`      File: ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
      });
      console.log('');
    }

    if (this.recommendations.length > 0) {
      console.log('💡 OPTIMIZATION RECOMMENDATIONS:');
      this.recommendations.forEach(rec => {
        console.log(`   [${rec.impact}] ${rec.category}: ${rec.message}`);
      });
      console.log('');
    }

    if (this.metrics.bundleSize) {
      console.log(`📦 Estimated Bundle Size: ${this.metrics.bundleSize}KB`);
      if (this.metrics.bundleSize > 500) {
        console.log('⚠️  Bundle size is large, consider code splitting');
      }
    }

    const score = this.calculatePerformanceScore();
    console.log(`⚡ Performance Score: ${score}/100`);
    
    if (score < 70) {
      console.log('❌ Performance score needs significant improvement');
    } else if (score < 85) {
      console.log('⚠️  Performance score needs improvement');
    } else {
      console.log('✅ Performance score is good');
    }
  }

  calculatePerformanceScore() {
    const totalIssues = this.issues.length;
    const highIssues = this.issues.filter(i => i.severity === 'HIGH').length;
    const mediumIssues = this.issues.filter(i => i.severity === 'MEDIUM').length;
    
    let score = 100;
    score -= highIssues * 15;
    score -= mediumIssues * 8;
    score -= (totalIssues - highIssues - mediumIssues) * 3;
    
    // Bundle size penalty
    if (this.metrics.bundleSize > 1000) {
      score -= 20;
    } else if (this.metrics.bundleSize > 500) {
      score -= 10;
    }
    
    return Math.max(0, score);
  }
}

async function main() {
  const auditor = new PerformanceAuditor();
  
  console.log('🔍 Starting performance audit...\n');

  // Audit source code
  await auditor.auditDirectory('./lib');
  await auditor.auditDirectory('./pages');
  await auditor.auditDirectory('./components');
  await auditor.auditDirectory('./src');

  // Audit bundle size
  await auditor.auditBundleSize();

  // Generate and print report
  auditor.printReport();

  // Save report to file
  const report = auditor.generateReport();
  fs.writeFileSync('performance-audit-report.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Detailed report saved to performance-audit-report.json');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = PerformanceAuditor;
