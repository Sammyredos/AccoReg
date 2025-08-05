import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticateRequest } from '@/lib/auth-helpers'
import { invalidateCache } from '@/lib/cache'
import { RoomAllocationEmailService } from '@/lib/services/room-allocation-email'
import { broadcastAttendanceEvent } from '@/app/api/admin/attendance/events/route'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to allocate rooms
    if (!['Super Admin', 'Admin', 'Manager'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const data = await request.json()
    const { ageRangeYears } = data
    // allocateAll removed as it's not used

    // Validate age range
    if (!ageRangeYears || typeof ageRangeYears !== 'number' || ageRangeYears < 1) {
      return NextResponse.json(
        { error: 'Age range in years is required and must be a positive number' },
        { status: 400 }
      )
    }

    // Get maximum allowed age gap from configuration
    const ageGapConfig = await prisma.systemConfig.findUnique({
      where: { key: 'accommodation_max_age_gap' }
    })
    const maxAgeGap = ageGapConfig ? parseInt(ageGapConfig.value) : 5

    // Get all unallocated VERIFIED registrations (only Male and Female)
    const unallocatedRegistrations = await prisma.registration.findMany({
      where: {
        roomAllocation: null,
        isVerified: true, // Only verified attendees can be allocated
        gender: {
          in: ['Male', 'Female']
        }
      },
      orderBy: [
        { gender: 'asc' },
        { dateOfBirth: 'asc' } // Younger participants first (older birth dates = younger people)
      ]
    })

    if (unallocatedRegistrations.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No unallocated verified registrations found. Only verified attendees can be allocated to rooms.',
        allocations: []
      })
    }

    // Get all active rooms (only Male and Female) with optimized query
    const rooms = await prisma.room.findMany({
      where: {
        isActive: true,
        gender: {
          in: ['Male', 'Female']
        }
      },
      include: {
        allocations: {
          include: {
            registration: {
              select: {
                id: true,
                dateOfBirth: true,
                gender: true
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    if (rooms.length === 0) {
      return NextResponse.json(
        { error: 'No active rooms available for allocation' },
        { status: 400 }
      )
    }

    // Calculate age for each registration and sort by age (youngest first)
    const registrationsWithAge = unallocatedRegistrations.map(reg => {
      const today = new Date()
      const birthDate = new Date(reg.dateOfBirth)
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      return { ...reg, age }
    }).sort((a, b) => {
      // First sort by gender, then by age (youngest first)
      if (a.gender !== b.gender) {
        return a.gender.localeCompare(b.gender)
      }
      return a.age - b.age
    })

    // Group registrations by gender and create optimal age groups
    const groupedRegistrations = registrationsWithAge.reduce((groups, reg) => {
      // Create age groups that prioritize younger participants
      // Start from the youngest age and create groups of the specified range
      const baseAge = Math.floor(reg.age / ageRangeYears) * ageRangeYears
      const minAge = baseAge
      const maxAge = baseAge + ageRangeYears - 1
      const key = `${reg.gender}-${minAge}-${maxAge}`

      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(reg)

      return groups
    }, {} as Record<string, typeof registrationsWithAge>)

    const allocations: Array<{
      registrationId: string
      roomId: string
      allocatedBy: string
    }> = []
    const allocationResults: Array<{
      group: string
      count: number
      allocated: number
      remaining: number
      status: string
      reason?: string
      averageAge: number
    }> = []

    // Sort groups to prioritize younger age groups first
    const sortedGroups = Object.entries(groupedRegistrations).sort((a, b) => {
      const [genderA, minAgeStrA] = a[0].split('-')
      const [genderB, minAgeStrB] = b[0].split('-')

      // First sort by gender (Female first, then Male)
      if (genderA !== genderB) {
        return genderA.localeCompare(genderB)
      }

      // Then sort by age (younger groups first)
      return parseInt(minAgeStrA) - parseInt(minAgeStrB)
    })

    // Process each group (younger groups first)
    for (const [groupKey, groupRegistrations] of sortedGroups) {
      const [gender, minAgeStr, maxAgeStr] = groupKey.split('-')
      const minAge = parseInt(minAgeStr)
      const maxAge = parseInt(maxAgeStr)

      // Find suitable rooms for this group
      const suitableRooms = await Promise.all(
        rooms
          .filter(room => room.gender === gender && room.allocations.length < room.capacity)
          .map(async (room) => {
            // If room is empty, it's suitable for any age group
            if (room.allocations.length === 0) {
              return { room, suitable: true, reason: 'Empty room' }
            }

            // Use the allocations already loaded with the room
            const existingAllocations = room.allocations

            if (existingAllocations.length === 0) {
              return { room, suitable: true, reason: 'Empty room' }
            }

            const existingAges = existingAllocations
              .filter(allocation => allocation.registration && allocation.registration.dateOfBirth)
              .map(allocation => {
                const today = new Date()
                const birthDate = new Date(allocation.registration.dateOfBirth)
                let age = today.getFullYear() - birthDate.getFullYear()
                const monthDiff = today.getMonth() - birthDate.getMonth()
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                  age--
                }
                return age
              })

            // If no valid allocations with registration data, treat as empty room
            if (existingAges.length === 0) {
              return { room, suitable: true, reason: 'No valid existing allocations' }
            }

            const roomMinAge = Math.min(...existingAges)
            const roomMaxAge = Math.max(...existingAges)

            // Check if this age group is compatible with existing occupants
            // Ensure the total age range doesn't exceed the maximum allowed gap
            const newMinAge = Math.min(roomMinAge, minAge)
            const newMaxAge = Math.max(roomMaxAge, maxAge)
            const totalAgeRange = newMaxAge - newMinAge

            const isCompatible = totalAgeRange <= maxAgeGap

            return {
              room,
              suitable: isCompatible,
              reason: isCompatible
                ? `Compatible with existing ages ${roomMinAge}-${roomMaxAge}`
                : `Incompatible with existing ages ${roomMinAge}-${roomMaxAge}`
            }
          })
      )

      const filteredSuitableRooms = suitableRooms
        .filter(item => item.suitable)
        .map(item => item.room)
        .sort((a, b) => {
          // For younger groups, prioritize empty rooms first, then rooms with similar ages
          const aEmpty = a.allocations.length === 0
          const bEmpty = b.allocations.length === 0

          if (aEmpty && !bEmpty) return -1
          if (!aEmpty && bEmpty) return 1

          // If both are empty or both have occupants, prioritize by available space
          const aAvailable = a.capacity - a.allocations.length
          const bAvailable = b.capacity - b.allocations.length
          return bAvailable - aAvailable
        })

      if (filteredSuitableRooms.length === 0) {
        const sortedGroupRegistrations = groupRegistrations.sort((a, b) => a.age - b.age)
        allocationResults.push({
          group: `${gender} (${minAge}-${maxAge} years)`,
          count: sortedGroupRegistrations.length,
          allocated: 0,
          remaining: sortedGroupRegistrations.length,
          status: 'failed',
          reason: `No age-compatible ${gender.toLowerCase()} rooms available`,
          averageAge: Math.round(sortedGroupRegistrations.reduce((sum, reg) => sum + reg.age, 0) / sortedGroupRegistrations.length)
        })
        continue
      }

      // Sort registrations within the group by age (youngest first)
      const sortedGroupRegistrations = groupRegistrations.sort((a, b) => a.age - b.age)

      // Allocate registrations to rooms (youngest first)
      let registrationIndex = 0
      for (const room of filteredSuitableRooms) {
        const availableSpaces = room.capacity - room.allocations.length
        const toAllocate = Math.min(availableSpaces, sortedGroupRegistrations.length - registrationIndex)

        for (let i = 0; i < toAllocate; i++) {
          const registration = sortedGroupRegistrations[registrationIndex + i]
          allocations.push({
            registrationId: registration.id,
            roomId: room.id,
            allocatedBy: currentUser.email
          })

          // Update room allocations count for next iteration
          room.allocations.push({ id: 'temp' } as any)
        }

        registrationIndex += toAllocate

        if (registrationIndex >= sortedGroupRegistrations.length) {
          break
        }
      }

      const allocated = registrationIndex
      const remaining = sortedGroupRegistrations.length - allocated

      allocationResults.push({
        group: `${gender} (${minAge}-${maxAge} years)`,
        count: sortedGroupRegistrations.length,
        allocated,
        remaining,
        status: remaining === 0 ? 'success' : 'partial',
        averageAge: Math.round(sortedGroupRegistrations.reduce((sum, reg) => sum + reg.age, 0) / sortedGroupRegistrations.length)
      })
    }

    // Create allocations in database
    if (allocations.length > 0) {
      await prisma.roomAllocation.createMany({
        data: allocations
      })

      // Broadcast real-time allocation events in background (don't block response)
      setImmediate(() => {
        for (const allocation of allocations) {
          const registration = unallocatedRegistrations.find(reg => reg.id === allocation.registrationId)
          const room = rooms.find(r => r.id === allocation.roomId)

          if (registration && room) {
            broadcastAttendanceEvent({
              type: 'status_change',
              data: {
                registrationId: allocation.registrationId,
                fullName: registration.fullName,
                status: 'present',
                timestamp: new Date().toISOString(),
                roomName: room.name
              }
            })
          }
        }
      })

      console.log('🏠 Real-time bulk allocation events broadcasted:', {
        totalAllocations: allocations.length,
        allocatedBy: currentUser.email
      })

      // Invalidate cache to ensure fresh data is fetched
      invalidateCache.accommodations()
    }

    // Send room allocation emails asynchronously (don't wait for completion)
    let emailResults = null
    if (allocations.length > 0) {
      // Start email sending in background without waiting
      const allocatedRegistrationIds = allocations.map(allocation => allocation.registrationId)

      // Fire and forget - don't await this
      RoomAllocationEmailService.sendBulkRoomAllocationEmailsWithDefaults(
        allocatedRegistrationIds,
        currentUser.email
      ).then((results) => {
        console.log('Bulk email results:', results.summary)
      }).catch((emailError) => {
        console.error('Error sending bulk room allocation emails:', emailError)
      })

      console.log(`Started sending room allocation emails to ${allocations.length} registrants in background...`)

      // Return immediate response indicating emails are being sent
      emailResults = {
        summary: {
          total: allocations.length,
          successful: 0,
          failed: 0,
          status: 'sending'
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully allocated ${allocations.length} registrations`,
      totalProcessed: unallocatedRegistrations.length,
      totalAllocated: allocations.length,
      allocationResults: allocationResults.sort((a, b) => {
        // Sort results by gender first, then by average age (youngest first)
        if (a.group.includes('Female') && b.group.includes('Male')) return -1
        if (a.group.includes('Male') && b.group.includes('Female')) return 1
        return (a.averageAge || 0) - (b.averageAge || 0)
      }),
      ageRangeYears,
      prioritization: 'Younger participants prioritized first',
      emailResults: emailResults ? {
        emailsSent: emailResults.summary.successful,
        emailsFailed: emailResults.summary.failed,
        totalEmails: emailResults.summary.total
      } : null
    })

  } catch (error) {
    console.error('Error allocating rooms:', error)
    return NextResponse.json(
      { error: 'Failed to allocate rooms' },
      { status: 500 }
    )
  }
}
