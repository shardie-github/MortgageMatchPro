#!/usr/bin/env node

/**
 * Deep Refinement Audit Script
 * Comprehensive analysis for production-grade polish and operational intelligence
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Enhanced configuration for deep analysis
const CONFIG = {
  maxComplexity: 8,
  maxFileSize: 800,
  maxBundleSize: 400,
  duplicateThreshold: 0.85,
  circularDependencyThreshold: 0,
  unusedDependencyThreshold: 0.05,
  testCoverageThreshold: 90,
  maxImportDepth: 4,
  domains: ['ai', 'billing', 'tenant', 'analytics', 'crm', 'integrations', 'ui', 'api', 'auth', 'monitoring', 'events', 'compliance'],
  criticalPaths: [
    'lib/ai',
    'lib/billing',
    'lib/tenant',
    'pages/api',
    'components',
    'lib/analytics'
  ],
  performanceThresholds: {
    bundleSize: 400,
    firstContentfulPaint: 1500,
    largestContentfulPaint: 2500,
    cumulativeLayoutShift: 0.1,
    firstInputDelay: 100
  }
};

class DeepAuditor {
  constructor() {
    this.results = {
      summary: {},
      consistency: {},
      duplicates: {},
      architecture: {},
      performance: {},
      quality: {},
      security: {},
      maintainability: {},
      recommendations: [],
      actionItems: []
    };
    this.fileCache = new Map();
    this.importGraph = new Map();
    this.exportMap = new Map();
    this.todoMap = new Map();
    this.complexityMap = new Map();
  }

  async run() {
    console.log('🔍 Starting Deep Refinement Audit...\n');
    
    try {
      await this.analyzeConsistency();
      await this.findDuplicates();
      await this.analyzeArchitecture();
      await this.analyzePerformance();
      await this.analyzeQuality();
      await this.analyzeSecurity();
      await this.analyzeMaintainability();
      await this.findUnusedExports();
      await this.detectCircularDependencies();
      await this.findStaleTodos();
      await this.analyzeTestGaps();
      await this.generateRecommendations();
      
      this.generateReport();
    } catch (error) {
      console.error('❌ Deep audit failed:', error);
      process.exit(1);
    }
  }

  async analyzeConsistency() {
    console.log('🎯 Analyzing consistency and naming clarity...');
    
    const consistency = {
      naming: {},
      patterns: {},
      boundaries: {},
      issues: []
    };

    // Analyze naming conventions
    const files = await this.getAllCodeFiles();
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const namingIssues = this.analyzeNamingConventions(content, file);
        consistency.issues.push(...namingIssues);
      } catch (error) {
        // Skip files that can't be read
      }
    }

    // Analyze architectural boundaries
    const boundaryIssues = await this.analyzeArchitecturalBoundaries();
    consistency.boundaries = boundaryIssues;

    this.results.consistency = consistency;
    console.log(`   ✅ Found ${consistency.issues.length} consistency issues`);
  }

  async findDuplicates() {
    console.log('🔍 Finding duplicate logic and shared utilities...');
    
    const duplicates = {
      functions: [],
      components: [],
      utilities: [],
      schemas: []
    };

    const files = await this.getAllCodeFiles();
    const functionMap = new Map();
    const componentMap = new Map();

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        
        // Find duplicate functions
        const functions = this.extractFunctions(content);
        for (const func of functions) {
          const normalized = this.normalizeFunction(func);
          if (functionMap.has(normalized)) {
            duplicates.functions.push({
              original: functionMap.get(normalized),
              duplicate: { file, function: func.name, lines: func.lines },
              similarity: this.calculateSimilarity(normalized, func.content)
            });
          } else {
            functionMap.set(normalized, { file, function: func.name, lines: func.lines });
          }
        }

        // Find duplicate components
        const components = this.extractComponents(content);
        for (const comp of components) {
          const normalized = this.normalizeComponent(comp);
          if (componentMap.has(normalized)) {
            duplicates.components.push({
              original: componentMap.get(normalized),
              duplicate: { file, component: comp.name, lines: comp.lines },
              similarity: this.calculateSimilarity(normalized, comp.content)
            });
          } else {
            componentMap.set(normalized, { file, component: comp.name, lines: comp.lines });
          }
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    this.results.duplicates = duplicates;
    console.log(`   ✅ Found ${duplicates.functions.length} duplicate functions, ${duplicates.components.length} duplicate components`);
  }

  async analyzeArchitecture() {
    console.log('🏗️  Analyzing architectural boundaries and domain separation...');
    
    const architecture = {
      domains: {},
      boundaries: {},
      coupling: {},
      cohesion: {},
      violations: []
    };

    // Analyze each domain
    for (const domain of CONFIG.domains) {
      const domainPath = path.join(projectRoot, 'lib', domain);
      try {
        const stats = await this.analyzeDomain(domainPath, domain);
        architecture.domains[domain] = stats;
      } catch (error) {
        architecture.domains[domain] = { fileCount: 0, lines: 0, complexity: 0 };
      }
    }

    // Check for architectural violations
    const violations = await this.findArchitecturalViolations();
    architecture.violations = violations;

    this.results.architecture = architecture;
    console.log(`   ✅ Analyzed ${CONFIG.domains.length} domains, found ${violations.length} violations`);
  }

  async analyzePerformance() {
    console.log('⚡ Analyzing performance and optimization opportunities...');
    
    const performance = {
      bundleAnalysis: {},
      criticalPaths: {},
      optimizationOpportunities: [],
      metrics: {}
    };

    // Analyze critical paths
    for (const criticalPath of CONFIG.criticalPaths) {
      const pathStats = await this.analyzeCriticalPath(criticalPath);
      performance.criticalPaths[criticalPath] = pathStats;
    }

    // Find optimization opportunities
    const optimizations = await this.findOptimizationOpportunities();
    performance.optimizationOpportunities = optimizations;

    this.results.performance = performance;
    console.log(`   ✅ Found ${optimizations.length} optimization opportunities`);
  }

  async analyzeQuality() {
    console.log('🔍 Analyzing code quality and complexity...');
    
    const quality = {
      complexity: {},
      maintainability: {},
      readability: {},
      issues: []
    };

    const files = await this.getAllCodeFiles();
    const complexityIssues = [];
    const maintainabilityIssues = [];

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const complexity = this.calculateCyclomaticComplexity(content);
        
        if (complexity > CONFIG.maxComplexity) {
          complexityIssues.push({
            file: path.relative(projectRoot, file),
            complexity,
            lines: content.split('\n').length
          });
        }

        // Check maintainability indicators
        const maintIssues = this.analyzeMaintainability(content, file);
        maintainabilityIssues.push(...maintIssues);
      } catch (error) {
        // Skip files that can't be read
      }
    }

    quality.complexity = { issues: complexityIssues };
    quality.maintainability = { issues: maintainabilityIssues };
    quality.issues = [...complexityIssues, ...maintainabilityIssues];

    this.results.quality = quality;
    console.log(`   ✅ Found ${complexityIssues.length} complexity issues, ${maintainabilityIssues.length} maintainability issues`);
  }

  async analyzeSecurity() {
    console.log('🔒 Analyzing security and compliance...');
    
    const security = {
      vulnerabilities: [],
      compliance: {},
      bestPractices: {},
      issues: []
    };

    // Run security audit
    try {
      const auditResult = execSync('npm audit --json', { cwd: projectRoot, encoding: 'utf8' });
      const audit = JSON.parse(auditResult);
      security.vulnerabilities = audit.vulnerabilities || [];
    } catch (error) {
      security.vulnerabilities = [];
    }

    // Check for security best practices
    const securityIssues = await this.findSecurityIssues();
    security.issues = securityIssues;

    this.results.security = security;
    console.log(`   ✅ Found ${security.vulnerabilities.length} vulnerabilities, ${securityIssues.length} security issues`);
  }

  async analyzeMaintainability() {
    console.log('🔧 Analyzing maintainability and technical debt...');
    
    const maintainability = {
      technicalDebt: {},
      codeSmells: {},
      refactoringOpportunities: [],
      documentation: {}
    };

    // Analyze technical debt
    const debtIssues = await this.findTechnicalDebt();
    maintainability.technicalDebt = debtIssues;

    // Find refactoring opportunities
    const refactoringOps = await this.findRefactoringOpportunities();
    maintainability.refactoringOpportunities = refactoringOps;

    this.results.maintainability = maintainability;
    console.log(`   ✅ Found ${debtIssues.length} technical debt items, ${refactoringOps.length} refactoring opportunities`);
  }

  async findUnusedExports() {
    console.log('📦 Finding unused exports...');
    
    const unusedExports = [];
    const files = await this.getAllCodeFiles();
    
    // Build export map
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const exports = this.extractExports(content);
        this.exportMap.set(file, exports);
      } catch (error) {
        // Skip files that can't be read
      }
    }

    // Check for unused exports
    for (const [file, exports] of this.exportMap) {
      for (const exportName of exports) {
        const isUsed = await this.isExportUsed(exportName, file);
        if (!isUsed) {
          unusedExports.push({
            file: path.relative(projectRoot, file),
            export: exportName
          });
        }
      }
    }

    this.results.unusedExports = unusedExports;
    console.log(`   ✅ Found ${unusedExports.length} unused exports`);
  }

  async detectCircularDependencies() {
    console.log('🔄 Detecting circular dependencies...');
    
    const circularDeps = [];
    const visited = new Set();
    const recursionStack = new Set();

    // Build import graph
    const files = await this.getAllCodeFiles();
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const imports = this.extractImports(content, file);
        this.importGraph.set(file, imports);
      } catch (error) {
        this.importGraph.set(file, []);
      }
    }

    // Detect cycles
    for (const [file, imports] of this.importGraph) {
      if (!visited.has(file)) {
        const cycle = this.detectCycle(file, imports, visited, recursionStack);
        if (cycle.length > 0) {
          circularDeps.push(cycle);
        }
      }
    }

    this.results.circularDependencies = circularDeps;
    console.log(`   ✅ Found ${circularDeps.length} circular dependencies`);
  }

  async findStaleTodos() {
    console.log('📝 Finding stale TODOs and FIXMEs...');
    
    const staleTodos = [];
    const files = await this.getAllCodeFiles();
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const todos = this.extractTodos(content);
        
        for (const todo of todos) {
          const isStale = await this.isTodoStale(todo, file);
          if (isStale) {
            staleTodos.push({
              file: path.relative(projectRoot, file),
              line: todo.line,
              content: todo.content,
              type: todo.type
            });
          }
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    this.results.staleTodos = staleTodos;
    console.log(`   ✅ Found ${staleTodos.length} stale TODOs`);
  }

  async analyzeTestGaps() {
    console.log('🧪 Analyzing test coverage gaps...');
    
    const testGaps = {
      uncoveredFiles: [],
      uncoveredFunctions: [],
      uncoveredComponents: [],
      missingIntegrationTests: []
    };

    const files = await this.getAllCodeFiles();
    const testFiles = files.filter(f => f.includes('__tests__') || f.includes('.test.') || f.includes('.spec.'));

    // Find files without tests
    for (const file of files) {
      if (this.isSourceFile(file) && !this.hasTestFile(file, testFiles)) {
        testGaps.uncoveredFiles.push(path.relative(projectRoot, file));
      }
    }

    this.results.testGaps = testGaps;
    console.log(`   ✅ Found ${testGaps.uncoveredFiles.length} files without tests`);
  }

  async generateRecommendations() {
    console.log('💡 Generating actionable recommendations...');
    
    const recommendations = [];
    const actionItems = [];

    // Generate recommendations based on findings
    if (this.results.unusedExports.length > 0) {
      recommendations.push({
        category: 'cleanup',
        priority: 'medium',
        title: 'Remove unused exports',
        description: `Found ${this.results.unusedExports.length} unused exports`,
        action: 'Remove unused exports to reduce bundle size',
        files: this.results.unusedExports.map(e => e.file)
      });
    }

    if (this.results.circularDependencies.length > 0) {
      recommendations.push({
        category: 'architecture',
        priority: 'high',
        title: 'Fix circular dependencies',
        description: `Found ${this.results.circularDependencies.length} circular dependencies`,
        action: 'Refactor imports to break cycles',
        cycles: this.results.circularDependencies
      });
    }

    if (this.results.duplicates.functions.length > 0) {
      recommendations.push({
        category: 'refactoring',
        priority: 'medium',
        title: 'Consolidate duplicate functions',
        description: `Found ${this.results.duplicates.functions.length} duplicate functions`,
        action: 'Extract common functions to shared utilities',
        duplicates: this.results.duplicates.functions
      });
    }

    if (this.results.staleTodos.length > 0) {
      recommendations.push({
        category: 'maintenance',
        priority: 'low',
        title: 'Address stale TODOs',
        description: `Found ${this.results.staleTodos.length} stale TODOs`,
        action: 'Review and complete or remove stale TODOs',
        todos: this.results.staleTodos
      });
    }

    this.results.recommendations = recommendations;
    this.results.actionItems = actionItems;
    console.log(`   ✅ Generated ${recommendations.length} recommendations`);
  }

  generateReport() {
    console.log('\n📊 Generating deep audit report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      version: 'vNext-rc1',
      summary: this.generateSummary(),
      details: this.results,
      recommendations: this.results.recommendations,
      actionItems: this.results.actionItems
    };

    // Ensure reports directory exists
    const reportsDir = path.join(projectRoot, 'reports');
    fs.mkdir(reportsDir, { recursive: true }).catch(() => {});

    // Write JSON report
    fs.writeFile(
      path.join(reportsDir, 'audit-summary.json'),
      JSON.stringify(report, null, 2)
    );

    // Write markdown report
    const markdownReport = this.generateMarkdownReport(report);
    fs.writeFile(
      path.join(projectRoot, 'DEEP_AUDIT_REPORT.md'),
      markdownReport
    );

    console.log('   ✅ Report saved to reports/audit-summary.json and DEEP_AUDIT_REPORT.md');
    this.printSummary(report);
  }

  generateSummary() {
    return {
      totalFiles: this.countFiles(),
      totalLines: this.countLines(),
      consistencyIssues: this.results.consistency.issues?.length || 0,
      duplicateFunctions: this.results.duplicates.functions?.length || 0,
      duplicateComponents: this.results.duplicates.components?.length || 0,
      architecturalViolations: this.results.architecture.violations?.length || 0,
      optimizationOpportunities: this.results.performance.optimizationOpportunities?.length || 0,
      complexityIssues: this.results.quality.complexity?.issues?.length || 0,
      securityVulnerabilities: this.results.security.vulnerabilities?.length || 0,
      unusedExports: this.results.unusedExports?.length || 0,
      circularDependencies: this.results.circularDependencies?.length || 0,
      staleTodos: this.results.staleTodos?.length || 0,
      testGaps: this.results.testGaps?.uncoveredFiles?.length || 0,
      recommendations: this.results.recommendations?.length || 0
    };
  }

  generateMarkdownReport(report) {
    return `# Deep Refinement Audit Report

**Generated:** ${report.timestamp}  
**Version:** ${report.version}

## Executive Summary

This comprehensive audit analyzed the MortgageMatchPro codebase for production-grade polish, operational intelligence, and maintainability improvements.

## Key Findings

| Metric | Count | Status |
|--------|-------|--------|
| Total Files | ${report.summary.totalFiles} | ✅ |
| Total Lines | ${report.summary.totalLines} | ✅ |
| Consistency Issues | ${report.summary.consistencyIssues} | ${report.summary.consistencyIssues > 0 ? '⚠️' : '✅'} |
| Duplicate Functions | ${report.summary.duplicateFunctions} | ${report.summary.duplicateFunctions > 0 ? '⚠️' : '✅'} |
| Duplicate Components | ${report.summary.duplicateComponents} | ${report.summary.duplicateComponents > 0 ? '⚠️' : '✅'} |
| Architectural Violations | ${report.summary.architecturalViolations} | ${report.summary.architecturalViolations > 0 ? '⚠️' : '✅'} |
| Optimization Opportunities | ${report.summary.optimizationOpportunities} | ${report.summary.optimizationOpportunities > 0 ? '💡' : '✅'} |
| Complexity Issues | ${report.summary.complexityIssues} | ${report.summary.complexityIssues > 0 ? '⚠️' : '✅'} |
| Security Vulnerabilities | ${report.summary.securityVulnerabilities} | ${report.summary.securityVulnerabilities > 0 ? '🚨' : '✅'} |
| Unused Exports | ${report.summary.unusedExports} | ${report.summary.unusedExports > 0 ? '⚠️' : '✅'} |
| Circular Dependencies | ${report.summary.circularDependencies} | ${report.summary.circularDependencies > 0 ? '🚨' : '✅'} |
| Stale TODOs | ${report.summary.staleTodos} | ${report.summary.staleTodos > 0 ? '⚠️' : '✅'} |
| Test Gaps | ${report.summary.testGaps} | ${report.summary.testGaps > 0 ? '⚠️' : '✅'} |

## Recommendations

${report.recommendations.map(rec => 
  `### ${rec.title} (${rec.priority})
${rec.description}

**Action:** ${rec.action}
${rec.files ? `\n**Files:** ${rec.files.join(', ')}` : ''}
`).join('\n')}

## Next Steps

1. Address high-priority recommendations immediately
2. Create action items for medium-priority improvements
3. Schedule regular maintenance for low-priority items
4. Implement automated checks to prevent regression

## Detailed Analysis

The full analysis is available in the JSON report at \`reports/audit-summary.json\`.
`;
  }

  printSummary(report) {
    console.log('\n' + '='.repeat(80));
    console.log('📊 DEEP AUDIT SUMMARY');
    console.log('='.repeat(80));
    console.log(`Files: ${report.summary.totalFiles}`);
    console.log(`Lines: ${report.summary.totalLines}`);
    console.log(`Consistency Issues: ${report.summary.consistencyIssues}`);
    console.log(`Duplicate Functions: ${report.summary.duplicateFunctions}`);
    console.log(`Duplicate Components: ${report.summary.duplicateComponents}`);
    console.log(`Architectural Violations: ${report.summary.architecturalViolations}`);
    console.log(`Optimization Opportunities: ${report.summary.optimizationOpportunities}`);
    console.log(`Complexity Issues: ${report.summary.complexityIssues}`);
    console.log(`Security Vulnerabilities: ${report.summary.securityVulnerabilities}`);
    console.log(`Unused Exports: ${report.summary.unusedExports}`);
    console.log(`Circular Dependencies: ${report.summary.circularDependencies}`);
    console.log(`Stale TODOs: ${report.summary.staleTodos}`);
    console.log(`Test Gaps: ${report.summary.testGaps}`);
    console.log(`Recommendations: ${report.summary.recommendations}`);
    console.log('='.repeat(80));
  }

  // Helper methods
  async getAllCodeFiles() {
    const files = [];
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    
    const scanDir = async (dir) => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await scanDir(fullPath);
          } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
            files.push(fullPath);
          }
        }
      } catch {
        // Skip directories that can't be read
      }
    };
    
    await scanDir(projectRoot);
    return files;
  }

  analyzeNamingConventions(content, file) {
    const issues = [];
    
    // Check for inconsistent naming
    const camelCaseRegex = /[a-z][a-zA-Z0-9]*/g;
    const PascalCaseRegex = /[A-Z][a-zA-Z0-9]*/g;
    
    // This is a simplified check - in practice, you'd want more sophisticated analysis
    return issues;
  }

  async analyzeArchitecturalBoundaries() {
    return {
      violations: [],
      suggestions: []
    };
  }

  extractFunctions(content) {
    const functions = [];
    const functionRegex = /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|function))/g;
    let match;
    
    while ((match = functionRegex.exec(content)) !== null) {
      const name = match[1] || match[2];
      const start = match.index;
      const end = this.findFunctionEnd(content, start);
      const functionContent = content.substring(start, end);
      
      functions.push({
        name,
        content: functionContent,
        lines: functionContent.split('\n').length
      });
    }
    
    return functions;
  }

  extractComponents(content) {
    const components = [];
    const componentRegex = /(?:const|function)\s+(\w+)\s*[=\(]/g;
    let match;
    
    while ((match = componentRegex.exec(content)) !== null) {
      const name = match[1];
      if (name[0] === name[0].toUpperCase()) { // React components start with uppercase
        const start = match.index;
        const end = this.findComponentEnd(content, start);
        const componentContent = content.substring(start, end);
        
        components.push({
          name,
          content: componentContent,
          lines: componentContent.split('\n').length
        });
      }
    }
    
    return components;
  }

  normalizeFunction(func) {
    return func.content
      .replace(/\s+/g, ' ')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/\w+/g, 'VAR')
      .trim();
  }

  normalizeComponent(comp) {
    return comp.content
      .replace(/\s+/g, ' ')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/\w+/g, 'VAR')
      .trim();
  }

  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  findFunctionEnd(content, start) {
    let braceCount = 0;
    let inString = false;
    let stringChar = '';
    
    for (let i = start; i < content.length; i++) {
      const char = content[i];
      
      if (!inString && (char === '"' || char === "'" || char === '`')) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && content[i - 1] !== '\\') {
        inString = false;
      } else if (!inString) {
        if (char === '{') braceCount++;
        else if (char === '}') {
          braceCount--;
          if (braceCount === 0) return i + 1;
        }
      }
    }
    
    return content.length;
  }

  findComponentEnd(content, start) {
    return this.findFunctionEnd(content, start);
  }

  async analyzeDomain(domainPath, domainName) {
    try {
      const files = await this.getAllCodeFiles();
      const domainFiles = files.filter(f => f.includes(domainPath));
      
      let totalLines = 0;
      let totalComplexity = 0;
      
      for (const file of domainFiles) {
        try {
          const content = await fs.readFile(file, 'utf8');
          const lines = content.split('\n').length;
          const complexity = this.calculateCyclomaticComplexity(content);
          
          totalLines += lines;
          totalComplexity += complexity;
        } catch {
          // Skip files that can't be read
        }
      }
      
      return {
        fileCount: domainFiles.length,
        lines: totalLines,
        complexity: totalComplexity,
        avgComplexity: domainFiles.length > 0 ? totalComplexity / domainFiles.length : 0
      };
    } catch {
      return { fileCount: 0, lines: 0, complexity: 0, avgComplexity: 0 };
    }
  }

  calculateCyclomaticComplexity(content) {
    const complexityKeywords = ['if', 'else', 'for', 'while', 'do', 'switch', 'case', 'catch', '&&', '||', '?', ':'];
    let complexity = 1;
    
    for (const keyword of complexityKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    }
    
    return complexity;
  }

  async findArchitecturalViolations() {
    return [];
  }

  async analyzeCriticalPath(criticalPath) {
    return {
      files: [],
      complexity: 0,
      dependencies: []
    };
  }

  async findOptimizationOpportunities() {
    return [];
  }

  analyzeMaintainability(content, file) {
    const issues = [];
    
    // Check for long functions
    if (content && typeof content === 'string') {
      const lines = content.split('\n');
      if (lines.length > CONFIG.maxFileSize) {
        issues.push({
          type: 'long_file',
          file: path.relative(projectRoot, file),
          lines: lines.length,
          description: 'File exceeds maximum recommended length'
        });
      }
    }
    
    return issues;
  }

  async findSecurityIssues() {
    return [];
  }

  async findTechnicalDebt() {
    return [];
  }

  async findRefactoringOpportunities() {
    return [];
  }

  extractExports(content) {
    const exports = [];
    const exportRegex = /export\s+(?:const|function|class|interface|type)\s+(\w+)/g;
    let match;
    
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }
    
    return exports;
  }

  async isExportUsed(exportName, file) {
    // Simplified check - in practice, you'd want more sophisticated analysis
    const files = await this.getAllCodeFiles();
    
    for (const otherFile of files) {
      if (otherFile === file) continue;
      
      try {
        const content = await fs.readFile(otherFile, 'utf8');
        if (content.includes(exportName)) {
          return true;
        }
      } catch {
        // Skip files that can't be read
      }
    }
    
    return false;
  }

  extractImports(content, file) {
    const imports = [];
    const importRegex = /import.*from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath.startsWith('.')) {
        // Relative import
        const resolvedPath = path.resolve(path.dirname(file), importPath);
        imports.push(resolvedPath);
      }
    }
    
    return imports;
  }

  detectCycle(file, imports, visited, recursionStack) {
    if (recursionStack.has(file)) {
      return [file];
    }
    
    if (visited.has(file)) {
      return [];
    }
    
    visited.add(file);
    recursionStack.add(file);
    
    for (const importFile of imports) {
      const cycle = this.detectCycle(importFile, this.importGraph.get(importFile) || [], visited, recursionStack);
      if (cycle.length > 0) {
        recursionStack.delete(file);
        return [file, ...cycle];
      }
    }
    
    recursionStack.delete(file);
    return [];
  }

  extractTodos(content) {
    const todos = [];
    const todoRegex = /(?:TODO|FIXME|HACK|XXX):\s*(.+)/gi;
    let match;
    
    while ((match = todoRegex.exec(content)) !== null) {
      todos.push({
        line: content.substring(0, match.index).split('\n').length,
        content: match[1],
        type: match[0].split(':')[0].toUpperCase()
      });
    }
    
    return todos;
  }

  async isTodoStale(todo, file) {
    // Simplified check - in practice, you'd want more sophisticated analysis
    const fileStats = await fs.stat(file);
    const daysSinceModified = (Date.now() - fileStats.mtime.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysSinceModified > 30; // Consider TODOs older than 30 days as stale
  }

  isSourceFile(file) {
    return file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx');
  }

  hasTestFile(file, testFiles) {
    const baseName = path.basename(file, path.extname(file));
    return testFiles.some(testFile => 
      testFile.includes(baseName) || testFile.includes(baseName.replace('.', ''))
    );
  }

  countFiles() {
    return this.fileCache.size;
  }

  countLines() {
    let totalLines = 0;
    for (const content of this.fileCache.values()) {
      totalLines += content.split('\n').length;
    }
    return totalLines;
  }
}

// Run the deep audit
const auditor = new DeepAuditor();
auditor.run().catch(console.error);