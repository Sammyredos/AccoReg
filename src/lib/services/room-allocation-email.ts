/**
 * Room Allocation Email Service
 * Handles sending room allocation emails to registrants
 */

import { PrismaClient } from '@prisma/client'
import { sendEmail } from '@/lib/email'
import { generateRoomAllocationEmail, generateRoomAllocationTextEmail } from '@/lib/email-templates/room-allocation'
import { Logger } from '@/lib/logger'

const prisma = new PrismaClient()
const logger = new Logger('RoomAllocationEmail')

interface SendRoomAllocationEmailOptions {
  registrationId: string
  allocatedBy: string
  eventDetails?: {
    name: string
    startDate: string
    endDate: string
    venue: string
    checkInTime?: string
    checkOutTime?: string
  }
}

interface BulkSendOptions {
  registrationIds: string[]
  allocatedBy: string
  eventDetails?: {
    name: string
    startDate: string
    endDate: string
    venue: string
    checkInTime?: string
    checkOutTime?: string
  }
}

export class RoomAllocationEmailService {
  
  /**
   * Send room allocation email to a single registrant
   */
  static async sendRoomAllocationEmail(options: SendRoomAllocationEmailOptions): Promise<{ success: boolean; error?: string }> {
    try {
      const { registrationId, allocatedBy, eventDetails } = options
      
      logger.info('Sending room allocation email', { registrationId, allocatedBy })
      
      // Get registration with room allocation and roommates
      const registration = await prisma.registration.findUnique({
        where: { id: registrationId },
        include: {
          roomAllocation: {
            include: {
              room: {
                include: {
                  allocations: {
                    include: {
                      registration: {
                        select: {
                          id: true,
                          fullName: true,
                          phoneNumber: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      })

      if (!registration) {
        throw new Error('Registration not found')
      }

      if (!registration.roomAllocation) {
        throw new Error('Registration is not allocated to any room')
      }

      // Get roommates (exclude the current registrant)
      const roommates = registration.roomAllocation.room.allocations
        .filter(allocation => allocation.registrationId !== registrationId)
        .map(allocation => ({
          fullName: allocation.registration.fullName,
          phoneNumber: allocation.registration.phoneNumber
        }))

      // Prepare email data
      const emailData = {
        registrant: {
          id: registration.id,
          fullName: registration.fullName,
          emailAddress: registration.emailAddress,
          phoneNumber: registration.phoneNumber,
          gender: registration.gender,
          dateOfBirth: registration.dateOfBirth.toISOString()
        },
        room: {
          id: registration.roomAllocation.room.id,
          name: registration.roomAllocation.room.name,
          gender: registration.roomAllocation.room.gender,
          capacity: registration.roomAllocation.room.capacity,
          currentOccupancy: registration.roomAllocation.room.allocations.length
        },
        roommates,
        allocationDate: registration.roomAllocation.allocatedAt.toISOString(),
        allocatedBy,
        eventDetails
      }

      // Generate email content
      const htmlContent = generateRoomAllocationEmail(emailData)
      const textContent = generateRoomAllocationTextEmail(emailData)

      // Send email
      await sendEmail({
        to: [registration.emailAddress],
        subject: `🏠 Room Allocation Confirmed - ${registration.roomAllocation.room.name}`,
        html: htmlContent,
        text: textContent
      })

      logger.info('Room allocation email sent successfully', {
        registrationId,
        email: registration.emailAddress,
        roomName: registration.roomAllocation.room.name
      })

      return { success: true }

    } catch (error) {
      logger.error('Failed to send room allocation email', error, { registrationId: options.registrationId })
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Send room allocation emails to multiple registrants
   */
  static async sendBulkRoomAllocationEmails(options: BulkSendOptions): Promise<{
    success: boolean
    results: Array<{ registrationId: string; success: boolean; error?: string }>
    summary: { total: number; successful: number; failed: number }
  }> {
    try {
      const { registrationIds, allocatedBy, eventDetails } = options
      
      logger.info('Sending bulk room allocation emails', { 
        count: registrationIds.length, 
        allocatedBy 
      })

      const results: Array<{ registrationId: string; success: boolean; error?: string }> = []

      // Send emails with delay to avoid rate limiting
      for (const registrationId of registrationIds) {
        try {
          const result = await this.sendRoomAllocationEmail({
            registrationId,
            allocatedBy,
            eventDetails
          })

          results.push({
            registrationId,
            success: result.success,
            error: result.error
          })

          // Add small delay between emails to avoid overwhelming the email service
          await new Promise(resolve => setTimeout(resolve, 500))

        } catch (error) {
          results.push({
            registrationId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length

      logger.info('Bulk room allocation emails completed', {
        total: registrationIds.length,
        successful,
        failed
      })

      return {
        success: true,
        results,
        summary: {
          total: registrationIds.length,
          successful,
          failed
        }
      }

    } catch (error) {
      logger.error('Failed to send bulk room allocation emails', error)
      return {
        success: false,
        results: [],
        summary: { total: 0, successful: 0, failed: 0 }
      }
    }
  }

  /**
   * Get default event details from settings
   */
  static async getDefaultEventDetails(): Promise<{
    name: string
    startDate: string
    endDate: string
    venue: string
    checkInTime?: string
    checkOutTime?: string
  } | null> {
    try {
      const eventSettings = await prisma.setting.findMany({
        where: {
          category: 'event',
          key: {
            in: ['eventName', 'eventStartDate', 'eventEndDate', 'eventVenue', 'checkInTime', 'checkOutTime']
          }
        }
      })

      const getSetting = (key: string) => {
        const setting = eventSettings.find(s => s.key === key)
        if (!setting) return null
        try {
          return JSON.parse(setting.value)
        } catch {
          return setting.value
        }
      }

      const eventName = getSetting('eventName')
      const startDate = getSetting('eventStartDate')
      const endDate = getSetting('eventEndDate')
      const venue = getSetting('eventVenue')

      if (!eventName || !startDate || !endDate || !venue) {
        return null
      }

      return {
        name: eventName,
        startDate,
        endDate,
        venue,
        checkInTime: getSetting('checkInTime'),
        checkOutTime: getSetting('checkOutTime')
      }

    } catch (error) {
      logger.error('Failed to get default event details', error)
      return null
    }
  }

  /**
   * Send room allocation email with default event details
   */
  static async sendRoomAllocationEmailWithDefaults(
    registrationId: string, 
    allocatedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    const eventDetails = await this.getDefaultEventDetails()
    
    return this.sendRoomAllocationEmail({
      registrationId,
      allocatedBy,
      eventDetails
    })
  }

  /**
   * Send bulk room allocation emails with default event details
   */
  static async sendBulkRoomAllocationEmailsWithDefaults(
    registrationIds: string[], 
    allocatedBy: string
  ): Promise<{
    success: boolean
    results: Array<{ registrationId: string; success: boolean; error?: string }>
    summary: { total: number; successful: number; failed: number }
  }> {
    const eventDetails = await this.getDefaultEventDetails()
    
    return this.sendBulkRoomAllocationEmails({
      registrationIds,
      allocatedBy,
      eventDetails
    })
  }
}
