import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyToken } from '@/lib/auth'
import { execSync } from 'child_process'

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

    // Check permissions - only Super Admin can trigger auto-updates
    if (currentUser.role?.name !== 'Super Admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { action } = await request.json()

    switch (action) {
      case 'check-schema':
        return await checkDatabaseSchema()
      
      case 'update-schema':
        return await updateDatabaseSchema()
      
      case 'health-check':
        return await performHealthCheck()
      
      case 'backup-database':
        return await backupDatabase()
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Auto-update API error:', error)
    return NextResponse.json(
      { error: 'Auto-update operation failed' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

async function checkDatabaseSchema() {
  try {
    // Check if schema is up to date
    const result = execSync('npx prisma db push --dry-run --skip-generate', { 
      encoding: 'utf8',
      stdio: 'pipe'
    })

    const isUpToDate = result.includes('already in sync') || result.includes('No changes')
    
    return NextResponse.json({
      success: true,
      upToDate: isUpToDate,
      message: isUpToDate ? 'Database schema is up to date' : 'Schema changes detected',
      details: result
    })

  } catch (error) {
    // If dry-run fails, assume changes are needed
    return NextResponse.json({
      success: true,
      upToDate: false,
      message: 'Schema changes detected',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function updateDatabaseSchema() {
  try {
    console.log('🔄 Starting automatic database schema update...')
    
    // Step 1: Generate Prisma client
    console.log('📦 Generating Prisma client...')
    execSync('npx prisma generate', { stdio: 'inherit' })
    
    // Step 2: Apply schema changes
    console.log('🗄️ Applying database schema changes...')
    execSync('npx prisma db push --skip-generate', { stdio: 'inherit' })
    
    // Step 3: Verify the update
    const verificationResult = await verifyDatabaseUpdate()
    
    return NextResponse.json({
      success: true,
      message: 'Database schema updated successfully',
      verification: verificationResult
    })

  } catch (error) {
    console.error('❌ Schema update failed:', error)
    return NextResponse.json({
      success: false,
      message: 'Schema update failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function verifyDatabaseUpdate() {
  try {
    // Test basic database operations
    await prisma.setting.findFirst()
    await prisma.admin.findFirst()
    await prisma.registration.findFirst()
    
    // Check if branch field exists
    const sampleReg = await prisma.registration.findFirst({
      select: { id: true, branch: true }
    })
    
    return {
      success: true,
      branchFieldExists: sampleReg !== null,
      message: 'Database verification passed'
    }
    
  } catch (error) {
    return {
      success: false,
      message: 'Database verification failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function performHealthCheck() {
  try {
    const healthResults = {
      database: { status: 'unknown', message: '' },
      schema: { status: 'unknown', message: '' },
      environment: { status: 'unknown', message: '' },
      files: { status: 'unknown', message: '' }
    }

    // Database check
    try {
      await prisma.$connect()
      await prisma.$queryRaw`SELECT 1`
      const regCount = await prisma.registration.count()
      const adminCount = await prisma.admin.count()
      
      healthResults.database = {
        status: 'healthy',
        message: `Connected (${regCount} registrations, ${adminCount} admins)`
      }
    } catch (error) {
      healthResults.database = {
        status: 'error',
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }

    // Schema check
    try {
      await prisma.registration.findFirst({ select: { branch: true } })
      healthResults.schema = {
        status: 'healthy',
        message: 'Schema validation passed'
      }
    } catch (error) {
      healthResults.schema = {
        status: 'warning',
        message: 'Branch field missing - migration needed'
      }
    }

    // Environment check
    const requiredVars = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'JWT_SECRET']
    const missing = requiredVars.filter(varName => !process.env[varName])
    
    if (missing.length === 0) {
      healthResults.environment = {
        status: 'healthy',
        message: 'All required environment variables present'
      }
    } else {
      healthResults.environment = {
        status: 'error',
        message: `Missing variables: ${missing.join(', ')}`
      }
    }

    // File system check
    const fs = require('fs')
    const criticalFiles = ['package.json', 'next.config.js', 'prisma/schema.prisma']
    const missingFiles = criticalFiles.filter(file => !fs.existsSync(file))
    
    if (missingFiles.length === 0) {
      healthResults.files = {
        status: 'healthy',
        message: 'All critical files present'
      }
    } else {
      healthResults.files = {
        status: 'error',
        message: `Missing files: ${missingFiles.join(', ')}`
      }
    }

    const hasErrors = Object.values(healthResults).some(r => r.status === 'error')
    const hasWarnings = Object.values(healthResults).some(r => r.status === 'warning')

    return NextResponse.json({
      success: !hasErrors,
      status: hasErrors ? 'error' : hasWarnings ? 'warning' : 'healthy',
      message: hasErrors ? 'Health check failed' : hasWarnings ? 'Health check passed with warnings' : 'All systems healthy',
      results: healthResults
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      status: 'error',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function backupDatabase() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    
    // For SQLite databases
    if (process.env.DATABASE_URL?.includes('file:')) {
      const fs = require('fs')
      const path = require('path')
      
      const dbPath = process.env.DATABASE_URL.replace('file:', '')
      const backupDir = path.join(process.cwd(), 'backups')
      
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true })
      }
      
      const backupFile = path.join(backupDir, `backup-${timestamp}.db`)
      
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, backupFile)
        
        return NextResponse.json({
          success: true,
          message: 'Database backup created successfully',
          backupFile: `backup-${timestamp}.db`
        })
      } else {
        return NextResponse.json({
          success: false,
          message: 'Database file not found'
        }, { status: 404 })
      }
    }
    
    // For PostgreSQL databases
    if (process.env.DATABASE_URL?.includes('postgresql://')) {
      const backupFile = `backup-${timestamp}.sql`
      execSync(`pg_dump "${process.env.DATABASE_URL}" > "backups/${backupFile}"`, { stdio: 'inherit' })
      
      return NextResponse.json({
        success: true,
        message: 'PostgreSQL backup created successfully',
        backupFile
      })
    }
    
    return NextResponse.json({
      success: false,
      message: 'Backup not supported for this database type'
    }, { status: 400 })

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Backup creation failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
