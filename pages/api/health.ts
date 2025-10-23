import { NextApiRequest, NextApiResponse } from 'next'
import { performHealthCheck } from '@/lib/monitoring'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const healthStatus = await performHealthCheck()
    
    const statusCode = healthStatus.overall ? 200 : 503
    
    res.status(statusCode).json({
      status: healthStatus.overall ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: healthStatus,
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
    })
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    })
  }
}
