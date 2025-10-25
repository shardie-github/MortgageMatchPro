import { NextApiRequest, NextApiResponse } from 'next'
import { PerformanceMonitor } from '../../lib/optimization/performance-monitor'
import { createPerformanceMonitoringMiddleware } from '../../lib/optimization/performance-monitor'

// Initialize performance monitor
const performanceMonitor = new PerformanceMonitor({
  maxDuration: 5000, // 5 seconds
  maxMemoryUsage: 100 * 1024 * 1024, // 100 MB
  maxCpuUsage: 80, // 80%
  maxRequestSize: 10 * 1024 * 1024, // 10 MB
  maxResponseSize: 10 * 1024 * 1024 // 10 MB
})

// Start monitoring
performanceMonitor.startMonitoring()

// Create performance monitoring middleware
const performanceMiddleware = createPerformanceMonitoringMiddleware(
  performanceMonitor,
  (req) => req.route?.path || req.path
)

// Test endpoint
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Apply performance monitoring middleware
    performanceMiddleware(req, res, () => {})

    // Simulate some work to test performance monitoring
    const workDuration = parseInt(req.query.duration as string) || 1000
    const memoryIntensive = req.query.memory === 'true'
    const cpuIntensive = req.query.cpu === 'true'

    // Simulate work
    if (memoryIntensive) {
      // Allocate some memory
      const largeArray = new Array(1000000).fill(0).map((_, i) => i)
      // Do something with it
      const sum = largeArray.reduce((a, b) => a + b, 0)
    }

    if (cpuIntensive) {
      // Simulate CPU-intensive work
      const start = Date.now()
      while (Date.now() - start < workDuration) {
        // Busy wait
      }
    } else {
      // Simulate async work
      await new Promise(resolve => setTimeout(resolve, workDuration))
    }

    // Get performance statistics
    const stats = performanceMonitor.getStatistics()
    const slowestEndpoints = performanceMonitor.getSlowestEndpoints(5)
    const memoryTrends = performanceMonitor.getMemoryUsageTrends().slice(-10) // Last 10 measurements

    // Add performance headers
    res.setHeader('X-Performance-Duration', workDuration)
    res.setHeader('X-Performance-Memory-Used', process.memoryUsage().heapUsed)
    res.setHeader('X-Performance-CPU-Usage', process.cpuUsage().user)

    // Return success response
    res.status(200).json({
      message: 'Performance test successful',
      workDuration,
      memoryIntensive,
      cpuIntensive,
      performance: {
        current: {
          duration: workDuration,
          memoryUsed: process.memoryUsage().heapUsed,
          cpuUsage: process.cpuUsage().user
        },
        statistics: stats,
        slowestEndpoints,
        memoryTrends
      }
    })
  } catch (error) {
    console.error('Performance test error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}