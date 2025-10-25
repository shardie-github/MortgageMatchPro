#!/usr/bin/env node

/**
 * Fine-Tuning Execution Script
 * v1.2.0 - Calls OpenAI fine-tune endpoint with prepared datasets
 */

import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const BASE_MODEL = 'gpt-3.5-turbo'
const TRAINING_DIR = path.join(__dirname, 'datasets')
const RESULTS_DIR = path.join(__dirname, 'results')

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
})

class FineTuningService {
  constructor() {
    this.ensureDirectories()
  }

  /**
   * Run fine-tuning job
   */
  async runFineTune(datasetPath, options = {}) {
    try {
      console.log('🚀 Starting fine-tuning process...')
      console.log(`Dataset: ${datasetPath}`)

      // Validate dataset
      const dataset = this.loadDataset(datasetPath)
      const validation = await this.validateDataset(dataset)
      
      if (!validation.isValid) {
        console.error('❌ Dataset validation failed:')
        validation.issues.forEach(issue => console.error(`  - ${issue}`))
        validation.recommendations.forEach(rec => console.log(`  💡 ${rec}`))
        process.exit(1)
      }

      console.log('✅ Dataset validation passed')

      // Upload training file
      console.log('📤 Uploading training file...')
      const trainingFile = await this.uploadTrainingFile(datasetPath)
      console.log(`✅ Training file uploaded: ${trainingFile.id}`)

      // Create fine-tuning job
      console.log('🔧 Creating fine-tuning job...')
      const fineTuneJob = await this.createFineTuneJob(trainingFile.id, options)
      console.log(`✅ Fine-tuning job created: ${fineTuneJob.id}`)

      // Monitor job progress
      console.log('⏳ Monitoring job progress...')
      const completedJob = await this.monitorJob(fineTuneJob.id)

      // Save results
      const results = await this.saveResults(completedJob, dataset)
      console.log('✅ Fine-tuning completed successfully!')
      console.log(`📊 Results saved to: ${results.resultsPath}`)

      return results

    } catch (error) {
      console.error('❌ Fine-tuning failed:', error.message)
      throw error
    }
  }

  /**
   * List available datasets
   */
  listDatasets() {
    try {
      const files = fs.readdirSync(TRAINING_DIR)
      const datasets = files
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(TRAINING_DIR, file)
          const stats = fs.statSync(filePath)
          return {
            name: file,
            path: filePath,
            size: stats.size,
            modified: stats.mtime
          }
        })

      console.log('📁 Available datasets:')
      datasets.forEach(dataset => {
        console.log(`  - ${dataset.name} (${this.formatFileSize(dataset.size)}, ${dataset.modified.toISOString()})`)
      })

