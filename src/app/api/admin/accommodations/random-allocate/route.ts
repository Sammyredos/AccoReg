import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticateRequest } from '@/lib/auth-helpers'
import { invalidateCache } from '@/lib/cache'
import { RoomAllocationEmailService } from '@/lib/services/room-allocation-email'

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

    // Get all unallocated VERIFIED registrations (only Male and Female)
    const unallocatedRegistrations = await prisma.registration.findMany({
      where: {
        roomAllocation: null,
        isVerified: true, // Only verified attendees can be allocated
        gender: {
          in: ['Male', 'Female']
        }
      }
    })

    if (unallocatedRegistrations.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No unallocated verified registrations found. Only verified attendees can be allocated to rooms.',
        allocations: []
      })
    }

    // Get all active rooms (only Male and Female)
    const rooms = await prisma.room.findMany({
      where: {
        isActive: true,
        gender: {
          in: ['Male', 'Female']
        }
      },
      include: {
        allocations: true
      },
      orderBy: { name: 'asc' }
    })

    if (rooms.length === 0) {
      return NextResponse.json(
        { error: 'No active rooms available for allocation' },
        { status: 400 }
      )
    }

    // Separate registrations by gender
    const maleRegistrations = unallocatedRegistrations.filter(reg => reg.gender === 'Male')
    const femaleRegistrations = unallocatedRegistrations.filter(reg => reg.gender === 'Female')

    // Separate rooms by gender
    const maleRooms = rooms.filter(room => room.gender === 'Male')
    const femaleRooms = rooms.filter(room => room.gender === 'Female')

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
    }> = []

    // Function to randomly shuffle an array
    const shuffleArray = <T>(array: T[]): T[] => {
      const shuffled = [...array]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      return shuffled
    }

    // Function to randomly allocate registrations to rooms
    const randomlyAllocate = (registrations: typeof unallocatedRegistrations, availableRooms: typeof rooms, gender: string) => {
      // Shuffle both registrations and rooms for maximum randomness
      const shuffledRegistrations = shuffleArray(registrations)
      const shuffledRooms = shuffleArray(availableRooms)

      let allocated = 0
      let registrationIndex = 0

      // Create a list of available room slots
      const roomSlots: Array<{ roomId: string; slotsAvailable: number }> = []
      
      shuffledRooms.forEach(room => {
        const availableSlots = room.capacity - room.allocations.length
        if (availableSlots > 0) {
          roomSlots.push({
            roomId: room.id,
            slotsAvailable: availableSlots
          })
        }
      })

      // Shuffle room slots for random distribution
      const shuffledRoomSlots = shuffleArray(roomSlots)

      // Allocate registrations randomly to available slots
      for (const registration of shuffledRegistrations) {
        if (registrationIndex >= shuffledRoomSlots.length) {
          // Find a room slot with available space
          const availableSlot = shuffledRoomSlots.find(slot => slot.slotsAvailable > 0)
          if (!availableSlot) {
            break // No more room slots available
          }
          
          // Allocate to this room
          allocations.push({
            registrationId: registration.id,
            roomId: availableSlot.roomId,
            allocatedBy: currentUser.email
          })

          // Decrease available slots
          availableSlot.slotsAvailable--
          allocated++
        } else {
          // Use round-robin with randomization
          const currentSlotIndex = registrationIndex % shuffledRoomSlots.length
          const currentSlot = shuffledRoomSlots[currentSlotIndex]
          
          if (currentSlot.slotsAvailable > 0) {
            allocations.push({
              registrationId: registration.id,
              roomId: currentSlot.roomId,
              allocatedBy: currentUser.email
            })

            currentSlot.slotsAvailable--
            allocated++
          } else {
            // Find any available slot
            const availableSlot = shuffledRoomSlots.find(slot => slot.slotsAvailable > 0)
            if (availableSlot) {
              allocations.push({
                registrationId: registration.id,
                roomId: availableSlot.roomId,
                allocatedBy: currentUser.email
              })

              availableSlot.slotsAvailable--
              allocated++
            }
          }
        }
        registrationIndex++
      }

      return {
        allocated,
        total: registrations.length
      }
    }

    // Randomly allocate male registrations
    if (maleRegistrations.length > 0 && maleRooms.length > 0) {
      const maleResult = randomlyAllocate(maleRegistrations, maleRooms, 'Male')
      allocationResults.push({
        group: 'Male Participants',
        count: maleResult.total,
        allocated: maleResult.allocated,
        remaining: maleResult.total - maleResult.allocated,
        status: maleResult.allocated === maleResult.total ? 'success' : 'partial'
      })
    }

    // Randomly allocate female registrations
    if (femaleRegistrations.length > 0 && femaleRooms.length > 0) {
      const femaleResult = randomlyAllocate(femaleRegistrations, femaleRooms, 'Female')
      allocationResults.push({
        group: 'Female Participants',
        count: femaleResult.total,
        allocated: femaleResult.allocated,
        remaining: femaleResult.total - femaleResult.allocated,
        status: femaleResult.allocated === femaleResult.total ? 'success' : 'partial'
      })
    }

    // Create allocations in database
    if (allocations.length > 0) {
      await prisma.roomAllocation.createMany({
        data: allocations
      })

      // Invalidate cache to ensure fresh data is fetched
      invalidateCache.accommodations()
    }

    const totalAllocated = allocations.length

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
        console.log('Random allocation bulk email results:', results.summary)
      }).catch((emailError) => {
        console.error('Error sending bulk room allocation emails for random allocation:', emailError)
      })

      console.log(`Started sending room allocation emails to ${allocations.length} randomly allocated registrants in background...`)

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
      message: `Successfully allocated ${totalAllocated} registrations randomly`,
      totalAllocated,
      results: allocationResults,
      allocationType: 'random',
      emailResults: emailResults ? {
        emailsSent: emailResults.summary.successful,
        emailsFailed: emailResults.summary.failed,
        totalEmails: emailResults.summary.total
      } : null
    })

  } catch (error) {
    console.error('Random allocation error:', error)
    return NextResponse.json(
      { error: 'Failed to perform random allocation' },
      { status: 500 }
    )
  }
}
