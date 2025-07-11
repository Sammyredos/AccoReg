/**
 * Enhanced Settings Import API
 * POST /api/admin/settings/import
 * Imports settings from backup files with email configuration support
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyToken } from '@/lib/auth'
import { Logger } from '@/lib/logger'

const prisma = new PrismaClient()
const logger = new Logger('Settings-Import')

export async function POST(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify token
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Determine if this is an admin or user based on the token type
    const userType = payload.type || 'admin'

    let user
    if (userType === 'admin') {
      user = await prisma.admin.findUnique({
        where: { id: payload.adminId },
        include: { role: true }
      })
    } else {
      user = await prisma.user.findUnique({
        where: { id: payload.adminId },
        include: { role: true }
      })
    }

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 })
    }

    // Check if user has Super Admin privileges (import is more sensitive)
    if (user.role?.name !== 'Super Admin') {
      return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.name.endsWith('.json')) {
      return NextResponse.json({ error: 'Invalid file type. Please upload a JSON file.' }, { status: 400 })
    }

    // Parse the backup file
    const fileContent = await file.text()
    let backupData

    try {
      backupData = JSON.parse(fileContent)
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON file' }, { status: 400 })
    }

    // Validate backup structure
    if (!backupData.data || !backupData.timestamp) {
      return NextResponse.json({ error: 'Invalid backup file structure' }, { status: 400 })
    }

    // Enhanced settings import with detailed tracking
    let importedCount = 0
    let updatedCount = 0
    let skippedCount = 0
    const errors: string[] = []
    const importResults: Array<{
      category: string
      key: string
      name: string
      action: 'imported' | 'updated' | 'skipped'
      reason?: string
    }> = []

    if (backupData.data.settings) {
      logger.info('Starting settings import', {
        userId: user.id,
        settingsCount: backupData.data.settings.length,
        backupTimestamp: backupData.timestamp
      })

      for (const setting of backupData.data.settings) {
        try {
          // Check if setting already exists
          const existingSetting = await prisma.setting.findFirst({
            where: {
              category: setting.category,
              key: setting.key
            }
          })

          if (existingSetting) {
            // Update existing setting
            await prisma.setting.update({
              where: { id: existingSetting.id },
              data: {
                name: setting.name,
                value: setting.value,
                type: setting.type,
                description: setting.description || existingSetting.description,
                options: setting.options || existingSetting.options,
                updatedAt: new Date()
              }
            })
            updatedCount++
            importResults.push({
              category: setting.category,
              key: setting.key,
              name: setting.name,
              action: 'updated',
              reason: 'Setting existed and was updated'
            })
          } else {
            // Create new setting
            await prisma.setting.create({
              data: {
                category: setting.category,
                key: setting.key,
                name: setting.name,
                value: setting.value,
                type: setting.type,
                description: setting.description || '',
                options: setting.options,
                isSystem: setting.isSystem || false,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            })
            importedCount++
            importResults.push({
              category: setting.category,
              key: setting.key,
              name: setting.name,
              action: 'imported',
              reason: 'New setting created'
            })
          }
        } catch (error) {
          const errorMsg = `Failed to import ${setting.category}.${setting.key}: ${error instanceof Error ? error.message : 'Unknown error'}`
          errors.push(errorMsg)
          logger.error(errorMsg, error)
          importResults.push({
            category: setting.category,
            key: setting.key,
            name: setting.name,
            action: 'skipped',
            reason: error instanceof Error ? error.message : 'Unknown error'
          })
          skippedCount++
        }
      }
    }

    // Verify email configuration after import
    const emailSettings = await prisma.setting.findMany({
      where: { category: 'email' }
    })

    const emailSettingsMap = emailSettings.reduce((acc, setting) => {
      try {
        acc[setting.key] = JSON.parse(setting.value)
      } catch {
        acc[setting.key] = setting.value
      }
      return acc
    }, {} as Record<string, any>)

    const isEmailConfigured = !!(emailSettingsMap.smtpHost && emailSettingsMap.smtpUser && emailSettingsMap.smtpPass)

    logger.info('Settings import completed', {
      userId: user.id,
      imported: importedCount,
      updated: updatedCount,
      skipped: skippedCount,
      errors: errors.length,
      emailConfigured: isEmailConfigured
    })

    return NextResponse.json({
      success: true,
      message: 'Settings imported successfully',
      summary: {
        imported: importedCount,
        updated: updatedCount,
        skipped: skippedCount,
        total: importedCount + updatedCount + skippedCount,
        errors: errors.length
      },
      email_status: {
        configured: isEmailConfigured,
        smtp_host: emailSettingsMap.smtpHost || null,
        smtp_user: emailSettingsMap.smtpUser || null,
        from_name: emailSettingsMap.emailFromName || null,
        has_password: !!emailSettingsMap.smtpPass
      },
      results: importResults,
      errors: errors.length > 0 ? errors : undefined,
      backup_info: backupData.data.system_info || null,
      importedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Failed to import data' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
