/**
 * Generate Embeddings CLI Utility
 * Syncs product copy, docs, or user data via OpenAI Embeddings v3
 * Stores embeddings in Supabase ai_embeddings table
 */

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

class EmbeddingsGenerator {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    this.embeddingModel = 'text-embedding-3-small';
    this.batchSize = 100; // Process in batches to avoid rate limits
  }

  /**
   * Main function to generate embeddings for different content types
   */
  async generateEmbeddings(options = {}) {
    const {
      type = 'docs', // 'docs', 'product', 'user_data', 'all'
      namespace = 'default',
      force = false
    } = options;

    console.log(`🚀 Starting embeddings generation for type: ${type}`);

    try {
      let content = [];

      switch (type) {
        case 'docs':
          content = await this.extractDocumentation();
          break;
        case 'product':
          content = await this.extractProductContent();
          break;
        case 'user_data':
          content = await this.extractUserData();
          break;
        case 'all':
          content = [
            ...await this.extractDocumentation(),
            ...await this.extractProductContent(),
            ...await this.extractUserData()
          ];
          break;
        default:
          throw new Error(`Unknown content type: ${type}`);
      }

      console.log(`📄 Found ${content.length} content items to process`);

      if (content.length === 0) {
        console.log('⚠️ No content found to process');
        return;
      }

      // Check if embeddings already exist
      if (!force) {
        const existingCount = await this.getExistingEmbeddingsCount(namespace);
        if (existingCount > 0) {
          console.log(`⚠️ Found ${existingCount} existing embeddings for namespace '${namespace}'`);
          console.log('Use --force flag to regenerate embeddings');
          return;
        }
      }

      // Generate embeddings in batches
      const batches = this.chunkArray(content, this.batchSize);
      let processed = 0;

      for (const [index, batch] of batches.entries()) {
        console.log(`📦 Processing batch ${index + 1}/${batches.length} (${batch.length} items)`);
        
        const embeddings = await this.generateBatchEmbeddings(batch);
        await this.storeEmbeddings(embeddings, namespace);
        
        processed += batch.length;
        console.log(`✅ Processed ${processed}/${content.length} items`);
        
        // Rate limiting
        if (index < batches.length - 1) {
          await this.delay(1000);
        }
      }

      console.log('🎉 Embeddings generation completed successfully!');

    } catch (error) {
      console.error('❌ Error generating embeddings:', error);
      throw error;
    }
  }

  /**
   * Extract documentation content
   */
  async extractDocumentation() {
    const content = [];
    const docFiles = await glob('**/*.md', { 
      ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'] 
    });

    for (const file of docFiles) {
      try {
        const text = await fs.readFile(file, 'utf-8');
        const sections = this.splitIntoChunks(text, 1000); // Split large docs
        
        for (const [index, section] of sections.entries()) {
          content.push({
            id: `doc_${path.basename(file)}_${index}`,
            text: section,
            metadata: {
              source: 'documentation',
              file: file,
              section: index,
              title: this.extractTitle(section),
              type: 'markdown'
            }
          });
        }
      } catch (error) {
        console.warn(`⚠️ Could not process ${file}:`, error.message);
      }
    }

    return content;
  }

  /**
   * Extract product content (API descriptions, feature descriptions, etc.)
   */
  async extractProductContent() {
    const content = [];

    // Extract from API routes
    const apiFiles = await glob('pages/api/**/*.{ts,js}', {
      ignore: ['node_modules/**', '.git/**']
    });

    for (const file of apiFiles) {
      try {
        const text = await fs.readFile(file, 'utf-8');
        const apiInfo = this.extractAPIInfo(text, file);
        
        if (apiInfo) {
          content.push({
            id: `api_${path.basename(file, path.extname(file))}`,
            text: apiInfo.description,
            metadata: {
              source: 'api',
              file: file,
              method: apiInfo.method,
              endpoint: apiInfo.endpoint,
              type: 'api_route'
            }
          });
        }
      } catch (error) {
        console.warn(`⚠️ Could not process API file ${file}:`, error.message);
      }
    }

    // Extract from component descriptions
    const componentFiles = await glob('components/**/*.{tsx,jsx}', {
      ignore: ['node_modules/**', '.git/**']
    });

    for (const file of componentFiles) {
      try {
        const text = await fs.readFile(file, 'utf-8');
        const componentInfo = this.extractComponentInfo(text, file);
        
        if (componentInfo) {
          content.push({
            id: `component_${path.basename(file, path.extname(file))}`,
            text: componentInfo.description,
            metadata: {
              source: 'component',
              file: file,
              props: componentInfo.props,
              type: 'react_component'
            }
          });
        }
      } catch (error) {
        console.warn(`⚠️ Could not process component file ${file}:`, error.message);
      }
    }

    return content;
  }

  /**
   * Extract user data (simulated - in production, this would be real user data)
   */
  async extractUserData() {
    const content = [];

    // In a real implementation, you would query your user data
    // For now, we'll create some sample content
    const sampleUserData = [
      {
        id: 'user_feedback_1',
        text: 'Users frequently ask about mortgage rate calculations and affordability checks',
        metadata: {
          source: 'user_feedback',
          type: 'feedback',
          category: 'feature_request'
        }
      },
      {
        id: 'user_behavior_1',
        text: 'Users spend most time on rate comparison and scenario planning features',
        metadata: {
          source: 'analytics',
          type: 'behavior',
          category: 'usage_pattern'
        }
      }
    ];

    return sampleUserData;
  }

  /**
   * Generate embeddings for a batch of content
   */
  async generateBatchEmbeddings(contentBatch) {
    try {
      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: contentBatch.map(item => item.text),
        encoding_format: 'float'
      });

      return contentBatch.map((item, index) => ({
        id: item.id,
        namespace: 'default',
        embedding: response.data[index].embedding,
        text: item.text,
        metadata: item.metadata
      }));

    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw error;
    }
  }

  /**
   * Store embeddings in Supabase
   */
  async storeEmbeddings(embeddings, namespace) {
    try {
      const embeddingsWithNamespace = embeddings.map(emb => ({
        ...emb,
        namespace
      }));

      const { error } = await this.supabase
        .from('ai_embeddings')
        .upsert(embeddingsWithNamespace, { 
          onConflict: 'id,namespace',
          ignoreDuplicates: false 
        });

      if (error) {
        throw new Error(`Failed to store embeddings: ${error.message}`);
      }

      console.log(`💾 Stored ${embeddings.length} embeddings in namespace '${namespace}'`);

    } catch (error) {
      console.error('Error storing embeddings:', error);
      throw error;
    }
  }

  /**
   * Split text into chunks for processing
   */
  splitIntoChunks(text, maxLength) {
    const chunks = [];
    const sentences = text.split(/[.!?]+/);
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxLength && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Extract title from markdown content
   */
  extractTitle(text) {
    const titleMatch = text.match(/^#\s+(.+)$/m);
    return titleMatch ? titleMatch[1] : 'Untitled';
  }

  /**
   * Extract API information from file content
   */
  extractAPIInfo(text, filePath) {
    const methodMatch = text.match(/(GET|POST|PUT|DELETE|PATCH)/);
    const commentMatch = text.match(/\/\*\*([\s\S]*?)\*\//);
    
    if (!methodMatch) return null;

    const endpoint = filePath.replace('pages/api', '').replace(/\.(ts|js)$/, '');
    const description = commentMatch ? commentMatch[1].replace(/\*/g, '').trim() : 'API endpoint';

    return {
      method: methodMatch[1],
      endpoint,
      description
    };
  }

  /**
   * Extract component information from file content
   */
  extractComponentInfo(text, filePath) {
    const commentMatch = text.match(/\/\*\*([\s\S]*?)\*\//);
    const propsMatch = text.match(/interface\s+\w+Props\s*{([\s\S]*?)}/);
    
    if (!commentMatch) return null;

    const description = commentMatch[1].replace(/\*/g, '').trim();
    const props = propsMatch ? propsMatch[1].split('\n').map(p => p.trim()).filter(p => p) : [];

    return {
      description,
      props
    };
  }

  /**
   * Get count of existing embeddings for namespace
   */
  async getExistingEmbeddingsCount(namespace) {
    try {
      const { count, error } = await this.supabase
        .from('ai_embeddings')
        .select('*', { count: 'exact', head: true })
        .eq('namespace', namespace);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.warn('Could not check existing embeddings:', error.message);
      return 0;
    }
  }

  /**
   * Chunk array into smaller batches
   */
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Delay function for rate limiting
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Search embeddings
   */
  async searchEmbeddings(query, namespace = 'default', limit = 10) {
    try {
      // Generate embedding for query
      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: query,
        encoding_format: 'float'
      });

      const queryEmbedding = response.data[0].embedding;

      // Search in Supabase using vector similarity
      const { data, error } = await this.supabase.rpc('search_embeddings', {
        query_embedding: queryEmbedding,
        match_namespace: namespace,
        match_threshold: 0.7,
        match_count: limit
      });

      if (error) throw error;

      return data || [];

    } catch (error) {
      console.error('Error searching embeddings:', error);
      throw error;
    }
  }

  /**
   * Clean up old embeddings
   */
  async cleanupEmbeddings(namespace, olderThanDays = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const { error } = await this.supabase
        .from('ai_embeddings')
        .delete()
        .eq('namespace', namespace)
        .lt('created_at', cutoffDate.toISOString());

      if (error) throw error;

      console.log(`🧹 Cleaned up old embeddings for namespace '${namespace}'`);

    } catch (error) {
      console.error('Error cleaning up embeddings:', error);
      throw error;
    }
  }
}

