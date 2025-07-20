#!/usr/bin/env tsx

/**
 * Minimal Database Seeding Script
 * Seeds a small amount of test data for quick testing
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function seedMinimal() {
  try {
    console.log('🚀 Starting minimal database seeding...')
    console.log('=====================================\n')

    // 1. Create basic roles if they don't exist
    console.log('👑 Setting up roles...')
    
    let userRole = await prisma.role.findUnique({ where: { name: 'User' } })
    if (!userRole) {
      userRole = await prisma.role.create({
        data: { name: 'User', description: 'Regular user role', isSystem: false }
      })
      console.log('✅ Created User role')
    }

    let staffRole = await prisma.role.findUnique({ where: { name: 'Staff' } })
    if (!staffRole) {
      staffRole = await prisma.role.create({
        data: { name: 'Staff', description: 'Staff member role', isSystem: false }
      })
      console.log('✅ Created Staff role')
    }

    // 2. Create a few test users
    console.log('\n👥 Creating test users...')
    
    const testUsers = [
      { name: 'Test User', email: 'test@example.com', role: userRole.id, phone: '+234-801-234-5678' },
      { name: 'Staff Member', email: 'staff@example.com', role: staffRole.id, phone: '+234-802-345-6789' }
    ]

    for (const userData of testUsers) {
      const existing = await prisma.user.findUnique({ where: { email: userData.email } })
      if (!existing) {
        const hashedPassword = await bcrypt.hash('password123', 10)
        await prisma.user.create({
          data: {
            name: userData.name,
            email: userData.email,
            password: hashedPassword,
            roleId: userData.role,
            phoneNumber: userData.phone,
            phoneVerified: true,
            isActive: true
          }
        })
        console.log(`✅ Created user: ${userData.name}`)
      } else {
        console.log(`⏭️  User ${userData.email} already exists`)
      }
    }

    // 3. Create basic rooms
    console.log('\n🏠 Creating test rooms...')
    
    const testRooms = [
      { name: 'Test Male Room', gender: 'Male', capacity: 4, description: 'Test male accommodation' },
      { name: 'Test Female Room', gender: 'Female', capacity: 4, description: 'Test female accommodation' }
    ]

    for (const roomData of testRooms) {
      const existing = await prisma.room.findUnique({ where: { name: roomData.name } })
      if (!existing) {
        await prisma.room.create({
          data: {
            name: roomData.name,
            gender: roomData.gender,
            capacity: roomData.capacity,
            description: roomData.description,
            isActive: true
          }
        })
        console.log(`✅ Created room: ${roomData.name}`)
      } else {
        console.log(`⏭️  Room ${roomData.name} already exists`)
      }
    }

    // 4. Create test participants
    console.log('\n🎯 Creating test participants...')
    
    const testParticipants = [
      {
        fullName: 'John Doe',
        gender: 'Male',
        age: 25,
        emailAddress: 'john.doe@example.com',
        phoneNumber: '+234-802-345-6789'
      },
      {
        fullName: 'Jane Smith',
        gender: 'Female',
        age: 23,
        emailAddress: 'jane.smith@example.com',
        phoneNumber: '+234-803-456-7890'
      },
      {
        fullName: 'Mike Johnson',
        gender: 'Male',
        age: 28,
        emailAddress: 'mike.johnson@example.com',
        phoneNumber: '+234-804-567-8901'
      },
      {
        fullName: 'Sarah Wilson',
        gender: 'Female',
        age: 26,
        emailAddress: 'sarah.wilson@example.com',
        phoneNumber: '+234-805-678-9012'
      }
    ]

    for (const participantData of testParticipants) {
      const existing = await prisma.registration.findFirst({
        where: { emailAddress: participantData.emailAddress }
      })
      
      if (!existing) {
        const birthDate = new Date()
        birthDate.setFullYear(birthDate.getFullYear() - participantData.age)
        
        await prisma.registration.create({
          data: {
            fullName: participantData.fullName,
            dateOfBirth: birthDate,
            age: participantData.age,
            gender: participantData.gender,
            address: '123 Test Street, Lagos',
            branch: 'Lagos Central',
            phoneNumber: participantData.phoneNumber,
            emailAddress: participantData.emailAddress,
            emergencyContactName: 'Emergency Contact',
            emergencyContactRelationship: 'Parent',
            emergencyContactPhone: '+234-806-789-0123',
            parentalPermissionGranted: participantData.age < 18,
            isVerified: true,
            verifiedAt: new Date(),
            verifiedBy: 'admin@mopgomglobal.com',
            qrCode: `QR-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
          }
        })
        console.log(`✅ Created participant: ${participantData.fullName}`)
      } else {
        console.log(`⏭️  Participant ${participantData.emailAddress} already exists`)
      }
    }

    // 5. Create a few children registrations
    console.log('\n👶 Creating test children...')
    
    const testChildren = [
      { fullName: 'Little John', gender: 'Male', age: 12 },
      { fullName: 'Little Jane', gender: 'Female', age: 10 }
    ]

    for (const childData of testChildren) {
      const existing = await prisma.childrenRegistration.findFirst({
        where: { fullName: childData.fullName }
      })
      
      if (!existing) {
        const birthDate = new Date()
        birthDate.setFullYear(birthDate.getFullYear() - childData.age)
        
        await prisma.childrenRegistration.create({
          data: {
            fullName: childData.fullName,
            dateOfBirth: birthDate,
            age: childData.age,
            gender: childData.gender,
            address: '456 Test Avenue, Lagos',
            branch: 'Lagos Central',
            parentGuardianName: 'Test Parent',
            parentGuardianPhone: '+234-807-890-1234',
            parentGuardianEmail: 'parent@example.com'
          }
        })
        console.log(`✅ Created child: ${childData.fullName}`)
      } else {
        console.log(`⏭️  Child ${childData.fullName} already exists`)
      }
    }

    // 6. Display summary
    console.log('\n📊 MINIMAL SEEDING SUMMARY')
    console.log('===========================')
    
    const userCount = await prisma.user.count()
    const roomCount = await prisma.room.count()
    const participantCount = await prisma.registration.count()
    const childrenCount = await prisma.childrenRegistration.count()
    
    console.log(`👥 Users: ${userCount}`)
    console.log(`🏠 Rooms: ${roomCount}`)
    console.log(`🎯 Participants: ${participantCount}`)
    console.log(`👶 Children: ${childrenCount}`)
    
    console.log('\n🎉 Minimal seeding completed!')
    console.log('💡 You can now test basic functionality with this data.')
    console.log('🚀 Run "npm run seed" for comprehensive seeding with more data.')

  } catch (error) {
    console.error('❌ Error during minimal seeding:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  seedMinimal()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

export { seedMinimal }
