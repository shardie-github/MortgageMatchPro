import * as Sentry from '@sentry/nextjs'
import { supabaseAdmin } from './supabase'
import { errorTracking } from './monitoring'

export interface AlertConfig {
  name: string
  condition: (data: any) => boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  channels: ('email' | 'sms' | 'slack' | 'webhook')[]
  cooldownMinutes: number
}

export class AlertManager {
  private alerts: Map<string, AlertConfig> = new Map()
  private lastTriggered: Map<string, number> = new Map()

  constructor() {
    this.initializeDefaultAlerts()
  }

  private initializeDefaultAlerts() {
    // High error rate alert
    this.addAlert({
      name: 'high_error_rate',
      condition: (data) => data.errorRate > 0.05, // 5% error rate
      severity: 'high',
      message: 'High error rate detected: {errorRate}%',
      channels: ['email', 'slack'],
      cooldownMinutes: 30,
    })

    // API rate limit exceeded
    this.addAlert({
      name: 'rate_limit_exceeded',
      condition: (data) => data.rateLimitExceeded > 10,
      severity: 'medium',
      message: 'Rate limit exceeded {count} times in the last hour',
      channels: ['email'],
      cooldownMinutes: 60,
    })

    // Database connection issues
    this.addAlert({
      name: 'database_connection_issues',
      condition: (data) => data.dbConnectionErrors > 5,
      severity: 'critical',
      message: 'Database connection issues detected: {count} errors',
      channels: ['email', 'sms', 'slack'],
      cooldownMinutes: 15,
    })

    // Payment processing failures
    this.addAlert({
      name: 'payment_processing_failures',
      condition: (data) => data.paymentFailures > 3,
      severity: 'high',
      message: 'Payment processing failures: {count} failed payments',
      channels: ['email', 'slack'],
      cooldownMinutes: 30,
    })

    // Unusual API usage patterns
    this.addAlert({
      name: 'unusual_api_usage',
      condition: (data) => data.apiRequests > 1000, // 1000 requests in 1 hour
      severity: 'medium',
      message: 'Unusual API usage detected: {count} requests in the last hour',
      channels: ['email'],
      cooldownMinutes: 60,
    })

    // OpenAI API quota exceeded
    this.addAlert({
      name: 'openai_quota_exceeded',
      condition: (data) => data.openaiQuotaExceeded,
      severity: 'critical',
      message: 'OpenAI API quota exceeded',
      channels: ['email', 'sms', 'slack'],
      cooldownMinutes: 15,
    })

    // Memory usage high
    this.addAlert({
      name: 'high_memory_usage',
      condition: (data) => data.memoryUsage > 0.9, // 90% memory usage
      severity: 'high',
      message: 'High memory usage detected: {memoryUsage}%',
      channels: ['email', 'slack'],
      cooldownMinutes: 30,
    })

    // Disk space low
    this.addAlert({
      name: 'low_disk_space',
      condition: (data) => data.diskSpace < 0.1, // Less than 10% disk space
      severity: 'critical',
      message: 'Low disk space warning: {diskSpace}% remaining',
      channels: ['email', 'sms', 'slack'],
      cooldownMinutes: 15,
    })
  }

  addAlert(config: AlertConfig) {
    this.alerts.set(config.name, config)
  }

  async checkAlerts(data: any) {
    for (const [name, alert] of this.alerts) {
      try {
        if (alert.condition(data)) {
          await this.triggerAlert(name, alert, data)
        }
      } catch (error) {
        errorTracking.captureException(error as Error, {
          context: 'alert_check',
          alertName: name,
        })
      }
    }
  }

  private async triggerAlert(name: string, alert: AlertConfig, data: any) {
    const now = Date.now()
    const lastTriggered = this.lastTriggered.get(name) || 0
    const cooldownMs = alert.cooldownMinutes * 60 * 1000

    if (now - lastTriggered < cooldownMs) {
      return // Still in cooldown period
    }

    this.lastTriggered.set(name, now)

    // Log the alert
    await this.logAlert(name, alert, data)

    // Send notifications
    for (const channel of alert.channels) {
      try {
        await this.sendNotification(channel, alert, data)
      } catch (error) {
        errorTracking.captureException(error as Error, {
          context: 'alert_notification',
          alertName: name,
          channel,
        })
      }
    }
  }

  private async logAlert(name: string, alert: AlertConfig, data: any) {
    try {
      await supabaseAdmin
        .from('security_events')
        .insert({
          event_type: `alert_${name}`,
          severity: alert.severity,
          description: this.formatMessage(alert.message, data),
          metadata: {
            alertName: name,
            data,
            timestamp: new Date().toISOString(),
          },
        })
    } catch (error) {
      console.error('Failed to log alert:', error)
    }
  }

