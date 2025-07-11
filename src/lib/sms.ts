/**
 * SMS Service with Multiple Provider Support
 * Supports Twilio, AWS SNS, and local SMS gateway options
 */

import { envConfig } from './env-validation'
import { Logger } from './logger'

const logger = Logger('SMS')

export interface SMSConfig {
  provider: 'twilio' | 'aws-sns' | 'local-gateway' | 'kudisms' | 'termii' | 'bulk-sms-nigeria' | 'smart-sms'
  apiKey?: string
  apiSecret?: string
  fromNumber?: string
  region?: string
  gatewayUrl?: string
  username?: string
}

export interface SMSMessage {
  to: string
  message: string
  type?: 'verification' | 'notification' | 'alert'
}

export interface SMSResult {
  success: boolean
  messageId?: string
  error?: string
  provider: string
}

class SMSService {
  private config: SMSConfig
  private isEnabled: boolean

  constructor() {
    this.config = {
      provider: (process.env.SMS_PROVIDER as any) || 'twilio',
      apiKey: process.env.SMS_API_KEY,
      apiSecret: process.env.SMS_API_SECRET,
      fromNumber: process.env.SMS_FROM_NUMBER,
      region: process.env.SMS_REGION || 'us-east-1',
      gatewayUrl: process.env.SMS_GATEWAY_URL,
      username: process.env.SMS_USERNAME
    }
    
    this.isEnabled = process.env.SMS_ENABLED === 'true'
    
    if (this.isEnabled) {
      this.validateConfig()
    }
  }

  private validateConfig() {
    const { provider, apiKey, apiSecret, fromNumber, username } = this.config

    switch (provider) {
      case 'twilio':
        if (!apiKey || !apiSecret || !fromNumber) {
          throw new Error('Twilio SMS requires SMS_API_KEY, SMS_API_SECRET, and SMS_FROM_NUMBER')
        }
        break
      case 'aws-sns':
        if (!apiKey || !apiSecret) {
          throw new Error('AWS SNS requires SMS_API_KEY and SMS_API_SECRET')
        }
        break
      case 'local-gateway':
        if (!this.config.gatewayUrl) {
          throw new Error('Local gateway requires SMS_GATEWAY_URL')
        }
        break
      case 'kudisms':
        if (!apiKey || !username) {
          throw new Error('KudiSMS requires SMS_API_KEY and SMS_USERNAME')
        }
        break
      case 'termii':
        if (!apiKey) {
          throw new Error('Termii requires SMS_API_KEY')
        }
        break
      case 'bulk-sms-nigeria':
        if (!apiKey || !username) {
          throw new Error('Bulk SMS Nigeria requires SMS_API_KEY and SMS_USERNAME')
        }
        break
      case 'smart-sms':
        if (!apiKey || !username) {
          throw new Error('Smart SMS requires SMS_API_KEY and SMS_USERNAME')
        }
        break

      default:
        throw new Error(`Unsupported SMS provider: ${provider}`)
    }
  }

  /**
   * Send SMS using configured provider
   */
  async sendSMS(message: SMSMessage): Promise<SMSResult> {
    // Reload config from database before sending
    try {
      await this.reloadConfig()
    } catch (error) {
      logger.warn('Failed to reload SMS config, using existing config', error)
    }

    if (!this.isEnabled) {
      logger.warn('SMS service is disabled')
      return {
        success: false,
        error: 'SMS service is disabled',
        provider: this.config.provider
      }
    }

    try {
      logger.info(`Sending SMS via ${this.config.provider}`, {
        to: message.to,
        type: message.type
      })

      switch (this.config.provider) {
        case 'twilio':
          return await this.sendViaTwilio(message)
        case 'aws-sns':
          return await this.sendViaAWSSNS(message)
        case 'local-gateway':
          return await this.sendViaLocalGateway(message)
        case 'kudisms':
          return await this.sendViaKudiSMS(message)
        case 'termii':
          return await this.sendViaTermii(message)
        case 'bulk-sms-nigeria':
          return await this.sendViaBulkSMSNigeria(message)
        case 'smart-sms':
          return await this.sendViaSmartSMS(message)

        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`)
      }
    } catch (error) {
      logger.error('Failed to send SMS', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.config.provider
      }
    }
  }

  /**
   * Send SMS via Twilio
   */
  private async sendViaTwilio(message: SMSMessage): Promise<SMSResult> {
    const accountSid = this.config.apiKey
    const authToken = this.config.apiSecret
    const fromNumber = this.config.fromNumber

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    
    const body = new URLSearchParams({
      From: fromNumber!,
      To: message.to,
      Body: message.message
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    })

    const result = await response.json()

    if (response.ok) {
      return {
        success: true,
        messageId: result.sid,
        provider: 'twilio'
      }
    } else {
      throw new Error(result.message || 'Twilio API error')
    }
  }

  /**
   * Send SMS via AWS SNS
   */
  private async sendViaAWSSNS(message: SMSMessage): Promise<SMSResult> {
    // AWS SNS implementation
    const accessKeyId = this.config.apiKey!
    const secretAccessKey = this.config.apiSecret!
    const region = this.config.region!

    // Create AWS signature and send request
    const endpoint = `https://sns.${region}.amazonaws.com/`
    
    const params = {
      Action: 'Publish',
      PhoneNumber: message.to,
      Message: message.message,
      Version: '2010-03-31'
    }

    // This is a simplified implementation
    // In production, you'd use the AWS SDK
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `AWS4-HMAC-SHA256 Credential=${accessKeyId}/...` // Simplified
      },
      body: new URLSearchParams(params).toString()
    })

