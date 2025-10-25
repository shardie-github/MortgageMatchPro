import { AnalyticsService } from './analytics-service';
import { EventBus } from '../events/event-bus';

export interface ScheduledReport {
  id: string;
  name: string;
  type: 'daily' | 'weekly' | 'monthly';
  tenantId?: string;
  recipients: string[];
  format: 'csv' | 'json' | 'pdf';
  enabled: boolean;
  lastRun?: Date;
  nextRun: Date;
  createdAt: Date;
}

export class ReportScheduler {
  private analyticsService: AnalyticsService;
  private eventBus: EventBus;
  private scheduledReports: Map<string, ScheduledReport> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(analyticsService: AnalyticsService, eventBus: EventBus) {
    this.analyticsService = analyticsService;
    this.eventBus = eventBus;
    this.initializeScheduler();
  }

  private initializeScheduler(): void {
    // Start the scheduler loop
    this.scheduleNextRun();
  }

  private scheduleNextRun(): void {
    // Run every hour to check for scheduled reports
    setTimeout(() => {
      this.processScheduledReports();
      this.scheduleNextRun();
    }, 60 * 60 * 1000); // 1 hour
  }

  private async processScheduledReports(): Promise<void> {
    const now = new Date();
    
    for (const [reportId, report] of this.scheduledReports) {
      if (report.enabled && report.nextRun <= now) {
        try {
          await this.generateAndSendReport(report);
          this.updateReportLastRun(reportId);
          this.scheduleNextReport(reportId);
        } catch (error) {
          console.error(`Error processing scheduled report ${reportId}:`, error);
        }
      }
    }
  }

