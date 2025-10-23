import { NextApiRequest, NextApiResponse } from 'next'
import { RefinanceAgent } from '@/lib/agents/refinance-agent'
import { supabaseAdmin } from '@/lib/supabase'

const refinanceAgent = new RefinanceAgent()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { userId } = req.query

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' })
      }

      const opportunities = await refinanceAgent.getRefinanceWatchlist(userId as string)

      res.status(200).json({ opportunities })
    } catch (error) {
      console.error('Error fetching refinance watchlist:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  } else if (req.method === 'POST') {
    try {
      // Generate new watchlist for all users
      const opportunities = await refinanceAgent.generateRefinanceWatchlist()

      res.status(200).json({ 
        message: 'Refinance watchlist generated successfully',
        count: opportunities.length 
      })
    } catch (error) {
      console.error('Error generating refinance watchlist:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}