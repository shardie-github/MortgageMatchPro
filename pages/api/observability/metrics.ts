import { NextApiRequest, NextApiResponse } from 'next';
import { TelemetryService } from '../../../lib/observability/telemetry';
import { EventBus } from '../../../lib/events/event-bus';

// Initialize telemetry service
const eventBus = new EventBus();
const telemetryService = new TelemetryService(eventBus);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { serviceId, metricName, from, to } = req.query;
    
    if (!serviceId || !metricName) {
      return res.status(400).json({ 
        error: 'serviceId and metricName are required' 
      });
    }

    const fromDate = from ? new Date(from as string) : undefined;
    const toDate = to ? new Date(to as string) : undefined;

    const metrics = await telemetryService.getMetrics(
      serviceId as string,
      metricName as string,
      fromDate,
      toDate
    );

    res.status(200).json({
      success: true,
      data: {
        serviceId,
        metricName,
        metrics,
        count: metrics.length,
        from: fromDate,
        to: toDate
      }
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics'
    });
  }
}
