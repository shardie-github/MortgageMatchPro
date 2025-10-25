#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Domain boundaries and their dependencies
const DOMAIN_DEPENDENCIES = {
  'ai': ['events', 'monitoring', 'billing'],
  'billing': ['events', 'monitoring', 'tenancy'],
  'tenant': ['events', 'monitoring'],
  'analytics': ['events', 'monitoring', 'billing', 'tenant'],
  'crm': ['events', 'monitoring', 'tenant'],
  'integrations': ['events', 'monitoring', 'tenant'],
  'ui': ['events', 'monitoring'],
  'api': ['events', 'monitoring', 'billing', 'tenant', 'analytics'],
  'auth': ['events', 'monitoring', 'tenant'],
  'monitoring': ['events']
};

// Critical files that affect multiple domains
const CRITICAL_FILES = [
  'lib/events/event-bus.ts',
  'lib/events/schemas/',
  'lib/monitoring/',
  'lib/tenancy/',
  'package.json',
  'tsconfig.json',
  'next.config.js'
];

class ChangeImpactAnalyzer {
  constructor() {
    this.changedFiles = [];
    this.impactedDomains = new Set();
    this.warnings = [];
    this.errors = [];
  }

  async analyzeChanges() {
    console.log('🔍 Analyzing code changes for impact...\n');

    try {
      // Get changed files from git
      this.changedFiles = await this.getChangedFiles();
      
      if (this.changedFiles.length === 0) {
        console.log('✅ No changes detected.');
        return;
      }

      console.log(`📁 Found ${this.changedFiles.length} changed files:\n`);
      this.changedFiles.forEach(file => console.log(`  - ${file}`));
      console.log('');

      // Analyze each changed file
      for (const file of this.changedFiles) {
        await this.analyzeFile(file);
      }

      // Generate impact report
      this.generateImpactReport();

    } catch (error) {
      console.error('❌ Error analyzing changes:', error.message);
      process.exit(1);
    }
  }

  async getChangedFiles() {
    try {
      const output = execSync('git diff --cached --name-only', { 
        encoding: 'utf8',
        cwd: projectRoot 
      });
      return output.trim().split('\n').filter(file => file.length > 0);
    } catch (error) {
      // If no staged changes, check working directory
      try {
        const output = execSync('git diff --name-only', { 
          encoding: 'utf8',
          cwd: projectRoot 
        });
        return output.trim().split('\n').filter(file => file.length > 0);
      } catch (error2) {
        return [];
      }
    }
  }

  async analyzeFile(filePath) {
    const domain = this.getDomainFromPath(filePath);
    if (domain) {
      this.impactedDomains.add(domain);
    }

    // Check if it's a critical file
    if (this.isCriticalFile(filePath)) {
      this.warnings.push({
        type: 'critical_file',
        file: filePath,
        message: 'This file affects multiple domains and requires careful review'
      });
    }

    // Check for domain boundary violations
    if (domain && this.hasDomainBoundaryViolation(filePath, domain)) {
      this.errors.push({
        type: 'domain_violation',
        file: filePath,
        message: `File in ${domain} domain may be violating domain boundaries`
      });
    }

    // Check for breaking changes in API files
    if (filePath.startsWith('pages/api/') || filePath.startsWith('lib/api/')) {
      this.warnings.push({
        type: 'api_change',
        file: filePath,
        message: 'API changes may affect external consumers'
      });
    }

    // Check for changes to event schemas
    if (filePath.includes('events/schemas/')) {
      this.warnings.push({
        type: 'event_schema_change',
        file: filePath,
        message: 'Event schema changes may break event handlers'
      });
    }

    // Check for changes to shared utilities
    if (filePath.includes('lib/utils/') || filePath.includes('lib/shared/')) {
      this.warnings.push({
        type: 'shared_utility_change',
        file: filePath,
        message: 'Changes to shared utilities may affect multiple domains'
      });
    }
  }

