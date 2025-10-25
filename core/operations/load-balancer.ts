/**
 * Regional Load Balancer and Auto-Scaling
 * Implements enterprise-scale load balancing with regional failover and auto-scaling
 */

import { supabaseAdmin } from '../supabase'
import { captureException, captureMessage } from '../monitoring'
import { sreMetrics } from './sre-metrics'

export interface Region {
  id: string
  name: string
  endpoint: string
  health_check_url: string
  priority: number
  is_active: boolean
  capacity: number
  current_load: number
  last_health_check: Date
  response_time: number
  error_rate: number
}

export interface LoadBalancerConfig {
  strategy: 'round_robin' | 'least_connections' | 'weighted_round_robin' | 'latency_based'
  health_check_interval: number
  health_check_timeout: number
  max_retries: number
  failover_threshold: number
  auto_scaling_enabled: boolean
  min_instances: number
  max_instances: number
  scale_up_threshold: number
  scale_down_threshold: number
}

export interface ScalingEvent {
  id: string
  region: string
  action: 'scale_up' | 'scale_down' | 'failover'
  reason: string
  instances_before: number
  instances_after: number
  timestamp: Date
  metrics: Record<string, any>
}

export class RegionalLoadBalancer {
  private regions: Map<string, Region> = new Map()
  private config: LoadBalancerConfig
  private healthCheckInterval: NodeJS.Timeout | null = null
  private currentRegionIndex: number = 0
  private regionStats: Map<string, { requests: number; errors: number; lastRequest: Date }> = new Map()

  constructor(config: LoadBalancerConfig) {
    this.config = config
    this.initializeRegions()
    this.startHealthChecks()
  }

  /**
   * Initialize regions from database
   */
  private async initializeRegions(): Promise<void> {
    try {
      const { data, error } = await supabaseAdmin
        .from('regions')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: true })

      if (error) throw error

      this.regions.clear()
      data?.forEach(region => {
        this.regions.set(region.id, {
          ...region,
          last_health_check: new Date(region.last_health_check),
        })
        this.regionStats.set(region.id, {
          requests: 0,
          errors: 0,
          lastRequest: new Date(),
        })
      })

