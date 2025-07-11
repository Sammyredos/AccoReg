import { prisma } from './db'
import { createLogger } from './logger'

const logger = createLogger('GDPR')

export interface DataExportRequest {
  userId: string
  email: string
  requestDate: Date
  status: 'pending' | 'processing' | 'completed' | 'failed'
  downloadUrl?: string
  expiresAt?: Date
}

export interface DataDeletionRequest {
  userId: string
  email: string
  requestDate: Date
  scheduledDeletionDate: Date
  status: 'pending' | 'processing' | 'completed' | 'cancelled'
  reason?: string
}

export interface ConsentRecord {
  userId: string
  consentType: 'marketing' | 'analytics' | 'functional' | 'necessary'
  granted: boolean
  timestamp: Date
  ipAddress?: string
  userAgent?: string
  version: string
}

export class GDPRCompliance {
  
  // Data Export (Right to Data Portability)
  async requestDataExport(userId: string, email: string): Promise<DataExportRequest> {
    try {
      logger.info('Data export requested', { userId, email })

      // Check if user exists
      const user = await this.findUser(userId, email)
      if (!user) {
        throw new Error('User not found')
      }

      // Create export request record
      const exportRequest: DataExportRequest = {
        userId,
        email,
        requestDate: new Date(),
        status: 'pending'
      }

      // Store request in database (you'd need to create this table)
      await this.storeExportRequest(exportRequest)

      // Schedule export processing (in production, use a job queue)
      setTimeout(() => this.processDataExport(exportRequest), 1000)

      return exportRequest

    } catch (error) {
      logger.error('Failed to request data export', error, { userId, email })
      throw error
    }
  }

  async processDataExport(request: DataExportRequest): Promise<void> {
    try {
      logger.info('Processing data export', { userId: request.userId })

      // Update status to processing
      await this.updateExportRequestStatus(request.userId, 'processing')

      // Collect all user data
      const userData = await this.collectUserData(request.userId, request.email)

      // Generate export file
      const exportData = {
        exportDate: new Date().toISOString(),
        userId: request.userId,
        email: request.email,
        data: userData,
        metadata: {
          version: '1.0',
          format: 'JSON',
          gdprCompliant: true
        }
      }

      // In production, save to secure file storage and generate download URL
      const downloadUrl = await this.generateSecureDownloadUrl(exportData)

      // Update request with download URL and expiration
      await this.updateExportRequestStatus(request.userId, 'completed', {
        downloadUrl,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      })

      logger.info('Data export completed', { 
        userId: request.userId,
        downloadUrl: downloadUrl ? 'generated' : 'failed'
      })

    } catch (error) {
      logger.error('Failed to process data export', error, { userId: request.userId })
      await this.updateExportRequestStatus(request.userId, 'failed')
    }
  }

  // Data Deletion (Right to be Forgotten)
  async requestDataDeletion(userId: string, email: string, reason?: string): Promise<DataDeletionRequest> {
    try {
      logger.info('Data deletion requested', { userId, email, reason })

      // Check if user exists
      const user = await this.findUser(userId, email)
      if (!user) {
        throw new Error('User not found')
      }

      // Create deletion request with 30-day grace period
      const deletionRequest: DataDeletionRequest = {
        userId,
        email,
        requestDate: new Date(),
        scheduledDeletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        status: 'pending',
        reason
      }

      // Store request in database
      await this.storeDeletionRequest(deletionRequest)

      // Send confirmation email (implement email service)
      await this.sendDeletionConfirmationEmail(email, deletionRequest.scheduledDeletionDate)

      return deletionRequest

    } catch (error) {
      logger.error('Failed to request data deletion', error, { userId, email })
      throw error
    }
  }

  async processPendingDeletions(): Promise<void> {
    try {
      const pendingDeletions = await this.getPendingDeletions()
      
      for (const deletion of pendingDeletions) {
        if (new Date() >= deletion.scheduledDeletionDate) {
          await this.executeDataDeletion(deletion)
        }
      }

    } catch (error) {
      logger.error('Failed to process pending deletions', error)
    }
  }

  async executeDataDeletion(request: DataDeletionRequest): Promise<void> {
    try {
      logger.info('Executing data deletion', { userId: request.userId })

      await this.updateDeletionRequestStatus(request.userId, 'processing')

      // Delete user data from all tables
      await this.deleteUserData(request.userId, request.email)

      await this.updateDeletionRequestStatus(request.userId, 'completed')

      logger.info('Data deletion completed', { userId: request.userId })

    } catch (error) {
      logger.error('Failed to execute data deletion', error, { userId: request.userId })
      await this.updateDeletionRequestStatus(request.userId, 'failed')
    }
  }

  // Consent Management
  async recordConsent(consent: ConsentRecord): Promise<void> {
    try {
      logger.info('Recording consent', { 
        userId: consent.userId,
        consentType: consent.consentType,
        granted: consent.granted
      })

      // Store consent record (you'd need to create this table)
      await this.storeConsentRecord(consent)

    } catch (error) {
      logger.error('Failed to record consent', error, consent)
      throw error
    }
  }

  async getConsentHistory(userId: string): Promise<ConsentRecord[]> {
    try {
      return await this.getStoredConsents(userId)
    } catch (error) {
      logger.error('Failed to get consent history', error, { userId })
      return []
    }
  }

