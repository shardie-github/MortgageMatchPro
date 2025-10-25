# Backup and Recovery Procedures

## Overview

This document outlines comprehensive backup and recovery procedures for the MortgageMatch Pro platform, ensuring data protection and business continuity.

## Backup Strategy

### Backup Types

1. **Full Database Backup** - Complete database snapshot
2. **Incremental Backup** - Changes since last backup
3. **Transaction Log Backup** - Continuous transaction logging
4. **File System Backup** - Application files and configurations
5. **Configuration Backup** - Environment and service configurations

### Backup Schedule

| Backup Type | Frequency | Retention | Location |
|-------------|-----------|-----------|----------|
| Full Database | Daily at 2:00 AM UTC | 30 days | S3 + Local |
| Incremental | Every 4 hours | 7 days | S3 + Local |
| Transaction Logs | Every 15 minutes | 24 hours | S3 |
| File System | Daily at 3:00 AM UTC | 14 days | S3 |
| Configuration | Weekly | 12 weeks | S3 + Git |

## Database Backup Procedures

### Supabase Database Backup

**Automated Backup (Recommended):**
```bash
# Supabase handles automated backups
# Check backup status
supabase projects list
supabase projects get <project-id>
```

**Manual Backup:**
```bash
# Create manual backup
supabase db dump --file backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -la backup_*.sql
```

**Backup Verification:**
```bash
# Test backup integrity
supabase db reset --file backup_20241219_020000.sql

# Verify data consistency
supabase db diff --file backup_20241219_020000.sql
```

### PostgreSQL Backup (Alternative)

**Full Backup:**
```bash
# Create full backup
pg_dump -h <host> -U <user> -d <database> \
  --format=custom \
  --compress=9 \
  --file=backup_$(date +%Y%m%d_%H%M%S).dump

# Verify backup
pg_restore --list backup_20241219_020000.dump
```

**Incremental Backup:**
```bash
# Create incremental backup
pg_basebackup -h <host> -U <user> -D /backup/incremental/$(date +%Y%m%d_%H%M%S) \
  --format=tar \
  --compress=gzip
```

## File System Backup

### Application Files
```bash
# Backup application files
tar -czf app_backup_$(date +%Y%m%d_%H%M%S).tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=dist \
  /workspace/

# Upload to S3
aws s3 cp app_backup_20241219_030000.tar.gz s3://mortgagematch-backups/app/
```

### Configuration Files
```bash
# Backup configuration files
tar -czf config_backup_$(date +%Y%m%d_%H%M%S).tar.gz \
  .env* \
  *.config.js \
  *.json \
  supabase/

# Upload to S3
aws s3 cp config_backup_20241219_030000.tar.gz s3://mortgagematch-backups/config/
```

## Recovery Procedures

### Database Recovery

**Full Database Recovery:**
```bash
# Stop application services
vercel env pull .env.local
export DATABASE_URL="postgresql://..."

# Restore from backup
supabase db reset --file backup_20241219_020000.sql

# Verify restoration
supabase db diff
```

**Point-in-Time Recovery:**
```bash
# Restore to specific timestamp
supabase db reset --timestamp "2024-12-19 10:30:00"

# Verify data integrity
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
```

**Selective Table Recovery:**
```bash
# Restore specific tables
pg_restore -h <host> -U <user> -d <database> \
  --table=users \
  --table=mortgage_calculations \
  backup_20241219_020000.dump
```

### Application Recovery

**Full Application Recovery:**
```bash
# Download backup from S3
aws s3 cp s3://mortgagematch-backups/app/app_backup_20241219_030000.tar.gz .

# Extract backup
tar -xzf app_backup_20241219_030000.tar.gz

# Restore configuration
tar -xzf config_backup_20241219_030000.tar.gz

# Install dependencies
npm install

# Deploy application
vercel deploy --prod
```

**Configuration Recovery:**
```bash
# Restore environment variables
cp .env.backup .env.local

# Restore configuration files
cp *.config.js.backup *.config.js

# Restart services
vercel env pull .env.local
```

