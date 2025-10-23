import { NextApiRequest, NextApiResponse } from 'next'
import { RateIntelligenceAgent } from '@/lib/openai'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from 'redis'

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
})

redis.on('error', (err) => console.log('Redis Client Error', err))
redis.connect()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { country, termYears, rateType, propertyPrice, downPayment, userId } = req.query

    // Validate required fields
    if (!country || !termYears || !rateType || !propertyPrice || !downPayment) {
      return res.status(400).json({ error: 'Missing required query parameters' })
    }

    // Create cache key
    const cacheKey = `rates:${country}:${termYears}:${rateType}:${propertyPrice}:${downPayment}`
    
    // Try to get from cache first
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        const cachedData = JSON.parse(cached)
        return res.status(200).json({
          rates: cachedData,
          cached: true,
          lastUpdated: new Date().toISOString()
        })
      }
    } catch (cacheError) {
      console.warn('Cache read error:', cacheError)
    }

    // Fetch fresh rates using AI agent
    const agent = new RateIntelligenceAgent()
    const rates = await agent.fetchRates({
      country: country as 'CA' | 'US',
      termYears: parseInt(termYears as string),
      rateType: rateType as 'fixed' | 'variable',
      propertyPrice: parseFloat(propertyPrice as string),
      downPayment: parseFloat(downPayment as string),
    })

    // Cache the results for 1 hour
    try {
      await redis.setEx(cacheKey, 3600, JSON.stringify(rates))
    } catch (cacheError) {
      console.warn('Cache write error:', cacheError)
    }

    // Save rate check to database if userId provided
    if (userId) {
      const { error } = await supabaseAdmin
        .from('rate_checks')
        .insert({
          user_id: userId as string,
          country: country as 'CA' | 'US',
          term_years: parseInt(termYears as string),
          rate_type: rateType as 'fixed' | 'variable',
          rates: JSON.stringify(rates),
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
        })

      if (error) {
        console.error('Database error:', error)
        // Don't fail the request if database save fails
      }
    }

    res.status(200).json({
      rates,
      cached: false,
      lastUpdated: new Date().toISOString()
    })
  } catch (error) {
    console.error('Rate fetching error:', error)
    res.status(500).json({ 
      error: 'Failed to fetch rates',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}