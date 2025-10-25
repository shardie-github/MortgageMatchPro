#!/usr/bin/env node

/**
 * Project Structure Standardization Script
 * Reorganizes codebase into standardized structure
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Standardized structure
const STANDARD_STRUCTURE = {
  'apps': {
    'web': {
      'app': 'Next.js app directory',
      'pages': 'Next.js pages directory',
      'components': 'React components',
      'styles': 'Global styles',
      'public': 'Static assets'
    },
    'mobile': {
      'src': 'React Native source',
      'android': 'Android specific files',
      'ios': 'iOS specific files'
    }
  },
  'core': {
    'ai': 'AI services and agents',
    'billing': 'Billing and payment logic',
    'tenant': 'Multi-tenancy services',
    'analytics': 'Analytics and reporting',
    'auth': 'Authentication services',
    'api': 'API services and endpoints',
    'monitoring': 'Monitoring and observability',
    'security': 'Security services',
    'compliance': 'Compliance and data protection'
  },
  'shared': {
    'types': 'Shared TypeScript types',
    'utils': 'Shared utilities',
    'constants': 'Shared constants',
    'hooks': 'Shared React hooks',
    'components': 'Shared UI components',
    'services': 'Shared services',
    'schemas': 'Shared validation schemas'
  },
  'tests': {
    'unit': 'Unit tests',
    'integration': 'Integration tests',
    'e2e': 'End-to-end tests',
    'fixtures': 'Test fixtures and mocks'
  },
  'docs': {
    'api': 'API documentation',
    'architecture': 'Architecture documentation',
    'deployment': 'Deployment guides',
    'development': 'Development guides'
  },
  'scripts': 'Build and utility scripts',
  'config': 'Configuration files'
};

class StructureStandardizer {
  constructor() {
    this.moves = [];
    this.creates = [];
    this.deletes = [];
  }

  async run() {
    console.log('🏗️  Standardizing project structure...\n');
    
    try {
      await this.analyzeCurrentStructure();
      await this.createStandardDirectories();
      await this.moveFilesToStandardLocations();
      await this.updateImportPaths();
      await this.createIndexFiles();
      await this.updateConfigurationFiles();
      
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Structure standardization failed:', error);
      process.exit(1);
    }
  }

  async analyzeCurrentStructure() {
    console.log('🔍 Analyzing current structure...');
    
    const currentStructure = await this.getDirectoryStructure(projectRoot);
    console.log('   ✅ Current structure analyzed');
    
    // Identify files that need to be moved
    this.identifyMoves(currentStructure);
  }

  async getDirectoryStructure(dir, depth = 0) {
    const structure = {};
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(projectRoot, fullPath);
        
        // Skip node_modules, .git, and other ignored directories
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue;
        }
        
        if (entry.isDirectory()) {
          structure[entry.name] = await this.getDirectoryStructure(fullPath, depth + 1);
        } else {
          structure[entry.name] = 'file';
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
    
    return structure;
  }

  identifyMoves(currentStructure) {
    // Move lib/* to core/*
    if (currentStructure.lib) {
      for (const [item, content] of Object.entries(currentStructure.lib)) {
        if (typeof content === 'object') {
          this.moves.push({
            from: `lib/${item}`,
            to: `core/${item}`,
            type: 'directory'
          });
        } else {
          this.moves.push({
            from: `lib/${item}`,
            to: `core/${item}`,
            type: 'file'
          });
        }
      }
    }
    
    // Move components to shared/components
    if (currentStructure.components) {
      this.moves.push({
        from: 'components',
        to: 'shared/components',
        type: 'directory'
      });
    }
    
    // Move __tests__ to tests/unit
    if (currentStructure['__tests__']) {
      this.moves.push({
        from: '__tests__',
        to: 'tests/unit',
        type: 'directory'
      });
    }
    
    // Move src to apps/web/src
    if (currentStructure.src) {
      this.moves.push({
        from: 'src',
        to: 'apps/web/src',
        type: 'directory'
      });
    }
  }

  async createStandardDirectories() {
    console.log('📁 Creating standard directories...');
    
    for (const [dir, description] of Object.entries(STANDARD_STRUCTURE)) {
      if (typeof description === 'object') {
        await this.createNestedDirectories(dir, description);
      } else {
        await this.createDirectory(dir);
      }
    }
    
    console.log('   ✅ Standard directories created');
  }

  async createNestedDirectories(basePath, structure) {
    for (const [dir, description] of Object.entries(structure)) {
      const fullPath = path.join(projectRoot, basePath, dir);
      await this.createDirectory(fullPath);
      
      if (typeof description === 'object') {
        await this.createNestedDirectories(path.join(basePath, dir), description);
      }
    }
  }

  async createDirectory(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      this.creates.push(dirPath);
    } catch (error) {
      // Directory might already exist
    }
  }

  async moveFilesToStandardLocations() {
    console.log('📦 Moving files to standard locations...');
    
    for (const move of this.moves) {
      const fromPath = path.join(projectRoot, move.from);
      const toPath = path.join(projectRoot, move.to);
      
      try {
        await fs.access(fromPath);
        
        // Create destination directory if it doesn't exist
        await fs.mkdir(path.dirname(toPath), { recursive: true });
        
        // Move the file/directory
        await fs.rename(fromPath, toPath);
        
        this.moves.push({
          ...move,
          status: 'moved'
        });
        
        console.log(`   ✅ Moved ${move.from} → ${move.to}`);
      } catch (error) {
        console.warn(`   ⚠️  Could not move ${move.from}: ${error.message}`);
      }
    }
  }

  async updateImportPaths() {
    console.log('🔗 Updating import paths...');
    
    // This would need to be implemented based on the specific files
    // For now, we'll just log what needs to be done
    console.log('   ⚠️  Import path updates need to be done manually');
    console.log('   📝 Update imports from:');
    console.log('     - lib/* → core/*');
    console.log('     - components/* → shared/components/*');
    console.log('     - __tests__/* → tests/unit/*');
  }

  async createIndexFiles() {
    console.log('📄 Creating index files...');
    
    const indexFiles = [
      'core/index.ts',
      'shared/index.ts',
      'shared/components/index.ts',
      'shared/utils/index.ts',
      'shared/types/index.ts'
    ];
    
    for (const indexFile of indexFiles) {
      const filePath = path.join(projectRoot, indexFile);
      const dirPath = path.dirname(filePath);
      
      try {
        await fs.mkdir(dirPath, { recursive: true });
        
        // Create basic index file
        const content = `// Auto-generated index file
// Export all modules from this directory

export * from './${path.basename(dirPath)}';
`;
        
        await fs.writeFile(filePath, content);
        console.log(`   ✅ Created ${indexFile}`);
      } catch (error) {
        console.warn(`   ⚠️  Could not create ${indexFile}: ${error.message}`);
      }
    }
  }

  async updateConfigurationFiles() {
    console.log('⚙️  Updating configuration files...');
    
    // Update tsconfig.json paths
    await this.updateTsconfigPaths();
    
    // Update package.json scripts
    await this.updatePackageScripts();
    
    console.log('   ✅ Configuration files updated');
  }

  async updateTsconfigPaths() {
    const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
    
    try {
      const tsconfig = JSON.parse(await fs.readFile(tsconfigPath, 'utf8'));
      
      tsconfig.compilerOptions.paths = {
        '@/*': ['apps/web/*'],
        '@core/*': ['core/*'],
        '@shared/*': ['shared/*'],
        '@tests/*': ['tests/*'],
        '@docs/*': ['docs/*']
      };
      
      await fs.writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2));
      console.log('   ✅ Updated tsconfig.json paths');
    } catch (error) {
      console.warn('   ⚠️  Could not update tsconfig.json:', error.message);
    }
  }

  async updatePackageScripts() {
    const packagePath = path.join(projectRoot, 'package.json');
    
    try {
      const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf8'));
      
      // Add new scripts for the standardized structure
      packageJson.scripts = {
        ...packageJson.scripts,
        'dev:doctor': 'node scripts/dev-doctor.mjs',
        'structure:standardize': 'node scripts/standardize-structure.mjs',
        'build:core': 'tsc --project core/tsconfig.json',
        'build:shared': 'tsc --project shared/tsconfig.json',
        'test:unit': 'jest tests/unit',
        'test:integration': 'jest tests/integration',
        'test:e2e': 'playwright test'
      };
      
      await fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2));
      console.log('   ✅ Updated package.json scripts');
    } catch (error) {
      console.warn('   ⚠️  Could not update package.json:', error.message);
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('🏗️  STRUCTURE STANDARDIZATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Directories created: ${this.creates.length}`);
    console.log(`Files moved: ${this.moves.filter(m => m.status === 'moved').length}`);
    console.log(`Files deleted: ${this.deletes.length}`);
    
    console.log('\n📁 New structure:');
    this.printStructure(STANDARD_STRUCTURE, '');
    
    console.log('\n📝 Next steps:');
    console.log('1. Update import statements in your code');
    console.log('2. Run npm run dev:doctor to verify setup');
    console.log('3. Update your IDE configuration');
    console.log('4. Update documentation');
    
    console.log('\n' + '='.repeat(60));
  }

  printStructure(structure, indent) {
    for (const [name, content] of Object.entries(structure)) {
      if (typeof content === 'string') {
        console.log(`${indent}${name}/`);
      } else {
        console.log(`${indent}${name}/`);
        this.printStructure(content, indent + '  ');
      }
    }
  }
}

// Run the standardizer
const standardizer = new StructureStandardizer();
standardizer.run().catch(console.error);