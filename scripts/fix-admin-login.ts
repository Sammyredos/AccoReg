#!/usr/bin/env tsx

/**
 * Emergency fix for admin login issues
 * Creates the super admin in the correct Admin table
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function fixAdminLogin() {
  try {
    console.log('🚨 EMERGENCY FIX: Creating Super Admin for login...')
    
    // Check database connection
    await prisma.$connect()
    console.log('✅ Database connected')
    
    // Check if admin already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { email: 'admin@mopgomglobal.com' }
    })
    
    if (existingAdmin) {
      console.log('ℹ️ Admin already exists, updating password...')
      
      // Update password to ensure it's correct
      const hashedPassword = await bcrypt.hash('SuperAdmin123!', 12)
      await prisma.admin.update({
        where: { email: 'admin@mopgomglobal.com' },
        data: {
          password: hashedPassword,
          isActive: true
        }
      })
      console.log('✅ Admin password updated')
    } else {
      console.log('🔧 Creating new Super Admin...')
      
      // Create Super Admin role if it doesn't exist
      const superAdminRole = await prisma.role.upsert({
        where: { name: 'Super Admin' },
        update: {},
        create: {
          name: 'Super Admin',
          description: 'Full system access',
          isSystem: true
        }
      })
      
      // Create the admin
      const hashedPassword = await bcrypt.hash('SuperAdmin123!', 12)
      await prisma.admin.create({
        data: {
          email: 'admin@mopgomglobal.com',
          password: hashedPassword,
          name: 'Super Administrator',
          roleId: superAdminRole.id,
          isActive: true
        }
      })
      console.log('✅ Super Admin created successfully')
    }
    
    // Verify the admin can be found
    const verifyAdmin = await prisma.admin.findUnique({
      where: { email: 'admin@mopgomglobal.com' },
      include: {
        role: true
      }
    })
    
    if (verifyAdmin) {
      console.log('🎉 VERIFICATION SUCCESSFUL!')
      console.log('📧 Email: admin@mopgomglobal.com')
      console.log('🔑 Password: SuperAdmin123!')
      console.log('👑 Role:', verifyAdmin.role?.name || 'No role')
      console.log('🔐 Active:', verifyAdmin.isActive)
      console.log('')
      console.log('🚀 Users should now be able to login!')
    } else {
      console.log('❌ VERIFICATION FAILED - Admin not found after creation')
    }
    
  } catch (error) {
    console.error('❌ EMERGENCY FIX FAILED:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix
fixAdminLogin()
  .then(() => {
    console.log('✅ Emergency fix completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Emergency fix failed:', error)
    process.exit(1)
  })
