# Incident Response Runbooks

This document provides step-by-step procedures for common incidents and operational tasks.

## Table of Contents

- [Incident Triage](#incident-triage)
- [Rolling Back a Bad Migration](#rolling-back-a-bad-migration)
- [Rotating Keys](#rotating-keys)
- [Restoring from Backup/PITR](#restoring-from-backuppitr)
- [Database Issues](#database-issues)
- [Performance Issues](#performance-issues)
- [Security Incidents](#security-incidents)

## Incident Triage

### 1. Initial Assessment

**Time: 0-5 minutes**

1. **Check System Status**:
   ```bash
   # Check health endpoints
   curl https://your-app.vercel.app/api/health
   curl https://your-app.vercel.app/api/selftest
   ```

2. **Check Logs**:
   - Vercel Dashboard → Functions → Logs
   - Supabase Dashboard → Logs
   - Sentry (if configured)

3. **Identify Severity**:
   - **P0 (Critical)**: Complete service outage, data loss
   - **P1 (High)**: Major feature broken, performance degradation
   - **P2 (Medium)**: Minor feature issues, non-critical bugs
   - **P3 (Low)**: Cosmetic issues, enhancement requests

### 2. Immediate Response

**Time: 5-15 minutes**

1. **P0/P1 Incidents**:
   - [ ] Create incident channel in Slack
   - [ ] Assign incident commander
   - [ ] Start incident timer
   - [ ] Notify stakeholders

2. **P2/P3 Incidents**:
   - [ ] Create GitHub issue
   - [ ] Assign to appropriate team member
   - [ ] Add to next sprint planning

### 3. Investigation

**Time: 15-60 minutes**

1. **Gather Information**:
   ```bash
   # Check recent deployments
   vercel deployments list
   
   # Check database status
   node scripts/db-slowquery-check.mjs
   
   # Check bundle sizes
   npm run bundle:check
   ```

2. **Identify Root Cause**:
   - Check recent changes
   - Analyze error patterns
   - Review performance metrics
   - Check external dependencies

### 4. Resolution

**Time: 30-120 minutes**

1. **Implement Fix**:
   - Code fix (if needed)
   - Configuration change
   - Database migration
   - Infrastructure change

2. **Verify Fix**:
   ```bash
   # Run health checks
   node scripts/healthcheck.js https://your-app.vercel.app
   
   # Run smoke tests
   npx ts-node scripts/rls-smoke.ts
   ```

3. **Monitor**:
   - Watch error rates
   - Monitor performance metrics
   - Check user feedback

### 5. Post-Incident

**Time: 1-2 hours**

1. **Document Incident**:
   - Root cause analysis
   - Timeline of events
   - Actions taken
   - Lessons learned

2. **Follow-up Actions**:
   - Create tickets for improvements
   - Update runbooks
   - Schedule post-mortem meeting

## Rolling Back a Bad Migration

### 1. Identify the Problem

```bash
# Check migration status
npx prisma migrate status

# Check recent migrations
ls -la prisma/migrations/
```

### 2. Stop the Application

```bash
# If using Vercel, disable auto-deployments
# In Vercel Dashboard → Settings → Git

# Or rollback to previous deployment
vercel rollback [deployment-url]
```

### 3. Rollback Database

```bash
# Option 1: Rollback to previous migration
npx prisma migrate resolve --rolled-back [migration-name]

# Option 2: Reset to last known good state
npx prisma migrate reset --force

# Option 3: Manual rollback (if needed)
# Connect to database and run rollback SQL
```

### 4. Verify Rollback

```bash
# Check database schema
npx prisma db pull

# Run tests
npm test

# Check application health
node scripts/healthcheck.js http://localhost:3000
```

### 5. Redeploy

```bash
# Deploy previous working version
vercel --prod

# Or re-enable auto-deployments
# In Vercel Dashboard → Settings → Git
```

## Rotating Keys

### 1. Identify Keys to Rotate

- Supabase Service Key
- Supabase Anon Key
- OpenAI API Key
- Stripe Keys
- Twilio Keys
- Other API Keys

### 2. Generate New Keys

**Supabase**:
1. Go to Supabase Dashboard → Settings → API
2. Generate new service role key
3. Generate new anon key

**OpenAI**:
1. Go to OpenAI Dashboard → API Keys
2. Create new API key
3. Delete old key (after verification)

**Stripe**:
1. Go to Stripe Dashboard → Developers → API Keys
2. Create new secret key
3. Update webhook endpoints

### 3. Update Environment Variables

**Local Development**:
```bash
# Update .env.local
SUPABASE_SERVICE_KEY=new_service_key
SUPABASE_ANON_KEY=new_anon_key
OPENAI_API_KEY=new_openai_key
```

**Vercel**:
```bash
# Update Vercel environment variables
vercel env add SUPABASE_SERVICE_KEY
vercel env add SUPABASE_ANON_KEY
vercel env add OPENAI_API_KEY
```

**GitHub Secrets**:
1. Go to GitHub → Settings → Secrets and Variables → Actions
2. Update repository secrets
3. Update organization secrets (if applicable)

### 4. Verify New Keys

```bash
# Test Supabase connection
node scripts/db-slowquery-check.mjs

# Test OpenAI connection
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models

# Test Stripe connection
stripe balance retrieve
```

### 5. Clean Up Old Keys

1. Delete old keys from respective dashboards
2. Update documentation
3. Notify team members
4. Update any external integrations

## Restoring from Backup/PITR

### 1. Identify the Issue

- Data corruption
- Accidental deletion
- Malicious activity
- System failure

### 2. Choose Recovery Method

**Point-in-Time Recovery (PITR)**:
- Supabase: Use PITR feature in dashboard
- PostgreSQL: Use WAL files and base backups

**Full Backup Restore**:
- Restore from latest backup
- Replay transaction logs

### 3. Execute Recovery

**Supabase PITR**:
1. Go to Supabase Dashboard → Database → Backups
2. Select point-in-time
3. Confirm recovery
4. Wait for completion

**Manual PostgreSQL**:
```bash
# Stop application
# Restore from backup
pg_restore -d database_name backup_file.sql

# Or restore specific tables
pg_restore -t table_name -d database_name backup_file.sql
```

### 4. Verify Recovery

```bash
# Check data integrity
npx prisma db pull

# Run data validation
node scripts/validate-data.js

# Check application functionality
npm test
```

### 5. Post-Recovery

1. **Monitor System**:
   - Check error rates
   - Monitor performance
   - Verify data consistency

2. **Update Backups**:
   - Ensure backups are current
   - Test backup restoration
   - Update backup procedures

3. **Document Incident**:
   - Root cause analysis
   - Recovery timeline
   - Lessons learned

## Database Issues

### 1. Connection Issues

**Symptoms**: Connection timeouts, connection pool exhaustion

**Resolution**:
```bash
# Check connection pool status
node scripts/db-slowquery-check.mjs

# Restart database connection
# In Supabase Dashboard → Database → Settings → Restart
```

### 2. Query Performance Issues

**Symptoms**: Slow queries, timeouts

**Resolution**:
```bash
# Identify slow queries
node scripts/db-slowquery-check.mjs

# Check for missing indexes
# Add appropriate indexes
# Optimize query patterns
```

### 3. Data Corruption

**Symptoms**: Inconsistent data, constraint violations

**Resolution**:
1. Stop application
2. Run data validation
3. Restore from backup if needed
4. Fix data inconsistencies
5. Restart application

## Performance Issues

### 1. High Response Times

**Symptoms**: Slow API responses, timeouts

**Resolution**:
```bash
# Check bundle sizes
npm run bundle:check

# Run performance tests
k6 run scripts/load-test.js

# Check database performance
node scripts/db-slowquery-check.mjs
```

### 2. High Memory Usage

**Symptoms**: Memory leaks, OOM errors

**Resolution**:
1. Profile memory usage
2. Identify memory leaks
3. Optimize code
4. Increase memory limits if needed

### 3. High CPU Usage

**Symptoms**: Slow processing, timeouts

**Resolution**:
1. Profile CPU usage
2. Optimize algorithms
3. Add caching
4. Scale horizontally if needed

## Security Incidents

### 1. Suspected Data Breach

**Immediate Actions**:
1. [ ] Isolate affected systems
2. [ ] Change all passwords and keys
3. [ ] Notify security team
4. [ ] Document everything

**Investigation**:
1. Check access logs
2. Identify compromised data
3. Determine attack vector
4. Assess impact

**Recovery**:
1. Patch vulnerabilities
2. Restore from clean backup
3. Update security measures
4. Monitor for reoccurrence

### 2. API Key Compromise

**Immediate Actions**:
1. [ ] Rotate compromised keys
2. [ ] Check for unauthorized usage
3. [ ] Update all integrations
4. [ ] Monitor for suspicious activity

**Investigation**:
1. Check API usage logs
2. Identify unauthorized access
3. Determine scope of compromise
4. Assess data exposure

**Recovery**:
1. Generate new keys
2. Update all systems
3. Implement additional monitoring
4. Review access controls

## Emergency Contacts

- **On-call Engineer**: [Contact Info]
- **Security Team**: [Contact Info]
- **Database Team**: [Contact Info]
- **Infrastructure Team**: [Contact Info]

## Escalation Procedures

1. **Level 1**: On-call engineer (0-30 minutes)
2. **Level 2**: Team lead (30-60 minutes)
3. **Level 3**: Engineering manager (60+ minutes)
4. **Level 4**: CTO/VP Engineering (Critical issues only)

## Post-Incident Review Process

1. **Schedule Review**: Within 48 hours of incident resolution
2. **Attendees**: All involved parties
3. **Agenda**:
   - Timeline of events
   - Root cause analysis
   - What went well
   - What could be improved
   - Action items
4. **Follow-up**: Track action items to completion