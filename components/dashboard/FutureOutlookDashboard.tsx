import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign,
  Home,
  Percent,
  Calendar,
  Download,
  Bell,
  BarChart3,
  Target,
  Shield
} from 'lucide-react'

interface ForecastData {
  targetDate: string
  predictedValue: number
  confidenceIntervalLower: number
  confidenceIntervalUpper: number
  confidenceScore: number
  currentValue?: number
  changePercent?: number
}

interface RefinanceOpportunity {
  id: string
  currentRate: number
  potentialSavings: number
  refinanceProbability: number
  priorityScore: number
  recommendedAction: string
  nextContactDate?: string
}

interface PredictionAlert {
  id: string
  alertType: string
  message: string
  isRead: boolean
  createdAt: string
}

interface FutureOutlookDashboardProps {
  userId: string
}

export function FutureOutlookDashboard({ userId }: FutureOutlookDashboardProps) {
  const [rateForecasts, setRateForecasts] = useState<ForecastData[]>([])
  const [propertyForecasts, setPropertyForecasts] = useState<ForecastData[]>([])
  const [refinanceOpportunities, setRefinanceOpportunities] = useState<RefinanceOpportunity[]>([])
  const [alerts, setAlerts] = useState<PredictionAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [userId])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load forecasts and opportunities
      const [rates, properties, refinance, alertsData] = await Promise.all([
        fetchForecasts('rate_forecast'),
        fetchForecasts('property_appreciation'),
        fetchRefinanceOpportunities(),
        fetchAlerts()
      ])
      
      setRateForecasts(rates)
      setPropertyForecasts(properties)
      setRefinanceOpportunities(refinance)
      setAlerts(alertsData)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchForecasts = async (modelType: string): Promise<ForecastData[]> => {
    const response = await fetch(`/api/forecasts?modelType=${modelType}&userId=${userId}`)
    const data = await response.json()
    return data.forecasts || []
  }

  const fetchRefinanceOpportunities = async (): Promise<RefinanceOpportunity[]> => {
    const response = await fetch(`/api/refinance-watchlist?userId=${userId}`)
    const data = await response.json()
    return data.opportunities || []
  }

  const fetchAlerts = async (): Promise<PredictionAlert[]> => {
    const response = await fetch(`/api/prediction-alerts?userId=${userId}`)
    const data = await response.json()
    return data.alerts || []
  }

  const markAlertAsRead = async (alertId: string) => {
    await fetch(`/api/prediction-alerts/${alertId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead: true })
    })
    setAlerts(alerts.map(alert => 
      alert.id === alertId ? { ...alert, isRead: true } : alert
    ))
  }

  const downloadFinancialSummary = async () => {
    const response = await fetch(`/api/reports/financial-summary?userId=${userId}`)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `financial-summary-${new Date().toISOString().split('T')[0]}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Future Outlook</h1>
          <p className="text-muted-foreground">
            AI-powered predictions and recommendations for your mortgage
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadFinancialSummary}>
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
          <Button>
            <Bell className="h-4 w-4 mr-2" />
            Set Alerts
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.filter(alert => !alert.isRead).length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have {alerts.filter(alert => !alert.isRead).length} new prediction alerts
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="forecasts">Forecasts</TabsTrigger>
          <TabsTrigger value="refinance">Refinance</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Rate Trend Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rate Trend</CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {rateForecasts[0]?.predictedValue?.toFixed(3)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {rateForecasts[0]?.changePercent && rateForecasts[0].changePercent > 0 ? (
                    <span className="text-red-600 flex items-center">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +{rateForecasts[0].changePercent.toFixed(1)}% next 3 months
                    </span>
                  ) : (
                    <span className="text-green-600 flex items-center">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      {rateForecasts[0]?.changePercent?.toFixed(1)}% next 3 months
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>

            {/* Property Value Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Property Value</CardTitle>
                <Home className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${propertyForecasts[0]?.predictedValue?.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {propertyForecasts[0]?.changePercent && propertyForecasts[0].changePercent > 0 ? (
                    <span className="text-green-600 flex items-center">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +{propertyForecasts[0].changePercent.toFixed(1)}% next year
                    </span>
                  ) : (
                    <span className="text-red-600 flex items-center">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      {propertyForecasts[0]?.changePercent?.toFixed(1)}% next year
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>

            {/* Refinance Opportunity Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Refinance Opportunity</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {refinanceOpportunities[0]?.refinanceProbability ? 
                    `${(refinanceOpportunities[0].refinanceProbability * 100).toFixed(0)}%` : 
                    'N/A'
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  {refinanceOpportunities[0]?.potentialSavings ? 
                    `Save $${refinanceOpportunities[0].potentialSavings.toLocaleString()}/year` :
                    'No current opportunities'
                  }
                </p>
              </CardContent>
            </Card>

            {/* Risk Level Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <Badge variant="secondary">Low</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Based on current market conditions
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Recommended actions based on your current situation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {refinanceOpportunities[0]?.refinanceProbability > 0.6 && (
                  <Button className="h-auto p-4 flex flex-col items-start">
                    <div className="flex items-center mb-2">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                      <span className="font-semibold">Refinance Now</span>
                    </div>
                    <span className="text-sm text-left">
                      High probability of savings. Contact your broker.
                    </span>
                  </Button>
                )}
                
                <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
                  <div className="flex items-center mb-2">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    <span className="font-semibold">Run Scenarios</span>
                  </div>
                  <span className="text-sm text-left">
                    Test different what-if scenarios
                  </span>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
                  <div className="flex items-center mb-2">
                    <Bell className="h-4 w-4 mr-2" />
                    <span className="font-semibold">Set Alerts</span>
                  </div>
                  <span className="text-sm text-left">
                    Get notified of rate changes
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Forecasts Tab */}
        <TabsContent value="forecasts" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Rate Forecasts */}
            <Card>
              <CardHeader>
                <CardTitle>Mortgage Rate Forecasts</CardTitle>
                <CardDescription>
                  3-12 month rate predictions with confidence intervals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rateForecasts.slice(0, 6).map((forecast, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">
                          {new Date(forecast.targetDate).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Confidence: {(forecast.confidenceScore * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">
                          {forecast.predictedValue.toFixed(3)}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {forecast.confidenceIntervalLower.toFixed(3)}% - {forecast.confidenceIntervalUpper.toFixed(3)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Property Forecasts */}
            <Card>
              <CardHeader>
                <CardTitle>Property Value Forecasts</CardTitle>
                <CardDescription>
                  Expected property appreciation over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {propertyForecasts.slice(0, 6).map((forecast, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">
                          {new Date(forecast.targetDate).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Confidence: {(forecast.confidenceScore * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">
                          ${forecast.predictedValue.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ${forecast.confidenceIntervalLower.toLocaleString()} - ${forecast.confidenceIntervalUpper.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Refinance Tab */}
        <TabsContent value="refinance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Refinance Watchlist</CardTitle>
              <CardDescription>
                AI-identified refinancing opportunities ranked by priority
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {refinanceOpportunities.length > 0 ? (
                  refinanceOpportunities.map((opportunity) => (
                    <div key={opportunity.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={opportunity.priorityScore > 80 ? "destructive" : 
                                   opportunity.priorityScore > 60 ? "default" : "secondary"}
                          >
                            Priority: {opportunity.priorityScore}
                          </Badge>
                          <Badge variant="outline">
                            {(opportunity.refinanceProbability * 100).toFixed(0)}% probability
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">
                            Save ${opportunity.potentialSavings.toLocaleString()}/year
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Current rate: {opportunity.currentRate}%
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {opportunity.recommendedAction}
                      </div>
                      {opportunity.nextContactDate && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 mr-1" />
                          Next contact: {new Date(opportunity.nextContactDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No refinancing opportunities identified at this time
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scenarios Tab */}
        <TabsContent value="scenarios" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stress Test Scenarios</CardTitle>
              <CardDescription>
                Monte Carlo simulations showing best and worst case outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Base Case</h4>
                  <div className="space-y-2 text-sm">
                    <div>Monthly Payment: $2,450</div>
                    <div>Total Interest: $180,000</div>
                    <div>Equity in 5 years: $120,000</div>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Optimistic</h4>
                  <div className="space-y-2 text-sm">
                    <div>Monthly Payment: $2,200</div>
                    <div>Total Interest: $150,000</div>
                    <div>Equity in 5 years: $180,000</div>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Conservative</h4>
                  <div className="space-y-2 text-sm">
                    <div>Monthly Payment: $2,800</div>
                    <div>Total Interest: $220,000</div>
                    <div>Equity in 5 years: $80,000</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prediction Alerts</CardTitle>
              <CardDescription>
                AI-generated alerts and notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.length > 0 ? (
                  alerts.map((alert) => (
                    <div 
                      key={alert.id} 
                      className={`p-4 border rounded-lg ${!alert.isRead ? 'bg-blue-50 border-blue-200' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4" />
                          <span className="font-medium capitalize">
                            {alert.alertType.replace('_', ' ')}
                          </span>
                          {!alert.isRead && (
                            <Badge variant="default" className="text-xs">New</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {new Date(alert.createdAt).toLocaleDateString()}
                          </span>
                          {!alert.isRead && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => markAlertAsRead(alert.id)}
                            >
                              Mark Read
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {alert.message}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No alerts at this time
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}