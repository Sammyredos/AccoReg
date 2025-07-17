import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createLogger } from '@/lib/logger'

const logger = createLogger('BackupImport')

// Helper function to safely import data with conflict resolution
async function importWithConflictResolution<T extends { id: string }>(
  tx: any,
  tableName: string,
  data: T[],
  createFn: (item: Omit<T, 'id'>) => Promise<any>,
  updateFn?: (id: string, item: Partial<T>) => Promise<any>
) {
  const stats = { imported: 0, skipped: 0, errors: 0 }

  for (const item of data) {
    try {
      // Check if record exists
      const existing = await (tx as any)[tableName].findUnique({
        where: { id: item.id }
      })

      if (existing) {
        if (updateFn) {
          await updateFn(item.id, item)
          stats.imported++
        } else {
          stats.skipped++
        }
      } else {
        await createFn(item)
        stats.imported++
      }
    } catch (error) {
      logger.error(`Failed to import ${tableName} record`, { id: item.id, error })
      stats.errors++
    }
  }

  return stats
}

// Import roles
async function importRoles(tx: any, roles: any[]) {
  return importWithConflictResolution(
    tx,
    'role',
    roles,
    async (role) => {
      const { id, ...roleData } = role
      return tx.role.create({
        data: { id, ...roleData }
      })
    },
    async (id, role) => {
      const { id: _, ...roleData } = role
      return tx.role.update({
        where: { id },
        data: roleData
      })
    }
  )
}

// Import admins
async function importAdmins(tx: any, admins: any[]) {
  return importWithConflictResolution(
    tx,
    'admin',
    admins,
    async (admin) => {
      const { id, role, ...adminData } = admin
      return tx.admin.create({
        data: {
          id,
          ...adminData,
          roleId: role?.id || adminData.roleId
        }
      })
    }
  )
}

// Import settings
async function importSettings(tx: any, settings: any[]) {
  return importWithConflictResolution(
    tx,
    'setting',
    settings,
    async (setting) => {
      const { id, ...settingData } = setting
      return tx.setting.create({
        data: { id, ...settingData }
      })
    },
    async (id, setting) => {
      const { id: _, ...settingData } = setting
      return tx.setting.update({
        where: { id },
        data: settingData
      })
    }
  )
}

// Import registrations
async function importRegistrations(tx: any, registrations: any[]) {
  return importWithConflictResolution(
    tx,
    'registration',
    registrations,
    async (registration) => {
      const { id, roomAllocation, ...regData } = registration
      return tx.registration.create({
        data: { id, ...regData }
      })
    }
  )
}

// Import children registrations
async function importChildrenRegistrations(tx: any, childrenRegistrations: any[]) {
  return importWithConflictResolution(
    tx,
    'childrenRegistration',
    childrenRegistrations,
    async (registration) => {
      const { id, ...regData } = registration
      return tx.childrenRegistration.create({
        data: { id, ...regData }
      })
    }
  )
}



// Import rooms
async function importRooms(tx: any, rooms: any[]) {
  return importWithConflictResolution(
    tx,
    'room',
    rooms,
    async (room) => {
      const { id, allocations, ...roomData } = room
      return tx.room.create({
        data: { id, ...roomData }
      })
    }
  )
}

// Import room allocations
async function importRoomAllocations(tx: any, roomAllocations: any[]) {
  return importWithConflictResolution(
    tx,
    'roomAllocation',
    roomAllocations,
    async (allocation) => {
      const { id, room, registration, ...allocData } = allocation
      return tx.roomAllocation.create({
        data: { id, ...allocData }
      })
    }
  )
}

// Import users
async function importUsers(tx: any, users: any[]) {
  return importWithConflictResolution(
    tx,
    'user',
    users,
    async (user) => {
      const { id, ...userData } = user
      return tx.user.create({
        data: { id, ...userData }
      })
    }
  )
}

