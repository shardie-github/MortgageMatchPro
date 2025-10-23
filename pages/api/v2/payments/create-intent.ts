import { NextApiRequest, NextApiResponse } from 'next'
import { createEmbeddedPaymentService } from '../../../../lib/integrations/embedded-payments'
import { z } from 'zod'

const CreateIntentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3),
  paymentType: z.enum(['commission', 'referral', 'api_usage', 'subscription', 'broker_fee']),
  provider: z.enum(['stripe', 'vopay', 'wise', 'stripe_connect']).default('stripe'),
  metadata: z.record(z.any()).optional(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const data = CreateIntentSchema.parse(req.body)
    const userId = req.headers['x-user-id'] as string

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' })
    }

    const paymentService = createEmbeddedPaymentService(data.provider)
    const result = await paymentService.createPaymentIntent({
      ...data,
      userId,
    })

    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }

    res.status(200).json({
      success: true,
      paymentIntent: result.paymentIntent,
      clientSecret: result.clientSecret,
    })
  } catch (error) {
    console.error('Payment intent creation error:', error)
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    })
  }
}
