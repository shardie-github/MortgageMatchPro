/**
 * Performance Report API Endpoint
 * Exposes comprehensive performance metrics and recommendations
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getPerformanceReport, getOptimizationRecommendations, getTopSlowestEndpoints } from '../../../lib/performance/profiling-suite';
import { getCacheStats } from '../../../lib/performance/caching-system';
import { getPoolStats } from '../../../lib/performance/connection-pool';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get performance report
    const performanceReport = getPerformanceReport();
    
    // Get optimization recommendations
    const recommendations = getOptimizationRecommendations();
    
    // Get slowest endpoints
    const slowestEndpoints = getTopSlowestEndpoints(10);
    
    // Get cache statistics
    const cacheStats = getCacheStats();
    
    // Get connection pool statistics
    const poolStats = getPoolStats();
    
    // Compile comprehensive report
    const report = {
      timestamp: new Date().toISOString(),
      version: '1.4.0',
      performance: performanceReport,
      recommendations,
      slowestEndpoints,
      cache: cacheStats,
      connectionPool: poolStats,
      summary: {
        overallScore: performanceReport.summary.overallScore,
        criticalIssues: recommendations.highPriority.length,
        optimizationImpact: recommendations.estimatedImpact,
        cacheHitRate: cacheStats.hitRate,
        poolEfficiency: poolStats.poolEfficiency,
      }
    };

    res.status(200).json(report);
  } catch (error) {
    console.error('[Performance API] Error generating report:', error);
    res.status(500).json({ 
      error: 'Failed to generate performance report',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
