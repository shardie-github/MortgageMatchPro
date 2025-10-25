#!/usr/bin/env node

/**
 * Bundle Optimizer Script
 * Analyzes and optimizes JavaScript bundles for performance
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Bundle analysis configuration
const BUNDLE_CONFIG = {
  maxBundleSize: 500 * 1024, // 500KB
  maxChunkSize: 200 * 1024,  // 200KB
  maxInitialChunkSize: 300 * 1024, // 300KB
  maxAsyncChunkSize: 100 * 1024,   // 100KB
  maxDuplicateModules: 5,
  maxUnusedModules: 10
};

class BundleOptimizer {
  constructor() {
    this.analysis = {
      bundles: [],
      issues: [],
      recommendations: [],
      summary: {
        totalSize: 0,
        totalChunks: 0,
        duplicateModules: 0,
        unusedModules: 0,
        optimizationScore: 0
      }
    };
  }

  async run() {
    console.log('📦 Starting bundle optimization analysis...\n');
    
    try {
      await this.analyzeBundles();
      await this.identifyIssues();
      await this.generateRecommendations();
      await this.generateReport();
      
      console.log('✅ Bundle optimization analysis completed!');
      
    } catch (error) {
      console.error('❌ Bundle optimization failed:', error);
      process.exit(1);
    }
  }

  async analyzeBundles() {
    console.log('🔍 Analyzing JavaScript bundles...');
    
    const bundleFiles = await this.findBundleFiles();
    
    for (const file of bundleFiles) {
      const analysis = await this.analyzeBundleFile(file);
      if (analysis) {
        this.analysis.bundles.push(analysis);
      }
    }
    
    this.calculateSummary();
    console.log(`   ✅ Analyzed ${this.analysis.bundles.length} bundles`);
  }

  async findBundleFiles() {
    const bundleFiles = [];
    const searchPaths = [
      '.next/static',
      'dist',
      'build',
      'out'
    ];
    
    for (const searchPath of searchPaths) {
      const fullPath = path.join(projectRoot, searchPath);
      try {
        const files = await this.findFiles(fullPath, '.js');
        bundleFiles.push(...files);
      } catch (error) {
        // Directory doesn't exist, skip
      }
    }
    
    return bundleFiles;
  }

  async findFiles(dir, extension) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.findFiles(fullPath, extension);
          files.push(...subFiles);
        } else if (entry.name.endsWith(extension)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
    
    return files;
  }

  async analyzeBundleFile(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf8');
      const relativePath = path.relative(projectRoot, filePath);
      
      const analysis = {
        path: relativePath,
        size: stats.size,
        gzippedSize: this.estimateGzippedSize(content),
        modules: this.extractModules(content),
        dependencies: this.extractDependencies(content),
        unusedCode: this.estimateUnusedCode(content),
        duplicateCode: this.estimateDuplicateCode(content),
        compressionRatio: this.calculateCompressionRatio(content),
        optimizationScore: 0
      };
      
      analysis.optimizationScore = this.calculateOptimizationScore(analysis);
      
      return analysis;
      
    } catch (error) {
      console.warn(`   ⚠️  Could not analyze ${filePath}: ${error.message}`);
      return null;
    }
  }

  estimateGzippedSize(content) {
    // Simple gzip size estimation
    // In a real implementation, you would use a gzip library
    return Math.round(content.length * 0.3);
  }

  extractModules(content) {
    // Extract module imports and exports
    const imports = (content.match(/import\s+.*?from\s+['"]([^'"]+)['"]/g) || []).length;
    const exports = (content.match(/export\s+/g) || []).length;
    const requires = (content.match(/require\s*\(/g) || []).length;
    
    return {
      imports,
      exports,
      requires,
      total: imports + exports + requires
    };
  }

  extractDependencies(content) {
    // Extract dependency patterns
    const patterns = [
      /import\s+.*?from\s+['"]([^'"]+)['"]/g,
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g
    ];
    
    const dependencies = new Set();
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        dependencies.add(match[1]);
      }
    }
    
    return Array.from(dependencies);
  }

  estimateUnusedCode(content) {
    // Estimate unused code by looking for unreferenced functions and variables
    const functions = (content.match(/function\s+\w+/g) || []).length;
    const variables = (content.match(/const\s+\w+|let\s+\w+|var\s+\w+/g) || []).length;
    const classes = (content.match(/class\s+\w+/g) || []).length;
    
    // Simple heuristic: assume 20% of code is unused
    const totalDeclarations = functions + variables + classes;
    return Math.round(totalDeclarations * 0.2);
  }

  estimateDuplicateCode(content) {
    // Look for duplicate code patterns
    const lines = content.split('\n');
    const lineCounts = new Map();
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 20) { // Only count substantial lines
        lineCounts.set(trimmed, (lineCounts.get(trimmed) || 0) + 1);
      }
    }
    
    let duplicates = 0;
    for (const count of lineCounts.values()) {
      if (count > 1) {
        duplicates += count - 1;
      }
    }
    
    return duplicates;
  }

  calculateCompressionRatio(content) {
    const originalSize = content.length;
    const gzippedSize = this.estimateGzippedSize(content);
    return gzippedSize / originalSize;
  }

  calculateOptimizationScore(analysis) {
    let score = 100;
    
    // Penalize large bundles
    if (analysis.size > BUNDLE_CONFIG.maxBundleSize) {
      score -= 20;
    }
    
    // Penalize poor compression
    if (analysis.compressionRatio > 0.5) {
      score -= 15;
    }
    
    // Penalize unused code
    if (analysis.unusedCode > BUNDLE_CONFIG.maxUnusedModules) {
      score -= 10;
    }
    
    // Penalize duplicate code
    if (analysis.duplicateCode > BUNDLE_CONFIG.maxDuplicateModules) {
      score -= 10;
    }
    
    // Reward good compression
    if (analysis.compressionRatio < 0.3) {
      score += 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  calculateSummary() {
    const bundles = this.analysis.bundles;
    
    this.analysis.summary.totalSize = bundles.reduce((sum, bundle) => sum + bundle.size, 0);
    this.analysis.summary.totalChunks = bundles.length;
    this.analysis.summary.duplicateModules = bundles.reduce((sum, bundle) => sum + bundle.duplicateCode, 0);
    this.analysis.summary.unusedModules = bundles.reduce((sum, bundle) => sum + bundle.unusedCode, 0);
    this.analysis.summary.optimizationScore = bundles.reduce((sum, bundle) => sum + bundle.optimizationScore, 0) / bundles.length;
  }

  async identifyIssues() {
    console.log('🔍 Identifying bundle issues...');
    
    const issues = [];
    
    for (const bundle of this.analysis.bundles) {
      // Large bundle size
      if (bundle.size > BUNDLE_CONFIG.maxBundleSize) {
        issues.push({
          type: 'Large Bundle',
          severity: 'High',
          bundle: bundle.path,
          size: bundle.size,
          limit: BUNDLE_CONFIG.maxBundleSize,
          message: `Bundle size (${this.formatBytes(bundle.size)}) exceeds limit (${this.formatBytes(BUNDLE_CONFIG.maxBundleSize)})`
        });
      }
      
      // Poor compression
      if (bundle.compressionRatio > 0.5) {
        issues.push({
          type: 'Poor Compression',
          severity: 'Medium',
          bundle: bundle.path,
          ratio: bundle.compressionRatio,
          message: `Compression ratio (${(bundle.compressionRatio * 100).toFixed(1)}%) is too high`
        });
      }
      
      // Unused code
      if (bundle.unusedCode > BUNDLE_CONFIG.maxUnusedModules) {
        issues.push({
          type: 'Unused Code',
          severity: 'Medium',
          bundle: bundle.path,
          unused: bundle.unusedCode,
          limit: BUNDLE_CONFIG.maxUnusedModules,
          message: `Too many unused modules (${bundle.unusedCode})`
        });
      }
      
      // Duplicate code
      if (bundle.duplicateCode > BUNDLE_CONFIG.maxDuplicateModules) {
        issues.push({
          type: 'Duplicate Code',
          severity: 'Medium',
          bundle: bundle.path,
          duplicates: bundle.duplicateCode,
          limit: BUNDLE_CONFIG.maxDuplicateModules,
          message: `Too many duplicate code blocks (${bundle.duplicateCode})`
        });
      }
    }
    
    this.analysis.issues = issues;
    console.log(`   ✅ Identified ${issues.length} issues`);
  }

  async generateRecommendations() {
    console.log('💡 Generating optimization recommendations...');
    
    const recommendations = [];
    
    // Bundle size recommendations
    const largeBundles = this.analysis.bundles.filter(b => b.size > BUNDLE_CONFIG.maxBundleSize);
    if (largeBundles.length > 0) {
      recommendations.push({
        category: 'Bundle Size',
        priority: 'High',
        issue: `${largeBundles.length} bundles exceed size limit`,
        solution: 'Implement code splitting, lazy loading, and tree shaking',
        impact: 'High',
        bundles: largeBundles.map(b => b.path)
      });
    }
    
    // Compression recommendations
    const poorCompression = this.analysis.bundles.filter(b => b.compressionRatio > 0.5);
    if (poorCompression.length > 0) {
      recommendations.push({
        category: 'Compression',
        priority: 'Medium',
        issue: `${poorCompression.length} bundles have poor compression`,
        solution: 'Enable gzip compression, minify code, and remove unnecessary whitespace',
        impact: 'Medium',
        bundles: poorCompression.map(b => b.path)
      });
    }
    
    // Unused code recommendations
    const unusedCode = this.analysis.bundles.filter(b => b.unusedCode > BUNDLE_CONFIG.maxUnusedModules);
    if (unusedCode.length > 0) {
      recommendations.push({
        category: 'Unused Code',
        priority: 'Medium',
        issue: `${unusedCode.length} bundles contain unused code`,
        solution: 'Remove unused imports, dead code elimination, and tree shaking',
        impact: 'Medium',
        bundles: unusedCode.map(b => b.path)
      });
    }
    
    // Duplicate code recommendations
    const duplicateCode = this.analysis.bundles.filter(b => b.duplicateCode > BUNDLE_CONFIG.maxDuplicateModules);
    if (duplicateCode.length > 0) {
      recommendations.push({
        category: 'Duplicate Code',
        priority: 'Low',
        issue: `${duplicateCode.length} bundles contain duplicate code`,
        solution: 'Extract common code into shared modules, use proper imports',
        impact: 'Low',
        bundles: duplicateCode.map(b => b.path)
      });
    }
    
    // General recommendations
    if (this.analysis.summary.optimizationScore < 70) {
      recommendations.push({
        category: 'General',
        priority: 'High',
        issue: 'Overall optimization score is low',
        solution: 'Implement comprehensive bundle optimization strategy',
        impact: 'High'
      });
    }
    
    this.analysis.recommendations = recommendations;
    console.log(`   ✅ Generated ${recommendations.length} recommendations`);
  }

  async generateReport() {
    console.log('📊 Generating bundle optimization report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.analysis.summary,
      bundles: this.analysis.bundles,
      issues: this.analysis.issues,
      recommendations: this.analysis.recommendations
    };
    
    // Save JSON report
    await fs.writeFile(
      path.join(projectRoot, 'reports', 'bundle-analysis.json'),
      JSON.stringify(report, null, 2)
    );
    
    // Generate Markdown report
    const markdownReport = this.generateMarkdownReport(report);
    await fs.writeFile(
      path.join(projectRoot, 'reports', 'bundle-analysis.md'),
      markdownReport
    );
    
    console.log('   ✅ Bundle optimization report generated');
  }

  generateMarkdownReport(report) {
    return `# Bundle Optimization Report

## Summary

- **Total Bundles**: ${report.summary.totalChunks}
- **Total Size**: ${this.formatBytes(report.summary.totalSize)}
- **Average Size**: ${this.formatBytes(report.summary.totalSize / report.summary.totalChunks)}
- **Optimization Score**: ${report.summary.optimizationScore.toFixed(1)}/100
- **Duplicate Modules**: ${report.summary.duplicateModules}
- **Unused Modules**: ${report.summary.unusedModules}

## Bundle Analysis

${report.bundles
  .sort((a, b) => b.size - a.size)
  .map(bundle => `### ${bundle.path}

- **Size**: ${this.formatBytes(bundle.size)}
- **Gzipped Size**: ${this.formatBytes(bundle.gzippedSize)}
- **Compression Ratio**: ${(bundle.compressionRatio * 100).toFixed(1)}%
- **Modules**: ${bundle.modules.total}
- **Dependencies**: ${bundle.dependencies.length}
- **Unused Code**: ${bundle.unusedCode}
- **Duplicate Code**: ${bundle.duplicateCode}
- **Optimization Score**: ${bundle.optimizationScore}/100

`)
  .join('\n')}

## Issues Found

${report.issues
  .sort((a, b) => {
    const severityOrder = { High: 3, Medium: 2, Low: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  })
  .map(issue => `### ${issue.type} - ${issue.severity} Severity

**Bundle**: ${issue.bundle}

**Issue**: ${issue.message}

${issue.limit ? `**Limit**: ${issue.limit}` : ''}
${issue.ratio ? `**Ratio**: ${(issue.ratio * 100).toFixed(1)}%` : ''}

`)
  .join('\n')}

## Recommendations

${report.recommendations
  .sort((a, b) => {
    const priorityOrder = { High: 3, Medium: 2, Low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  })
  .map(rec => `### ${rec.category} - ${rec.priority} Priority

**Issue**: ${rec.issue}

**Solution**: ${rec.solution}

**Impact**: ${rec.impact}

${rec.bundles ? `**Affected Bundles**: ${rec.bundles.join(', ')}` : ''}

`)
  .join('\n')}

## Optimization Strategies

### 1. Code Splitting
- Implement route-based code splitting
- Use dynamic imports for large components
- Split vendor and application code

### 2. Tree Shaking
- Enable ES6 modules
- Remove unused code
- Use side-effect-free imports

### 3. Compression
- Enable gzip compression
- Use Brotli compression for better ratios
- Minify JavaScript and CSS

### 4. Lazy Loading
- Load components on demand
- Implement image lazy loading
- Use intersection observers

### 5. Bundle Analysis
- Regular bundle size monitoring
- Automated size regression testing
- Performance budgets

## Next Steps

1. **Immediate Actions**:
   - Fix high-priority issues
   - Implement code splitting
   - Enable compression

2. **Short-term Improvements**:
   - Remove unused code
   - Optimize dependencies
   - Implement lazy loading

3. **Long-term Enhancements**:
   - Automated bundle optimization
   - Performance monitoring
   - Continuous optimization

---
*Report generated on ${new Date().toLocaleString()}*
`;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Run the optimizer
const optimizer = new BundleOptimizer();
optimizer.run().catch(console.error);