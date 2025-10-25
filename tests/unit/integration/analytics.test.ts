import { AnalyticsService } from '../../lib/analytics/analytics-service';
import { ReportScheduler } from '../../lib/analytics/report-scheduler';
import { EventBus } from '../../lib/events/event-bus';
import { AI_EVENT_TYPES } from '../../lib/events/schemas/ai-events';
import { BILLING_EVENT_TYPES } from '../../lib/events/schemas/billing-events';

describe('Analytics Integration', () => {
  let eventBus: EventBus;
  let analyticsService: AnalyticsService;
  let reportScheduler: ReportScheduler;

  beforeEach(() => {
    eventBus = new EventBus();
    analyticsService = new AnalyticsService(eventBus);
    reportScheduler = new ReportScheduler(analyticsService, eventBus);
  });

  afterEach(async () => {
    await reportScheduler.cleanup();
    eventBus.close();
  });

  describe('Analytics Service', () => {
    it('should track AI scoring events', async () => {
      // Simulate AI scoring request
      await eventBus.publish(AI_EVENT_TYPES.SCORING_REQUESTED, {
        id: 'req-123',
        userId: 'user-123',
        tenantId: 'tenant-123',
        mortgageData: {
          loanAmount: 500000,
          downPayment: 100000,
          creditScore: 750,
          income: 120000
        }
      });

      // Simulate AI scoring completion
      await eventBus.publish(AI_EVENT_TYPES.SCORING_COMPLETED, {
        requestId: 'req-123',
        userId: 'user-123',
        tenantId: 'tenant-123',
        score: 85,
        confidence: 0.92
      });

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check user metrics
      const userMetrics = await analyticsService.getUserMetrics('user-123');
      expect(userMetrics).toBeTruthy();
      expect(userMetrics?.totalAIRequests).toBe(1);
      expect(userMetrics?.lastActive).toBeInstanceOf(Date);
    });

    it('should track billing events', async () => {
      // Simulate subscription creation
      await eventBus.publish(BILLING_EVENT_TYPES.SUBSCRIPTION_CREATED, {
        userId: 'user-456',
        tenantId: 'tenant-456',
        subscriptionId: 'sub-456',
        plan: 'premium',
        amount: 99.99
      });

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check tenant metrics
      const tenantMetrics = await analyticsService.getTenantMetrics('tenant-456');
      expect(tenantMetrics).toBeTruthy();
      expect(tenantMetrics?.totalUsers).toBe(1);
      expect(tenantMetrics?.activeUsers).toBe(1);
      expect(tenantMetrics?.totalRevenue).toBe(99.99);
    });

    it('should generate reports', async () => {
      // Generate a daily report
      const report = await analyticsService.generateReport('daily');
      
      expect(report).toBeTruthy();
      expect(report.type).toBe('daily');
      expect(report.metrics).toBeTruthy();
      expect(report.metrics.revenue).toBeTruthy();
      expect(report.metrics.usage).toBeTruthy();
      expect(report.metrics.cohorts).toBeTruthy();
      expect(report.metrics.funnel).toBeTruthy();
    });

    it('should export reports to CSV', async () => {
      const report = await analyticsService.generateReport('monthly');
      const csv = await analyticsService.exportReportToCSV(report.id);
      
      expect(csv).toContain('Metric,Value');
      expect(csv).toContain('Total Revenue');
      expect(csv).toContain('Monthly Recurring Revenue');
    });

    it('should export reports to JSON', async () => {
      const report = await analyticsService.generateReport('weekly');
      const json = await analyticsService.exportReportToJSON(report.id);
      
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe(report.id);
      expect(parsed.type).toBe('weekly');
      expect(parsed.metrics).toBeTruthy();
    });
  });

  describe('Report Scheduler', () => {
    it('should create scheduled reports', async () => {
      const reportId = await reportScheduler.createScheduledReport({
        name: 'Daily Revenue Report',
        type: 'daily',
        tenantId: 'tenant-123',
        recipients: ['admin@example.com'],
        format: 'csv',
        enabled: true
      });

      expect(reportId).toBeTruthy();
      expect(reportId).toMatch(/^scheduled-\d+$/);
    });

    it('should retrieve scheduled reports', async () => {
      // Create a report
      const reportId = await reportScheduler.createScheduledReport({
        name: 'Weekly Analytics',
        type: 'weekly',
        recipients: ['analyst@example.com'],
        format: 'json',
        enabled: true
      });

      // Retrieve all reports
      const reports = await reportScheduler.getScheduledReports();
      expect(reports).toHaveLength(1);
      expect(reports[0].id).toBe(reportId);
      expect(reports[0].name).toBe('Weekly Analytics');
    });

    it('should update scheduled reports', async () => {
      // Create a report
      const reportId = await reportScheduler.createScheduledReport({
        name: 'Monthly Report',
        type: 'monthly',
        recipients: ['manager@example.com'],
        format: 'pdf',
        enabled: true
      });

      // Update the report
      await reportScheduler.updateScheduledReport(reportId, {
        name: 'Updated Monthly Report',
        enabled: false
      });

      // Retrieve and verify
      const report = await reportScheduler.getScheduledReport(reportId);
      expect(report?.name).toBe('Updated Monthly Report');
      expect(report?.enabled).toBe(false);
    });

    it('should delete scheduled reports', async () => {
      // Create a report
      const reportId = await reportScheduler.createScheduledReport({
        name: 'Test Report',
        type: 'daily',
        recipients: ['test@example.com'],
        format: 'csv',
        enabled: true
      });

      // Delete the report
      await reportScheduler.deleteScheduledReport(reportId);

      // Verify deletion
      const report = await reportScheduler.getScheduledReport(reportId);
      expect(report).toBeNull();
    });

    it('should run reports immediately', async () => {
      // Create a report
      const reportId = await reportScheduler.createScheduledReport({
        name: 'Immediate Report',
        type: 'daily',
        recipients: ['immediate@example.com'],
        format: 'json',
        enabled: true
      });

      // Run the report immediately
      await reportScheduler.runReportNow(reportId);

      // Verify the report was run
      const report = await reportScheduler.getScheduledReport(reportId);
      expect(report?.lastRun).toBeInstanceOf(Date);
    });
  });

  describe('Event Integration', () => {
    it('should handle end-to-end event flow', async () => {
      const events: string[] = [];
      
      // Subscribe to analytics events
      eventBus.subscribe('analytics.event.recorded', (event) => {
        events.push(event.type);
      });

      // Simulate a complete user journey
      await eventBus.publish('user.session.started', {
        userId: 'user-789',
        tenantId: 'tenant-789',
        sessionId: 'session-789',
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1'
      });

      await eventBus.publish(AI_EVENT_TYPES.SCORING_REQUESTED, {
        id: 'req-789',
        userId: 'user-789',
        tenantId: 'tenant-789',
        mortgageData: { loanAmount: 300000 }
      });

      await eventBus.publish(AI_EVENT_TYPES.SCORING_COMPLETED, {
        requestId: 'req-789',
        userId: 'user-789',
        tenantId: 'tenant-789',
        score: 78,
        confidence: 0.88
      });

      await eventBus.publish(BILLING_EVENT_TYPES.USAGE_RECORDED, {
        userId: 'user-789',
        tenantId: 'tenant-789',
        service: 'ai_scoring',
        usage: 1,
        cost: 0.50
      });

      await eventBus.publish('user.session.ended', {
        userId: 'user-789',
        tenantId: 'tenant-789',
        sessionId: 'session-789',
        duration: 1800000 // 30 minutes
      });

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify events were recorded
      expect(events).toContain('user.session.started');
      expect(events).toContain('ai.scoring.requested');
      expect(events).toContain('ai.scoring.completed');
      expect(events).toContain('billing.usage.recorded');
      expect(events).toContain('user.session.ended');
    });
  });

  describe('Performance', () => {
    it('should handle high event volume', async () => {
      const eventCount = 100;
      const startTime = Date.now();

      // Publish many events
      for (let i = 0; i < eventCount; i++) {
        await eventBus.publish('analytics.event.recorded', {
          eventId: `event-${i}`,
          type: 'test.event',
          userId: `user-${i}`,
          tenantId: `tenant-${i % 10}`,
          timestamp: new Date()
        });
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 500));
      const endTime = Date.now();

      // Verify performance
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Data Cleanup', () => {
    it('should cleanup old events', async () => {
      // Create some old events
      const oldEvent = {
        id: 'old-event',
        type: 'test.event',
        userId: 'user-old',
        tenantId: 'tenant-old',
        timestamp: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
        data: {}
      };

      // Manually add old event (bypassing normal flow)
      (analyticsService as any).events.push(oldEvent);

      // Cleanup events older than 30 days
      await analyticsService.cleanupOldEvents(30);

      // Verify old event was removed
      const events = (analyticsService as any).events;
      expect(events.find((e: any) => e.id === 'old-event')).toBeUndefined();
    });

    it('should cleanup old reports', async () => {
      // Create some old reports
      const oldReport = {
        id: 'old-report',
        type: 'daily' as const,
        period: { start: new Date(), end: new Date() },
        metrics: { users: [], tenants: [], revenue: {} as any, usage: {} as any, cohorts: [], funnel: [] },
        generatedAt: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000), // 95 days ago
        generatedBy: 'test'
      };

      // Manually add old report
      (analyticsService as any).reports.push(oldReport);

      // Cleanup reports older than 90 days
      await analyticsService.cleanupOldReports(90);

      // Verify old report was removed
      const reports = (analyticsService as any).reports;
      expect(reports.find((r: any) => r.id === 'old-report')).toBeUndefined();
    });
  });
});
