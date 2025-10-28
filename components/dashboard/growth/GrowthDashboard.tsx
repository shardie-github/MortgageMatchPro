import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Badge } from '../../ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Activity, 
  Target,
  Download,
  RefreshCw
} from 'lucide-react';

interface RevenueMetrics {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  averageRevenuePerUser: number;
  churnRate: number;
  lifetimeValue: number;
  grossMargin: number;
  netRevenueRetention: number;
}

interface UsageMetrics {
  totalAIRequests: number;
  averageRequestsPerUser: number;
  peakConcurrentUsers: number;
  averageResponseTime: number;
  errorRate: number;
  uptime: number;
}

interface CohortData {
  cohort: string;
  totalUsers: number;
  retainedUsers: number;
  retentionRate: number;
  revenue: number;
  averageLifetimeValue: number;
}

interface FunnelStep {
  step: string;
  users: number;
  conversionRate: number;
  dropoffRate: number;
}

interface TenantMetrics {
  tenantId: string;
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  churnRate: number;
  averageSessionDuration: number;
  totalAIRequests: number;
  averageMatchAccuracy: number;
  createdAt: string;
  lastActive: string;
}

interface GrowthDashboardProps {
  tenantId?: string;
}

export default function GrowthDashboard({ tenantId }: GrowthDashboardProps) {
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(null);
  const [usageMetrics, setUsageMetrics] = useState<UsageMetrics | null>(null);
  const [cohortData, setCohortData] = useState<CohortData[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelStep[]>([]);
  const [tenantMetrics, setTenantMetrics] = useState<TenantMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const baseUrl = '/api/reports/metrics';
      const params = new URLSearchParams();
      if (tenantId) params.append('tenantId', tenantId);

      // Fetch all metrics in parallel
      const [revenueRes, usageRes, cohortsRes, funnelRes, tenantsRes] = await Promise.all([
        fetch(`${baseUrl}?${params.toString()}&metric=revenue`),
        fetch(`${baseUrl}?${params.toString()}&metric=usage`),
        fetch(`${baseUrl}?${params.toString()}&metric=cohorts`),
        fetch(`${baseUrl}?${params.toString()}&metric=funnel`),
        fetch(`${baseUrl}?${params.toString()}&metric=tenants`)
      ]);

      const [revenue, usage, cohorts, funnel, tenants] = await Promise.all([
        revenueRes.json(),
        usageRes.json(),
        cohortsRes.json(),
        funnelRes.json(),
        tenantsRes.json()
      ]);

      if (revenue.success) setRevenueMetrics(revenue.data);
      if (usage.success) setUsageMetrics(usage.data);
      if (cohorts.success) setCohortData(cohorts.data);
      if (funnel.success) setFunnelData(funnel.data);
      if (tenants.success) setTenantMetrics(tenants.data);
    } catch (err) {
      setError('Failed to fetch metrics');
      console.error('Error fetching metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [tenantId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const exportReport = async (format: 'csv' | 'json') => {
    try {
      const response = await fetch('/api/reports?type=monthly');
      const data = await response.json();
      
      if (data.success) {
        const reportId = data.data.id;
        const exportUrl = `/api/reports/export?reportId=${reportId}&format=${format}`;
        window.open(exportUrl, '_blank');
      }
    } catch (err) {
      console.error('Error exporting report:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading metrics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={fetchMetrics} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Growth Dashboard</h1>
          <p className="text-gray-600">Key performance indicators and growth metrics</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => exportReport('csv')} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => exportReport('json')} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          <Button onClick={fetchMetrics} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {revenueMetrics ? formatCurrency(revenueMetrics.totalRevenue) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {revenueMetrics ? formatCurrency(revenueMetrics.monthlyRecurringRevenue) : 'N/A'} MRR
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usageMetrics ? formatNumber(usageMetrics.peakConcurrentUsers) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Peak concurrent users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usageMetrics ? formatNumber(usageMetrics.totalAIRequests) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {usageMetrics ? formatNumber(usageMetrics.averageRequestsPerUser) : 'N/A'} per user
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {revenueMetrics ? formatPercentage(revenueMetrics.churnRate) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Monthly churn rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics Tabs */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="cohorts">Cohorts</TabsTrigger>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Average Revenue Per User</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {revenueMetrics ? formatCurrency(revenueMetrics.averageRevenuePerUser) : 'N/A'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Lifetime Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {revenueMetrics ? formatCurrency(revenueMetrics.lifetimeValue) : 'N/A'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Gross Margin</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {revenueMetrics ? formatPercentage(revenueMetrics.grossMargin) : 'N/A'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Net Revenue Retention</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {revenueMetrics ? formatPercentage(revenueMetrics.netRevenueRetention) : 'N/A'}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Average Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {usageMetrics ? `${usageMetrics.averageResponseTime}ms` : 'N/A'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Error Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {usageMetrics ? formatPercentage(usageMetrics.errorRate) : 'N/A'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Uptime</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {usageMetrics ? formatPercentage(usageMetrics.uptime) : 'N/A'}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cohorts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cohort Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Cohort</th>
                      <th className="text-right p-2">Total Users</th>
                      <th className="text-right p-2">Retained</th>
                      <th className="text-right p-2">Retention Rate</th>
                      <th className="text-right p-2">Revenue</th>
                      <th className="text-right p-2">LTV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cohortData.map((cohort) => (
                      <tr key={cohort.cohort} className="border-b">
                        <td className="p-2 font-medium">{cohort.cohort}</td>
                        <td className="text-right p-2">{formatNumber(cohort.totalUsers)}</td>
                        <td className="text-right p-2">{formatNumber(cohort.retainedUsers)}</td>
                        <td className="text-right p-2">
                          <Badge variant={cohort.retentionRate > 0.7 ? 'default' : 'secondary'}>
                            {formatPercentage(cohort.retentionRate)}
                          </Badge>
                        </td>
                        <td className="text-right p-2">{formatCurrency(cohort.revenue)}</td>
                        <td className="text-right p-2">{formatCurrency(cohort.averageLifetimeValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funnel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {funnelData.map((step, index) => (
                  <div key={step.step} className="flex items-center space-x-4">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{step.step}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatNumber(step.users)} users
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${step.conversionRate * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{formatPercentage(step.conversionRate)} conversion</span>
                        <span>{formatPercentage(step.dropoffRate)} dropoff</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenants" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Tenant ID</th>
                      <th className="text-right p-2">Users</th>
                      <th className="text-right p-2">Active</th>
                      <th className="text-right p-2">Revenue</th>
                      <th className="text-right p-2">MRR</th>
                      <th className="text-right p-2">Churn</th>
                      <th className="text-right p-2">AI Requests</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenantMetrics.map((tenant) => (
                      <tr key={tenant.tenantId} className="border-b">
                        <td className="p-2 font-mono text-sm">{tenant.tenantId}</td>
                        <td className="text-right p-2">{formatNumber(tenant.totalUsers)}</td>
                        <td className="text-right p-2">{formatNumber(tenant.activeUsers)}</td>
                        <td className="text-right p-2">{formatCurrency(tenant.totalRevenue)}</td>
                        <td className="text-right p-2">{formatCurrency(tenant.monthlyRecurringRevenue)}</td>
                        <td className="text-right p-2">
                          <Badge variant={tenant.churnRate < 0.05 ? 'default' : 'destructive'}>
                            {formatPercentage(tenant.churnRate)}
                          </Badge>
                        </td>
                        <td className="text-right p-2">{formatNumber(tenant.totalAIRequests)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
