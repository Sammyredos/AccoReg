#!/usr/bin/env tsx

/**
 * Create Default Rooms Script
 * Creates default Male and Female rooms to enable allocation functionality
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createDefaultRooms() {
  try {
    console.log('🏠 Creating default rooms for allocation...')

    // Default rooms configuration
    const defaultRooms = [
      // Male Rooms
      { name: 'Room Alpha', gender: 'Male', capacity: 4, description: 'Male accommodation room' },
      { name: 'Room Beta', gender: 'Male', capacity: 4, description: 'Male accommodation room' },
      { name: 'Room Gamma', gender: 'Male', capacity: 6, description: 'Male accommodation room' },
      { name: 'Room Delta', gender: 'Male', capacity: 4, description: 'Male accommodation room' },
      { name: 'Room Epsilon', gender: 'Male', capacity: 6, description: 'Male accommodation room' },
      
      // Female Rooms
      { name: 'Room Zion', gender: 'Female', capacity: 4, description: 'Female accommodation room' },
      { name: 'Room Grace', gender: 'Female', capacity: 4, description: 'Female accommodation room' },
      { name: 'Room Faith', gender: 'Female', capacity: 6, description: 'Female accommodation room' },
      { name: 'Room Hope', gender: 'Female', capacity: 4, description: 'Female accommodation room' },
      { name: 'Room Joy', gender: 'Female', capacity: 6, description: 'Female accommodation room' },
    ]

    let createdCount = 0
    let skippedCount = 0

    for (const roomData of defaultRooms) {
      try {
        // Check if room already exists
        const existingRoom = await prisma.room.findUnique({
          where: { name: roomData.name }
        })

        if (existingRoom) {
          console.log(`⏭️  Room "${roomData.name}" already exists - skipping`)
          skippedCount++
          continue
        }

        // Create the room
        const room = await prisma.room.create({
          data: {
            name: roomData.name,
            gender: roomData.gender,
            capacity: roomData.capacity,
            description: roomData.description,
            isActive: true
          }
        })

        console.log(`✅ Created ${roomData.gender} room: ${room.name} (Capacity: ${room.capacity})`)
        createdCount++

      } catch (error) {
        console.error(`❌ Error creating room "${roomData.name}":`, error)
      }
    }

    console.log('\n📊 Summary:')
    console.log(`✅ Created: ${createdCount} rooms`)
    console.log(`⏭️  Skipped: ${skippedCount} rooms (already exist)`)

    // Display current room statistics
    const roomStats = await prisma.room.groupBy({
      by: ['gender'],
      where: { isActive: true },
      _count: {
        id: true
      },
      _sum: {
        capacity: true
      }
    })

    console.log('\n🏠 Current Room Statistics:')
    console.log('============================')
    for (const stat of roomStats) {
      const allocations = await prisma.roomAllocation.count({
        where: {
          room: {
            gender: stat.gender,
            isActive: true
          }
        }
      })

      console.log(`${stat.gender}: ${stat._count.id} rooms, ${stat._sum.capacity} total capacity, ${allocations} allocated`)
    }

    // Check if allocation is now possible
    const verifiedRegistrations = await prisma.registration.groupBy({
      by: ['gender'],
      where: {
        isVerified: true,
        roomAllocation: null
      },
      _count: {
        id: true
      }
    })

    console.log('\n👥 Unallocated Verified Participants:')
    console.log('====================================')
    for (const reg of verifiedRegistrations) {
      const availableCapacity = roomStats.find(r => r.gender === reg.gender)?._sum.capacity || 0
      const currentAllocations = await prisma.roomAllocation.count({
        where: {
          room: {
            gender: reg.gender,
            isActive: true
          }
        }
      })
      const freeCapacity = availableCapacity - currentAllocations

      console.log(`${reg.gender}: ${reg._count.id} participants, ${freeCapacity} free capacity`)
    }

    console.log('\n🎉 Default rooms setup completed!')
    console.log('💡 Allocation functionality should now be available on the accommodations page.')

  } catch (error) {
    console.error('❌ Error creating default rooms:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  createDefaultRooms()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

export { createDefaultRooms }
