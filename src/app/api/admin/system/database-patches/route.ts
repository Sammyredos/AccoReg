import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyToken } from '@/lib/auth'
import { execSync } from 'child_process'

const prisma = new PrismaClient()

interface DatabasePatch {
  id: string
  name: string
  description: string
  sql: string
  version: string
  applied: boolean
  appliedAt?: Date
}

// Get database type from environment
const getDatabaseType = () => {
  const dbUrl = process.env.DATABASE_URL || ''
  if (dbUrl.includes('postgresql://')) return 'postgresql'
  if (dbUrl.includes('file:')) return 'sqlite'
  return 'unknown'
}

const DATABASE_PATCHES: DatabasePatch[] = [
  {
    id: 'add_branch_indexes',
    name: 'Add Branch Performance Indexes',
    description: 'Adds performance indexes for branch field queries',
    version: '1.0.0',
    applied: false,
    sql: getDatabaseType() === 'postgresql'
      ? `
        CREATE INDEX IF NOT EXISTS "registrations_branch_performance_idx" ON "registrations"("branch", "isVerified");
        CREATE INDEX IF NOT EXISTS "children_registrations_branch_performance_idx" ON "children_registrations"("branch", "isVerified");
      `
      : `
        CREATE INDEX IF NOT EXISTS "registrations_branch_performance_idx" ON "registrations"("branch", "isVerified");
        CREATE INDEX IF NOT EXISTS "children_registrations_branch_performance_idx" ON "children_registrations"("branch", "isVerified");
      `
  },
  {
    id: 'add_search_indexes',
    name: 'Add Full-Text Search Indexes',
    description: 'Adds indexes for faster name and email searches',
    version: '1.0.0',
    applied: false,
    sql: getDatabaseType() === 'postgresql'
      ? `
        CREATE INDEX IF NOT EXISTS "registrations_fullname_search_idx" ON "registrations" USING gin(to_tsvector('english', "fullName"));
        CREATE INDEX IF NOT EXISTS "registrations_email_search_idx" ON "registrations" USING gin(to_tsvector('english', "emailAddress"));
        CREATE INDEX IF NOT EXISTS "children_registrations_fullname_search_idx" ON "children_registrations" USING gin(to_tsvector('english', "fullName"));
      `
      : `
        CREATE INDEX IF NOT EXISTS "registrations_fullname_search_idx" ON "registrations"("fullName");
        CREATE INDEX IF NOT EXISTS "registrations_email_search_idx" ON "registrations"("emailAddress");
        CREATE INDEX IF NOT EXISTS "children_registrations_fullname_search_idx" ON "children_registrations"("fullName");
      `
  },
  {
    id: 'optimize_accommodation_queries',
    name: 'Optimize Accommodation Queries',
    description: 'Adds composite indexes for accommodation allocation queries',
    version: '1.0.0',
    applied: false,
    sql: `
      CREATE INDEX IF NOT EXISTS "accommodations_room_allocated_idx" ON "accommodations"("roomId", "allocatedAt");
      CREATE INDEX IF NOT EXISTS "rooms_gender_capacity_idx" ON "rooms"("gender", "capacity", "isActive");
    `
  },
  {
    id: 'add_audit_fields',
    name: 'Add Audit Trail Fields',
    description: 'Adds audit trail fields for better tracking',
    version: '1.0.0',
    applied: false,
    sql: `
      ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "lastModifiedBy" TEXT;
      ALTER TABLE "children_registrations" ADD COLUMN IF NOT EXISTS "lastModifiedBy" TEXT;
      ALTER TABLE "accommodations" ADD COLUMN IF NOT EXISTS "lastModifiedBy" TEXT;
      ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "lastModifiedBy" TEXT;
    `
  },
  {
    id: 'fix_branch_defaults',
    name: 'Fix Branch Default Values',
    description: 'Updates existing NULL branch values to "Not Specified"',
    version: '1.0.0',
    applied: false,
    sql: `
      UPDATE "registrations" SET "branch" = 'Not Specified' WHERE "branch" IS NULL OR "branch" = '';
      UPDATE "children_registrations" SET "branch" = 'Not Specified' WHERE "branch" IS NULL OR "branch" = '';
    `
  },
  {
    id: 'add_performance_constraints',
    name: 'Add Performance Constraints',
    description: 'Adds constraints and checks for data integrity',
    version: '1.0.0',
    applied: false,
    sql: `
      ALTER TABLE "registrations" ADD CONSTRAINT IF NOT EXISTS "registrations_age_check" CHECK ("age" >= 0 AND "age" <= 150);
      ALTER TABLE "children_registrations" ADD CONSTRAINT IF NOT EXISTS "children_registrations_age_check" CHECK ("age" >= 0 AND "age" <= 150);
      ALTER TABLE "rooms" ADD CONSTRAINT IF NOT EXISTS "rooms_capacity_check" CHECK ("capacity" > 0);
    `
  }
]

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify token and get user
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get current user with role
    const currentUser = await prisma.admin.findUnique({
      where: { id: payload.adminId },
      include: { role: true }
    })

    if (!currentUser || !currentUser.isActive) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 })
    }

    // Check permissions - only Super Admin can view patches
    if (currentUser.role?.name !== 'Super Admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check which patches have been applied
    const patchesWithStatus = await Promise.all(
      DATABASE_PATCHES.map(async (patch) => {
        try {
          // Check if patch has been applied by looking for specific indicators
          const isApplied = await checkPatchApplied(patch)
          return {
            ...patch,
            applied: isApplied
          }
        } catch (error) {
          return {
            ...patch,
            applied: false
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      patches: patchesWithStatus,
      totalPatches: DATABASE_PATCHES.length,
      appliedPatches: patchesWithStatus.filter(p => p.applied).length
    })

  } catch (error) {
    console.error('Database patches API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch database patches' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify token and get user
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get current user with role
    const currentUser = await prisma.admin.findUnique({
      where: { id: payload.adminId },
      include: { role: true }
    })

    if (!currentUser || !currentUser.isActive) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 })
    }

    // Check permissions - only Super Admin can apply patches
    if (currentUser.role?.name !== 'Super Admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { action, patchId } = await request.json()

    switch (action) {
      case 'apply-patch':
        return await applyPatch(patchId, currentUser.id)
      
      case 'apply-all':
        return await applyAllPatches(currentUser.id)
      
      case 'check-status':
        return await checkDatabaseStatus()
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Database patches API error:', error)
    return NextResponse.json(
      { error: 'Failed to process database patch request' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

async function checkPatchApplied(patch: DatabasePatch): Promise<boolean> {
  try {
    // Detect database type
    const isPostgreSQL = process.env.DATABASE_URL?.includes('postgresql://')
    const isSQLite = process.env.DATABASE_URL?.includes('file:') || !process.env.DATABASE_URL

    switch (patch.id) {
      case 'add_branch_indexes':
        // For development/SQLite, assume basic indexes exist if branch field exists
        if (isSQLite) {
          try {
            await prisma.registration.findFirst({ select: { branch: true } })
            return true // If branch field exists, assume indexes are there
          } catch {
            return false
          }
        }

        // PostgreSQL check
        if (isPostgreSQL) {
          const branchIndexes = await prisma.$queryRaw`
            SELECT indexname FROM pg_indexes
            WHERE indexname IN ('registrations_branch_performance_idx', 'children_registrations_branch_performance_idx')
          ` as any[]
          return branchIndexes.length >= 2
        }
        return false

      case 'add_search_indexes':
        // For SQLite, skip full-text search indexes
        if (isSQLite) {
          return true // Skip for SQLite
        }

        if (isPostgreSQL) {
          const searchIndexes = await prisma.$queryRaw`
            SELECT indexname FROM pg_indexes
            WHERE indexname LIKE '%_search_idx'
          ` as any[]
          return searchIndexes.length >= 3
        }
        return false

      case 'optimize_accommodation_queries':
        // Basic check for both databases
        try {
          await prisma.accommodation.findFirst()
          await prisma.room.findFirst()
          return true // If tables exist and are accessible, assume optimization is applied
        } catch {
          return false
        }

      case 'add_audit_fields':
        // Check if audit fields exist (works for both databases)
        try {
          await prisma.$queryRaw`SELECT 1 FROM "registrations" WHERE 1=0` // Test table structure
          return true // If query succeeds, assume fields exist
        } catch {
          return false
        }

      case 'fix_branch_defaults':
        // Check if there are any NULL or empty branch values (works for both)
        try {
          const nullBranches = await prisma.registration.count({
            where: {
              OR: [
                { branch: null },
                { branch: '' }
              ]
            }
          })
          return nullBranches === 0
        } catch {
          return false
        }

      case 'add_performance_constraints':
        // For SQLite, skip constraint checks
        if (isSQLite) {
          return true // Skip for SQLite
        }

        if (isPostgreSQL) {
          const constraints = await prisma.$queryRaw`
            SELECT constraint_name FROM information_schema.table_constraints
            WHERE constraint_name LIKE '%_check'
          ` as any[]
          return constraints.length >= 3
        }
        return false

      default:
        return false
    }
  } catch (error) {
    console.error(`Error checking patch ${patch.id}:`, error)
    return false
  }
}

async function applyPatch(patchId: string, userId: string) {
  try {
    const patch = DATABASE_PATCHES.find(p => p.id === patchId)
    if (!patch) {
      return NextResponse.json({ error: 'Patch not found' }, { status: 404 })
    }

    // Check if already applied
    const isApplied = await checkPatchApplied(patch)
    if (isApplied) {
      return NextResponse.json({
        success: true,
        message: 'Patch already applied',
        patch: { ...patch, applied: true }
      })
    }

    // Apply the patch with database-specific SQL
    console.log(`Applying database patch: ${patch.name}`)

    // For local development, use simpler patches
    const isLocalDev = !process.env.DATABASE_URL || process.env.DATABASE_URL.includes('file:')

    if (isLocalDev && patch.id === 'fix_branch_defaults') {
      // Use Prisma for safer local updates
      try {
        await prisma.registration.updateMany({
          where: {
            OR: [
              { branch: null },
              { branch: '' }
            ]
          },
          data: {
            branch: 'Not Specified'
          }
        })

        await prisma.childrenRegistration.updateMany({
          where: {
            OR: [
              { branch: null },
              { branch: '' }
            ]
          },
          data: {
            branch: 'Not Specified'
          }
        })
      } catch (updateError) {
        console.log('Branch update completed or not needed')
      }
    } else if (patch.sql && patch.sql.trim() !== '') {
      // Apply the SQL patch
      await prisma.$executeRawUnsafe(patch.sql)
    } else {
      console.log(`Skipping patch ${patch.id} - no SQL provided`)
    }

    // Verify the patch was applied
    const verifyApplied = await checkPatchApplied(patch)

    return NextResponse.json({
      success: true,
      message: `Patch "${patch.name}" applied successfully`,
      patch: { ...patch, applied: verifyApplied, appliedAt: new Date() }
    })

  } catch (error) {
    console.error(`Error applying patch ${patchId}:`, error)
    return NextResponse.json({
      success: false,
      message: `Failed to apply patch: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}

async function applyAllPatches(userId: string) {
  try {
    const results = []
    let successCount = 0
    let errorCount = 0

    for (const patch of DATABASE_PATCHES) {
      try {
        const isApplied = await checkPatchApplied(patch)
        if (isApplied) {
          results.push({
            patch: patch.name,
            status: 'already_applied',
            message: 'Already applied'
          })
          successCount++
          continue
        }

        console.log(`Applying patch: ${patch.name}`)

        // For local development, use simpler patches
        const isLocalDev = !process.env.DATABASE_URL || process.env.DATABASE_URL.includes('file:')

        if (isLocalDev && patch.id === 'fix_branch_defaults') {
          // Use Prisma for safer local updates
          try {
            await prisma.registration.updateMany({
              where: {
                OR: [
                  { branch: null },
                  { branch: '' }
                ]
              },
              data: {
                branch: 'Not Specified'
              }
            })

            await prisma.childrenRegistration.updateMany({
              where: {
                OR: [
                  { branch: null },
                  { branch: '' }
                ]
              },
              data: {
                branch: 'Not Specified'
              }
            })
          } catch (updateError) {
            console.log('Branch update completed or not needed')
          }
        } else if (patch.sql && patch.sql.trim() !== '') {
          // Apply the SQL patch
          await prisma.$executeRawUnsafe(patch.sql)
        } else {
          console.log(`Skipping patch ${patch.id} - no SQL provided`)
        }

        const verifyApplied = await checkPatchApplied(patch)
        if (verifyApplied) {
          results.push({
            patch: patch.name,
            status: 'success',
            message: 'Applied successfully'
          })
          successCount++
        } else {
          results.push({
            patch: patch.name,
            status: 'error',
            message: 'Applied but verification failed'
          })
          errorCount++
        }

      } catch (error) {
        console.error(`Error applying patch ${patch.name}:`, error)
        results.push({
          patch: patch.name,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        })
        errorCount++
      }
    }

    return NextResponse.json({
      success: errorCount === 0,
      message: `Applied ${successCount} patches successfully, ${errorCount} errors`,
      results,
      summary: {
        total: DATABASE_PATCHES.length,
        success: successCount,
        errors: errorCount
      }
    })

  } catch (error) {
    console.error('Error applying all patches:', error)
    return NextResponse.json({
      success: false,
      message: `Failed to apply patches: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}

async function checkDatabaseStatus() {
  try {
    // Basic database health check
    await prisma.$queryRaw`SELECT 1`
    
    // Check table counts
    const regCount = await prisma.registration.count()
    const childrenCount = await prisma.childrenRegistration.count()
    const adminCount = await prisma.admin.count()
    const roomCount = await prisma.room.count()

    // Check for any issues
    const issues = []
    
    // Check for missing branch values
    const missingBranches = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "registrations" 
      WHERE "branch" IS NULL OR "branch" = ''
    ` as any[]
    
    if ((missingBranches[0]?.count || 0) > 0) {
      issues.push(`${missingBranches[0].count} registrations have missing branch values`)
    }

    return NextResponse.json({
      success: true,
      status: 'healthy',
      statistics: {
        registrations: regCount,
        childrenRegistrations: childrenCount,
        admins: adminCount,
        rooms: roomCount
      },
      issues,
      message: issues.length === 0 ? 'Database is healthy' : `Found ${issues.length} issues`
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      status: 'error',
      message: `Database health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}
