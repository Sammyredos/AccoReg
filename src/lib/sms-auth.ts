/**
 * SMS Authentication System
 * Handles phone number verification and SMS-based authentication
 */

import { prisma } from './db'
import { smsService } from './sms'
import { Logger } from './logger'
import { generateToken } from './auth'

const logger = Logger('SMSAuth')

export interface SMSVerification {
  id: string
  phoneNumber: string
  code: string
  expiresAt: Date
  attempts: number
  verified: boolean
  createdAt: Date
}

export interface SMSAuthResult {
  success: boolean
  token?: string
  error?: string
  attemptsRemaining?: number
}

class SMSAuthService {
  private readonly CODE_LENGTH = 6
  private readonly CODE_EXPIRY_MINUTES = 10
  private readonly MAX_ATTEMPTS = 3
  private readonly RATE_LIMIT_MINUTES = 1

  /**
   * Generate a random verification code
   */
  private generateCode(): string {
    return Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(this.CODE_LENGTH, '0')
  }

  /**
   * Format phone number to international format
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '')
    
    // Add country code if missing (assuming US +1)
    if (digits.length === 10) {
      return `+1${digits}`
    } else if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`
    }
    
    // Return as-is if already formatted or international
    return phoneNumber.startsWith('+') ? phoneNumber : `+${digits}`
  }

  /**
   * Send SMS verification code
   */
  async sendVerificationCode(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber)
      
      // Check rate limiting
      const recentVerification = await prisma.sMSVerification.findFirst({
        where: {
          phoneNumber: formattedPhone,
          createdAt: {
            gte: new Date(Date.now() - this.RATE_LIMIT_MINUTES * 60 * 1000)
          }
        }
      })

      if (recentVerification) {
        return {
          success: false,
          error: `Please wait ${this.RATE_LIMIT_MINUTES} minute(s) before requesting another code`
        }
      }

      // Generate new verification code
      const code = this.generateCode()
      const expiresAt = new Date(Date.now() + this.CODE_EXPIRY_MINUTES * 60 * 1000)

      // Save verification record
      await prisma.sMSVerification.create({
        data: {
          phoneNumber: formattedPhone,
          code,
          expiresAt,
          attempts: 0,
          verified: false
        }
      })

      // Send SMS
      const smsResult = await smsService.sendVerificationCode(formattedPhone, code)

      if (!smsResult.success) {
        logger.error('Failed to send SMS verification code', {
          phoneNumber: formattedPhone,
          error: smsResult.error
        })
        return {
          success: false,
          error: 'Failed to send verification code. Please try again.'
        }
      }

      logger.info('SMS verification code sent', {
        phoneNumber: formattedPhone,
        messageId: smsResult.messageId
      })