  // Data Anonymization
  async anonymizeUser(userId: string, email: string): Promise<void> {
    try {
      logger.info('Anonymizing user data', { userId, email })

      // Replace personal data with anonymized values
      const anonymizedData = {
        fullName: `Anonymous User ${userId.slice(-6)}`,
        emailAddress: `anonymous-${userId.slice(-6)}@anonymized.local`,
        phoneNumber: 'ANONYMIZED',
        address: 'ANONYMIZED',
        emergencyContactName: 'ANONYMIZED',
        emergencyContactPhone: 'ANONYMIZED',
        medicalInfo: 'ANONYMIZED',
        // Keep non-personal data for analytics
        dateOfBirth: null, // Remove exact birth date
        gender: null, // Remove gender
        createdAt: undefined, // Keep creation date for analytics
        updatedAt: new Date()
      }

      // Update registration record
      await prisma.registration.updateMany({
        where: { emailAddress: email },
        data: anonymizedData
      })

      logger.info('User data anonymized', { userId, email })

    } catch (error) {
      logger.error('Failed to anonymize user data', error, { userId, email })
      throw error
    }
  }

  // Helper methods (implement based on your database schema)
  private async findUser(userId: string, email: string) {
    // Try to find in registrations first
    let user = await prisma.registration.findFirst({
      where: { 
        OR: [
          { id: userId },
          { emailAddress: email }
        ]
      }
    })

    if (!user) {
      // Try to find in admin/user tables
      const adminUser = await prisma.admin.findFirst({
        where: {
          OR: [
            { id: userId },
            { email: email }
          ]
        }
      })

      if (adminUser) {
        // Convert admin user to match registration structure for GDPR purposes
        user = {
          id: adminUser.id,
          fullName: adminUser.name,
          emailAddress: adminUser.email,
          // Add required fields with default values for GDPR export
          gender: 'Not specified',
          dateOfBirth: new Date('1900-01-01'),
          address: 'Not specified',
          phoneNumber: 'Not specified',
          emergencyContactName: 'Not specified',
          emergencyContactRelationship: 'Not specified',
          emergencyContactPhone: 'Not specified',
          parentGuardianName: null,
          parentGuardianPhone: null,
          parentGuardianEmail: null,
          roommateRequestConfirmationNumber: null,
          medications: null,
          allergies: null,
          specialNeeds: null,
          dietaryRestrictions: null,
          parentalPermissionGranted: false,
          parentalPermissionDate: null,
          createdAt: adminUser.createdAt,
          updatedAt: adminUser.updatedAt
        }
      }
    }

    return user
  }

  private async collectUserData(userId: string, email: string) {
    // Collect all user data from various tables
    const data: any = {}

    // Registration data
    const registration = await prisma.registration.findFirst({
      where: { 
        OR: [
          { id: userId },
          { emailAddress: email }
        ]
      }
    })
    if (registration) data.registration = registration

    // Messages
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderEmail: email },
          { recipientEmail: email }
        ]
      }
    })
    if (messages.length > 0) data.messages = messages

    // Room allocations
    const allocations = await prisma.roomAllocation.findMany({
      where: { registrationId: userId }
    })
    if (allocations.length > 0) data.roomAllocations = allocations

    // Add more data sources as needed

    return data
  }

  private async deleteUserData(userId: string, email: string) {
    // Delete in correct order to respect foreign key constraints
    
    // Delete room allocations
    await prisma.roomAllocation.deleteMany({
      where: { registrationId: userId }
    })

    // Delete messages
    await prisma.message.deleteMany({
      where: {
        OR: [
          { senderEmail: email },
          { recipientEmail: email }
        ]
      }
    })

    // Delete registration
    await prisma.registration.deleteMany({
      where: {
        OR: [
          { id: userId },
          { emailAddress: email }
        ]
      }
    })

    // Delete from admin/user tables if applicable
    await prisma.admin.deleteMany({
      where: {
        OR: [
          { id: userId },
          { email: email }
        ]
      }
    })
  }

  // Placeholder methods for database operations
  // In production, implement these with proper database tables
  private async storeExportRequest(request: DataExportRequest) {
    // Store in gdpr_export_requests table
    logger.debug('Storing export request', request)
  }

  private async updateExportRequestStatus(userId: string, status: string, updates?: any) {
    // Update export request status
    logger.debug('Updating export request status', { userId, status, updates })
  }

  private async storeDeletionRequest(request: DataDeletionRequest) {
    // Store in gdpr_deletion_requests table
    logger.debug('Storing deletion request', request)
  }

  private async updateDeletionRequestStatus(userId: string, status: string) {
    // Update deletion request status
    logger.debug('Updating deletion request status', { userId, status })
  }

  private async getPendingDeletions(): Promise<DataDeletionRequest[]> {
    // Get pending deletion requests
    return []
  }

  private async storeConsentRecord(consent: ConsentRecord) {
    // Store in gdpr_consent_records table
    logger.debug('Storing consent record', consent)
  }

  private async getStoredConsents(_userId: string): Promise<ConsentRecord[]> {
    // Get consent history from database
    return []
  }

  private async generateSecureDownloadUrl(_data: any): Promise<string> {
    // Generate secure, time-limited download URL
    return `https://secure-downloads.example.com/export-${Date.now()}.json`
  }

  private async sendDeletionConfirmationEmail(email: string, scheduledDate: Date) {
    // Send confirmation email about scheduled deletion
    logger.info('Deletion confirmation email sent', { email, scheduledDate })
  }
}

export const gdprCompliance = new GDPRCompliance()
