/**
 * ProfileContext Service - Enhanced Personalization Engine
 * Stores non-PII user preferences and personalization context
 * v1.2.0 - AI Personalization, Model Fine-Tuning & Partner Integration Expansion
 */

import { z } from 'zod'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabaseAdmin } from '../supabase'
import { personalizationEngine } from '../experimentation/personalization-engine'

// Enhanced user profile schema with v1.2.0 features
export const ProfileContextSchema = z.object({
  userId: z.string(),
  // Loan preferences
  loanTypeFocus: z.enum(['fixed', 'variable', 'hybrid']).optional(),
  riskComfort: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
  creditTier: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),
  propertyType: z.enum(['primary', 'secondary', 'investment', 'vacation']).optional(),
  
  // Search preferences
  searchRegions: z.array(z.string()).optional(),
  preferredLenders: z.array(z.string()).optional(),
  maxRateTolerance: z.number().optional(),
  
  // Personalization settings
  copyTone: z.enum(['casual', 'professional', 'technical']).optional(),
  uiDensity: z.enum(['compact', 'spacious', 'adaptive']).optional(),
  explanationLevel: z.enum(['minimal', 'standard', 'detailed']).optional(),
  
  // AI interaction preferences
  aiPromptStyle: z.enum(['concise', 'verbose', 'conversational']).optional(),
  feedbackEnabled: z.boolean().optional(),
  learningEnabled: z.boolean().optional(),
  
  // Regional settings
  country: z.enum(['CA', 'US', 'UK']).optional(),
  currency: z.enum(['CAD', 'USD', 'GBP']).optional(),
  timezone: z.string().optional(),
  
  // Session context
  sessionHistory: z.array(z.object({
    action: z.string(),
    timestamp: z.string(),
    context: z.record(z.any()).optional(),
    outcome: z.enum(['success', 'failure', 'abandoned']).optional()
  })).optional(),
  
  // Metadata
  lastUpdated: z.string(),
  version: z.string().default('1.2.0'),
  encrypted: z.boolean().default(false)
})

export type ProfileContext = z.infer<typeof ProfileContextSchema>

// Default profile context
const DEFAULT_PROFILE_CONTEXT: Partial<ProfileContext> = {
  loanTypeFocus: 'fixed',
  riskComfort: 'moderate',
  creditTier: 'good',
  propertyType: 'primary',
  searchRegions: [],
  preferredLenders: [],
  maxRateTolerance: 8.0,
  copyTone: 'professional',
  uiDensity: 'adaptive',
  explanationLevel: 'standard',
  aiPromptStyle: 'conversational',
  feedbackEnabled: true,
  learningEnabled: true,
  country: 'CA',
  currency: 'CAD',
  timezone: 'America/Toronto',
  sessionHistory: [],
  version: '1.2.0',
  encrypted: false
}

export class ProfileContextService {
  private static instance: ProfileContextService
  private cache: Map<string, ProfileContext> = new Map()
  private encryptionKey: string | null = null

  private constructor() {
    this.initializeEncryption()
  }

  static getInstance(): ProfileContextService {
    if (!ProfileContextService.instance) {
      ProfileContextService.instance = new ProfileContextService()
    }
    return ProfileContextService.instance
  }

  /**
   * Initialize encryption for sensitive data
   */
  private async initializeEncryption(): Promise<void> {
    try {
      // In production, use proper key management
      this.encryptionKey = process.env.PROFILE_ENCRYPTION_KEY || 'default-key-change-in-production'
    } catch (error) {
      console.warn('Encryption not available, using unencrypted storage')
    }
  }

  /**
   * Get user profile context with fallback to defaults
   */
  async getProfileContext(userId: string): Promise<ProfileContext> {
    try {
      // Check cache first
      if (this.cache.has(userId)) {
        return this.cache.get(userId)!
      }

      // Try local storage first (faster)
      const localContext = await this.getLocalProfileContext(userId)
      if (localContext) {
        this.cache.set(userId, localContext)
        return localContext
      }

      // Fallback to database
      const dbContext = await this.getDatabaseProfileContext(userId)
      if (dbContext) {
        this.cache.set(userId, dbContext)
        await this.setLocalProfileContext(userId, dbContext)
        return dbContext
      }

      // Create default context
      const defaultContext = await this.createDefaultProfileContext(userId)
      this.cache.set(userId, defaultContext)
      await this.setLocalProfileContext(userId, defaultContext)
      return defaultContext

    } catch (error) {
      console.error('Error getting profile context:', error)
      return this.createDefaultProfileContext(userId)
    }
  }

