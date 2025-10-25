/**
 * Feedback API Endpoint
 * Handles user feedback submission
 */

import { NextApiRequest, NextApiResponse } from 'next'
import { submitFeedback } from '../../lib/feedback-system'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, type, sentiment, rating, comment, context } = req.body

    // Validate required fields
    if (!userId || !type || !sentiment || !rating) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, type, sentiment, rating' 
      })
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        error: 'Rating must be between 1 and 5' 
      })
    }

    // Submit feedback
    const feedbackId = await submitFeedback(
      userId,
      type,
      sentiment,
      rating,
      comment,
      context
    )

    res.status(200).json({ 
      success: true, 
      feedbackId,
      message: 'Feedback submitted successfully' 
    })
  } catch (error) {
    console.error('Feedback submission error:', error)
    res.status(500).json({ 
      error: 'Failed to submit feedback',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
