import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface NotificationData {
  type: string
  title: string
  message: string
  priority?: 'low' | 'medium' | 'high'
  recipientId?: string
  metadata?: Record<string, any>
  authorizedBy?: string
  authorizedByEmail?: string
}

export class NotificationService {
  static async create(data: NotificationData) {
    try {
      const notification = await prisma.notification.create({
        data: {
          type: data.type,
          title: data.title,
          message: data.message,
          priority: data.priority || 'medium',
          recipientId: data.recipientId,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
          authorizedBy: data.authorizedBy,
          authorizedByEmail: data.authorizedByEmail
        }
      })
      return notification
    } catch (error) {
      // In production, this should be logged to a proper logging system
      // For now, we'll silently fail to prevent UI disruption
      throw new Error(`Failed to create notification: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  static async createNewRegistrationNotification(registration: any) {
    return this.create({
      type: 'new_registration',
      title: 'New Registration Received',
      message: `${registration.fullName} has completed their registration and is awaiting approval.`,
      priority: 'high',
      metadata: {
        registrationId: registration.id,
        userEmail: registration.emailAddress,
        userName: registration.fullName
      }
    })
  }

  static async createSystemMaintenanceNotification(maintenanceInfo: {
    startTime: string
    endTime: string
    description?: string
  }) {
    return this.create({
      type: 'system_maintenance',
      title: 'System Maintenance Scheduled',
      message: `Scheduled maintenance will occur from ${maintenanceInfo.startTime} to ${maintenanceInfo.endTime}. ${maintenanceInfo.description || ''}`,
      priority: 'medium',
      metadata: maintenanceInfo
    })
  }

  static async createUserCreatedNotification(user: any, createdBy: string) {
    return this.create({
      type: 'user_created',
      title: 'New User Account Created',
      message: `A new user account has been created for ${user.name} (${user.email}).`,
      priority: 'medium',
      metadata: {
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        createdBy
      }
    })
  }

  static async createUserDeletedNotification(user: any, deletedBy: string) {
    return this.create({
      type: 'user_deleted',
      title: 'User Account Deleted',
      message: `User account for ${user.name} (${user.email}) has been deleted.`,
      priority: 'medium',
      metadata: {
        userEmail: user.email,
        userName: user.name,
        deletedBy
      }
    })
  }

  static async createApprovalRequiredNotification(count: number) {
    return this.create({
      type: 'approval_required',
      title: 'Pending Approvals',
      message: `${count} registrations are pending your approval. Review them in the registrations section.`,
      priority: 'high',
      metadata: {
        pendingCount: count
      }
    })
  }

  static async createReportReadyNotification(reportType: string, reportId?: string) {
    return this.create({
      type: 'report_ready',
      title: `${reportType} Report Generated`,
      message: `Your ${reportType.toLowerCase()} report is ready for download.`,
      priority: 'low',
      metadata: {
        reportType,
        reportId
      }
    })
  }

  static async createEmailSentNotification(emailType: string, count: number) {
    return this.create({
      type: 'email_sent',
      title: `${emailType} Emails Sent`,
      message: `${emailType} emails have been sent to ${count} recipients.`,
      priority: 'low',
      metadata: {
        emailType,
        recipientCount: count
      }
    })
  }

  static async createSecurityAlertNotification(alertType: string, details: string) {
    return this.create({
      type: 'security_alert',
      title: 'Security Alert',
      message: `${alertType}: ${details}`,
      priority: 'high',
      metadata: {
        alertType,
        details
      }
    })
  }

  static async createBackupNotification(success: boolean, details?: string) {
    return this.create({
      type: 'backup_status',
      title: success ? 'Backup Completed Successfully' : 'Backup Failed',
      message: success
        ? 'System backup has been completed successfully.'
        : `System backup failed. ${details || 'Please check system logs.'}`,
      priority: success ? 'low' : 'high',
      metadata: {
        success,
        details
      }
    })
  }

  // Helper method to get notification icon and color based on type
  static getNotificationDisplay(type: string) {
    const displays: Record<string, { icon: string, color: string }> = {
      new_registration: { icon: 'Users', color: 'from-green-500 to-emerald-600' },
      system_maintenance: { icon: 'Settings', color: 'from-blue-500 to-cyan-600' },
      approval_required: { icon: 'AlertCircle', color: 'from-yellow-500 to-orange-600' },
      report_ready: { icon: 'FileText', color: 'from-purple-500 to-pink-600' },
      email_sent: { icon: 'Mail', color: 'from-indigo-500 to-purple-600' },
      user_created: { icon: 'UserPlus', color: 'from-green-500 to-blue-600' },
      user_deleted: { icon: 'UserMinus', color: 'from-red-500 to-pink-600' },
      security_alert: { icon: 'Shield', color: 'from-red-500 to-orange-600' },
      backup_status: { icon: 'Database', color: 'from-gray-500 to-gray-600' },
      default: { icon: 'Bell', color: 'from-gray-500 to-gray-600' }
    }

    return displays[type] || displays.default
  }

  // Helper method to format time ago
  static formatTimeAgo(date: Date): string {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) {
      return 'Just now'
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours} hour${hours > 1 ? 's' : ''} ago`
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400)
      return `${days} day${days > 1 ? 's' : ''} ago`
    } else {
      return date.toLocaleDateString()
    }
  }
}
