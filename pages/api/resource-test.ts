import { NextApiRequest, NextApiResponse } from 'next'
import { ResourceManager, ResourceType } from '../../lib/optimization/resource-manager'

// Initialize resource manager
const resourceManager = new ResourceManager()

// Start monitoring
resourceManager.startMonitoring(5000) // Update every 5 seconds

// Test endpoint
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const action = req.query.action as string || 'status'

    switch (action) {
      case 'status':
        // Get current resource status
        const allUsage = resourceManager.getAllUsage()
        const statistics = resourceManager.getStatistics()
        const recommendations = resourceManager.getResourceRecommendations()

        res.status(200).json({
          message: 'Resource status retrieved',
          usage: allUsage,
          statistics,
          recommendations
        })
        break

      case 'allocate':
        // Allocate resources
        const resourceType = req.query.type as ResourceType || ResourceType.MEMORY
        const amount = parseInt(req.query.amount as string) || 100
        const priority = parseInt(req.query.priority as string) || 5
        const duration = parseInt(req.query.duration as string) || 60000

        const allocationId = resourceManager.allocateResources(
          resourceType,
          amount,
          priority,
          duration
        )

        if (!allocationId) {
          return res.status(400).json({
            error: 'Failed to allocate resources',
            reason: 'Insufficient capacity or dependencies unavailable'
          })
        }

        res.status(200).json({
          message: 'Resources allocated successfully',
          allocationId,
          resourceType,
          amount,
          priority,
          duration
        })
        break

      case 'release':
        // Release resources
        const allocationIdToRelease = req.query.allocationId as string
        if (!allocationIdToRelease) {
          return res.status(400).json({ error: 'Allocation ID is required' })
        }

        const released = resourceManager.releaseResources(allocationIdToRelease)
        if (!released) {
          return res.status(400).json({
            error: 'Failed to release resources',
            reason: 'Allocation not found'
          })
        }

        res.status(200).json({
          message: 'Resources released successfully',
          allocationId: allocationIdToRelease
        })
        break

      case 'cleanup':
        // Cleanup expired allocations
        const cleaned = resourceManager.cleanupExpiredAllocations()
        res.status(200).json({
          message: 'Expired allocations cleaned up',
          cleaned
        })
        break

      default:
        res.status(400).json({ error: 'Invalid action' })
    }
  } catch (error) {
    console.error('Resource test error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}