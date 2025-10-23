import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  DollarSign, 
  Home, 
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Share2,
  Eye,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react'

interface PredictiveStory {
  id: string
  title: string
  narrative: string
  keyInsights: string[]
  quantitativeData: {
    currentValue: number
    predictedValue: number
    changePercent: number
    confidence: number
    timeframe: string
  }
  visualizations: {
    type: 'line' | 'bar' | 'pie' | 'scatter'
    data: any[]
    title: string
  }[]
  recommendations: {
    action: string
    priority: 'high' | 'medium' | 'low'
    impact: string
    timeline: string
  }[]
  riskFactors: string[]
  opportunities: string[]
  nextSteps: string[]
  generatedAt: string
  modelVersion: string
}

interface StorytellingDashboardProps {
  userId: string
  stories?: PredictiveStory[]
  onGenerateStory?: (type: string) => void
  onExportStory?: (storyId: string, format: 'pdf' | 'json') => void
}

export function PredictiveStorytellingDashboard({ 
  userId, 
  stories = [], 
  onGenerateStory,
  onExportStory 
}: StorytellingDashboardProps) {
  const [selectedStory, setSelectedStory] = useState<PredictiveStory | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  // Mock data for demonstration
  const mockStories: PredictiveStory[] = stories.length > 0 ? stories : [
    {
      id: 'story-1',
      title: 'Refinance Opportunity Alert',
      narrative: 'Based on your current mortgage rate of 5.45% and the projected rate trends, we\'ve identified a significant refinance opportunity. The next optimal refinance window is projected for May 2026, when rates are expected to drop to 4.8%. Your equity could grow by 12% if property appreciation continues at the current pace, potentially saving you $47,000 over the next 5 years.',
      keyInsights: [
        'Rate drop of 0.65% expected by May 2026',
        'Property value projected to increase by 12%',
        'Potential savings of $47,000 over 5 years',
        'Equity growth of $89,000 projected'
      ],
      quantitativeData: {
        currentValue: 5.45,
        predictedValue: 4.8,
        changePercent: -11.9,
        confidence: 0.87,
        timeframe: 'May 2026'
      },
      visualizations: [
        {
          type: 'line',
          title: 'Rate Trend Projection',
          data: [
            { month: 'Jan 2025', rate: 5.45 },
            { month: 'Jun 2025', rate: 5.32 },
            { month: 'Dec 2025', rate: 5.18 },
            { month: 'May 2026', rate: 4.8 }
          ]
        },
        {
          type: 'bar',
          title: 'Savings Breakdown',
          data: [
            { category: 'Interest Savings', amount: 32000 },
            { category: 'Equity Growth', amount: 89000 },
            { category: 'Total Benefit', amount: 121000 }
          ]
        }
      ],
      recommendations: [
        {
          action: 'Get pre-approved for refinance',
          priority: 'high',
          impact: 'Secure rate lock before May 2026',
          timeline: 'Next 30 days'
        },
        {
          action: 'Monitor property value trends',
          priority: 'medium',
          impact: 'Optimize timing for maximum equity',
          timeline: 'Monthly review'
        }
      ],
      riskFactors: [
        'Rate projections may change with economic conditions',
        'Property value growth is not guaranteed',
        'Refinancing costs may impact net savings'
      ],
      opportunities: [
        'Consider cash-out refinance for home improvements',
        'Explore shorter-term options for faster equity build',
        'Leverage increased equity for investment opportunities'
      ],
      nextSteps: [
        'Contact mortgage broker for pre-approval',
        'Gather updated financial documents',
        'Review current mortgage terms and penalties',
        'Set up rate monitoring alerts'
      ],
      generatedAt: new Date().toISOString(),
      modelVersion: 'v2.1.0'
    },
    {
      id: 'story-2',
      title: 'Property Investment Analysis',
      narrative: 'Your current property in Toronto has shown strong appreciation trends, with a 8.2% year-over-year growth rate. Based on market analysis and economic indicators, we project continued growth of 6-8% annually over the next 3 years. This positions you well for future real estate investments or leveraging your current equity.',
      keyInsights: [
        '8.2% YoY appreciation rate',
        'Projected 6-8% annual growth',
        'Strong market fundamentals',
        'Opportunity for investment expansion'
      ],
      quantitativeData: {
        currentValue: 850000,
        predictedValue: 1020000,
        changePercent: 20,
        confidence: 0.82,
        timeframe: '3 years'
      },
      visualizations: [
        {
          type: 'line',
          title: 'Property Value Projection',
          data: [
            { year: '2024', value: 850000 },
            { year: '2025', value: 901000 },
            { year: '2026', value: 955000 },
            { year: '2027', value: 1020000 }
          ]
        }
      ],
      recommendations: [
        {
          action: 'Consider investment property purchase',
          priority: 'medium',
          impact: 'Diversify real estate portfolio',
          timeline: '6-12 months'
        }
      ],
      riskFactors: [
        'Market volatility may affect projections',
        'Interest rate changes impact affordability',
        'Economic downturns could slow growth'
      ],
      opportunities: [
        'Leverage equity for second property',
        'Consider rental property investment',
        'Explore real estate investment trusts (REITs)'
      ],
      nextSteps: [
        'Assess investment property options',
        'Review financing capacity',
        'Consult with real estate advisor'
      ],
      generatedAt: new Date().toISOString(),
      modelVersion: 'v2.1.0'
    }
  ]

  const handleGenerateStory = async (type: string) => {
    setIsGenerating(true)
    try {
      if (onGenerateStory) {
        await onGenerateStory(type)
      }
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExportStory = (storyId: string, format: 'pdf' | 'json') => {
    if (onExportStory) {
      onExportStory(storyId, format)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount)
  }

  const formatPercent = (percent: number) => {
    return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Predictive Storytelling Dashboard</h1>
          <p className="text-muted-foreground">
            AI-generated narratives explaining your mortgage insights and opportunities
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => handleGenerateStory('refinance')}
            disabled={isGenerating}
            className="flex items-center gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            {isGenerating ? 'Generating...' : 'Generate Refinance Story'}
          </Button>
          <Button
            onClick={() => handleGenerateStory('investment')}
            disabled={isGenerating}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Generate Investment Story
          </Button>
        </div>
      </div>

      {/* Stories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockStories.map((story) => (
          <Card 
            key={story.id} 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedStory(story)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{story.title}</CardTitle>
                <Badge variant="secondary">
                  {story.modelVersion}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Generated {new Date(story.generatedAt).toLocaleDateString()}
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-4 line-clamp-3">
                {story.narrative}
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">
                    {story.quantitativeData.changePercent > 0 ? '+' : ''}
                    {formatPercent(story.quantitativeData.changePercent)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">
                    {story.quantitativeData.timeframe}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                  <span className="text-sm">
                    {Math.round(story.quantitativeData.confidence * 100)}% confidence
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Story Detail Modal */}
      {selectedStory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{selectedStory.title}</h2>
                  <p className="text-muted-foreground">
                    Generated {new Date(selectedStory.generatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportStory(selectedStory.id, 'pdf')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportStory(selectedStory.id, 'json')}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Export JSON
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedStory(null)}
                  >
                    <Eye className="h-4 w-4" />
                    Close
                  </Button>
                </div>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="insights">Insights</TabsTrigger>
                  <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                  <TabsTrigger value="risks">Risks & Opportunities</TabsTrigger>
                  <TabsTrigger value="data">Data & Charts</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Narrative Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg leading-relaxed">
                        {selectedStory.narrative}
                      </p>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Key Metrics</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span>Current Value</span>
                          <span className="font-bold">
                            {typeof selectedStory.quantitativeData.currentValue === 'number' 
                              ? selectedStory.quantitativeData.currentValue > 1000 
                                ? formatCurrency(selectedStory.quantitativeData.currentValue)
                                : `${selectedStory.quantitativeData.currentValue}%`
                              : selectedStory.quantitativeData.currentValue
                            }
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Predicted Value</span>
                          <span className="font-bold">
                            {typeof selectedStory.quantitativeData.predictedValue === 'number' 
                              ? selectedStory.quantitativeData.predictedValue > 1000 
                                ? formatCurrency(selectedStory.quantitativeData.predictedValue)
                                : `${selectedStory.quantitativeData.predictedValue}%`
                              : selectedStory.quantitativeData.predictedValue
                            }
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Change</span>
                          <span className={`font-bold ${
                            selectedStory.quantitativeData.changePercent > 0 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {formatPercent(selectedStory.quantitativeData.changePercent)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Confidence</span>
                          <span className="font-bold">
                            {Math.round(selectedStory.quantitativeData.confidence * 100)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Timeframe</span>
                          <span className="font-bold">
                            {selectedStory.quantitativeData.timeframe}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Next Steps</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {selectedStory.nextSteps.map((step, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{step}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="insights" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Key Insights</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {selectedStory.keyInsights.map((insight, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="recommendations" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Actionable Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {selectedStory.recommendations.map((rec, index) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium">{rec.action}</h4>
                              <Badge 
                                variant={
                                  rec.priority === 'high' ? 'destructive' : 
                                  rec.priority === 'medium' ? 'default' : 'secondary'
                                }
                              >
                                {rec.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {rec.impact}
                            </p>
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4" />
                              <span>Timeline: {rec.timeline}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="risks" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-red-600" />
                          Risk Factors
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {selectedStory.riskFactors.map((risk, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{risk}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-green-600" />
                          Opportunities
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {selectedStory.opportunities.map((opportunity, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <TrendingUp className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{opportunity}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="data" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {selectedStory.visualizations.map((viz, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <CardTitle>{viz.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
                            <div className="text-center">
                              <BarChart3 className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">
                                Chart visualization would be rendered here
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Type: {viz.type} | Data points: {viz.data.length}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}