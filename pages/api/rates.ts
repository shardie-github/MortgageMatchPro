import { NextApiRequest, NextApiResponse } from 'next'
import { RateIntelligenceAgent } from '@/lib/openai'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from 'redis'
import { 
  withSecurity, 
  withRateLimit, 
  logAuditEvent,
  handleError
} from '@/lib/security'
import { analytics, errorTracking } from '@/lib/monitoring'
import { z } from 'zod'

const RateQuerySchema = z.object({
  country: z.enum(['CA', 'US']),
  termYears: z.string().transform(Number).pipe(z.number().min(1).max(50)),
  rateType: z.enum(['fixed', 'variable']),
  propertyPrice: z.string().transform(Number).pipe(z.number().min(10000).max(50000000)),
  downPayment: z.string().transform(Number).pipe(z.number().min(0).max(10000000)),
  userId: z.string().optional(),
})

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
})

redis.on('error', (err) => console.log('Redis Client Error', err))
redis.connect()

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Validate query parameters
    const validationResult = RateQuerySchema.safeParse(req.query)
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid query parameters',
        details: validationResult.error.errors
      })
    }

    const { country, termYears, rateType, propertyPrice, downPayment, userId } = validationResult.data

    // Log the rate check request
    if (userId) {
      await logAuditEvent('rate_check', userId, {
        country,
        termYears,
        rateType,
        propertyPrice: Math.floor(propertyPrice / 50000) * 50000, // Round for privacy
        downPayment: Math.floor(downPayment / 10000) * 10000, // Round for privacy
      })
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

    // Track analytics
    analytics.trackRateCheck({
      country,
      termYears,
      rateType,
      ratesCount: rates.length,
    })

    // Save rate check to database if userId provided
    if (userId) {
      const { error } = await supabaseAdmin
        .from('rate_checks')
        .insert({
          user_id: userId,
          country,
          term_years: termYears,
          rate_type: rateType,
          rates: JSON.stringify(rates),
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
          ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          user_agent: req.headers['user-agent'],
          session_id: req.headers['x-session-id'],
        })

      if (error) {
        errorTracking.captureException(new Error('Database save failed'), {
          context: 'rate_check',
          userId,
          error: error.message,
        })
        // Don't fail the request if database save fails
      }
    }

    res.status(200).json({
      rates,
      cached: false,
      lastUpdated: new Date().toISOString()
    })
  } catch (error) {
    errorTracking.captureException(error as Error, {
      context: 'rate_check',
      userId: req.query.userId as string,
    })
    handleError(res, error as Error, 'rate_check')
  }
}

export default withSecurity(
  withRateLimit('rates')(handler)
)