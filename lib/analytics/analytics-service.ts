import { EventBus } from '../events/event-bus';
import { AI_EVENT_TYPES } from '../events/schemas/ai-events';
import { BILLING_EVENT_TYPES } from '../events/schemas/billing-events';

export interface AnalyticsEvent {
  id: string;
  type: string;
  userId: string;
  tenantId: string;
  timestamp: Date;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface UserMetrics {
  userId: string;
  tenantId: string;
  totalSessions: number;
  totalAIRequests: number;
  totalSpend: number;
  lastActive: Date;
  firstSeen: Date;
  isActive: boolean;
}

export interface TenantMetrics {
  tenantId: string;
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  churnRate: number;
  averageSessionDuration: number;
  totalAIRequests: number;
  averageMatchAccuracy: number;
  createdAt: Date;
  lastActive: Date;
}

export interface CohortData {
  cohort: string; // YYYY-MM format
  totalUsers: number;
  retainedUsers: number;
  retentionRate: number;
  revenue: number;
  averageLifetimeValue: number;
}

export interface FunnelStep {
  step: string;
  users: number;
  conversionRate: number;
  dropoffRate: number;
}

export interface RevenueMetrics {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  averageRevenuePerUser: number;
  churnRate: number;
  lifetimeValue: number;
  grossMargin: number;
  netRevenueRetention: number;
}

export interface UsageMetrics {
  totalAIRequests: number;
  averageRequestsPerUser: number;
  peakConcurrentUsers: number;
  averageResponseTime: number;
  errorRate: number;
  uptime: number;
}

export interface AnalyticsReport {
  id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    users: UserMetrics[];
    tenants: TenantMetrics[];
    revenue: RevenueMetrics;
    usage: UsageMetrics;
    cohorts: CohortData[];
    funnel: FunnelStep[];
  };
  generatedAt: Date;
  generatedBy: string;
}

