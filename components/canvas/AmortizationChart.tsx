'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { TrendingDown, PieChart, DollarSign } from 'lucide-react'

interface AmortizationEntry {
  month: number
  principal: number
  interest: number
  balance: number
}

interface AmortizationChartProps {
  data: AmortizationEntry[]
  monthlyPayment: number
  totalInterest: number
  totalCost: number
  termYears: number
}

export function AmortizationChart({ 
  data, 
  monthlyPayment, 
  totalInterest, 
  totalCost, 
  termYears 
}: AmortizationChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatTooltipCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(value)
  }

  // Prepare data for charts
  const chartData = data.map(entry => ({
    month: entry.month,
    principal: entry.principal,
    interest: entry.interest,
    balance: entry.balance,
    year: Math.ceil(entry.month / 12),
  }))

  // Calculate yearly data for the bar chart
  const yearlyData = Array.from({ length: termYears }, (_, i) => {
    const yearStart = i * 12 + 1
    const yearEnd = Math.min((i + 1) * 12, data.length)
    const yearEntries = data.slice(yearStart - 1, yearEnd)
    
    const totalPrincipal = yearEntries.reduce((sum, entry) => sum + entry.principal, 0)
    const totalInterest = yearEntries.reduce((sum, entry) => sum + entry.interest, 0)
    
    return {
      year: i + 1,
      principal: totalPrincipal,
      interest: totalInterest,
      balance: yearEntries[yearEntries.length - 1]?.balance || 0,
    }
  })

  const summaryData = [
    { name: 'Principal', value: totalCost - totalInterest, color: '#22c55e' },
    { name: 'Interest', value: totalInterest, color: '#ef4444' },
  ]

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Monthly Payment</p>
                <p className="text-2xl font-bold">{formatCurrency(monthlyPayment)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Interest</p>
                <p className="text-2xl font-bold">{formatCurrency(totalInterest)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold">{formatCurrency(totalCost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Interest Ratio</p>
                <p className="text-2xl font-bold">
                  {((totalInterest / totalCost) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Amortization Schedule Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Amortization Schedule</CardTitle>
          <p className="text-sm text-muted-foreground">
            Principal vs Interest payments over time
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                tickFormatter={(value) => `Year ${Math.ceil(value / 12)}`}
                interval="preserveStartEnd"
              />
              <YAxis 
                tickFormatter={formatTooltipCurrency}
                domain={[0, 'dataMax']}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  formatTooltipCurrency(value), 
                  name === 'principal' ? 'Principal' : name === 'interest' ? 'Interest' : 'Balance'
                ]}
                labelFormatter={(value) => `Month ${value}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="principal" 
                stroke="#22c55e" 
                strokeWidth={2}
                name="Principal"
              />
              <Line 
                type="monotone" 
                dataKey="interest" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="Interest"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Yearly Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Yearly Payment Breakdown</CardTitle>
          <p className="text-sm text-muted-foreground">
            Principal and interest payments by year
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={yearlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={formatTooltipCurrency} />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  formatTooltipCurrency(value), 
                  name === 'principal' ? 'Principal' : 'Interest'
                ]}
              />
              <Legend />
              <Bar dataKey="principal" fill="#22c55e" name="Principal" />
              <Bar dataKey="interest" fill="#ef4444" name="Interest" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Principal vs Interest Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Composition</CardTitle>
          <p className="text-sm text-muted-foreground">
            Total principal vs interest over the life of the loan
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            <div className="w-64 h-64 relative">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="128"
                  cy="128"
                  r="100"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="20"
                />
                <circle
                  cx="128"
                  cy="128"
                  r="100"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="20"
                  strokeDasharray={`${2 * Math.PI * 100 * (totalCost - totalInterest) / totalCost} ${2 * Math.PI * 100}`}
                  strokeDashoffset="0"
                />
                <circle
                  cx="128"
                  cy="128"
                  r="100"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="20"
                  strokeDasharray={`${2 * Math.PI * 100 * totalInterest / totalCost} ${2 * Math.PI * 100}`}
                  strokeDashoffset={`-${2 * Math.PI * 100 * (totalCost - totalInterest) / totalCost}`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {((totalCost - totalInterest) / totalCost * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Principal</div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm">Principal: {formatCurrency(totalCost - totalInterest)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm">Interest: {formatCurrency(totalInterest)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}