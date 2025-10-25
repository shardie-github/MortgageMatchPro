import { NextApiRequest, NextApiResponse } from 'next';
import { TelemetryService } from '../../../lib/observability/telemetry';
import { EventBus } from '../../../lib/events/event-bus';

// Initialize telemetry service
const eventBus = new EventBus();
const telemetryService = new TelemetryService(eventBus);

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
    console.error('Error in alerts API:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { status } = req.query;
  
  const alerts = await telemetryService.getAlerts(
    status as 'firing' | 'resolved' | undefined
  );

  res.status(200).json({
    success: true,
    data: {
      alerts,
      count: alerts.length,
      status: status || 'all'
    }
  });
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const { name, metric, threshold, operator, duration, severity, channels, tenantId } = req.body;

  // Validate required fields
  if (!name || !metric || !threshold || !operator || !severity || !channels) {
    return res.status(400).json({
      error: 'Missing required fields: name, metric, threshold, operator, severity, channels'
    });
  }

  try {
    const ruleId = await telemetryService.createAlertRule({
      name,
      metric,
      threshold,
      operator,
      duration: duration || 300,
      severity,
      enabled: true,
      channels,
      tenantId
    });

    res.status(201).json({
      success: true,
      data: { ruleId }
    });
  } catch (error) {
    console.error('Error creating alert rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create alert rule'
    });
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  const { ruleId } = req.query;
  const updates = req.body;

  if (!ruleId) {
    return res.status(400).json({ error: 'ruleId is required' });
  }

  try {
    await telemetryService.updateAlertRule(ruleId as string, updates);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating alert rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update alert rule'
    });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  const { ruleId } = req.query;

  if (!ruleId) {
    return res.status(400).json({ error: 'ruleId is required' });
  }

  try {
    await telemetryService.deleteAlertRule(ruleId as string);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting alert rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete alert rule'
    });
  }
}