      return datasets

    } catch (error) {
      console.error('Error listing datasets:', error)
      return []
    }
  }

  /**
   * List fine-tuning jobs
   */
  async listJobs() {
    try {
      const jobs = await openai.fineTuning.jobs.list()
      
      console.log('🔧 Fine-tuning jobs:')
      jobs.data.forEach(job => {
        const status = this.getStatusEmoji(job.status)
        console.log(`  ${status} ${job.id} - ${job.status} (${new Date(job.created_at * 1000).toISOString()})`)
        if (job.fine_tuned_model) {
          console.log(`    Model: ${job.fine_tuned_model}`)
        }
      })

      return jobs.data

    } catch (error) {
      console.error('Error listing jobs:', error)
      return []
    }
  }

  /**
   * Test fine-tuned model
   */
  async testModel(modelId, testPrompt) {
    try {
      console.log(`🧪 Testing model: ${modelId}`)
      console.log(`Prompt: ${testPrompt}`)

      const completion = await openai.chat.completions.create({
        model: modelId,
        messages: [
          {
            role: 'user',
            content: testPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })

      const response = completion.choices[0].message.content
      console.log(`Response: ${response}`)

      return response

    } catch (error) {
      console.error('Error testing model:', error)
      throw error
    }
  }

  /**
   * Rollback to base model
   */
  async rollbackToBaseModel(modelId) {
    try {
      console.log(`🔄 Rolling back model: ${modelId}`)
      
      // In a real implementation, you would:
      // 1. Update your application configuration
      // 2. Update environment variables
      // 3. Notify monitoring systems
      // 4. Log the rollback event

      console.log('✅ Rollback completed (simulated)')
      console.log('⚠️  Remember to update your application configuration!')

    } catch (error) {
      console.error('Error rolling back model:', error)
      throw error
    }
  }

  // Private helper methods

  loadDataset(datasetPath) {
    try {
      const content = fs.readFileSync(datasetPath, 'utf8')
      return JSON.parse(content)
    } catch (error) {
      throw new Error(`Failed to load dataset: ${error.message}`)
    }
  }

  async validateDataset(dataset) {
    const issues = []
    const recommendations = []

    // Check minimum examples
    if (dataset.totalExamples < 100) {
      issues.push('Dataset has fewer than 100 examples')
      recommendations.push('Collect more user interactions before fine-tuning')
    }

    // Check quality score
    if (dataset.qualityScore < 0.7) {
      issues.push(`Quality score ${dataset.qualityScore} is below minimum 0.7`)
      recommendations.push('Improve data quality or adjust quality thresholds')
    }

    // Check message structure
    const invalidExamples = dataset.examples.filter(example => 
      !this.isValidMessageStructure(example.messages)
    )
    if (invalidExamples.length > 0) {
      issues.push(`${invalidExamples.length} examples have invalid message structure`)
      recommendations.push('Fix message structure in training examples')
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    }
  }

  isValidMessageStructure(messages) {
    if (!Array.isArray(messages) || messages.length === 0) return false

    return messages.every(msg => 
      msg.role && 
      ['system', 'user', 'assistant'].includes(msg.role) &&
      typeof msg.content === 'string' &&
      msg.content.length > 0
    )
  }

  async uploadTrainingFile(datasetPath) {
    try {
      // Convert dataset to OpenAI format
      const dataset = this.loadDataset(datasetPath)
      const openaiFormat = dataset.examples.map(example => ({
        messages: example.messages
      }))

      // Create temporary JSONL file
      const tempPath = path.join(TRAINING_DIR, `temp_${Date.now()}.jsonl`)
      const jsonlContent = openaiFormat
        .map(example => JSON.stringify(example))
        .join('\n')

      fs.writeFileSync(tempPath, jsonlContent)

      // Upload file
      const file = await openai.files.create({
        file: fs.createReadStream(tempPath),
        purpose: 'fine-tune'
      })

      // Clean up temp file
      fs.unlinkSync(tempPath)

      return file

    } catch (error) {
      throw new Error(`Failed to upload training file: ${error.message}`)
    }
  }

  async createFineTuneJob(trainingFileId, options = {}) {
    try {
      const job = await openai.fineTuning.jobs.create({
        training_file: trainingFileId,
        model: options.baseModel || BASE_MODEL,
        hyperparameters: {
          n_epochs: options.epochs || 3,
          batch_size: options.batchSize || 1,
          learning_rate_multiplier: options.learningRate || 2.0
        },
        suffix: options.suffix || `mortgagematch-${Date.now()}`
      })

      return job

    } catch (error) {
      throw new Error(`Failed to create fine-tuning job: ${error.message}`)
    }
  }

  async monitorJob(jobId) {
    let job
    let attempts = 0
    const maxAttempts = 120 // 2 hours with 1-minute intervals

    while (attempts < maxAttempts) {
      try {
        job = await openai.fineTuning.jobs.retrieve(jobId)
        
        console.log(`Status: ${job.status} (attempt ${attempts + 1}/${maxAttempts})`)
        
        if (job.status === 'succeeded') {
          console.log('✅ Fine-tuning job completed successfully!')
          break
        } else if (job.status === 'failed') {
          throw new Error(`Fine-tuning job failed: ${job.error?.message || 'Unknown error'}`)
        } else if (job.status === 'cancelled') {
          throw new Error('Fine-tuning job was cancelled')
        }

        // Wait 1 minute before next check
        await new Promise(resolve => setTimeout(resolve, 60000))
        attempts++

      } catch (error) {
        if (attempts >= maxAttempts - 1) {
          throw new Error(`Job monitoring timeout: ${error.message}`)
        }
        console.warn(`Monitoring error: ${error.message}`)
        await new Promise(resolve => setTimeout(resolve, 30000))
        attempts++
      }
    }

    if (!job || job.status !== 'succeeded') {
      throw new Error('Fine-tuning job did not complete successfully')
    }

    return job
  }

  async saveResults(job, dataset) {
    const results = {
      jobId: job.id,
      modelId: job.fine_tuned_model,
      baseModel: job.model,
      status: job.status,
      createdAt: new Date(job.created_at * 1000).toISOString(),
      completedAt: new Date(job.finished_at * 1000).toISOString(),
      trainingFile: job.training_file,
      validationFile: job.validation_file,
      hyperparameters: job.hyperparameters,
      dataset: {
        version: dataset.version,
        totalExamples: dataset.totalExamples,
        qualityScore: dataset.qualityScore,
        categories: dataset.categories
      },
      metrics: {
        // In a real implementation, you would extract metrics from the job
        trainingLoss: 'N/A',
        validationLoss: 'N/A',
        accuracy: 'N/A'
      }
    }

    const resultsPath = path.join(RESULTS_DIR, `results_${job.id}_${Date.now()}.json`)
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2))

    return {
      ...results,
      resultsPath
    }
  }

  getStatusEmoji(status) {
    const statusMap = {
      'validating_files': '🔍',
      'queued': '⏳',
      'running': '🏃',
      'succeeded': '✅',
      'failed': '❌',
      'cancelled': '🚫'
    }
    return statusMap[status] || '❓'
  }

  formatFileSize(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  ensureDirectories() {
    if (!fs.existsSync(TRAINING_DIR)) {
      fs.mkdirSync(TRAINING_DIR, { recursive: true })
    }
    if (!fs.existsSync(RESULTS_DIR)) {
      fs.mkdirSync(RESULTS_DIR, { recursive: true })
    }
  }
}

