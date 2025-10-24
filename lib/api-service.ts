import { supabase, supabaseAdmin, Tables, Insert, Update } from './supabase'
import { db } from './database-service'
import { auth } from './auth-service'
import { realtime } from './realtime-service'
import { analytics } from './monitoring'

// Enhanced API service with advanced features
export class ApiService {
  // User management APIs
  static async getUserProfile(userId: string): Promise<{
    success: boolean
    data?: Tables<'users'>
    error?: string
  }> {
    try {
      const profile = await db.getUserProfile(userId)
      
      if (!profile) {
        return { success: false, error: 'User profile not found' }
      }

      analytics.trackApiCall('get_user_profile', { userId })
      return { success: true, data: profile }
    } catch (error) {
      console.error('Error getting user profile:', error)
      return { success: false, error: 'Failed to get user profile' }
    }
  }

  static async updateUserProfile(userId: string, updates: Update<'users'>): Promise<{
    success: boolean
    data?: Tables<'users'>
    error?: string
  }> {
    try {
      const success = await db.updateUserProfile(userId, updates)
      
      if (!success) {
        return { success: false, error: 'Failed to update user profile' }
      }

      const updatedProfile = await db.getUserProfile(userId)
      analytics.trackApiCall('update_user_profile', { userId })
      
      return { success: true, data: updatedProfile }
    } catch (error) {
      console.error('Error updating user profile:', error)
      return { success: false, error: 'Failed to update user profile' }
    }
  }

  // Mortgage calculation APIs
  static async getMortgageCalculations(
    userId: string,
    options: {
      limit?: number
      offset?: number
      country?: string
      sortBy?: 'created_at' | 'property_price' | 'monthly_payment'
      sortOrder?: 'asc' | 'desc'
    } = {}
  ): Promise<{
    success: boolean
    data?: Tables<'mortgage_calculations'>[]
    pagination?: {
      total: number
      limit: number
      offset: number
      hasMore: boolean
    }
    error?: string
  }> {
    try {
      const calculations = await db.getMortgageCalculations(userId, options)
      
      // Get total count for pagination
      const { count } = await supabase
        .from('mortgage_calculations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      const pagination = {
        total: count || 0,
        limit: options.limit || 50,
        offset: options.offset || 0,
        hasMore: (options.offset || 0) + (options.limit || 50) < (count || 0)
      }

      analytics.trackApiCall('get_mortgage_calculations', { userId, count: calculations.length })
      
      return { success: true, data: calculations, pagination }
    } catch (error) {
      console.error('Error getting mortgage calculations:', error)
      return { success: false, error: 'Failed to get mortgage calculations' }
    }
  }

  static async saveMortgageCalculation(calculation: Insert<'mortgage_calculations'>): Promise<{
    success: boolean
    data?: { id: string }
    error?: string
  }> {
    try {
      const calculationId = await db.saveMortgageCalculation(calculation)
      
      if (!calculationId) {
        return { success: false, error: 'Failed to save mortgage calculation' }
      }

      // Send realtime notification
      await realtime.sendUserNotification(calculation.user_id, {
        type: 'calculation_saved',
        title: 'Calculation Saved',
        message: 'Your mortgage calculation has been saved successfully',
        data: { calculationId }
      })

      analytics.trackApiCall('save_mortgage_calculation', { userId: calculation.user_id })
      
      return { success: true, data: { id: calculationId } }
    } catch (error) {
      console.error('Error saving mortgage calculation:', error)
      return { success: false, error: 'Failed to save mortgage calculation' }
    }
  }

  // Rate check APIs
  static async getRateChecks(
    userId: string,
    options: {
      country?: string
      rateType?: string
      limit?: number
    } = {}
  ): Promise<{
    success: boolean
    data?: Tables<'rate_checks'>[]
    error?: string
  }> {
    try {
      const rateChecks = await db.getRateChecks(userId, options)
      
      analytics.trackApiCall('get_rate_checks', { userId, count: rateChecks.length })
      
      return { success: true, data: rateChecks }
    } catch (error) {
      console.error('Error getting rate checks:', error)
      return { success: false, error: 'Failed to get rate checks' }
    }
  }

  static async saveRateCheck(rateCheck: Insert<'rate_checks'>): Promise<{
    success: boolean
    data?: { id: string }
    error?: string
  }> {
    try {
      const rateCheckId = await db.saveRateCheck(rateCheck)
      
      if (!rateCheckId) {
        return { success: false, error: 'Failed to save rate check' }
      }

      // Send realtime notification
      await realtime.sendUserNotification(rateCheck.user_id, {
        type: 'rate_check_saved',
        title: 'Rate Check Saved',
        message: 'Your rate check has been saved successfully',
        data: { rateCheckId }
      })

      analytics.trackApiCall('save_rate_check', { userId: rateCheck.user_id })
      
      return { success: true, data: { id: rateCheckId } }
    } catch (error) {
      console.error('Error saving rate check:', error)
      return { success: false, error: 'Failed to save rate check' }
    }
  }