      return { success: true }
    } catch (error) {
      logger.error('Error sending SMS verification code', error)
      return {
        success: false,
        error: 'An error occurred while sending the verification code'
      }
    }
  }

  /**
   * Verify SMS code and authenticate user
   */
  async verifyCode(phoneNumber: string, code: string): Promise<SMSAuthResult> {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber)

      // Find verification record
      const verification = await prisma.sMSVerification.findFirst({
        where: {
          phoneNumber: formattedPhone,
          verified: false,
          expiresAt: {
            gte: new Date()
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      if (!verification) {
        return {
          success: false,
          error: 'No valid verification code found. Please request a new code.'
        }
      }

      // Check if max attempts exceeded
      if (verification.attempts >= this.MAX_ATTEMPTS) {
        return {
          success: false,
          error: 'Maximum verification attempts exceeded. Please request a new code.'
        }
      }

      // Increment attempts
      await prisma.sMSVerification.update({
        where: { id: verification.id },
        data: { attempts: verification.attempts + 1 }
      })

      // Verify code
      if (verification.code !== code) {
        const attemptsRemaining = this.MAX_ATTEMPTS - (verification.attempts + 1)
        return {
          success: false,
          error: 'Invalid verification code',
          attemptsRemaining: Math.max(0, attemptsRemaining)
        }
      }

      // Mark as verified
      await prisma.sMSVerification.update({
        where: { id: verification.id },
        data: { verified: true }
      })

      // Find or create user with this phone number
      let user = await prisma.user.findFirst({
        where: { phoneNumber: formattedPhone }
      })

      if (!user) {
        // Create new user with phone number
        user = await prisma.user.create({
          data: {
            phoneNumber: formattedPhone,
            name: `User ${formattedPhone.slice(-4)}`, // Temporary name
            email: `${formattedPhone.replace(/\D/g, '')}@sms.temp`, // Temporary email
            role: 'USER',
            isActive: true,
            phoneVerified: true,
            phoneVerifiedAt: new Date()
          }
        })
      } else {
        // Update existing user's phone verification status
        await prisma.user.update({
          where: { id: user.id },
          data: {
            phoneVerified: true,
            phoneVerifiedAt: new Date()
          }
        })
      }

      // Generate authentication token
      const token = generateToken({
        userId: user.id,
        role: user.role,
        phoneNumber: formattedPhone
      })

      logger.info('SMS authentication successful', {
        userId: user.id,
        phoneNumber: formattedPhone
      })

      return {
        success: true,
        token
      }
    } catch (error) {
      logger.error('Error verifying SMS code', error)
      return {
        success: false,
        error: 'An error occurred during verification'
      }
    }
  }

  /**
   * Resend verification code
   */
  async resendCode(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber)

      // Invalidate existing unverified codes
      await prisma.sMSVerification.updateMany({
        where: {
          phoneNumber: formattedPhone,
          verified: false
        },
        data: {
          verified: true // Mark as used to prevent reuse
        }
      })

      // Send new code
      return await this.sendVerificationCode(formattedPhone)
    } catch (error) {
      logger.error('Error resending SMS code', error)
      return {
        success: false,
        error: 'An error occurred while resending the code'
      }
    }
  }

  /**
   * Check if phone number is already verified
   */
  async isPhoneVerified(phoneNumber: string): Promise<boolean> {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber)
      
      const user = await prisma.user.findFirst({
        where: {
          phoneNumber: formattedPhone,
          phoneVerified: true
        }
      })

      return !!user
    } catch (error) {
      logger.error('Error checking phone verification status', error)
      return false
    }
  }

  /**
   * Get SMS authentication statistics
   */
  async getStats() {
    try {
      const [totalVerifications, successfulVerifications, recentVerifications] = await Promise.all([
        prisma.sMSVerification.count(),
        prisma.sMSVerification.count({
          where: { verified: true }
        }),
        prisma.sMSVerification.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        })
      ])

      return {
        totalVerifications,
        successfulVerifications,
        recentVerifications,
        successRate: totalVerifications > 0 ? (successfulVerifications / totalVerifications) * 100 : 0
      }
    } catch (error) {
      logger.error('Error getting SMS auth stats', error)
      return {
        totalVerifications: 0,
        successfulVerifications: 0,
        recentVerifications: 0,
        successRate: 0
      }
    }
  }

  /**
   * Cleanup expired verification codes
   */
  async cleanupExpiredCodes(): Promise<number> {
    try {
      const result = await prisma.sMSVerification.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      })

      logger.info(`Cleaned up ${result.count} expired SMS verification codes`)
      return result.count
    } catch (error) {
      logger.error('Error cleaning up expired SMS codes', error)
      return 0
    }
  }
}

// Export singleton instance
export const smsAuthService = new SMSAuthService()

// Convenience functions
export const sendSMSVerificationCode = (phoneNumber: string) => 
  smsAuthService.sendVerificationCode(phoneNumber)
export const verifySMSCode = (phoneNumber: string, code: string) => 
  smsAuthService.verifyCode(phoneNumber, code)
export const resendSMSCode = (phoneNumber: string) => 
  smsAuthService.resendCode(phoneNumber)
export const isPhoneVerified = (phoneNumber: string) => 
  smsAuthService.isPhoneVerified(phoneNumber)
export const getSMSAuthStats = () => smsAuthService.getStats()
export const cleanupExpiredSMSCodes = () => smsAuthService.cleanupExpiredCodes()
