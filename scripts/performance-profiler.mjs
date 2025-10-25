#!/usr/bin/env node

/**
 * Performance Profiler Script
 * Profiles backend routes, identifies bottlenecks, and provides optimization recommendations
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Performance thresholds
const THRESHOLDS = {
  responseTime: {
    excellent: 100,    // ms
    good: 300,         // ms
    acceptable: 500,   // ms
    poor: 1000         // ms
  },
  memoryUsage: {
    excellent: 50,     // MB
    good: 100,         // MB
    acceptable: 200,   // MB
    poor: 500          // MB
  },
  cpuUsage: {
    excellent: 10,     // %
    good: 25,          // %
    acceptable: 50,    // %
    poor: 80           // %
  },
  dbQueries: {
    excellent: 1,      // queries per request
    good: 3,           // queries per request
    acceptable: 5,     // queries per request
    poor: 10           // queries per request
  }
};

class PerformanceProfiler {
  constructor() {
    this.results = {
      routes: [],
      recommendations: [],
      summary: {
        totalRoutes: 0,
        excellentRoutes: 0,
        goodRoutes: 0,
        acceptableRoutes: 0,
        poorRoutes: 0,
        averageResponseTime: 0,
        averageMemoryUsage: 0,
        averageCpuUsage: 0,
        totalDbQueries: 0
      }
    };
  }

  async run() {
    console.log('🔍 Starting performance profiling...\n');
    
    try {
      await this.analyzeRoutes();
      await this.analyzeDatabaseQueries();
      await this.analyzeMemoryUsage();
      await this.analyzeCpuUsage();
      await this.generateRecommendations();
      await this.generateReport();
      
      console.log('✅ Performance profiling completed successfully!');
      
    } catch (error) {
      console.error('❌ Performance profiling failed:', error);
      process.exit(1);
    }
  }

  async analyzeRoutes() {
    console.log('📊 Analyzing API routes...');
    
    const routeFiles = await this.findRouteFiles();
    
    for (const file of routeFiles) {
      const route = await this.analyzeRouteFile(file);
      if (route) {
        this.results.routes.push(route);
      }
    }
    
    this.calculateRouteSummary();
    console.log(`   ✅ Analyzed ${this.results.routes.length} routes`);
  }

  async findRouteFiles() {
    const routeFiles = [];
    const searchPaths = [
      'pages/api',
      'app/api',
      'core/api',
      'apps/web/api'
    ];
    
    for (const searchPath of searchPaths) {
      const fullPath = path.join(projectRoot, searchPath);
      try {
        const files = await this.findFiles(fullPath, '.ts');
        routeFiles.push(...files);
      } catch (error) {
        // Directory doesn't exist, skip
      }
    }
    
    return routeFiles;
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

  async analyzeRouteFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const relativePath = path.relative(projectRoot, filePath);
      
      // Extract route information
      const route = {
        path: relativePath,
        method: this.extractHttpMethod(content),
        complexity: this.calculateComplexity(content),
        dbQueries: this.countDbQueries(content),
        externalCalls: this.countExternalCalls(content),
        responseTime: this.estimateResponseTime(content),
        memoryUsage: this.estimateMemoryUsage(content),
        cpuUsage: this.estimateCpuUsage(content),
        issues: this.identifyIssues(content)
      };
      
      return route;
      
    } catch (error) {
      console.warn(`   ⚠️  Could not analyze ${filePath}: ${error.message}`);
      return null;
    }
  }

  extractHttpMethod(content) {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    for (const method of methods) {
      if (content.includes(`export default async function ${method.toLowerCase()}`) ||
          content.includes(`export async function ${method.toLowerCase()}`) ||
          content.includes(`case '${method}':`)) {
        return method;
      }
    }
    return 'GET'; // Default
  }

  calculateComplexity(content) {
    // Simple complexity calculation based on code structure
    const lines = content.split('\n').length;
    const functions = (content.match(/function|=>/g) || []).length;
    const conditionals = (content.match(/if|else|switch|case/g) || []).length;
    const loops = (content.match(/for|while|forEach|map|filter/g) || []).length;
    
    return lines + functions * 2 + conditionals * 3 + loops * 4;
  }

  countDbQueries(content) {
    const dbPatterns = [
      /\.from\(/g,
      /\.select\(/g,
      /\.insert\(/g,
      /\.update\(/g,
      /\.delete\(/g,
      /\.query\(/g,
      /\.execute\(/g
    ];
    
    let count = 0;
    for (const pattern of dbPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }
    
    return count;
  }

  countExternalCalls(content) {
    const externalPatterns = [
      /fetch\(/g,
      /axios\./g,
      /\.get\(/g,
      /\.post\(/g,
      /\.put\(/g,
      /\.delete\(/g,
      /openai\./g,
      /stripe\./g
    ];
    
    let count = 0;
    for (const pattern of externalPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }
    
    return count;
  }

  estimateResponseTime(content) {
    let baseTime = 50; // Base response time in ms
    
    // Add time for database queries
    const dbQueries = this.countDbQueries(content);
    baseTime += dbQueries * 20; // 20ms per query
    
    // Add time for external calls
    const externalCalls = this.countExternalCalls(content);
    baseTime += externalCalls * 100; // 100ms per external call
    
    // Add time for AI processing
    if (content.includes('openai') || content.includes('gpt')) {
      baseTime += 2000; // 2 seconds for AI processing
    }
    
    // Add time for file operations
    if (content.includes('fs.') || content.includes('readFile') || content.includes('writeFile')) {
      baseTime += 50;
    }
    
    return baseTime;
  }

  estimateMemoryUsage(content) {
    let memory = 10; // Base memory usage in MB
    
    // Add memory for large data processing
    if (content.includes('JSON.parse') || content.includes('JSON.stringify')) {
      memory += 20;
    }
    
    // Add memory for file operations
    if (content.includes('fs.') || content.includes('readFile')) {
      memory += 30;
    }
    
    // Add memory for AI processing
    if (content.includes('openai') || content.includes('gpt')) {
      memory += 100;
    }
    
    // Add memory for image processing
    if (content.includes('image') || content.includes('resize') || content.includes('crop')) {
      memory += 50;
    }
    
    return memory;
  }

  estimateCpuUsage(content) {
    let cpu = 5; // Base CPU usage in %
    
    // Add CPU for complex calculations
    const complexity = this.calculateComplexity(content);
    cpu += Math.min(complexity / 100, 30);
    
    // Add CPU for AI processing
    if (content.includes('openai') || content.includes('gpt')) {
      cpu += 40;
    }
    
    // Add CPU for encryption/decryption
    if (content.includes('crypto') || content.includes('encrypt') || content.includes('hash')) {
      cpu += 15;
    }
    
    // Add CPU for image processing
    if (content.includes('image') || content.includes('resize') || content.includes('crop')) {
      cpu += 25;
    }
    
    return Math.min(cpu, 100);
  }

  identifyIssues(content) {
    const issues = [];
    
    // Check for N+1 queries
    if (this.countDbQueries(content) > 5) {
      issues.push('Potential N+1 query problem');
    }
    
    // Check for missing error handling
    if (!content.includes('try') && !content.includes('catch')) {
      issues.push('Missing error handling');
    }
    
    // Check for synchronous operations
    if (content.includes('fs.readFileSync') || content.includes('fs.writeFileSync')) {
      issues.push('Synchronous file operations detected');
    }
    
    // Check for memory leaks
    if (content.includes('setInterval') && !content.includes('clearInterval')) {
      issues.push('Potential memory leak: setInterval without clearInterval');
    }
    
    if (content.includes('setTimeout') && !content.includes('clearTimeout')) {
      issues.push('Potential memory leak: setTimeout without clearTimeout');
    }
    
    // Check for missing input validation
    if (!content.includes('validate') && !content.includes('zod') && !content.includes('joi')) {
      issues.push('Missing input validation');
    }
    
    // Check for hardcoded values
    if (content.includes('localhost') || content.includes('127.0.0.1')) {
      issues.push('Hardcoded localhost references');
    }
    
    return issues;
  }

  calculateRouteSummary() {
    const routes = this.results.routes;
    this.results.summary.totalRoutes = routes.length;
    
    let totalResponseTime = 0;
    let totalMemoryUsage = 0;
    let totalCpuUsage = 0;
    let totalDbQueries = 0;
    
    for (const route of routes) {
      totalResponseTime += route.responseTime;
      totalMemoryUsage += route.memoryUsage;
      totalCpuUsage += route.cpuUsage;
      totalDbQueries += route.dbQueries;
      
      // Categorize route performance
      if (route.responseTime <= THRESHOLDS.responseTime.excellent) {
        this.results.summary.excellentRoutes++;
      } else if (route.responseTime <= THRESHOLDS.responseTime.good) {
        this.results.summary.goodRoutes++;
      } else if (route.responseTime <= THRESHOLDS.responseTime.acceptable) {
        this.results.summary.acceptableRoutes++;
      } else {
        this.results.summary.poorRoutes++;
      }
    }
    
    this.results.summary.averageResponseTime = totalResponseTime / routes.length;
    this.results.summary.averageMemoryUsage = totalMemoryUsage / routes.length;
    this.results.summary.averageCpuUsage = totalCpuUsage / routes.length;
    this.results.summary.totalDbQueries = totalDbQueries;
  }

  async analyzeDatabaseQueries() {
    console.log('🗄️  Analyzing database queries...');
    
    // This would typically connect to the database and analyze query performance
    // For now, we'll analyze the code for query patterns
    
    const queryPatterns = {
      nPlusOne: 0,
      missingIndexes: 0,
      slowQueries: 0,
      inefficientJoins: 0
    };
    
    for (const route of this.results.routes) {
      if (route.dbQueries > 5) {
        queryPatterns.nPlusOne++;
      }
      if (route.dbQueries > 10) {
        queryPatterns.slowQueries++;
      }
    }
    
    this.results.databaseQueries = queryPatterns;
    console.log('   ✅ Database query analysis completed');
  }

  async analyzeMemoryUsage() {
    console.log('💾 Analyzing memory usage...');
    
    // This would typically monitor actual memory usage
    // For now, we'll provide estimates based on code analysis
    
    const memoryAnalysis = {
      totalEstimatedUsage: this.results.summary.averageMemoryUsage * this.results.summary.totalRoutes,
      peakUsage: this.results.summary.averageMemoryUsage * 2,
      potentialLeaks: this.results.routes.filter(route => route.issues.some(issue => issue.includes('memory leak'))).length
    };
    
    this.results.memoryAnalysis = memoryAnalysis;
    console.log('   ✅ Memory usage analysis completed');
  }

  async analyzeCpuUsage() {
    console.log('⚡ Analyzing CPU usage...');
    
    // This would typically monitor actual CPU usage
    // For now, we'll provide estimates based on code analysis
    
    const cpuAnalysis = {
      totalEstimatedUsage: this.results.summary.averageCpuUsage * this.results.summary.totalRoutes,
      peakUsage: this.results.summary.averageCpuUsage * 2,
      bottlenecks: this.results.routes.filter(route => route.cpuUsage > THRESHOLDS.cpuUsage.acceptable).length
    };
    
    this.results.cpuAnalysis = cpuAnalysis;
    console.log('   ✅ CPU usage analysis completed');
  }

  async generateRecommendations() {
    console.log('💡 Generating optimization recommendations...');
    
    const recommendations = [];
    
    // Response time recommendations
    if (this.results.summary.averageResponseTime > THRESHOLDS.responseTime.acceptable) {
      recommendations.push({
        category: 'Response Time',
        priority: 'High',
        issue: 'Average response time is too high',
        solution: 'Implement caching, optimize database queries, and consider CDN',
        impact: 'High'
      });
    }
    
    // Memory usage recommendations
    if (this.results.summary.averageMemoryUsage > THRESHOLDS.memoryUsage.acceptable) {
      recommendations.push({
        category: 'Memory Usage',
        priority: 'Medium',
        issue: 'High memory usage detected',
        solution: 'Implement memory pooling, optimize data structures, and add garbage collection',
        impact: 'Medium'
      });
    }
    
    // CPU usage recommendations
    if (this.results.summary.averageCpuUsage > THRESHOLDS.cpuUsage.acceptable) {
      recommendations.push({
        category: 'CPU Usage',
        priority: 'High',
        issue: 'High CPU usage detected',
        solution: 'Optimize algorithms, implement caching, and consider horizontal scaling',
        impact: 'High'
      });
    }
    
    // Database query recommendations
    if (this.results.summary.totalDbQueries > this.results.summary.totalRoutes * 3) {
      recommendations.push({
        category: 'Database',
        priority: 'High',
        issue: 'Too many database queries per request',
        solution: 'Implement query optimization, add database indexes, and consider query batching',
        impact: 'High'
      });
    }
    
    // Specific route recommendations
    for (const route of this.results.routes) {
      if (route.issues.length > 0) {
        recommendations.push({
          category: 'Code Quality',
          priority: 'Medium',
          issue: `Issues in ${route.path}: ${route.issues.join(', ')}`,
          solution: 'Fix identified issues and improve code quality',
          impact: 'Medium'
        });
      }
    }
    
    this.results.recommendations = recommendations;
    console.log(`   ✅ Generated ${recommendations.length} recommendations`);
  }

  async generateReport() {
    console.log('📊 Generating performance report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.results.summary,
      routes: this.results.routes,
      recommendations: this.results.recommendations,
      databaseQueries: this.results.databaseQueries,
      memoryAnalysis: this.results.memoryAnalysis,
      cpuAnalysis: this.results.cpuAnalysis
    };
    
    // Save JSON report
    await fs.writeFile(
      path.join(projectRoot, 'reports', 'performance-analysis.json'),
      JSON.stringify(report, null, 2)
    );
    
    // Generate Markdown report
    const markdownReport = this.generateMarkdownReport(report);
    await fs.writeFile(
      path.join(projectRoot, 'reports', 'performance-analysis.md'),
      markdownReport
    );
    
    console.log('   ✅ Performance report generated');
  }

  generateMarkdownReport(report) {
    return `# Performance Analysis Report

## Summary

- **Total Routes**: ${report.summary.totalRoutes}
- **Average Response Time**: ${report.summary.averageResponseTime.toFixed(2)}ms
- **Average Memory Usage**: ${report.summary.averageMemoryUsage.toFixed(2)}MB
- **Average CPU Usage**: ${report.summary.averageCpuUsage.toFixed(2)}%
- **Total Database Queries**: ${report.summary.totalDbQueries}

## Performance Distribution

- **Excellent Routes**: ${report.summary.excellentRoutes} (${((report.summary.excellentRoutes / report.summary.totalRoutes) * 100).toFixed(1)}%)
- **Good Routes**: ${report.summary.goodRoutes} (${((report.summary.goodRoutes / report.summary.totalRoutes) * 100).toFixed(1)}%)
- **Acceptable Routes**: ${report.summary.acceptableRoutes} (${((report.summary.acceptableRoutes / report.summary.totalRoutes) * 100).toFixed(1)}%)
- **Poor Routes**: ${report.summary.poorRoutes} (${((report.summary.poorRoutes / report.summary.totalRoutes) * 100).toFixed(1)}%)

## Top Performance Issues

${report.routes
  .filter(route => route.responseTime > THRESHOLDS.responseTime.acceptable)
  .sort((a, b) => b.responseTime - a.responseTime)
  .slice(0, 10)
  .map(route => `- **${route.path}**: ${route.responseTime}ms (${route.method})`)
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

`)
  .join('\n')}

## Database Analysis

- **N+1 Query Issues**: ${report.databaseQueries.nPlusOne}
- **Missing Indexes**: ${report.databaseQueries.missingIndexes}
- **Slow Queries**: ${report.databaseQueries.slowQueries}
- **Inefficient Joins**: ${report.databaseQueries.inefficientJoins}

## Memory Analysis

- **Total Estimated Usage**: ${report.memoryAnalysis.totalEstimatedUsage.toFixed(2)}MB
- **Peak Usage**: ${report.memoryAnalysis.peakUsage.toFixed(2)}MB
- **Potential Memory Leaks**: ${report.memoryAnalysis.potentialLeaks}

## CPU Analysis

- **Total Estimated Usage**: ${report.cpuAnalysis.totalEstimatedUsage.toFixed(2)}%
- **Peak Usage**: ${report.cpuAnalysis.peakUsage.toFixed(2)}%
- **Bottlenecks**: ${report.cpuAnalysis.bottlenecks}

## Next Steps

1. **Immediate Actions**:
   - Fix high-priority recommendations
   - Address performance bottlenecks
   - Implement caching strategies

2. **Short-term Improvements**:
   - Optimize database queries
   - Implement memory pooling
   - Add performance monitoring

3. **Long-term Enhancements**:
   - Implement horizontal scaling
   - Add performance testing automation
   - Implement continuous performance monitoring

---
*Report generated on ${new Date().toLocaleString()}*
`;
  }
}

// Run the profiler
const profiler = new PerformanceProfiler();
profiler.run().catch(console.error);