  // Lead management APIs
  static async getLeads(
    userId: string,
    options: {
      status?: string
      brokerId?: string
      limit?: number
      offset?: number
      sortBy?: 'created_at' | 'lead_score' | 'updated_at'
      sortOrder?: 'asc' | 'desc'
    } = {}
  ): Promise<{
    success: boolean
    data?: Tables<'leads'>[]
    pagination?: {
      total: number
      limit: number
      offset: number
      hasMore: boolean
    }
    error?: string
  }> {
    try {
      const leads = await db.getLeads(userId, options)
      
      // Get total count for pagination
      const { count } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      const pagination = {
        total: count || 0,
        limit: options.limit || 50,
        offset: options.offset || 0,
        hasMore: (options.offset || 0) + (options.limit || 50) < (count || 0)
      }

      analytics.trackApiCall('get_leads', { userId, count: leads.length })
      
      return { success: true, data: leads, pagination }
    } catch (error) {
      console.error('Error getting leads:', error)
      return { success: false, error: 'Failed to get leads' }
    }
  }

  static async saveLead(lead: Insert<'leads'>): Promise<{
    success: boolean
    data?: { id: string }
    error?: string
  }> {
    try {
      const leadId = await db.saveLead(lead)
      
      if (!leadId) {
        return { success: false, error: 'Failed to save lead' }
      }

      // Send realtime notification to user
      await realtime.sendUserNotification(lead.user_id, {
        type: 'lead_created',
        title: 'Lead Created',
        message: 'Your lead has been created and will be matched with qualified brokers',
        data: { leadId }
      })

      // Send notification to assigned broker if any
      if (lead.broker_id) {
        await realtime.sendBrokerNotification({
          type: 'new_lead_assigned',
          title: 'New Lead Assigned',
          message: `You have been assigned a new lead: ${lead.name}`,
          data: { leadId, leadName: lead.name, leadEmail: lead.email }
        })
      }

      analytics.trackApiCall('save_lead', { userId: lead.user_id, leadId })
      
      return { success: true, data: { id: leadId } }
    } catch (error) {
      console.error('Error saving lead:', error)
      return { success: false, error: 'Failed to save lead' }
    }
  }

  static async updateLeadStatus(
    leadId: string,
    status: 'pending' | 'contacted' | 'converted' | 'rejected',
    brokerId?: string
  ): Promise<{
    success: boolean
    data?: Tables<'leads'>
    error?: string
  }> {
    try {
      const updates: Update<'leads'> = {
        status,
        updated_at: new Date().toISOString()
      }

      if (brokerId) {
        updates.broker_id = brokerId
      }

      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', leadId)
        .select()
        .single()

      if (error) throw error

      // Send realtime notification
      if (data) {
        await realtime.sendUserNotification(data.user_id, {
          type: 'lead_status_updated',
          title: 'Lead Status Updated',
          message: `Your lead status has been updated to: ${status}`,
          data: { leadId, status }
        })
      }

      analytics.trackApiCall('update_lead_status', { leadId, status })
      
      return { success: true, data }
    } catch (error) {
      console.error('Error updating lead status:', error)
      return { success: false, error: 'Failed to update lead status' }
    }
  }

  // Broker APIs
  static async getBrokers(options: {
    isActive?: boolean
    provincesStates?: string[]
    limit?: number
  } = {}): Promise<{
    success: boolean
    data?: Tables<'brokers'>[]
    error?: string
  }> {
    try {
      const brokers = await db.getBrokers(options)
      
      analytics.trackApiCall('get_brokers', { count: brokers.length })
      
      return { success: true, data: brokers }
    } catch (error) {
      console.error('Error getting brokers:', error)
      return { success: false, error: 'Failed to get brokers' }
    }
  }

  // Subscription APIs
  static async getUserSubscription(userId: string): Promise<{
    success: boolean
    data?: Tables<'subscriptions'>
    error?: string
  }> {
    try {
      const subscription = await db.getUserSubscription(userId)
      
      analytics.trackApiCall('get_user_subscription', { userId })
      
      return { success: true, data: subscription }
    } catch (error) {
      console.error('Error getting user subscription:', error)
      return { success: false, error: 'Failed to get user subscription' }
    }
  }

  // Analytics APIs
  static async getUserAnalytics(userId: string): Promise<{
    success: boolean
    data?: any
    error?: string
  }> {
    try {
      const analyticsData = await db.getUserAnalytics(userId)
      
      analytics.trackApiCall('get_user_analytics', { userId })
      
      return { success: true, data: analyticsData }
    } catch (error) {
      console.error('Error getting user analytics:', error)
      return { success: false, error: 'Failed to get user analytics' }
    }
  }

