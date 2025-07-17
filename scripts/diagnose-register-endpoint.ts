#!/usr/bin/env tsx

/**
 * Comprehensive Registration Endpoint Diagnostics
 * Checks ALL missing columns and database issues for /register endpoint
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function diagnoseRegisterEndpoint() {
  console.log('🔍 COMPREHENSIVE REGISTRATION ENDPOINT DIAGNOSTICS')
  console.log('=' .repeat(60))

  const issues: string[] = []
  const fixes: string[] = []

  try {
    await prisma.$connect()
    console.log('✅ Database connection established')

    // 1. Check registrations table structure
    console.log('\n📋 CHECKING REGISTRATIONS TABLE STRUCTURE...')
    
    try {
      const tableInfo = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'registrations'
        ORDER BY ordinal_position
      ` as any[]

      console.log(`📊 Found ${tableInfo.length} columns in registrations table:`)
      
      const existingColumns = tableInfo.map(col => col.column_name)
      console.log('   Existing columns:', existingColumns.join(', '))

      // Define required columns for registration form
      const requiredColumns = {
        'id': 'TEXT',
        'fullName': 'TEXT',
        'dateOfBirth': 'TIMESTAMP(3)',
        'age': 'INTEGER',
        'gender': 'TEXT',
        'address': 'TEXT',
        'branch': 'TEXT',
        'phoneNumber': 'TEXT',
        'emailAddress': 'TEXT',
        'emergencyContactName': 'TEXT',
        'emergencyContactRelationship': 'TEXT',
        'emergencyContactPhone': 'TEXT',
        'parentGuardianName': 'TEXT',
        'parentGuardianPhone': 'TEXT',
        'parentGuardianEmail': 'TEXT',
        'medications': 'TEXT',
        'allergies': 'TEXT',
        'specialNeeds': 'TEXT',
        'dietaryRestrictions': 'TEXT',
        'parentalPermissionGranted': 'BOOLEAN',
        'parentalPermissionDate': 'TIMESTAMP(3)',
        'qrCode': 'TEXT',
        'isVerified': 'BOOLEAN',
        'verifiedAt': 'TIMESTAMP(3)',
        'verifiedBy': 'TEXT',
        'unverifiedAt': 'TIMESTAMP(3)',
        'unverifiedBy': 'TEXT',
        'createdAt': 'TIMESTAMP(3)',
        'updatedAt': 'TIMESTAMP(3)'
      }

      console.log('\n🔍 CHECKING FOR MISSING COLUMNS...')
      const missingColumns: string[] = []
      
      for (const [columnName, columnType] of Object.entries(requiredColumns)) {
        if (!existingColumns.includes(columnName)) {
          missingColumns.push(columnName)
          issues.push(`❌ Missing column: ${columnName} (${columnType})`)
          
          // Generate fix SQL
          let defaultValue = ''
          if (columnType === 'INTEGER') defaultValue = ' DEFAULT 0'
          else if (columnType === 'BOOLEAN') defaultValue = ' DEFAULT false'
          else if (columnType === 'TEXT') defaultValue = ' DEFAULT NULL'
          else if (columnType === 'TIMESTAMP(3)') defaultValue = ' DEFAULT NULL'
          
          fixes.push(`ALTER TABLE "registrations" ADD COLUMN "${columnName}" ${columnType}${defaultValue};`)
        }
      }

      if (missingColumns.length === 0) {
        console.log('✅ All required columns exist')
      } else {
        console.log(`❌ Missing ${missingColumns.length} columns:`, missingColumns.join(', '))
      }

    } catch (error) {
      issues.push(`❌ Cannot access registrations table: ${error.message}`)
    }

    // 2. Test registration creation with sample data
    console.log('\n🧪 TESTING REGISTRATION CREATION...')
    
    const sampleRegistration = {
      fullName: 'Test User ' + Date.now(),
      dateOfBirth: new Date('2000-01-01'),
      age: 24,
      gender: 'Male',
      address: '123 Test Street',
      branch: 'Test Branch',
      phoneNumber: '+1234567890',
      emailAddress: `test${Date.now()}@example.com`,
      emergencyContactName: 'Emergency Contact',
      emergencyContactRelationship: 'Parent',
      emergencyContactPhone: '+1234567890',
      parentGuardianName: 'Parent Name',
      parentGuardianPhone: '+1234567890',
      parentGuardianEmail: 'parent@example.com',
      medications: null,
      allergies: null,
      specialNeeds: null,
      dietaryRestrictions: null,
      parentalPermissionGranted: true,
      parentalPermissionDate: new Date()
    }

    try {
      const testRegistration = await prisma.registration.create({
        data: sampleRegistration
      })
      console.log('✅ Test registration created successfully:', testRegistration.id)
      
      // Clean up test registration
      await prisma.registration.delete({
        where: { id: testRegistration.id }
      })
      console.log('✅ Test registration cleaned up')
      
    } catch (error: any) {
      console.log('❌ Registration creation failed:', error.message)
      issues.push(`❌ Registration creation error: ${error.message}`)
      
      // Analyze the specific error
      if (error.code === 'P2022') {
        const match = error.message.match(/column `registrations\.(\w+)`/)
        if (match) {
          const missingColumn = match[1]
          issues.push(`❌ Specific missing column detected: ${missingColumn}`)
          fixes.push(`-- Fix for missing ${missingColumn} column`)
          
          if (missingColumn === 'age') {
            fixes.push(`ALTER TABLE "registrations" ADD COLUMN "age" INTEGER DEFAULT 0;`)
            fixes.push(`UPDATE "registrations" SET "age" = EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM "dateOfBirth") WHERE "age" = 0;`)
          } else if (missingColumn === 'branch') {
            fixes.push(`ALTER TABLE "registrations" ADD COLUMN "branch" TEXT DEFAULT 'Not Specified';`)
          } else {
            fixes.push(`ALTER TABLE "registrations" ADD COLUMN "${missingColumn}" TEXT DEFAULT NULL;`)
          }
        }
      }
    }

    // 3. Check children_registrations table
    console.log('\n👶 CHECKING CHILDREN REGISTRATIONS TABLE...')
    
    try {
      const childrenTableExists = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'children_registrations'
      ` as any[]

      if (childrenTableExists.length === 0) {
        issues.push('❌ children_registrations table does not exist')
        fixes.push(`-- Create children_registrations table`)
        fixes.push(`CREATE TABLE "children_registrations" (
          "id" TEXT NOT NULL,
          "fullName" TEXT NOT NULL,
          "dateOfBirth" TIMESTAMP(3) NOT NULL,
          "age" INTEGER NOT NULL DEFAULT 0,
          "gender" TEXT NOT NULL,
          "address" TEXT NOT NULL,
          "branch" TEXT NOT NULL DEFAULT 'Not Specified',
          "phoneNumber" TEXT,
          "emailAddress" TEXT,
          "emergencyContactName" TEXT,
          "emergencyContactRelationship" TEXT,
          "emergencyContactPhone" TEXT,
          "parentGuardianName" TEXT NOT NULL,
          "parentGuardianPhone" TEXT NOT NULL,
          "parentGuardianEmail" TEXT,
          "medications" TEXT,
          "allergies" TEXT,
          "specialNeeds" TEXT,
          "dietaryRestrictions" TEXT,
          "parentalPermissionGranted" BOOLEAN NOT NULL DEFAULT false,
          "qrCode" TEXT,
          "isVerified" BOOLEAN NOT NULL DEFAULT false,
          "verifiedAt" TIMESTAMP(3),
          "verifiedBy" TEXT,
          "unverifiedAt" TIMESTAMP(3),
          "unverifiedBy" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "children_registrations_pkey" PRIMARY KEY ("id")
        );`)
      } else {
        console.log('✅ children_registrations table exists')
      }
    } catch (error) {
      issues.push(`❌ Error checking children table: ${error.message}`)
    }

    // 4. Check current registration count and sample data
    console.log('\n📊 CHECKING CURRENT DATA...')
    
    try {
      const regCount = await prisma.registration.count()
      console.log(`📋 Current registrations: ${regCount}`)
      
      if (regCount > 0) {
        const sampleReg = await prisma.registration.findFirst({
          select: {
            id: true,
            fullName: true,
            age: true,
            branch: true,
            createdAt: true
          }
        })
        console.log('📄 Sample registration:', {
          id: sampleReg?.id,
          name: sampleReg?.fullName,
          age: sampleReg?.age,
          branch: sampleReg?.branch
        })
      }
    } catch (error: any) {
      issues.push(`❌ Error querying existing data: ${error.message}`)
    }

    // 5. Generate comprehensive fix script
    console.log('\n🔧 GENERATING COMPREHENSIVE FIX...')
    
    if (fixes.length > 0) {
      console.log('\n📝 SQL FIXES NEEDED:')
      fixes.forEach((fix, index) => {
        console.log(`${index + 1}. ${fix}`)
      })
    }

    // 6. Summary
    console.log('\n📋 DIAGNOSTIC SUMMARY:')
    console.log('=' .repeat(40))
    
    if (issues.length === 0) {
      console.log('🎉 NO ISSUES FOUND!')
      console.log('✅ Registration endpoint should be working')
    } else {
      console.log(`❌ FOUND ${issues.length} ISSUES:`)
      issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`)
      })
    }

    return { issues, fixes }

  } catch (error) {
    console.error('❌ DIAGNOSTIC FAILED:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run diagnostics
if (require.main === module) {
  diagnoseRegisterEndpoint()
    .then(({ issues, fixes }) => {
      if (issues.length === 0) {
        console.log('\n✅ DIAGNOSTICS COMPLETED - NO ISSUES FOUND!')
        process.exit(0)
      } else {
        console.log('\n⚠️ DIAGNOSTICS COMPLETED - ISSUES FOUND!')
        console.log('Run the generated SQL fixes to resolve issues.')
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error('\n❌ DIAGNOSTICS FAILED:', error)
      process.exit(1)
    })
}

export { diagnoseRegisterEndpoint }
