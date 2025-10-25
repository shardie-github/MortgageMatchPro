/**
 * Health Check & Reliability System
 * Provides uptime monitoring, self-checks, and error recovery
 */

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  version: string
  buildHash: string
  checks: HealthCheck[]
  dependencies: DependencyStatus[]
  metrics: SystemMetrics
}

export interface HealthCheck {
  name: string
  status: 'pass' | 'fail' | 'warn'
  message: string
  duration: number
  timestamp: string
}

export interface DependencyStatus {
  name: string
  status: 'up' | 'down' | 'degraded'
  responseTime: number
  lastChecked: string
  error?: string
}

export interface SystemMetrics {
  memoryUsage: number
  cpuUsage: number
  diskUsage: number
  activeConnections: number
  requestRate: number
  errorRate: number
}

export interface ErrorBudget {
  totalRequests: number
  failedRequests: number
  errorRate: number
  budget: number
  remaining: number
  status: 'healthy' | 'warning' | 'critical'
}

class HealthCheckSystem {
  private startTime: Date = new Date()
  private healthChecks: Map<string, () => Promise<HealthCheck>> = new Map()
  private dependencies: Map<string, DependencyStatus> = new Map()
  private errorBudget: ErrorBudget = {
    totalRequests: 0,
    failedRequests: 0,
    errorRate: 0,
    budget: 0.01, // 1% error budget
    remaining: 0.01,
    status: 'healthy',
  }

  constructor() {
    this.initializeHealthChecks()
    this.initializeDependencies()
  }

  // Health check management
  addHealthCheck(name: string, checkFn: () => Promise<HealthCheck>): void {
    this.healthChecks.set(name, checkFn)
  }

  async runHealthChecks(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = []
    
    for (const [name, checkFn] of this.healthChecks) {
      try {
        const startTime = Date.now()
        const check = await checkFn()
        check.duration = Date.now() - startTime
        check.timestamp = new Date().toISOString()
        checks.push(check)
      } catch (error) {
        checks.push({
          name,
          status: 'fail',
          message: `Health check failed: ${error}`,
          duration: 0,
          timestamp: new Date().toISOString(),
        })
      }
    }

    return checks
  }