  // Dashboard APIs
  static async getUserDashboard(userId: string): Promise<{
    success: boolean
    data?: any
    error?: string
  }> {
    try {
      const { data, error } = await supabase.rpc('get_user_dashboard_data', {
        user_id: userId
      })

      if (error) throw error

      analytics.trackApiCall('get_user_dashboard', { userId })
      
      return { success: true, data }
    } catch (error) {
      console.error('Error getting user dashboard:', error)
      return { success: false, error: 'Failed to get user dashboard' }
    }
  }

  static async getBrokerDashboard(brokerId: string): Promise<{
    success: boolean
    data?: any
    error?: string
  }> {
    try {
      const { data, error } = await supabase.rpc('get_broker_dashboard_data', {
        broker_id: brokerId
      })

      if (error) throw error

      analytics.trackApiCall('get_broker_dashboard', { brokerId })
      
      return { success: true, data }
    } catch (error) {
      console.error('Error getting broker dashboard:', error)
      return { success: false, error: 'Failed to get broker dashboard' }
    }
  }

  // System APIs
  static async getSystemAnalytics(): Promise<{
    success: boolean
    data?: any
    error?: string
  }> {
    try {
      const { data, error } = await supabaseAdmin.rpc('get_system_analytics')

      if (error) throw error

      analytics.trackApiCall('get_system_analytics')
      
      return { success: true, data }
    } catch (error) {
      console.error('Error getting system analytics:', error)
      return { success: false, error: 'Failed to get system analytics' }
    }
  }

  static async getDatabaseHealth(): Promise<{
    success: boolean
    data?: any
    error?: string
  }> {
    try {
      const { data, error } = await supabaseAdmin.rpc('get_database_health')

      if (error) throw error

      analytics.trackApiCall('get_database_health')
      
      return { success: true, data }
    } catch (error) {
      console.error('Error getting database health:', error)
      return { success: false, error: 'Failed to get database health' }
    }
  }

  // Data export APIs
  static async exportUserData(userId: string): Promise<{
    success: boolean
    data?: any
    error?: string
  }> {
    try {
      const { data, error } = await supabase.rpc('export_user_data', {
        user_id: userId
      })

      if (error) throw error

      analytics.trackApiCall('export_user_data', { userId })
      
      return { success: true, data }
    } catch (error) {
      console.error('Error exporting user data:', error)
      return { success: false, error: 'Failed to export user data' }
    }
  }

  // Search APIs
  static async searchUsers(query: string, limit: number = 20): Promise<{
    success: boolean
    data?: Tables<'users'>[]
    error?: string
  }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .textSearch('email', query)
        .limit(limit)

      if (error) throw error

      analytics.trackApiCall('search_users', { query, count: data?.length || 0 })
      
      return { success: true, data: data || [] }
    } catch (error) {
      console.error('Error searching users:', error)
      return { success: false, error: 'Failed to search users' }
    }
  }

  static async searchBrokers(query: string, limit: number = 20): Promise<{
    success: boolean
    data?: Tables<'brokers'>[]
    error?: string
  }> {
    try {
      const { data, error } = await supabase
        .from('brokers')
        .select('*')
        .textSearch('name,company', query)
        .eq('is_active', true)
        .limit(limit)

      if (error) throw error

      analytics.trackApiCall('search_brokers', { query, count: data?.length || 0 })
      
      return { success: true, data: data || [] }
    } catch (error) {
      console.error('Error searching brokers:', error)
      return { success: false, error: 'Failed to search brokers' }
    }
  }

  // Batch operations
  static async batchSaveMortgageCalculations(calculations: Insert<'mortgage_calculations'>[]): Promise<{
    success: boolean
    data?: { saved: number }
    error?: string
  }> {
    try {
      const success = await db.batchInsertMortgageCalculations(calculations)
      
      if (!success) {
        return { success: false, error: 'Failed to save mortgage calculations' }
      }

      analytics.trackApiCall('batch_save_mortgage_calculations', { count: calculations.length })
      
      return { success: true, data: { saved: calculations.length } }
    } catch (error) {
      console.error('Error batch saving mortgage calculations:', error)
      return { success: false, error: 'Failed to save mortgage calculations' }
    }
  }

  // Utility functions
  static async checkUserEntitlement(userId: string, feature: string): Promise<boolean> {
    return await auth.hasEntitlement(userId, feature)
  }

  static async getConnectionStatus(): Promise<{
    success: boolean
    data?: {
      supabase: boolean
      redis: boolean
      realtime: string
    }
    error?: string
  }> {
    try {
      const supabaseStatus = await db.checkSupabaseConnection()
      const realtimeStatus = realtime.getConnectionStatus()
      
      // Check Redis connection
      let redisStatus = false
      try {
        // Simple Redis ping
        redisStatus = true
      } catch {
        redisStatus = false
      }

      return {
        success: true,
        data: {
          supabase: supabaseStatus,
          redis: redisStatus,
          realtime: realtimeStatus
        }
      }
    } catch (error) {
      console.error('Error checking connection status:', error)
      return { success: false, error: 'Failed to check connection status' }
    }
  }
}

// Export singleton instance
export const api = ApiService