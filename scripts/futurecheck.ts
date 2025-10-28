/**
 * Future Runtime Readiness Checker
 * Validates build for Edge Runtime, WASM/Workers compatibility
 * Checks for Node-only dependencies and Hydrogen/Oxygen Bridge compatibility
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

interface CompatibilityReport {
  edgeRuntime: {
    compatible: boolean;
    issues: string[];
    recommendations: string[];
  };
  wasmWorkers: {
    compatible: boolean;
    issues: string[];
    recommendations: string[];
  };
  hydrogenOxygen: {
    compatible: boolean;
    issues: string[];
    recommendations: string[];
  };
  nodeOnlyDeps: string[];
  blockingLibs: string[];
  overallScore: number;
  timestamp: string;
}

class FutureCheck {
  private packageJson: any;
  private nextConfig: any;
  private blockingDependencies: string[] = [
    'fs', 'path', 'os', 'crypto', 'util', 'stream', 'buffer', 'events',
    'child_process', 'cluster', 'worker_threads', 'perf_hooks'
  ];
  private edgeUnsafeDeps: string[] = [
    'sharp', 'canvas', 'puppeteer', 'playwright', 'selenium',
    'node-gyp', 'native-addon', 'sqlite3', 'mysql2', 'pg-native'
  ];

  constructor() {
    this.loadConfigs();
  }

  private async loadConfigs() {
    try {
      const packageJsonContent = await fs.readFile('package.json', 'utf-8');
      this.packageJson = JSON.parse(packageJsonContent);

      const nextConfigContent = await fs.readFile('next.config.js', 'utf-8');
      // Simple eval for next.config.js (in production, use a proper parser)
      this.nextConfig = eval(`(${nextConfigContent.replace('module.exports =', '')})`);
    } catch (error) {
      console.error('Error loading configs:', error);
    }
  }

  /**
   * Main compatibility check function
   */
  async checkCompatibility(): Promise<CompatibilityReport> {
    console.log('🔍 Starting future runtime compatibility check...');

    const report: CompatibilityReport = {
      edgeRuntime: await this.checkEdgeRuntimeCompatibility(),
      wasmWorkers: await this.checkWasmWorkersCompatibility(),
      hydrogenOxygen: await this.checkHydrogenOxygenCompatibility(),
      nodeOnlyDeps: await this.findNodeOnlyDependencies(),
      blockingLibs: await this.findBlockingLibraries(),
      overallScore: 0,
      timestamp: new Date().toISOString()
    };

    report.overallScore = this.calculateOverallScore(report);
    
    console.log(`✅ Compatibility check completed. Overall score: ${report.overallScore}/100`);
    
    return report;
  }

  /**
   * Check Edge Runtime compatibility
   */
  private async checkEdgeRuntimeCompatibility() {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check Next.js config for edge runtime
    if (!this.nextConfig?.experimental?.runtime || this.nextConfig.experimental.runtime !== 'edge') {
      issues.push('Edge runtime not explicitly configured');
      recommendations.push('Add runtime: "edge" to experimental config');
    }

    // Check for edge-unsafe dependencies
    const unsafeDeps = this.findUnsafeDependencies(this.edgeUnsafeDeps);
    if (unsafeDeps.length > 0) {
      issues.push(`Edge-unsafe dependencies found: ${unsafeDeps.join(', ')}`);
      recommendations.push('Replace or conditionally load edge-unsafe dependencies');
    }

    // Check for Node.js APIs in client code
    const nodeApiUsage = await this.findNodeApiUsage();
    if (nodeApiUsage.length > 0) {
      issues.push(`Node.js APIs used in client code: ${nodeApiUsage.join(', ')}`);
      recommendations.push('Move Node.js API usage to server-side or use edge-compatible alternatives');
    }

    // Check for dynamic imports that might not work in edge
    const dynamicImports = await this.findProblematicDynamicImports();
    if (dynamicImports.length > 0) {
      issues.push(`Problematic dynamic imports found: ${dynamicImports.length} files`);
      recommendations.push('Review dynamic imports for edge runtime compatibility');
    }

    return {
      compatible: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Check WASM/Workers compatibility
   */
  private async checkWasmWorkersCompatibility() {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for Prisma engine type
    if (this.packageJson?.dependencies?.['@prisma/client']) {
      const prismaEngine = process.env.PRISMA_CLIENT_ENGINE_TYPE;
      if (prismaEngine !== 'wasm') {
        issues.push('Prisma engine not set to WASM');
        recommendations.push('Set PRISMA_CLIENT_ENGINE_TYPE=wasm in environment');
      }
    }

    // Check for blocking Node.js modules
    const blockingModules = this.findBlockingModules();
    if (blockingModules.length > 0) {
      issues.push(`Blocking Node.js modules: ${blockingModules.join(', ')}`);
      recommendations.push('Replace Node.js modules with WASM-compatible alternatives');
    }

    // Check for file system operations
    const fsOperations = await this.findFileSystemOperations();
    if (fsOperations.length > 0) {
      issues.push(`File system operations found: ${fsOperations.length} files`);
      recommendations.push('Use cloud storage or in-memory alternatives for file operations');
    }

    // Check for native addons
    const nativeAddons = this.findNativeAddons();
    if (nativeAddons.length > 0) {
      issues.push(`Native addons found: ${nativeAddons.join(', ')}`);
      recommendations.push('Replace native addons with WASM-compatible alternatives');
    }

    return {
      compatible: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Check Hydrogen/Oxygen Bridge compatibility
   */
  private async checkHydrogenOxygenCompatibility() {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check if bridge handler exists
    const bridgePath = 'server/api/bridge.ts';
    try {
      await fs.access(bridgePath);
    } catch {
      issues.push('Hydrogen/Oxygen bridge handler not found');
      recommendations.push('Create server/api/bridge.ts with export handler');
    }

    // Check for Shopify-specific dependencies
    const shopifyDeps = this.findShopifyDependencies();
    if (shopifyDeps.length === 0) {
      issues.push('No Shopify dependencies found for Hydrogen integration');
      recommendations.push('Add @shopify/hydrogen and related packages for full integration');
    }

    // Check for proper export structure
    const exportStructure = await this.checkExportStructure();
    if (!exportStructure.valid) {
      issues.push('Invalid export structure for Hydrogen/Oxygen');
      recommendations.push(...exportStructure.recommendations);
    }

    return {
      compatible: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Find Node.js only dependencies
   */
  private async findNodeOnlyDependencies(): Promise<string[]> {
    const nodeOnlyDeps: string[] = [];

    for (const [dep, version] of Object.entries(this.packageJson?.dependencies || {})) {
      if (this.isNodeOnlyDependency(dep)) {
        nodeOnlyDeps.push(dep);
      }
    }

    return nodeOnlyDeps;
  }

  /**
   * Find blocking libraries
   */
  private async findBlockingLibraries(): Promise<string[]> {
    const blockingLibs: string[] = [];

    for (const [dep, version] of Object.entries(this.packageJson?.dependencies || {})) {
      if (this.isBlockingLibrary(dep)) {
        blockingLibs.push(dep);
      }
    }

    return blockingLibs;
  }

  /**
   * Check if dependency is Node.js only
   */
  private isNodeOnlyDependency(dep: string): boolean {
    const nodeOnlyPatterns = [
      /^node-/, /-node$/, /^@node/, /^node\./, /^os-/, /^fs-/, /^path-/,
      'child_process', 'cluster', 'worker_threads', 'perf_hooks'
    ];

    return nodeOnlyPatterns.some(pattern => 
      typeof pattern === 'string' ? dep === pattern : pattern.test(dep)
    );
  }

  /**
   * Check if library is blocking for future runtimes
   */
  private isBlockingLibrary(dep: string): boolean {
    const blockingPatterns = [
      'sharp', 'canvas', 'puppeteer', 'playwright', 'selenium',
      'sqlite3', 'mysql2', 'pg-native', 'redis', 'ioredis',
      'node-gyp', 'native-addon'
    ];

    return blockingPatterns.some(pattern => dep.includes(pattern));
  }

  /**
   * Find unsafe dependencies for edge runtime
   */
  private findUnsafeDependencies(unsafeList: string[]): string[] {
    const found: string[] = [];

    for (const dep of unsafeList) {
      if (this.packageJson?.dependencies?.[dep] || this.packageJson?.devDependencies?.[dep]) {
        found.push(dep);
      }
    }

    return found;
  }

  /**
   * Find Node.js API usage in code
   */
  private async findNodeApiUsage(): Promise<string[]> {
    const nodeApis: string[] = [];
    const sourceFiles = await this.getSourceFiles();

    for (const file of sourceFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        for (const api of this.blockingDependencies) {
          if (content.includes(`require('${api}')`) || content.includes(`import ${api}`)) {
            nodeApis.push(`${api} in ${file}`);
          }
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    return nodeApis;
  }

  /**
   * Find problematic dynamic imports
   */
  private async findProblematicDynamicImports(): Promise<string[]> {
    const problematicFiles: string[] = [];
    const sourceFiles = await this.getSourceFiles();

    for (const file of sourceFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        if (content.includes('import(') && this.hasProblematicDynamicImport(content)) {
          problematicFiles.push(file);
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    return problematicFiles;
  }

  /**
   * Check if dynamic import is problematic for edge runtime
   */
  private hasProblematicDynamicImport(content: string): boolean {
    const problematicPatterns = [
      /import\(['"]fs['"]/, /import\(['"]path['"]/, /import\(['"]os['"]/,
      /import\(['"]crypto['"]/, /import\(['"]util['"]/
    ];

    return problematicPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Find blocking modules
   */
  private findBlockingModules(): string[] {
    const blocking: string[] = [];

    for (const module of this.blockingDependencies) {
      if (this.packageJson?.dependencies?.[module] || this.packageJson?.devDependencies?.[module]) {
        blocking.push(module);
      }
    }

    return blocking;
  }

  /**
   * Find file system operations
   */
  private async findFileSystemOperations(): Promise<string[]> {
    const filesWithFs: string[] = [];
    const sourceFiles = await this.getSourceFiles();

    for (const file of sourceFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        if (content.includes('fs.') || content.includes('readFile') || content.includes('writeFile')) {
          filesWithFs.push(file);
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    return filesWithFs;
  }

  /**
   * Find native addons
   */
  private findNativeAddons(): string[] {
    const nativeAddons: string[] = [];

    for (const [dep, version] of Object.entries(this.packageJson?.dependencies || {})) {
      if (this.isNativeAddon(dep)) {
        nativeAddons.push(dep);
      }
    }

    return nativeAddons;
  }

  /**
   * Check if dependency is a native addon
   */
  private isNativeAddon(dep: string): boolean {
    const nativePatterns = [
      'node-gyp', 'native-addon', 'bindings', 'nan', 'node-addon-api'
    ];

    return nativePatterns.some(pattern => dep.includes(pattern));
  }

  /**
   * Find Shopify dependencies
   */
  private findShopifyDependencies(): string[] {
    const shopifyDeps: string[] = [];

    for (const dep of Object.keys(this.packageJson?.dependencies || {})) {
      if (dep.includes('@shopify') || dep.includes('shopify')) {
        shopifyDeps.push(dep);
      }
    }

    return shopifyDeps;
  }

  /**
   * Check export structure for Hydrogen/Oxygen
   */
  private async checkExportStructure() {
    const recommendations: string[] = [];
    let valid = true;

    // Check for proper API structure
    const apiDir = 'pages/api';
    try {
      await fs.access(apiDir);
    } catch {
      valid = false;
      recommendations.push('Create pages/api directory for API routes');
    }

    // Check for proper export format
    const bridgeFile = 'server/api/bridge.ts';
    try {
      const content = await fs.readFile(bridgeFile, 'utf-8');
      if (!content.includes('export') || !content.includes('handler')) {
        valid = false;
        recommendations.push('Bridge handler should export a handler function');
      }
    } catch {
      valid = false;
      recommendations.push('Create bridge handler with proper exports');
    }

    return { valid, recommendations };
  }

  /**
   * Get all source files
   */
  private async getSourceFiles(): Promise<string[]> {
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    const sourceFiles: string[] = [];

    const scanDir = async (dir: string) => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory() && !this.shouldSkipDir(entry.name)) {
            await scanDir(fullPath);
          } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
            sourceFiles.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
    };

    await scanDir('.');
    return sourceFiles;
  }

  /**
   * Check if directory should be skipped
   */
  private shouldSkipDir(dirName: string): boolean {
    const skipDirs = [
      'node_modules', '.git', '.next', 'dist', 'build', 'coverage',
      '.vscode', '.idea', 'logs', 'tmp', 'temp'
    ];

    return skipDirs.includes(dirName);
  }

  /**
   * Calculate overall compatibility score
   */
  private calculateOverallScore(report: CompatibilityReport): number {
    let score = 100;

    // Deduct points for issues
    score -= report.edgeRuntime.issues.length * 10;
    score -= report.wasmWorkers.issues.length * 15;
    score -= report.hydrogenOxygen.issues.length * 5;
    score -= report.nodeOnlyDeps.length * 5;
    score -= report.blockingLibs.length * 20;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate detailed report
   */
  async generateReport(): Promise<string> {
    const report = await this.checkCompatibility();
    
    const reportContent = `
# Future Runtime Compatibility Report

**Generated:** ${report.timestamp}
**Overall Score:** ${report.overallScore}/100

## 🚀 Edge Runtime Compatibility
- **Status:** ${report.edgeRuntime.compatible ? '✅ Compatible' : '❌ Issues Found'}
- **Issues:** ${report.edgeRuntime.issues.length}
- **Recommendations:** ${report.edgeRuntime.recommendations.length}

${report.edgeRuntime.issues.length > 0 ? `
### Issues:
${report.edgeRuntime.issues.map(issue => `- ${issue}`).join('\n')}
` : ''}

${report.edgeRuntime.recommendations.length > 0 ? `
### Recommendations:
${report.edgeRuntime.recommendations.map(rec => `- ${rec}`).join('\n')}
` : ''}

## ⚡ WASM/Workers Compatibility
- **Status:** ${report.wasmWorkers.compatible ? '✅ Compatible' : '❌ Issues Found'}
- **Issues:** ${report.wasmWorkers.issues.length}
- **Recommendations:** ${report.wasmWorkers.recommendations.length}

${report.wasmWorkers.issues.length > 0 ? `
### Issues:
${report.wasmWorkers.issues.map(issue => `- ${issue}`).join('\n')}
` : ''}

${report.wasmWorkers.recommendations.length > 0 ? `
### Recommendations:
${report.wasmWorkers.recommendations.map(rec => `- ${rec}`).join('\n')}
` : ''}

## 🛍️ Hydrogen/Oxygen Compatibility
- **Status:** ${report.hydrogenOxygen.compatible ? '✅ Compatible' : '❌ Issues Found'}
- **Issues:** ${report.hydrogenOxygen.issues.length}
- **Recommendations:** ${report.hydrogenOxygen.recommendations.length}

${report.hydrogenOxygen.issues.length > 0 ? `
### Issues:
${report.hydrogenOxygen.issues.map(issue => `- ${issue}`).join('\n')}
` : ''}

${report.hydrogenOxygen.recommendations.length > 0 ? `
### Recommendations:
${report.hydrogenOxygen.recommendations.map(rec => `- ${rec}`).join('\n')}
` : ''}

## 📦 Dependencies Analysis
- **Node.js Only Dependencies:** ${report.nodeOnlyDeps.length}
- **Blocking Libraries:** ${report.blockingLibs.length}

${report.nodeOnlyDeps.length > 0 ? `
### Node.js Only Dependencies:
${report.nodeOnlyDeps.map(dep => `- ${dep}`).join('\n')}
` : ''}

${report.blockingLibs.length > 0 ? `
### Blocking Libraries:
${report.blockingLibs.map(lib => `- ${lib}`).join('\n')}
` : ''}

## 🎯 Next Steps
${this.generateNextSteps(report)}
    `.trim();

    return reportContent;
  }

  /**
   * Generate next steps based on report
   */
  private generateNextSteps(report: CompatibilityReport): string {
    const steps: string[] = [];

    if (report.overallScore < 70) {
      steps.push('🚨 **High Priority:** Address blocking libraries and Node.js dependencies');
    }

    if (report.edgeRuntime.issues.length > 0) {
      steps.push('⚡ **Edge Runtime:** Implement edge-compatible alternatives');
    }

    if (report.wasmWorkers.issues.length > 0) {
      steps.push('🔧 **WASM/Workers:** Replace blocking modules with compatible alternatives');
    }

    if (report.hydrogenOxygen.issues.length > 0) {
      steps.push('🛍️ **Hydrogen/Oxygen:** Set up proper bridge handlers');
    }

    if (steps.length === 0) {
      steps.push('✅ **All Good:** Your application is ready for future runtimes!');
    }

    return steps.map(step => `- ${step}`).join('\n');
  }
}

// Export for use in other modules
export { FutureCheck, CompatibilityReport };

// CLI usage
if (require.main === module) {
  const checker = new FutureCheck();
  
  checker.checkCompatibility()
    .then(async (report) => {
      console.log(await checker.generateReport());
      
      // Save report to file
      const reportContent = await checker.generateReport();
      await fs.writeFile('futurecheck-report.md', reportContent);
      console.log('\n📄 Report saved to futurecheck-report.md');
      
      process.exit(report.overallScore >= 70 ? 0 : 1);
    })
    .catch((error) => {
      console.error('Future check failed:', error);
      process.exit(1);
    });
}