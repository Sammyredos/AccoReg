#!/usr/bin/env tsx

/**
 * Comprehensive Database Seeding Script
 * Seeds users, rooms, and participants with realistic test data
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Sample data arrays
const maleNames = [
  'James Johnson', 'Michael Brown', 'Robert Davis', 'William Miller', 'David Wilson',
  'Richard Moore', 'Joseph Taylor', 'Thomas Anderson', 'Christopher Thomas', 'Charles Jackson',
  'Daniel White', 'Matthew Harris', 'Anthony Martin', 'Mark Thompson', 'Donald Garcia',
  'Steven Martinez', 'Paul Robinson', 'Andrew Clark', 'Joshua Rodriguez', 'Kenneth Lewis'
]

const femaleNames = [
  'Mary Smith', 'Patricia Johnson', 'Jennifer Williams', 'Linda Brown', 'Elizabeth Jones',
  'Barbara Garcia', 'Susan Miller', 'Jessica Davis', 'Sarah Rodriguez', 'Karen Wilson',
  'Nancy Martinez', 'Lisa Anderson', 'Betty Thomas', 'Helen Taylor', 'Sandra Moore',
  'Donna Jackson', 'Carol White', 'Ruth Lopez', 'Sharon Martin', 'Michelle Lee'
]

const branches = [
  'Lagos Central', 'Abuja Main', 'Port Harcourt', 'Kano', 'Ibadan',
  'Kaduna', 'Jos', 'Benin City', 'Warri', 'Owerri',
  'Enugu', 'Calabar', 'Uyo', 'Maiduguri', 'Sokoto'
]

const addresses = [
  '123 Victoria Island, Lagos', '45 Garki District, Abuja', '78 GRA Phase 2, Port Harcourt',
  '12 Sabon Gari, Kano', '34 Bodija Estate, Ibadan', '56 Barnawa, Kaduna',
  '89 Rayfield, Jos', '23 Ring Road, Benin City', '67 Effurun, Warri',
  '90 New Owerri, Owerri', '45 Independence Layout, Enugu', '78 Calabar South',
  '12 Uyo Village Road', '34 Gwange, Maiduguri', '56 Runjin Sambo, Sokoto'
]

const emergencyContacts = [
  { name: 'John Doe', relationship: 'Father', phone: '+234-801-234-5678' },
  { name: 'Jane Smith', relationship: 'Mother', phone: '+234-802-345-6789' },
  { name: 'Peter Johnson', relationship: 'Uncle', phone: '+234-803-456-7890' },
  { name: 'Mary Williams', relationship: 'Aunt', phone: '+234-804-567-8901' },
  { name: 'David Brown', relationship: 'Brother', phone: '+234-805-678-9012' }
]

function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function getRandomAge(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateEmail(name: string): string {
  const cleanName = name.toLowerCase().replace(/\s+/g, '.')
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com']
  return `${cleanName}@${getRandomItem(domains)}`
}

function generatePhone(): string {
  const prefixes = ['0801', '0802', '0803', '0804', '0805', '0806', '0807', '0808', '0809', '0810']
  const suffix = Math.floor(Math.random() * 10000000).toString().padStart(7, '0')
  return `${getRandomItem(prefixes)}-${suffix.slice(0, 3)}-${suffix.slice(3)}`
}

function generateDateOfBirth(age: number): Date {
  const today = new Date()
  const birthYear = today.getFullYear() - age
  const birthMonth = Math.floor(Math.random() * 12)
  const birthDay = Math.floor(Math.random() * 28) + 1
  return new Date(birthYear, birthMonth, birthDay)
}

async function seedUsers() {
  console.log('👥 Seeding users...')
  
  // Get or create roles
  let userRole = await prisma.role.findUnique({ where: { name: 'User' } })
  if (!userRole) {
    userRole = await prisma.role.create({
      data: {
        name: 'User',
        description: 'Regular user role',
        isSystem: false
      }
    })
  }

  let staffRole = await prisma.role.findUnique({ where: { name: 'Staff' } })
  if (!staffRole) {
    staffRole = await prisma.role.create({
      data: {
        name: 'Staff',
        description: 'Staff member role',
        isSystem: false
      }
    })
  }

  const users = [
    // Staff users
    { name: 'John Admin', email: 'john.admin@mopgomglobal.com', role: staffRole.id, isStaff: true },
    { name: 'Sarah Manager', email: 'sarah.manager@mopgomglobal.com', role: staffRole.id, isStaff: true },
    { name: 'Mike Coordinator', email: 'mike.coordinator@mopgomglobal.com', role: staffRole.id, isStaff: true },
    
    // Regular users
    { name: 'Alice Johnson', email: 'alice.johnson@gmail.com', role: userRole.id, isStaff: false },
    { name: 'Bob Smith', email: 'bob.smith@yahoo.com', role: userRole.id, isStaff: false },
    { name: 'Carol Davis', email: 'carol.davis@outlook.com', role: userRole.id, isStaff: false },
    { name: 'David Wilson', email: 'david.wilson@gmail.com', role: userRole.id, isStaff: false },
    { name: 'Emma Brown', email: 'emma.brown@hotmail.com', role: userRole.id, isStaff: false }
  ]

  let createdUsers = 0
  let skippedUsers = 0

  for (const userData of users) {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      })

      if (existingUser) {
        console.log(`⏭️  User "${userData.email}" already exists - skipping`)
        skippedUsers++
        continue
      }

      const hashedPassword = await bcrypt.hash('password123', 10)
      
      await prisma.user.create({
        data: {
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          roleId: userData.role,
          phoneNumber: generatePhone(),
          phoneVerified: Math.random() > 0.3, // 70% verified
          isActive: true
        }
      })

      console.log(`✅ Created user: ${userData.name} (${userData.email})`)
      createdUsers++

    } catch (error) {
      console.error(`❌ Error creating user "${userData.name}":`, error)
    }
  }

  console.log(`📊 Users - Created: ${createdUsers}, Skipped: ${skippedUsers}`)
}

async function seedRooms() {
  console.log('🏠 Seeding rooms...')
  
  const rooms = [
    // Male Rooms
    { name: 'Alpha Male Dorm', gender: 'Male', capacity: 6, description: 'Large male dormitory' },
    { name: 'Beta Male Room', gender: 'Male', capacity: 4, description: 'Standard male room' },
    { name: 'Gamma Male Suite', gender: 'Male', capacity: 8, description: 'Spacious male suite' },
    { name: 'Delta Male Room', gender: 'Male', capacity: 4, description: 'Cozy male room' },
    { name: 'Epsilon Male Dorm', gender: 'Male', capacity: 6, description: 'Modern male dormitory' },
    { name: 'Zeta Male Room', gender: 'Male', capacity: 4, description: 'Comfortable male room' },
    
    // Female Rooms
    { name: 'Grace Female Dorm', gender: 'Female', capacity: 6, description: 'Elegant female dormitory' },
    { name: 'Faith Female Room', gender: 'Female', capacity: 4, description: 'Peaceful female room' },
    { name: 'Hope Female Suite', gender: 'Female', capacity: 8, description: 'Beautiful female suite' },
    { name: 'Joy Female Room', gender: 'Female', capacity: 4, description: 'Bright female room' },
    { name: 'Love Female Dorm', gender: 'Female', capacity: 6, description: 'Warm female dormitory' },
    { name: 'Peace Female Room', gender: 'Female', capacity: 4, description: 'Serene female room' }
  ]

  let createdRooms = 0
  let skippedRooms = 0

  for (const roomData of rooms) {
    try {
      const existingRoom = await prisma.room.findUnique({
        where: { name: roomData.name }
      })

      if (existingRoom) {
        console.log(`⏭️  Room "${roomData.name}" already exists - skipping`)
        skippedRooms++
        continue
      }

      await prisma.room.create({
        data: {
          name: roomData.name,
          gender: roomData.gender,
          capacity: roomData.capacity,
          description: roomData.description,
          isActive: true
        }
      })

      console.log(`✅ Created room: ${roomData.name} (${roomData.gender}, Capacity: ${roomData.capacity})`)
      createdRooms++

    } catch (error) {
      console.error(`❌ Error creating room "${roomData.name}":`, error)
    }
  }

  console.log(`📊 Rooms - Created: ${createdRooms}, Skipped: ${skippedRooms}`)
}

async function seedParticipants() {
  console.log('🎯 Seeding participants...')

  let createdParticipants = 0
  let skippedParticipants = 0

  // Create male participants
  for (let i = 0; i < 25; i++) {
    try {
      const name = getRandomItem(maleNames)
      const age = getRandomAge(16, 35)
      const email = generateEmail(name)

      // Check if participant already exists
      const existingParticipant = await prisma.registration.findFirst({
        where: { emailAddress: email }
      })

      if (existingParticipant) {
        console.log(`⏭️  Participant "${email}" already exists - skipping`)
        skippedParticipants++
        continue
      }

      const emergencyContact = getRandomItem(emergencyContacts)
      const isVerified = Math.random() > 0.2 // 80% verified

      await prisma.registration.create({
        data: {
          fullName: name,
          dateOfBirth: generateDateOfBirth(age),
          age: age,
          gender: 'Male',
          address: getRandomItem(addresses),
          branch: getRandomItem(branches),
          phoneNumber: generatePhone(),
          emailAddress: email,
          emergencyContactName: emergencyContact.name,
          emergencyContactRelationship: emergencyContact.relationship,
          emergencyContactPhone: emergencyContact.phone,
          parentGuardianName: age < 18 ? emergencyContact.name : null,
          parentGuardianPhone: age < 18 ? emergencyContact.phone : null,
          parentGuardianEmail: age < 18 ? generateEmail(emergencyContact.name) : null,
          parentalPermissionGranted: age < 18,
          parentalPermissionDate: age < 18 ? new Date() : null,
          isVerified: isVerified,
          verifiedAt: isVerified ? new Date() : null,
          verifiedBy: isVerified ? 'admin@mopgomglobal.com' : null,
          qrCode: `QR-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          medications: Math.random() > 0.8 ? 'Paracetamol for headaches' : null,
          allergies: Math.random() > 0.9 ? 'Peanut allergy' : null,
          specialNeeds: Math.random() > 0.95 ? 'Wheelchair accessible' : null,
          dietaryRestrictions: Math.random() > 0.7 ? getRandomItem(['Vegetarian', 'No pork', 'Diabetic diet']) : null
        }
      })

      console.log(`✅ Created male participant: ${name} (Age: ${age}, Verified: ${isVerified})`)
      createdParticipants++

    } catch (error) {
      console.error(`❌ Error creating male participant:`, error)
    }
  }

  // Create female participants
  for (let i = 0; i < 25; i++) {
    try {
      const name = getRandomItem(femaleNames)
      const age = getRandomAge(16, 35)
      const email = generateEmail(name)

      // Check if participant already exists
      const existingParticipant = await prisma.registration.findFirst({
        where: { emailAddress: email }
      })

      if (existingParticipant) {
        console.log(`⏭️  Participant "${email}" already exists - skipping`)
        skippedParticipants++
        continue
      }

      const emergencyContact = getRandomItem(emergencyContacts)
      const isVerified = Math.random() > 0.2 // 80% verified

      await prisma.registration.create({
        data: {
          fullName: name,
          dateOfBirth: generateDateOfBirth(age),
          age: age,
          gender: 'Female',
          address: getRandomItem(addresses),
          branch: getRandomItem(branches),
          phoneNumber: generatePhone(),
          emailAddress: email,
          emergencyContactName: emergencyContact.name,
          emergencyContactRelationship: emergencyContact.relationship,
          emergencyContactPhone: emergencyContact.phone,
          parentGuardianName: age < 18 ? emergencyContact.name : null,
          parentGuardianPhone: age < 18 ? emergencyContact.phone : null,
          parentGuardianEmail: age < 18 ? generateEmail(emergencyContact.name) : null,
          parentalPermissionGranted: age < 18,
          parentalPermissionDate: age < 18 ? new Date() : null,
          isVerified: isVerified,
          verifiedAt: isVerified ? new Date() : null,
          verifiedBy: isVerified ? 'admin@mopgomglobal.com' : null,
          qrCode: `QR-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          medications: Math.random() > 0.8 ? 'Birth control pills' : null,
          allergies: Math.random() > 0.9 ? 'Shellfish allergy' : null,
          specialNeeds: Math.random() > 0.95 ? 'Hearing aid required' : null,
          dietaryRestrictions: Math.random() > 0.7 ? getRandomItem(['Vegan', 'Gluten-free', 'Low sodium']) : null
        }
      })

      console.log(`✅ Created female participant: ${name} (Age: ${age}, Verified: ${isVerified})`)
      createdParticipants++

    } catch (error) {
      console.error(`❌ Error creating female participant:`, error)
    }
  }

  console.log(`📊 Participants - Created: ${createdParticipants}, Skipped: ${skippedParticipants}`)
}

async function seedChildrenRegistrations() {
  console.log('👶 Seeding children registrations...')

  let createdChildren = 0
  let skippedChildren = 0

  // Create children registrations (ages 5-15)
  for (let i = 0; i < 15; i++) {
    try {
      const isMale = Math.random() > 0.5
      const name = isMale ? getRandomItem(maleNames) : getRandomItem(femaleNames)
      const age = getRandomAge(5, 15)
      const parentName = getRandomItem(isMale ? femaleNames : maleNames) // Opposite gender for parent

      // Check if child already exists
      const existingChild = await prisma.childrenRegistration.findFirst({
        where: {
          fullName: name,
          parentGuardianEmail: generateEmail(parentName)
        }
      })

      if (existingChild) {
        console.log(`⏭️  Child "${name}" already exists - skipping`)
        skippedChildren++
        continue
      }

      await prisma.childrenRegistration.create({
        data: {
          fullName: name,
          dateOfBirth: generateDateOfBirth(age),
          age: age,
          gender: isMale ? 'Male' : 'Female',
          address: getRandomItem(addresses),
          branch: getRandomItem(branches),
          parentGuardianName: parentName,
          parentGuardianPhone: generatePhone(),
          parentGuardianEmail: generateEmail(parentName)
        }
      })

      console.log(`✅ Created child: ${name} (Age: ${age}, Gender: ${isMale ? 'Male' : 'Female'})`)
      createdChildren++

    } catch (error) {
      console.error(`❌ Error creating child registration:`, error)
    }
  }

  console.log(`📊 Children - Created: ${createdChildren}, Skipped: ${skippedChildren}`)
}

async function performRandomAllocations() {
  console.log('🏠 Performing random room allocations...')

  // Get verified participants without room allocation
  const unallocatedParticipants = await prisma.registration.findMany({
    where: {
      isVerified: true,
      roomAllocation: null
    },
    orderBy: {
      createdAt: 'asc'
    }
  })

  // Get available rooms
  const rooms = await prisma.room.findMany({
    where: { isActive: true },
    include: {
      allocations: true
    }
  })

  let allocatedCount = 0

  for (const participant of unallocatedParticipants) {
    try {
      // Find available rooms for this gender
      const availableRooms = rooms.filter(room =>
        room.gender === participant.gender &&
        room.allocations.length < room.capacity
      )

      if (availableRooms.length === 0) {
        console.log(`⚠️  No available ${participant.gender} rooms for ${participant.fullName}`)
        continue
      }

      // Randomly select a room
      const selectedRoom = getRandomItem(availableRooms)

      // Create allocation
      await prisma.roomAllocation.create({
        data: {
          registrationId: participant.id,
          roomId: selectedRoom.id,
          allocatedBy: 'system-seed'
        }
      })

      // Update the local room data
      selectedRoom.allocations.push({
        id: 'temp',
        registrationId: participant.id,
        roomId: selectedRoom.id,
        allocatedAt: new Date(),
        allocatedBy: 'system-seed'
      })

      console.log(`✅ Allocated ${participant.fullName} to ${selectedRoom.name}`)
      allocatedCount++

    } catch (error) {
      console.error(`❌ Error allocating ${participant.fullName}:`, error)
    }
  }

  console.log(`📊 Allocations - Created: ${allocatedCount}`)
}

async function displaySummary() {
  console.log('\n📊 DATABASE SEEDING SUMMARY')
  console.log('============================')

  // Users summary
  const userCount = await prisma.user.count()
  const adminCount = await prisma.admin.count()
  console.log(`👥 Users: ${userCount} users, ${adminCount} admins`)

  // Rooms summary
  const roomStats = await prisma.room.groupBy({
    by: ['gender'],
    where: { isActive: true },
    _count: { id: true },
    _sum: { capacity: true }
  })

  console.log('🏠 Rooms:')
  for (const stat of roomStats) {
    const allocated = await prisma.roomAllocation.count({
      where: { room: { gender: stat.gender, isActive: true } }
    })
    console.log(`   ${stat.gender}: ${stat._count.id} rooms, ${stat._sum.capacity} capacity, ${allocated} allocated`)
  }

  // Participants summary
  const participantStats = await prisma.registration.groupBy({
    by: ['gender', 'isVerified'],
    _count: { id: true }
  })

  console.log('🎯 Participants:')
  for (const stat of participantStats) {
    const status = stat.isVerified ? 'verified' : 'unverified'
    console.log(`   ${stat.gender} (${status}): ${stat._count.id}`)
  }

  // Children summary
  const childrenCount = await prisma.childrenRegistration.count()
  const childrenByGender = await prisma.childrenRegistration.groupBy({
    by: ['gender'],
    _count: { id: true }
  })

  console.log(`👶 Children: ${childrenCount} total`)
  for (const stat of childrenByGender) {
    console.log(`   ${stat.gender}: ${stat._count.id}`)
  }

  console.log('\n🎉 Database seeding completed successfully!')
  console.log('💡 You can now test all features of your application with realistic data.')
}

async function seedDatabase() {
  try {
    console.log('🚀 Starting comprehensive database seeding...')
    console.log('============================================\n')

    await seedUsers()
    console.log('')

    await seedRooms()
    console.log('')

    await seedParticipants()
    console.log('')

    await seedChildrenRegistrations()
    console.log('')

    await performRandomAllocations()
    console.log('')

    await displaySummary()

  } catch (error) {
    console.error('❌ Error during database seeding:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

export { seedDatabase }