// Export for use in other modules
export { EmbeddingsGenerator };

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new EmbeddingsGenerator();
  
  const args = process.argv.slice(2);
  const options = {
    type: 'docs',
    namespace: 'default',
    force: false
  };

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--type':
        options.type = args[++i];
        break;
      case '--namespace':
        options.namespace = args[++i];
        break;
      case '--force':
        options.force = true;
        break;
      case '--search':
        const query = args[++i];
        generator.searchEmbeddings(query, options.namespace)
          .then(results => {
            console.log('Search results:', results);
            process.exit(0);
          })
          .catch(error => {
            console.error('Search failed:', error);
            process.exit(1);
          });
        break;
      case '--cleanup':
        generator.cleanupEmbeddings(options.namespace)
          .then(() => {
            console.log('Cleanup completed');
            process.exit(0);
          })
          .catch(error => {
            console.error('Cleanup failed:', error);
            process.exit(1);
          });
        break;
      case '--help':
        console.log(`
Usage: node generate-embeddings.mjs [options]

Options:
  --type <type>        Content type: docs, product, user_data, all (default: docs)
  --namespace <ns>     Namespace for embeddings (default: default)
  --force              Force regeneration of existing embeddings
  --search <query>     Search embeddings
  --cleanup            Clean up old embeddings
  --help               Show this help message

Examples:
  node generate-embeddings.mjs --type docs --namespace documentation
  node generate-embeddings.mjs --type all --force
  node generate-embeddings.mjs --search "mortgage calculation"
        `.trim());
        process.exit(0);
        break;
    }
  }

  generator.generateEmbeddings(options)
    .then(() => {
      console.log('Embeddings generation completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Embeddings generation failed:', error);
      process.exit(1);
    });
}