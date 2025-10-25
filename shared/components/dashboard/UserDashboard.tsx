'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3, 
  TrendingUp, 
  Calculator, 
  Download, 
  Star, 
  Clock, 
  Search,
  Plus,
  Edit,
  Trash2,
  Eye
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { trackDashboardView, trackReportExport, trackScenarioSave } from '@/lib/analytics'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'

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

interface EngagementMetrics {
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
}

export default function UserDashboard() {
  const { user } = useAuth()
  const [scenarios, setScenarios] = useState<UserScenario[]>([])
  const [engagementMetrics, setEngagementMetrics] = useState<EngagementMetrics | null>(null)
  const [affordabilityTrends, setAffordabilityTrends] = useState<AffordabilityTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')

  useEffect(() => {
    if (user) {
      loadDashboardData()
      trackDashboardView(user.id, 'user')
    }
  }, [user])

  const loadDashboardData = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      // Load user scenarios
      const { data: scenariosData, error: scenariosError } = await supabase
        .from('user_scenarios')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (scenariosError) throw scenariosError
      setScenarios(scenariosData || [])

      // Load engagement metrics
      const { data: metricsData, error: metricsError } = await supabase
        .rpc('get_user_engagement_summary', { p_user_id: user.id, p_days: 30 })

      if (metricsError) throw metricsError
      setEngagementMetrics(metricsData?.[0] || null)

      // Load affordability trends (mock data for now)
      setAffordabilityTrends([
        { date: '2024-01-01', max_affordable: 500000, monthly_payment: 2500, gds_ratio: 32 },
        { date: '2024-01-15', max_affordable: 520000, monthly_payment: 2600, gds_ratio: 33 },
        { date: '2024-02-01', max_affordable: 510000, monthly_payment: 2550, gds_ratio: 32.5 },
        { date: '2024-02-15', max_affordable: 530000, monthly_payment: 2650, gds_ratio: 33.5 },
        { date: '2024-03-01', max_affordable: 540000, monthly_payment: 2700, gds_ratio: 34 },
      ])

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveScenario = async (scenarioData: any, scenarioType: string, scenarioName: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('user_scenarios')
        .insert({
          user_id: user.id,
          scenario_name: scenarioName,
          scenario_type: scenarioType,
          scenario_data: scenarioData,
        })

      if (error) throw error

      trackScenarioSave(user.id, scenarioType, scenarioData.propertyPrice || 0)
      loadDashboardData() // Refresh the list
    } catch (error) {
      console.error('Error saving scenario:', error)
    }
  }

  const handleToggleFavorite = async (scenarioId: string, isFavorite: boolean) => {
    try {
      const { error } = await supabase
        .from('user_scenarios')
        .update({ is_favorite: !isFavorite })
        .eq('id', scenarioId)

      if (error) throw error
      loadDashboardData() // Refresh the list
    } catch (error) {
      console.error('Error updating favorite:', error)
    }
  }

  const handleDeleteScenario = async (scenarioId: string) => {
    try {
      const { error } = await supabase
        .from('user_scenarios')
        .delete()
        .eq('id', scenarioId)

      if (error) throw error
      loadDashboardData() // Refresh the list
    } catch (error) {
      console.error('Error deleting scenario:', error)
    }
  }

  const handleExportReport = async (format: 'pdf' | 'csv') => {
    if (!user) return

    try {
      trackReportExport(user.id, 'user_dashboard', format)
      
      // Mock export functionality
      const reportData = {
        scenarios: scenarios,
        metrics: engagementMetrics,
        generated_at: new Date().toISOString(),
      }

      if (format === 'csv') {
        // Generate CSV
        const csvContent = generateCSV(reportData)
        downloadFile(csvContent, 'user-dashboard.csv', 'text/csv')
      } else {
        // Generate PDF (would need a PDF library)
        console.log('PDF export not implemented yet')
      }
    } catch (error) {
      console.error('Error exporting report:', error)
    }
  }

  const generateCSV = (data: any) => {
    // Simple CSV generation
    const headers = ['Scenario Name', 'Type', 'Created At', 'Is Favorite']
    const rows = data.scenarios.map((s: UserScenario) => [
      s.scenario_name,
      s.scenario_type,
      s.created_at,
      s.is_favorite ? 'Yes' : 'No'
    ])
    
    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const filteredScenarios = scenarios.filter(scenario => {
    const matchesSearch = scenario.scenario_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterType === 'all' || scenario.scenario_type === filterType
    return matchesSearch && matchesFilter
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Dashboard</h1>
          <p className="text-muted-foreground">Track your mortgage calculations and insights</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handleExportReport('csv')} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => handleExportReport('pdf')} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scenarios">My Scenarios</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Calculations</p>
                    <p className="text-2xl font-bold">{engagementMetrics?.total_calculations || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Rate Checks</p>
                    <p className="text-2xl font-bold">{engagementMetrics?.total_rate_checks || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Scenarios Saved</p>
                    <p className="text-2xl font-bold">{engagementMetrics?.total_scenarios_saved || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Avg. Time Spent</p>
                    <p className="text-2xl font-bold">{Math.round(engagementMetrics?.avg_time_spent_minutes || 0)}m</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scenarios.slice(0, 5).map((scenario) => (
                  <div key={scenario.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {scenario.scenario_type === 'affordability' && <Calculator className="h-4 w-4 text-primary" />}
                        {scenario.scenario_type === 'rate_comparison' && <TrendingUp className="h-4 w-4 text-green-500" />}
                        {scenario.scenario_type === 'amortization' && <BarChart3 className="h-4 w-4 text-blue-500" />}
                      </div>
                      <div>
                        <p className="font-medium">{scenario.scenario_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(scenario.created_at)} • {scenario.scenario_type.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {scenario.is_favorite && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                      <Badge variant="secondary">{scenario.scenario_type}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scenarios Tab */}
        <TabsContent value="scenarios" className="space-y-6">
          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search scenarios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="affordability">Affordability</option>
              <option value="rate_comparison">Rate Comparison</option>
              <option value="amortization">Amortization</option>
            </select>
          </div>

          {/* Scenarios Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredScenarios.map((scenario) => (
              <Card key={scenario.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{scenario.scenario_name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">{scenario.scenario_type.replace('_', ' ')}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(scenario.created_at)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleFavorite(scenario.id, scenario.is_favorite)}
                    >
                      <Star className={`h-4 w-4 ${scenario.is_favorite ? 'text-yellow-500 fill-current' : 'text-muted-foreground'}`} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {scenario.scenario_data.propertyPrice && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Property Price:</span>
                        <span className="font-medium">{formatCurrency(scenario.scenario_data.propertyPrice)}</span>
                      </div>
                    )}
                    {scenario.scenario_data.monthlyPayment && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Monthly Payment:</span>
                        <span className="font-medium">{formatCurrency(scenario.scenario_data.monthlyPayment)}</span>
                      </div>
                    )}
                    {scenario.scenario_data.interestRate && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Interest Rate:</span>
                        <span className="font-medium">{scenario.scenario_data.interestRate}%</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteScenario(scenario.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredScenarios.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No scenarios found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || filterType !== 'all' 
                    ? 'Try adjusting your search or filter criteria'
                    : 'Start by creating your first mortgage calculation'
                  }
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Scenario
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Affordability Trends</CardTitle>
              <p className="text-sm text-muted-foreground">Track how your affordability has changed over time</p>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={affordabilityTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'max_affordable' ? formatCurrency(Number(value)) : value,
                        name === 'max_affordable' ? 'Max Affordable' : 
                        name === 'monthly_payment' ? 'Monthly Payment' : 'GDS Ratio'
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="max_affordable" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="max_affordable"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="monthly_payment" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      name="monthly_payment"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Scenario Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Affordability', value: scenarios.filter(s => s.scenario_type === 'affordability').length },
                          { name: 'Rate Comparison', value: scenarios.filter(s => s.scenario_type === 'rate_comparison').length },
                          { name: 'Amortization', value: scenarios.filter(s => s.scenario_type === 'amortization').length },
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {[
                          { name: 'Affordability', value: scenarios.filter(s => s.scenario_type === 'affordability').length },
                          { name: 'Rate Comparison', value: scenarios.filter(s => s.scenario_type === 'rate_comparison').length },
                          { name: 'Amortization', value: scenarios.filter(s => s.scenario_type === 'amortization').length },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#8884d8', '#82ca9d', '#ffc658'][index % 3]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { month: 'Jan', calculations: 12, scenarios: 3 },
                      { month: 'Feb', calculations: 18, scenarios: 5 },
                      { month: 'Mar', calculations: 15, scenarios: 4 },
                      { month: 'Apr', calculations: 22, scenarios: 7 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="calculations" fill="#8884d8" name="Calculations" />
                      <Bar dataKey="scenarios" fill="#82ca9d" name="Scenarios Saved" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Key Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Most Used Scenario Type</h4>
                  <p className="text-blue-700">
                    You've created {Math.max(...['affordability', 'rate_comparison', 'amortization'].map(type => 
                      scenarios.filter(s => s.scenario_type === type).length
                    ))} {scenarios.length > 0 ? scenarios.reduce((a, b) => 
                      scenarios.filter(s => s.scenario_type === a.scenario_type).length > 
                      scenarios.filter(s => s.scenario_type === b.scenario_type).length ? a : b
                    ).scenario_type.replace('_', ' ') : 'affordability'} calculations
                  </p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">Average Property Price</h4>
                  <p className="text-green-700">
                    {scenarios.length > 0 ? formatCurrency(
                      scenarios.reduce((sum, s) => sum + (s.scenario_data.propertyPrice || 0), 0) / scenarios.length
                    ) : '--'} across all your scenarios
                  </p>
                </div>
                
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-2">Engagement Level</h4>
                  <p className="text-purple-700">
                    You've spent an average of {Math.round(engagementMetrics?.avg_time_spent_minutes || 0)} minutes per session
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">💡 Try Rate Comparison</h4>
                  <p className="text-sm text-muted-foreground">
                    You haven't created any rate comparison scenarios yet. Compare different mortgage rates to find the best deal.
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">📊 Save More Scenarios</h4>
                  <p className="text-sm text-muted-foreground">
                    Save your calculations to track trends and compare different scenarios over time.
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">🔄 Regular Updates</h4>
                  <p className="text-sm text-muted-foreground">
                    Check back regularly to see how market changes affect your affordability.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
