import { NextApiRequest, NextApiResponse } from 'next'
import { createOpenBankingService } from '../../../../lib/integrations/open-banking'
import { z } from 'zod'

const ConnectRequestSchema = z.object({
  provider: z.enum(['plaid', 'flinks', 'yodlee', 'truelayer']),
  institutionId: z.string().optional(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { provider, institutionId } = ConnectRequestSchema.parse(req.body)
    const userId = req.headers['x-user-id'] as string

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' })
    }

    const openBankingService = createOpenBankingService(provider)
    const result = await openBankingService.createConnectionLink(userId, institutionId)

    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }

    res.status(200).json({
      success: true,
      linkToken: result.linkToken,
      linkUrl: result.linkUrl,
    })
  } catch (error) {
    console.error('Open banking connect error:', error)
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    })
  }
}
