import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: { status: 'unknown', latency: 0, error: null },
      redis: { status: 'unknown', latency: 0, error: null }
    },
    uptime: process.uptime(),
    memory: {
      used: process.memoryUsage().heapUsed,
      total: process.memoryUsage().heapTotal,
      external: process.memoryUsage().external
    }
  };

  // Check database connection
  try {
    const dbStart = Date.now();
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    const dbLatency = Date.now() - dbStart;
    
    if (error) {
      health.checks.database = {
        status: 'unhealthy',
        latency: dbLatency,
        error: error.message
      };
      health.status = 'degraded';
    } else {
      health.checks.database = {
        status: 'healthy',
        latency: dbLatency,
        error: null
      };
    }
  } catch (error) {
    health.checks.database = {
      status: 'unhealthy',
      latency: 0,
      error: error.message
    };
    health.status = 'degraded';
  }

  // Check Redis connection (if available)
  try {
    const Redis = require('ioredis');
    const redis = new Redis(process.env.REDIS_URL);
    
    const redisStart = Date.now();
    await redis.ping();
    const redisLatency = Date.now() - redisStart;
    
    health.checks.redis = {
      status: 'healthy',
      latency: redisLatency,
      error: null
    };
    
    await redis.disconnect();
  } catch (error) {
    health.checks.redis = {
      status: 'unhealthy',
      latency: 0,
      error: error.message
    };
    // Don't mark as degraded if Redis is optional
  }

  const totalLatency = Date.now() - startTime;
  health.latency = totalLatency;

  // Set appropriate status code
  const statusCode = health.status === 'healthy' ? 200 : 503;

  res.status(statusCode).json(health);
}