## Disaster Recovery

### RTO/RPO Objectives

| Service | RTO (Recovery Time Objective) | RPO (Recovery Point Objective) |
|---------|-------------------------------|--------------------------------|
| Database | 4 hours | 15 minutes |
| Application | 2 hours | 1 hour |
| File Storage | 1 hour | 4 hours |
| Configuration | 30 minutes | 24 hours |

### Disaster Recovery Sites

**Primary Site:**
- Location: US East (N. Virginia)
- Provider: AWS/Vercel
- Status: Active

**Secondary Site:**
- Location: US West (Oregon)
- Provider: AWS/Vercel
- Status: Standby

**Tertiary Site:**
- Location: Europe (Ireland)
- Provider: AWS/Vercel
- Status: Standby

### Failover Procedures

**Automatic Failover:**
1. Monitor primary site health
2. Detect failure conditions
3. Trigger failover to secondary site
4. Update DNS records
5. Notify operations team

**Manual Failover:**
1. Assess primary site status
2. Activate secondary site
3. Restore from latest backup
4. Update DNS records
5. Verify service functionality

### Cross-Region Replication

**Database Replication:**
```bash
# Set up read replica
supabase projects create-replica \
  --source <primary-project-id> \
  --region us-west-2

# Verify replication
supabase projects list
```

**File Replication:**
```bash
# Sync files to secondary region
aws s3 sync s3://mortgagematch-backups/ \
  s3://mortgagematch-backups-west/ \
  --region us-west-2
```

## Backup Verification

### Automated Verification

**Daily Verification Script:**
```bash
#!/bin/bash
# verify_backups.sh

BACKUP_DATE=$(date +%Y%m%d)
BACKUP_FILE="backup_${BACKUP_DATE}_020000.sql"

# Check if backup exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Verify backup integrity
if ! supabase db reset --file "$BACKUP_FILE" --dry-run; then
    echo "ERROR: Backup integrity check failed"
    exit 1
fi

# Test restore in test environment
supabase db reset --file "$BACKUP_FILE" --project test

# Verify data consistency
if ! psql $TEST_DATABASE_URL -c "SELECT COUNT(*) FROM users;" > /dev/null; then
    echo "ERROR: Data consistency check failed"
    exit 1
fi

echo "SUCCESS: Backup verification completed"
```

**Weekly Full Verification:**
```bash
#!/bin/bash
# full_backup_verification.sh

# Test full restore process
BACKUP_FILE="backup_$(date -d '7 days ago' +%Y%m%d)_020000.sql"

# Create test environment
supabase projects create test-env-$(date +%Y%m%d)

# Restore backup
supabase db reset --file "$BACKUP_FILE" --project test-env-$(date +%Y%m%d)

# Run comprehensive tests
npm run test:backup-verification

# Cleanup test environment
supabase projects delete test-env-$(date +%Y%m%d)
```

### Manual Verification

**Backup Integrity Check:**
```bash
# Check backup file size
ls -lh backup_*.sql

# Verify backup format
file backup_20241219_020000.sql

# Check backup content
head -20 backup_20241219_020000.sql
tail -20 backup_20241219_020000.sql
```

**Data Consistency Check:**
```bash
# Compare record counts
psql $PROD_DATABASE_URL -c "SELECT COUNT(*) FROM users;"
psql $BACKUP_DATABASE_URL -c "SELECT COUNT(*) FROM users;"

# Compare checksums
psql $PROD_DATABASE_URL -c "SELECT md5(string_agg(id::text, '')) FROM users;"
psql $BACKUP_DATABASE_URL -c "SELECT md5(string_agg(id::text, '')) FROM users;"
```

## Monitoring and Alerting

### Backup Monitoring

**Key Metrics:**
- Backup success rate
- Backup completion time
- Backup file size
- Storage usage
- Restore test results

**Alert Conditions:**
- Backup failure
- Backup delay > 1 hour
- Backup size < expected
- Storage usage > 90%
- Restore test failure

### Monitoring Scripts

