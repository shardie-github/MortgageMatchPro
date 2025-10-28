import { EventEmitter } from 'events'

// Resource types
export enum ResourceType {
  CPU = 'cpu',
  MEMORY = 'memory',
  NETWORK = 'network',
  DISK = 'disk',
  DATABASE = 'database',
  CACHE = 'cache'
}

// Resource status
export enum ResourceStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  OVERLOADED = 'overloaded',
  UNAVAILABLE = 'unavailable'
}

// Resource configuration
export interface ResourceConfig {
  type: ResourceType
  maxCapacity: number
  currentCapacity: number
  threshold: number
  priority: number
  cost: number
  dependencies: ResourceType[]
}

// Resource usage
export interface ResourceUsage {
  type: ResourceType
  used: number
  available: number
  percentage: number
  status: ResourceStatus
  lastUpdated: number
}

// Resource allocation
export interface ResourceAllocation {
  id: string
  type: ResourceType
  amount: number
  priority: number
  timestamp: number
  duration: number
  cost: number
}

// Resource manager
export class ResourceManager extends EventEmitter {
  private resources: Map<ResourceType, ResourceConfig> = new Map()
  private allocations: Map<string, ResourceAllocation> = new Map()
  private usage: Map<ResourceType, ResourceUsage> = new Map()
  private isMonitoring: boolean = false
  private monitoringInterval: NodeJS.Timeout | null = null

  constructor() {
    super()
    this.initializeDefaultResources()
  }

  // Initialize default resources
  private initializeDefaultResources(): void {
    const defaultResources: ResourceConfig[] = [
      {
        type: ResourceType.CPU,
        maxCapacity: 100, // 100%
        currentCapacity: 0,
        threshold: 80,
        priority: 1,
        cost: 0.01,
        dependencies: []
      },
      {
        type: ResourceType.MEMORY,
        maxCapacity: 1024 * 1024 * 1024, // 1 GB
        currentCapacity: 0,
        threshold: 80,
        priority: 2,
        cost: 0.001,
        dependencies: []
      },
      {
        type: ResourceType.NETWORK,
        maxCapacity: 1000, // 1000 requests/second
        currentCapacity: 0,
        threshold: 80,
        priority: 3,
        cost: 0.0001,
        dependencies: []
      },
      {
        type: ResourceType.DATABASE,
        maxCapacity: 100, // 100 connections
        currentCapacity: 0,
        threshold: 80,
        priority: 4,
        cost: 0.005,
        dependencies: [ResourceType.MEMORY, ResourceType.NETWORK]
      },
      {
        type: ResourceType.CACHE,
        maxCapacity: 100 * 1024 * 1024, // 100 MB
        currentCapacity: 0,
        threshold: 80,
        priority: 5,
        cost: 0.0005,
        dependencies: [ResourceType.MEMORY]
      }
    ]

    defaultResources.forEach(resource => {
      this.resources.set(resource.type, resource)
      this.updateUsage(resource.type)
    })
  }

  // Register a resource
  registerResource(config: ResourceConfig): void {
    this.resources.set(config.type, config)
    this.updateUsage(config.type)
    this.emit('resourceRegistered', config)
  }

  // Update resource usage
  private updateUsage(type: ResourceType): void {
    const config = this.resources.get(type)
    if (!config) {
      return
    }

    const used = config.currentCapacity
    const available = config.maxCapacity - used
    const percentage = (used / config.maxCapacity) * 100

    let status: ResourceStatus
    if (percentage >= 100) {
      status = ResourceStatus.UNAVAILABLE
    } else if (percentage >= config.threshold) {
      status = ResourceStatus.OVERLOADED
    } else if (used > 0) {
      status = ResourceStatus.BUSY
    } else {
      status = ResourceStatus.AVAILABLE
    }

    const usage: ResourceUsage = {
      type,
      used,
      available,
      percentage,
      status,
      lastUpdated: Date.now()
    }

    this.usage.set(type, usage)
    this.emit('usageUpdated', usage)
  }

  // Allocate resources
  allocateResources(
    type: ResourceType,
    amount: number,
    priority: number = 5,
    duration: number = 60000 // 1 minute
  ): string | null {
    const config = this.resources.get(type)
    if (!config) {
      throw new Error(`Resource type ${type} not found`)
    }

    // Check if enough resources are available
    if (config.currentCapacity + amount > config.maxCapacity) {
      return null
    }

    // Check dependencies
    for (const dependency of config.dependencies) {
      const depUsage = this.usage.get(dependency)
      if (!depUsage || depUsage.status === ResourceStatus.UNAVAILABLE) {
        return null
      }
    }

    // Create allocation
    const allocationId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const allocation: ResourceAllocation = {
      id: allocationId,
      type,
      amount,
      priority,
      timestamp: Date.now(),
      duration,
      cost: amount * config.cost
    }

    // Update resource capacity
    config.currentCapacity += amount
    this.resources.set(type, config)

    // Store allocation
    this.allocations.set(allocationId, allocation)

    // Update usage
    this.updateUsage(type)

    this.emit('resourceAllocated', allocation)
    return allocationId
  }

