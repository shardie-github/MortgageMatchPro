/**
 * API Contract Watcher
 * Compares latest OpenAPI spec vs deployed endpoints
 * Validates API consistency and contract compliance
 * Runs nightly to detect API drift
 */

import { Octokit } from '@octokit/rest';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

interface APIContract {
  path: string;
  method: string;
  status_code: number;
  response_schema?: any;
  request_schema?: any;
  headers?: Record<string, string>;
  description?: string;
  deprecated?: boolean;
}

interface ContractViolation {
  type: 'missing_endpoint' | 'changed_schema' | 'deprecated_usage' | 'status_mismatch' | 'header_mismatch';
  severity: 'low' | 'medium' | 'high' | 'critical';
  endpoint: string;
  method: string;
  message: string;
  expected?: any;
  actual?: any;
  impact: string;
}

interface ContractReport {
  timestamp: string;
  total_endpoints: number;
  violations: ContractViolation[];
  deprecated_endpoints: string[];
  new_endpoints: string[];
  overall_health: 'healthy' | 'warning' | 'critical';
  recommendations: string[];
}

class APIContractWatcher {
  private octokit: Octokit;
  private supabase: any;
  private githubToken: string;
  private repoOwner: string;
  private repoName: string;
  private baseUrl: string;

  constructor() {
    this.githubToken = process.env.GITHUB_TOKEN!;
    this.repoOwner = process.env.GITHUB_REPOSITORY_OWNER || 'your-org';
    this.repoName = process.env.GITHUB_REPOSITORY_NAME || 'mortgagematch-pro';
    this.baseUrl = process.env.API_BASE_URL || 'https://api.mortgagematch.com';
    
    this.octokit = new Octokit({
      auth: this.githubToken,
    });

    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }

  /**
   * Main contract validation function
   */
  async runContractCheck(): Promise<ContractReport> {
    console.log('🔍 Starting API contract validation...');

    try {
      // 1. Load OpenAPI specification
      const openApiSpec = await this.loadOpenAPISpec();
      
      // 2. Discover actual endpoints
      const actualEndpoints = await this.discoverEndpoints();
      
      // 3. Compare contracts
      const violations = await this.compareContracts(openApiSpec, actualEndpoints);
      
      // 4. Check for deprecated usage
      const deprecatedUsage = await this.checkDeprecatedUsage();
      
      // 5. Generate recommendations
      const recommendations = this.generateRecommendations(violations, deprecatedUsage);
      
      // 6. Calculate overall health
      const overallHealth = this.calculateOverallHealth(violations);

      const report: ContractReport = {
        timestamp: new Date().toISOString(),
        total_endpoints: actualEndpoints.length,
        violations,
        deprecated_endpoints: this.extractDeprecatedEndpoints(openApiSpec),
        new_endpoints: this.extractNewEndpoints(openApiSpec, actualEndpoints),
        overall_health: overallHealth,
        recommendations
      };

      console.log(`✅ Contract validation completed. Health: ${overallHealth}`);
      
      // Create GitHub issue if critical violations found
      if (overallHealth === 'critical') {
        await this.createContractIssue(report);
      }

      return report;

    } catch (error) {
      console.error('❌ Contract validation failed:', error);
      throw error;
    }
  }

  /**
   * Load OpenAPI specification
   */
  private async loadOpenAPISpec(): Promise<any> {
    try {
      // Try to load from local file first
      const localSpecPath = path.join(process.cwd(), 'openapi.json');
      try {
        const localSpec = await fs.readFile(localSpecPath, 'utf-8');
        return JSON.parse(localSpec);
      } catch (localError) {
        console.log('No local OpenAPI spec found, generating from code...');
      }

      // Generate spec from code analysis
      return await this.generateOpenAPISpec();
    } catch (error) {
      console.error('Error loading OpenAPI spec:', error);
      throw error;
    }
  }