  /**
   * Update user profile context
   */
  async updateProfileContext(
    userId: string, 
    updates: Partial<ProfileContext>
  ): Promise<ProfileContext> {
    try {
      const currentContext = await this.getProfileContext(userId)
      const updatedContext: ProfileContext = {
        ...currentContext,
        ...updates,
        lastUpdated: new Date().toISOString(),
        version: '1.2.0'
      }

      // Validate the updated context
      const validatedContext = ProfileContextSchema.parse(updatedContext)

      // Update cache
      this.cache.set(userId, validatedContext)

      // Update local storage (primary)
      await this.setLocalProfileContext(userId, validatedContext)

      // Update database (backup)
      await this.setDatabaseProfileContext(userId, validatedContext)

      // Update personalization engine
      await this.syncWithPersonalizationEngine(userId, validatedContext)

      return validatedContext

    } catch (error) {
      console.error('Error updating profile context:', error)
      throw error
    }
  }

  /**
   * Add session history entry
   */
  async addSessionHistory(
    userId: string,
    action: string,
    context?: Record<string, any>,
    outcome?: 'success' | 'failure' | 'abandoned'
  ): Promise<void> {
    try {
      const profileContext = await this.getProfileContext(userId)
      const historyEntry = {
        action,
        timestamp: new Date().toISOString(),
        context: context || {},
        outcome
      }

      const updatedHistory = [
        ...(profileContext.sessionHistory || []).slice(-49), // Keep last 50 entries
        historyEntry
      ]

      await this.updateProfileContext(userId, {
        sessionHistory: updatedHistory
      })

    } catch (error) {
      console.error('Error adding session history:', error)
    }
  }

  /**
   * Get personalized AI prompt based on context
   */
  async getPersonalizedPrompt(
    userId: string,
    basePrompt: string,
    context: Record<string, any> = {}
  ): Promise<string> {
    try {
      const profileContext = await this.getProfileContext(userId)
      
      // Build personalized prompt
      const personalizedPrompt = this.buildPersonalizedPrompt(
        basePrompt,
        profileContext,
        context
      )

      // Add session history context
      const sessionContext = this.buildSessionContext(profileContext)
      
      return `${personalizedPrompt}\n\nSession Context:\n${sessionContext}`
      
    } catch (error) {
      console.error('Error building personalized prompt:', error)
      return basePrompt
    }
  }

  /**
   * Get personalized form defaults
   */
  async getFormDefaults(userId: string, formType: string): Promise<Record<string, any>> {
    try {
      const profileContext = await this.getProfileContext(userId)
      
      const defaults: Record<string, any> = {
        loanType: profileContext.loanTypeFocus || 'fixed',
        riskTolerance: profileContext.riskComfort || 'moderate',
        creditTier: profileContext.creditTier || 'good',
        propertyType: profileContext.propertyType || 'primary',
        country: profileContext.country || 'CA',
        currency: profileContext.currency || 'CAD',
        maxRate: profileContext.maxRateTolerance || 8.0
      }

      // Add region-specific defaults
      if (profileContext.searchRegions && profileContext.searchRegions.length > 0) {
        defaults.primaryRegion = profileContext.searchRegions[0]
      }

      return defaults

    } catch (error) {
      console.error('Error getting form defaults:', error)
      return {}
    }
  }

  /**
   * Get personalized copy tone
   */
  async getCopyTone(userId: string): Promise<'casual' | 'professional' | 'technical'> {
    try {
      const profileContext = await this.getProfileContext(userId)
      return profileContext.copyTone || 'professional'
    } catch (error) {
      console.error('Error getting copy tone:', error)
      return 'professional'
    }
  }

  /**
   * Reset profile context to defaults
   */
  async resetProfileContext(userId: string): Promise<ProfileContext> {
    try {
      const defaultContext = await this.createDefaultProfileContext(userId)
      
      // Clear cache
      this.cache.delete(userId)
      
      // Update storage
      await this.setLocalProfileContext(userId, defaultContext)
      await this.setDatabaseProfileContext(userId, defaultContext)
      
      return defaultContext

    } catch (error) {
      console.error('Error resetting profile context:', error)
      throw error
    }
  }

  // Private helper methods

  private async getLocalProfileContext(userId: string): Promise<ProfileContext | null> {
    try {
      const key = `profile_context_${userId}`
      const stored = await AsyncStorage.getItem(key)
      
      if (!stored) return null
      
      const parsed = JSON.parse(stored)
      return ProfileContextSchema.parse(parsed)
      
    } catch (error) {
      console.error('Error reading local profile context:', error)
      return null
    }
  }

