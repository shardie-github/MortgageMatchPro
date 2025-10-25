import { NextApiRequest, NextApiResponse } from 'next';
import { ReportScheduler } from '../../../lib/analytics/report-scheduler';
import { AnalyticsService } from '../../../lib/analytics/analytics-service';
import { EventBus } from '../../../lib/events/event-bus';

// Initialize services
const eventBus = new EventBus();
const analyticsService = new AnalyticsService(eventBus);
const reportScheduler = new ReportScheduler(analyticsService, eventBus);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res);
      case 'PUT':
        return await handlePut(req, res);
      case 'DELETE':
        return await handleDelete(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in scheduled reports API:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { reportId } = req.query;

  if (reportId) {
    // Get specific report
    const report = await reportScheduler.getScheduledReport(reportId as string);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    return res.status(200).json({ success: true, data: report });
  } else {
    // Get all reports
    const reports = await reportScheduler.getScheduledReports();
    return res.status(200).json({ success: true, data: reports });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const { name, type, tenantId, recipients, format, enabled } = req.body;

  // Validate required fields
  if (!name || !type || !recipients || !format) {
    return res.status(400).json({
      error: 'Missing required fields: name, type, recipients, format'
    });
  }

  // Validate type
  if (!['daily', 'weekly', 'monthly'].includes(type)) {
    return res.status(400).json({
      error: 'Invalid type. Must be daily, weekly, or monthly'
    });
  }

  // Validate format
  if (!['csv', 'json', 'pdf'].includes(format)) {
    return res.status(400).json({
      error: 'Invalid format. Must be csv, json, or pdf'
    });
  }

  // Validate recipients
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({
      error: 'Recipients must be a non-empty array'
    });
  }

  try {
    const reportId = await reportScheduler.createScheduledReport({
      name,
      type,
      tenantId,
      recipients,
      format,
      enabled: enabled !== false // Default to true
    });

    return res.status(201).json({
      success: true,
      data: { reportId }
    });
  } catch (error) {
    console.error('Error creating scheduled report:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create scheduled report'
    });
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  const { reportId } = req.query;
  const updates = req.body;

  if (!reportId) {
    return res.status(400).json({ error: 'Report ID is required' });
  }

  try {
    await reportScheduler.updateScheduledReport(reportId as string, updates);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating scheduled report:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update scheduled report'
    });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  const { reportId } = req.query;

  if (!reportId) {
    return res.status(400).json({ error: 'Report ID is required' });
  }

  try {
    await reportScheduler.deleteScheduledReport(reportId as string);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting scheduled report:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete scheduled report'
    });
  }
}
