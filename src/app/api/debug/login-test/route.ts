/**
 * Debug Login Test - Direct diagnosis of login issues
 * GET /api/debug/login-test
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPassword } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Starting login diagnosis...')
    
    // Test 1: Database connection
    console.log('📊 Testing database connection...')
    const adminCount = await prisma.admin.count()
    console.log(`✅ Database connected. Admin count: ${adminCount}`)
    
    // Test 2: Check if super admin exists
    console.log('👑 Checking for super admin...')
    const superAdmin = await prisma.admin.findUnique({
      where: { email: 'admin@mopgomglobal.com' },
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      }
    })
    
    if (!superAdmin) {
      console.log('❌ Super admin not found!')
      return NextResponse.json({
        status: 'error',
        issue: 'Super admin not found',
        adminCount,
        solution: 'Run create-super-admin script'
      })
    }
    
    console.log(`✅ Super admin found: ${superAdmin.email}`)
    console.log(`🔐 Active: ${superAdmin.isActive}`)
    console.log(`👑 Role: ${superAdmin.role?.name}`)
    console.log(`🛡️ Permissions: ${superAdmin.role?.permissions.length || 0}`)
    
    // Test 3: Password verification
    console.log('🔑 Testing password verification...')
    const testPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!'
    const passwordValid = verifyPassword(testPassword, superAdmin.password)
    console.log(`🔐 Password test result: ${passwordValid}`)
    
    // Test 4: Memory status
    const memUsage = process.memoryUsage()
    const memUsagePercent = Math.round((memUsage.rss / (512 * 1024 * 1024)) * 100)
    console.log(`💾 Memory usage: ${memUsagePercent}%`)
    
    return NextResponse.json({
      status: 'success',
      diagnosis: {
        database: {
          connected: true,
          adminCount
        },
        superAdmin: {
          exists: true,
          email: superAdmin.email,
          isActive: superAdmin.isActive,
          roleName: superAdmin.role?.name,
          permissionCount: superAdmin.role?.permissions.length || 0
        },
        authentication: {
          passwordValid,
          testPassword: testPassword.substring(0, 3) + '***'
        },
        system: {
          memoryUsage: memUsagePercent + '%',
          nodeEnv: process.env.NODE_ENV
        }
      },
      loginCredentials: {
        email: 'admin@mopgomglobal.com',
        password: testPassword
      }
    })
    
  } catch (error) {
    console.error('❌ Login diagnosis failed:', error)
    return NextResponse.json({
      status: 'error',
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    console.log('🧪 Testing actual login flow...')
    console.log(`📧 Email: ${email}`)
    console.log(`🔑 Password provided: ${!!password}`)
    
    // Find admin
    const admin = await prisma.admin.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        isActive: true,
        role: {
          select: {
            id: true,
            name: true,
            permissions: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })
    
    if (!admin) {
      console.log('❌ Admin not found for email:', email)
      return NextResponse.json({
        success: false,
        issue: 'Admin not found',
        email
      })
    }
    
    console.log('✅ Admin found:', admin.email)
    console.log('🔐 Active:', admin.isActive)
    
    // Test password
    const passwordValid = verifyPassword(password, admin.password)
    console.log('🔑 Password valid:', passwordValid)
    
    if (!passwordValid) {
      console.log('❌ Password verification failed')
      return NextResponse.json({
        success: false,
        issue: 'Invalid password',
        passwordProvided: !!password,
        adminFound: true
      })
    }
    
    if (!admin.isActive) {
      console.log('❌ Admin account inactive')
      return NextResponse.json({
        success: false,
        issue: 'Account inactive',
        adminFound: true,
        passwordValid: true
      })
    }
    
    console.log('✅ Login test successful!')
    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role?.name,
        permissions: admin.role?.permissions.length || 0
      }
    })
    
  } catch (error) {
    console.error('❌ Login test failed:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
