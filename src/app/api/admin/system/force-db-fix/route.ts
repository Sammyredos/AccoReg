import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyToken } from '@/lib/auth'

const prisma = new PrismaClient()

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
      where: { id: payload.userId },
      include: { role: true }
    })

    if (!currentUser || !currentUser.isActive) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 })
    }

    // Check permissions - only Super Admin can force database fixes
    if (currentUser.role?.name !== 'Super Admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    console.log('🔧 Manual database fix initiated by:', currentUser.email)

    // Force create children_registrations table
    console.log('Creating children_registrations table...')
    try {
      await prisma.$executeRaw`DROP TABLE IF EXISTS "children_registrations" CASCADE`
      await prisma.$executeRaw`
        CREATE TABLE "children_registrations" (
          "id" TEXT NOT NULL,
          "fullName" TEXT NOT NULL,
          "dateOfBirth" TIMESTAMP(3) NOT NULL,
          "age" INTEGER NOT NULL DEFAULT 0,
          "gender" TEXT NOT NULL,
          "address" TEXT NOT NULL,
          "branch" TEXT NOT NULL DEFAULT 'Not Specified',
          "parentGuardianName" TEXT NOT NULL,
          "parentGuardianPhone" TEXT NOT NULL,
          "parentGuardianEmail" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "children_registrations_pkey" PRIMARY KEY ("id")
        )
      `
      
      // Create indexes
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "children_registrations_fullName_idx" ON "children_registrations"("fullName")`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "children_registrations_gender_idx" ON "children_registrations"("gender")`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "children_registrations_branch_idx" ON "children_registrations"("branch")`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "children_registrations_createdAt_idx" ON "children_registrations"("createdAt")`
      
      console.log('✅ children_registrations table created')
    } catch (error) {
      console.error('❌ Failed to create children_registrations:', error)
    }

    // Add missing columns to Registration table
    console.log('Updating Registration table...')
    try {
      // Add age column if missing
      try {
        await prisma.$executeRaw`ALTER TABLE "Registration" ADD COLUMN "age" INTEGER NOT NULL DEFAULT 0`
        console.log('✅ Age column added to Registration table')
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('✅ Age column already exists')
        } else {
          console.error('❌ Failed to add age column:', error)
        }
      }

      // Add branch column if missing
      try {
        await prisma.$executeRaw`ALTER TABLE "Registration" ADD COLUMN "branch" TEXT NOT NULL DEFAULT 'Not Specified'`
        console.log('✅ Branch column added to Registration table')
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('✅ Branch column already exists')
        } else {
          console.error('❌ Failed to add branch column:', error)
        }
      }
    } catch (error) {
      console.error('❌ Failed to update Registration table:', error)
    }

    // Test all operations
    const tests = []
    
    try {
      const regCount = await prisma.registration.count()
      tests.push({ test: 'Registration count', status: 'success', result: regCount })
    } catch (error) {
      tests.push({ test: 'Registration count', status: 'failed', error: error.message })
    }

    try {
      const childrenCount = await prisma.childrenRegistration.count()
      tests.push({ test: 'Children registration count', status: 'success', result: childrenCount })
    } catch (error) {
      tests.push({ test: 'Children registration count', status: 'failed', error: error.message })
    }

    try {
      await prisma.registration.findMany({ select: { age: true }, take: 1 })
      tests.push({ test: 'Registration age column', status: 'success' })
    } catch (error) {
      tests.push({ test: 'Registration age column', status: 'failed', error: error.message })
    }

    try {
      await prisma.registration.findMany({ select: { branch: true }, take: 1 })
      tests.push({ test: 'Registration branch column', status: 'success' })
    } catch (error) {
      tests.push({ test: 'Registration branch column', status: 'failed', error: error.message })
    }

    const successCount = tests.filter(t => t.status === 'success').length
    const totalTests = tests.length

    return NextResponse.json({
      success: successCount === totalTests,
      message: `Database fix completed. ${successCount}/${totalTests} tests passed.`,
      tests,
      timestamp: new Date().toISOString(),
      fixedBy: currentUser.email
    })

  } catch (error) {
    console.error('Manual database fix failed:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Database fix failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Manual database fix endpoint',
    usage: 'Send POST request to force database table creation',
    note: 'Requires Super Admin permissions'
  })
}