export class AnalyticsService {
  private eventBus: EventBus;
  private events: AnalyticsEvent[] = [];
  private userMetrics: Map<string, UserMetrics> = new Map();
  private tenantMetrics: Map<string, TenantMetrics> = new Map();
  private reports: AnalyticsReport[] = [];

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.initializeEventHandlers();
  }

  private initializeEventHandlers(): void {
    // Track AI scoring events
    this.eventBus.subscribe(AI_EVENT_TYPES.SCORING_REQUESTED, this.handleAIScoringRequested.bind(this));
    this.eventBus.subscribe(AI_EVENT_TYPES.SCORING_COMPLETED, this.handleAIScoringCompleted.bind(this));
    this.eventBus.subscribe(AI_EVENT_TYPES.SCORING_FAILED, this.handleAIScoringFailed.bind(this));

    // Track billing events
    this.eventBus.subscribe(BILLING_EVENT_TYPES.SUBSCRIPTION_CREATED, this.handleSubscriptionCreated.bind(this));
    this.eventBus.subscribe(BILLING_EVENT_TYPES.SUBSCRIPTION_UPDATED, this.handleSubscriptionUpdated.bind(this));
    this.eventBus.subscribe(BILLING_EVENT_TYPES.SUBSCRIPTION_CANCELLED, this.handleSubscriptionCancelled.bind(this));
    this.eventBus.subscribe(BILLING_EVENT_TYPES.PAYMENT_SUCCEEDED, this.handlePaymentSucceeded.bind(this));
    this.eventBus.subscribe(BILLING_EVENT_TYPES.USAGE_RECORDED, this.handleUsageRecorded.bind(this));

    // Track user activity events
    this.eventBus.subscribe('user.session.started', this.handleUserSessionStarted.bind(this));
    this.eventBus.subscribe('user.session.ended', this.handleUserSessionEnded.bind(this));
    this.eventBus.subscribe('user.page.viewed', this.handleUserPageViewed.bind(this));
  }

  private async handleAIScoringRequested(event: any): Promise<void> {
    await this.recordEvent({
      id: `ai-req-${Date.now()}`,
      type: 'ai.scoring.requested',
      userId: event.data.userId,
      tenantId: event.data.tenantId,
      timestamp: new Date(),
      data: {
        requestId: event.data.id,
        mortgageData: event.data.mortgageData
      },
      metadata: event.metadata
    });
  }

  private async handleAIScoringCompleted(event: any): Promise<void> {
    await this.recordEvent({
      id: `ai-completed-${Date.now()}`,
      type: 'ai.scoring.completed',
      userId: event.data.userId,
      tenantId: event.data.tenantId,
      timestamp: new Date(),
      data: {
        requestId: event.data.requestId,
        score: event.data.score,
        confidence: event.data.confidence
      },
      metadata: event.metadata
    });

    // Update user metrics
    await this.updateUserMetrics(event.data.userId, event.data.tenantId, {
      totalAIRequests: 1,
      lastActive: new Date()
    });
  }

  private async handleAIScoringFailed(event: any): Promise<void> {
    await this.recordEvent({
      id: `ai-failed-${Date.now()}`,
      type: 'ai.scoring.failed',
      userId: event.data.userId,
      tenantId: event.data.tenantId,
      timestamp: new Date(),
      data: {
        requestId: event.data.requestId,
        error: event.data.error
      },
      metadata: event.metadata
    });
  }

  private async handleSubscriptionCreated(event: any): Promise<void> {
    await this.recordEvent({
      id: `sub-created-${Date.now()}`,
      type: 'billing.subscription.created',
      userId: event.data.userId,
      tenantId: event.data.tenantId,
      timestamp: new Date(),
      data: {
        subscriptionId: event.data.subscriptionId,
        plan: event.data.plan,
        amount: event.data.amount
      },
      metadata: event.metadata
    });

    // Update tenant metrics
    await this.updateTenantMetrics(event.data.tenantId, {
      totalUsers: 1,
      activeUsers: 1,
      totalRevenue: event.data.amount || 0,
      monthlyRecurringRevenue: event.data.amount || 0
    });
  }

  private async handleSubscriptionUpdated(event: any): Promise<void> {
    await this.recordEvent({
      id: `sub-updated-${Date.now()}`,
      type: 'billing.subscription.updated',
      userId: event.data.userId,
      tenantId: event.data.tenantId,
      timestamp: new Date(),
      data: {
        subscriptionId: event.data.subscriptionId,
        oldPlan: event.data.oldPlan,
        newPlan: event.data.newPlan,
        amount: event.data.amount
      },
      metadata: event.metadata
    });
  }

  private async handleSubscriptionCancelled(event: any): Promise<void> {
    await this.recordEvent({
      id: `sub-cancelled-${Date.now()}`,
      type: 'billing.subscription.cancelled',
      userId: event.data.userId,
      tenantId: event.data.tenantId,
      timestamp: new Date(),
      data: {
        subscriptionId: event.data.subscriptionId,
        reason: event.data.reason
      },
      metadata: event.metadata
    });

    // Update tenant metrics
    await this.updateTenantMetrics(event.data.tenantId, {
      activeUsers: -1
    });
  }

  private async handlePaymentSucceeded(event: any): Promise<void> {
    await this.recordEvent({
      id: `payment-success-${Date.now()}`,
      type: 'billing.payment.succeeded',
      userId: event.data.userId,
      tenantId: event.data.tenantId,
      timestamp: new Date(),
      data: {
        paymentId: event.data.paymentId,
        amount: event.data.amount,
        currency: event.data.currency
      },
      metadata: event.metadata
    });

    // Update tenant metrics
    await this.updateTenantMetrics(event.data.tenantId, {
      totalRevenue: event.data.amount || 0
    });
  }

  private async handleUsageRecorded(event: any): Promise<void> {
    await this.recordEvent({
      id: `usage-${Date.now()}`,
      type: 'billing.usage.recorded',
      userId: event.data.userId,
      tenantId: event.data.tenantId,
      timestamp: new Date(),
      data: {
        service: event.data.service,
        usage: event.data.usage,
        cost: event.data.cost
      },
      metadata: event.metadata
    });
  }

  private async handleUserSessionStarted(event: any): Promise<void> {
    await this.recordEvent({
      id: `session-start-${Date.now()}`,
      type: 'user.session.started',
      userId: event.data.userId,
      tenantId: event.data.tenantId,
      timestamp: new Date(),
      data: {
        sessionId: event.data.sessionId,
        userAgent: event.data.userAgent,
        ipAddress: event.data.ipAddress
      },
      metadata: event.metadata
    });

    // Update user metrics
    await this.updateUserMetrics(event.data.userId, event.data.tenantId, {
      totalSessions: 1,
      lastActive: new Date()
    });
  }

  private async handleUserSessionEnded(event: any): Promise<void> {
    await this.recordEvent({
      id: `session-end-${Date.now()}`,
      type: 'user.session.ended',
      userId: event.data.userId,
      tenantId: event.data.tenantId,
      timestamp: new Date(),
      data: {
        sessionId: event.data.sessionId,
        duration: event.data.duration
      },
      metadata: event.metadata
    });
  }

  private async handleUserPageViewed(event: any): Promise<void> {
    await this.recordEvent({
      id: `page-view-${Date.now()}`,
      type: 'user.page.viewed',
      userId: event.data.userId,
      tenantId: event.data.tenantId,
      timestamp: new Date(),
      data: {
        page: event.data.page,
        referrer: event.data.referrer
      },
      metadata: event.metadata
    });
  }

  private async recordEvent(event: AnalyticsEvent): Promise<void> {
    this.events.push(event);
    
    // Keep only last 10000 events in memory
    if (this.events.length > 10000) {
      this.events = this.events.slice(-10000);
    }

    // Publish analytics event
    await this.eventBus.publish('analytics.event.recorded', {
      eventId: event.id,
      type: event.type,
      userId: event.userId,
      tenantId: event.tenantId,
      timestamp: event.timestamp
    });
  }

  private async updateUserMetrics(userId: string, tenantId: string, updates: Partial<UserMetrics>): Promise<void> {
    const existing = this.userMetrics.get(userId) || {
      userId,
      tenantId,
      totalSessions: 0,
      totalAIRequests: 0,
      totalSpend: 0,
      lastActive: new Date(),
      firstSeen: new Date(),
      isActive: true
    };

    const updated = {
      ...existing,
      ...updates,
      lastActive: new Date()
    };

    this.userMetrics.set(userId, updated);
  }

  private async updateTenantMetrics(tenantId: string, updates: Partial<TenantMetrics>): Promise<void> {
    const existing = this.tenantMetrics.get(tenantId) || {
      tenantId,
      totalUsers: 0,
      activeUsers: 0,
      totalRevenue: 0,
      monthlyRecurringRevenue: 0,
      churnRate: 0,
      averageSessionDuration: 0,
      totalAIRequests: 0,
      averageMatchAccuracy: 0,
      createdAt: new Date(),
      lastActive: new Date()
    };

    const updated = {
      ...existing,
      ...updates,
      lastActive: new Date()
    };

    this.tenantMetrics.set(tenantId, updated);
  }

  // Public API methods
  async getUserMetrics(userId: string): Promise<UserMetrics | null> {
    return this.userMetrics.get(userId) || null;
  }

  async getTenantMetrics(tenantId: string): Promise<TenantMetrics | null> {
    return this.tenantMetrics.get(tenantId) || null;
  }

  async getAllTenantMetrics(): Promise<TenantMetrics[]> {
    return Array.from(this.tenantMetrics.values());
  }

  async getRevenueMetrics(tenantId?: string): Promise<RevenueMetrics> {
    const tenants = tenantId ? [this.tenantMetrics.get(tenantId)].filter(Boolean) : Array.from(this.tenantMetrics.values());
    
    const totalRevenue = tenants.reduce((sum, tenant) => sum + tenant.totalRevenue, 0);
    const monthlyRecurringRevenue = tenants.reduce((sum, tenant) => sum + tenant.monthlyRecurringRevenue, 0);
    const totalUsers = tenants.reduce((sum, tenant) => sum + tenant.totalUsers, 0);
    const activeUsers = tenants.reduce((sum, tenant) => sum + tenant.activeUsers, 0);
    
    return {
      totalRevenue,
      monthlyRecurringRevenue,
      averageRevenuePerUser: totalUsers > 0 ? totalRevenue / totalUsers : 0,
      churnRate: tenants.reduce((sum, tenant) => sum + tenant.churnRate, 0) / tenants.length || 0,
      lifetimeValue: totalUsers > 0 ? totalRevenue / totalUsers : 0,
      grossMargin: 0.8, // 80% gross margin
      netRevenueRetention: 0.95 // 95% net revenue retention
    };
  }

  async getUsageMetrics(tenantId?: string): Promise<UsageMetrics> {
    const tenants = tenantId ? [this.tenantMetrics.get(tenantId)].filter(Boolean) : Array.from(this.tenantMetrics.values());
    
    const totalAIRequests = tenants.reduce((sum, tenant) => sum + tenant.totalAIRequests, 0);
    const totalUsers = tenants.reduce((sum, tenant) => sum + tenant.totalUsers, 0);
    
    return {
      totalAIRequests,
      averageRequestsPerUser: totalUsers > 0 ? totalAIRequests / totalUsers : 0,
      peakConcurrentUsers: Math.max(...tenants.map(t => t.activeUsers), 0),
      averageResponseTime: 150, // ms
      errorRate: 0.02, // 2%
      uptime: 0.999 // 99.9%
    };
  }

  async getCohortData(tenantId?: string): Promise<CohortData[]> {
    // Simulate cohort analysis
    const cohorts: CohortData[] = [];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const cohortDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const cohort = cohortDate.toISOString().substring(0, 7);
      
      cohorts.push({
        cohort,
        totalUsers: Math.floor(Math.random() * 100) + 50,
        retainedUsers: Math.floor(Math.random() * 80) + 30,
        retentionRate: Math.random() * 0.4 + 0.6, // 60-100%
        revenue: Math.floor(Math.random() * 10000) + 5000,
        averageLifetimeValue: Math.floor(Math.random() * 500) + 200
      });
    }
    
    return cohorts.sort((a, b) => a.cohort.localeCompare(b.cohort));
  }

  async getFunnelData(tenantId?: string): Promise<FunnelStep[]> {
    // Simulate funnel analysis
    return [
      { step: 'Landing Page', users: 1000, conversionRate: 1.0, dropoffRate: 0 },
      { step: 'Sign Up', users: 800, conversionRate: 0.8, dropoffRate: 0.2 },
      { step: 'Profile Setup', users: 600, conversionRate: 0.75, dropoffRate: 0.25 },
      { step: 'First AI Request', users: 400, conversionRate: 0.67, dropoffRate: 0.33 },
      { step: 'Subscription', users: 200, conversionRate: 0.5, dropoffRate: 0.5 },
      { step: 'Active User', users: 150, conversionRate: 0.75, dropoffRate: 0.25 }
    ];
  }

  async generateReport(type: 'daily' | 'weekly' | 'monthly' | 'custom', period?: { start: Date; end: Date }): Promise<AnalyticsReport> {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (type) {
      case 'daily':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'custom':
        start = period?.start || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        end = period?.end || now;
        break;
    }

    const report: AnalyticsReport = {
      id: `report-${Date.now()}`,
      type,
      period: { start, end },
      metrics: {
        users: Array.from(this.userMetrics.values()),
        tenants: Array.from(this.tenantMetrics.values()),
        revenue: await this.getRevenueMetrics(),
        usage: await this.getUsageMetrics(),
        cohorts: await this.getCohortData(),
        funnel: await this.getFunnelData()
      },
      generatedAt: now,
      generatedBy: 'analytics-service'
    };

    this.reports.push(report);
    return report;
  }

  async getReports(limit: number = 10): Promise<AnalyticsReport[]> {
    return this.reports
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())
      .slice(0, limit);
  }

  async getReport(reportId: string): Promise<AnalyticsReport | null> {
    return this.reports.find(r => r.id === reportId) || null;
  }

  // Export methods
  async exportReportToCSV(reportId: string): Promise<string> {
    const report = await this.getReport(reportId);
    if (!report) throw new Error('Report not found');

    const csv = [
      'Metric,Value',
      `Total Revenue,${report.metrics.revenue.totalRevenue}`,
      `Monthly Recurring Revenue,${report.metrics.revenue.monthlyRecurringRevenue}`,
      `Average Revenue Per User,${report.metrics.revenue.averageRevenuePerUser}`,
      `Churn Rate,${report.metrics.revenue.churnRate}`,
      `Total AI Requests,${report.metrics.usage.totalAIRequests}`,
      `Average Requests Per User,${report.metrics.usage.averageRequestsPerUser}`,
      `Peak Concurrent Users,${report.metrics.usage.peakConcurrentUsers}`,
      `Error Rate,${report.metrics.usage.errorRate}`,
      `Uptime,${report.metrics.usage.uptime}`
    ].join('\n');

    return csv;
  }

  async exportReportToJSON(reportId: string): Promise<string> {
    const report = await this.getReport(reportId);
    if (!report) throw new Error('Report not found');

    return JSON.stringify(report, null, 2);
  }

  // Cleanup methods
  async cleanupOldEvents(olderThanDays: number = 30): Promise<void> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    this.events = this.events.filter(event => event.timestamp > cutoff);
  }

  async cleanupOldReports(olderThanDays: number = 90): Promise<void> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    this.reports = this.reports.filter(report => report.generatedAt > cutoff);
  }
}
