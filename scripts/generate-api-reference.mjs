#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

class APIReferenceGenerator {
  constructor() {
    this.apiEndpoints = [];
    this.eventTypes = [];
    this.interfaces = [];
  }

  async generate() {
    console.log('📚 Generating API reference documentation...\n');

    try {
      await this.scanAPIEndpoints();
      await this.scanEventTypes();
      await this.scanInterfaces();
      await this.generateMarkdown();
      
      console.log('✅ API reference generated successfully!');
    } catch (error) {
      console.error('❌ Error generating API reference:', error.message);
      process.exit(1);
    }
  }

  async scanAPIEndpoints() {
    console.log('🔍 Scanning API endpoints...');
    
    const apiDir = path.join(projectRoot, 'pages', 'api');
    const files = await this.getFilesRecursively(apiDir, '.ts');
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      const endpoint = this.parseAPIEndpoint(file, content);
      if (endpoint) {
        this.apiEndpoints.push(endpoint);
      }
    }
  }

  async scanEventTypes() {
    console.log('🔍 Scanning event types...');
    
    const eventsDir = path.join(projectRoot, 'events', 'schemas');
    const files = await this.getFilesRecursively(eventsDir, '.ts');
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      const events = this.parseEventTypes(file, content);
      this.eventTypes.push(...events);
    }
  }

  async scanInterfaces() {
    console.log('🔍 Scanning interfaces...');
    
    const libDir = path.join(projectRoot, 'lib');
    const files = await this.getFilesRecursively(libDir, '.ts');
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      const interfaces = this.parseInterfaces(file, content);
      this.interfaces.push(...interfaces);
    }
  }

  async getFilesRecursively(dir, extension) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.getFilesRecursively(fullPath, extension);
          files.push(...subFiles);
        } else if (entry.name.endsWith(extension)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
    
    return files;
  }

  parseAPIEndpoint(filePath, content) {
    const relativePath = path.relative(projectRoot, filePath);
    const route = relativePath
      .replace('pages/api/', '/api/')
      .replace('.ts', '')
      .replace(/\[([^\]]+)\]/g, ':$1');

    // Extract HTTP methods
    const methods = [];
    if (content.includes('req.method === \'GET\'')) methods.push('GET');
    if (content.includes('req.method === \'POST\'')) methods.push('POST');
    if (content.includes('req.method === \'PUT\'')) methods.push('PUT');
    if (content.includes('req.method === \'DELETE\'')) methods.push('DELETE');
    if (content.includes('req.method === \'PATCH\'')) methods.push('PATCH');

    // Extract description from comments
    const commentMatch = content.match(/\/\*\*([\s\S]*?)\*\//);
    const description = commentMatch ? commentMatch[1].trim() : '';

    // Extract query parameters
    const queryParams = this.extractQueryParams(content);

    // Extract request body schema
    const requestBody = this.extractRequestBody(content);

    // Extract response schema
    const responseSchema = this.extractResponseSchema(content);

    return {
      route,
      methods,
      description,
      queryParams,
      requestBody,
      responseSchema,
      file: relativePath
    };
  }

  parseEventTypes(filePath, content) {
    const events = [];
    const relativePath = path.relative(projectRoot, filePath);
    
    // Extract event type constants
    const eventTypeRegex = /export const (\w+_EVENT_TYPES) = \{([\s\S]*?)\}/g;
    let match;
    
    while ((match = eventTypeRegex.exec(content)) !== null) {
      const [, constantName, eventDefinitions] = match;
      
      // Parse individual event types
      const eventRegex = /(\w+):\s*['"`]([^'"`]+)['"`]/g;
      let eventMatch;
      
      while ((eventMatch = eventRegex.exec(eventDefinitions)) !== null) {
        const [, eventName, eventType] = eventMatch;
        events.push({
          name: eventName,
          type: eventType,
          constant: constantName,
          file: relativePath
        });
      }
    }
    
    return events;
  }

  parseInterfaces(filePath, content) {
    const interfaces = [];
    const relativePath = path.relative(projectRoot, filePath);
    
    // Extract interface definitions
    const interfaceRegex = /export interface (\w+)\s*\{([\s\S]*?)\}/g;
    let match;
    
    while ((match = interfaceRegex.exec(content)) !== null) {
      const [, interfaceName, interfaceBody] = match;
      
      // Extract properties
      const properties = [];
      const propertyRegex = /(\w+)(\?)?:\s*([^;]+);/g;
      let propMatch;
      
      while ((propMatch = propertyRegex.exec(interfaceBody)) !== null) {
        const [, propName, optional, propType] = propMatch;
        properties.push({
          name: propName,
          optional: !!optional,
          type: propType.trim()
        });
      }
      
      interfaces.push({
        name: interfaceName,
        properties,
        file: relativePath
      });
    }
    
    return interfaces;
  }

  extractQueryParams(content) {
    const params = [];
    const queryMatch = content.match(/const\s*\{\s*([^}]+)\s*\}\s*=\s*req\.query/);
    
    if (queryMatch) {
      const paramList = queryMatch[1];
      const paramRegex = /(\w+)/g;
      let match;
      
      while ((match = paramRegex.exec(paramList)) !== null) {
        params.push({
          name: match[1],
          type: 'string',
          required: false
        });
      }
    }
    
    return params;
  }

  extractRequestBody(content) {
    const bodyMatch = content.match(/const\s*\{\s*([^}]+)\s*\}\s*=\s*req\.body/);
    
    if (bodyMatch) {
      const bodyList = bodyMatch[1];
      const paramRegex = /(\w+)/g;
      const params = [];
      let match;
      
      while ((match = paramRegex.exec(bodyList)) !== null) {
        params.push({
          name: match[1],
          type: 'any',
          required: true
        });
      }
      
      return params;
    }
    
    return null;
  }

  extractResponseSchema(content) {
    // Look for response structure in the code
    const responseMatch = content.match(/res\.status\(\d+\)\.json\(\{([\s\S]*?)\}\)/);
    
    if (responseMatch) {
      const responseBody = responseMatch[1];
      const successMatch = responseBody.match(/success:\s*(\w+)/);
      const dataMatch = responseBody.match(/data:\s*([^,}]+)/);
      
      return {
        success: successMatch ? successMatch[1] : 'boolean',
        data: dataMatch ? dataMatch[1].trim() : 'any'
      };
    }
    
    return null;
  }

  async generateMarkdown() {
    console.log('📝 Generating markdown documentation...');
    
    const markdown = this.buildMarkdown();
    const outputPath = path.join(projectRoot, 'docs', 'API_REFERENCE.md');
    
    // Ensure docs directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    
    await fs.writeFile(outputPath, markdown);
    console.log(`📄 API reference written to: ${outputPath}`);
  }

  buildMarkdown() {
    let markdown = `# API Reference - MortgageMatchPro v1.4.0

Generated on: ${new Date().toISOString()}

## Overview

This document provides a comprehensive reference for all API endpoints, event types, and interfaces in the MortgageMatchPro application.

## Table of Contents

- [API Endpoints](#api-endpoints)
- [Event Types](#event-types)
- [Interfaces](#interfaces)

---

## API Endpoints

`;

    // Group endpoints by domain
    const groupedEndpoints = this.groupEndpointsByDomain();
    
    for (const [domain, endpoints] of Object.entries(groupedEndpoints)) {
      markdown += `### ${domain.charAt(0).toUpperCase() + domain.slice(1)} API\n\n`;
      
      for (const endpoint of endpoints) {
        markdown += `#### \`${endpoint.route}\`\n\n`;
        
        if (endpoint.description) {
          markdown += `${endpoint.description}\n\n`;
        }
        
        markdown += `**Methods:** ${endpoint.methods.join(', ')}\n\n`;
        
        if (endpoint.queryParams.length > 0) {
          markdown += `**Query Parameters:**\n\n`;
          markdown += `| Parameter | Type | Required | Description |\n`;
          markdown += `|-----------|------|----------|-------------|\n`;
          
          for (const param of endpoint.queryParams) {
            markdown += `| \`${param.name}\` | ${param.type} | ${param.required ? 'Yes' : 'No'} | - |\n`;
          }
          markdown += '\n';
        }
        
        if (endpoint.requestBody) {
          markdown += `**Request Body:**\n\n`;
          markdown += `| Parameter | Type | Required | Description |\n`;
          markdown += `|-----------|------|----------|-------------|\n`;
          
          for (const param of endpoint.requestBody) {
            markdown += `| \`${param.name}\` | ${param.type} | ${param.required ? 'Yes' : 'No'} | - |\n`;
          }
          markdown += '\n';
        }
        
        if (endpoint.responseSchema) {
          markdown += `**Response Schema:**\n\n`;
          markdown += `\`\`\`json\n`;
          markdown += `{\n`;
          markdown += `  "success": ${endpoint.responseSchema.success},\n`;
          markdown += `  "data": ${endpoint.responseSchema.data}\n`;
          markdown += `}\n`;
          markdown += `\`\`\`\n\n`;
        }
        
        markdown += `**File:** \`${endpoint.file}\`\n\n`;
        markdown += '---\n\n';
      }
    }

    // Event Types section
    markdown += `## Event Types\n\n`;
    
    const groupedEvents = this.groupEventsByDomain();
    
    for (const [domain, events] of Object.entries(groupedEvents)) {
      markdown += `### ${domain.charAt(0).toUpperCase() + domain.slice(1)} Events\n\n`;
      
      for (const event of events) {
        markdown += `#### \`${event.type}\`\n\n`;
        markdown += `**Constant:** \`${event.constant}.${event.name}\`\n\n`;
        markdown += `**File:** \`${event.file}\`\n\n`;
        markdown += '---\n\n';
      }
    }

    // Interfaces section
    markdown += `## Interfaces\n\n`;
    
    const groupedInterfaces = this.groupInterfacesByDomain();
    
    for (const [domain, interfaces] of Object.entries(groupedInterfaces)) {
      markdown += `### ${domain.charAt(0).toUpperCase() + domain.slice(1)} Interfaces\n\n`;
      
      for (const interface_ of interfaces) {
        markdown += `#### \`${interface_.name}\`\n\n`;
        
        if (interface_.properties.length > 0) {
          markdown += `**Properties:**\n\n`;
          markdown += `| Property | Type | Required | Description |\n`;
          markdown += `|----------|------|----------|-------------|\n`;
          
          for (const prop of interface_.properties) {
            markdown += `| \`${prop.name}\` | ${prop.type} | ${prop.optional ? 'No' : 'Yes'} | - |\n`;
          }
          markdown += '\n';
        }
        
        markdown += `**File:** \`${interface_.file}\`\n\n`;
        markdown += '---\n\n';
      }
    }

    markdown += `## Notes

- This documentation is automatically generated from the source code
- For the most up-to-date information, refer to the actual implementation files
- Event types are used for inter-service communication via the event bus
- All API endpoints return JSON responses with a consistent structure

## Contributing

When adding new API endpoints, event types, or interfaces:

1. Follow the existing naming conventions
2. Add JSDoc comments for better documentation
3. Update this reference by running: \`npm run docs:generate\`
4. Ensure all changes are properly tested

---

*Generated by MortgageMatchPro API Reference Generator v1.4.0*
`;

    return markdown;
  }

  groupEndpointsByDomain() {
    const grouped = {};
    
    for (const endpoint of this.apiEndpoints) {
      const domain = this.getDomainFromPath(endpoint.file);
      if (!grouped[domain]) {
        grouped[domain] = [];
      }
      grouped[domain].push(endpoint);
    }
    
    return grouped;
  }

  groupEventsByDomain() {
    const grouped = {};
    
    for (const event of this.eventTypes) {
      const domain = this.getDomainFromPath(event.file);
      if (!grouped[domain]) {
        grouped[domain] = [];
      }
      grouped[domain].push(event);
    }
    
    return grouped;
  }

  groupInterfacesByDomain() {
    const grouped = {};
    
    for (const interface_ of this.interfaces) {
      const domain = this.getDomainFromPath(interface_.file);
      if (!grouped[domain]) {
        grouped[domain] = [];
      }
      grouped[domain].push(interface_);
    }
    
    return grouped;
  }

  getDomainFromPath(filePath) {
    if (filePath.includes('pages/api/')) {
      const parts = filePath.split('/');
      const apiIndex = parts.indexOf('api');
      if (apiIndex < parts.length - 1) {
        return parts[apiIndex + 1];
      }
    }
    
    if (filePath.includes('lib/')) {
      const parts = filePath.split('/');
      const libIndex = parts.indexOf('lib');
      if (libIndex < parts.length - 1) {
        return parts[libIndex + 1];
      }
    }
    
    return 'general';
  }
}

// Run the generator
const generator = new APIReferenceGenerator();
generator.generate().catch(error => {
  console.error('❌ Generation failed:', error);
  process.exit(1);
});
