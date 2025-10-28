# Release Management

## Overview
This document describes the release process, promotion flow, and rollback procedures for the MortgageMatch Pro application.

## Release Strategy

### Trunk-Based Development
- All development happens on feature branches
- Main branch is always deployable
- Feature flags control feature rollouts
- Continuous integration ensures code quality

### Release Types
- **Patch**: Bug fixes and minor improvements
- **Minor**: New features and enhancements
- **Major**: Breaking changes and major features

## Promotion Flow

### 1. Development → Preview
- Automatic deployment on PR creation
- All PRs get preview environments
- Automated testing and validation
- Feature flag controlled rollouts

### 2. Preview → Production
- Manual promotion via GitHub Actions
- Requires all checks to pass
- SLO validation required
- Migration gates enforced

### 3. Production Rollout
- Blue/green deployment strategy
- Gradual traffic shifting
- Real-time monitoring
- Automatic rollback on failure

## Release Process

### Pre-Release
1. **Code Review**: All changes reviewed by at least 2 reviewers
2. **Testing**: Automated tests must pass
3. **Security Scan**: Vulnerability scan required
4. **Performance Check**: Bundle size and performance validated
5. **Migration Check**: Database migrations validated

### Release Creation
1. **Version Bump**: Automated semantic versioning
2. **Changelog**: Generated from conventional commits
3. **Artifacts**: Build artifacts and reports generated
4. **Git Tag**: Release tagged in repository
5. **GitHub Release**: Release notes and artifacts published

### Post-Release
1. **Health Checks**: Automated health validation
2. **SLO Monitoring**: Service level objectives monitored
3. **Rollback Ready**: Previous version ready for rollback
4. **Documentation**: Release notes updated

## Rollback Procedures

### Automatic Rollback
- Triggered by health check failures
- SLO violations beyond threshold
- Critical error rate spikes
- Database connection failures

### Manual Rollback
1. **Identify Issue**: Determine rollback necessity
2. **Select Version**: Choose stable previous version
3. **Execute Rollback**: Use Vercel dashboard or CLI
4. **Validate**: Confirm system stability
5. **Document**: Record rollback reason and outcome

### Rollback Time Target
- **Target**: ≤ 5 minutes from decision to completion
- **Maximum**: ≤ 10 minutes for complex rollbacks
- **Validation**: Health checks must pass within 2 minutes

## Feature Flags

### Flag Management
- Server-resolved flags stored in Supabase
- Client gets read-only snapshot
- RLS policies control access
- Audit trail for all changes

### Kill Switches
- **Maintenance Mode**: Graceful service degradation
- **Feature Toggles**: Individual feature control
- **Circuit Breakers**: Automatic failure protection
- **Rate Limiting**: Traffic control mechanisms

## Migration Management

### EMC Pattern
1. **Expand**: Add new columns/tables (nullable)
2. **Migrate**: Backfill data in batches
3. **Contract**: Remove old columns after verification

### Migration Gates
- Drift check before deployment
- Prisma migrate deploy
- Backfill execution (gated by label)
- Verification queries

### Safe Migration Practices
- Idempotent scripts
- Chunked processing
- Retry with backoff
- Progress logging
- Rollback procedures

## Monitoring and Alerting

### Release Monitoring
- Deployment success/failure alerts
- Health check status
- Performance metrics
- Error rate monitoring

### SLO Monitoring
- API success rate (≥ 99.9%)
- p95 latency (≤ 300ms production)
- Database error rate (< 0.1%)
- Error budget tracking

### Alert Channels
- **Critical**: PagerDuty + Slack
- **Warning**: Slack notifications
- **Info**: Email summaries

## Release Artifacts

### Build Artifacts
- Environment matrix
- Schema hash
- Build SHA
- Bundle analysis report

### Documentation
- Release notes
- Migration guide
- Breaking changes
- Known issues

### Audit Trail
- Build SHA ↔ Schema hash
- Release tag ↔ PR link
- Deployment logs
- Rollback history

## Emergency Procedures

### Incident Response
1. **Assess**: Determine severity and impact
2. **Communicate**: Notify stakeholders
3. **Contain**: Isolate affected systems
4. **Resolve**: Fix or rollback
5. **Recover**: Restore normal operations
6. **Review**: Post-incident analysis

### Communication Plan
- **Internal**: Slack #incidents channel
- **External**: Status page updates
- **Stakeholders**: Email notifications
- **Customers**: In-app notifications

## Release Calendar

### Regular Releases
- **Patch**: Weekly (Tuesdays)
- **Minor**: Bi-weekly (Fridays)
- **Major**: Monthly (First Friday)

### Maintenance Windows
- **Scheduled**: Second Sunday of each month
- **Duration**: 2 hours maximum
- **Notification**: 48 hours advance notice

## Quality Gates

### Pre-Deployment
- [ ] All tests passing
- [ ] Security scan clean
- [ ] Performance within limits
- [ ] Migration validated
- [ ] SLOs in budget

### Post-Deployment
- [ ] Health checks passing
- [ ] SLOs within limits
- [ ] No critical errors
- [ ] Performance stable
- [ ] Monitoring active

## Release Metrics

### Success Metrics
- Deployment success rate: ≥ 99%
- Rollback rate: ≤ 5%
- Mean time to recovery: ≤ 30 minutes
- Zero-downtime deployments: 100%

### Quality Metrics
- Bug escape rate: ≤ 2%
- Performance regression: ≤ 5%
- Security incidents: 0
- Customer impact: Minimal
