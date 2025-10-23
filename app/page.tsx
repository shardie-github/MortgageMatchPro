'use client'

import React, { useState, useEffect } from 'react'
import { AffordabilityInputPanel, AffordabilityInput } from '@/components/canvas/AffordabilityInputPanel'
import { RateComparisonTable } from '@/components/canvas/RateComparisonTable'
import { AmortizationChart } from '@/components/canvas/AmortizationChart'
import { LeadGenModal, LeadFormData } from '@/components/canvas/LeadGenModal'
import { useMortgageStore } from '@/store/mortgageStore'
import { AffordabilityAgent, RateIntelligenceAgent, ScenarioAnalysisAgent, LeadRoutingAgent } from '@/lib/openai'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calculator, 
  TrendingUp, 
  BarChart3, 
  Users, 
  CheckCircle, 
  AlertCircle,
  Home,
  DollarSign,
  Percent
} from 'lucide-react'

export default function MortgageMatchPro() {
  const {
    user,
    currentAffordability,
    rateResults,
    currentComparison,
    currentLead,
    loading,
    errors,
    setAffordabilityResult,
    setRateResults,
    setScenarioComparison,
    setLeadData,
    setLoading,
    setError,
    clearError,
  } = useMortgageStore()

  const [activeTab, setActiveTab] = useState('affordability')
  const [showLeadModal, setShowLeadModal] = useState(false)

  // Initialize agents
  const affordabilityAgent = new AffordabilityAgent()
  const rateAgent = new RateIntelligenceAgent()
  const scenarioAgent = new ScenarioAnalysisAgent()
  const leadAgent = new LeadRoutingAgent()

  const handleAffordabilityCalculate = async (input: AffordabilityInput) => {
    setLoading('affordability', true)
    clearError('affordability')
    
    try {
      const result = await affordabilityAgent.calculateAffordability(input)
      setAffordabilityResult(result)
      setActiveTab('results')
    } catch (error) {
      setError('affordability', error instanceof Error ? error.message : 'Failed to calculate affordability')
    } finally {
      setLoading('affordability', false)
    }
  }

  const handleFetchRates = async () => {
    if (!currentAffordability) return

    setLoading('rates', true)
    clearError('rates')
    
    try {
      const results = await rateAgent.fetchRates({
        country: 'CA',
        termYears: 25,
        rateType: 'fixed',
        propertyPrice: currentAffordability.maxAffordable,
        downPayment: 50000, // This should come from user input
      })
      setRateResults(results)
      setActiveTab('rates')
    } catch (error) {
      setError('rates', error instanceof Error ? error.message : 'Failed to fetch rates')
    } finally {
      setLoading('rates', false)
    }
  }

  const handleCompareScenarios = async () => {
    if (!currentAffordability || rateResults.length < 2) return

    setLoading('scenarios', true)
    clearError('scenarios')
    
    try {
      const scenarios = rateResults.slice(0, 3).map((rate, index) => ({
        name: `${rate.lender} - ${rate.type}`,
        rate: rate.rate,
        term: rate.term,
        type: rate.type,
        propertyPrice: currentAffordability.maxAffordable,
        downPayment: 50000,
      }))

      const comparison = await scenarioAgent.compareScenarios({ scenarios })
      setScenarioComparison(comparison)
      setActiveTab('scenarios')
    } catch (error) {
      setError('scenarios', error instanceof Error ? error.message : 'Failed to compare scenarios')
    } finally {
      setLoading('scenarios', false)
    }
  }

  const handleLeadSubmit = async (data: LeadFormData) => {
    if (!currentAffordability) return

    setLoading('leads', true)
    clearError('leads')
    
    try {
      const leadData = await leadAgent.processLead({
        name: data.name,
        email: data.email,
        phone: data.phone,
        leadData: {
          income: currentAffordability.maxAffordable * 0.3, // Estimate from affordability
          debts: 500, // This should come from user input
          downPayment: 50000,
          propertyPrice: currentAffordability.maxAffordable,
          creditScore: 750, // This should come from user input
          employmentType: 'salaried',
          location: 'Toronto, ON',
        },
      })
      setLeadData(leadData)
      setShowLeadModal(false)
    } catch (error) {
      setError('leads', error instanceof Error ? error.message : 'Failed to process lead')
    } finally {
      setLoading('leads', false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(value)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            MortgageMatch Pro
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            AI-Powered Mortgage Intelligence Platform
          </p>
          <div className="flex justify-center gap-2">
            <Badge variant="secondary">Canada & USA</Badge>
            <Badge variant="secondary">Real-time Rates</Badge>
            <Badge variant="secondary">OSFI & CFPB Compliant</Badge>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="affordability" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Affordability
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Results
            </TabsTrigger>
            <TabsTrigger value="rates" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Rates
            </TabsTrigger>
            <TabsTrigger value="scenarios" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Compare
            </TabsTrigger>
          </TabsList>

          <TabsContent value="affordability" className="mt-6">
            <AffordabilityInputPanel
              onCalculate={handleAffordabilityCalculate}
              loading={loading.affordability}
            />
            {errors.affordability && (
              <Card className="mt-4 border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertCircle className="h-5 w-5" />
                    <span>{errors.affordability}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="results" className="mt-6">
            {currentAffordability ? (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Home className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Max Affordable</p>
                          <p className="text-2xl font-bold">{formatCurrency(currentAffordability.maxAffordable)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">Monthly Payment</p>
                          <p className="text-2xl font-bold">{formatCurrency(currentAffordability.monthlyPayment)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Percent className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">GDS Ratio</p>
                          <p className="text-2xl font-bold">{currentAffordability.gdsRatio.toFixed(1)}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className={`h-5 w-5 ${currentAffordability.qualificationResult ? 'text-green-500' : 'text-red-500'}`} />
                        <div>
                          <p className="text-sm text-muted-foreground">Qualification</p>
                          <p className={`text-2xl font-bold ${currentAffordability.qualificationResult ? 'text-green-600' : 'text-red-600'}`}>
                            {currentAffordability.qualificationResult ? 'Approved' : 'Not Approved'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Payment Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Principal</p>
                        <p className="text-lg font-semibold">{formatCurrency(currentAffordability.breakdown.principal)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Interest</p>
                        <p className="text-lg font-semibold">{formatCurrency(currentAffordability.breakdown.interest)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Taxes</p>
                        <p className="text-lg font-semibold">{formatCurrency(currentAffordability.breakdown.taxes)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Insurance</p>
                        <p className="text-lg font-semibold">{formatCurrency(currentAffordability.breakdown.insurance)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recommendations */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {currentAffordability.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex gap-4 justify-center">
                  <Button onClick={handleFetchRates} disabled={loading.rates}>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Get Current Rates
                  </Button>
                  <Button onClick={() => setShowLeadModal(true)} variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Connect with Brokers
                  </Button>
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Calculate Your Affordability</h3>
                  <p className="text-muted-foreground mb-4">
                    Start by calculating how much you can afford to borrow
                  </p>
                  <Button onClick={() => setActiveTab('affordability')}>
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="rates" className="mt-6">
            <RateComparisonTable
              rates={rateResults}
              loading={loading.rates}
              onContactLender={(lender) => console.log('Contact lender:', lender)}
            />
            {errors.rates && (
              <Card className="mt-4 border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertCircle className="h-5 w-5" />
                    <span>{errors.rates}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="scenarios" className="mt-6">
            {currentComparison ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Scenario Comparison</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {currentComparison.recommendation.reasoning}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <h3 className="text-lg font-semibold text-green-800 mb-2">
                        Recommended: {currentComparison.recommendation.bestOption}
                      </h3>
                      <p className="text-green-600">
                        Potential savings: {formatCurrency(currentComparison.recommendation.savings)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {currentComparison.scenarios.map((scenario, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle>{scenario.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Rate</p>
                          <p className="text-lg font-semibold">{scenario.rate}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Monthly Payment</p>
                          <p className="text-lg font-semibold">{formatCurrency(scenario.monthlyPayment)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Total Interest</p>
                          <p className="text-lg font-semibold">{formatCurrency(scenario.totalInterest)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Total Cost</p>
                          <p className="text-lg font-semibold">{formatCurrency(scenario.totalCost)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Compare Mortgage Scenarios</h3>
                  <p className="text-muted-foreground mb-4">
                    Get rates first to compare different mortgage options
                  </p>
                  <Button onClick={handleCompareScenarios} disabled={rateResults.length < 2}>
                    Compare Scenarios
                  </Button>
                </CardContent>
              </Card>
            )}
            {errors.scenarios && (
              <Card className="mt-4 border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertCircle className="h-5 w-5" />
                    <span>{errors.scenarios}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Lead Generation Modal */}
        <LeadGenModal
          isOpen={showLeadModal}
          onClose={() => setShowLeadModal(false)}
          onSubmit={handleLeadSubmit}
          brokerRecommendations={currentLead?.brokerRecommendations || []}
          leadScore={currentLead?.leadScore || 0}
          loading={loading.leads}
        />
      </div>
    </div>
  )
}