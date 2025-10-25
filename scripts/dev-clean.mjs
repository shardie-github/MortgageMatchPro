#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

class DevCleanup {
  constructor() {
    this.cleanedItems = [];
    this.errors = [];
  }

  async run() {
    console.log('🧹 Starting development environment cleanup...\n');

    try {
      await this.cleanTempFiles();
      await this.cleanLogs();
      await this.cleanCache();
      await this.cleanBuildArtifacts();
      await this.cleanNodeModules();
      await this.resetDatabase();
      await this.runHealthCheck();
      
      this.generateReport();
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
      process.exit(1);
    }
  }

  async cleanTempFiles() {
    console.log('🗑️  Cleaning temporary files...');
    
    const tempDirs = [
      '.next',
      '.vercel',
      'dist',
      'build',
      'coverage',
      'test-results',
      'playwright-report'
    ];

    for (const dir of tempDirs) {
      try {
        const dirPath = path.join(projectRoot, dir);
        await fs.access(dirPath);
        await fs.rm(dirPath, { recursive: true, force: true });
        this.cleanedItems.push(`Removed directory: ${dir}`);
      } catch (error) {
        // Directory doesn't exist, which is fine
      }
    }

    // Clean temp files
    const tempFiles = [
      '*.log',
      '*.tmp',
      '*.temp',
      '.DS_Store',
      'Thumbs.db'
    ];

    for (const pattern of tempFiles) {
      try {
        execSync(`find ${projectRoot} -name "${pattern}" -type f -delete`, { 
          cwd: projectRoot,
          stdio: 'pipe'
        });
        this.cleanedItems.push(`Removed temp files: ${pattern}`);
      } catch (error) {
        // No files found, which is fine
      }
    }
  }

  async cleanLogs() {
    console.log('📝 Cleaning log files...');
    
    const logDirs = [
      'logs',
      'log',
      '.logs'
    ];

    for (const dir of logDirs) {
      try {
        const dirPath = path.join(projectRoot, dir);
        await fs.access(dirPath);
        await fs.rm(dirPath, { recursive: true, force: true });
        this.cleanedItems.push(`Removed log directory: ${dir}`);
      } catch (error) {
        // Directory doesn't exist, which is fine
      }
    }

    // Clean individual log files
    try {
      execSync(`find ${projectRoot} -name "*.log" -type f -delete`, { 
        cwd: projectRoot,
        stdio: 'pipe'
      });
      this.cleanedItems.push('Removed individual log files');
    } catch (error) {
      // No log files found, which is fine
    }
  }

  async cleanCache() {
    console.log('💾 Cleaning cache directories...');
    
    const cacheDirs = [
      'node_modules/.cache',
      '.cache',
      'cache',
      '.next/cache',
      '.vercel/cache'
    ];

    for (const dir of cacheDirs) {
      try {
        const dirPath = path.join(projectRoot, dir);
        await fs.access(dirPath);
        await fs.rm(dirPath, { recursive: true, force: true });
        this.cleanedItems.push(`Removed cache directory: ${dir}`);
      } catch (error) {
        // Directory doesn't exist, which is fine
      }
    }

    // Clean npm cache
    try {
      execSync('npm cache clean --force', { 
        cwd: projectRoot,
        stdio: 'pipe'
      });
      this.cleanedItems.push('Cleaned npm cache');
    } catch (error) {
      this.errors.push('Failed to clean npm cache');
    }
  }

  async cleanBuildArtifacts() {
    console.log('🔨 Cleaning build artifacts...');
    
    const buildDirs = [
      '.next',
      'dist',
      'build',
      'out',
      'coverage'
    ];

    for (const dir of buildDirs) {
      try {
        const dirPath = path.join(projectRoot, dir);
        await fs.access(dirPath);
        await fs.rm(dirPath, { recursive: true, force: true });
        this.cleanedItems.push(`Removed build directory: ${dir}`);
      } catch (error) {
        // Directory doesn't exist, which is fine
      }
    }
  }

  async cleanNodeModules() {
    console.log('📦 Cleaning node_modules...');
    
    const nodeModulesPath = path.join(projectRoot, 'node_modules');
    try {
      await fs.access(nodeModulesPath);
      await fs.rm(nodeModulesPath, { recursive: true, force: true });
      this.cleanedItems.push('Removed node_modules directory');
      
      // Reinstall dependencies
      console.log('📥 Reinstalling dependencies...');
      execSync('npm install', { 
        cwd: projectRoot,
        stdio: 'inherit'
      });
      this.cleanedItems.push('Reinstalled dependencies');
    } catch (error) {
      this.errors.push('Failed to clean node_modules');
    }
  }

  async resetDatabase() {
    console.log('🗄️  Resetting local database...');
    
    try {
      // Check if we have a local database reset script
      const resetScript = path.join(projectRoot, 'scripts', 'reset-db.sh');
      await fs.access(resetScript);
      
      execSync(`bash ${resetScript}`, { 
        cwd: projectRoot,
        stdio: 'inherit'
      });
      this.cleanedItems.push('Reset local database');
    } catch (error) {
      // No reset script or database, which is fine
      console.log('  No local database reset script found');
    }
  }

  async runHealthCheck() {
    console.log('🏥 Running health check...');
    
    try {
      // Run linting
      console.log('  Running ESLint...');
      execSync('npm run lint', { 
        cwd: projectRoot,
        stdio: 'pipe'
      });
      this.cleanedItems.push('ESLint passed');

      // Run type checking
      console.log('  Running TypeScript type check...');
      execSync('npm run type-check', { 
        cwd: projectRoot,
        stdio: 'pipe'
      });
      this.cleanedItems.push('TypeScript type check passed');

      // Run tests
      console.log('  Running tests...');
      execSync('npm run test', { 
        cwd: projectRoot,
        stdio: 'pipe'
      });
      this.cleanedItems.push('Tests passed');

    } catch (error) {
      this.errors.push('Health check failed: ' + error.message);
    }
  }

  generateReport() {
    console.log('\n📊 Cleanup Report');
    console.log('=' .repeat(40));

    console.log('\n✅ Successfully cleaned:');
    this.cleanedItems.forEach(item => {
      console.log(`  • ${item}`);
    });

    if (this.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      this.errors.forEach(error => {
        console.log(`  • ${error}`);
      });
    }

    console.log(`\n📈 Summary:`);
    console.log(`  • Items cleaned: ${this.cleanedItems.length}`);
    console.log(`  • Errors: ${this.errors.length}`);

    if (this.errors.length === 0) {
      console.log('\n🎉 Development environment cleanup completed successfully!');
    } else {
      console.log('\n⚠️  Cleanup completed with some errors.');
    }
  }
}

// Run the cleanup
const cleanup = new DevCleanup();
cleanup.run().catch(error => {
  console.error('❌ Cleanup failed:', error);
  process.exit(1);
});