// Import permissions
async function importPermissions(tx: any, permissions: any[]) {
  return importWithConflictResolution(
    tx,
    'permission',
    permissions,
    async (permission) => {
      const { id, roles, ...permData } = permission
      return tx.permission.create({
        data: { id, ...permData }
      })
    }
  )
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const currentUser = await prisma.admin.findUnique({
      where: { id: payload.adminId },
      include: { role: true }
    })

    if (!currentUser || !['Super Admin'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Only Super Admin can import backups' }, { status: 403 })
    }

    // Parse the uploaded file
    const formData = await request.formData()
    const file = formData.get('file') as File || formData.get('backup') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No backup file provided' }, { status: 400 })
    }

    if (!file.name.endsWith('.json')) {
      return NextResponse.json({ error: 'Invalid file format. Only JSON files are supported.' }, { status: 400 })
    }

    // Read and parse the backup data
    const fileContent = await file.text()
    let backupData: any

    try {
      backupData = JSON.parse(fileContent)
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON format' }, { status: 400 })
    }

    // Validate backup structure
    if (!backupData.metadata || !backupData.data) {
      return NextResponse.json({ error: 'Invalid backup file structure' }, { status: 400 })
    }

    logger.info('Starting database import', {
      userId: currentUser.id,
      backupDate: backupData.metadata.exportDate,
      totalRecords: backupData.metadata.totalRecords
    })

    // Start transaction for safe import
    const result = await prisma.$transaction(async (tx) => {
      const importStats = {
        imported: 0,
        skipped: 0,
        errors: 0,
        details: {} as Record<string, any>
      }

      // Import roles first (dependencies)
      if (backupData.data.roles?.length > 0) {
        const roleStats = await importRoles(tx, backupData.data.roles)
        importStats.details.roles = roleStats
        importStats.imported += roleStats.imported
        importStats.skipped += roleStats.skipped
        importStats.errors += roleStats.errors
      }

      // Import admins
      if (backupData.data.admins?.length > 0) {
        const adminStats = await importAdmins(tx, backupData.data.admins)
        importStats.details.admins = adminStats
        importStats.imported += adminStats.imported
        importStats.skipped += adminStats.skipped
        importStats.errors += adminStats.errors
      }

      // Import settings
      if (backupData.data.settings?.length > 0) {
        const settingsStats = await importSettings(tx, backupData.data.settings)
        importStats.details.settings = settingsStats
        importStats.imported += settingsStats.imported
        importStats.skipped += settingsStats.skipped
        importStats.errors += settingsStats.errors
      }

      // Import registrations
      if (backupData.data.registrations?.length > 0) {
        const regStats = await importRegistrations(tx, backupData.data.registrations)
        importStats.details.registrations = regStats
        importStats.imported += regStats.imported
        importStats.skipped += regStats.skipped
        importStats.errors += regStats.errors
      }

      // Import users
      if (backupData.data.users?.length > 0) {
        const userStats = await importUsers(tx, backupData.data.users)
        importStats.details.users = userStats
        importStats.imported += userStats.imported
        importStats.skipped += userStats.skipped
        importStats.errors += userStats.errors
      }

      // Import permissions
      if (backupData.data.permissions?.length > 0) {
        const permStats = await importPermissions(tx, backupData.data.permissions)
        importStats.details.permissions = permStats
        importStats.imported += permStats.imported
        importStats.skipped += permStats.skipped
        importStats.errors += permStats.errors
      }

      // Import children registrations
      if (backupData.data.childrenRegistrations?.length > 0) {
        const childStats = await importChildrenRegistrations(tx, backupData.data.childrenRegistrations)
        importStats.details.childrenRegistrations = childStats
        importStats.imported += childStats.imported
        importStats.skipped += childStats.skipped
        importStats.errors += childStats.errors
      }

      // Import rooms
      if (backupData.data.rooms?.length > 0) {
        const roomStats = await importRooms(tx, backupData.data.rooms)
        importStats.details.rooms = roomStats
        importStats.imported += roomStats.imported
        importStats.skipped += roomStats.skipped
        importStats.errors += roomStats.errors
      }

      // Import room allocations
      if (backupData.data.roomAllocations?.length > 0) {
        const allocStats = await importRoomAllocations(tx, backupData.data.roomAllocations)
        importStats.details.roomAllocations = allocStats
        importStats.imported += allocStats.imported
        importStats.skipped += allocStats.skipped
        importStats.errors += allocStats.errors
      }

      // Import QR codes
      if (backupData.data.qrCodes?.length > 0) {
        const qrStats = await importQRCodes(tx, backupData.data.qrCodes)
        importStats.details.qrCodes = qrStats
        importStats.imported += qrStats.imported
        importStats.skipped += qrStats.skipped
        importStats.errors += qrStats.errors
      }

      return importStats
    })

    logger.info('Database import completed', {
      userId: currentUser.id,
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors
    })

    return NextResponse.json({
      success: true,
      message: 'Database import completed successfully',
      stats: result
    })

  } catch (error) {
    logger.error('Database import failed', error)
    return NextResponse.json({
      error: 'Failed to import database',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