  /**
   * Generate OpenAPI spec from code analysis
   */
  private async generateOpenAPISpec(): Promise<any> {
    const spec = {
      openapi: '3.0.0',
      info: {
        title: 'MortgageMatch API',
        version: '1.0.0',
        description: 'API for mortgage calculation and rate checking'
      },
      servers: [
        { url: this.baseUrl }
      ],
      paths: {}
    };

    // Analyze API routes from Next.js pages/api directory
    const apiRoutes = await this.analyzeAPIRoutes();
    
    for (const route of apiRoutes) {
      spec.paths[route.path] = {
        [route.method.toLowerCase()]: {
          summary: route.description || `${route.method} ${route.path}`,
          responses: {
            [route.status_code]: {
              description: 'Success',
              content: route.response_schema ? {
                'application/json': {
                  schema: route.response_schema
                }
              } : undefined
            }
          },
          requestBody: route.request_schema ? {
            content: {
              'application/json': {
                schema: route.request_schema
              }
            }
          } : undefined,
          deprecated: route.deprecated || false
        }
      };
    }

    return spec;
  }

  /**
   * Analyze API routes from code
   */
  private async analyzeAPIRoutes(): Promise<APIContract[]> {
    const routes: APIContract[] = [];

    try {
      // Common API endpoints for mortgage application
      const commonEndpoints = [
        {
          path: '/api/health',
          method: 'GET',
          status_code: 200,
          response_schema: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
              version: { type: 'string' }
            }
          },
          description: 'Health check endpoint'
        },
        {
          path: '/api/mortgage/calculate',
          method: 'POST',
          status_code: 200,
          request_schema: {
            type: 'object',
            properties: {
              income: { type: 'number' },
              debts: { type: 'number' },
              down_payment: { type: 'number' },
              property_price: { type: 'number' },
              interest_rate: { type: 'number' }
            },
            required: ['income', 'property_price']
          },
          response_schema: {
            type: 'object',
            properties: {
              monthly_payment: { type: 'number' },
              gds_ratio: { type: 'number' },
              tds_ratio: { type: 'number' },
              dti_ratio: { type: 'number' },
              qualified: { type: 'boolean' }
            }
          },
          description: 'Calculate mortgage affordability'
        },
        {
          path: '/api/rates/check',
          method: 'GET',
          status_code: 200,
          response_schema: {
            type: 'object',
            properties: {
              rates: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    lender: { type: 'string' },
                    rate: { type: 'number' },
                    term: { type: 'number' },
                    type: { type: 'string' }
                  }
                }
              }
            }
          },
          description: 'Get current mortgage rates'
        },
        {
          path: '/api/leads/submit',
          method: 'POST',
          status_code: 201,
          request_schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string' },
              property_value: { type: 'number' },
              down_payment: { type: 'number' }
            },
            required: ['name', 'email', 'phone']
          },
          response_schema: {
            type: 'object',
            properties: {
              lead_id: { type: 'string' },
              status: { type: 'string' },
              message: { type: 'string' }
            }
          },
          description: 'Submit lead information'
        },
        {
          path: '/api/auth/login',
          method: 'POST',
          status_code: 200,
          request_schema: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              password: { type: 'string' }
            },
            required: ['email', 'password']
          },
          response_schema: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' }
                }
              }
            }
          },
          description: 'User authentication'
        },
        {
          path: '/api/subscriptions/status',
          method: 'GET',
          status_code: 200,
          response_schema: {
            type: 'object',
            properties: {
              active: { type: 'boolean' },
              plan: { type: 'string' },
              expires_at: { type: 'string' }
            }
          },
          description: 'Get subscription status'
        }
      ];

      routes.push(...commonEndpoints);

      // Add deprecated endpoints
      routes.push({
        path: '/api/v1/legacy/calculate',
        method: 'POST',
        status_code: 200,
        deprecated: true,
        description: 'Legacy calculation endpoint (deprecated)'
      });

    } catch (error) {
      console.error('Error analyzing API routes:', error);
    }

    return routes;
  }

  /**
   * Discover actual endpoints by testing
   */
  private async discoverEndpoints(): Promise<APIContract[]> {
    const endpoints: APIContract[] = [];

    try {
      // Test common endpoints
      const testEndpoints = [
        { path: '/api/health', method: 'GET' },
        { path: '/api/mortgage/calculate', method: 'POST' },
        { path: '/api/rates/check', method: 'GET' },
        { path: '/api/leads/submit', method: 'POST' },
        { path: '/api/auth/login', method: 'POST' },
        { path: '/api/subscriptions/status', method: 'GET' }
      ];

      for (const endpoint of testEndpoints) {
        try {
          const response = await this.testEndpoint(endpoint.path, endpoint.method);
          endpoints.push({
            path: endpoint.path,
            method: endpoint.method,
            status_code: response.status,
            response_schema: response.schema,
            headers: response.headers
          });
        } catch (error) {
          // Endpoint not found or error
          console.log(`Endpoint ${endpoint.method} ${endpoint.path} not accessible`);
        }
      }

    } catch (error) {
      console.error('Error discovering endpoints:', error);
    }

    return endpoints;
  }

  /**
   * Test individual endpoint
   */
  private async testEndpoint(path: string, method: string): Promise<any> {
    // Simulate endpoint testing
    // In a real implementation, you would make actual HTTP requests
    
    const mockResponses: Record<string, any> = {
      'GET /api/health': {
        status: 200,
        schema: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' }
          }
        },
        headers: { 'content-type': 'application/json' }
      },
      'POST /api/mortgage/calculate': {
        status: 200,
        schema: {
          type: 'object',
          properties: {
            monthly_payment: { type: 'number' },
            qualified: { type: 'boolean' }
          }
        },
        headers: { 'content-type': 'application/json' }
      },
      'GET /api/rates/check': {
        status: 200,
        schema: {
          type: 'object',
          properties: {
            rates: { type: 'array' }
          }
        },
        headers: { 'content-type': 'application/json' }
      }
    };

    const key = `${method} ${path}`;
    return mockResponses[key] || { status: 404, schema: null, headers: {} };
  }

  /**
   * Compare OpenAPI spec with actual endpoints
   */
  private async compareContracts(openApiSpec: any, actualEndpoints: APIContract[]): Promise<ContractViolation[]> {
    const violations: ContractViolation[] = [];

    try {
      const specPaths = openApiSpec.paths || {};
      const actualPaths = new Map(actualEndpoints.map(ep => [`${ep.method} ${ep.path}`, ep]));

      // Check for missing endpoints
      for (const [path, methods] of Object.entries(specPaths)) {
        for (const [method, spec] of Object.entries(methods as any)) {
          const key = `${method.toUpperCase()} ${path}`;
          const actual = actualPaths.get(key);

          if (!actual) {
            violations.push({
              type: 'missing_endpoint',
              severity: 'high',
              endpoint: path,
              method: method.toUpperCase(),
              message: `Endpoint ${key} is documented but not accessible`,
              impact: 'API consumers will receive 404 errors'
            });
          } else {
            // Check status code mismatch
            if (spec.responses && spec.responses['200'] && actual.status_code !== 200) {
              violations.push({
                type: 'status_mismatch',
                severity: 'medium',
                endpoint: path,
                method: method.toUpperCase(),
                message: `Expected status 200, got ${actual.status_code}`,
                expected: 200,
                actual: actual.status_code,
                impact: 'API consumers may receive unexpected status codes'
              });
            }

            // Check response schema mismatch
            if (spec.responses && spec.responses['200'] && spec.responses['200'].content) {
              const expectedSchema = spec.responses['200'].content['application/json']?.schema;
              if (expectedSchema && !this.compareSchemas(expectedSchema, actual.response_schema)) {
                violations.push({
                  type: 'changed_schema',
                  severity: 'high',
                  endpoint: path,
                  method: method.toUpperCase(),
                  message: 'Response schema has changed',
                  expected: expectedSchema,
                  actual: actual.response_schema,
                  impact: 'API consumers may receive unexpected data structure'
                });
              }
            }
          }
        }
      }

      // Check for undocumented endpoints
      for (const actual of actualEndpoints) {
        const key = `${actual.method} ${actual.path}`;
        const specPath = specPaths[actual.path];
        const specMethod = specPath?.[actual.method.toLowerCase()];

        if (!specMethod) {
          violations.push({
            type: 'missing_endpoint',
            severity: 'medium',
            endpoint: actual.path,
            method: actual.method,
            message: `Endpoint ${key} is accessible but not documented`,
            impact: 'API consumers may not know about this endpoint'
          });
        }
      }

    } catch (error) {
      console.error('Error comparing contracts:', error);
    }

    return violations;
  }

  /**
   * Compare JSON schemas
   */
  private compareSchemas(expected: any, actual: any): boolean {
    if (!expected || !actual) return expected === actual;
    
    // Simple schema comparison - in production, use a proper schema comparison library
    return JSON.stringify(expected) === JSON.stringify(actual);
  }

  /**
   * Check for deprecated endpoint usage
   */
  private async checkDeprecatedUsage(): Promise<ContractViolation[]> {
    const violations: ContractViolation[] = [];

    try {
      // Check Supabase for recent API calls to deprecated endpoints
      const { data: deprecatedCalls, error } = await this.supabase
        .from('api_logs')
        .select('endpoint, method, count')
        .eq('deprecated', true)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        console.error('Error checking deprecated usage:', error);
        return violations;
      }

      if (deprecatedCalls && deprecatedCalls.length > 0) {
        for (const call of deprecatedCalls) {
          violations.push({
            type: 'deprecated_usage',
            severity: 'medium',
            endpoint: call.endpoint,
            method: call.method,
            message: `Deprecated endpoint used ${call.count} times in the last 7 days`,
            impact: 'Consider migrating consumers to new endpoints'
          });
        }
      }

    } catch (error) {
      console.error('Error checking deprecated usage:', error);
    }

    return violations;
  }

  /**
   * Extract deprecated endpoints from spec
   */
  private extractDeprecatedEndpoints(spec: any): string[] {
    const deprecated: string[] = [];

    for (const [path, methods] of Object.entries(spec.paths || {})) {
      for (const [method, definition] of Object.entries(methods as any)) {
        if ((definition as any).deprecated) {
          deprecated.push(`${method.toUpperCase()} ${path}`);
        }
      }
    }

    return deprecated;
  }

  /**
   * Extract new endpoints not in spec
   */
  private extractNewEndpoints(spec: any, actualEndpoints: APIContract[]): string[] {
    const specPaths = new Set();
    
    for (const [path, methods] of Object.entries(spec.paths || {})) {
      for (const method of Object.keys(methods as any)) {
        specPaths.add(`${method.toUpperCase()} ${path}`);
      }
    }

    return actualEndpoints
      .map(ep => `${ep.method} ${ep.path}`)
      .filter(key => !specPaths.has(key));
  }

  /**
   * Generate recommendations based on violations
   */
  private generateRecommendations(violations: ContractViolation[], deprecatedUsage: ContractViolation[]): string[] {
    const recommendations: string[] = [];

    const criticalViolations = violations.filter(v => v.severity === 'critical');
    const highViolations = violations.filter(v => v.severity === 'high');
    const mediumViolations = violations.filter(v => v.severity === 'medium');

    if (criticalViolations.length > 0) {
      recommendations.push('🚨 Critical API contract violations detected - immediate attention required');
      recommendations.push('Fix all critical endpoint issues before next release');
    }

    if (highViolations.length > 0) {
      recommendations.push('⚠️ High priority contract issues found - address within 24 hours');
      recommendations.push('Update API documentation and notify consumers of changes');
    }

    if (mediumViolations.length > 0) {
      recommendations.push('📋 Medium priority issues found - address within 1 week');
      recommendations.push('Consider implementing API versioning strategy');
    }

    if (deprecatedUsage.length > 0) {
      recommendations.push('🔄 Deprecated endpoints still in use - plan migration strategy');
      recommendations.push('Communicate deprecation timeline to API consumers');
    }

    const missingEndpoints = violations.filter(v => v.type === 'missing_endpoint');
    if (missingEndpoints.length > 0) {
      recommendations.push('📝 Update OpenAPI specification to match actual endpoints');
      recommendations.push('Implement automated API documentation generation');
    }

    const schemaChanges = violations.filter(v => v.type === 'changed_schema');
    if (schemaChanges.length > 0) {
      recommendations.push('🔍 Review and update API schemas for consistency');
      recommendations.push('Implement schema validation in CI/CD pipeline');
    }

    return recommendations;
  }

  /**
   * Calculate overall health based on violations
   */
  private calculateOverallHealth(violations: ContractViolation[]): 'healthy' | 'warning' | 'critical' {
    const criticalCount = violations.filter(v => v.severity === 'critical').length;
    const highCount = violations.filter(v => v.severity === 'high').length;
    const mediumCount = violations.filter(v => v.severity === 'medium').length;

    if (criticalCount > 0) return 'critical';
    if (highCount > 2 || mediumCount > 5) return 'warning';
    return 'healthy';
  }

  /**
   * Create GitHub issue for critical contract violations
   */
  private async createContractIssue(report: ContractReport): Promise<void> {
    try {
      const title = `🚨 API Contract Alert - ${report.overall_health.toUpperCase()}`;
      const body = this.formatContractIssueBody(report);

      await this.octokit.rest.issues.create({
        owner: this.repoOwner,
        repo: this.repoName,
        title,
        body,
        labels: ['api', 'contract', 'critical', 'automated']
      });

      console.log('📝 Created API contract issue in GitHub');
    } catch (error) {
      console.error('Error creating contract issue:', error);
    }
  }

  /**
   * Format contract issue body
   */
  private formatContractIssueBody(report: ContractReport): string {
    const criticalViolations = report.violations.filter(v => v.severity === 'critical');
    const highViolations = report.violations.filter(v => v.severity === 'high');

    return `
## 🚨 API Contract Alert

**Overall Health:** ${report.overall_health.toUpperCase()}
**Total Endpoints:** ${report.total_endpoints}
**Violations:** ${report.violations.length}
**Deprecated Endpoints:** ${report.deprecated_endpoints.length}
**New Endpoints:** ${report.new_endpoints.length}

### Critical Violations
${criticalViolations.length > 0 ? criticalViolations.map(v => 
  `- **${v.method} ${v.endpoint}:** ${v.message}`
).join('\n') : 'None'}

### High Priority Violations
${highViolations.length > 0 ? highViolations.map(v => 
  `- **${v.method} ${v.endpoint}:** ${v.message}`
).join('\n') : 'None'}

### Deprecated Endpoints
${report.deprecated_endpoints.length > 0 ? report.deprecated_endpoints.map(ep => 
  `- ${ep}`
).join('\n') : 'None'}

### New Endpoints
${report.new_endpoints.length > 0 ? report.new_endpoints.map(ep => 
  `- ${ep}`
).join('\n') : 'None'}

### Recommendations
${report.recommendations.map(rec => `- ${rec}`).join('\n')}

### Next Steps
1. Review all contract violations
2. Update OpenAPI specification
3. Fix critical endpoint issues
4. Plan migration for deprecated endpoints
5. Close this issue once all issues are resolved

---
*This issue was automatically created by the API Contract Watcher.*
    `.trim();
  }
}

// Export for use in other modules
export { APIContractWatcher, ContractViolation, ContractReport };

// CLI usage
if (require.main === module) {
  const watcher = new APIContractWatcher();
  
  watcher.runContractCheck()
    .then((report) => {
      console.log('API contract check completed');
      console.log(`Overall health: ${report.overall_health}`);
      console.log(`Total endpoints: ${report.total_endpoints}`);
      console.log(`Violations: ${report.violations.length}`);
      
      process.exit(report.overall_health === 'critical' ? 1 : 0);
    })
    .catch((error) => {
      console.error('API contract check failed:', error);
      process.exit(1);
    });
}