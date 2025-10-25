'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { TrendingUp, PieChart } from 'lucide-react'

interface AmortizationData {
  month: number
  principal: number
  interest: number
  balance: number
}

interface AmortizationChartProps {
  data: AmortizationData[]
  loading?: boolean
}

export function AmortizationChart({ data, loading = false }: AmortizationChartProps) {
  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-6 w-6 text-primary" />
            Amortization Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <span className="ml-2">Loading chart...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-6 w-6 text-primary" />
            Amortization Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No amortization data available
          </div>
        </CardContent>
      </Card>
    )
  }

  // Prepare data for charts
  const chartData = data.map((item, index) => ({
    month: item.month,
    principal: item.principal,
    interest: item.interest,
    balance: item.balance,
    year: Math.floor(item.month / 12) + 1,
  }))

  // Calculate totals
  const totalPrincipal = data.reduce((sum, item) => sum + item.principal, 0)
  const totalInterest = data.reduce((sum, item) => sum + item.interest, 0)
  const totalPaid = totalPrincipal + totalInterest

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Principal</p>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat('en-CA', {
                    style: 'currency',
                    currency: 'CAD',
                  }).format(totalPrincipal)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Interest</p>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat('en-CA', {
                    style: 'currency',
                    currency: 'CAD',
                  }).format(totalInterest)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat('en-CA', {
                    style: 'currency',
                    currency: 'CAD',
                  }).format(totalPaid)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Principal vs Interest Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Principal vs Interest Payments</CardTitle>
          <p className="text-sm text-muted-foreground">
            Monthly breakdown of principal and interest payments
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.slice(0, 60)}> {/* Show first 5 years */}
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tickFormatter={(value) => `Month ${value}`}
                />
                <YAxis 
                  tickFormatter={(value) => 
                    new Intl.NumberFormat('en-CA', {
                      style: 'currency',
                      currency: 'CAD',
                      minimumFractionDigits: 0,
                    }).format(value)
                  }
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    new Intl.NumberFormat('en-CA', {
                      style: 'currency',
                      currency: 'CAD',
                    }).format(value),
                    name === 'principal' ? 'Principal' : 'Interest'
                  ]}
                  labelFormatter={(value) => `Month ${value}`}
                />
                <Bar dataKey="principal" fill="#10b981" name="principal" />
                <Bar dataKey="interest" fill="#3b82f6" name="interest" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Remaining Balance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Remaining Balance Over Time</CardTitle>
          <p className="text-sm text-muted-foreground">
            How your mortgage balance decreases over time
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="year" 
                  tickFormatter={(value) => `Year ${value}`}
                />
                <YAxis 
                  tickFormatter={(value) => 
                    new Intl.NumberFormat('en-CA', {
                      style: 'currency',
                      currency: 'CAD',
                      minimumFractionDigits: 0,
                    }).format(value)
                  }
                />
                <Tooltip 
                  formatter={(value: number) => [
                    new Intl.NumberFormat('en-CA', {
                      style: 'currency',
                      currency: 'CAD',
                    }).format(value),
                    'Remaining Balance'
                  ]}
                  labelFormatter={(value) => `Year ${value}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Payment Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Breakdown</CardTitle>
          <p className="text-sm text-muted-foreground">
            Detailed breakdown of your monthly payments
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Month</th>
                  <th className="text-right py-2">Principal</th>
                  <th className="text-right py-2">Interest</th>
                  <th className="text-right py-2">Balance</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 12).map((item) => (
                  <tr key={item.month} className="border-b">
                    <td className="py-2">{item.month}</td>
                    <td className="text-right py-2">
                      {new Intl.NumberFormat('en-CA', {
                        style: 'currency',
                        currency: 'CAD',
                      }).format(item.principal)}
                    </td>
                    <td className="text-right py-2">
                      {new Intl.NumberFormat('en-CA', {
                        style: 'currency',
                        currency: 'CAD',
                      }).format(item.interest)}
                    </td>
                    <td className="text-right py-2">
                      {new Intl.NumberFormat('en-CA', {
                        style: 'currency',
                        currency: 'CAD',
                      }).format(item.balance)}
                    </td>
                  </tr>
                ))}
                {data.length > 12 && (
                  <tr>
                    <td colSpan={4} className="text-center py-2 text-muted-foreground">
                      ... and {data.length - 12} more months
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}