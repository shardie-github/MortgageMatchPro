import { EventBus } from '../events/event-bus';

export interface TelemetryMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags: Record<string, string>;
  tenantId?: string;
  serviceId: string;
}

export interface ServiceHealth {
  serviceId: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  errorRate: number;
  responseTime: number;
  cpuUsage: number;
  memoryUsage: number;
  lastCheck: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  duration: number; // seconds
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  channels: string[]; // slack, email, webhook
  tenantId?: string;
}

export interface Alert {
  id: string;
  ruleId: string;
  metric: string;
  value: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'firing' | 'resolved';
  triggeredAt: Date;
  resolvedAt?: Date;
  tenantId?: string;
  serviceId: string;
  message: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  services: string[];
  alerts: string[];
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  rootCause?: string;
  resolution?: string;
  tenantId?: string;
}

export class TelemetryService {
  private eventBus: EventBus;
  private metrics: Map<string, TelemetryMetric[]> = new Map();
  private serviceHealth: Map<string, ServiceHealth> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private incidents: Map<string, Incident> = new Map();
  private alertCheckInterval: NodeJS.Timeout | null = null;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.initializeDefaultAlertRules();
    this.startAlertMonitoring();
  }

  private initializeDefaultAlertRules(): void {
    // CPU usage alert
    this.alertRules.set('cpu-high', {
      id: 'cpu-high',
      name: 'High CPU Usage',
      metric: 'cpu.usage.percent',
      threshold: 80,
      operator: 'gt',
      duration: 300, // 5 minutes
      severity: 'high',
      enabled: true,
      channels: ['slack', 'email'],
      tenantId: undefined
    });

    // Memory usage alert
    this.alertRules.set('memory-high', {
      id: 'memory-high',
      name: 'High Memory Usage',
      metric: 'memory.usage.percent',
      threshold: 85,
      operator: 'gt',
      duration: 300,
      severity: 'high',
      enabled: true,
      channels: ['slack', 'email'],
      tenantId: undefined
    });

    // Error rate alert
    this.alertRules.set('error-rate-high', {
      id: 'error-rate-high',
      name: 'High Error Rate',
      metric: 'error.rate.percent',
      threshold: 5,
      operator: 'gt',
      duration: 180, // 3 minutes
      severity: 'critical',
      enabled: true,
      channels: ['slack', 'email', 'webhook'],
      tenantId: undefined
    });

    // Response time alert
    this.alertRules.set('response-time-high', {
      id: 'response-time-high',
      name: 'High Response Time',
      metric: 'response.time.p95',
      threshold: 2000, // 2 seconds
      operator: 'gt',
      duration: 300,
      severity: 'medium',
      enabled: true,
      channels: ['slack'],
      tenantId: undefined
    });

    // AI budget exceeded alert
    this.alertRules.set('ai-budget-exceeded', {
      id: 'ai-budget-exceeded',
      name: 'AI Budget Exceeded',
      metric: 'ai.cost.daily',
      threshold: 1000, // $1000
      operator: 'gt',
      duration: 0, // Immediate
      severity: 'critical',
      enabled: true,
      channels: ['slack', 'email', 'webhook'],
      tenantId: undefined
    });
  }

  private startAlertMonitoring(): void {
    // Check alerts every 30 seconds
    this.alertCheckInterval = setInterval(() => {
      this.checkAlerts();
    }, 30000);
  }

  // Metric collection
  async recordMetric(metric: Omit<TelemetryMetric, 'timestamp'>): Promise<void> {
    const fullMetric: TelemetryMetric = {
      ...metric,
      timestamp: new Date()
    };

    // Store metric
    const key = `${metric.serviceId}:${metric.name}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    const metricList = this.metrics.get(key)!;
    metricList.push(fullMetric);
    
    // Keep only last 1000 metrics per key
    if (metricList.length > 1000) {
      metricList.splice(0, metricList.length - 1000);
    }

    // Publish metric event
    await this.eventBus.publish('telemetry.metric.recorded', {
      metric: fullMetric,
      recordedAt: new Date().toISOString()
    });
  }

  async recordServiceHealth(health: ServiceHealth): Promise<void> {
    this.serviceHealth.set(health.serviceId, health);

    // Record health metrics
    await this.recordMetric({
      name: 'service.uptime.percent',
      value: health.uptime,
      unit: 'percent',
      tags: { service: health.serviceId },
      serviceId: health.serviceId
    });

    await this.recordMetric({
      name: 'service.error.rate.percent',
      value: health.errorRate,
      unit: 'percent',
      tags: { service: health.serviceId },
      serviceId: health.serviceId
    });

    await this.recordMetric({
      name: 'service.response.time.ms',
      value: health.responseTime,
      unit: 'milliseconds',
      tags: { service: health.serviceId },
      serviceId: health.serviceId
    });

    await this.recordMetric({
      name: 'service.cpu.usage.percent',
      value: health.cpuUsage,
      unit: 'percent',
      tags: { service: health.serviceId },
      serviceId: health.serviceId
    });

    await this.recordMetric({
      name: 'service.memory.usage.percent',
      value: health.memoryUsage,
      unit: 'percent',
      tags: { service: health.serviceId },
      serviceId: health.serviceId
    });

    // Publish health event
    await this.eventBus.publish('telemetry.health.updated', {
      serviceId: health.serviceId,
      status: health.status,
      health,
      updatedAt: new Date().toISOString()
    });
  }

  // Alert management
  async createAlertRule(rule: Omit<AlertRule, 'id'>): Promise<string> {
    const ruleId = `rule-${Date.now()}`;
    const fullRule: AlertRule = {
      ...rule,
      id: ruleId
    };

    this.alertRules.set(ruleId, fullRule);

    await this.eventBus.publish('telemetry.alert.rule.created', {
      ruleId,
      rule: fullRule,
      createdAt: new Date().toISOString()
    });

    return ruleId;
  }

  async updateAlertRule(ruleId: string, updates: Partial<AlertRule>): Promise<void> {
    const existingRule = this.alertRules.get(ruleId);
    if (!existingRule) {
      throw new Error('Alert rule not found');
    }

    const updatedRule = { ...existingRule, ...updates };
    this.alertRules.set(ruleId, updatedRule);

    await this.eventBus.publish('telemetry.alert.rule.updated', {
      ruleId,
      updates,
      updatedAt: new Date().toISOString()
    });
  }

  async deleteAlertRule(ruleId: string): Promise<void> {
    const rule = this.alertRules.get(ruleId);
    if (!rule) {
      throw new Error('Alert rule not found');
    }

    this.alertRules.delete(ruleId);

    await this.eventBus.publish('telemetry.alert.rule.deleted', {
      ruleId,
      deletedAt: new Date().toISOString()
    });
  }

  private async checkAlerts(): Promise<void> {
    for (const [ruleId, rule] of this.alertRules) {
      if (!rule.enabled) continue;

      const metricKey = `${rule.tenantId || 'global'}:${rule.metric}`;
      const metrics = this.metrics.get(metricKey) || [];
      
      if (metrics.length === 0) continue;

      // Get recent metrics within the duration window
      const now = new Date();
      const cutoff = new Date(now.getTime() - rule.duration * 1000);
      const recentMetrics = metrics.filter(m => m.timestamp >= cutoff);

      if (recentMetrics.length === 0) continue;

      // Calculate average value
      const avgValue = recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length;

      // Check if alert condition is met
      const shouldAlert = this.evaluateAlertCondition(avgValue, rule.threshold, rule.operator);
      
      if (shouldAlert) {
        await this.triggerAlert(rule, avgValue);
      }
    }
  }

  private evaluateAlertCondition(value: number, threshold: number, operator: string): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'eq': return value === threshold;
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      default: return false;
    }
  }

  private async triggerAlert(rule: AlertRule, value: number): Promise<void> {
    const alertId = `alert-${Date.now()}`;
    const alert: Alert = {
      id: alertId,
      ruleId: rule.id,
      metric: rule.metric,
      value,
      threshold: rule.threshold,
      severity: rule.severity,
      status: 'firing',
      triggeredAt: new Date(),
      tenantId: rule.tenantId,
      serviceId: 'telemetry-service',
      message: `${rule.name}: ${rule.metric} is ${value} (threshold: ${rule.threshold})`
    };

    this.alerts.set(alertId, alert);

    // Send notifications
    await this.sendAlertNotifications(alert, rule);

    // Publish alert event
    await this.eventBus.publish('telemetry.alert.triggered', {
      alertId,
      alert,
      rule,
      triggeredAt: new Date().toISOString()
    });
  }

  private async sendAlertNotifications(alert: Alert, rule: AlertRule): Promise<void> {
    for (const channel of rule.channels) {
      try {
        switch (channel) {
          case 'slack':
            await this.sendSlackNotification(alert, rule);
            break;
          case 'email':
            await this.sendEmailNotification(alert, rule);
            break;
          case 'webhook':
            await this.sendWebhookNotification(alert, rule);
            break;
        }
      } catch (error) {
        console.error(`Failed to send ${channel} notification:`, error);
      }
    }
  }

  private async sendSlackNotification(alert: Alert, rule: AlertRule): Promise<void> {
    const message = {
      text: `🚨 Alert: ${rule.name}`,
      attachments: [{
        color: this.getSeverityColor(alert.severity),
        fields: [
          { title: 'Metric', value: alert.metric, short: true },
          { title: 'Value', value: alert.value.toString(), short: true },
          { title: 'Threshold', value: alert.threshold.toString(), short: true },
          { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
          { title: 'Time', value: alert.triggeredAt.toISOString(), short: true }
        ]
      }]
    };

    // In a real implementation, you would send this to Slack
    console.log('Slack notification:', JSON.stringify(message, null, 2));
  }

  private async sendEmailNotification(alert: Alert, rule: AlertRule): Promise<void> {
    const subject = `[${alert.severity.toUpperCase()}] ${rule.name}`;
    const body = `
Alert: ${rule.name}
Metric: ${alert.metric}
Value: ${alert.value}
Threshold: ${alert.threshold}
Severity: ${alert.severity}
Time: ${alert.triggeredAt.toISOString()}
    `.trim();

    // In a real implementation, you would send this via email
    console.log('Email notification:', { subject, body });
  }

  private async sendWebhookNotification(alert: Alert, rule: AlertRule): Promise<void> {
    const payload = {
      alert,
      rule,
      timestamp: new Date().toISOString()
    };

    // In a real implementation, you would send this to a webhook URL
    console.log('Webhook notification:', JSON.stringify(payload, null, 2));
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'low': return '#36a64f';
      case 'medium': return '#ff9800';
      case 'high': return '#ff5722';
      case 'critical': return '#f44336';
      default: return '#757575';
    }
  }

  // Incident management
  async createIncident(incident: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const incidentId = `incident-${Date.now()}`;
    const fullIncident: Incident = {
      ...incident,
      id: incidentId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.incidents.set(incidentId, fullIncident);

    await this.eventBus.publish('telemetry.incident.created', {
      incidentId,
      incident: fullIncident,
      createdAt: new Date().toISOString()
    });

    return incidentId;
  }

  async updateIncident(incidentId: string, updates: Partial<Incident>): Promise<void> {
    const existingIncident = this.incidents.get(incidentId);
    if (!existingIncident) {
      throw new Error('Incident not found');
    }

    const updatedIncident = {
      ...existingIncident,
      ...updates,
      updatedAt: new Date()
    };

    this.incidents.set(incidentId, updatedIncident);

    await this.eventBus.publish('telemetry.incident.updated', {
      incidentId,
      updates,
      updatedAt: new Date().toISOString()
    });
  }

  async resolveIncident(incidentId: string, resolution: string, rootCause?: string): Promise<void> {
    await this.updateIncident(incidentId, {
      status: 'resolved',
      resolvedAt: new Date(),
      resolution,
      rootCause
    });
  }

  // Query methods
  async getMetrics(serviceId: string, metricName: string, from?: Date, to?: Date): Promise<TelemetryMetric[]> {
    const key = `${serviceId}:${metricName}`;
    const metrics = this.metrics.get(key) || [];
    
    if (from && to) {
      return metrics.filter(m => m.timestamp >= from && m.timestamp <= to);
    }
    
    return metrics;
  }

  async getServiceHealth(serviceId: string): Promise<ServiceHealth | null> {
    return this.serviceHealth.get(serviceId) || null;
  }

  async getAllServiceHealth(): Promise<ServiceHealth[]> {
    return Array.from(this.serviceHealth.values());
  }

  async getAlerts(status?: 'firing' | 'resolved'): Promise<Alert[]> {
    const alerts = Array.from(this.alerts.values());
    
    if (status) {
      return alerts.filter(a => a.status === status);
    }
    
    return alerts;
  }

  async getIncidents(status?: 'open' | 'investigating' | 'resolved' | 'closed'): Promise<Incident[]> {
    const incidents = Array.from(this.incidents.values());
    
    if (status) {
      return incidents.filter(i => i.status === status);
    }
    
    return incidents;
  }

  async getAlertRules(): Promise<AlertRule[]> {
    return Array.from(this.alertRules.values());
  }

  // Cleanup methods
  async cleanupOldMetrics(olderThanDays: number = 7): Promise<void> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    
    for (const [key, metrics] of this.metrics) {
      const filtered = metrics.filter(m => m.timestamp > cutoff);
      this.metrics.set(key, filtered);
    }
  }

  async cleanupResolvedAlerts(olderThanDays: number = 30): Promise<void> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    
    for (const [alertId, alert] of this.alerts) {
      if (alert.status === 'resolved' && alert.resolvedAt && alert.resolvedAt < cutoff) {
        this.alerts.delete(alertId);
      }
    }
  }

  // Cleanup method
  async cleanup(): Promise<void> {
    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
      this.alertCheckInterval = null;
    }
    
    this.metrics.clear();
    this.serviceHealth.clear();
    this.alertRules.clear();
    this.alerts.clear();
    this.incidents.clear();
  }
}
