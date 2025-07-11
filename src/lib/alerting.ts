/**
 * Alerting and Monitoring System
 * Handles critical error detection and notification
 */

import { Logger } from './logger'
import { sendEmail } from './email'
import { envConfig } from './env-validation'

const logger = Logger('Alerting')

export interface Alert {
  id: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  source: string
  timestamp: Date
  metadata?: Record<string, any>
  resolved?: boolean
  resolvedAt?: Date
}

export interface AlertRule {
  id: string
  name: string
  condition: (data: any) => boolean
  severity: Alert['severity']
  cooldown: number // minutes
  enabled: boolean
  actions: AlertAction[]
}

export interface AlertAction {
  type: 'email' | 'webhook' | 'log'
  config: Record<string, any>
}

class AlertManager {
  private alerts: Map<string, Alert> = new Map()
  private rules: Map<string, AlertRule> = new Map()
  private lastTriggered: Map<string, Date> = new Map()
  private adminEmails: string[]

  constructor() {
    this.adminEmails = envConfig.ADMIN_EMAILS.split(',').map(email => email.trim())
    this.setupDefaultRules()
  }

  /**
   * Setup default alerting rules
   */
  private setupDefaultRules() {
    // High error rate
    this.addRule({
      id: 'high_error_rate',
      name: 'High Error Rate',
      condition: (data) => data.errorRate > 0.1, // 10% error rate
      severity: 'high',
      cooldown: 15,
      enabled: true,
      actions: [
        { type: 'email', config: { template: 'high_error_rate' } },
        { type: 'log', config: { level: 'error' } }
      ]
    })

    // Database connection issues
    this.addRule({
      id: 'database_connection_error',
      name: 'Database Connection Error',
      condition: (data) => data.type === 'database_error',
      severity: 'critical',
      cooldown: 5,
      enabled: true,
      actions: [
        { type: 'email', config: { template: 'database_error', urgent: true } },
        { type: 'log', config: { level: 'error' } }
      ]
    })

    // High response time
    this.addRule({
      id: 'high_response_time',
      name: 'High Response Time',
      condition: (data) => data.responseTime > 5000, // 5 seconds
      severity: 'medium',
      cooldown: 30,
      enabled: true,
      actions: [
        { type: 'email', config: { template: 'performance_degradation' } },
        { type: 'log', config: { level: 'warn' } }
      ]
    })

    // Memory usage
    this.addRule({
      id: 'high_memory_usage',
      name: 'High Memory Usage',
      condition: (data) => data.memoryUsage > 0.9, // 90% memory usage
      severity: 'high',
      cooldown: 10,
      enabled: true,
      actions: [
        { type: 'email', config: { template: 'resource_usage' } },
        { type: 'log', config: { level: 'warn' } }
      ]
    })

    // Failed login attempts
    this.addRule({
      id: 'failed_login_attempts',
      name: 'Multiple Failed Login Attempts',
      condition: (data) => data.failedAttempts > 5,
      severity: 'medium',
      cooldown: 60,
      enabled: true,
      actions: [
        { type: 'email', config: { template: 'security_alert' } },
        { type: 'log', config: { level: 'warn' } }
      ]
    })

    // SSL certificate expiration
    this.addRule({
      id: 'ssl_expiring',
      name: 'SSL Certificate Expiring',
      condition: (data) => data.daysUntilExpiry <= 30,
      severity: 'high',
      cooldown: 1440, // 24 hours
      enabled: true,
      actions: [
        { type: 'email', config: { template: 'ssl_expiring' } },
        { type: 'log', config: { level: 'warn' } }
      ]
    })
  }

  /**
   * Add a new alerting rule
   */
  addRule(rule: AlertRule) {
    this.rules.set(rule.id, rule)
    logger.info(`Alert rule added: ${rule.name}`)
  }

  /**
   * Remove an alerting rule
   */
  removeRule(ruleId: string) {
    this.rules.delete(ruleId)
    this.lastTriggered.delete(ruleId)
    logger.info(`Alert rule removed: ${ruleId}`)
  }

