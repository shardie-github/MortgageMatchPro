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
    const { reportId, format } = req.query;
    
    if (!reportId) {
      return res.status(400).json({ error: 'Report ID is required' });
    }

    const report = await analyticsService.getReport(reportId as string);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const exportFormat = (format as string) || 'json';
    
    if (exportFormat === 'csv') {
      const csv = await analyticsService.exportReportToCSV(reportId as string);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.csv"`);
      res.status(200).send(csv);
    } else if (exportFormat === 'json') {
      const json = await analyticsService.exportReportToJSON(reportId as string);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.json"`);
      res.status(200).send(json);
    } else {
      res.status(400).json({ error: 'Invalid format. Use csv or json' });
    }
  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export report'
    });
  }
}
