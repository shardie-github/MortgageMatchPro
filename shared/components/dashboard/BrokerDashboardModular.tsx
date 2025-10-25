'use client'

import React, { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { trackDashboardView, trackReportExport, trackBrokerLogin } from '@/lib/analytics'
import { LeadManagement } from './modules/LeadManagement'
import { BrokerMetrics } from './modules/BrokerMetrics'
import { QuickActions } from './modules/QuickActions'

interface Lead {
  id: string
  name: string
  email: string
  phone: string
  lead_score: number
  status: 'pending' | 'contacted' | 'converted' | 'rejected'
  created_at: string
  updated_at: string
  broker_id: string | null
  lead_data: any
}

interface BrokerMetrics {
  total_leads_received: number
  total_leads_contacted: number
  total_leads_converted: number
  avg_conversion_rate: number
  total_commission: number
  avg_lead_value: number
  response_time_hours: number
  client_satisfaction_score: number
}

interface CommissionReport {
  id: string
  month: string
  total_commission: number
  leads_converted: number
  avg_deal_size: number
}

interface LeadSource {
  source: string
  count: number
  conversion_rate: number
}

export const BrokerDashboardModular: React.FC = () => {
  const { user } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [metrics, setMetrics] = useState<BrokerMetrics>({
    total_leads_received: 0,
    total_leads_contacted: 0,
    total_leads_converted: 0,
    avg_conversion_rate: 0,
    total_commission: 0,
    avg_lead_value: 0,
    response_time_hours: 0,
    client_satisfaction_score: 0
  })
  const [leadTrends, setLeadTrends] = useState<Array<{
    date: string
    leads: number
    converted: number
  }>>([])
  const [commissionReports, setCommissionReports] = useState<CommissionReport[]>([])
  const [leadSources, setLeadSources] = useState<LeadSource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadDashboardData()
      trackBrokerLogin(user.id)
    }
  }, [user])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load leads
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('broker_id', user?.id)
        .order('created_at', { ascending: false })

      if (leadsError) throw leadsError
      setLeads(leadsData || [])

      // Load metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('broker_metrics')
        .select('*')
        .eq('broker_id', user?.id)
        .single()

      if (metricsError && metricsError.code !== 'PGRST116') {
        throw metricsError
      }
      setMetrics(metricsData || metrics)

      // Load lead trends (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const { data: trendsData, error: trendsError } = await supabase
        .from('lead_trends')
        .select('*')
        .eq('broker_id', user?.id)
        .gte('date', thirtyDaysAgo.toISOString())
        .order('date', { ascending: true })

      if (trendsError) throw trendsError
      setLeadTrends(trendsData || [])

      // Load commission reports
      const { data: commissionData, error: commissionError } = await supabase
        .from('commission_reports')
        .select('*')
        .eq('broker_id', user?.id)
        .order('month', { ascending: false })
        .limit(6)

      if (commissionError) throw commissionError
      setCommissionReports(commissionData || [])

      // Load lead sources
      const { data: sourcesData, error: sourcesError } = await supabase
        .from('lead_sources')
        .select('*')
        .eq('broker_id', user?.id)
        .order('count', { ascending: false })

      if (sourcesError) throw sourcesError
      setLeadSources(sourcesData || [])

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLeadUpdate = async (leadId: string, updates: Partial<Lead>) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', leadId)

      if (error) throw error

      setLeads(prev => prev.map(lead => 
        lead.id === leadId ? { ...lead, ...updates } : lead
      ))

      // Refresh metrics after lead update
      loadDashboardData()
    } catch (error) {
      console.error('Error updating lead:', error)
    }
  }

  const handleLeadContact = async (leadId: string) => {
    await handleLeadUpdate(leadId, { 
      status: 'contacted',
      updated_at: new Date().toISOString()
    })
  }

  const handleLeadConvert = async (leadId: string) => {
    await handleLeadUpdate(leadId, { 
      status: 'converted',
      updated_at: new Date().toISOString()
    })
  }

  const handleLeadReject = async (leadId: string) => {
    await handleLeadUpdate(leadId, { 
      status: 'rejected',
      updated_at: new Date().toISOString()
    })
  }

  const handleExportLeads = async () => {
    try {
      trackReportExport('leads', user?.id)
      
      // Create CSV data
      const csvData = leads.map(lead => ({
        Name: lead.name,
        Email: lead.email,
        Phone: lead.phone,
        'Lead Score': lead.lead_score,
        Status: lead.status,
        'Created At': new Date(lead.created_at).toLocaleDateString(),
        'Updated At': new Date(lead.updated_at).toLocaleDateString()
      }))

      // Convert to CSV
      const headers = Object.keys(csvData[0])
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => headers.map(header => row[header]).join(','))
      ].join('\n')

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting leads:', error)
    }
  }

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'export':
        handleExportLeads()
        break
      case 'import':
        // Implement import functionality
        console.log('Import data')
        break
      case 'settings':
        // Navigate to settings
        console.log('Open settings')
        break
      case 'message':
        // Open messaging interface
        console.log('Send message')
        break
      case 'meeting':
        // Open calendar/scheduling
        console.log('Schedule meeting')
        break
      case 'report':
        // Generate report
        console.log('Generate report')
        break
      case 'team':
        // Manage team
        console.log('Manage team')
        break
      case 'analytics':
        // View detailed analytics
        console.log('View analytics')
        break
      case 'notifications':
        // Manage notifications
        console.log('Manage notifications')
        break
      case 'help':
        // Get help
        console.log('Get help')
        break
      default:
        console.log('Unknown action:', action)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Broker Dashboard</h1>
          <p className="text-gray-600">Manage your leads and track performance</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="actions">Quick Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <BrokerMetrics
            metrics={metrics}
            leadTrends={leadTrends}
            commissionReports={commissionReports}
            leadSources={leadSources}
          />
        </TabsContent>

        <TabsContent value="leads">
          <LeadManagement
            leads={leads}
            onLeadUpdate={handleLeadUpdate}
            onLeadContact={handleLeadContact}
            onLeadConvert={handleLeadConvert}
            onLeadReject={handleLeadReject}
            onExportLeads={handleExportLeads}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <BrokerMetrics
            metrics={metrics}
            leadTrends={leadTrends}
            commissionReports={commissionReports}
            leadSources={leadSources}
          />
        </TabsContent>

        <TabsContent value="actions">
          <QuickActions
            onExportData={handleExportLeads}
            onImportData={() => handleQuickAction('import')}
            onOpenSettings={() => handleQuickAction('settings')}
            onSendMessage={() => handleQuickAction('message')}
            onScheduleMeeting={() => handleQuickAction('meeting')}
            onGenerateReport={() => handleQuickAction('report')}
            onManageTeam={() => handleQuickAction('team')}
            onViewAnalytics={() => handleQuickAction('analytics')}
            onManageNotifications={() => handleQuickAction('notifications')}
            onGetHelp={() => handleQuickAction('help')}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}