  getDomainFromPath(filePath) {
    if (filePath.startsWith('lib/')) {
      const parts = filePath.split('/');
      if (parts.length >= 2) {
        return parts[1];
      }
    }
    return null;
  }

  isCriticalFile(filePath) {
    return CRITICAL_FILES.some(critical => 
      filePath.startsWith(critical) || filePath.includes(critical)
    );
  }

  hasDomainBoundaryViolation(filePath, domain) {
    // This is a simplified check - in a real implementation,
    // you would analyze the actual imports and dependencies
    const content = this.getFileContent(filePath);
    if (!content) return false;

    // Check for imports from other domains
    const importRegex = /import.*from\s+['"](\.\.?\/)*lib\/([^\/'"]+)/g;
    let match;
    const importedDomains = new Set();

    while ((match = importRegex.exec(content)) !== null) {
      const importedDomain = match[2];
      if (importedDomain !== domain && DOMAIN_DEPENDENCIES[domain]) {
        if (!DOMAIN_DEPENDENCIES[domain].includes(importedDomain)) {
          importedDomains.add(importedDomain);
        }
      }
    }

    return importedDomains.size > 0;
  }

  getFileContent(filePath) {
    try {
      const fullPath = path.join(projectRoot, filePath);
      return require('fs').readFileSync(fullPath, 'utf8');
    } catch (error) {
      return null;
    }
  }

  generateImpactReport() {
    console.log('📊 Change Impact Analysis Report\n');
    console.log('=' .repeat(50));

    // Summary
    console.log('\n📈 Summary:');
    console.log(`  • Changed files: ${this.changedFiles.length}`);
    console.log(`  • Impacted domains: ${this.impactedDomains.size}`);
    console.log(`  • Warnings: ${this.warnings.length}`);
    console.log(`  • Errors: ${this.errors.length}`);

    // Impacted domains
    if (this.impactedDomains.size > 0) {
      console.log('\n🏗️  Impacted Domains:');
      Array.from(this.impactedDomains).forEach(domain => {
        console.log(`  • ${domain}`);
        const dependencies = DOMAIN_DEPENDENCIES[domain] || [];
        if (dependencies.length > 0) {
          console.log(`    Dependencies: ${dependencies.join(', ')}`);
        }
      });
    }

    // Warnings
    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(warning => {
        console.log(`  • ${warning.file}: ${warning.message}`);
      });
    }

    // Errors
    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(error => {
        console.log(`  • ${error.file}: ${error.message}`);
      });
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    
    if (this.impactedDomains.size > 1) {
      console.log('  • Multiple domains affected - consider breaking changes into smaller commits');
    }

    if (this.warnings.some(w => w.type === 'api_change')) {
      console.log('  • API changes detected - update API documentation and version numbers');
    }

    if (this.warnings.some(w => w.type === 'event_schema_change')) {
      console.log('  • Event schema changes detected - verify all event handlers are updated');
    }

    if (this.errors.length > 0) {
      console.log('  • Domain boundary violations detected - review and refactor if necessary');
    }

    // Test recommendations
    console.log('\n🧪 Testing Recommendations:');
    if (this.impactedDomains.size > 0) {
      console.log('  • Run domain-specific tests for affected areas');
    }
    if (this.warnings.some(w => w.type === 'api_change')) {
      console.log('  • Run API integration tests');
    }
    if (this.warnings.some(w => w.type === 'event_schema_change')) {
      console.log('  • Run event system integration tests');
    }

    // Exit with error if there are critical issues
    if (this.errors.length > 0) {
      console.log('\n❌ Change impact analysis failed due to errors.');
      process.exit(1);
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  Change impact analysis completed with warnings.');
    } else {
      console.log('\n✅ Change impact analysis completed successfully.');
    }
  }
}

// Run the analysis
const analyzer = new ChangeImpactAnalyzer();
analyzer.analyzeChanges().catch(error => {
  console.error('❌ Analysis failed:', error);
  process.exit(1);
});
