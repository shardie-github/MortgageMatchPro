import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { 
  withSecurity, 
  withAuth,
  handleError
} from '@/lib/security'
import { analytics, errorTracking } from '@/lib/monitoring'

interface BrokerDashboardStats {
  totalLeads: number
  pendingLeads: number
  contactedLeads: number
  convertedLeads: number
  rejectedLeads: number
  conversionRate: number
  totalCommission: number
  monthlyCommission: number
  averageLeadScore: number
  recentLeads: Array<{
    id: string
    name: string
    email: string
    phone: string
    leadScore: number
    status: string
    createdAt: string
    propertyValue: number
    downPayment: number
    income: number
    creditScore: number
  }>
}

async function handler(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    // Verify user is a broker
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('subscription_tier')
      .eq('id', userId)
      .single()

    if (userError || !user || user.subscription_tier !== 'broker') {
      return res.status(403).json({ error: 'Access denied. Broker subscription required.' })
    }

    // Get broker information
    const { data: broker, error: brokerError } = await supabaseAdmin
      .from('brokers')
      .select('*')
      .eq('email', req.query.email || '')
      .single()

    if (brokerError || !broker) {
      return res.status(404).json({ error: 'Broker not found' })
    }

    // Get leads assigned to this broker
    const { data: leads, error: leadsError } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('broker_id', broker.id)
      .order('created_at', { ascending: false })

    if (leadsError) {
      throw new Error(`Failed to fetch leads: ${leadsError.message}`)
    }

    // Calculate statistics
    const totalLeads = leads?.length || 0
    const pendingLeads = leads?.filter(lead => lead.status === 'pending').length || 0
    const contactedLeads = leads?.filter(lead => lead.status === 'contacted').length || 0
    const convertedLeads = leads?.filter(lead => lead.status === 'converted').length || 0
    const rejectedLeads = leads?.filter(lead => lead.status === 'rejected').length || 0
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0
    const averageLeadScore = totalLeads > 0 
      ? leads?.reduce((sum, lead) => sum + lead.lead_score, 0) / totalLeads 
      : 0

    // Calculate commission (simplified - would need more complex logic in production)
    const totalCommission = convertedLeads * (broker.commission_rate / 100) * 1000 // Assume $1000 average commission per lead
    const monthlyCommission = convertedLeads * (broker.commission_rate / 100) * 1000 // Simplified monthly calculation

    // Format recent leads
    const recentLeads = (leads || []).slice(0, 10).map(lead => ({
      id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      leadScore: lead.lead_score,
      status: lead.status,
      createdAt: lead.created_at,
      propertyValue: lead.lead_data?.propertyValue || 0,
      downPayment: lead.lead_data?.downPayment || 0,
      income: lead.lead_data?.income || 0,
      creditScore: lead.lead_data?.creditScore || 0,
    }))

    const stats: BrokerDashboardStats = {
      totalLeads,
      pendingLeads,
      contactedLeads,
      convertedLeads,
      rejectedLeads,
      conversionRate: Math.round(conversionRate * 100) / 100,
      totalCommission: Math.round(totalCommission),
      monthlyCommission: Math.round(monthlyCommission),
      averageLeadScore: Math.round(averageLeadScore * 100) / 100,
      recentLeads,
    }

    // Track analytics
    analytics.trackBrokerDashboardAccess({
      brokerId: broker.id,
      totalLeads,
      conversionRate,
    })

    res.status(200).json({
      success: true,
      broker: {
        id: broker.id,
        name: broker.name,
        company: broker.company,
        email: broker.email,
        phone: broker.phone,
        commissionRate: broker.commission_rate,
        isActive: broker.is_active,
      },
      stats,
    })

  } catch (error) {
    errorTracking.captureException(error as Error, {
      context: 'broker_dashboard',
      userId,
    })
    handleError(res, error as Error, 'broker_dashboard')
  }
}

export default withSecurity(withAuth(handler))