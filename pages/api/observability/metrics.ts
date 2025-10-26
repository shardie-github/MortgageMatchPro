/**
 * Observability Metrics API - MortgageMatchPro v1.4.0
 * 
 * RESTful API for accessing system metrics and monitoring data
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { monitoringService } from '../../../core/observability/monitoring';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      serviceId, 
      metricName, 
      startTime, 
      endTime, 
      aggregation = 'avg',
      format = 'json'
    } = req.query;

    // Validate required parameters
    if (!serviceId || !metricName) {
      return res.status(400).json({ 
        error: 'Missing required parameters: serviceId, metricName' 
      });
    }

    // Parse time range
    const start = startTime ? new Date(startTime as string) : undefined;
    const end = endTime ? new Date(endTime as string) : undefined;

    // Get metrics
    const metrics = monitoringService.getMetrics(metricName as string, start, end);
    
    if (metrics.length === 0) {
      return res.status(404).json({ 
        error: 'No metrics found for the specified criteria' 
      });
    }

    // Apply aggregation if requested
    let result: any;
    if (aggregation !== 'raw') {
      const aggregatedValue = monitoringService.getAggregatedMetrics(
        metricName as string, 
        aggregation as any, 
        start, 
        end
      );
      
      result = {
        serviceId,
        metricName,
        aggregation,
        value: aggregatedValue,
        timestamp: new Date(),
        timeRange: {
          start: start?.toISOString(),
          end: end?.toISOString()
        }
      };
    } else {
      result = {
        serviceId,
        metricName,
        metrics: metrics.map(m => ({
          value: m.value,
          timestamp: m.timestamp.toISOString(),
          tags: m.tags
        })),
        timeRange: {
          start: start?.toISOString(),
          end: end?.toISOString()
        }
      };
    }

    // Set appropriate content type
    if (format === 'prometheus') {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(monitoringService.exportMetrics('prometheus'));
    }

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(result);

  } catch (error) {
    console.error('Metrics API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}