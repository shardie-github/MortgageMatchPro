/**
 * Health Check API - MortgageMatchPro v1.4.0
 * 
 * RESTful API for system health monitoring
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { healthCheckManager } from '../../../core/observability/health-check';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { check, format = 'json' } = req.query;

    let result: any;

    if (check) {
      // Get specific health check
      const checkResult = await healthCheckManager.runCheck(check as string);
      
      if (!checkResult) {
        return res.status(404).json({ 
          error: `Health check '${check}' not found` 
        });
      }

      result = {
        check: checkResult.name,
        status: checkResult.status,
        message: checkResult.message,
        timestamp: checkResult.timestamp.toISOString(),
        duration: checkResult.duration,
        details: checkResult.details
      };
    } else {
      // Get overall system health
      const systemHealth = healthCheckManager.getSystemHealth();
      
      result = {
        status: systemHealth.status,
        timestamp: new Date().toISOString(),
        summary: systemHealth.summary,
        checks: systemHealth.checks.map(check => ({
          name: check.name,
          status: check.status,
          message: check.message,
          timestamp: check.timestamp.toISOString(),
          duration: check.duration,
          details: check.details
        }))
      };
    }

    // Set appropriate content type
    if (format === 'prometheus') {
      res.setHeader('Content-Type', 'text/plain');
      const prometheusData = result.checks?.map((check: any) => 
        `health_check_status{check="${check.name}"} ${check.status === 'healthy' ? 1 : 0}`
      ).join('\n') || '';
      return res.status(200).send(prometheusData);
    }

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(result);

  } catch (error) {
    console.error('Health check API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}