// CLI interface
async function main() {
  const service = new FineTuningService()
  const command = process.argv[2]
  const args = process.argv.slice(3)

  try {
    switch (command) {
      case 'list-datasets':
        service.listDatasets()
        break

      case 'list-jobs':
        await service.listJobs()
        break

      case 'run':
        const datasetPath = args[0]
        if (!datasetPath) {
          console.error('❌ Please provide dataset path')
          console.log('Usage: node runFineTune.mjs run <dataset-path> [options]')
          process.exit(1)
        }

        const options = {
          baseModel: args.find(arg => arg.startsWith('--model='))?.split('=')[1] || BASE_MODEL,
          epochs: parseInt(args.find(arg => arg.startsWith('--epochs='))?.split('=')[1]) || 3,
          batchSize: parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1]) || 1,
          learningRate: parseFloat(args.find(arg => arg.startsWith('--learning-rate='))?.split('=')[1]) || 2.0,
          suffix: args.find(arg => arg.startsWith('--suffix='))?.split('=')[1] || `mortgagematch-${Date.now()}`
        }

        await service.runFineTune(datasetPath, options)
        break

      case 'test':
        const modelId = args[0]
        const testPrompt = args[1] || 'Test the mortgage recommendation system'
        
        if (!modelId) {
          console.error('❌ Please provide model ID')
          console.log('Usage: node runFineTune.mjs test <model-id> [prompt]')
          process.exit(1)
        }

        await service.testModel(modelId, testPrompt)
        break

      case 'rollback':
        const rollbackModelId = args[0]
        
        if (!rollbackModelId) {
          console.error('❌ Please provide model ID')
          console.log('Usage: node runFineTune.mjs rollback <model-id>')
          process.exit(1)
        }

        await service.rollbackToBaseModel(rollbackModelId)
        break

      default:
        console.log('🔧 Fine-Tuning CLI')
        console.log('')
        console.log('Commands:')
        console.log('  list-datasets                    List available datasets')
        console.log('  list-jobs                        List fine-tuning jobs')
        console.log('  run <dataset-path> [options]     Run fine-tuning job')
        console.log('  test <model-id> [prompt]         Test fine-tuned model')
        console.log('  rollback <model-id>              Rollback to base model')
        console.log('')
        console.log('Options for run command:')
        console.log('  --model=<model>                  Base model (default: gpt-3.5-turbo)')
        console.log('  --epochs=<number>                Number of epochs (default: 3)')
        console.log('  --batch-size=<number>            Batch size (default: 1)')
        console.log('  --learning-rate=<number>         Learning rate multiplier (default: 2.0)')
        console.log('  --suffix=<string>                Model suffix (default: mortgagematch-<timestamp>)')
        console.log('')
        console.log('Examples:')
        console.log('  node runFineTune.mjs list-datasets')
        console.log('  node runFineTune.mjs run ./datasets/dataset_1.2.0_1234567890.json')
        console.log('  node runFineTune.mjs test ft-abc123 "Recommend a mortgage for first-time buyer"')
        break
    }

  } catch (error) {
    console.error('❌ Command failed:', error.message)
    process.exit(1)
  }
}

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export default FineTuningService