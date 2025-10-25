'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  LineChart,
  Download,
  Share2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react'
import {
  LineChart as RechartsLineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { ScenarioResult, ScenarioComparison } from '@/lib/scenario-types'

interface ScenarioComparisonChartProps {
  comparison: ScenarioComparison
  onExport?: (format: 'pdf' | 'excel' | 'csv') => void
  onShare?: () => void
  showAIInsights?: boolean
}

export function ScenarioComparisonChart({ 
  comparison, 
  onExport, 
  onShare,
  showAIInsights = false 
}: ScenarioComparisonChartProps) {
  const [activeChart, setActiveChart] = useState('overview')
  const [visibleScenarios, setVisibleScenarios] = useState<Set<string>>(
    new Set(comparison.scenarios.map(s => s.scenarioId))
  )

  // Prepare data for different chart types
  const chartData = useMemo(() => {
    return comparison.scenarios
      .filter(s => visibleScenarios.has(s.scenarioId))
      .map((scenario, index) => ({
        name: `Scenario ${index + 1}`,
        scenarioId: scenario.scenarioId,
        monthlyPayment: scenario.monthlyPayment,
        totalInterest: scenario.totalInterest,
        totalCost: scenario.totalCost,
        principalPaid: scenario.principalPaid,
        gdsRatio: scenario.gdsRatio * 100,
        tdsRatio: scenario.tdsRatio * 100,
        qualificationResult: scenario.qualificationResult,
        riskLevel: scenario.riskFactors.length > 0 ? 
          scenario.riskFactors.filter(r => r.severity === 'high').length : 0,
      }))
  }, [comparison.scenarios, visibleScenarios])

  const amortizationData = useMemo(() => {
    const maxMonths = Math.max(...comparison.scenarios.map(s => s.amortizationSchedule.length))
    const data = []
    
    for (let month = 0; month < maxMonths; month += 12) { // Every 12 months
      const yearData: any = { year: Math.floor(month / 12) }
      
      comparison.scenarios.forEach((scenario, index) => {
        if (visibleScenarios.has(scenario.scenarioId)) {
          const scheduleEntry = scenario.amortizationSchedule[month]
          if (scheduleEntry) {
            yearData[`scenario${index + 1}_balance`] = scheduleEntry.balance
            yearData[`scenario${index + 1}_interest`] = scheduleEntry.cumulativeInterest
            yearData[`scenario${index + 1}_principal`] = scheduleEntry.cumulativePrincipal
          }
        }
      })
      
      data.push(yearData)
    }
    
    return data
  }, [comparison.scenarios, visibleScenarios])

  const pieData = useMemo(() => {
    const totalCost = chartData.reduce((sum, item) => sum + item.totalCost, 0)
    return chartData.map((item, index) => ({
      name: `Scenario ${index + 1}`,
      value: item.totalCost,
      percentage: ((item.totalCost / totalCost) * 100).toFixed(1),
      color: getScenarioColor(index),
    }))
  }, [chartData])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(value)
  }

  const getScenarioColor = (index: number) => {
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff']
    return colors[index % colors.length]
  }

  const toggleScenarioVisibility = (scenarioId: string) => {
    setVisibleScenarios(prev => {
      const newSet = new Set(prev)
      if (newSet.has(scenarioId)) {
        newSet.delete(scenarioId)
      } else {
        newSet.add(scenarioId)
      }
      return newSet
    })
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.dataKey}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Chart Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Scenario Comparison Visualization
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onExport?.('pdf')}>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button variant="outline" size="sm" onClick={onShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Scenario Visibility Toggle */}
          <div className="flex flex-wrap gap-2 mb-6">
            {comparison.scenarios.map((scenario, index) => (
              <Button
                key={scenario.scenarioId}
                variant={visibleScenarios.has(scenario.scenarioId) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleScenarioVisibility(scenario.scenarioId)}
                className="flex items-center gap-2"
              >
                {visibleScenarios.has(scenario.scenarioId) ? (
                  <Eye className="h-3 w-3" />
                ) : (
                  <EyeOff className="h-3 w-3" />
                )}
                Scenario {index + 1}
              </Button>
            ))}
          </div>

          {/* Chart Tabs */}
          <Tabs value={activeChart} onValueChange={setActiveChart}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="amortization">Amortization</TabsTrigger>
              <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
              <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Monthly Payment Comparison */}
              <div className="h-80">
                <h4 className="text-lg font-semibold mb-4">Monthly Payment Comparison</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar 
                      dataKey="monthlyPayment" 
                      fill="#8884d8" 
                      name="Monthly Payment"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Total Cost Comparison */}
              <div className="h-80">
                <h4 className="text-lg font-semibold mb-4">Total Cost Comparison</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="amortization" className="space-y-4">
              {/* Remaining Balance Over Time */}
              <div className="h-80">
                <h4 className="text-lg font-semibold mb-4">Remaining Balance Over Time</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={amortizationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {comparison.scenarios.map((scenario, index) => {
                      if (!visibleScenarios.has(scenario.scenarioId)) return null
                      return (
                        <Line
                          key={`balance-${index}`}
                          type="monotone"
                          dataKey={`scenario${index + 1}_balance`}
                          stroke={getScenarioColor(index)}
                          strokeWidth={2}
                          name={`Scenario ${index + 1} Balance`}
                        />
                      )
                    })}
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>

              {/* Interest vs Principal Over Time */}
              <div className="h-80">
                <h4 className="text-lg font-semibold mb-4">Interest vs Principal Over Time</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={amortizationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {comparison.scenarios.map((scenario, index) => {
                      if (!visibleScenarios.has(scenario.scenarioId)) return null
                      return (
                        <Area
                          key={`interest-${index}`}
                          type="monotone"
                          dataKey={`scenario${index + 1}_interest`}
                          stackId="1"
                          stroke={getScenarioColor(index)}
                          fill={getScenarioColor(index)}
                          name={`Scenario ${index + 1} Interest`}
                        />
                      )
                    })}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="breakdown" className="space-y-4">
              {/* GDS/TDS Ratio Comparison */}
              <div className="h-80">
                <h4 className="text-lg font-semibold mb-4">Debt Service Ratios</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `${value}%`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="gdsRatio" fill="#8884d8" name="GDS Ratio" />
                    <Bar dataKey="tdsRatio" fill="#82ca9d" name="TDS Ratio" />
                    <ReferenceLine y={32} stroke="red" strokeDasharray="5 5" label="GDS Limit" />
                    <ReferenceLine y={44} stroke="orange" strokeDasharray="5 5" label="TDS Limit" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Qualification Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {chartData.map((scenario, index) => (
                  <Card key={scenario.scenarioId}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-semibold">{scenario.name}</h5>
                        {scenario.qualificationResult ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>GDS Ratio:</span>
                          <span className={scenario.gdsRatio > 32 ? 'text-red-600' : 'text-green-600'}>
                            {scenario.gdsRatio.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>TDS Ratio:</span>
                          <span className={scenario.tdsRatio > 44 ? 'text-red-600' : 'text-green-600'}>
                            {scenario.tdsRatio.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Risk Level:</span>
                          <Badge variant={scenario.riskLevel > 2 ? 'destructive' : scenario.riskLevel > 0 ? 'secondary' : 'default'}>
                            {scenario.riskLevel > 2 ? 'High' : scenario.riskLevel > 0 ? 'Medium' : 'Low'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="risk" className="space-y-4">
              {/* Risk Factors Analysis */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold">Risk Factors Analysis</h4>
                {comparison.scenarios.map((scenario, index) => (
                  <Card key={scenario.scenarioId}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-semibold">Scenario {index + 1}</h5>
                        <Badge variant={scenario.riskFactors.length > 2 ? 'destructive' : scenario.riskFactors.length > 0 ? 'secondary' : 'default'}>
                          {scenario.riskFactors.length} Risk Factor{scenario.riskFactors.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {scenario.riskFactors.map((risk, riskIndex) => (
                          <div key={riskIndex} className="flex items-start gap-2 p-2 bg-muted rounded-lg">
                            <AlertCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                              risk.severity === 'high' ? 'text-red-500' : 
                              risk.severity === 'medium' ? 'text-yellow-500' : 'text-green-500'
                            }`} />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{risk.description}</p>
                              {risk.mitigation && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  <strong>Mitigation:</strong> {risk.mitigation}
                                </p>
                              )}
                            </div>
                            <Badge variant={
                              risk.severity === 'high' ? 'destructive' : 
                              risk.severity === 'medium' ? 'secondary' : 'default'
                            }>
                              {risk.severity}
                            </Badge>
                          </div>
                        ))}
                        {scenario.riskFactors.length === 0 && (
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            No significant risk factors identified
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* AI Insights Summary */}
      {showAIInsights && comparison.aiInsights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              AI Analysis Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Summary</h4>
                <p className="text-sm text-muted-foreground">{comparison.aiInsights.summary}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Pros</h4>
                  <ul className="space-y-1">
                    {comparison.aiInsights.pros.map((pro: string, index: number) => (
                      <li key={index} className="text-sm text-green-600 flex items-start gap-2">
                        <CheckCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Cons</h4>
                  <ul className="space-y-1">
                    {comparison.aiInsights.cons.map((con: string, index: number) => (
                      <li key={index} className="text-sm text-red-600 flex items-start gap-2">
                        <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Personalized Advice</h4>
                <p className="text-sm text-muted-foreground">{comparison.aiInsights.personalizedAdvice}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Next Steps</h4>
                <ul className="space-y-1">
                  {comparison.aiInsights.nextSteps.map((step: string, index: number) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5 flex-shrink-0">
                        {index + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}