**Backup Status Check:**
```bash
#!/bin/bash
# check_backup_status.sh

# Check latest backup
LATEST_BACKUP=$(ls -t backup_*.sql | head -1)
BACKUP_TIME=$(stat -c %Y "$LATEST_BACKUP")
CURRENT_TIME=$(date +%s)
AGE_HOURS=$(( (CURRENT_TIME - BACKUP_TIME) / 3600 ))

if [ $AGE_HOURS -gt 25 ]; then
    echo "ALERT: Backup is $AGE_HOURS hours old"
    exit 1
fi

echo "OK: Latest backup is $AGE_HOURS hours old"
```

**Storage Usage Check:**
```bash
#!/bin/bash
# check_storage_usage.sh

# Check S3 storage usage
USAGE=$(aws s3 ls s3://mortgagematch-backups/ --recursive --human-readable --summarize | grep "Total Size" | awk '{print $3}')

if [ "$USAGE" -gt 1000000000 ]; then  # 1GB
    echo "ALERT: Storage usage is high: $USAGE bytes"
    exit 1
fi

echo "OK: Storage usage is normal: $USAGE bytes"
```

## Backup Retention Policy

### Retention Schedule

| Backup Type | Retention Period | Cleanup Schedule |
|-------------|------------------|------------------|
| Daily Full | 30 days | Automated |
| Weekly Full | 12 weeks | Automated |
| Monthly Full | 12 months | Automated |
| Yearly Full | 7 years | Manual |
| Incremental | 7 days | Automated |
| Transaction Logs | 24 hours | Automated |

### Cleanup Procedures

**Automated Cleanup:**
```bash
#!/bin/bash
# cleanup_old_backups.sh

# Remove backups older than 30 days
find /backups -name "backup_*.sql" -mtime +30 -delete

# Remove incremental backups older than 7 days
find /backups/incremental -name "*" -mtime +7 -delete

# Remove transaction logs older than 24 hours
find /backups/transaction_logs -name "*" -mtime +1 -delete
```

**S3 Cleanup:**
```bash
#!/bin/bash
# cleanup_s3_backups.sh

# Remove old backups from S3
aws s3 rm s3://mortgagematch-backups/ --recursive \
  --exclude "*" \
  --include "backup_*" \
  --exclude "backup_$(date -d '30 days ago' +%Y%m%d)*"
```

## Testing and Validation

### Regular Testing Schedule

| Test Type | Frequency | Scope |
|-----------|-----------|-------|
| Backup Integrity | Daily | Latest backup |
| Restore Test | Weekly | Full restore |
| Disaster Recovery | Monthly | Complete DR |
| Cross-Region | Quarterly | Full replication |

### Test Procedures

**Weekly Restore Test:**
```bash
#!/bin/bash
# weekly_restore_test.sh

# Create test environment
TEST_ENV="test-$(date +%Y%m%d)"
supabase projects create $TEST_ENV

# Get latest backup
LATEST_BACKUP=$(ls -t backup_*.sql | head -1)

# Restore backup
supabase db reset --file "$LATEST_BACKUP" --project $TEST_ENV

# Run tests
npm run test:restore-verification

# Cleanup
supabase projects delete $TEST_ENV
```

**Monthly DR Test:**
```bash
#!/bin/bash
# monthly_dr_test.sh

# Test failover to secondary site
# 1. Simulate primary site failure
# 2. Activate secondary site
# 3. Restore from backup
# 4. Verify functionality
# 5. Test failback to primary
```

## Documentation and Training

### Documentation Updates

- Monthly review of procedures
- Quarterly update of runbooks
- Annual review of RTO/RPO objectives
- Continuous improvement based on incidents

### Team Training

- Monthly backup procedure training
- Quarterly disaster recovery drills
- Annual full-scale DR exercise
- New team member onboarding

### Knowledge Transfer

- Document all procedures
- Maintain runbook library
- Conduct regular training sessions
- Share lessons learned

---

**Last Updated**: December 19, 2024  
**Next Review**: January 19, 2025  
**Owner**: Engineering Team