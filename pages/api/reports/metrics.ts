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
    const { tenantId, metric } = req.query;
    
    const tenantIdParam = tenantId as string;
    const metricType = metric as string;

    let data: any = {};

    switch (metricType) {
      case 'revenue':
        data = await analyticsService.getRevenueMetrics(tenantIdParam);
        break;
      case 'usage':
        data = await analyticsService.getUsageMetrics(tenantIdParam);
        break;
      case 'cohorts':
        data = await analyticsService.getCohortData(tenantIdParam);
        break;
      case 'funnel':
        data = await analyticsService.getFunnelData(tenantIdParam);
        break;
      case 'tenants':
        data = await analyticsService.getAllTenantMetrics();
        break;
      default:
        // Return all metrics
        data = {
          revenue: await analyticsService.getRevenueMetrics(tenantIdParam),
          usage: await analyticsService.getUsageMetrics(tenantIdParam),
          cohorts: await analyticsService.getCohortData(tenantIdParam),
          funnel: await analyticsService.getFunnelData(tenantIdParam),
          tenants: await analyticsService.getAllTenantMetrics()
        };
    }

    res.status(200).json({
      success: true,
      data,
      metadata: {
        tenantId: tenantIdParam,
        metric: metricType,
        timestamp: new Date().toISOString()
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
