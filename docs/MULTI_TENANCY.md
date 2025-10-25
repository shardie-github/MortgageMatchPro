# Multi-Tenancy Documentation

## Overview

MortgageMatchPro v1.3.0 introduces comprehensive multi-tenancy support, allowing organizations to have isolated data, custom branding, and role-based access control.

## Architecture

### Core Concepts

- **Organizations**: Top-level tenants that own data and resources
- **Memberships**: User-organization relationships with specific roles
- **Roles**: OWNER, ADMIN, ANALYST, VIEWER with different permission levels
- **Tenant Context**: Organization-scoped data access and operations
- **Row-Level Security**: Database-level data isolation

### Data Isolation

All data is isolated by `organization_id` at the database level using Supabase Row-Level Security (RLS) policies.

#### RLS Policies

```sql
-- Example RLS policy for mortgage_calculations
CREATE POLICY "Users can only access their organization's calculations" ON mortgage_calculations
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid()
    )
  );
```

#### Tenant Scoping

All database queries must include organization context:

```typescript
// ✅ Correct - includes organization context
const { data } = await supabase
  .from('mortgage_calculations')
  .select('*')
  .eq('organization_id', organizationId)

// ❌ Incorrect - missing organization context
const { data } = await supabase
  .from('mortgage_calculations')
  .select('*')
```

### Permission System

#### Role Hierarchy

1. **OWNER**: Full access to all resources
2. **ADMIN**: Manage users, branding, API keys, webhooks
3. **ANALYST**: Create and view scenarios, matches, reports
4. **VIEWER**: Read-only access to scenarios and matches

#### Permission Checking

```typescript
import { PermissionChecker } from '@/lib/tenancy/rbac'

// Check if user can perform action
const canManage = PermissionChecker.can(
  userRole, 
  'create', 
  'manage_users', 
  organizationId
)

// Guard function for API routes
requirePermission(userRole, 'read', 'scenarios', organizationId)
```

### Organization Management

#### Creating Organizations

```typescript
import { OrganizationService } from '@/lib/tenancy/organization-service'

const organization = await OrganizationService.createOrganization({
  name: 'Acme Mortgage',
  slug: 'acme-mortgage',
  plan: 'PRO',
  ownerId: userId
})
```

#### Inviting Users

```typescript
await OrganizationService.inviteUser(
  organizationId,
  'user@example.com',
  'ANALYST',
  inviterId,
  inviterRole
)
```

#### Updating Branding

```typescript
const branding: OrganizationBranding = {
  logoUrl: 'https://example.com/logo.png',
  primaryColor: '#3B82F6',
  secondaryColor: '#1E40AF',
  fontFamily: 'Inter',
  customDomain: 'app.acme-mortgage.com'
}

await OrganizationService.updateBranding(
  organizationId,
  branding,
  userId,
  userRole
)
```

### API Key Management

#### Creating API Keys

```typescript
import { ApiKeyService } from '@/lib/tenancy/api-key-service'

const apiKey = await ApiKeyService.createApiKey(
  organizationId,
  'Production API Key',
  ['scenarios:read', 'matches:read'],
  userId,
  userRole
)
```

#### Validating API Keys

```typescript
const keyInfo = await ApiKeyService.validateApiKey(apiKey)
if (keyInfo && keyInfo.organizationId === organizationId) {
  // Key is valid for this organization
}
```

### Billing and Metering

#### Usage Tracking

```typescript
import { MeteringService } from '@/lib/billing/metering-service'

// Record API call
await MeteringService.recordApiCall(
  organizationId,
  '/v1/scenarios',
  true,
  0.01
)

// Record AI usage
await MeteringService.recordAIUsage(
  organizationId,
  'gpt-4',
  1000,
  0.03
)
```

#### Quota Enforcement

```typescript
import { TenantScoping } from '@/lib/tenancy/scoping'

const limits = await TenantScoping.getOrganizationLimits(organizationId)
const canProceed = await TenantScoping.checkLimit(
  organizationId,
  'apiCallsPerDay',
  1
)
```

### White-Label Theming

#### Theme Application

```typescript
import { ThemeService } from '@/lib/white-label/theme-service'

const cssVariables = ThemeService.generateCSSVariables(branding)
// Apply to document root
Object.entries(cssVariables).forEach(([key, value]) => {
  document.documentElement.style.setProperty(key, value)
})
```

#### Custom Domains

Organizations can use custom domains by:
1. Setting `customDomain` in branding settings
2. Configuring DNS to point to the application
3. Updating routing configuration

### Security Considerations

#### Data Isolation

- All queries must include `organization_id` filter
- RLS policies prevent cross-tenant data access
- API keys are scoped to specific organizations
- Webhook endpoints are organization-specific

#### Access Control

- Role-based permissions enforced at API level
- Tenant context required for all operations
- API key validation includes organization check
- Webhook signatures prevent tampering

#### Audit Logging

All operations are logged with:
- Actor (user ID)
- Organization ID
- Action performed
- Resource affected
- Result (success/failure)
- Timestamp
- IP address
- User agent

### Testing Tenant Isolation

#### Unit Tests

```typescript
describe('Tenant Isolation', () => {
  it('should not allow cross-tenant data access', async () => {
    const org1Data = await getScenarios('org1')
    const org2Data = await getScenarios('org2')
    
    expect(org1Data).not.toContain(org2Data[0])
    expect(org2Data).not.toContain(org1Data[0])
  })
})
```

#### Integration Tests

```typescript
describe('API Key Scoping', () => {
  it('should only allow access to own organization', async () => {
    const response = await request(app)
      .get('/v1/scenarios')
      .set('X-API-Key', org1ApiKey)
      .set('X-Organization-ID', 'org2')
    
    expect(response.status).toBe(403)
  })
})
```

### Migration Guide

#### From v1.2.0 to v1.3.0

1. **Database Migration**: Run the multi-tenant schema migration
2. **Data Migration**: Assign existing users to default organization
3. **Code Updates**: Add organization context to all queries
4. **Permission Updates**: Implement role-based access control
5. **API Updates**: Add organization ID to all API calls

#### Breaking Changes

- All API calls now require organization context
- User authentication returns organization information
- Database queries must include organization filters
- API keys are now organization-scoped

### Best Practices

#### Development

1. Always include organization context in queries
2. Use permission checks before operations
3. Validate API keys and organization access
4. Log all operations for audit purposes
5. Test tenant isolation thoroughly

#### Production

1. Monitor cross-tenant access attempts
2. Regularly audit API key usage
3. Review organization limits and quotas
4. Monitor webhook delivery success rates
5. Keep audit logs for compliance

### Troubleshooting

#### Common Issues

1. **Missing Organization Context**: Ensure all queries include `organization_id`
2. **Permission Denied**: Check user role and required permissions
3. **API Key Invalid**: Verify key belongs to correct organization
4. **Webhook Failures**: Check endpoint URL and signature validation
5. **Quota Exceeded**: Review usage and consider plan upgrade

#### Debug Tools

- Tenant context debugger
- Permission checker utility
- API key validator
- Webhook delivery monitor
- Usage analytics dashboard