  /**
   * Check data against all rules and trigger alerts
   */
  async checkRules(data: any) {
    for (const [ruleId, rule] of this.rules.entries()) {
      if (!rule.enabled) continue

      try {
        // Check cooldown period
        const lastTrigger = this.lastTriggered.get(ruleId)
        if (lastTrigger) {
          const cooldownMs = rule.cooldown * 60 * 1000
          if (Date.now() - lastTrigger.getTime() < cooldownMs) {
            continue
          }
        }

        // Check rule condition
        if (rule.condition(data)) {
          await this.triggerAlert(rule, data)
          this.lastTriggered.set(ruleId, new Date())
        }
      } catch (error) {
        logger.error(`Error checking rule ${rule.name}:`, error)
      }
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(rule: AlertRule, data: any) {
    const alert: Alert = {
      id: `${rule.id}_${Date.now()}`,
      severity: rule.severity,
      title: rule.name,
      message: this.generateAlertMessage(rule, data),
      source: data.source || 'system',
      timestamp: new Date(),
      metadata: data,
      resolved: false
    }

    this.alerts.set(alert.id, alert)
    logger.warn(`Alert triggered: ${alert.title}`, { alertId: alert.id, severity: alert.severity })

    // Execute alert actions
    for (const action of rule.actions) {
      try {
        await this.executeAction(action, alert)
      } catch (error) {
        logger.error(`Failed to execute alert action:`, error)
      }
    }
  }

  /**
   * Execute an alert action
   */
  private async executeAction(action: AlertAction, alert: Alert) {
    switch (action.type) {
      case 'email':
        await this.sendEmailAlert(alert, action.config)
        break
      case 'webhook':
        await this.sendWebhookAlert(alert, action.config)
        break
      case 'log':
        this.logAlert(alert, action.config)
        break
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(alert: Alert, config: any) {
    const subject = `[${alert.severity.toUpperCase()}] ${alert.title}`
    const template = config.template || 'generic_alert'
    
    const htmlContent = this.generateEmailTemplate(alert, template)
    
    try {
      await sendEmail({
        to: this.adminEmails,
        subject,
        html: htmlContent
      })
      
      logger.info(`Email alert sent for: ${alert.title}`)
    } catch (error) {
      logger.error(`Failed to send email alert:`, error)
    }
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(alert: Alert, config: any) {
    if (!config.url) return

    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.headers || {})
        },
        body: JSON.stringify({
          alert,
          timestamp: new Date().toISOString(),
          service: 'youth-registration-system'
        })
      })

      if (!response.ok) {
        throw new Error(`Webhook failed with status: ${response.status}`)
      }

      logger.info(`Webhook alert sent for: ${alert.title}`)
    } catch (error) {
      logger.error(`Failed to send webhook alert:`, error)
    }
  }

  /**
   * Log alert
   */
  private logAlert(alert: Alert, config: any) {
    const level = config.level || 'warn'
    logger[level](`ALERT: ${alert.title}`, {
      alertId: alert.id,
      severity: alert.severity,
      message: alert.message,
      metadata: alert.metadata
    })
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(rule: AlertRule, data: any): string {
    switch (rule.id) {
      case 'high_error_rate':
        return `Error rate is ${(data.errorRate * 100).toFixed(1)}% (threshold: 10%)`
      case 'database_connection_error':
        return `Database connection failed: ${data.error}`
      case 'high_response_time':
        return `Response time is ${data.responseTime}ms (threshold: 5000ms)`
      case 'high_memory_usage':
        return `Memory usage is ${(data.memoryUsage * 100).toFixed(1)}% (threshold: 90%)`
      case 'failed_login_attempts':
        return `${data.failedAttempts} failed login attempts detected`
      case 'ssl_expiring':
        return `SSL certificate expires in ${data.daysUntilExpiry} days`
      default:
        return `Alert condition met for rule: ${rule.name}`
    }
  }

  /**
   * Generate email template
   */
  private generateEmailTemplate(alert: Alert, template: string): string {
    const baseTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Alert: ${alert.title}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .alert-critical { border-left: 5px solid #dc3545; }
        .alert-high { border-left: 5px solid #fd7e14; }
        .alert-medium { border-left: 5px solid #ffc107; }
        .alert-low { border-left: 5px solid #28a745; }
        .metadata { background: #f8f9fa; padding: 15px; border-radius: 4px; margin-top: 20px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header alert-${alert.severity}">
            <h2>🚨 Alert: ${alert.title}</h2>
            <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
            <p><strong>Time:</strong> ${alert.timestamp.toISOString()}</p>
            <p><strong>Source:</strong> ${alert.source}</p>
        </div>
        
        <div class="content">
            <h3>Description</h3>
            <p>${alert.message}</p>
            
            ${alert.metadata ? `
            <div class="metadata">
                <h4>Additional Information</h4>
                <pre>${JSON.stringify(alert.metadata, null, 2)}</pre>
            </div>
            ` : ''}
        </div>
        
        <div class="footer">
            <p>This alert was generated by the Youth Registration System monitoring.</p>
            <p>Alert ID: ${alert.id}</p>
        </div>
    </div>
</body>
</html>`

    return baseTemplate
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved)
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string) {
    const alert = this.alerts.get(alertId)
    if (alert) {
      alert.resolved = true
      alert.resolvedAt = new Date()
      logger.info(`Alert resolved: ${alert.title}`, { alertId })
    }
  }

  /**
   * Get alert statistics
   */
  getAlertStats() {
    const alerts = Array.from(this.alerts.values())
    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    return {
      total: alerts.length,
      active: alerts.filter(a => !a.resolved).length,
      last24h: alerts.filter(a => a.timestamp >= last24h).length,
      bySeverity: {
        critical: alerts.filter(a => a.severity === 'critical').length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        low: alerts.filter(a => a.severity === 'low').length
      }
    }
  }
}

// Export singleton instance
export const alertManager = new AlertManager()

// Convenience functions
export const triggerAlert = (data: any) => alertManager.checkRules(data)
export const getActiveAlerts = () => alertManager.getActiveAlerts()
export const resolveAlert = (alertId: string) => alertManager.resolveAlert(alertId)
export const getAlertStats = () => alertManager.getAlertStats()
