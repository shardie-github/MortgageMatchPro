#!/usr/bin/env node

/**
 * Database Setup Script for MortgageMatchPro
 * 
 * This script sets up the complete database schema, RLS policies, and functions
 * for the MortgageMatchPro application. It can be run against a local or remote
 * Supabase instance.
 * 
 * Usage:
 *   node scripts/setup-database.js [--local|--remote] [--env-file .env]
 * 
 * Options:
 *   --local     Run against local Supabase instance (requires Docker)
 *   --remote    Run against remote Supabase instance (requires SUPABASE_URL and SUPABASE_SERVICE_KEY)
 *   --env-file  Path to environment file (default: .env)
 *   --dry-run   Show what would be executed without running
 *   --help      Show this help message
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  migrationsDir: path.join(__dirname, '..', 'supabase', 'migrations'),
  completeSchemaFile: path.join(__dirname, '..', 'supabase_complete_schema.sql'),
  envFile: '.env',
  dryRun: false,
  target: 'remote' // 'local' or 'remote'
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--local':
        CONFIG.target = 'local';
        break;
      case '--remote':
        CONFIG.target = 'remote';
        break;
      case '--env-file':
        CONFIG.envFile = args[++i];
        break;
      case '--dry-run':
        CONFIG.dryRun = true;
        break;
      case '--help':
        console.log(`
Database Setup Script for MortgageMatchPro

Usage: node scripts/setup-database.js [options]

Options:
  --local       Run against local Supabase instance (requires Docker)
  --remote      Run against remote Supabase instance (requires SUPABASE_URL and SUPABASE_SERVICE_KEY)
  --env-file    Path to environment file (default: .env)
  --dry-run     Show what would be executed without running
  --help        Show this help message

Examples:
  node scripts/setup-database.js --local
  node scripts/setup-database.js --remote --env-file .env.production
  node scripts/setup-database.js --dry-run
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
    console.error('See .env.example for required variables.');
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
  
  return files.map(file => path.join(CONFIG.migrationsDir, file));
}

// Execute SQL against Supabase
async function executeSQL(sql, description) {
  console.log(`\n📝 ${description}`);
  
  if (CONFIG.dryRun) {
    console.log('🔍 DRY RUN - Would execute SQL:');
    console.log(sql.substring(0, 200) + (sql.length > 200 ? '...' : ''));
    return;
  }
  
  try {
    if (CONFIG.target === 'local') {
      // Execute against local Supabase
      execSync(`npx supabase db reset --local`, { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
    } else {
      // Execute against remote Supabase using psql
      const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
      
      if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required for remote execution');
      }
      
      // Extract database URL from Supabase URL
      const dbUrl = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');
      const psqlUrl = `postgresql://postgres:${SUPABASE_SERVICE_KEY}@db.${dbUrl}.supabase.co:5432/postgres`;
      
      // Write SQL to temporary file
      const tempFile = path.join(__dirname, '..', 'temp_migration.sql');
      fs.writeFileSync(tempFile, sql);
      
      try {
        execSync(`psql "${psqlUrl}" -f "${tempFile}"`, { stdio: 'inherit' });
      } finally {
        // Clean up temp file
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }
    }
    
    console.log('✅ Successfully executed');
  } catch (error) {
    console.error('❌ Error executing SQL:', error.message);
    throw error;
  }
}

// Main execution function
async function main() {
  try {
    console.log('🚀 Starting MortgageMatchPro Database Setup');
    console.log(`📊 Target: ${CONFIG.target}`);
    console.log(`🔧 Dry run: ${CONFIG.dryRun}`);
    
    // Parse arguments
    parseArgs();
    
    // Load environment variables
    if (CONFIG.target === 'remote') {
      loadEnv();
    }
    
    // Check if complete schema file exists
    if (!fs.existsSync(CONFIG.completeSchemaFile)) {
      throw new Error(`Complete schema file not found: ${CONFIG.completeSchemaFile}`);
    }
    
    // Get migration files
    const migrationFiles = getMigrationFiles();
    console.log(`📁 Found ${migrationFiles.length} migration files`);
    
    if (CONFIG.target === 'local') {
      // For local development, use the complete schema file
      console.log('\n🏗️  Setting up local database with complete schema...');
      const completeSchema = fs.readFileSync(CONFIG.completeSchemaFile, 'utf8');
      await executeSQL(completeSchema, 'Creating complete database schema');
    } else {
      // For remote, execute migrations in order
      console.log('\n🏗️  Executing migrations in order...');
      
      for (const migrationFile of migrationFiles) {
        const migrationName = path.basename(migrationFile);
        const sql = fs.readFileSync(migrationFile, 'utf8');
        
        if (sql.trim()) {
          await executeSQL(sql, `Executing migration: ${migrationName}`);
        } else {
          console.log(`⏭️  Skipping empty migration: ${migrationName}`);
        }
      }
    }
    
    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Verify your database schema in Supabase Dashboard');
    console.log('2. Test your application connection');
    console.log('3. Set up any additional environment variables');
    
  } catch (error) {
    console.error('\n💥 Database setup failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main, CONFIG };