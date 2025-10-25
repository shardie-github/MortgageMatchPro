/**
 * Health Check API Endpoint
 * Returns system health status and metrics
 */

import { NextApiRequest, NextApiResponse } from 'next'
import { healthCheckHandler } from '../../lib/health-check'

export default healthCheckHandler
