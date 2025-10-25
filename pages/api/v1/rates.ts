import { NextApiRequest, NextApiResponse } from 'next'
import { PublicApiService } from '@/lib/api/public-api-service'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const apiKey = req.headers['x-api-key'] as string
    const organizationId = req.headers['x-organization-id'] as string

    if (!apiKey || !organizationId) {
      return res.status(401).json({ error: 'Missing API key or organization ID' })
    }

    const request = {
      organizationId,
      apiKey,
      endpoint: '/v1/rates',
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: req.body,
      ip: req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    }

    const response = await PublicApiService.processRequest(request)
    
    return res.status(response.success ? 200 : 400).json(response)
  } catch (error) {
    console.error('Public API rates error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      success: false
    })
  }
}