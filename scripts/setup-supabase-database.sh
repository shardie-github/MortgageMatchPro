#!/bin/bash

# =============================================
# MortgageMatchPro Supabase Database Setup
# =============================================
# This script sets up the complete database schema, RLS policies, and functions
# for the MortgageMatchPro application on Supabase.
#
# Usage:
#   ./scripts/setup-supabase-database.sh [options]
#
# Options:
#   --local       Run against local Supabase instance (requires Docker)
#   --remote      Run against remote Supabase instance (requires .env file)
#   --env-file    Path to environment file (default: .env)
#   --dry-run     Show what would be executed without running
#   --help        Show this help message

set -e  # Exit on any error

# Configuration
TARGET="remote"
ENV_FILE=".env"
DRY_RUN=false
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --local)
                TARGET="local"
                shift
                ;;
            --remote)
                TARGET="remote"
                shift
                ;;
            --env-file)
                ENV_FILE="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Show help message
show_help() {
    cat << EOF
MortgageMatchPro Supabase Database Setup

Usage: $0 [options]

Options:
  --local       Run against local Supabase instance (requires Docker)
  --remote      Run against remote Supabase instance (requires .env file)
  --env-file    Path to environment file (default: .env)
  --dry-run     Show what would be executed without running
  --help        Show this help message

Examples:
  $0 --local
  $0 --remote --env-file .env.production
  $0 --dry-run

Environment Variables Required (for --remote):
  SUPABASE_URL=https://your-project-id.supabase.co
  SUPABASE_SERVICE_KEY=your-supabase-service-key

EOF
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    # Check if Supabase CLI is available
    if ! npx supabase --version &> /dev/null; then
        log_warning "Supabase CLI not found. Installing..."
        npm install -g @supabase/cli
    fi
    
    if [ "$TARGET" = "remote" ]; then
        # Check if .env file exists
        if [ ! -f "$PROJECT_ROOT/$ENV_FILE" ]; then
            log_error "Environment file not found: $PROJECT_ROOT/$ENV_FILE"
            log_info "Please create a .env file with your Supabase configuration."
            log_info "See .env.template for required variables."
            exit 1
        fi
        
        # Load environment variables
        set -a
        source "$PROJECT_ROOT/$ENV_FILE"
        set +a
        
        # Check required environment variables
        if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
            log_error "SUPABASE_URL and SUPABASE_SERVICE_KEY are required for remote execution"
            exit 1
        fi
    fi
    
    log_success "Prerequisites check passed"
}

# Setup local Supabase (if needed)
setup_local_supabase() {
    if [ "$TARGET" = "local" ]; then
        log_info "Setting up local Supabase instance..."
        
        # Check if Docker is running
        if ! docker info &> /dev/null; then
            log_error "Docker is not running. Please start Docker first."
            exit 1
        fi
        
        # Start local Supabase
        cd "$PROJECT_ROOT"
        if [ "$DRY_RUN" = true ]; then
            log_info "DRY RUN - Would start local Supabase"
        else
            npx supabase start
        fi
        
        log_success "Local Supabase setup completed"
    fi
}

# Execute database setup
execute_database_setup() {
    log_info "Executing database setup..."
    
    cd "$PROJECT_ROOT"
    
    if [ "$TARGET" = "local" ]; then
        # For local development, use the complete schema file
        log_info "Setting up local database with complete schema..."
        
        if [ "$DRY_RUN" = true ]; then
            log_info "DRY RUN - Would execute complete schema"
            log_info "Schema file: supabase_complete_schema.sql"
        else
            # Reset and apply complete schema
            npx supabase db reset --local
        fi
    else
        # For remote, execute migrations in order
        log_info "Executing migrations in order..."
        
        # Get migration files
        MIGRATION_DIR="$PROJECT_ROOT/supabase/migrations"
        MIGRATIONS=($(ls "$MIGRATION_DIR"/*.sql | sort))
        
        log_info "Found ${#MIGRATIONS[@]} migration files"
        
        for i in "${!MIGRATIONS[@]}"; do
            MIGRATION_FILE="${MIGRATIONS[$i]}"
            MIGRATION_NAME=$(basename "$MIGRATION_FILE")
            
            log_info "[$((i+1))/${#MIGRATIONS[@]}] Processing migration: $MIGRATION_NAME"
            
            # Skip empty migration files
            if [ ! -s "$MIGRATION_FILE" ]; then
                log_warning "Skipping empty migration: $MIGRATION_NAME"
                continue
            fi
            
            if [ "$DRY_RUN" = true ]; then
                log_info "DRY RUN - Would execute migration: $MIGRATION_NAME"
                head -n 5 "$MIGRATION_FILE"
                echo "..."
            else
                # Execute migration using psql
                log_info "Executing migration: $MIGRATION_NAME"
                
                # Extract database URL from Supabase URL
                DB_URL=$(echo "$SUPABASE_URL" | sed 's/https:\/\///' | sed 's/\.supabase\.co//')
                PSQL_URL="postgresql://postgres:$SUPABASE_SERVICE_KEY@db.$DB_URL.supabase.co:5432/postgres"
                
                if psql "$PSQL_URL" -f "$MIGRATION_FILE" -v ON_ERROR_STOP=1; then
                    log_success "Migration completed: $MIGRATION_NAME"
                else
                    log_error "Migration failed: $MIGRATION_NAME"
                    exit 1
                fi
            fi
        done
    fi
    
    log_success "Database setup completed"
}

# Verify database setup
verify_setup() {
    if [ "$DRY_RUN" = true ]; then
        log_info "DRY RUN - Skipping verification"
        return
    fi
    
    log_info "Verifying database setup..."
    
    if [ "$TARGET" = "local" ]; then
        # Check local database
        cd "$PROJECT_ROOT"
        npx supabase db diff --local
    else
        # Check remote database
        DB_URL=$(echo "$SUPABASE_URL" | sed 's/https:\/\///' | sed 's/\.supabase\.co//')
        PSQL_URL="postgresql://postgres:$SUPABASE_SERVICE_KEY@db.$DB_URL.supabase.co:5432/postgres"
        
        # Check if we can connect and list tables
        if psql "$PSQL_URL" -c "\dt" &> /dev/null; then
            log_success "Database connection verified"
        else
            log_warning "Could not verify database connection"
        fi
    fi
}

# Main execution
main() {
    log_info "🚀 Starting MortgageMatchPro Database Setup"
    log_info "📊 Target: $TARGET"
    log_info "🔧 Dry run: $DRY_RUN"
    
    # Parse arguments
    parse_args "$@"
    
    # Check prerequisites
    check_prerequisites
    
    # Setup local Supabase if needed
    setup_local_supabase
    
    # Execute database setup
    execute_database_setup
    
    # Verify setup
    verify_setup
    
    log_success "🎉 Database setup completed successfully!"
    echo
    log_info "📋 Next steps:"
    log_info "1. Verify your database schema in Supabase Dashboard"
    log_info "2. Test your application connection"
    log_info "3. Set up any additional environment variables"
    log_info "4. Run your application tests"
}

# Run the script
main "$@"