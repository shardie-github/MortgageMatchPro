import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { 
  withSecurity, 
  withAuth,
  handleError
} from '@/lib/security'
import { analytics, errorTracking } from '@/lib/monitoring'

interface AdminDashboardStats {
  totalLeads: number
  totalBrokers: number
  totalUsers: number
  leadsThisMonth: number
  conversionRate: number
  averageLeadScore: number
  totalCommission: number
  leadsByStatus: {
    pending: number
    contacted: number
    converted: number
    rejected: number
  }
  leadsByTier: {
    premium: number
    standard: number
    coaching: number
  }
  topBrokers: Array<{
    id: string
    name: string
    company: string
    totalLeads: number
    convertedLeads: number
    conversionRate: number
    totalCommission: number
  }>
  recentActivity: Array<{
    id: string
    type: 'lead_created' | 'lead_updated' | 'broker_assigned'
    description: string
    timestamp: string
    leadId?: string
    brokerId?: string
  }>
}

async function handler(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    // Verify user is admin (simplified check - in production, use proper role-based access)
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('subscription_tier, email')
      .eq('id', userId)
      .single()

    if (userError || !user || !user.email?.includes('admin')) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' })
    }

    // Get all leads
    const { data: leads, error: leadsError } = await supabaseAdmin
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })

    if (leadsError) {
      throw new Error(`Failed to fetch leads: ${leadsError.message}`)
    }

    // Get all brokers
    const { data: brokers, error: brokersError } = await supabaseAdmin
      .from('brokers')
      .select('*')

    if (brokersError) {
      throw new Error(`Failed to fetch brokers: ${brokersError.message}`)
    }

    // Get all users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, created_at')

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`)
    }

    // Calculate statistics
    const totalLeads = leads?.length || 0
    const totalBrokers = brokers?.length || 0
    const totalUsers = users?.length || 0

    // Leads this month
    const thisMonth = new Date()
    thisMonth.setDate(1)
    const leadsThisMonth = leads?.filter(lead => 
      new Date(lead.created_at) >= thisMonth
    ).length || 0

    // Conversion rate
    const convertedLeads = leads?.filter(lead => lead.status === 'converted').length || 0
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0

    // Average lead score
    const averageLeadScore = totalLeads > 0 
      ? leads?.reduce((sum, lead) => sum + lead.lead_score, 0) / totalLeads 
      : 0

    // Total commission (simplified calculation)
    const totalCommission = convertedLeads * 1000 // Assume $1000 average commission per lead

    // Leads by status
    const leadsByStatus = {
      pending: leads?.filter(lead => lead.status === 'pending').length || 0,
      contacted: leads?.filter(lead => lead.status === 'contacted').length || 0,
      converted: convertedLeads,
      rejected: leads?.filter(lead => lead.status === 'rejected').length || 0,
    }

    // Leads by tier (simplified - would need to store tier in database)
    const leadsByTier = {
      premium: leads?.filter(lead => lead.lead_score >= 70).length || 0,
      standard: leads?.filter(lead => lead.lead_score >= 50 && lead.lead_score < 70).length || 0,
      coaching: leads?.filter(lead => lead.lead_score < 50).length || 0,
    }

    // Top brokers
    const brokerStats = brokers?.map(broker => {
      const brokerLeads = leads?.filter(lead => lead.broker_id === broker.id) || []
      const convertedBrokerLeads = brokerLeads.filter(lead => lead.status === 'converted')
      const brokerConversionRate = brokerLeads.length > 0 
        ? (convertedBrokerLeads.length / brokerLeads.length) * 100 
        : 0
      const brokerCommission = convertedBrokerLeads.length * (broker.commission_rate / 100) * 1000

      return {
        id: broker.id,
        name: broker.name,
        company: broker.company,
        totalLeads: brokerLeads.length,
        convertedLeads: convertedBrokerLeads.length,
        conversionRate: Math.round(brokerConversionRate * 100) / 100,
        totalCommission: Math.round(brokerCommission),
      }
    }).sort((a, b) => b.convertedLeads - a.convertedLeads).slice(0, 5) || []

    // Recent activity (simplified - would need activity log table)
    const recentActivity = (leads || []).slice(0, 10).map(lead => ({
      id: lead.id,
      type: 'lead_created' as const,
      description: `New lead from ${lead.name} (Score: ${lead.lead_score})`,
      timestamp: lead.created_at,
      leadId: lead.id,
    }))

    const stats: AdminDashboardStats = {
      totalLeads,
      totalBrokers,
      totalUsers,
      leadsThisMonth,
      conversionRate: Math.round(conversionRate * 100) / 100,
      averageLeadScore: Math.round(averageLeadScore * 100) / 100,
      totalCommission: Math.round(totalCommission),
      leadsByStatus,
      leadsByTier,
      topBrokers: brokerStats,
      recentActivity,
    }

    // Track analytics
    analytics.trackAdminDashboardAccess({
      adminId: userId,
      totalLeads,
      totalBrokers,
      conversionRate,
    })

    res.status(200).json({
      success: true,
      stats,
    })

  } catch (error) {
    errorTracking.captureException(error as Error, {
      context: 'admin_dashboard',
      userId,
    })
    handleError(res, error as Error, 'admin_dashboard')
  }
}

export default withSecurity(withAuth(handler))