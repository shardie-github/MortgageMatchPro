#!/usr/bin/env node

/**
 * Development Doctor Script
 * Validates Node version, env vars, and prints dependency health summary
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Configuration
const CONFIG = {
  requiredNodeVersion: '>=16.0.0',
  requiredNpmVersion: '>=8.0.0',
  requiredEnvVars: [
    'OPENAI_API_KEY',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_KEY'
  ],
  optionalEnvVars: [
    'STRIPE_PUBLISHABLE_KEY',
    'STRIPE_SECRET_KEY',
    'TWILIO_AUTH_TOKEN',
    'RATEHUB_API_KEY',
    'FREDDIE_MAC_API_KEY',
    'REDIS_URL',
    'SENTRY_DSN',
    'POSTHOG_KEY'
  ],
  criticalFiles: [
    'package.json',
    'tsconfig.json',
    'next.config.js',
    '.env.local',
    '.env.example'
  ],
  devDependencies: [
    'typescript',
    'eslint',
    'prettier',
    'jest',
    '@types/node',
    '@types/react',
    '@types/react-dom'
  ]
};

class DevDoctor {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.suggestions = [];
  }

  async run() {
    console.log('🩺 Running development doctor...\n');
    
    try {
      await this.checkNodeVersion();
      await this.checkNpmVersion();
      await this.checkEnvironmentVariables();
      await this.checkCriticalFiles();
      await this.checkDependencies();
      await this.checkTypeScript();
      await this.checkLinting();
      await this.checkTests();
      await this.checkBuild();
      
      this.printReport();
      
    } catch (error) {
      console.error('❌ Dev doctor failed:', error);
      process.exit(1);
    }
  }

  async checkNodeVersion() {
    console.log('🔍 Checking Node.js version...');
    
    try {
      const version = process.version;
      const majorVersion = parseInt(version.slice(1).split('.')[0]);
      const requiredMajor = parseInt(CONFIG.requiredNodeVersion.replace('>=', '').split('.')[0]);
      
      if (majorVersion >= requiredMajor) {
        console.log(`   ✅ Node.js ${version} (required: ${CONFIG.requiredNodeVersion})`);
      } else {
        this.issues.push({
          type: 'error',
          message: `Node.js ${version} is too old. Required: ${CONFIG.requiredNodeVersion}`,
          fix: 'Update Node.js to the latest LTS version'
        });
      }
    } catch (error) {
      this.issues.push({
        type: 'error',
        message: 'Could not determine Node.js version',
        fix: 'Install Node.js'
      });
    }
  }

  async checkNpmVersion() {
    console.log('🔍 Checking npm version...');
    
    try {
      const version = execSync('npm --version', { encoding: 'utf8' }).trim();
      const majorVersion = parseInt(version.split('.')[0]);
      const requiredMajor = parseInt(CONFIG.requiredNpmVersion.replace('>=', '').split('.')[0]);
      
      if (majorVersion >= requiredMajor) {
        console.log(`   ✅ npm ${version} (required: ${CONFIG.requiredNpmVersion})`);
      } else {
        this.issues.push({
          type: 'error',
          message: `npm ${version} is too old. Required: ${CONFIG.requiredNpmVersion}`,
          fix: 'Update npm: npm install -g npm@latest'
        });
      }
    } catch (error) {
      this.issues.push({
        type: 'error',
        message: 'Could not determine npm version',
        fix: 'Install npm'
      });
    }
  }

  async checkEnvironmentVariables() {
    console.log('🔍 Checking environment variables...');
    
    const envFile = path.join(projectRoot, '.env.local');
    let envContent = '';
    
    try {
      envContent = await fs.readFile(envFile, 'utf8');
    } catch (error) {
      this.warnings.push({
        type: 'warning',
        message: '.env.local file not found',
        fix: 'Create .env.local file with required environment variables'
      });
    }
    
    // Check required env vars
    for (const envVar of CONFIG.requiredEnvVars) {
      if (process.env[envVar] || envContent.includes(envVar)) {
        console.log(`   ✅ ${envVar}`);
      } else {
        this.issues.push({
          type: 'error',
          message: `Required environment variable ${envVar} is not set`,
          fix: `Add ${envVar} to your .env.local file`
        });
      }
    }
    
    // Check optional env vars
    for (const envVar of CONFIG.optionalEnvVars) {
      if (process.env[envVar] || envContent.includes(envVar)) {
        console.log(`   ✅ ${envVar} (optional)`);
      } else {
        this.warnings.push({
          type: 'warning',
          message: `Optional environment variable ${envVar} is not set`,
          fix: `Add ${envVar} to your .env.local file if needed`
        });
      }
    }
  }

  async checkCriticalFiles() {
    console.log('🔍 Checking critical files...');
    
    for (const file of CONFIG.criticalFiles) {
      const filePath = path.join(projectRoot, file);
      
      try {
        await fs.access(filePath);
        console.log(`   ✅ ${file}`);
      } catch (error) {
        if (file === '.env.local') {
          this.warnings.push({
            type: 'warning',
            message: `${file} not found`,
            fix: 'Create .env.local file'
          });
        } else {
          this.issues.push({
            type: 'error',
            message: `${file} not found`,
            fix: 'Ensure all critical files are present'
          });
        }
      }
    }
  }

  async checkDependencies() {
    console.log('🔍 Checking dependencies...');
    
    try {
      const packageJson = JSON.parse(await fs.readFile(path.join(projectRoot, 'package.json'), 'utf8'));
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      // Check for missing dev dependencies
      for (const dep of CONFIG.devDependencies) {
        if (allDeps[dep]) {
          console.log(`   ✅ ${dep}`);
        } else {
          this.suggestions.push({
            type: 'suggestion',
            message: `Development dependency ${dep} is missing`,
            fix: `npm install --save-dev ${dep}`
          });
        }
      }
      
      // Check for outdated dependencies
      try {
        const outdated = execSync('npm outdated --json', { encoding: 'utf8', cwd: projectRoot });
        const outdatedData = JSON.parse(outdated);
        
        if (Object.keys(outdatedData).length > 0) {
          this.warnings.push({
            type: 'warning',
            message: `${Object.keys(outdatedData).length} dependencies are outdated`,
            fix: 'Run npm update to update dependencies'
          });
        } else {
          console.log('   ✅ All dependencies are up to date');
        }
      } catch (error) {
        // npm outdated returns non-zero exit code when there are outdated packages
        console.log('   ⚠️  Some dependencies may be outdated');
      }
      
    } catch (error) {
      this.issues.push({
        type: 'error',
        message: 'Could not read package.json',
        fix: 'Ensure package.json exists and is valid'
      });
    }
  }

  async checkTypeScript() {
    console.log('🔍 Checking TypeScript configuration...');
    
    try {
      execSync('npx tsc --noEmit', { cwd: projectRoot, stdio: 'pipe' });
      console.log('   ✅ TypeScript compilation successful');
    } catch (error) {
      this.issues.push({
        type: 'error',
        message: 'TypeScript compilation failed',
        fix: 'Fix TypeScript errors: npx tsc --noEmit'
      });
    }
  }

  async checkLinting() {
    console.log('🔍 Checking ESLint...');
    
    try {
      execSync('npm run lint', { cwd: projectRoot, stdio: 'pipe' });
      console.log('   ✅ ESLint passed');
    } catch (error) {
      this.warnings.push({
        type: 'warning',
        message: 'ESLint found issues',
        fix: 'Fix linting errors: npm run lint:fix'
      });
    }
  }

  async checkTests() {
    console.log('🔍 Checking tests...');
    
    try {
      execSync('npm test -- --passWithNoTests', { cwd: projectRoot, stdio: 'pipe' });
      console.log('   ✅ Tests passed');
    } catch (error) {
      this.warnings.push({
        type: 'warning',
        message: 'Some tests failed',
        fix: 'Fix failing tests: npm test'
      });
    }
  }

  async checkBuild() {
    console.log('🔍 Checking build...');
    
    try {
      execSync('npm run build', { cwd: projectRoot, stdio: 'pipe' });
      console.log('   ✅ Build successful');
    } catch (error) {
      this.issues.push({
        type: 'error',
        message: 'Build failed',
        fix: 'Fix build errors: npm run build'
      });
    }
  }

  printReport() {
    console.log('\n' + '='.repeat(60));
    console.log('🩺 DEVELOPMENT DOCTOR REPORT');
    console.log('='.repeat(60));
    
    if (this.issues.length === 0 && this.warnings.length === 0 && this.suggestions.length === 0) {
      console.log('🎉 All checks passed! Your development environment is healthy.');
      return;
    }
    
    // Print issues
    if (this.issues.length > 0) {
      console.log('\n❌ ISSUES (must be fixed):');
      this.issues.forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.message}`);
        console.log(`   Fix: ${issue.fix}`);
      });
    }
    
    // Print warnings
    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS (should be addressed):');
      this.warnings.forEach((warning, index) => {
        console.log(`\n${index + 1}. ${warning.message}`);
        console.log(`   Fix: ${warning.fix}`);
      });
    }
    
    // Print suggestions
    if (this.suggestions.length > 0) {
      console.log('\n💡 SUGGESTIONS (improvements):');
      this.suggestions.forEach((suggestion, index) => {
        console.log(`\n${index + 1}. ${suggestion.message}`);
        console.log(`   Fix: ${suggestion.fix}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (this.issues.length > 0) {
      console.log('❌ Please fix the issues above before continuing.');
      process.exit(1);
    } else {
      console.log('✅ Development environment is ready!');
    }
  }
}

// Run the dev doctor
const doctor = new DevDoctor();
doctor.run().catch(console.error);