  private async setLocalProfileContext(userId: string, context: ProfileContext): Promise<void> {
    try {
      const key = `profile_context_${userId}`
      const serialized = JSON.stringify(context)
      await AsyncStorage.setItem(key, serialized)
    } catch (error) {
      console.error('Error saving local profile context:', error)
    }
  }

  private async getDatabaseProfileContext(userId: string): Promise<ProfileContext | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('profile_contexts')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error || !data) return null

      return ProfileContextSchema.parse(data.context_data)
      
    } catch (error) {
      console.error('Error reading database profile context:', error)
      return null
    }
  }

  private async setDatabaseProfileContext(userId: string, context: ProfileContext): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('profile_contexts')
        .upsert({
          user_id: userId,
          context_data: context,
          last_updated: new Date().toISOString()
        })

      if (error) throw error
      
    } catch (error) {
      console.error('Error saving database profile context:', error)
    }
  }

  private async createDefaultProfileContext(userId: string): Promise<ProfileContext> {
    return ProfileContextSchema.parse({
      userId,
      ...DEFAULT_PROFILE_CONTEXT,
      lastUpdated: new Date().toISOString()
    })
  }

  private buildPersonalizedPrompt(
    basePrompt: string,
    profileContext: ProfileContext,
    context: Record<string, any>
  ): string {
    const personalization = {
      tone: profileContext.copyTone || 'professional',
      style: profileContext.aiPromptStyle || 'conversational',
      explanationLevel: profileContext.explanationLevel || 'standard',
      riskTolerance: profileContext.riskComfort || 'moderate',
      loanType: profileContext.loanTypeFocus || 'fixed',
      creditTier: profileContext.creditTier || 'good'
    }

    return `${basePrompt}

Personalization Context:
- User prefers ${personalization.tone} tone
- Communication style: ${personalization.style}
- Explanation level: ${personalization.explanationLevel}
- Risk tolerance: ${personalization.riskTolerance}
- Loan type focus: ${personalization.loanType}
- Credit tier: ${personalization.creditTier}

Please tailor your response accordingly.`
  }

  private buildSessionContext(profileContext: ProfileContext): string {
    if (!profileContext.sessionHistory || profileContext.sessionHistory.length === 0) {
      return 'No previous session data'
    }

    const recentActions = profileContext.sessionHistory
      .slice(-5)
      .map(entry => `${entry.action} (${entry.outcome || 'unknown'})`)
      .join(', ')

    return `Recent actions: ${recentActions}`
  }

  private async syncWithPersonalizationEngine(
    userId: string,
    profileContext: ProfileContext
  ): Promise<void> {
    try {
      // Map profile context to personalization engine attributes
      const attributes = {
        loanTypeFocus: profileContext.loanTypeFocus,
        riskComfort: profileContext.riskComfort,
        creditTier: profileContext.creditTier,
        propertyType: profileContext.propertyType,
        copyTone: profileContext.copyTone,
        uiDensity: profileContext.uiDensity,
        explanationLevel: profileContext.explanationLevel,
        country: profileContext.country,
        currency: profileContext.currency
      }

      const behaviorData = {
        sessionHistory: profileContext.sessionHistory,
        feedbackEnabled: profileContext.feedbackEnabled,
        learningEnabled: profileContext.learningEnabled
      }

      await personalizationEngine.updateUserProfile(userId, attributes, behaviorData)

    } catch (error) {
      console.error('Error syncing with personalization engine:', error)
    }
  }
}

// Export singleton instance
export const profileContextService = ProfileContextService.getInstance()

// Convenience functions
export const getProfileContext = (userId: string) => 
  profileContextService.getProfileContext(userId)

export const updateProfileContext = (userId: string, updates: Partial<ProfileContext>) =>
  profileContextService.updateProfileContext(userId, updates)

export const addSessionHistory = (
  userId: string,
  action: string,
  context?: Record<string, any>,
  outcome?: 'success' | 'failure' | 'abandoned'
) => profileContextService.addSessionHistory(userId, action, context, outcome)

export const getPersonalizedPrompt = (userId: string, basePrompt: string, context?: Record<string, any>) =>
  profileContextService.getPersonalizedPrompt(userId, basePrompt, context)

export const getFormDefaults = (userId: string, formType: string) =>
  profileContextService.getFormDefaults(userId, formType)

export const getCopyTone = (userId: string) =>
  profileContextService.getCopyTone(userId)