#!/usr/bin/env node

/**
 * AI-Powered Architecture Map Generator
 * Uses GPT + code analysis to generate comprehensive architecture diagrams
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY ? createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
) : null;

class ArchitectureMapGenerator {
  constructor() {
    this.components = [];
    this.relationships = [];
    this.dataFlows = [];
    this.deploymentInfo = {};
  }

  /**
   * Main function to generate architecture map
   */
  async generateArchitectureMap() {
    console.log('🏗️ Generating AI-powered architecture map...');

    try {
      // 1. Analyze codebase structure
      await this.analyzeCodebase();
      
      // 2. Identify components
      await this.identifyComponents();
      
      // 3. Map relationships
      await this.mapRelationships();
      
      // 4. Analyze data flows
      await this.analyzeDataFlows();
      
      // 5. Generate Mermaid diagram
      const mermaidDiagram = await this.generateMermaidDiagram();
      
      // 6. Generate SVG diagram
      const svgDiagram = await this.generateSVGDiagram();
      
      // 7. Generate documentation
      const documentation = await this.generateDocumentation();
      
      // 8. Save files
      await this.saveArchitectureFiles(mermaidDiagram, svgDiagram, documentation);
      
      console.log('✅ Architecture map generated successfully');
      return { mermaidDiagram, svgDiagram, documentation };

    } catch (error) {
      console.error('❌ Error generating architecture map:', error);
      throw error;
    }
  }

  /**
   * Analyze codebase structure
   */
  async analyzeCodebase() {
    console.log('📁 Analyzing codebase structure...');

    try {
      // Get all relevant files
      const files = await glob('**/*', { 
        ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**', '*.log'] 
      });

      // Categorize files
      const categories = {
        pages: files.filter(f => f.startsWith('pages/')),
        app: files.filter(f => f.startsWith('app/')),
        components: files.filter(f => f.startsWith('components/')),
        lib: files.filter(f => f.startsWith('lib/')),
        core: files.filter(f => f.startsWith('core/')),
        shared: files.filter(f => f.startsWith('shared/')),
        ai: files.filter(f => f.startsWith('ai/')),
        watchers: files.filter(f => f.startsWith('watchers/')),
        scripts: files.filter(f => f.startsWith('scripts/')),
        supabase: files.filter(f => f.startsWith('supabase/')),
        workflows: files.filter(f => f.startsWith('.github/workflows/')),
        config: files.filter(f => f.match(/\.(json|js|ts|yml|yaml)$/) && !f.includes('node_modules'))
      };

      this.codebaseStructure = {
        totalFiles: files.length,
        categories: Object.keys(categories).reduce((acc, key) => {
          acc[key] = categories[key].length;
          return acc;
        }, {}),
        fileList: categories
      };

      console.log(`📊 Codebase analysis complete: ${files.length} files across ${Object.keys(categories).length} categories`);

    } catch (error) {
      console.error('Error analyzing codebase:', error);
    }
  }

  /**
   * Identify system components
   */
  async identifyComponents() {
    console.log('🔍 Identifying system components...');

    try {
      // Frontend components
      const frontendComponents = await this.analyzeFrontendComponents();
      
      // Backend components
      const backendComponents = await this.analyzeBackendComponents();
      
      // AI components
      const aiComponents = await this.analyzeAIComponents();
      
      // Database components
      const databaseComponents = await this.analyzeDatabaseComponents();
      
      // Infrastructure components
      const infrastructureComponents = await this.analyzeInfrastructureComponents();
      
      this.components = [
        ...frontendComponents,
        ...backendComponents,
        ...aiComponents,
        ...databaseComponents,
        ...infrastructureComponents
      ];

      console.log(`🔍 Identified ${this.components.length} system components`);

    } catch (error) {
      console.error('Error identifying components:', error);
    }
  }

  /**
   * Analyze frontend components
   */
  async analyzeFrontendComponents() {
    const components = [];

    try {
      // Next.js pages
      const pages = await glob('pages/**/*.tsx');
      for (const page of pages) {
        const content = await fs.readFile(page, 'utf8');
        const name = path.basename(page, '.tsx');
        const type = this.getPageType(page);
        
        components.push({
          id: `page-${name}`,
          name: name,
          type: 'Page',
          category: 'Frontend',
          description: this.extractDescription(content),
          file: page,
          dependencies: this.extractDependencies(content)
        });
      }

      // React components
      const componentFiles = await glob('components/**/*.tsx');
      for (const component of componentFiles) {
        const content = await fs.readFile(component, 'utf8');
        const name = path.basename(component, '.tsx');
        
        components.push({
          id: `component-${name}`,
          name: name,
          type: 'Component',
          category: 'Frontend',
          description: this.extractDescription(content),
          file: component,
          dependencies: this.extractDependencies(content)
        });
      }

      // App directory components
      const appFiles = await glob('app/**/*.tsx');
      for (const appFile of appFiles) {
        const content = await fs.readFile(appFile, 'utf8');
        const name = path.basename(appFile, '.tsx');
        
        components.push({
          id: `app-${name}`,
          name: name,
          type: 'App Component',
          category: 'Frontend',
          description: this.extractDescription(content),
          file: appFile,
          dependencies: this.extractDependencies(content)
        });
      }

    } catch (error) {
      console.error('Error analyzing frontend components:', error);
    }

    return components;
  }

  /**
   * Analyze backend components
   */
  async analyzeBackendComponents() {
    const components = [];

    try {
      // API routes
      const apiRoutes = await glob('pages/api/**/*.ts');
      for (const route of apiRoutes) {
        const content = await fs.readFile(route, 'utf8');
        const name = path.basename(route, '.ts');
        const routePath = route.replace('pages/api', '').replace('.ts', '');
        
        components.push({
          id: `api-${name}`,
          name: name,
          type: 'API Route',
          category: 'Backend',
          description: this.extractDescription(content),
          file: route,
          path: routePath,
          dependencies: this.extractDependencies(content)
        });
      }

      // Supabase Edge Functions
      const edgeFunctions = await glob('supabase/functions/**/*.ts');
      for (const func of edgeFunctions) {
        const content = await fs.readFile(func, 'utf8');
        const name = path.basename(path.dirname(func));
        
        components.push({
          id: `edge-${name}`,
          name: name,
          type: 'Edge Function',
          category: 'Backend',
          description: this.extractDescription(content),
          file: func,
          dependencies: this.extractDependencies(content)
        });
      }

      // Core services
      const coreFiles = await glob('core/**/*.ts');
      for (const coreFile of coreFiles) {
        const content = await fs.readFile(coreFile, 'utf8');
        const name = path.basename(coreFile, '.ts');
        
        components.push({
          id: `core-${name}`,
          name: name,
          type: 'Core Service',
          category: 'Backend',
          description: this.extractDescription(content),
          file: coreFile,
          dependencies: this.extractDependencies(content)
        });
      }

    } catch (error) {
      console.error('Error analyzing backend components:', error);
    }

    return components;
  }

  /**
   * Analyze AI components
   */
  async analyzeAIComponents() {
    const components = [];

    try {
      // AI agents
      const aiFiles = await glob('ai/*.ts');
      for (const aiFile of aiFiles) {
        const content = await fs.readFile(aiFile, 'utf8');
        const name = path.basename(aiFile, '.ts');
        
        components.push({
          id: `ai-${name}`,
          name: name,
          type: 'AI Agent',
          category: 'AI',
          description: this.extractDescription(content),
          file: aiFile,
          dependencies: this.extractDependencies(content)
        });
      }

      // Watchers
      const watcherFiles = await glob('watchers/*.ts');
      for (const watcherFile of watcherFiles) {
        const content = await fs.readFile(watcherFile, 'utf8');
        const name = path.basename(watcherFile, '.ts');
        
        components.push({
          id: `watcher-${name}`,
          name: name,
          type: 'Watcher',
          category: 'AI',
          description: this.extractDescription(content),
          file: watcherFile,
          dependencies: this.extractDependencies(content)
        });
      }

    } catch (error) {
      console.error('Error analyzing AI components:', error);
    }

    return components;
  }

  /**
   * Analyze database components
   */
  async analyzeDatabaseComponents() {
    const components = [];

    try {
      // Read database schema
      const schemaContent = await fs.readFile('supabase_complete_schema.sql', 'utf8');
      const tables = this.extractTables(schemaContent);
      
      for (const table of tables) {
        components.push({
          id: `table-${table.name}`,
          name: table.name,
          type: 'Database Table',
          category: 'Database',
          description: table.description,
          columns: table.columns,
          dependencies: []
        });
      }

    } catch (error) {
      console.error('Error analyzing database components:', error);
    }

    return components;
  }

  /**
   * Analyze infrastructure components
   */
  async analyzeInfrastructureComponents() {
    const components = [];

    try {
      // GitHub Actions workflows
      const workflows = await glob('.github/workflows/*.yml');
      for (const workflow of workflows) {
        const content = await fs.readFile(workflow, 'utf8');
        const name = path.basename(workflow, '.yml');
        
        components.push({
          id: `workflow-${name}`,
          name: name,
          type: 'CI/CD Workflow',
          category: 'Infrastructure',
          description: this.extractWorkflowDescription(content),
          file: workflow,
          dependencies: []
        });
      }

      // Configuration files
      const configFiles = ['package.json', 'next.config.js', 'tailwind.config.js', 'tsconfig.json'];
      for (const configFile of configFiles) {
        try {
          const content = await fs.readFile(configFile, 'utf8');
          const name = path.basename(configFile);
          
          components.push({
            id: `config-${name}`,
            name: name,
            type: 'Configuration',
            category: 'Infrastructure',
            description: `Configuration file for ${name}`,
            file: configFile,
            dependencies: []
          });
        } catch (error) {
          // Config file not found, skip
        }
      }

    } catch (error) {
      console.error('Error analyzing infrastructure components:', error);
    }

    return components;
  }

  /**
   * Get page type from file path
   */
  getPageType(filePath) {
    if (filePath.includes('api/')) return 'API Page';
    if (filePath.includes('admin/')) return 'Admin Page';
    if (filePath.includes('dashboard/')) return 'Dashboard Page';
    return 'Page';
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
   * Extract dependencies from content
   */
  extractDependencies(content) {
    const dependencies = [];
    
    // Look for import statements
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (!importPath.startsWith('.')) {
        dependencies.push(importPath);
      }
    }
    
    return dependencies;
  }

  /**
   * Extract workflow description
   */
  extractWorkflowDescription(content) {
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes('name:') && !line.includes('job')) {
        return line.replace('name:', '').trim();
      }
    }
    return 'No description available';
  }

  /**
   * Extract tables from SQL schema
   */
  extractTables(schemaContent) {
    const tables = [];
    const tableRegex = /CREATE TABLE\s+(\w+)\s*\(([^;]+)\)/gi;
    let match;
    
    while ((match = tableRegex.exec(schemaContent)) !== null) {
      const tableName = match[1];
      const columns = this.extractColumns(match[2]);
      
      tables.push({
        name: tableName,
        description: this.getTableDescription(tableName),
        columns: columns
      });
    }
    
    return tables;
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
            type: parts[1]
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
   * Map relationships between components
   */
  async mapRelationships() {
    console.log('🔗 Mapping component relationships...');

    try {
      for (const component of this.components) {
        for (const dependency of component.dependencies) {
          // Find the component that matches this dependency
          const targetComponent = this.findComponentByDependency(dependency);
          if (targetComponent) {
            this.relationships.push({
              source: component.id,
              target: targetComponent.id,
              type: 'depends_on',
              description: `${component.name} depends on ${targetComponent.name}`
            });
          }
        }
      }

      // Add data flow relationships
      await this.addDataFlowRelationships();

      console.log(`🔗 Mapped ${this.relationships.length} component relationships`);

    } catch (error) {
      console.error('Error mapping relationships:', error);
    }
  }

  /**
   * Find component by dependency
   */
  findComponentByDependency(dependency) {
    // Simple matching logic - in a real implementation, this would be more sophisticated
    for (const component of this.components) {
      if (component.name.toLowerCase().includes(dependency.toLowerCase()) ||
          component.file.includes(dependency)) {
        return component;
      }
    }
    return null;
  }

  /**
   * Add data flow relationships
   */
  async addDataFlowRelationships() {
    // Add common data flow relationships
    const dataFlows = [
      { from: 'Frontend', to: 'API', type: 'HTTP Request' },
      { from: 'API', to: 'Database', type: 'Query' },
      { from: 'AI Agent', to: 'Database', type: 'Data Analysis' },
      { from: 'Watcher', to: 'Database', type: 'Monitoring' },
      { from: 'Edge Function', to: 'Database', type: 'Function Call' }
    ];

    for (const flow of dataFlows) {
      const sourceComponents = this.components.filter(c => c.category === flow.from);
      const targetComponents = this.components.filter(c => c.category === flow.to);
      
      for (const source of sourceComponents) {
        for (const target of targetComponents) {
          this.relationships.push({
            source: source.id,
            target: target.id,
            type: 'data_flow',
            description: `${flow.type} from ${source.name} to ${target.name}`
          });
        }
      }
    }
  }

  /**
   * Analyze data flows
   */
  async analyzeDataFlows() {
    console.log('📊 Analyzing data flows...');

    try {
      // Analyze API data flows
      const apiFlows = await this.analyzeAPIDataFlows();
      
      // Analyze AI data flows
      const aiFlows = await this.analyzeAIDataFlows();
      
      // Analyze database flows
      const dbFlows = await this.analyzeDatabaseFlows();
      
      this.dataFlows = [...apiFlows, ...aiFlows, ...dbFlows];

      console.log(`📊 Identified ${this.dataFlows.length} data flows`);

    } catch (error) {
      console.error('Error analyzing data flows:', error);
    }
  }

  /**
   * Analyze API data flows
   */
  async analyzeAPIDataFlows() {
    const flows = [];
    
    // Common API data flows
    const commonFlows = [
      { from: 'User Input', to: 'Frontend', type: 'User Interaction' },
      { from: 'Frontend', to: 'API Route', type: 'HTTP Request' },
      { from: 'API Route', to: 'Database', type: 'Query' },
      { from: 'Database', to: 'API Route', type: 'Response' },
      { from: 'API Route', to: 'Frontend', type: 'HTTP Response' }
    ];

    for (const flow of commonFlows) {
      flows.push({
        id: `flow-${flow.from}-${flow.to}`,
        from: flow.from,
        to: flow.to,
        type: flow.type,
        description: `Data flows from ${flow.from} to ${flow.to} via ${flow.type}`
      });
    }

    return flows;
  }

  /**
   * Analyze AI data flows
   */
  async analyzeAIDataFlows() {
    const flows = [];
    
    // AI-specific data flows
    const aiFlows = [
      { from: 'Database', to: 'AI Agent', type: 'Data Analysis' },
      { from: 'AI Agent', to: 'Database', type: 'Insights Storage' },
      { from: 'AI Agent', to: 'GitHub', type: 'Issue Creation' },
      { from: 'Watcher', to: 'Database', type: 'Health Monitoring' },
      { from: 'Watcher', to: 'GitHub', type: 'Alert Notification' }
    ];

    for (const flow of aiFlows) {
      flows.push({
        id: `ai-flow-${flow.from}-${flow.to}`,
        from: flow.from,
        to: flow.to,
        type: flow.type,
        description: `AI data flows from ${flow.from} to ${flow.to} via ${flow.type}`
      });
    }

    return flows;
  }

  /**
   * Analyze database flows
   */
  async analyzeDatabaseFlows() {
    const flows = [];
    
    // Database-specific flows
    const dbFlows = [
      { from: 'User Data', to: 'Users Table', type: 'User Registration' },
      { from: 'Calculation Input', to: 'Mortgage Calculations', type: 'Calculation Storage' },
      { from: 'Rate Data', to: 'Rate Checks', type: 'Rate History' },
      { from: 'Lead Data', to: 'Leads Table', type: 'Lead Storage' }
    ];

    for (const flow of dbFlows) {
      flows.push({
        id: `db-flow-${flow.from}-${flow.to}`,
        from: flow.from,
        to: flow.to,
        type: flow.type,
        description: `Database flow from ${flow.from} to ${flow.to} via ${flow.type}`
      });
    }

    return flows;
  }

  /**
   * Generate Mermaid diagram
   */
  async generateMermaidDiagram() {
    console.log('🎨 Generating Mermaid diagram...');

    let mermaid = `graph TB\n`;
    
    // Add components
    for (const component of this.components) {
      const shape = this.getMermaidShape(component.type);
      mermaid += `    ${component.id}["${component.name}"]\n`;
    }
    
    // Add relationships
    for (const relationship of this.relationships) {
      const arrow = this.getMermaidArrow(relationship.type);
      mermaid += `    ${relationship.source} ${arrow} ${relationship.target}\n`;
    }
    
    return mermaid;
  }

  /**
   * Get Mermaid shape for component type
   */
  getMermaidShape(type) {
    const shapes = {
      'Page': 'rect',
      'Component': 'rect',
      'API Route': 'rect',
      'Edge Function': 'rect',
      'AI Agent': 'rect',
      'Watcher': 'rect',
      'Database Table': 'rect',
      'CI/CD Workflow': 'rect',
      'Configuration': 'rect'
    };
    
    return shapes[type] || 'rect';
  }

  /**
   * Get Mermaid arrow for relationship type
   */
  getMermaidArrow(type) {
    const arrows = {
      'depends_on': '-->',
      'data_flow': '==>',
      'uses': '-->',
      'calls': '-->'
    };
    
    return arrows[type] || '-->';
  }

  /**
   * Generate SVG diagram
   */
  async generateSVGDiagram() {
    console.log('🎨 Generating SVG diagram...');

    // This is a simplified SVG generator
    // In a real implementation, you would use a proper diagramming library
    let svg = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">\n`;
    
    // Add title
    svg += `  <text x="400" y="30" text-anchor="middle" font-size="20" font-weight="bold">MortgageMatch Pro Architecture</text>\n`;
    
    // Add components as rectangles
    let y = 80;
    const categories = ['Frontend', 'Backend', 'AI', 'Database', 'Infrastructure'];
    
    for (const category of categories) {
      const categoryComponents = this.components.filter(c => c.category === category);
      if (categoryComponents.length > 0) {
        svg += `  <text x="20" y="${y}" font-size="16" font-weight="bold">${category}</text>\n`;
        y += 30;
        
        for (const component of categoryComponents) {
          svg += `  <rect x="40" y="${y}" width="120" height="40" fill="lightblue" stroke="black" stroke-width="1"/>\n`;
          svg += `  <text x="100" y="${y + 25}" text-anchor="middle" font-size="12">${component.name}</text>\n`;
          y += 60;
        }
        y += 20;
      }
    }
    
    svg += `</svg>`;
    
    return svg;
  }

  /**
   * Generate comprehensive documentation
   */
  async generateDocumentation() {
    const prompt = `
Generate comprehensive architecture documentation for the following system:

COMPONENTS (${this.components.length}):
${this.components.map(c => `- ${c.name} (${c.type}): ${c.description}`).join('\n')}

RELATIONSHIPS (${this.relationships.length}):
${this.relationships.map(r => `- ${r.source} -> ${r.target}: ${r.description}`).join('\n')}

DATA FLOWS (${this.dataFlows.length}):
${this.dataFlows.map(f => `- ${f.from} -> ${f.to}: ${f.type}`).join('\n')}

Please create:
1. System overview
2. Component descriptions
3. Data flow diagrams
4. Technology stack
5. Deployment architecture
6. Security considerations
7. Performance characteristics
8. Scalability considerations

Format as Markdown with clear sections and diagrams.
    `.trim();

    if (!openai) {
      console.log('⚠️ OpenAI API key not available, using fallback documentation');
      return this.generateFallbackDocumentation();
    }

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert software architect. Create comprehensive, clear, and detailed architecture documentation.'
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
      return this.generateFallbackDocumentation();
    }
  }

  /**
   * Generate fallback documentation
   */
  generateFallbackDocumentation() {
    let markdown = `# MortgageMatch Pro Architecture\n\n`;
    markdown += `## System Overview\n\n`;
    markdown += `MortgageMatch Pro is a comprehensive mortgage intelligence platform with AI-powered features and automated monitoring.\n\n`;
    markdown += `## Components\n\n`;
    
    const categories = ['Frontend', 'Backend', 'AI', 'Database', 'Infrastructure'];
    for (const category of categories) {
      const categoryComponents = this.components.filter(c => c.category === category);
      if (categoryComponents.length > 0) {
        markdown += `### ${category}\n\n`;
        for (const component of categoryComponents) {
          markdown += `- **${component.name}** (${component.type}): ${component.description}\n`;
        }
        markdown += `\n`;
      }
    }
    
    markdown += `## Data Flows\n\n`;
    for (const flow of this.dataFlows) {
      markdown += `- ${flow.from} → ${flow.to}: ${flow.type}\n`;
    }
    
    return markdown;
  }

  /**
   * Save architecture files
   */
  async saveArchitectureFiles(mermaidDiagram, svgDiagram, documentation) {
    // Ensure docs directory exists
    await fs.mkdir('docs', { recursive: true });
    
    // Save Mermaid diagram
    await fs.writeFile('docs/architecture_map.mmd', mermaidDiagram, 'utf8');
    console.log('🎨 Mermaid diagram saved to docs/architecture_map.mmd');
    
    // Save SVG diagram
    await fs.writeFile('docs/architecture_map.svg', svgDiagram, 'utf8');
    console.log('🎨 SVG diagram saved to docs/architecture_map.svg');
    
    // Save documentation
    await fs.writeFile('docs/architecture_map.md', documentation, 'utf8');
    console.log('📚 Architecture documentation saved to docs/architecture_map.md');
    
    // Save component summary
    const componentSummary = this.generateComponentSummary();
    await fs.writeFile('docs/components.md', componentSummary, 'utf8');
    console.log('📋 Component summary saved to docs/components.md');
  }

  /**
   * Generate component summary
   */
  generateComponentSummary() {
    let markdown = `# System Components Summary\n\n`;
    markdown += `Total Components: ${this.components.length}\n\n`;
    
    const categories = ['Frontend', 'Backend', 'AI', 'Database', 'Infrastructure'];
    for (const category of categories) {
      const categoryComponents = this.components.filter(c => c.category === category);
      if (categoryComponents.length > 0) {
        markdown += `## ${category} (${categoryComponents.length})\n\n`;
        for (const component of categoryComponents) {
          markdown += `- **${component.name}**: ${component.description}\n`;
        }
        markdown += `\n`;
      }
    }
    
    return markdown;
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new ArchitectureMapGenerator();
  
  generator.generateArchitectureMap()
    .then((result) => {
      console.log('✅ Architecture map generated successfully');
      console.log(`Components: ${generator.components.length}`);
      console.log(`Relationships: ${generator.relationships.length}`);
      console.log(`Data flows: ${generator.dataFlows.length}`);
    })
    .catch((error) => {
      console.error('❌ Error generating architecture map:', error);
      process.exit(1);
    });
}