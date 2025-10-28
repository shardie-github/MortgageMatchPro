#!/usr/bin/env node

/**
 * AI Agent Onboarding Script
 * Trains new AI agents (Cursor, Perplexity, Claude) on repo context
 * Provides comprehensive knowledge base for future automation
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

class AIAgentOnboarder {
  constructor() {
    this.repoContext = {
      name: 'MortgageMatch Pro',
      description: 'AI-powered mortgage intelligence mobile app with advanced analytics and broker portal',
      version: '1.0.0',
      techStack: [],
      architecture: {},
      features: [],
      apis: [],
      databases: [],
      aiModels: [],
      compliance: {},
      security: {},
      performance: {},
      deployment: {}
    };
  }

  /**
   * Main onboarding function
   */
  async onboardAgents() {
    console.log('🤖 Starting AI agent onboarding...');

    try {
      // 1. Analyze repository structure
      await this.analyzeRepository();
      
      // 2. Extract technical documentation
      await this.extractTechnicalDocs();
      
      // 3. Analyze codebase patterns
      await this.analyzeCodebasePatterns();
      
      // 4. Generate agent knowledge base
      const knowledgeBase = await this.generateKnowledgeBase();
      
      // 5. Store in Supabase
      await this.storeKnowledgeBase(knowledgeBase);
      
      // 6. Generate agent instructions
      await this.generateAgentInstructions(knowledgeBase);
      
      // 7. Create agent configuration
      await this.createAgentConfig(knowledgeBase);
      
      console.log('✅ AI agent onboarding completed successfully');
      return knowledgeBase;

    } catch (error) {
      console.error('❌ Error during AI agent onboarding:', error);
      throw error;
    }
  }

  /**
   * Analyze repository structure
   */
  async analyzeRepository() {
    console.log('📁 Analyzing repository structure...');

    try {
      // Get all files
      const files = await glob('**/*', { 
        ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**', '*.log'] 
      });

      // Categorize files
      const categories = {
        source: files.filter(f => f.match(/\.(ts|tsx|js|jsx)$/)),
        config: files.filter(f => f.match(/\.(json|yaml|yml|toml|js)$/)),
        docs: files.filter(f => f.match(/\.(md|txt)$/)),
        tests: files.filter(f => f.match(/\.(test|spec)\.(ts|tsx|js|jsx)$/)),
        scripts: files.filter(f => f.startsWith('scripts/')),
        workflows: files.filter(f => f.startsWith('.github/workflows/')),
        ai: files.filter(f => f.startsWith('ai/')),
        watchers: files.filter(f => f.startsWith('watchers/'))
      };

      this.repoContext.structure = {
        totalFiles: files.length,
        categories: Object.keys(categories).reduce((acc, key) => {
          acc[key] = categories[key].length;
          return acc;
        }, {}),
        fileList: categories
      };

      console.log(`📊 Repository analysis complete: ${files.length} files across ${Object.keys(categories).length} categories`);

    } catch (error) {
      console.error('Error analyzing repository:', error);
    }
  }

  /**
   * Extract technical documentation
   */
  async extractTechnicalDocs() {
    console.log('📚 Extracting technical documentation...');

    try {
      const docFiles = [
        'README.md',
        'ARCHITECTURE_OVERVIEW.md',
        'AI_COMPLIANCE.md',
        'SUSTAINABILITY.md',
        'AI_AUTOMATION_README.md',
        'DEPLOYMENT_GUIDE.md',
        'DATABASE_SETUP.md'
      ];

      const docs = {};
      
      for (const docFile of docFiles) {
        try {
          const content = await fs.readFile(docFile, 'utf8');
          docs[docFile] = content;
        } catch (error) {
          console.log(`Document ${docFile} not found, skipping...`);
        }
      }

      this.repoContext.documentation = docs;
      console.log(`📖 Extracted ${Object.keys(docs).length} documentation files`);

    } catch (error) {
      console.error('Error extracting documentation:', error);
    }
  }

  /**
   * Analyze codebase patterns
   */
  async analyzeCodebasePatterns() {
    console.log('🔍 Analyzing codebase patterns...');

    try {
      // Analyze package.json
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
      
      this.repoContext.techStack = {
        framework: 'Next.js',
        language: 'TypeScript',
        database: 'Supabase',
        ai: 'OpenAI',
        mobile: 'React Native',
        dependencies: packageJson.dependencies,
        devDependencies: packageJson.devDependencies
      };

      // Analyze key configuration files
      const configFiles = [
        'next.config.js',
        'tailwind.config.js',
        'tsconfig.json',
        'jest.config.js',
        'playwright.config.ts'
      ];

      const configs = {};
      for (const configFile of configFiles) {
        try {
          const content = await fs.readFile(configFile, 'utf8');
          configs[configFile] = content;
        } catch (error) {
          console.log(`Config file ${configFile} not found, skipping...`);
        }
      }

      this.repoContext.configurations = configs;

      // Analyze AI components
      const aiComponents = await this.analyzeAIComponents();
      this.repoContext.aiComponents = aiComponents;

      console.log('🔍 Codebase pattern analysis complete');

    } catch (error) {
      console.error('Error analyzing codebase patterns:', error);
    }
  }

  /**
   * Analyze AI components
   */
  async analyzeAIComponents() {
    const aiComponents = {
      agents: [],
      watchers: [],
      scripts: [],
      workflows: []
    };

    try {
      // Analyze AI agents
      const aiFiles = await glob('ai/*.ts');
      for (const file of aiFiles) {
        const content = await fs.readFile(file, 'utf8');
        const name = path.basename(file, '.ts');
        const description = this.extractDescription(content);
        const functions = this.extractFunctions(content);
        
        aiComponents.agents.push({
          name,
          file,
          description,
          functions,
          type: 'agent'
        });
      }

      // Analyze watchers
      const watcherFiles = await glob('watchers/*.ts');
      for (const file of watcherFiles) {
        const content = await fs.readFile(file, 'utf8');
        const name = path.basename(file, '.ts');
        const description = this.extractDescription(content);
        const functions = this.extractFunctions(content);
        
        aiComponents.watchers.push({
          name,
          file,
          description,
          functions,
          type: 'watcher'
        });
      }

      // Analyze scripts
      const scriptFiles = await glob('scripts/*.mjs');
      for (const file of scriptFiles) {
        const content = await fs.readFile(file, 'utf8');
        const name = path.basename(file, '.mjs');
        const description = this.extractDescription(content);
        
        aiComponents.scripts.push({
          name,
          file,
          description,
          type: 'script'
        });
      }

      // Analyze workflows
      const workflowFiles = await glob('.github/workflows/*.yml');
      for (const file of workflowFiles) {
        const content = await fs.readFile(file, 'utf8');
        const name = path.basename(file, '.yml');
        const description = this.extractWorkflowDescription(content);
        
        aiComponents.workflows.push({
          name,
          file,
          description,
          type: 'workflow'
        });
      }

    } catch (error) {
      console.error('Error analyzing AI components:', error);
    }

    return aiComponents;
  }

  /**
   * Extract description from code
   */
  extractDescription(content) {
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes('*') && line.includes('Purpose:') || line.includes('Description:')) {
        return line.replace(/[/*]/g, '').trim();
      }
    }
    return 'No description available';
  }

  /**
   * Extract functions from code
   */
  extractFunctions(content) {
    const functions = [];
    const functionRegex = /(?:function|const|async)\s+(\w+)\s*[=\(]/g;
    let match;
    
    while ((match = functionRegex.exec(content)) !== null) {
      functions.push(match[1]);
    }
    
    return functions;
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
   * Generate comprehensive knowledge base
   */
  async generateKnowledgeBase() {
    console.log('🧠 Generating AI knowledge base...');

    const prompt = `
Create a comprehensive knowledge base for AI agents working on this repository:

REPOSITORY CONTEXT:
${JSON.stringify(this.repoContext, null, 2)}

Please generate:
1. System architecture overview
2. Key features and capabilities
3. AI agent responsibilities
4. Code patterns and conventions
5. API endpoints and data models
6. Security and compliance requirements
7. Performance considerations
8. Deployment and operations
9. Troubleshooting guide
10. Best practices

Format as structured JSON with detailed explanations for each section.
    `.trim();

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert software architect creating comprehensive documentation for AI agents. Provide detailed, actionable information.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      });

      const knowledgeBase = JSON.parse(response.choices[0].message.content);
      
      // Add repository context
      knowledgeBase.repository = this.repoContext;
      knowledgeBase.generated_at = new Date().toISOString();
      knowledgeBase.version = '1.0.0';

      return knowledgeBase;

    } catch (error) {
      console.error('Error generating knowledge base with AI:', error);
      return this.generateFallbackKnowledgeBase();
    }
  }

  /**
   * Generate fallback knowledge base
   */
  generateFallbackKnowledgeBase() {
    return {
      repository: this.repoContext,
      generated_at: new Date().toISOString(),
      version: '1.0.0',
      architecture: {
        overview: 'Next.js + React Native hybrid application with AI-powered features',
        components: ['Web App', 'Mobile App', 'AI Agents', 'Database', 'APIs'],
        patterns: ['Component-based', 'AI-driven', 'Event-driven', 'Microservices']
      },
      features: [
        'Mortgage calculations',
        'Rate checking',
        'AI insights',
        'Broker portal',
        'Analytics dashboard'
      ],
      ai_agents: this.repoContext.aiComponents?.agents || [],
      watchers: this.repoContext.aiComponents?.watchers || [],
      scripts: this.repoContext.aiComponents?.scripts || [],
      workflows: this.repoContext.aiComponents?.workflows || [],
      best_practices: [
        'Follow TypeScript conventions',
        'Use AI agents for automation',
        'Maintain privacy compliance',
        'Monitor performance metrics',
        'Test thoroughly before deployment'
      ]
    };
  }

  /**
   * Store knowledge base in Supabase
   */
  async storeKnowledgeBase(knowledgeBase) {
    try {
      const { error } = await supabase
        .from('ai_knowledge_base')
        .insert({
          version: knowledgeBase.version,
          generated_at: knowledgeBase.generated_at,
          content: knowledgeBase,
          repository_context: knowledgeBase.repository
        });

      if (error) {
        console.error('Error storing knowledge base:', error);
      } else {
        console.log('💾 Knowledge base stored in Supabase');
      }
    } catch (error) {
      console.error('Error storing knowledge base:', error);
    }
  }

  /**
   * Generate agent instructions
   */
  async generateAgentInstructions(knowledgeBase) {
    console.log('📝 Generating agent instructions...');

    const instructions = {
      cursor_ai: this.generateCursorInstructions(knowledgeBase),
      perplexity: this.generatePerplexityInstructions(knowledgeBase),
      claude: this.generateClaudeInstructions(knowledgeBase),
      general: this.generateGeneralInstructions(knowledgeBase)
    };

    // Save instructions to files
    for (const [agent, instruction] of Object.entries(instructions)) {
      const filename = `ai/instructions_${agent}.md`;
      await fs.writeFile(filename, instruction, 'utf8');
      console.log(`📝 Generated instructions for ${agent}`);
    }

    return instructions;
  }

  /**
   * Generate Cursor AI instructions
   */
  generateCursorInstructions(knowledgeBase) {
    return `# Cursor AI Instructions for MortgageMatch Pro

## Repository Overview
${knowledgeBase.repository.description}

## Key Technologies
- **Framework**: Next.js + React Native
- **Language**: TypeScript
- **Database**: Supabase
- **AI**: OpenAI GPT-4
- **Mobile**: React Native

## AI Agents Available
${knowledgeBase.ai_agents?.map(agent => `- **${agent.name}**: ${agent.description}`).join('\n') || 'No agents available'}

## Code Patterns
- Use TypeScript for all new code
- Follow component-based architecture
- Implement proper error handling
- Use AI agents for automation tasks
- Maintain privacy compliance

## Common Tasks
1. **Feature Development**: Use existing patterns and components
2. **Bug Fixes**: Test thoroughly and update documentation
3. **AI Integration**: Leverage existing AI agents and patterns
4. **Performance**: Monitor and optimize using built-in tools
5. **Security**: Follow privacy guard guidelines

## Best Practices
- Always test changes locally
- Use AI agents for repetitive tasks
- Maintain code quality standards
- Document new features
- Follow security guidelines

## Troubleshooting
- Check AI agent logs for automation issues
- Use built-in monitoring tools
- Review privacy compliance
- Test with different user scenarios
`;
  }

  /**
   * Generate Perplexity instructions
   */
  generatePerplexityInstructions(knowledgeBase) {
    return `# Perplexity AI Instructions for MortgageMatch Pro

## System Context
You are working with a mortgage intelligence application that uses AI for calculations, insights, and automation.

## Key Areas
- **Mortgage Calculations**: Core business logic
- **AI Agents**: Automated monitoring and analysis
- **Privacy Compliance**: GDPR, CCPA, PIPEDA
- **Performance**: Monitoring and optimization
- **Security**: Data protection and access control

## Available AI Agents
${knowledgeBase.ai_agents?.map(agent => `- ${agent.name}: ${agent.description}`).join('\n') || 'No agents available'}

## When to Use AI Agents
- Health monitoring and diagnostics
- Performance analysis
- Privacy compliance checking
- Cost optimization
- Automated issue detection

## Code Guidelines
- TypeScript preferred
- Component-based architecture
- Proper error handling
- Privacy-first design
- Performance optimization

## Common Issues
- Database integrity problems
- API contract violations
- Performance degradation
- Privacy compliance gaps
- Cost overruns

## Solutions
- Use appropriate AI agents
- Follow established patterns
- Test thoroughly
- Monitor continuously
- Document changes
`;
  }

  /**
   * Generate Claude instructions
   */
  generateClaudeInstructions(knowledgeBase) {
    return `# Claude AI Instructions for MortgageMatch Pro

## Project Overview
A comprehensive mortgage intelligence platform with AI-powered features and automated monitoring.

## Architecture
- **Frontend**: Next.js web app + React Native mobile
- **Backend**: Supabase with Edge Functions
- **AI**: OpenAI integration with custom agents
- **Monitoring**: Automated watchers and health checks

## AI Agent Ecosystem
${knowledgeBase.ai_agents?.map(agent => `- **${agent.name}**: ${agent.description}`).join('\n') || 'No agents available'}

## Development Workflow
1. **Planning**: Use AI agents for analysis
2. **Development**: Follow TypeScript patterns
3. **Testing**: Automated and manual testing
4. **Deployment**: CI/CD with AI monitoring
5. **Monitoring**: Continuous health checks

## Key Responsibilities
- Maintain code quality and consistency
- Ensure privacy compliance
- Optimize performance
- Monitor system health
- Automate repetitive tasks

## Code Standards
- TypeScript for type safety
- Component-based architecture
- Proper error handling
- Privacy-first design
- Performance optimization

## AI Agent Usage
- **Health Monitoring**: Use self_diagnose.ts
- **Insights**: Use insights_agent.mjs
- **Scaling**: Use ai_autoscale.ts
- **Privacy**: Use privacy_guard.ts
- **Watching**: Use watchers for monitoring

## Best Practices
- Test all changes locally
- Use AI agents for automation
- Maintain documentation
- Follow security guidelines
- Monitor performance metrics
`;
  }

  /**
   * Generate general instructions
   */
  generateGeneralInstructions(knowledgeBase) {
    return `# General AI Agent Instructions for MortgageMatch Pro

## System Overview
${knowledgeBase.repository.description}

## Technology Stack
- **Frontend**: Next.js, React Native, TypeScript
- **Backend**: Supabase, Edge Functions
- **AI**: OpenAI GPT-4, Custom Agents
- **Database**: PostgreSQL (Supabase)
- **Monitoring**: Custom Watchers, Health Checks

## AI Agent Architecture
The system includes multiple AI agents for different purposes:

### Core Agents
${knowledgeBase.ai_agents?.map(agent => `- **${agent.name}**: ${agent.description}`).join('\n') || 'No agents available'}

### Monitoring Watchers
${knowledgeBase.watchers?.map(watcher => `- **${watcher.name}**: ${watcher.description}`).join('\n') || 'No watchers available'}

### Utility Scripts
${knowledgeBase.scripts?.map(script => `- **${script.name}**: ${script.description}`).join('\n') || 'No scripts available'}

## Development Guidelines
1. **Code Quality**: Use TypeScript, follow patterns
2. **AI Integration**: Leverage existing agents
3. **Privacy**: Follow compliance guidelines
4. **Performance**: Monitor and optimize
5. **Security**: Implement proper controls

## Common Tasks
- **Feature Development**: Use existing patterns
- **Bug Fixes**: Test and document changes
- **AI Automation**: Use appropriate agents
- **Monitoring**: Check system health
- **Optimization**: Use performance tools

## Troubleshooting
- Check AI agent logs
- Review system health metrics
- Verify privacy compliance
- Test with different scenarios
- Use built-in debugging tools

## Best Practices
- Always test changes
- Use AI agents for automation
- Maintain code quality
- Document new features
- Follow security guidelines
`;
  }

  /**
   * Create agent configuration
   */
  async createAgentConfig(knowledgeBase) {
    const config = {
      version: '1.0.0',
      generated_at: new Date().toISOString(),
      agents: knowledgeBase.ai_agents || [],
      watchers: knowledgeBase.watchers || [],
      scripts: knowledgeBase.scripts || [],
      workflows: knowledgeBase.workflows || [],
      capabilities: {
        health_monitoring: true,
        performance_analysis: true,
        privacy_compliance: true,
        cost_optimization: true,
        automated_scaling: true,
        issue_detection: true,
        documentation_generation: true
      },
      integrations: {
        supabase: true,
        openai: true,
        github: true,
        vercel: true
      },
      monitoring: {
        database_integrity: true,
        api_contracts: true,
        ai_performance: true,
        system_health: true
      }
    };

    await fs.writeFile('ai/agent_config.json', JSON.stringify(config, null, 2), 'utf8');
    console.log('⚙️ Agent configuration created');
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const onboarder = new AIAgentOnboarder();
  
  onboarder.onboardAgents()
    .then((knowledgeBase) => {
      console.log('✅ AI agent onboarding completed successfully');
      console.log(`Agents: ${knowledgeBase.ai_agents?.length || 0}`);
      console.log(`Watchers: ${knowledgeBase.watchers?.length || 0}`);
      console.log(`Scripts: ${knowledgeBase.scripts?.length || 0}`);
      console.log(`Workflows: ${knowledgeBase.workflows?.length || 0}`);
    })
    .catch((error) => {
      console.error('❌ Error during AI agent onboarding:', error);
      process.exit(1);
    });
}