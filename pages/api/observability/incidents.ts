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
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in incidents API:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { status } = req.query;
  
  const incidents = await telemetryService.getIncidents(
    status as 'open' | 'investigating' | 'resolved' | 'closed' | undefined
  );

  res.status(200).json({
    success: true,
    data: {
      incidents,
      count: incidents.length,
      status: status || 'all'
    }
  });
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const { 
    title, 
    description, 
    severity, 
    services, 
    alerts, 
    assignedTo, 
    tenantId 
  } = req.body;

  // Validate required fields
  if (!title || !description || !severity || !services) {
    return res.status(400).json({
      error: 'Missing required fields: title, description, severity, services'
    });
  }

  try {
    const incidentId = await telemetryService.createIncident({
      title,
      description,
      severity,
      status: 'open',
      services,
      alerts: alerts || [],
      assignedTo,
      tenantId
    });

    res.status(201).json({
      success: true,
      data: { incidentId }
    });
  } catch (error) {
    console.error('Error creating incident:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create incident'
    });
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  const { incidentId } = req.query;
  const updates = req.body;

  if (!incidentId) {
    return res.status(400).json({ error: 'incidentId is required' });
  }

  try {
    await telemetryService.updateIncident(incidentId as string, updates);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating incident:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update incident'
    });
  }
}
