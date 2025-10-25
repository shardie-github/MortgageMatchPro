import { NextApiRequest, NextApiResponse } from 'next';
import { AnalyticsService } from '../../../lib/analytics/analytics-service';
import { EventBus } from '../../../lib/events/event-bus';

// Initialize analytics service
const eventBus = new EventBus();
const analyticsService = new AnalyticsService(eventBus);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, tenantId, limit } = req.query;
    
    // Generate report based on type
    const reportType = (type as string) || 'daily';
    const report = await analyticsService.generateReport(reportType as any);
    
    // Filter by tenant if specified
    if (tenantId) {
      report.metrics.tenants = report.metrics.tenants.filter(t => t.tenantId === tenantId);
      report.metrics.users = report.metrics.users.filter(u => u.tenantId === tenantId);
    }

    // Limit results if specified
    const reportLimit = limit ? parseInt(limit as string) : 10;
    report.metrics.users = report.metrics.users.slice(0, reportLimit);
    report.metrics.tenants = report.metrics.tenants.slice(0, reportLimit);

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report'
    });
  }
}