  // System health status
  async getHealthStatus(): Promise<HealthStatus> {
    const checks = await this.runHealthChecks()
    const dependencies = await this.checkDependencies()
    const metrics = await this.getSystemMetrics()

    const overallStatus = this.determineOverallStatus(checks, dependencies)
    const uptime = Date.now() - this.startTime.getTime()

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime,
      version: process.env.npm_package_version || '1.0.0',
      buildHash: process.env.BUILD_HASH || 'unknown',
      checks,
      dependencies,
      metrics,
    }
  }

  // Dependency monitoring
  async checkDependencies(): Promise<DependencyStatus[]> {
    const dependencyChecks: Promise<DependencyStatus>[] = []

    // Check database
    dependencyChecks.push(this.checkDatabase())
    
    // Check external APIs
    dependencyChecks.push(this.checkOpenAI())
    dependencyChecks.push(this.checkSupabase())
    
    // Check internal services
    dependencyChecks.push(this.checkAnalytics())
    dependencyChecks.push(this.checkBilling())

    const results = await Promise.allSettled(dependencyChecks)
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return {
          name: `dependency_${index}`,
          status: 'down',
          responseTime: 0,
          lastChecked: new Date().toISOString(),
          error: result.reason?.message || 'Unknown error',
        }
      }
    })
  }

  private async checkDatabase(): Promise<DependencyStatus> {
    const startTime = Date.now()
    try {
      // In a real implementation, this would check the actual database
      // For now, we'll simulate a check
      await new Promise(resolve => setTimeout(resolve, 10))
      
      return {
        name: 'database',
        status: 'up',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
      }
    } catch (error) {
      return {
        name: 'database',
        status: 'down',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  private async checkOpenAI(): Promise<DependencyStatus> {
    const startTime = Date.now()
    try {
      // Simulate OpenAI API check
      await new Promise(resolve => setTimeout(resolve, 50))
      
      return {
        name: 'openai',
        status: 'up',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
      }
    } catch (error) {
      return {
        name: 'openai',
        status: 'down',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  private async checkSupabase(): Promise<DependencyStatus> {
    const startTime = Date.now()
    try {
      // Simulate Supabase check
      await new Promise(resolve => setTimeout(resolve, 30))
      
      return {
        name: 'supabase',
        status: 'up',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
      }
    } catch (error) {
      return {
        name: 'supabase',
        status: 'down',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  private async checkAnalytics(): Promise<DependencyStatus> {
    const startTime = Date.now()
    try {
      // Simulate analytics service check
      await new Promise(resolve => setTimeout(resolve, 20))
      
      return {
        name: 'analytics',
        status: 'up',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
      }
    } catch (error) {
      return {
        name: 'analytics',
        status: 'down',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  private async checkBilling(): Promise<DependencyStatus> {
    const startTime = Date.now()
    try {
      // Simulate billing service check
      await new Promise(resolve => setTimeout(resolve, 15))
      
      return {
        name: 'billing',
        status: 'up',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
      }
    } catch (error) {
      return {
        name: 'billing',
        status: 'down',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // System metrics
  async getSystemMetrics(): Promise<SystemMetrics> {
    // In a real implementation, these would be actual system metrics
    return {
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      cpuUsage: 0, // Would need actual CPU monitoring
      diskUsage: 0, // Would need actual disk monitoring
      activeConnections: 0, // Would need actual connection tracking
      requestRate: 0, // Would need actual request rate tracking
      errorRate: this.errorBudget.errorRate,
    }
  }

  // Error budget management
  recordRequest(success: boolean): void {
    this.errorBudget.totalRequests++
    if (!success) {
      this.errorBudget.failedRequests++
    }
    
    this.errorBudget.errorRate = this.errorBudget.failedRequests / this.errorBudget.totalRequests
    this.errorBudget.remaining = this.errorBudget.budget - this.errorBudget.errorRate
    
    // Update status based on error budget
    if (this.errorBudget.remaining <= 0) {
      this.errorBudget.status = 'critical'
    } else if (this.errorBudget.remaining < this.errorBudget.budget * 0.5) {
      this.errorBudget.status = 'warning'
    } else {
      this.errorBudget.status = 'healthy'
    }
  }

  getErrorBudget(): ErrorBudget {
    return { ...this.errorBudget }
  }

  // Auto-recovery
  async attemptRecovery(): Promise<boolean> {
    console.log('Attempting system recovery...')
    
    try {
      // Check if we can recover from current state
      const healthStatus = await this.getHealthStatus()
      
      if (healthStatus.status === 'unhealthy') {
        // Try to restart critical services
        await this.restartCriticalServices()
        return true
      }
      
      return false
    } catch (error) {
      console.error('Recovery attempt failed:', error)
      return false
    }
  }

  private async restartCriticalServices(): Promise<void> {
    // In a real implementation, this would restart actual services
    console.log('Restarting critical services...')
    
    // Simulate service restart
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log('Critical services restarted')
  }

  // Utility methods
  private determineOverallStatus(checks: HealthCheck[], dependencies: DependencyStatus[]): 'healthy' | 'degraded' | 'unhealthy' {
    const failedChecks = checks.filter(c => c.status === 'fail').length
    const failedDependencies = dependencies.filter(d => d.status === 'down').length
    
    if (failedChecks > 0 || failedDependencies > 0) {
      return 'unhealthy'
    }
    
    const warningChecks = checks.filter(c => c.status === 'warn').length
    const degradedDependencies = dependencies.filter(d => d.status === 'degraded').length
    
    if (warningChecks > 0 || degradedDependencies > 0) {
      return 'degraded'
    }
    
    return 'healthy'
  }

  private initializeHealthChecks(): void {
    // Basic health checks
    this.addHealthCheck('memory', async () => {
      const memUsage = process.memoryUsage()
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024
      
      if (heapUsedMB > 500) {
        return {
          name: 'memory',
          status: 'warn',
          message: `High memory usage: ${heapUsedMB.toFixed(2)}MB`,
          duration: 0,
          timestamp: new Date().toISOString(),
        }
      }
      
      return {
        name: 'memory',
        status: 'pass',
        message: `Memory usage: ${heapUsedMB.toFixed(2)}MB`,
        duration: 0,
        timestamp: new Date().toISOString(),
      }
    })

    this.addHealthCheck('uptime', async () => {
      const uptime = Date.now() - this.startTime.getTime()
      const uptimeHours = uptime / (1000 * 60 * 60)
      
      return {
        name: 'uptime',
        status: 'pass',
        message: `Uptime: ${uptimeHours.toFixed(2)} hours`,
        duration: 0,
        timestamp: new Date().toISOString(),
      }
    })
  }

  private initializeDependencies(): void {
    // Initialize dependency status
    this.dependencies.set('database', {
      name: 'database',
      status: 'up',
      responseTime: 0,
      lastChecked: new Date().toISOString(),
    })
  }
}

// Global health check instance
let healthCheckInstance: HealthCheckSystem | null = null

export const initHealthCheck = (): HealthCheckSystem => {
  if (!healthCheckInstance) {
    healthCheckInstance = new HealthCheckSystem()
  }
  return healthCheckInstance
}

export const getHealthCheck = (): HealthCheckSystem => {
  if (!healthCheckInstance) {
    throw new Error('Health check not initialized. Call initHealthCheck() first.')
  }
  return healthCheckInstance
}

// Convenience functions
export const getHealthStatus = async (): Promise<HealthStatus> => {
  return getHealthCheck().getHealthStatus()
}

export const recordRequest = (success: boolean): void => {
  getHealthCheck().recordRequest(success)
}

export const getErrorBudget = (): ErrorBudget => {
  return getHealthCheck().getErrorBudget()
}

export const attemptRecovery = async (): Promise<boolean> => {
  return getHealthCheck().attemptRecovery()
}

// Health check endpoint handler
export const healthCheckHandler = async (req: any, res: any): Promise<void> => {
  try {
    const healthStatus = await getHealthStatus()
    
    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503
    
    res.status(statusCode).json(healthStatus)
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

export default HealthCheckSystem
