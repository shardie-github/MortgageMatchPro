'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, DollarSign, Home } from 'lucide-react'

interface AffordabilityTrend {
  date: string
  max_affordable: number
  monthly_payment: number
  gds_ratio: number
  tds_ratio: number
}

interface AffordabilityTrendsProps {
  trends: AffordabilityTrend[]
}

const AffordabilityTrends: React.FC<AffordabilityTrendsProps> = ({ trends }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      month: 'short',
      day: 'numeric'
    })
  }

  const chartData = trends.map(trend => ({
    ...trend,
    date: formatDate(trend.date),
    maxAffordableFormatted: formatCurrency(trend.max_affordable),
    monthlyPaymentFormatted: formatCurrency(trend.monthly_payment)
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Affordability Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'max_affordable' || name === 'monthly_payment') {
                    return [formatCurrency(value as number), name.replace('_', ' ')]
                  }
                  return [value, name.replace('_', ' ')]
                }}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="max_affordable"
                stroke="#8884d8"
                strokeWidth={2}
                name="Max Affordable"
                dot={{ r: 4 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="monthly_payment"
                stroke="#82ca9d"
                strokeWidth={2}
                name="Monthly Payment"
                dot={{ r: 4 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="gds_ratio"
                stroke="#ffc658"
                strokeWidth={2}
                name="GDS Ratio"
                dot={{ r: 4 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="tds_ratio"
                stroke="#ff7300"
                strokeWidth={2}
                name="TDS Ratio"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
            <Home className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">Max Affordable</p>
              <p className="text-lg font-bold text-blue-600">
                {formatCurrency(trends[trends.length - 1]?.max_affordable || 0)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
            <DollarSign className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-900">Monthly Payment</p>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(trends[trends.length - 1]?.monthly_payment || 0)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default AffordabilityTrends
