import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { userId } = req.query

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' })
      }

      const { data: alerts, error } = await supabaseAdmin
        .from('prediction_alerts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      res.status(200).json({ alerts: alerts || [] })
    } catch (error) {
      console.error('Error fetching prediction alerts:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  } else if (req.method === 'PATCH') {
    try {
      const { alertId } = req.query
      const { isRead } = req.body

      if (!alertId) {
        return res.status(400).json({ error: 'Alert ID is required' })
      }

      const { error } = await supabaseAdmin
        .from('prediction_alerts')
        .update({ is_read: isRead })
        .eq('id', alertId)

      if (error) {
        throw error
      }

      res.status(200).json({ message: 'Alert updated successfully' })
    } catch (error) {
      console.error('Error updating prediction alert:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}