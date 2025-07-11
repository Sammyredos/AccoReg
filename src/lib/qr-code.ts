/**
 * QR Code Generation and Verification Utilities
 */

import QRCode from 'qrcode'
import { prisma } from './db'
import { Logger } from './logger'

const logger = Logger('QRCode')

export interface RegistrationQRData {
  id: string
  fullName: string
  gender: string
  dateOfBirth: string
  phoneNumber: string
  emailAddress: string
  timestamp: number
  checksum: string
}

export interface QRGenerationResult {
  success: boolean
  qrCode?: string
  qrDataUrl?: string
  error?: string
}

export interface QRVerificationResult {
  success: boolean
  registration?: any
  error?: string
  isValid?: boolean
}

class QRCodeService {
  private readonly SECRET_KEY = process.env.QR_SECRET_KEY || 'mopgomglobal-qr-secret-2024'

  /**
   * Generate checksum for QR data integrity
   */
  private generateChecksum(data: Omit<RegistrationQRData, 'checksum'>): string {
    const dataString = `${data.id}:${data.fullName}:${data.gender}:${data.dateOfBirth}:${data.phoneNumber}:${data.emailAddress}:${data.timestamp}:${this.SECRET_KEY}`
    
    // Simple checksum using character codes
    let checksum = 0
    for (let i = 0; i < dataString.length; i++) {
      checksum += dataString.charCodeAt(i)
    }
    
    return checksum.toString(36).toUpperCase()
  }

  /**
   * Verify checksum for QR data integrity
   */
  private verifyChecksum(data: RegistrationQRData): boolean {
    const expectedChecksum = this.generateChecksum({
      id: data.id,
      fullName: data.fullName,
      gender: data.gender,
      dateOfBirth: data.dateOfBirth,
      phoneNumber: data.phoneNumber,
      emailAddress: data.emailAddress,
      timestamp: data.timestamp
    })
    
    return data.checksum === expectedChecksum
  }

  /**
   * Generate QR code for a registration
   */
  async generateRegistrationQR(registrationId: string): Promise<QRGenerationResult> {
    try {
      // Get registration data
      const registration = await prisma.registration.findUnique({
        where: { id: registrationId }
      })

      if (!registration) {
        return {
          success: false,
          error: 'Registration not found'
        }
      }

      // Create QR data
      const qrData: RegistrationQRData = {
        id: registration.id,
        fullName: registration.fullName,
        gender: registration.gender,
        dateOfBirth: registration.dateOfBirth.toISOString(),
        phoneNumber: registration.phoneNumber,
        emailAddress: registration.emailAddress,
        timestamp: Date.now(),
        checksum: ''
      }

      // Generate checksum
      qrData.checksum = this.generateChecksum(qrData)

      // Convert to JSON string
      const qrString = JSON.stringify(qrData)

      // Generate QR code as data URL
      const qrDataUrl = await QRCode.toDataURL(qrString, {
        errorCorrectionLevel: 'M',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256
      })

      // Update registration with QR code
      await prisma.registration.update({
        where: { id: registrationId },
        data: { qrCode: qrString }
      })

      logger.info('QR code generated for registration', {
        registrationId,
        fullName: registration.fullName
      })

      return {
        success: true,
        qrCode: qrString,
        qrDataUrl
      }

    } catch (error) {
      logger.error('Error generating QR code', error)
      return {
        success: false,
        error: 'Failed to generate QR code'
      }
    }
  }

  /**
   * Verify and decode QR code data
   */
  async verifyQRCode(qrString: string): Promise<QRVerificationResult> {
    try {
      // Parse QR data
      let qrData: RegistrationQRData
      try {
        qrData = JSON.parse(qrString)
      } catch {
        return {
          success: false,
          error: 'Invalid QR code format',
          isValid: false
        }
      }

      // Verify checksum
      if (!this.verifyChecksum(qrData)) {
        return {
          success: false,
          error: 'QR code integrity check failed',
          isValid: false
        }
      }

      // QR codes don't expire until they are detected/scanned by the application
      // This ensures QR codes remain valid until actually used for verification

      // Get registration from database
      const registration = await prisma.registration.findUnique({
        where: { id: qrData.id }
      })

      if (!registration) {
        return {
          success: false,
          error: 'Registration not found',
          isValid: false
        }
      }

      // Verify registration data matches QR data
      if (
        registration.fullName !== qrData.fullName ||
        registration.gender !== qrData.gender ||
        registration.phoneNumber !== qrData.phoneNumber ||
        registration.emailAddress !== qrData.emailAddress
      ) {
        return {
          success: false,
          error: 'Registration data mismatch',
          isValid: false
        }
      }

      logger.info('QR code verified successfully', {
        registrationId: qrData.id,
        fullName: qrData.fullName
      })

      return {
        success: true,
        registration,
        isValid: true
      }

    } catch (error) {
      logger.error('Error verifying QR code', error)
      return {
        success: false,
        error: 'Failed to verify QR code',
        isValid: false
      }
    }
  }

  /**
   * Generate QR codes for all registrations that don't have them
   */
  async generateMissingQRCodes(): Promise<{ success: boolean; generated: number; errors: number }> {
    try {
      const registrationsWithoutQR = await prisma.registration.findMany({
        where: { qrCode: null },
        select: { id: true, fullName: true }
      })

      let generated = 0
      let errors = 0

      for (const registration of registrationsWithoutQR) {
        const result = await this.generateRegistrationQR(registration.id)
        if (result.success) {
          generated++
        } else {
          errors++
          logger.error('Failed to generate QR for registration', {
            registrationId: registration.id,
            error: result.error
          })
        }
      }

      logger.info('Bulk QR generation completed', { generated, errors })

      return { success: true, generated, errors }

    } catch (error) {
      logger.error('Error in bulk QR generation', error)
      return { success: false, generated: 0, errors: 1 }
    }
  }
}

// Export singleton instance
export const qrCodeService = new QRCodeService()

// Convenience functions
export const generateRegistrationQR = (registrationId: string) => 
  qrCodeService.generateRegistrationQR(registrationId)
export const verifyQRCode = (qrString: string) => 
  qrCodeService.verifyQRCode(qrString)
export const generateMissingQRCodes = () => 
  qrCodeService.generateMissingQRCodes()
