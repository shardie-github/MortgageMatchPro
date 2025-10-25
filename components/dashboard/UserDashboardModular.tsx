'use client'

import React, { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Download, BarChart3 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { trackDashboardView, trackReportExport, trackScenarioSave } from '@/lib/analytics'

// Import modular components
import EngagementMetrics from './modules/EngagementMetrics'
import ScenarioList from './modules/ScenarioList'
import AffordabilityTrends from './modules/AffordabilityTrends'

interface UserScenario {
  id: string
  scenario_name: string
  scenario_type: 'affordability' | 'rate_comparison' | 'amortization'
  scenario_data: any
  is_favorite: boolean
  tags: string[]
  created_at: string
  updated_at: string
}

interface EngagementMetricsData {
  total_calculations: number
  total_rate_checks: number
  total_scenarios_saved: number
  total_leads_submitted: number
  total_dashboard_views: number
  avg_time_spent_minutes: number
}

interface AffordabilityTrend {
  date: string
  max_affordable: number
  monthly_payment: number
  gds_ratio: number
  tds_ratio: number
}

export default function UserDashboardModular() {
  const { user } = useAuth()
  const [scenarios, setScenarios] = useState<UserScenario[]>([])
  const [engagementMetrics, setEngagementMetrics] = useState<EngagementMetricsData | null>(null)
  const [affordabilityTrends, setAffordabilityTrends] = useState<AffordabilityTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')

  useEffect(() => {
    if (user) {
      loadDashboardData()
      trackDashboardView(user.id)
    }
  }, [user])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Load scenarios
      const { data: scenariosData, error: scenariosError } = await supabase
        .from('user_scenarios')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (scenariosError) throw scenariosError
      setScenarios(scenariosData || [])

      // Load engagement metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('user_engagement_metrics')
        .select('*')
        .eq('user_id', user?.id)
        .single()

      if (metricsError) throw metricsError
      setEngagementMetrics(metricsData)

      // Load affordability trends
      const { data: trendsData, error: trendsError } = await supabase
        .from('affordability_trends')
        .select('*')
        .eq('user_id', user?.id)
        .order('date', { ascending: true })

      if (trendsError) throw trendsError
      setAffordabilityTrends(trendsData || [])

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveScenario = async (scenarioData: any, scenarioType: string, scenarioName: string) => {
    try {
      const { error } = await supabase
        .from('user_scenarios')
        .insert({
          user_id: user?.id,
          scenario_name: scenarioName,
          scenario_type: scenarioType,
          scenario_data: scenarioData,
          is_favorite: false,
          tags: [],
        })

      if (error) throw error

      await loadDashboardData()
      trackScenarioSave(user?.id, scenarioType)
    } catch (error) {
      console.error('Error saving scenario:', error)
    }
  }

  const handleToggleFavorite = async (scenarioId: string, isFavorite: boolean) => {
    try {
      const { error } = await supabase
        .from('user_scenarios')
        .update({ is_favorite: isFavorite })
        .eq('id', scenarioId)

      if (error) throw error

      setScenarios(prev => 
        prev.map(scenario => 
          scenario.id === scenarioId 
            ? { ...scenario, is_favorite: isFavorite }
            : scenario
        )
      )
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const handleDeleteScenario = async (scenarioId: string) => {
    try {
      const { error } = await supabase
        .from('user_scenarios')
        .delete()
        .eq('id', scenarioId)

      if (error) throw error

      setScenarios(prev => prev.filter(scenario => scenario.id !== scenarioId))
    } catch (error) {
      console.error('Error deleting scenario:', error)
    }
  }

  const handleViewScenario = (scenario: UserScenario) => {
    // Navigate to scenario view or open modal
    console.log('Viewing scenario:', scenario)
  }

  const handleExportReport = async (format: 'pdf' | 'csv') => {
    try {
      // Mock export functionality
      const reportData = {
        scenarios,
        engagementMetrics,
        affordabilityTrends,
        generatedAt: new Date().toISOString(),
      }

      if (format === 'pdf') {
        // Generate PDF report
        console.log('Generating PDF report:', reportData)
      } else {
        // Generate CSV report
        console.log('Generating CSV report:', reportData)
      }

      trackReportExport(user?.id, format)
    } catch (error) {
      console.error('Error exporting report:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.email}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleExportReport('pdf')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExportReport('csv')}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {engagementMetrics && (
              <EngagementMetrics metrics={engagementMetrics} />
            )}
            
            {affordabilityTrends.length > 0 && (
              <AffordabilityTrends trends={affordabilityTrends} />
            )}
          </div>
        </TabsContent>

        <TabsContent value="scenarios">
          <ScenarioList
            scenarios={scenarios}
            searchTerm={searchTerm}
            filterType={filterType}
            onSearchChange={setSearchTerm}
            onFilterChange={setFilterType}
            onSaveScenario={handleSaveScenario}
            onToggleFavorite={handleToggleFavorite}
            onDeleteScenario={handleDeleteScenario}
            onViewScenario={handleViewScenario}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {engagementMetrics && (
              <EngagementMetrics metrics={engagementMetrics} />
            )}
            
            {affordabilityTrends.length > 0 && (
              <AffordabilityTrends trends={affordabilityTrends} />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
