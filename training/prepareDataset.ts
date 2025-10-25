/**
 * Dataset Preparation for Fine-Tuning
 * v1.2.0 - Cleans anonymized AI input/output pairs and prepares training data
 */

import { z } from 'zod'
import fs from 'fs'
import path from 'path'
import { supabaseAdmin } from '../lib/supabase'

// Training data schemas
export const TrainingExampleSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string()
  })),
  metadata: z.object({
    userId: z.string(),
    timestamp: z.string(),
    templateId: z.string(),
    rating: z.number().min(1).max(5).optional(),
    feedback: z.string().optional(),
    anonymized: z.boolean().default(true)
  })
})

export const DatasetSchema = z.object({
  version: z.string(),
  createdAt: z.string(),
  totalExamples: z.number(),
  qualityScore: z.number().min(0).max(1),
  categories: z.array(z.string()),
  examples: z.array(TrainingExampleSchema)
})

export type TrainingExample = z.infer<typeof TrainingExampleSchema>
export type Dataset = z.infer<typeof DatasetSchema>

export class DatasetPreparationService {
  private outputDir: string
  private minQualityScore: number = 0.7
  private minExamplesPerCategory: number = 10

  constructor(outputDir: string = './training/datasets') {
    this.outputDir = outputDir
    this.ensureOutputDirectory()
  }

  /**
   * Prepare dataset from user interactions
   */
  async prepareDataset(
    startDate?: string,
    endDate?: string,
    categories?: string[]
  ): Promise<Dataset> {
    try {
      console.log('Starting dataset preparation...')

      // Fetch user interactions from database
      const interactions = await this.fetchUserInteractions(startDate, endDate, categories)
      console.log(`Fetched ${interactions.length} interactions`)

      // Clean and anonymize data
      const cleanedData = await this.cleanAndAnonymizeData(interactions)
      console.log(`Cleaned ${cleanedData.length} examples`)

      // Filter by quality
      const qualityFiltered = this.filterByQuality(cleanedData)
      console.log(`Quality filtered to ${qualityFiltered.length} examples`)

      // Categorize examples
      const categorized = this.categorizeExamples(qualityFiltered)
      console.log(`Categorized into ${Object.keys(categorized).length} categories`)

      // Balance dataset
      const balanced = this.balanceDataset(categorized)
      console.log(`Balanced to ${balanced.length} examples`)

      // Create final dataset
      const dataset = this.createDataset(balanced)
      console.log(`Created dataset with ${dataset.totalExamples} examples`)

      // Save dataset
      await this.saveDataset(dataset)

      return dataset

    } catch (error) {
      console.error('Error preparing dataset:', error)
      throw error
    }
  }

  /**
   * Prepare dataset for specific prompt template
   */
  async prepareTemplateDataset(templateId: string): Promise<Dataset> {
    try {
      console.log(`Preparing dataset for template: ${templateId}`)

      const interactions = await this.fetchTemplateInteractions(templateId)
      const cleanedData = await this.cleanAndAnonymizeData(interactions)
      const qualityFiltered = this.filterByQuality(cleanedData)
      const categorized = this.categorizeExamples(qualityFiltered)
      const balanced = this.balanceDataset(categorized)

      const dataset = this.createDataset(balanced)
      await this.saveDataset(dataset, `template_${templateId}`)

      return dataset

    } catch (error) {
      console.error('Error preparing template dataset:', error)
      throw error
    }
  }

