#!/usr/bin/env node

/**
 * AI-Powered API Reference Generator
 * Uses GPT + OpenAPI introspection to generate comprehensive API documentation
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class APIReferenceGenerator {
  constructor() {
    this.apiEndpoints = [];
    this.dataModels = [];
    this.authSchemes = [];
    this.errorCodes = [];
  }

  /**
   * Main function to generate API reference
   */
  async generateAPIReference() {
    console.log('📚 Generating AI-powered API reference...');

    try {
      // 1. Discover API endpoints
      await this.discoverEndpoints();
      
      // 2. Analyze data models
      await this.analyzeDataModels();
      
      // 3. Extract authentication schemes
      await this.extractAuthSchemes();
      
      // 4. Identify error codes
      await this.identifyErrorCodes();
      
      // 5. Generate OpenAPI spec
      const openApiSpec = await this.generateOpenAPISpec();
      
      // 6. Generate documentation
      const documentation = await this.generateDocumentation(openApiSpec);
      
      // 7. Save files
      await this.saveDocumentation(documentation, openApiSpec);
      
      console.log('✅ API reference generated successfully');
      return documentation;

    } catch (error) {
      console.error('❌ Error generating API reference:', error);
      throw error;
    }
  }

  /**
   * Discover API endpoints from code
   */
  async discoverEndpoints() {
    console.log('🔍 Discovering API endpoints...');

    try {
      // Find API route files
      const apiFiles = await glob('pages/api/**/*.ts');
      const appApiFiles = await glob('app/api/**/*.ts');
      const allApiFiles = [...apiFiles, ...appApiFiles];

      for (const file of allApiFiles) {
        const content = await fs.readFile(file, 'utf8');
        const endpoints = this.extractEndpointsFromFile(file, content);
        this.apiEndpoints.push(...endpoints);
      }

      // Add Supabase Edge Functions
      const edgeFunctions = await glob('supabase/functions/**/*.ts');
      for (const file of edgeFunctions) {
        const content = await fs.readFile(file, 'utf8');
        const endpoints = this.extractEdgeFunctionEndpoints(file, content);
        this.apiEndpoints.push(...endpoints);
      }

      console.log(`📡 Discovered ${this.apiEndpoints.length} API endpoints`);

    } catch (error) {
      console.error('Error discovering endpoints:', error);
    }
  }

  /**
   * Extract endpoints from API file
   */
  extractEndpointsFromFile(filePath, content) {
    const endpoints = [];
    
    // Extract route information
    const routePath = this.getRoutePath(filePath);
    const methods = this.extractMethods(content);
    
    for (const method of methods) {
      const endpoint = {
        path: routePath,
        method: method.toUpperCase(),
        file: filePath,
        description: this.extractDescription(content),
        parameters: this.extractParameters(content),
        requestBody: this.extractRequestBody(content),
        responses: this.extractResponses(content),
        auth: this.extractAuth(content),
        tags: this.extractTags(content)
      };
      
      endpoints.push(endpoint);
    }
    
    return endpoints;
  }

  /**
   * Extract Edge Function endpoints
   */
  extractEdgeFunctionEndpoints(filePath, content) {
    const endpoints = [];
    
    // Extract function name from path
    const functionName = path.basename(path.dirname(filePath));
    const routePath = `/functions/${functionName}`;
    
    const endpoint = {
      path: routePath,
      method: 'POST', // Edge Functions typically use POST
      file: filePath,
      description: this.extractDescription(content),
      parameters: this.extractParameters(content),
      requestBody: this.extractRequestBody(content),
      responses: this.extractResponses(content),
      auth: this.extractAuth(content),
      tags: ['Edge Functions']
    };
    
    endpoints.push(endpoint);
    return endpoints;
  }

  /**
   * Get route path from file path
   */
  getRoutePath(filePath) {
    if (filePath.includes('pages/api/')) {
      return filePath.replace('pages/api', '').replace('.ts', '').replace('index', '');
    } else if (filePath.includes('app/api/')) {
      return filePath.replace('app/api', '').replace('.ts', '').replace('route', '');
    }
    return filePath;
  }

  /**
   * Extract HTTP methods from content
   */
  extractMethods(content) {
    const methods = [];
    const methodRegex = /export\s+(?:async\s+)?(?:function\s+)?(get|post|put|patch|delete|head|options)\s*[=\(]/gi;
    let match;
    
    while ((match = methodRegex.exec(content)) !== null) {
      methods.push(match[1]);
    }
    
    // If no methods found, assume GET
    if (methods.length === 0) {
      methods.push('get');
    }
    
    return methods;
  }

  /**
   * Extract description from content
   */
  extractDescription(content) {
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes('*') && (line.includes('Description:') || line.includes('Purpose:'))) {
        return line.replace(/[/*]/g, '').trim();
      }
    }
    return 'No description available';
  }

  /**
   * Extract parameters from content
   */
  extractParameters(content) {
    const parameters = [];
    
    // Look for parameter definitions
    const paramRegex = /(?:query|param|parameter)\s*[:=]\s*\{([^}]+)\}/gi;
    let match;
    
    while ((match = paramRegex.exec(content)) !== null) {
      const paramDef = match[1];
      const parts = paramDef.split(':');
      if (parts.length >= 2) {
        parameters.push({
          name: parts[0].trim(),
          type: parts[1].trim(),
          required: !parts[1].includes('?'),
          description: parts[2] ? parts[2].trim() : ''
        });
      }
    }
    
    return parameters;
  }

  /**
   * Extract request body from content
   */
  extractRequestBody(content) {
    // Look for request body type definitions
    const bodyRegex = /(?:body|requestBody)\s*[:=]\s*\{([^}]+)\}/gi;
    const match = bodyRegex.exec(content);
    
    if (match) {
      return {
        type: 'object',
        properties: this.parseObjectDefinition(match[1])
      };
    }
    
    return null;
  }

  /**
   * Extract responses from content
   */
  extractResponses(content) {
    const responses = {};
    
    // Look for response definitions
    const responseRegex = /(?:response|return)\s*[:=]\s*\{([^}]+)\}/gi;
    let match;
    
    while ((match = responseRegex.exec(content)) !== null) {
      const responseDef = match[1];
      const parts = responseDef.split(':');
      if (parts.length >= 2) {
        const statusCode = parts[0].trim();
        const type = parts[1].trim();
        responses[statusCode] = {
          description: this.getStatusDescription(statusCode),
          content: {
            'application/json': {
              schema: {
                type: type === 'object' ? 'object' : 'string',
                properties: type === 'object' ? this.parseObjectDefinition(parts[2] || '') : {}
              }
            }
          }
        };
      }
    }
    
    // Add default responses if none found
    if (Object.keys(responses).length === 0) {
      responses['200'] = {
        description: 'Success',
        content: {
          'application/json': {
            schema: { type: 'object' }
          }
        }
      };
    }
    
    return responses;
  }

  /**
   * Extract authentication from content
   */
  extractAuth(content) {
    if (content.includes('supabase') || content.includes('auth')) {
      return {
        type: 'bearer',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      };
    }
    
    return null;
  }

  /**
   * Extract tags from content
   */
  extractTags(content) {
    const tags = [];
    
    if (content.includes('auth')) tags.push('Authentication');
    if (content.includes('user')) tags.push('Users');
    if (content.includes('mortgage')) tags.push('Mortgage');
    if (content.includes('rate')) tags.push('Rates');
    if (content.includes('lead')) tags.push('Leads');
    if (content.includes('subscription')) tags.push('Subscriptions');
    if (content.includes('billing')) tags.push('Billing');
    
    return tags.length > 0 ? tags : ['General'];
  }

  /**
   * Parse object definition string
   */
  parseObjectDefinition(def) {
    const properties = {};
    const pairs = def.split(',');
    
    for (const pair of pairs) {
      const [key, value] = pair.split(':');
      if (key && value) {
        properties[key.trim()] = {
          type: value.trim().replace('?', ''),
          required: !value.includes('?')
        };
      }
    }
    
    return properties;
  }

  /**
   * Get status code description
   */
  getStatusDescription(statusCode) {
    const descriptions = {
      '200': 'Success',
      '201': 'Created',
      '400': 'Bad Request',
      '401': 'Unauthorized',
      '403': 'Forbidden',
      '404': 'Not Found',
      '500': 'Internal Server Error'
    };
    
    return descriptions[statusCode] || 'Response';
  }

  /**
   * Analyze data models from database schema
   */
  async analyzeDataModels() {
    console.log('📊 Analyzing data models...');

    try {
      // Read database schema
      const schemaContent = await fs.readFile('supabase_complete_schema.sql', 'utf8');
      this.dataModels = this.extractDataModels(schemaContent);
      
      console.log(`📊 Found ${this.dataModels.length} data models`);

    } catch (error) {
      console.error('Error analyzing data models:', error);
    }
  }

  /**
   * Extract data models from SQL schema
   */
  extractDataModels(schemaContent) {
    const models = [];
    const tableRegex = /CREATE TABLE\s+(\w+)\s*\(([^;]+)\)/gi;
    let match;
    
    while ((match = tableRegex.exec(schemaContent)) !== null) {
      const tableName = match[1];
      const columns = this.extractColumns(match[2]);
      
      models.push({
        name: tableName,
        type: 'table',
        columns: columns,
        description: this.getTableDescription(tableName)
      });
    }
    
    return models;
  }

  /**
   * Extract columns from table definition
   */
  extractColumns(tableDef) {
    const columns = [];
    const lines = tableDef.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('CONSTRAINT') && !trimmed.startsWith('PRIMARY KEY')) {
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2) {
          columns.push({
            name: parts[0],
            type: parts[1],
            nullable: !trimmed.includes('NOT NULL'),
            primaryKey: trimmed.includes('PRIMARY KEY'),
            unique: trimmed.includes('UNIQUE')
          });
        }
      }
    }
    
    return columns;
  }

  /**
   * Get table description
   */
  getTableDescription(tableName) {
    const descriptions = {
      'users': 'User account information',
      'mortgage_calculations': 'Mortgage calculation results',
      'rate_checks': 'Interest rate check history',
      'leads': 'Lead generation data',
      'subscriptions': 'User subscription information',
      'billing_history': 'Billing transaction history',
      'analytics_events': 'User analytics events'
    };
    
    return descriptions[tableName] || 'Database table';
  }

  /**
   * Extract authentication schemes
   */
  async extractAuthSchemes() {
    this.authSchemes = [
      {
        name: 'Bearer Token',
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token authentication via Supabase'
      },
      {
        name: 'API Key',
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key authentication'
      }
    ];
  }

  /**
   * Identify error codes
   */
  async identifyErrorCodes() {
    this.errorCodes = [
      { code: 400, message: 'Bad Request', description: 'Invalid request parameters' },
      { code: 401, message: 'Unauthorized', description: 'Authentication required' },
      { code: 403, message: 'Forbidden', description: 'Insufficient permissions' },
      { code: 404, message: 'Not Found', description: 'Resource not found' },
      { code: 422, message: 'Unprocessable Entity', description: 'Validation error' },
      { code: 500, message: 'Internal Server Error', description: 'Server error' }
    ];
  }

  /**
   * Generate OpenAPI specification
   */
  async generateOpenAPISpec() {
    const spec = {
      openapi: '3.0.0',
      info: {
        title: 'MortgageMatch Pro API',
        version: '1.0.0',
        description: 'AI-powered mortgage intelligence API with advanced analytics and broker portal',
        contact: {
          name: 'API Support',
          email: 'api@mortgagematch.com'
        }
      },
      servers: [
        {
          url: 'https://api.mortgagematch.com',
          description: 'Production server'
        },
        {
          url: 'https://staging-api.mortgagematch.com',
          description: 'Staging server'
        }
      ],
      paths: {},
      components: {
        schemas: this.generateSchemas(),
        securitySchemes: this.authSchemes.reduce((acc, scheme) => {
          acc[scheme.name.replace(/\s+/g, '')] = scheme;
          return acc;
        }, {}),
        responses: this.errorCodes.reduce((acc, error) => {
          acc[error.code] = {
            description: error.message,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string', example: error.message },
                    message: { type: 'string', example: error.description },
                    code: { type: 'integer', example: error.code }
                  }
                }
              }
            }
          };
          return acc;
        }, {})
      }
    };

    // Add endpoints to paths
    for (const endpoint of this.apiEndpoints) {
      const pathKey = endpoint.path;
      if (!spec.paths[pathKey]) {
        spec.paths[pathKey] = {};
      }
      
      spec.paths[pathKey][endpoint.method.toLowerCase()] = {
        summary: endpoint.description,
        tags: endpoint.tags,
        parameters: endpoint.parameters.map(param => ({
          name: param.name,
          in: 'query',
          required: param.required,
          schema: { type: param.type },
          description: param.description
        })),
        requestBody: endpoint.requestBody ? {
          content: {
            'application/json': {
              schema: endpoint.requestBody
            }
          }
        } : undefined,
        responses: endpoint.responses,
        security: endpoint.auth ? [{ [endpoint.auth.type]: [] }] : undefined
      };
    }

    return spec;
  }

  /**
   * Generate schemas from data models
   */
  generateSchemas() {
    const schemas = {};
    
    for (const model of this.dataModels) {
      const properties = {};
      const required = [];
      
      for (const column of model.columns) {
        properties[column.name] = {
          type: this.mapSqlTypeToJsonType(column.type),
          nullable: column.nullable
        };
        
        if (!column.nullable && !column.primaryKey) {
          required.push(column.name);
        }
      }
      
      schemas[model.name] = {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined,
        description: model.description
      };
    }
    
    return schemas;
  }

  /**
   * Map SQL types to JSON schema types
   */
  mapSqlTypeToJsonType(sqlType) {
    const typeMap = {
      'varchar': 'string',
      'text': 'string',
      'integer': 'integer',
      'bigint': 'integer',
      'decimal': 'number',
      'numeric': 'number',
      'boolean': 'boolean',
      'timestamp': 'string',
      'date': 'string',
      'time': 'string',
      'json': 'object',
      'jsonb': 'object',
      'uuid': 'string'
    };
    
    return typeMap[sqlType.toLowerCase()] || 'string';
  }

  /**
   * Generate comprehensive documentation
   */
  async generateDocumentation(openApiSpec) {
    const prompt = `
Generate comprehensive API documentation for the following OpenAPI specification:

${JSON.stringify(openApiSpec, null, 2)}

Please create:
1. Overview and getting started guide
2. Authentication guide
3. Endpoint documentation with examples
4. Data models and schemas
5. Error handling guide
6. Rate limiting information
7. SDK examples
8. Best practices

Format as Markdown with clear sections and examples.
    `.trim();

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert API documentation writer. Create comprehensive, clear, and helpful documentation.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      });

      return response.choices[0].message.content;

    } catch (error) {
      console.error('Error generating documentation with AI:', error);
      return this.generateFallbackDocumentation(openApiSpec);
    }
  }

  /**
   * Generate fallback documentation
   */
  generateFallbackDocumentation(openApiSpec) {
    let markdown = `# MortgageMatch Pro API Reference\n\n`;
    markdown += `## Overview\n\n`;
    markdown += `The MortgageMatch Pro API provides AI-powered mortgage intelligence with advanced analytics and broker portal functionality.\n\n`;
    markdown += `## Base URL\n\n`;
    markdown += `- Production: \`https://api.mortgagematch.com\`\n`;
    markdown += `- Staging: \`https://staging-api.mortgagematch.com\`\n\n`;
    markdown += `## Authentication\n\n`;
    markdown += `The API uses JWT token authentication via Supabase.\n\n`;
    markdown += `## Endpoints\n\n`;
    
    for (const [path, methods] of Object.entries(openApiSpec.paths)) {
      markdown += `### ${path}\n\n`;
      
      for (const [method, spec] of Object.entries(methods)) {
        markdown += `#### ${method.toUpperCase()}\n\n`;
        markdown += `${spec.summary}\n\n`;
        
        if (spec.parameters && spec.parameters.length > 0) {
          markdown += `**Parameters:**\n\n`;
          for (const param of spec.parameters) {
            markdown += `- \`${param.name}\` (${param.schema.type}): ${param.description}\n`;
          }
          markdown += `\n`;
        }
        
        if (spec.requestBody) {
          markdown += `**Request Body:**\n\n`;
          markdown += `\`\`\`json\n`;
          markdown += `{\n`;
          markdown += `  "example": "value"\n`;
          markdown += `}\n`;
          markdown += `\`\`\`\n\n`;
        }
        
        if (spec.responses) {
          markdown += `**Responses:**\n\n`;
          for (const [code, response] of Object.entries(spec.responses)) {
            markdown += `- \`${code}\`: ${response.description}\n`;
          }
          markdown += `\n`;
        }
      }
    }
    
    return markdown;
  }

  /**
   * Save documentation files
   */
  async saveDocumentation(documentation, openApiSpec) {
    // Ensure docs directory exists
    await fs.mkdir('docs', { recursive: true });
    
    // Save API reference
    await fs.writeFile('docs/api_reference.md', documentation, 'utf8');
    console.log('📚 API reference saved to docs/api_reference.md');
    
    // Save OpenAPI spec
    await fs.writeFile('docs/openapi.json', JSON.stringify(openApiSpec, null, 2), 'utf8');
    console.log('📋 OpenAPI spec saved to docs/openapi.json');
    
    // Save endpoint summary
    const endpointSummary = this.generateEndpointSummary();
    await fs.writeFile('docs/endpoints.md', endpointSummary, 'utf8');
    console.log('📡 Endpoint summary saved to docs/endpoints.md');
  }

  /**
   * Generate endpoint summary
   */
  generateEndpointSummary() {
    let markdown = `# API Endpoints Summary\n\n`;
    markdown += `Total Endpoints: ${this.apiEndpoints.length}\n\n`;
    
    const groupedEndpoints = this.apiEndpoints.reduce((acc, endpoint) => {
      const tag = endpoint.tags[0] || 'General';
      if (!acc[tag]) acc[tag] = [];
      acc[tag].push(endpoint);
      return acc;
    }, {});
    
    for (const [tag, endpoints] of Object.entries(groupedEndpoints)) {
      markdown += `## ${tag}\n\n`;
      
      for (const endpoint of endpoints) {
        markdown += `- **${endpoint.method}** \`${endpoint.path}\` - ${endpoint.description}\n`;
      }
      markdown += `\n`;
    }
    
    return markdown;
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new APIReferenceGenerator();
  
  generator.generateAPIReference()
    .then((documentation) => {
      console.log('✅ API reference generated successfully');
      console.log(`Endpoints: ${generator.apiEndpoints.length}`);
      console.log(`Data models: ${generator.dataModels.length}`);
      console.log(`Auth schemes: ${generator.authSchemes.length}`);
    })
    .catch((error) => {
      console.error('❌ Error generating API reference:', error);
      process.exit(1);
    });
}