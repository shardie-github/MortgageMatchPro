'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Download, 
  Filter,
  Search,
  Eye,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { trackDashboardView, trackReportExport, trackBrokerLogin } from '@/lib/analytics'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'

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
  avg_response_time_minutes: number
}

interface CommissionReport {
  id: string
  lead_id: string
  amount: number
  status: 'pending' | 'paid' | 'overdue'
  due_date: string
  created_at: string
}

export default function BrokerDashboard() {
  const { user } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [metrics, setMetrics] = useState<BrokerMetrics | null>(null)
  const [commissionReports, setCommissionReports] = useState<CommissionReport[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState('30')

  useEffect(() => {
    if (user) {
      loadDashboardData()
      trackDashboardView(user.id, 'broker')
      trackBrokerLogin(user.id, 'MortgageMatch Pro')
    }
  }, [user])

  const loadDashboardData = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      // Load leads assigned to this broker
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('broker_id', user.id)
        .order('created_at', { ascending: false })

      if (leadsError) throw leadsError
      setLeads(leadsData || [])

      // Load broker performance metrics
      const { data: metricsData, error: metricsError } = await supabase
        .rpc('get_broker_performance_summary', { 
          p_broker_id: user.id, 
          p_days: parseInt(dateRange) 
        })

      if (metricsError) throw metricsError
      setMetrics(metricsData?.[0] || null)

      // Load commission reports (mock data for now)
      setCommissionReports([
        {
          id: '1',
          lead_id: 'lead-1',
          amount: 2500,
          status: 'paid',
          due_date: '2024-01-15',
          created_at: '2024-01-01'
        },
        {
          id: '2',
          lead_id: 'lead-2',
          amount: 3200,
          status: 'pending',
          due_date: '2024-02-15',
          created_at: '2024-01-15'
        },
        {
          id: '3',
          lead_id: 'lead-3',
          amount: 1800,
          status: 'overdue',
          due_date: '2024-01-30',
          created_at: '2024-01-10'
        }
      ])

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', leadId)

      if (error) throw error
      loadDashboardData() // Refresh the data
    } catch (error) {
      console.error('Error updating lead status:', error)
    }
  }

  const handleExportReport = async (format: 'pdf' | 'csv') => {
    if (!user) return

    try {
      trackReportExport(user.id, 'broker_dashboard', format)
      
      const reportData = {
        leads: leads,
        metrics: metrics,
        commissions: commissionReports,
        generated_at: new Date().toISOString(),
      }

      if (format === 'csv') {
        const csvContent = generateCSV(reportData)
        downloadFile(csvContent, 'broker-dashboard.csv', 'text/csv')
      } else {
        console.log('PDF export not implemented yet')
      }
    } catch (error) {
      console.error('Error exporting report:', error)
    }
  }

  const generateCSV = (data: any) => {
    const headers = ['Lead Name', 'Email', 'Phone', 'Status', 'Lead Score', 'Created At']
    const rows = data.leads.map((lead: Lead) => [
      lead.name,
      lead.email,
      lead.phone,
      lead.status,
      lead.lead_score,
      lead.created_at
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

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter
    return matchesSearch && matchesStatus
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'converted': return 'text-green-600 bg-green-100'
      case 'contacted': return 'text-blue-600 bg-blue-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'rejected': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'converted': return <CheckCircle className="h-4 w-4" />
      case 'contacted': return <Clock className="h-4 w-4" />
      case 'pending': return <AlertCircle className="h-4 w-4" />
      case 'rejected': return <XCircle className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading broker dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Broker Dashboard</h1>
          <p className="text-muted-foreground">Manage leads and track your performance</p>
        </div>
        <div className="flex gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
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
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Leads</p>
                    <p className="text-2xl font-bold">{metrics?.total_leads_received || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Contacted</p>
                    <p className="text-2xl font-bold">{metrics?.total_leads_contacted || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Converted</p>
                    <p className="text-2xl font-bold">{metrics?.total_leads_converted || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Conversion Rate</p>
                    <p className="text-2xl font-bold">{metrics?.avg_conversion_rate?.toFixed(1) || 0}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Commission Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Commission:</span>
                    <span className="font-semibold">{formatCurrency(metrics?.total_commission || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Response Time:</span>
                    <span className="font-semibold">{metrics?.avg_response_time_minutes || 0} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Leads:</span>
                    <span className="font-semibold">{leads.filter(l => l.status === 'pending' || l.status === 'contacted').length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leads.slice(0, 5).map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(lead.status)}
                        <div>
                          <p className="font-medium text-sm">{lead.name}</p>
                          <p className="text-xs text-muted-foreground">Score: {lead.lead_score}</p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(lead.status)}>
                        {lead.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Leads Tab */}
        <TabsContent value="leads" className="space-y-6">
          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="contacted">Contacted</option>
              <option value="converted">Converted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Leads Table */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{lead.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {lead.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {lead.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(lead.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Lead Score</p>
                        <p className="font-semibold">{lead.lead_score}/100</p>
                      </div>
                      <Badge className={getStatusColor(lead.status)}>
                        {lead.status}
                      </Badge>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateLeadStatus(lead.id, 'contacted')}
                          disabled={lead.status === 'contacted' || lead.status === 'converted'}
                        >
                          <Phone className="h-4 w-4 mr-1" />
                          Contact
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateLeadStatus(lead.id, 'converted')}
                          disabled={lead.status === 'converted'}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Convert
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commissions Tab */}
        <TabsContent value="commissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Commission Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {commissionReports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <DollarSign className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Commission #{report.id}</h3>
                        <p className="text-sm text-muted-foreground">
                          Lead ID: {report.lead_id} • Due: {formatDate(report.due_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold">{formatCurrency(report.amount)}</p>
                        <Badge className={
                          report.status === 'paid' ? 'text-green-600 bg-green-100' :
                          report.status === 'pending' ? 'text-yellow-600 bg-yellow-100' :
                          'text-red-600 bg-red-100'
                        }>
                          {report.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Lead Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Pending', value: leads.filter(l => l.status === 'pending').length },
                          { name: 'Contacted', value: leads.filter(l => l.status === 'contacted').length },
                          { name: 'Converted', value: leads.filter(l => l.status === 'converted').length },
                          { name: 'Rejected', value: leads.filter(l => l.status === 'rejected').length },
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {[
                          { name: 'Pending', value: leads.filter(l => l.status === 'pending').length },
                          { name: 'Contacted', value: leads.filter(l => l.status === 'contacted').length },
                          { name: 'Converted', value: leads.filter(l => l.status === 'converted').length },
                          { name: 'Rejected', value: leads.filter(l => l.status === 'rejected').length },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#fbbf24', '#3b82f6', '#10b981', '#ef4444'][index % 4]} />
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
                <CardTitle>Monthly Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { month: 'Jan', leads: 12, converted: 3 },
                      { month: 'Feb', leads: 18, converted: 5 },
                      { month: 'Mar', leads: 15, converted: 4 },
                      { month: 'Apr', leads: 22, converted: 7 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="leads" fill="#3b82f6" name="Leads Received" />
                      <Bar dataKey="converted" fill="#10b981" name="Leads Converted" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lead Score Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { range: '0-20', count: leads.filter(l => l.lead_score <= 20).length },
                    { range: '21-40', count: leads.filter(l => l.lead_score > 20 && l.lead_score <= 40).length },
                    { range: '41-60', count: leads.filter(l => l.lead_score > 40 && l.lead_score <= 60).length },
                    { range: '61-80', count: leads.filter(l => l.lead_score > 60 && l.lead_score <= 80).length },
                    { range: '81-100', count: leads.filter(l => l.lead_score > 80).length },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8b5cf6" name="Number of Leads" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