  private async sendNotification(
    channel: string,
    alert: AlertConfig,
    data: any
  ) {
    const message = this.formatMessage(alert.message, data)

    switch (channel) {
      case 'email':
        await this.sendEmail(alert, message, data)
        break
      case 'sms':
        await this.sendSMS(alert, message, data)
        break
      case 'slack':
        await this.sendSlack(alert, message, data)
        break
      case 'webhook':
        await this.sendWebhook(alert, message, data)
        break
    }
  }

  private async sendEmail(alert: AlertConfig, message: string, data: any) {
    // Implementation would depend on your email service (SendGrid, AWS SES, etc.)
    console.log(`EMAIL ALERT [${alert.severity.toUpperCase()}]: ${message}`)
    
    // Example implementation with a hypothetical email service
    // await emailService.send({
    //   to: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || [],
    //   subject: `[${alert.severity.toUpperCase()}] ${alert.name}`,
    //   body: message,
    //   priority: alert.severity === 'critical' ? 'high' : 'normal',
    // })
  }

  private async sendSMS(alert: AlertConfig, message: string, data: any) {
    // Implementation would use Twilio or similar service
    console.log(`SMS ALERT [${alert.severity.toUpperCase()}]: ${message}`)
    
    // Example implementation with Twilio
    // if (alert.severity === 'critical' || alert.severity === 'high') {
    //   await twilioClient.messages.create({
    //     body: `[${alert.severity.toUpperCase()}] ${message}`,
    //     from: process.env.TWILIO_PHONE_NUMBER,
    //     to: process.env.ALERT_PHONE_NUMBER,
    //   })
    // }
  }

  private async sendSlack(alert: AlertConfig, message: string, data: any) {
    // Implementation would use Slack webhook
    console.log(`SLACK ALERT [${alert.severity.toUpperCase()}]: ${message}`)
    
    // Example implementation with Slack webhook
    // const color = this.getSeverityColor(alert.severity)
    // await fetch(process.env.SLACK_WEBHOOK_URL!, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     text: `*${alert.name}*`,
    //     attachments: [{
    //       color,
    //       fields: [{
    //         title: 'Severity',
    //         value: alert.severity.toUpperCase(),
    //         short: true,
    //       }, {
    //         title: 'Message',
    //         value: message,
    //         short: false,
    //       }],
    //     }],
    //   }),
    // })
  }

  private async sendWebhook(alert: AlertConfig, message: string, data: any) {
    // Implementation would use custom webhook
    console.log(`WEBHOOK ALERT [${alert.severity.toUpperCase()}]: ${message}`)
    
    // Example implementation with custom webhook
    // await fetch(process.env.ALERT_WEBHOOK_URL!, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     alert: alert.name,
    //     severity: alert.severity,
    //     message,
    //     data,
    //     timestamp: new Date().toISOString(),
    //   }),
    // })
  }

  private formatMessage(template: string, data: any): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key]?.toString() || match
    })
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return 'danger'
      case 'high': return 'warning'
      case 'medium': return 'good'
      case 'low': return '#36a64f'
      default: return '#36a64f'
    }
  }
}

// Health check system
export class HealthChecker {
  async checkDatabaseHealth(): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('users')
        .select('id')
        .limit(1)
      return !error
    } catch {
      return false
    }
  }

  async checkRedisHealth(): Promise<boolean> {
    try {
      // Implementation would depend on your Redis client
      // const redis = createClient({ url: process.env.REDIS_URL })
      // await redis.ping()
      // return true
      return true // Placeholder
    } catch {
      return false
    }
  }

  async checkOpenAIHealth(): Promise<boolean> {
    try {
      // Implementation would test OpenAI API connectivity
      // const response = await fetch('https://api.openai.com/v1/models', {
      //   headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
      // })
      // return response.ok
      return true // Placeholder
    } catch {
      return false
    }
  }

  async getSystemMetrics() {
    const memoryUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()
    
    return {
      memoryUsage: memoryUsage.heapUsed / memoryUsage.heapTotal,
      cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }
  }

  async runHealthCheck() {
    const metrics = await this.getSystemMetrics()
    const health = {
      database: await this.checkDatabaseHealth(),
      redis: await this.checkRedisHealth(),
      openai: await this.checkOpenAIHealth(),
      ...metrics,
    }

    // Log health status
    console.log('Health check:', health)

    // Check for health issues
    if (!health.database || !health.redis || !health.openai) {
      await alertManager.checkAlerts({
        systemUnhealthy: true,
        health,
      })
    }

    return health
  }
}

// Initialize alert manager and health checker
export const alertManager = new AlertManager()
export const healthChecker = new HealthChecker()

// Run health checks every 5 minutes
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    healthChecker.runHealthCheck()
  }, 5 * 60 * 1000)
}