  /**
   * Validate dataset quality
   */
  async validateDataset(dataset: Dataset): Promise<{
    isValid: boolean
    issues: string[]
    recommendations: string[]
  }> {
    const issues: string[] = []
    const recommendations: string[] = []

    // Check minimum examples
    if (dataset.totalExamples < 100) {
      issues.push('Dataset has fewer than 100 examples')
      recommendations.push('Collect more user interactions before fine-tuning')
    }

    // Check quality score
    if (dataset.qualityScore < this.minQualityScore) {
      issues.push(`Quality score ${dataset.qualityScore} is below minimum ${this.minQualityScore}`)
      recommendations.push('Improve data quality or adjust quality thresholds')
    }

    // Check category balance
    const categoryCounts = this.getCategoryCounts(dataset)
    const minCategoryCount = Math.min(...Object.values(categoryCounts))
    if (minCategoryCount < this.minExamplesPerCategory) {
      issues.push(`Some categories have fewer than ${this.minExamplesPerCategory} examples`)
      recommendations.push('Collect more examples for underrepresented categories')
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

  /**
   * Export dataset in OpenAI format
   */
  async exportToOpenAIFormat(dataset: Dataset, filename?: string): Promise<string> {
    try {
      const openaiFormat = dataset.examples.map(example => ({
        messages: example.messages,
        metadata: {
          template_id: example.metadata.templateId,
          rating: example.metadata.rating,
          anonymized: example.metadata.anonymized
        }
      }))

      const outputPath = path.join(
        this.outputDir,
        filename || `dataset_${dataset.version}_${Date.now()}.jsonl`
      )

      const jsonlContent = openaiFormat
        .map(example => JSON.stringify(example))
        .join('\n')

      fs.writeFileSync(outputPath, jsonlContent)
      console.log(`Exported dataset to: ${outputPath}`)

      return outputPath

    } catch (error) {
      console.error('Error exporting dataset:', error)
      throw error
    }
  }

  // Private helper methods

  private async fetchUserInteractions(
    startDate?: string,
    endDate?: string,
    categories?: string[]
  ): Promise<any[]> {
    try {
      let query = supabaseAdmin
        .from('ai_interactions')
        .select('*')
        .eq('anonymized', true)

      if (startDate) {
        query = query.gte('created_at', startDate)
      }

      if (endDate) {
        query = query.lte('created_at', endDate)
      }

      if (categories && categories.length > 0) {
        query = query.in('category', categories)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return data || []

    } catch (error) {
      console.error('Error fetching user interactions:', error)
      return []
    }
  }

  private async fetchTemplateInteractions(templateId: string): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('ai_interactions')
        .select('*')
        .eq('template_id', templateId)
        .eq('anonymized', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []

    } catch (error) {
      console.error('Error fetching template interactions:', error)
      return []
    }
  }

  private async cleanAndAnonymizeData(interactions: any[]): Promise<TrainingExample[]> {
    const cleaned: TrainingExample[] = []

    for (const interaction of interactions) {
      try {
        // Skip if already processed
        if (interaction.processed) continue

        // Parse the interaction data
        const messages = this.parseInteractionMessages(interaction)
        if (!messages || messages.length === 0) continue

        // Anonymize sensitive data
        const anonymizedMessages = this.anonymizeMessages(messages)

        // Create training example
        const example: TrainingExample = {
          messages: anonymizedMessages,
          metadata: {
            userId: this.anonymizeUserId(interaction.user_id),
            timestamp: interaction.created_at,
            templateId: interaction.template_id,
            rating: interaction.rating,
            feedback: interaction.feedback,
            anonymized: true
          }
        }

        cleaned.push(example)

      } catch (error) {
        console.warn('Error processing interaction:', error)
        continue
      }
    }

    return cleaned
  }

  private parseInteractionMessages(interaction: any): any[] | null {
    try {
      // Parse the interaction data to extract messages
      const data = typeof interaction.data === 'string' 
        ? JSON.parse(interaction.data) 
        : interaction.data

      if (!data.messages || !Array.isArray(data.messages)) {
        return null
      }

      return data.messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      }))

    } catch (error) {
      console.warn('Error parsing interaction messages:', error)
      return null
    }
  }

  private anonymizeMessages(messages: any[]): any[] {
    return messages.map(msg => ({
      ...msg,
      content: this.anonymizeContent(msg.content)
    }))
  }

  private anonymizeContent(content: string): string {
    // Anonymize common PII patterns
    let anonymized = content

    // Replace email addresses
    anonymized = anonymized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')

    // Replace phone numbers
    anonymized = anonymized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')

    // Replace SSN patterns
    anonymized = anonymized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')

    // Replace credit card numbers
    anonymized = anonymized.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD]')

    // Replace specific names with generic terms
    const namePatterns = [
      /\b(John|Jane|Mike|Sarah|David|Lisa|Chris|Amy|Mark|Jennifer)\b/gi,
      /\b(Smith|Johnson|Williams|Brown|Jones|Garcia|Miller|Davis|Rodriguez|Martinez)\b/gi
    ]

    namePatterns.forEach(pattern => {
      anonymized = anonymized.replace(pattern, '[NAME]')
    })

    return anonymized
  }

  private anonymizeUserId(userId: string): string {
    // Create a consistent hash of the user ID
    return `user_${this.hashString(userId)}`
  }

  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }

  private filterByQuality(examples: TrainingExample[]): TrainingExample[] {
    return examples.filter(example => {
      // Filter by rating if available
      if (example.metadata.rating && example.metadata.rating < 3) {
        return false
      }

      // Filter by message quality
      const hasValidMessages = example.messages.every(msg => 
        msg.content && msg.content.length > 10
      )

      // Filter by content diversity
      const uniqueContents = new Set(example.messages.map(msg => msg.content))
      const hasDiversity = uniqueContents.size > 1

      return hasValidMessages && hasDiversity
    })
  }

  private categorizeExamples(examples: TrainingExample[]): Record<string, TrainingExample[]> {
    const categories: Record<string, TrainingExample[]> = {}

    for (const example of examples) {
      const category = this.determineCategory(example)
      if (!categories[category]) {
        categories[category] = []
      }
      categories[category].push(example)
    }

    return categories
  }

  private determineCategory(example: TrainingExample): string {
    const templateId = example.metadata.templateId

    if (templateId.includes('mortgage_recommendation')) return 'mortgage_recommendation'
    if (templateId.includes('rate_explanation')) return 'rate_explanation'
    if (templateId.includes('scenario_comparison')) return 'scenario_comparison'
    if (templateId.includes('affordability')) return 'affordability'
    if (templateId.includes('refinance')) return 'refinance'

    return 'general'
  }

  private balanceDataset(categorized: Record<string, TrainingExample[]>): TrainingExample[] {
    const balanced: TrainingExample[] = []
    const maxPerCategory = Math.max(...Object.values(categorized).map(cat => cat.length))

    for (const [category, examples] of Object.entries(categorized)) {
      if (examples.length < this.minExamplesPerCategory) {
        console.warn(`Category ${category} has only ${examples.length} examples, skipping`)
        continue
      }

      // Sample examples to balance the dataset
      const sampleSize = Math.min(examples.length, maxPerCategory)
      const sampled = this.sampleArray(examples, sampleSize)
      balanced.push(...sampled)
    }

    return balanced
  }

  private sampleArray<T>(array: T[], size: number): T[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random())
    return shuffled.slice(0, size)
  }

  private createDataset(examples: TrainingExample[]): Dataset {
    const categories = [...new Set(examples.map(ex => this.determineCategory(ex)))]
    const qualityScore = this.calculateQualityScore(examples)

    return {
      version: '1.2.0',
      createdAt: new Date().toISOString(),
      totalExamples: examples.length,
      qualityScore,
      categories,
      examples
    }
  }

  private calculateQualityScore(examples: TrainingExample[]): number {
    if (examples.length === 0) return 0

    let totalScore = 0

    for (const example of examples) {
      let exampleScore = 0.5 // Base score

      // Boost score for high ratings
      if (example.metadata.rating) {
        exampleScore += (example.metadata.rating - 3) * 0.1
      }

      // Boost score for longer conversations
      if (example.messages.length > 2) {
        exampleScore += 0.1
      }

      // Boost score for diverse content
      const avgContentLength = example.messages.reduce((sum, msg) => sum + msg.content.length, 0) / example.messages.length
      if (avgContentLength > 100) {
        exampleScore += 0.1
      }

      totalScore += Math.min(exampleScore, 1.0)
    }

    return totalScore / examples.length
  }

  private getCategoryCounts(dataset: Dataset): Record<string, number> {
    const counts: Record<string, number> = {}

    for (const example of dataset.examples) {
      const category = this.determineCategory(example)
      counts[category] = (counts[category] || 0) + 1
    }

    return counts
  }

  private isValidMessageStructure(messages: any[]): boolean {
    if (!Array.isArray(messages) || messages.length === 0) return false

    return messages.every(msg => 
      msg.role && 
      ['system', 'user', 'assistant'].includes(msg.role) &&
      typeof msg.content === 'string' &&
      msg.content.length > 0
    )
  }

  private async saveDataset(dataset: Dataset, filename?: string): Promise<void> {
    const outputPath = path.join(
      this.outputDir,
      filename || `dataset_${dataset.version}_${Date.now()}.json`
    )

    fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2))
    console.log(`Saved dataset to: ${outputPath}`)
  }

  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true })
    }
  }
}

// CLI interface
if (require.main === module) {
  const service = new DatasetPreparationService()
  
  const args = process.argv.slice(2)
  const startDate = args.find(arg => arg.startsWith('--start='))?.split('=')[1]
  const endDate = args.find(arg => arg.startsWith('--end='))?.split('=')[1]
  const categories = args.find(arg => arg.startsWith('--categories='))?.split('=')[1]?.split(',')

  service.prepareDataset(startDate, endDate, categories)
    .then(dataset => {
      console.log('Dataset preparation completed!')
      console.log(`Total examples: ${dataset.totalExamples}`)
      console.log(`Quality score: ${dataset.qualityScore.toFixed(3)}`)
      console.log(`Categories: ${dataset.categories.join(', ')}`)
    })
    .catch(error => {
      console.error('Dataset preparation failed:', error)
      process.exit(1)
    })
}

export default DatasetPreparationService