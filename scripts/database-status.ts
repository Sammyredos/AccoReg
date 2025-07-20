#!/usr/bin/env tsx

/**
 * Database Status Script
 * Shows current database statistics and status
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function showDatabaseStatus() {
  try {
    console.log('📊 DATABASE STATUS REPORT')
    console.log('=========================\n')

    // Users and Admins
    console.log('👥 USERS & ADMINS')
    console.log('------------------')
    const userCount = await prisma.user.count()
    const adminCount = await prisma.admin.count()
    const activeUsers = await prisma.user.count({ where: { isActive: true } })
    const verifiedUsers = await prisma.user.count({ where: { phoneVerified: true } })
    
    console.log(`Total Users: ${userCount}`)
    console.log(`Total Admins: ${adminCount}`)
    console.log(`Active Users: ${activeUsers}`)
    console.log(`Phone Verified: ${verifiedUsers}`)

    // Roles
    console.log('\n👑 ROLES')
    console.log('----------')
    const roles = await prisma.role.findMany({
      include: {
        _count: {
          select: {
            users: true,
            admins: true
          }
        }
      }
    })
    
    for (const role of roles) {
      console.log(`${role.name}: ${role._count.users} users, ${role._count.admins} admins`)
    }

    // Rooms
    console.log('\n🏠 ROOMS & ACCOMMODATIONS')
    console.log('-------------------------')
    const roomStats = await prisma.room.groupBy({
      by: ['gender'],
      where: { isActive: true },
      _count: { id: true },
      _sum: { capacity: true }
    })
    
    for (const stat of roomStats) {
      const allocated = await prisma.roomAllocation.count({
        where: { room: { gender: stat.gender, isActive: true } }
      })
      const available = (stat._sum.capacity || 0) - allocated
      const occupancyRate = stat._sum.capacity ? ((allocated / stat._sum.capacity) * 100).toFixed(1) : '0'
      
      console.log(`${stat.gender} Rooms: ${stat._count.id} rooms, ${stat._sum.capacity} capacity`)
      console.log(`  - Allocated: ${allocated}`)
      console.log(`  - Available: ${available}`)
      console.log(`  - Occupancy: ${occupancyRate}%`)
    }

    // Participants
    console.log('\n🎯 PARTICIPANTS')
    console.log('----------------')
    const participantStats = await prisma.registration.groupBy({
      by: ['gender', 'isVerified'],
      _count: { id: true }
    })
    
    const totalParticipants = await prisma.registration.count()
    const verifiedParticipants = await prisma.registration.count({ where: { isVerified: true } })
    const allocatedParticipants = await prisma.roomAllocation.count()
    
    console.log(`Total Participants: ${totalParticipants}`)
    console.log(`Verified: ${verifiedParticipants}`)
    console.log(`Room Allocated: ${allocatedParticipants}`)
    console.log(`Unallocated: ${verifiedParticipants - allocatedParticipants}`)
    
    console.log('\nBy Gender & Status:')
    for (const stat of participantStats) {
      const status = stat.isVerified ? 'verified' : 'unverified'
      console.log(`  ${stat.gender} (${status}): ${stat._count.id}`)
    }

    // Children
    console.log('\n👶 CHILDREN REGISTRATIONS')
    console.log('-------------------------')
    const childrenCount = await prisma.childrenRegistration.count()
    const childrenByGender = await prisma.childrenRegistration.groupBy({
      by: ['gender'],
      _count: { id: true }
    })
    
    console.log(`Total Children: ${childrenCount}`)
    for (const stat of childrenByGender) {
      console.log(`  ${stat.gender}: ${stat._count.id}`)
    }

    // Recent Activity
    console.log('\n📈 RECENT ACTIVITY')
    console.log('------------------')
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const recentRegistrations = await prisma.registration.count({
      where: { createdAt: { gte: yesterday } }
    })
    
    const recentVerifications = await prisma.registration.count({
      where: { 
        isVerified: true,
        verifiedAt: { gte: yesterday }
      }
    })
    
    const recentAllocations = await prisma.roomAllocation.count({
      where: { allocatedAt: { gte: yesterday } }
    })
    
    console.log(`New Registrations (24h): ${recentRegistrations}`)
    console.log(`New Verifications (24h): ${recentVerifications}`)
    console.log(`New Allocations (24h): ${recentAllocations}`)

    // Top Branches
    console.log('\n🌿 TOP BRANCHES')
    console.log('---------------')
    const branchStats = await prisma.registration.groupBy({
      by: ['branch'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5
    })
    
    for (const stat of branchStats) {
      console.log(`${stat.branch}: ${stat._count.id} participants`)
    }

    // System Health
    console.log('\n💚 SYSTEM HEALTH')
    console.log('----------------')
    const unallocatedVerified = await prisma.registration.count({
      where: {
        isVerified: true,
        roomAllocation: null
      }
    })
    
    const totalRoomCapacity = await prisma.room.aggregate({
      where: { isActive: true },
      _sum: { capacity: true }
    })
    
    const totalAllocated = await prisma.roomAllocation.count()
    const availableCapacity = (totalRoomCapacity._sum.capacity || 0) - totalAllocated
    
    console.log(`Unallocated Verified Participants: ${unallocatedVerified}`)
    console.log(`Available Room Capacity: ${availableCapacity}`)
    
    if (unallocatedVerified > 0 && availableCapacity > 0) {
      console.log('✅ Room allocation can proceed')
    } else if (unallocatedVerified > 0 && availableCapacity === 0) {
      console.log('⚠️  No room capacity available for allocation')
    } else {
      console.log('✅ All verified participants are allocated')
    }

    console.log('\n🎉 Database status report completed!')

  } catch (error) {
    console.error('❌ Error generating database status:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  showDatabaseStatus()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

export { showDatabaseStatus }
