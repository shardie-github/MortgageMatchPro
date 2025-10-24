#!/usr/bin/env node

/**
 * Migration Runner for MortgageMatchPro
 * 
 * This script runs all database migrations in the correct order.
 * It can be used for both local development and production deployments.
 * 
 * Usage:
 *   node scripts/run-migrations.js [--env-file .env] [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  migrationsDir: path.join(__dirname, '..', 'supabase', 'migrations'),
  envFile: '.env',
  dryRun: false
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--env-file':
        CONFIG.envFile = args[++i];
        break;
      case '--dry-run':
        CONFIG.dryRun = true;
        break;
      case '--help':
        console.log(`
Migration Runner for MortgageMatchPro

Usage: node scripts/run-migrations.js [options]

Options:
  --env-file   Path to environment file (default: .env)
  --dry-run    Show what would be executed without running
  --help       Show this help message

Examples:
  node scripts/run-migrations.js
  node scripts/run-migrations.js --env-file .env.production
  node scripts/run-migrations.js --dry-run
        `);
        process.exit(0);
        break;
      default:
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
    }
  }
}

// Load environment variables
function loadEnv() {
  const envPath = path.resolve(CONFIG.envFile);
  
  if (!fs.existsSync(envPath)) {
    console.error(`Environment file not found: ${envPath}`);
    console.error('Please create a .env file with your Supabase configuration.');
    console.error('See .env.template for required variables.');
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        envVars[key] = valueParts.join('=');
      }
    }
  });
  
  // Set environment variables
  Object.assign(process.env, envVars);
  
  return envVars;
}

// Get migration files in order
function getMigrationFiles() {
  const files = fs.readdirSync(CONFIG.migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Sort alphabetically to maintain order
  
  return files.map(file => ({
    name: file,
    path: path.join(CONFIG.migrationsDir, file)
  }));
}

// Execute migration using Supabase CLI
async function executeMigration(migration, index, total) {
  const { name, path: filePath } = migration;
  console.log(`\n📝 [${index + 1}/${total}] Running migration: ${name}`);
  
  if (CONFIG.dryRun) {
    console.log('🔍 DRY RUN - Would execute migration file:');
    const content = fs.readFileSync(filePath, 'utf8');
    console.log(content.substring(0, 200) + (content.length > 200 ? '...' : ''));
    return;
  }
  
  try {
    // Use Supabase CLI to execute the migration
    execSync(`npx supabase db push --file "${filePath}"`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

// Main execution function
async function main() {
  try {
    console.log('🚀 Starting Migration Runner for MortgageMatchPro');
    console.log(`🔧 Dry run: ${CONFIG.dryRun}`);
    
    // Parse arguments
    parseArgs();
    
    // Load environment variables
    loadEnv();
    
    // Check if migrations directory exists
    if (!fs.existsSync(CONFIG.migrationsDir)) {
      throw new Error(`Migrations directory not found: ${CONFIG.migrationsDir}`);
    }
    
    // Get migration files
    const migrations = getMigrationFiles();
    console.log(`📁 Found ${migrations.length} migration files`);
    
    if (migrations.length === 0) {
      console.log('⚠️  No migration files found');
      return;
    }
    
    // Execute migrations in order
    console.log('\n🏗️  Executing migrations...');
    
    for (let i = 0; i < migrations.length; i++) {
      const migration = migrations[i];
      
      // Skip empty migration files
      const content = fs.readFileSync(migration.path, 'utf8').trim();
      if (!content) {
        console.log(`⏭️  Skipping empty migration: ${migration.name}`);
        continue;
      }
      
      await executeMigration(migration, i, migrations.length);
    }
    
    console.log('\n🎉 All migrations completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Verify your database schema in Supabase Dashboard');
    console.log('2. Test your application connection');
    console.log('3. Run any additional setup scripts if needed');
    
  } catch (error) {
    console.error('\n💥 Migration runner failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main, CONFIG };