  private async generateAndSendReport(report: ScheduledReport): Promise<void> {
    try {
      // Generate the report
      const analyticsReport = await this.analyticsService.generateReport(
        report.type,
        report.tenantId ? { start: new Date(), end: new Date() } : undefined
      );

      // Export in the requested format
      let content: string;
      let filename: string;
      let mimeType: string;

      switch (report.format) {
        case 'csv':
          content = await this.analyticsService.exportReportToCSV(analyticsReport.id);
          filename = `report-${analyticsReport.id}.csv`;
          mimeType = 'text/csv';
          break;
        case 'json':
          content = await this.analyticsService.exportReportToJSON(analyticsReport.id);
          filename = `report-${analyticsReport.id}.json`;
          mimeType = 'application/json';
          break;
        case 'pdf':
          content = await this.generatePDFReport(analyticsReport);
          filename = `report-${analyticsReport.id}.pdf`;
          mimeType = 'application/pdf';
          break;
        default:
          throw new Error(`Unsupported format: ${report.format}`);
      }

      // Send to recipients
      await this.sendReportToRecipients(report, content, filename, mimeType);

      // Publish event
      await this.eventBus.publish('analytics.report.generated', {
        reportId: report.id,
        analyticsReportId: analyticsReport.id,
        type: report.type,
        format: report.format,
        recipients: report.recipients,
        generatedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error(`Error generating report for ${report.id}:`, error);
      throw error;
    }
  }

  private async generatePDFReport(analyticsReport: any): Promise<string> {
    // This is a simplified PDF generation
    // In a real implementation, you would use a library like puppeteer or jsPDF
    const pdfContent = `
      <html>
        <head>
          <title>Analytics Report - ${analyticsReport.id}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .metric { margin: 10px 0; }
            .metric-label { font-weight: bold; }
            .metric-value { color: #2563eb; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Analytics Report</h1>
            <p>Generated: ${analyticsReport.generatedAt}</p>
            <p>Period: ${analyticsReport.period.start} to ${analyticsReport.period.end}</p>
          </div>
          
          <h2>Revenue Metrics</h2>
          <div class="metric">
            <span class="metric-label">Total Revenue:</span>
            <span class="metric-value">$${analyticsReport.metrics.revenue.totalRevenue.toLocaleString()}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Monthly Recurring Revenue:</span>
            <span class="metric-value">$${analyticsReport.metrics.revenue.monthlyRecurringRevenue.toLocaleString()}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Average Revenue Per User:</span>
            <span class="metric-value">$${analyticsReport.metrics.revenue.averageRevenuePerUser.toLocaleString()}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Churn Rate:</span>
            <span class="metric-value">${(analyticsReport.metrics.revenue.churnRate * 100).toFixed(1)}%</span>
          </div>
          
          <h2>Usage Metrics</h2>
          <div class="metric">
            <span class="metric-label">Total AI Requests:</span>
            <span class="metric-value">${analyticsReport.metrics.usage.totalAIRequests.toLocaleString()}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Peak Concurrent Users:</span>
            <span class="metric-value">${analyticsReport.metrics.usage.peakConcurrentUsers.toLocaleString()}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Average Response Time:</span>
            <span class="metric-value">${analyticsReport.metrics.usage.averageResponseTime}ms</span>
          </div>
          <div class="metric">
            <span class="metric-label">Uptime:</span>
            <span class="metric-value">${(analyticsReport.metrics.usage.uptime * 100).toFixed(1)}%</span>
          </div>
          
          <h2>Tenant Metrics</h2>
          <table>
            <thead>
              <tr>
                <th>Tenant ID</th>
                <th>Total Users</th>
                <th>Active Users</th>
                <th>Revenue</th>
                <th>MRR</th>
              </tr>
            </thead>
            <tbody>
              ${analyticsReport.metrics.tenants.map((tenant: any) => `
                <tr>
                  <td>${tenant.tenantId}</td>
                  <td>${tenant.totalUsers}</td>
                  <td>${tenant.activeUsers}</td>
                  <td>$${tenant.totalRevenue.toLocaleString()}</td>
                  <td>$${tenant.monthlyRecurringRevenue.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    // In a real implementation, you would convert this HTML to PDF
    // For now, we'll return the HTML as a string
    return pdfContent;
  }

  private async sendReportToRecipients(
    report: ScheduledReport,
    content: string,
    filename: string,
    mimeType: string
  ): Promise<void> {
    // In a real implementation, you would send emails with attachments
    // For now, we'll just log the report details
    console.log(`Sending report ${report.id} to recipients:`, report.recipients);
    console.log(`Content length: ${content.length} bytes`);
    console.log(`Filename: ${filename}`);
    console.log(`MIME type: ${mimeType}`);

    // Publish event for email service to handle
    await this.eventBus.publish('email.report.send', {
      reportId: report.id,
      recipients: report.recipients,
      subject: `Analytics Report - ${report.name}`,
      content,
      filename,
      mimeType,
      scheduledAt: new Date().toISOString()
    });
  }

  private updateReportLastRun(reportId: string): void {
    const report = this.scheduledReports.get(reportId);
    if (report) {
      report.lastRun = new Date();
      this.scheduledReports.set(reportId, report);
    }
  }

  private scheduleNextReport(reportId: string): void {
    const report = this.scheduledReports.get(reportId);
    if (!report) return;

    const now = new Date();
    let nextRun: Date;

    switch (report.type) {
      case 'daily':
        nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        nextRun = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        nextRun = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
    }

    report.nextRun = nextRun;
    this.scheduledReports.set(reportId, report);
  }

  // Public API methods
  async createScheduledReport(report: Omit<ScheduledReport, 'id' | 'createdAt' | 'nextRun'>): Promise<string> {
    const reportId = `scheduled-${Date.now()}`;
    const now = new Date();
    
    const scheduledReport: ScheduledReport = {
      ...report,
      id: reportId,
      createdAt: now,
      nextRun: this.calculateNextRun(report.type, now)
    };

    this.scheduledReports.set(reportId, scheduledReport);
    
    // Publish event
    await this.eventBus.publish('analytics.report.scheduled', {
      reportId,
      name: report.name,
      type: report.type,
      tenantId: report.tenantId,
      recipients: report.recipients,
      format: report.format,
      scheduledAt: now.toISOString()
    });

    return reportId;
  }

  async updateScheduledReport(reportId: string, updates: Partial<ScheduledReport>): Promise<void> {
    const report = this.scheduledReports.get(reportId);
    if (!report) throw new Error('Report not found');

    const updatedReport = { ...report, ...updates };
    this.scheduledReports.set(reportId, updatedReport);

    // Publish event
    await this.eventBus.publish('analytics.report.updated', {
      reportId,
      updates,
      updatedAt: new Date().toISOString()
    });
  }

  async deleteScheduledReport(reportId: string): Promise<void> {
    const report = this.scheduledReports.get(reportId);
    if (!report) throw new Error('Report not found');

    this.scheduledReports.delete(reportId);
    
    // Clear timer if exists
    const timer = this.timers.get(reportId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(reportId);
    }

    // Publish event
    await this.eventBus.publish('analytics.report.deleted', {
      reportId,
      deletedAt: new Date().toISOString()
    });
  }

  async getScheduledReports(): Promise<ScheduledReport[]> {
    return Array.from(this.scheduledReports.values());
  }

  async getScheduledReport(reportId: string): Promise<ScheduledReport | null> {
    return this.scheduledReports.get(reportId) || null;
  }

  async runReportNow(reportId: string): Promise<void> {
    const report = this.scheduledReports.get(reportId);
    if (!report) throw new Error('Report not found');

    await this.generateAndSendReport(report);
    this.updateReportLastRun(reportId);
  }

  private calculateNextRun(type: 'daily' | 'weekly' | 'monthly', from: Date): Date {
    switch (type) {
      case 'daily':
        return new Date(from.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return new Date(from.getFullYear(), from.getMonth() + 1, 1);
    }
  }

  // Cleanup method
  async cleanup(): Promise<void> {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.scheduledReports.clear();
  }
}