      await captureMessage(`Initialized ${this.regions.size} regions for load balancing`, 'info')
    } catch (error) {
      captureException(error as Error, { context: 'initialize_regions' })
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks()
    }, this.config.health_check_interval)
  }

  /**
   * Perform health checks on all regions
   */
  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = Array.from(this.regions.values()).map(region => 
      this.checkRegionHealth(region)
    )

    await Promise.allSettled(healthCheckPromises)
  }

  /**
   * Check health of a specific region
   */
  private async checkRegionHealth(region: Region): Promise<void> {
    try {
      const startTime = Date.now()
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.config.health_check_timeout)

      const response = await fetch(region.health_check_url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'MortgageMatch-Pro-HealthCheck/1.0',
        },
      })

      clearTimeout(timeoutId)
      const responseTime = Date.now() - startTime
      const isHealthy = response.ok

      // Update region stats
      const regionData = this.regions.get(region.id)
      if (regionData) {
        regionData.last_health_check = new Date()
        regionData.response_time = responseTime
        regionData.is_active = isHealthy

        // Update error rate
        const stats = this.regionStats.get(region.id)
        if (stats) {
          stats.requests++
          if (!isHealthy) {
            stats.errors++
          }
          regionData.error_rate = (stats.errors / stats.requests) * 100
        }

        this.regions.set(region.id, regionData)
      }

      // Record metrics
      await sreMetrics.recordAvailability('load_balancer', isHealthy, 'health_check')
      await sreMetrics.recordApiLatency(
        region.health_check_url,
        'GET',
        responseTime,
        response.status,
        'load_balancer'
      )

      // Trigger failover if region becomes unhealthy
      if (!isHealthy && regionData?.is_active) {
        await this.handleRegionFailure(region.id)
      }

    } catch (error) {
      // Region is considered unhealthy
      const regionData = this.regions.get(region.id)
      if (regionData) {
        regionData.is_active = false
        regionData.last_health_check = new Date()
        this.regions.set(region.id, regionData)
      }

      await captureException(error as Error, { 
        context: 'region_health_check', 
        region: region.id 
      })
    }
  }

  /**
   * Handle region failure and trigger failover
   */
  private async handleRegionFailure(regionId: string): Promise<void> {
    const region = this.regions.get(regionId)
    if (!region) return

    region.is_active = false
    this.regions.set(regionId, region)

    await captureMessage(
      `Region ${region.name} (${regionId}) failed health check - triggering failover`,
      'warning',
      { regionId, region: region.name }
    )

    // Record failover event
    await this.recordScalingEvent({
      region: regionId,
      action: 'failover',
      reason: 'health_check_failure',
      instances_before: region.capacity,
      instances_after: 0,
      metrics: {
        response_time: region.response_time,
        error_rate: region.error_rate,
      },
    })
  }

  /**
   * Get the best region for a request
   */
  async getBestRegion(): Promise<Region | null> {
    const activeRegions = Array.from(this.regions.values())
      .filter(region => region.is_active)
      .sort((a, b) => a.priority - b.priority)

    if (activeRegions.length === 0) {
      await captureMessage('No active regions available', 'error')
      return null
    }

    switch (this.config.strategy) {
      case 'round_robin':
        return this.getRoundRobinRegion(activeRegions)
      case 'least_connections':
        return this.getLeastConnectionsRegion(activeRegions)
      case 'weighted_round_robin':
        return this.getWeightedRoundRobinRegion(activeRegions)
      case 'latency_based':
        return this.getLatencyBasedRegion(activeRegions)
      default:
        return activeRegions[0]
    }
  }

  /**
   * Round robin region selection
   */
  private getRoundRobinRegion(regions: Region[]): Region {
    const region = regions[this.currentRegionIndex % regions.length]
    this.currentRegionIndex = (this.currentRegionIndex + 1) % regions.length
    return region
  }

  /**
   * Least connections region selection
   */
  private getLeastConnectionsRegion(regions: Region[]): Region {
    return regions.reduce((least, current) => 
      current.current_load < least.current_load ? current : least
    )
  }

  /**
   * Weighted round robin region selection
   */
  private getWeightedRoundRobinRegion(regions: Region[]): Region {
    // Simple weighted selection based on capacity
    const totalWeight = regions.reduce((sum, region) => sum + region.capacity, 0)
    let random = Math.random() * totalWeight

    for (const region of regions) {
      random -= region.capacity
      if (random <= 0) {
        return region
      }
    }

    return regions[0]
  }

  /**
   * Latency-based region selection
   */
  private getLatencyBasedRegion(regions: Region[]): Region {
    return regions.reduce((fastest, current) => 
      current.response_time < fastest.response_time ? current : fastest
    )
  }

  /**
   * Route request to appropriate region
   */
  async routeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const region = await this.getBestRegion()
    if (!region) {
      throw new Error('No available regions for request routing')
    }

    const url = `${region.endpoint}${endpoint}`
    const startTime = Date.now()

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'X-Region': region.id,
          'X-Request-ID': this.generateRequestId(),
          ...options.headers,
        },
      })

      const duration = Date.now() - startTime

      // Update region load
      region.current_load++
      this.regions.set(region.id, region)

      // Record metrics
      await sreMetrics.recordApiLatency(endpoint, options.method || 'GET', duration, response.status, 'api')
      await sreMetrics.recordThroughput('api', 1, endpoint)

      // Update region stats
      const stats = this.regionStats.get(region.id)
      if (stats) {
        stats.requests++
        stats.lastRequest = new Date()
        if (!response.ok) {
          stats.errors++
        }
      }

      return response
    } catch (error) {
      const duration = Date.now() - startTime
      
      // Record error metrics
      await sreMetrics.recordApiLatency(endpoint, options.method || 'GET', duration, 0, 'api')
      await sreMetrics.recordErrorRate('api', 1, 1)

      // Update region stats
      const stats = this.regionStats.get(region.id)
      if (stats) {
        stats.requests++
        stats.errors++
        stats.lastRequest = new Date()
      }

      // Check if region should be marked as unhealthy
      if (stats && stats.requests > 10 && (stats.errors / stats.requests) > this.config.failover_threshold) {
        await this.handleRegionFailure(region.id)
      }

      throw error
    }
  }

  /**
   * Auto-scaling logic
   */
  async checkAutoScaling(): Promise<void> {
    if (!this.config.auto_scaling_enabled) return

    for (const [regionId, region] of this.regions) {
      if (!region.is_active) continue

      const stats = this.regionStats.get(regionId)
      if (!stats) continue

      const loadPercentage = (region.current_load / region.capacity) * 100

      // Scale up if load is too high
      if (loadPercentage > this.config.scale_up_threshold && region.capacity < this.config.max_instances) {
        await this.scaleRegion(regionId, 'scale_up')
      }
      // Scale down if load is too low
      else if (loadPercentage < this.config.scale_down_threshold && region.capacity > this.config.min_instances) {
        await this.scaleRegion(regionId, 'scale_down')
      }
    }
  }

  /**
   * Scale a region up or down
   */
  private async scaleRegion(regionId: string, action: 'scale_up' | 'scale_down'): Promise<void> {
    const region = this.regions.get(regionId)
    if (!region) return

    const instancesBefore = region.capacity
    const instancesAfter = action === 'scale_up' 
      ? Math.min(region.capacity + 1, this.config.max_instances)
      : Math.max(region.capacity - 1, this.config.min_instances)

    if (instancesAfter === instancesBefore) return

    region.capacity = instancesAfter
    this.regions.set(regionId, region)

    await this.recordScalingEvent({
      region: regionId,
      action,
      reason: `load_percentage_${action === 'scale_up' ? 'high' : 'low'}`,
      instances_before: instancesBefore,
      instances_after: instancesAfter,
      metrics: {
        current_load: region.current_load,
        load_percentage: (region.current_load / instancesBefore) * 100,
      },
    })

    await captureMessage(
      `Scaling ${action} region ${region.name}: ${instancesBefore} → ${instancesAfter} instances`,
      'info',
      { regionId, action, instancesBefore, instancesAfter }
    )
  }

  /**
   * Record scaling event
   */
  private async recordScalingEvent(event: Omit<ScalingEvent, 'id' | 'timestamp'>): Promise<void> {
    try {
      await supabaseAdmin
        .from('scaling_events')
        .insert({
          ...event,
          id: this.generateRequestId(),
          timestamp: new Date().toISOString(),
        })
    } catch (error) {
      captureException(error as Error, { context: 'record_scaling_event', event })
    }
  }

  /**
   * Get load balancer status
   */
  getStatus(): {
    regions: Region[]
    config: LoadBalancerConfig
    total_requests: number
    total_errors: number
    active_regions: number
  } {
    const regions = Array.from(this.regions.values())
    const totalRequests = Array.from(this.regionStats.values()).reduce((sum, stats) => sum + stats.requests, 0)
    const totalErrors = Array.from(this.regionStats.values()).reduce((sum, stats) => sum + stats.errors, 0)
    const activeRegions = regions.filter(region => region.is_active).length

    return {
      regions,
      config: this.config,
      total_requests: totalRequests,
      total_errors: totalErrors,
      active_regions: activeRegions,
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
  }
}

// Default load balancer configuration
const defaultConfig: LoadBalancerConfig = {
  strategy: 'latency_based',
  health_check_interval: 30000, // 30 seconds
  health_check_timeout: 5000, // 5 seconds
  max_retries: 3,
  failover_threshold: 0.1, // 10% error rate
  auto_scaling_enabled: true,
  min_instances: 2,
  max_instances: 10,
  scale_up_threshold: 80, // 80% capacity
  scale_down_threshold: 20, // 20% capacity
}

// Initialize global load balancer
export const loadBalancer = new RegionalLoadBalancer(defaultConfig)

// Start auto-scaling checks every 2 minutes
setInterval(() => {
  loadBalancer.checkAutoScaling()
}, 2 * 60 * 1000)

// Export utility functions
export const routeRequest = loadBalancer.routeRequest.bind(loadBalancer)
export const getBestRegion = loadBalancer.getBestRegion.bind(loadBalancer)
export const getLoadBalancerStatus = loadBalancer.getStatus.bind(loadBalancer)