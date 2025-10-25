'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calculator, 
  Save, 
  RotateCcw, 
  RotateCw, 
  Plus, 
  Trash2, 
  Copy,
  Eye,
  EyeOff,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react'
import { ScenarioInput, ScenarioResult } from '@/lib/scenario-types'
import { ScenarioManager } from '@/lib/scenario-manager'
import { ExplainabilityAgent } from '@/lib/explainability-agent'

interface ScenarioInputPanelProps {
  onScenarioUpdate: (scenario: ScenarioResult) => void
  onComparisonUpdate: (scenarios: ScenarioResult[]) => void
  loading?: boolean
  userId?: string
}

export function ScenarioInputPanel({ 
  onScenarioUpdate, 
  onComparisonUpdate, 
  loading = false,
  userId 
}: ScenarioInputPanelProps) {
  const [scenarios, setScenarios] = useState<ScenarioInput[]>([])
  const [activeScenarioIndex, setActiveScenarioIndex] = useState(0)
  const [scenarioResults, setScenarioResults] = useState<ScenarioResult[]>([])
  const [showAIInsights, setShowAIInsights] = useState(false)
  const [aiInsights, setAiInsights] = useState<any>(null)
  const [history, setHistory] = useState<ScenarioInput[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isDirty, setIsDirty] = useState(false)

  const scenarioManager = new ScenarioManager()
  const explainabilityAgent = new ExplainabilityAgent()

  // Initialize with default scenario
  useEffect(() => {
    if (scenarios.length === 0) {
      const defaultScenario: ScenarioInput = {
        id: `scenario_${Date.now()}`,
        name: 'Scenario 1',
        description: 'Initial scenario',
        parameters: {
          propertyPrice: 500000,
          downPayment: 50000,
          interestRate: 5.5,
          termYears: 25,
          rateType: 'fixed',
          location: 'Toronto, ON',
          taxes: 0,
          insurance: 0,
          hoa: 0,
          pmi: 0,
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          userId,
          isTemplate: false,
          tags: [],
        },
      }
      setScenarios([defaultScenario])
      setHistory([[defaultScenario]])
      setHistoryIndex(0)
    }
  }, [userId])

  // Calculate scenario when parameters change
  useEffect(() => {
    if (scenarios.length > 0) {
      calculateScenario(scenarios[activeScenarioIndex])
    }
  }, [scenarios, activeScenarioIndex])

  const calculateScenario = useCallback(async (scenario: ScenarioInput) => {
    try {
      const result = await scenarioManager.calculateScenarioResult(scenario)
      setScenarioResults(prev => {
        const newResults = [...prev]
        newResults[activeScenarioIndex] = result
        return newResults
      })
      onScenarioUpdate(result)
    } catch (error) {
      console.error('Error calculating scenario:', error)
    }
  }, [activeScenarioIndex, onScenarioUpdate])

  const updateScenario = (updates: Partial<ScenarioInput['parameters']>) => {
    setScenarios(prev => {
      const newScenarios = [...prev]
      newScenarios[activeScenarioIndex] = {
        ...newScenarios[activeScenarioIndex],
        parameters: {
          ...newScenarios[activeScenarioIndex].parameters,
          ...updates,
        },
        metadata: {
          ...newScenarios[activeScenarioIndex].metadata,
          updatedAt: new Date().toISOString(),
        },
      }
      return newScenarios
    })
    setIsDirty(true)
  }

  const addScenario = () => {
    const newScenario: ScenarioInput = {
      id: `scenario_${Date.now()}`,
      name: `Scenario ${scenarios.length + 1}`,
      description: 'New scenario',
      parameters: {
        ...scenarios[activeScenarioIndex].parameters,
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId,
        isTemplate: false,
        tags: [],
      },
    }
    
    setScenarios(prev => [...prev, newScenario])
    setActiveScenarioIndex(scenarios.length)
    setScenarioResults(prev => [...prev, {} as ScenarioResult])
    saveToHistory()
  }

  const duplicateScenario = (index: number) => {
    const scenarioToDuplicate = scenarios[index]
    const duplicatedScenario: ScenarioInput = {
      ...scenarioToDuplicate,
      id: `scenario_${Date.now()}`,
      name: `${scenarioToDuplicate.name} (Copy)`,
      metadata: {
        ...scenarioToDuplicate.metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }
    
    setScenarios(prev => [...prev, duplicatedScenario])
    setActiveScenarioIndex(scenarios.length)
    setScenarioResults(prev => [...prev, {} as ScenarioResult])
    saveToHistory()
  }

  const deleteScenario = (index: number) => {
    if (scenarios.length <= 1) return
    
    setScenarios(prev => prev.filter((_, i) => i !== index))
    setScenarioResults(prev => prev.filter((_, i) => i !== index))
    
    if (activeScenarioIndex >= scenarios.length - 1) {
      setActiveScenarioIndex(scenarios.length - 2)
    }
    saveToHistory()
  }

  const saveToHistory = () => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push([...scenarios])
      setHistoryIndex(newHistory.length - 1)
      return newHistory
    })
    setIsDirty(false)
  }

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setScenarios([...history[historyIndex - 1]])
      setIsDirty(true)
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setScenarios([...history[historyIndex + 1]])
      setIsDirty(true)
    }
  }

  const generateAIInsights = async () => {
    if (scenarioResults.length === 0) return
    
    try {
      const insights = await explainabilityAgent.explainComparison({
        id: 'comparison',
        name: 'Scenario Comparison',
        scenarios: scenarioResults,
        comparison: {
          bestOption: 'Scenario 1',
          worstOption: 'Scenario 1',
          savings: 0,
          riskAssessment: {
            lowestRisk: 'low',
            highestRisk: 'low',
            overallRisk: 'low',
          },
          recommendations: [],
        },
        aiInsights: {
          summary: '',
          pros: [],
          cons: [],
          nextSteps: [],
          personalizedAdvice: '',
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          userId,
          isShared: false,
        },
      })
      
      setAiInsights(insights)
      setShowAIInsights(true)
    } catch (error) {
      console.error('Error generating AI insights:', error)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(value)
  }

  const currentScenario = scenarios[activeScenarioIndex]
  const currentResult = scenarioResults[activeScenarioIndex]

  return (
    <div className="space-y-6">
      {/* Scenario Management Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-6 w-6 text-primary" />
              Interactive Scenario Modeling
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={undo}
                disabled={historyIndex <= 0}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={saveToHistory}
                disabled={!isDirty}
              >
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Scenario Tabs */}
          <div className="flex items-center gap-2 mb-4">
            {scenarios.map((scenario, index) => (
              <div
                key={scenario.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  index === activeScenarioIndex
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted'
                }`}
                onClick={() => setActiveScenarioIndex(index)}
              >
                <span className="font-medium">{scenario.name}</span>
                {isDirty && index === activeScenarioIndex && (
                  <Badge variant="secondary" className="text-xs">
                    Modified
                  </Badge>
                )}
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      duplicateScenario(index)
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  {scenarios.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteScenario(index)
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={addScenario}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Scenario
            </Button>
          </div>

          {/* Quick Results Preview */}
          {currentResult && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Monthly Payment</p>
                <p className="text-lg font-semibold">{formatCurrency(currentResult.monthlyPayment)}</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Total Interest</p>
                <p className="text-lg font-semibold">{formatCurrency(currentResult.totalInterest)}</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">GDS Ratio</p>
                <p className="text-lg font-semibold">{(currentResult.gdsRatio * 100).toFixed(1)}%</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Qualification</p>
                <div className="flex items-center justify-center gap-1">
                  {currentResult.qualificationResult ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">
                    {currentResult.qualificationResult ? 'Approved' : 'Not Approved'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Parameter Inputs */}
      <Card>
        <CardHeader>
          <CardTitle>Scenario Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
              <TabsTrigger value="whatif">What-If</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-6">
              {/* Property Price */}
              <div className="space-y-2">
                <Label htmlFor="propertyPrice">Property Price</Label>
                <div className="space-y-2">
                  <Slider
                    value={[currentScenario?.parameters.propertyPrice || 0]}
                    onValueChange={(value) => updateScenario({ propertyPrice: value[0] })}
                    min={100000}
                    max={2000000}
                    step={10000}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{formatCurrency(100000)}</span>
                    <span className="font-medium">
                      {formatCurrency(currentScenario?.parameters.propertyPrice || 0)}
                    </span>
                    <span>{formatCurrency(2000000)}</span>
                  </div>
                </div>
              </div>

              {/* Down Payment */}
              <div className="space-y-2">
                <Label htmlFor="downPayment">Down Payment</Label>
                <div className="space-y-2">
                  <Slider
                    value={[currentScenario?.parameters.downPayment || 0]}
                    onValueChange={(value) => updateScenario({ downPayment: value[0] })}
                    min={0}
                    max={currentScenario?.parameters.propertyPrice || 0}
                    step={5000}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{formatCurrency(0)}</span>
                    <span className="font-medium">
                      {formatCurrency(currentScenario?.parameters.downPayment || 0)}
                    </span>
                    <span>{formatCurrency(currentScenario?.parameters.propertyPrice || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Interest Rate */}
              <div className="space-y-2">
                <Label htmlFor="interestRate">Interest Rate (%)</Label>
                <div className="space-y-2">
                  <Slider
                    value={[currentScenario?.parameters.interestRate || 0]}
                    onValueChange={(value) => updateScenario({ interestRate: value[0] })}
                    min={1}
                    max={10}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>1%</span>
                    <span className="font-medium">
                      {(currentScenario?.parameters.interestRate || 0).toFixed(1)}%
                    </span>
                    <span>10%</span>
                  </div>
                </div>
              </div>

              {/* Term Years */}
              <div className="space-y-2">
                <Label htmlFor="termYears">Amortization Period (Years)</Label>
                <Select
                  value={currentScenario?.parameters.termYears.toString()}
                  onValueChange={(value) => updateScenario({ termYears: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 years</SelectItem>
                    <SelectItem value="20">20 years</SelectItem>
                    <SelectItem value="25">25 years</SelectItem>
                    <SelectItem value="30">30 years</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Rate Type */}
              <div className="space-y-2">
                <Label htmlFor="rateType">Rate Type</Label>
                <Select
                  value={currentScenario?.parameters.rateType}
                  onValueChange={(value: 'fixed' | 'variable' | 'arm') => updateScenario({ rateType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Rate</SelectItem>
                    <SelectItem value="variable">Variable Rate</SelectItem>
                    <SelectItem value="arm">Adjustable Rate (ARM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6">
              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={currentScenario?.parameters.location || ''}
                  onChange={(e) => updateScenario({ location: e.target.value })}
                  placeholder="e.g., Toronto, ON"
                />
              </div>

              {/* Additional Costs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxes">Property Taxes (Monthly)</Label>
                  <Input
                    id="taxes"
                    type="number"
                    value={currentScenario?.parameters.taxes || 0}
                    onChange={(e) => updateScenario({ taxes: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="insurance">Insurance (Monthly)</Label>
                  <Input
                    id="insurance"
                    type="number"
                    value={currentScenario?.parameters.insurance || 0}
                    onChange={(e) => updateScenario({ insurance: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hoa">HOA/Condo Fees (Monthly)</Label>
                  <Input
                    id="hoa"
                    type="number"
                    value={currentScenario?.parameters.hoa || 0}
                    onChange={(e) => updateScenario({ hoa: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="whatif" className="space-y-6">
              <div className="text-center p-8">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">What-If Analysis</h3>
                <p className="text-muted-foreground mb-4">
                  Coming soon: Interactive what-if analysis with sensitivity testing
                </p>
                <Button variant="outline" disabled>
                  Enable What-If Mode
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              AI Insights & Explainability
            </CardTitle>
            <Button
              variant="outline"
              onClick={generateAIInsights}
              disabled={scenarioResults.length === 0}
            >
              {showAIInsights ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showAIInsights ? 'Hide' : 'Generate'} Insights
            </Button>
          </div>
        </CardHeader>
        {showAIInsights && aiInsights && (
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Executive Summary</h4>
                <p className="text-sm text-muted-foreground">{aiInsights.executiveSummary}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Pros</h4>
                  <ul className="space-y-1">
                    {aiInsights.pros?.map((pro: string, index: number) => (
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
                    {aiInsights.cons?.map((con: string, index: number) => (
                      <li key={index} className="text-sm text-red-600 flex items-start gap-2">
                        <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Personalized Recommendation</h4>
                <p className="text-sm text-muted-foreground">{aiInsights.personalizedRecommendation}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Next Steps</h4>
                <ul className="space-y-1">
                  {aiInsights.nextSteps?.map((step: string, index: number) => (
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
        )}
      </Card>
    </div>
  )
}