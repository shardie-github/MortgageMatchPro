import { NextApiRequest, NextApiResponse } from 'next'
import { createApiMarketplaceService } from '../../../../lib/integrations/api-marketplace'
import { z } from 'zod'

const GenerateKeySchema = z.object({
  keyName: z.string().min(1).max(100),
  tier: z.enum(['free', 'basic', 'pro', 'enterprise']),
  permissions: z.array(z.string()).default([]),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const data = GenerateKeySchema.parse(req.body)
    const userId = req.headers['x-user-id'] as string

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' })
    }

    const apiService = createApiMarketplaceService()
    const result = await apiService.generateApiKey({
      ...data,
      userId,
    })

    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }

    res.status(200).json({
      success: true,
      apiKey: result.apiKey,
      keyId: result.keyId,
    })
  } catch (error) {
    console.error('API key generation error:', error)
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    })
  }
}