    if (response.ok) {
      const result = await response.text()
      return {
        success: true,
        messageId: 'aws-' + Date.now(),
        provider: 'aws-sns'
      }
    } else {
      throw new Error('AWS SNS API error')
    }
  }

  /**
   * Send SMS via local gateway (for custom SMS hardware/software)
   */
  private async sendViaLocalGateway(message: SMSMessage): Promise<SMSResult> {
    const response = await fetch(this.config.gatewayUrl!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        to: message.to,
        message: message.message,
        type: message.type
      })
    })

    const result = await response.json()

    if (response.ok) {
      return {
        success: true,
        messageId: result.messageId || 'local-' + Date.now(),
        provider: 'local-gateway'
      }
    } else {
      throw new Error(result.error || 'Local gateway error')
    }
  }

  /**
   * Send SMS via KudiSMS (Nigeria)
   */
  private async sendViaKudiSMS(message: SMSMessage): Promise<SMSResult> {
    const url = 'https://account.kudisms.net/api/'

    const params = new URLSearchParams({
      username: this.config.username!,
      password: this.config.apiKey!,
      message: message.message,
      sender: this.config.fromNumber || 'YouthReg',
      mobiles: message.to
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    })

    const result = await response.text()

    if (response.ok && result.includes('OK')) {
      return {
        success: true,
        messageId: 'kudisms-' + Date.now(),
        provider: 'kudisms'
      }
    } else {
      throw new Error(result || 'KudiSMS API error')
    }
  }

  /**
   * Send SMS via Termii (Nigeria)
   */
  private async sendViaTermii(message: SMSMessage): Promise<SMSResult> {
    const url = 'https://api.ng.termii.com/api/sms/send'

    const payload = {
      to: message.to,
      from: this.config.fromNumber || 'YouthReg',
      sms: message.message,
      type: 'plain',
      channel: 'generic',
      api_key: this.config.apiKey
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()

    if (response.ok && result.message_id) {
      return {
        success: true,
        messageId: result.message_id,
        provider: 'termii'
      }
    } else {
      throw new Error(result.message || 'Termii API error')
    }
  }

  /**
   * Send SMS via Bulk SMS Nigeria
   */
  private async sendViaBulkSMSNigeria(message: SMSMessage): Promise<SMSResult> {
    const url = 'https://www.bulksmsnigeria.com/api/v1/sms/create'

    const payload = {
      api_token: this.config.apiKey,
      from: this.config.fromNumber || 'YouthReg',
      to: message.to,
      body: message.message,
      dnd: '2'
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()

    if (response.ok && result.status === 'success') {
      return {
        success: true,
        messageId: result.data.id || 'bulksms-' + Date.now(),
        provider: 'bulk-sms-nigeria'
      }
    } else {
      throw new Error(result.message || 'Bulk SMS Nigeria API error')
    }
  }

  /**
   * Send SMS via Smart SMS (Nigeria)
   */
  private async sendViaSmartSMS(message: SMSMessage): Promise<SMSResult> {
    const url = 'https://smartsmssolutions.com/api/json.php'

    const payload = {
      username: this.config.username,
      password: this.config.apiKey,
      sender: this.config.fromNumber || 'YouthReg',
      recipient: message.to,
      message: message.message
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()

    if (response.ok && result.status === '1') {
      return {
        success: true,
        messageId: result.message_id || 'smartsms-' + Date.now(),
        provider: 'smart-sms'
      }
    } else {
      throw new Error(result.comment || 'Smart SMS API error')
    }
  }



  /**
   * Send verification code via SMS
   */
  async sendVerificationCode(phoneNumber: string, code: string): Promise<SMSResult> {
    const message = `Your Youth Registration verification code is: ${code}. This code expires in 10 minutes.`
    
    return await this.sendSMS({
      to: phoneNumber,
      message,
      type: 'verification'
    })
  }

  /**
   * Send notification SMS
   */
  async sendNotification(phoneNumber: string, title: string, content: string): Promise<SMSResult> {
    const message = `${title}\n\n${content}\n\n- Youth Registration System`
    
    return await this.sendSMS({
      to: phoneNumber,
      message,
      type: 'notification'
    })
  }

  /**
   * Send bulk SMS to multiple recipients
   */
  async sendBulkSMS(messages: SMSMessage[]): Promise<SMSResult[]> {
    logger.info(`Starting bulk SMS send for ${messages.length} messages`)

    const results: SMSResult[] = []

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i]
      try {
        logger.info(`Sending SMS ${i + 1}/${messages.length} to ${message.to}`)
        const result = await this.sendSMS(message)
        results.push(result)

        if (result.success) {
          logger.info(`SMS ${i + 1} sent successfully`)
        } else {
          logger.warn(`SMS ${i + 1} failed: ${result.error}`)
        }

        // Add delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        logger.error(`SMS ${i + 1} threw error:`, error)
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          provider: this.config.provider
        })
      }
    }

    logger.info(`Bulk SMS completed: ${results.filter(r => r.success).length}/${messages.length} successful`)
    return results
  }

  /**
   * Reload configuration from database
   */
  async reloadConfig(): Promise<void> {
    try {
      const { prisma } = await import('./db')
      const smsSettings = await prisma.setting.findMany({
        where: { category: 'sms' }
      })

      // Transform settings to object
      const settings = smsSettings.reduce((acc, setting) => {
        let value
        try {
          value = JSON.parse(setting.value)
        } catch {
          value = setting.value
        }
        acc[setting.key] = value
        return acc
      }, {} as Record<string, any>)

      // Update configuration with database settings (fallback to environment)
      this.config = {
        provider: (settings.smsProvider || process.env.SMS_PROVIDER || 'twilio') as any,
        apiKey: settings.smsApiKey || process.env.SMS_API_KEY,
        apiSecret: settings.smsApiSecret || process.env.SMS_API_SECRET,
        fromNumber: settings.smsFromNumber || process.env.SMS_FROM_NUMBER,
        region: settings.smsRegion || process.env.SMS_REGION || 'us-east-1',
        gatewayUrl: settings.smsGatewayUrl || process.env.SMS_GATEWAY_URL,
        username: settings.smsUsername || process.env.SMS_USERNAME
      }

      this.isEnabled = settings.smsEnabled !== undefined ? settings.smsEnabled : (process.env.SMS_ENABLED === 'true')

      logger.info('SMS configuration reloaded from database', {
        provider: this.config.provider,
        enabled: this.isEnabled,
        source: smsSettings.length > 0 ? 'database' : 'environment'
      })
    } catch (error) {
      logger.warn('Failed to reload SMS config from database, using environment variables', error)
    }
  }

  /**
   * Get SMS service status (with fresh config from database)
   */
  async getStatus() {
    await this.reloadConfig()
    return {
      enabled: this.isEnabled,
      provider: this.config.provider,
      configured: this.isConfigured()
    }
  }

  /**
   * Check if SMS service is properly configured
   */
  private isConfigured(): boolean {
    try {
      if (!this.isEnabled) return false
      this.validateConfig()
      return true
    } catch {
      return false
    }
  }
}

// Export singleton instance
export const smsService = new SMSService()

// Convenience functions
export const sendSMS = (message: SMSMessage) => smsService.sendSMS(message)
export const sendVerificationCode = (phoneNumber: string, code: string) => 
  smsService.sendVerificationCode(phoneNumber, code)
export const sendNotification = (phoneNumber: string, title: string, content: string) => 
  smsService.sendNotification(phoneNumber, title, content)
export const sendBulkSMS = (messages: SMSMessage[]) => smsService.sendBulkSMS(messages)
export const getSMSStatus = () => smsService.getStatus()