  // Release resources
  releaseResources(allocationId: string): boolean {
    const allocation = this.allocations.get(allocationId)
    if (!allocation) {
      return false
    }

    const config = this.resources.get(allocation.type)
    if (!config) {
      return false
    }

    // Update resource capacity
    config.currentCapacity = Math.max(0, config.currentCapacity - allocation.amount)
    this.resources.set(allocation.type, config)

    // Remove allocation
    this.allocations.delete(allocationId)

    // Update usage
    this.updateUsage(allocation.type)

    this.emit('resourceReleased', allocation)
    return true
  }

  // Get resource usage
  getUsage(type: ResourceType): ResourceUsage | null {
    return this.usage.get(type) || null
  }

  // Get all resource usage
  getAllUsage(): ResourceUsage[] {
    return Array.from(this.usage.values())
  }

  // Get available capacity
  getAvailableCapacity(type: ResourceType): number {
    const config = this.resources.get(type)
    if (!config) {
      return 0
    }
    return config.maxCapacity - config.currentCapacity
  }

  // Check if resources are available
  isResourceAvailable(type: ResourceType, amount: number): boolean {
    const config = this.resources.get(type)
    if (!config) {
      return false
    }
    return config.currentCapacity + amount <= config.maxCapacity
  }

  // Get resource recommendations
  getResourceRecommendations(): Array<{
    type: ResourceType
    recommendation: string
    priority: 'high' | 'medium' | 'low'
    potentialSavings: number
  }> {
    const recommendations: Array<{
      type: ResourceType
      recommendation: string
      priority: 'high' | 'medium' | 'low'
      potentialSavings: number
    }> = []

    for (const [type, usage] of this.usage.entries()) {
      const config = this.resources.get(type)
      if (!config) {
        continue
      }

      if (usage.status === ResourceStatus.OVERLOADED) {
        recommendations.push({
          type,
          recommendation: `Resource ${type} is overloaded (${usage.percentage.toFixed(1)}%). Consider scaling up or optimizing usage.`,
          priority: 'high',
          potentialSavings: config.cost * usage.used * 0.2
        })
      } else if (usage.percentage < 20) {
        recommendations.push({
          type,
          recommendation: `Resource ${type} is underutilized (${usage.percentage.toFixed(1)}%). Consider scaling down to reduce costs.`,
          priority: 'medium',
          potentialSavings: config.cost * (config.maxCapacity - usage.used) * 0.5
        })
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  // Start monitoring
  startMonitoring(interval: number = 5000): void {
    if (this.isMonitoring) {
      return
    }

    this.isMonitoring = true
    this.monitoringInterval = setInterval(() => {
      this.updateAllUsage()
    }, interval)

    this.emit('monitoringStarted')
  }

  // Stop monitoring
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return
    }

    this.isMonitoring = false
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    this.emit('monitoringStopped')
  }

  // Update all usage
  private updateAllUsage(): void {
    for (const type of this.resources.keys()) {
      this.updateUsage(type)
    }
  }

  // Cleanup expired allocations
  cleanupExpiredAllocations(): number {
    const now = Date.now()
    let cleaned = 0

    for (const [id, allocation] of this.allocations.entries()) {
      if (now - allocation.timestamp > allocation.duration) {
        this.releaseResources(id)
        cleaned++
      }
    }

    return cleaned
  }

  // Get resource statistics
  getStatistics(): {
    totalResources: number
    totalAllocations: number
    totalCost: number
    averageUtilization: number
    overloadedResources: number
  } {
    const totalResources = this.resources.size
    const totalAllocations = this.allocations.size
    const totalCost = Array.from(this.allocations.values())
      .reduce((sum, allocation) => sum + allocation.cost, 0)
    const averageUtilization = Array.from(this.usage.values())
      .reduce((sum, usage) => sum + usage.percentage, 0) / this.usage.size
    const overloadedResources = Array.from(this.usage.values())
      .filter(usage => usage.status === ResourceStatus.OVERLOADED).length

    return {
      totalResources,
      totalAllocations,
      totalCost,
      averageUtilization,
      overloadedResources
    }
  }

  // Close and cleanup
  async close(): Promise<void> {
    this.stopMonitoring()
    
    // Release all allocations
    for (const id of this.allocations.keys()) {
      this.releaseResources(id)
    }

    this.emit('closed')
  }
}

// Export default instance
export const resourceManager = new ResourceManager()