'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, Calculator, Star, Clock } from 'lucide-react'

interface EngagementMetricsProps {
  metrics: {
    total_calculations: number
    total_rate_checks: number
    total_scenarios_saved: number
    total_leads_submitted: number
    total_dashboard_views: number
    avg_time_spent_minutes: number
  }
}

const EngagementMetrics: React.FC<EngagementMetricsProps> = ({ metrics }) => {
  const chartData = [
    { name: 'Calculations', value: metrics.total_calculations, icon: Calculator },
    { name: 'Rate Checks', value: metrics.total_rate_checks, icon: TrendingUp },
    { name: 'Scenarios', value: metrics.total_scenarios_saved, icon: Star },
    { name: 'Leads', value: metrics.total_leads_submitted, icon: Clock },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Engagement Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {chartData.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.name} className="flex items-center space-x-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-2xl font-bold">{item.value}</p>
                </div>
              </div>
            )
          })}
        </div>
        
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            Average time spent: <span className="font-semibold">{metrics.avg_time_spent_minutes} minutes</span>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default EngagementMetrics
