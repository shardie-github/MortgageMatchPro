import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Globe, 
  Shield, 
  Leaf, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  DollarSign,
  Users,
  Building,
  Zap,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react'

interface GlobalMetrics {
  totalTransactions: number
  successRate: number
  averageLatency: number
  costSavings: number
  complianceAccuracy: number
  esgScore: number
  activeRegions: number
  partnerBanks: number
}

interface RegionalData {
  region: string
  transactions: number
  successRate: number
  complianceScore: number
  esgAdoption: number
  revenue: number
}

interface ESGData {
  totalGreenScore: number
  carbonOffset: number
  renewableEnergy: number
  greenCertifications: number
  sustainabilityIndex: number
}

interface ComplianceData {
  totalRules: number
  activeViolations: number
  resolvedViolations: number
  auditTrails: number
  regulatoryReports: number
}

export default function GlobalExpansionDashboard() {
  const [globalMetrics, setGlobalMetrics] = useState<GlobalMetrics>({
    totalTransactions: 0,
    successRate: 0,
    averageLatency: 0,
    costSavings: 0,
    complianceAccuracy: 0,
    esgScore: 0,
    activeRegions: 0,
    partnerBanks: 0,
  })

  const [regionalData, setRegionalData] = useState<RegionalData[]>([])
  const [esgData, setEsgData] = useState<ESGData>({
    totalGreenScore: 0,
    carbonOffset: 0,
    renewableEnergy: 0,
    greenCertifications: 0,
    sustainabilityIndex: 0,
  })
  const [complianceData, setComplianceData] = useState<ComplianceData>({
    totalRules: 0,
    activeViolations: 0,
    resolvedViolations: 0,
    auditTrails: 0,
    regulatoryReports: 0,
  })

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate data loading
    const loadData = async () => {
      setLoading(true)
      
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setGlobalMetrics({
        totalTransactions: 125000,
        successRate: 98.5,
        averageLatency: 245,
        costSavings: 12.3,
        complianceAccuracy: 99.2,
        esgScore: 78.5,
        activeRegions: 4,
        partnerBanks: 8,
      })

      setRegionalData([
        { region: 'North America', transactions: 45000, successRate: 99.1, complianceScore: 98.5, esgAdoption: 82.3, revenue: 1250000 },
        { region: 'Europe', transactions: 38000, successRate: 98.2, complianceScore: 99.8, esgAdoption: 89.7, revenue: 980000 },
        { region: 'Asia Pacific', transactions: 32000, successRate: 97.8, complianceScore: 97.2, esgAdoption: 75.4, revenue: 750000 },
        { region: 'Canada', transactions: 10000, successRate: 99.5, complianceScore: 99.1, esgAdoption: 85.2, revenue: 320000 },
      ])

      setEsgData({
        totalGreenScore: 78.5,
        carbonOffset: 1250000,
        renewableEnergy: 45.2,
        greenCertifications: 234,
        sustainabilityIndex: 82.1,
      })

      setComplianceData({
        totalRules: 156,
        activeViolations: 3,
        resolvedViolations: 47,
        auditTrails: 12500,
        regulatoryReports: 89,
      })

      setLoading(false)
    }

    loadData()
  }, [])

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
          <h1 className="text-3xl font-bold text-gray-900">Global Expansion & ESG Dashboard</h1>
          <p className="text-gray-600">Real-time monitoring of cross-border operations and sustainability metrics</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-green-600 border-green-600">
            <CheckCircle className="w-3 h-3 mr-1" />
            All Systems Operational
          </Badge>
          <Button variant="outline" size="sm">
            <Activity className="w-4 h-4 mr-2" />
            Live Monitoring
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalMetrics.totalTransactions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +12.5% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalMetrics.successRate}%</div>
            <p className="text-xs text-muted-foreground">
              +0.3% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Savings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalMetrics.costSavings}%</div>
            <p className="text-xs text-muted-foreground">
              AI-optimized routing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ESG Score</CardTitle>
            <Leaf className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalMetrics.esgScore}</div>
            <p className="text-xs text-muted-foreground">
              +5.2 from last quarter
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="esg">ESG Metrics</TabsTrigger>
          <TabsTrigger value="payments">Payment Rails</TabsTrigger>
          <TabsTrigger value="treasury">Treasury</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Regional Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Regional Performance</CardTitle>
                <CardDescription>Transaction volume and success rates by region</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {regionalData.map((region, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="font-medium">{region.region}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{region.transactions.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">{region.successRate}% success</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Compliance Status */}
            <Card>
              <CardHeader>
                <CardTitle>Compliance Status</CardTitle>
                <CardDescription>Regulatory compliance and audit metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Active Rules</span>
                    <Badge variant="outline">{complianceData.totalRules}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Active Violations</span>
                    <Badge variant={complianceData.activeViolations > 0 ? "destructive" : "outline"}>
                      {complianceData.activeViolations}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Resolved This Month</span>
                    <Badge variant="outline">{complianceData.resolvedViolations}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Audit Trails</span>
                    <Badge variant="outline">{complianceData.auditTrails.toLocaleString()}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Compliance Accuracy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{globalMetrics.complianceAccuracy}%</div>
                <p className="text-sm text-muted-foreground">Above 99% target</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Active Violations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{complianceData.activeViolations}</div>
                <p className="text-sm text-muted-foreground">Requires attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Regulatory Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{complianceData.regulatoryReports}</div>
                <p className="text-sm text-muted-foreground">Generated this quarter</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="esg" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Leaf className="w-5 h-5 mr-2" />
                  ESG Metrics
                </CardTitle>
                <CardDescription>Sustainability and environmental impact</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Green Score</span>
                    <Badge variant="outline">{esgData.totalGreenScore}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Carbon Offset (kg)</span>
                    <Badge variant="outline">{esgData.carbonOffset.toLocaleString()}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Renewable Energy %</span>
                    <Badge variant="outline">{esgData.renewableEnergy}%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Green Certifications</span>
                    <Badge variant="outline">{esgData.greenCertifications}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="w-5 h-5 mr-2" />
                  Sustainability Index
                </CardTitle>
                <CardDescription>Overall sustainability performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">{esgData.sustainabilityIndex}</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${esgData.sustainabilityIndex}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">Target: 85</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="w-5 h-5 mr-2" />
                  Payment Performance
                </CardTitle>
                <CardDescription>Cross-border payment processing metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Average Latency</span>
                    <Badge variant="outline">{globalMetrics.averageLatency}ms</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Success Rate</span>
                    <Badge variant="outline">{globalMetrics.successRate}%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Cost Reduction</span>
                    <Badge variant="outline">{globalMetrics.costSavings}%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Active Regions</span>
                    <Badge variant="outline">{globalMetrics.activeRegions}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="w-5 h-5 mr-2" />
                  Partner Banks
                </CardTitle>
                <CardDescription>Banking partnerships and coverage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">{globalMetrics.partnerBanks}</div>
                  <p className="text-sm text-muted-foreground">Active partnerships</p>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>North America</span>
                      <Badge variant="outline">3 banks</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Europe</span>
                      <Badge variant="outline">2 banks</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Asia Pacific</span>
                      <Badge variant="outline">2 banks</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Canada</span>
                      <Badge variant="outline">1 bank</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="treasury" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  FX Risk Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">Low</div>
                <p className="text-sm text-muted-foreground">Overall portfolio risk</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Hedging Effectiveness
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">87%</div>
                <p className="text-sm text-muted-foreground">Cost reduction achieved</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  Volatility Prediction
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">92%</div>
                <p className="text-sm text-muted-foreground">Accuracy rate</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}