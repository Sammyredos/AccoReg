import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth-helpers'
import { calculateAge } from '@/lib/age-calculator'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission
    if (!['Super Admin', 'Admin', 'Manager'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get URL parameters
    const url = new URL(request.url)
    const ageRangeYears = parseInt(url.searchParams.get('ageRangeYears') || '5')

    // Get maximum allowed age gap from configuration
    const ageGapConfig = await prisma.systemConfig.findUnique({
      where: { key: 'accommodation_max_age_gap' }
    })
    const maxAgeGap = ageGapConfig ? parseInt(ageGapConfig.value) : 5

    // Get all unallocated registrations (including unverified for debugging)
    const allUnallocatedRegistrations = await prisma.registration.findMany({
      where: {
        roomAllocation: null,
        gender: {
          in: ['Male', 'Female']
        }
      },
      select: {
        id: true,
        fullName: true,
        gender: true,
        dateOfBirth: true,
        isVerified: true
      },
      orderBy: [
        { gender: 'asc' },
        { dateOfBirth: 'asc' }
      ]
    })

    // Get only verified unallocated registrations
    const verifiedUnallocatedRegistrations = allUnallocatedRegistrations.filter(reg => reg.isVerified)

    // Get all active rooms
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
                fullName: true,
                dateOfBirth: true,
                gender: true
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Calculate ages and group registrations
    const registrationsWithAge = verifiedUnallocatedRegistrations.map(reg => {
      const age = reg.dateOfBirth ? calculateAge(reg.dateOfBirth) : 0
      const baseAge = Math.floor(age / ageRangeYears) * ageRangeYears
      const minAge = baseAge
      const maxAge = baseAge + ageRangeYears - 1
      const ageGroup = `${minAge}-${maxAge}`
      
      return { 
        ...reg, 
        age,
        ageGroup,
        minAge,
        maxAge
      }
    })

    // Group by gender and age group
    const groupedRegistrations = registrationsWithAge.reduce((groups, reg) => {
      const key = `${reg.gender}-${reg.ageGroup}`
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(reg)
      return groups
    }, {} as Record<string, typeof registrationsWithAge>)

    // Analyze room availability for each group
    const groupAnalysis = Object.entries(groupedRegistrations).map(([groupKey, registrations]) => {
      const [gender, ageGroup] = groupKey.split('-')
      const [minAgeStr, maxAgeStr] = ageGroup.split('-')
      const minAge = parseInt(minAgeStr)
      const maxAge = parseInt(maxAgeStr)

      // Find suitable rooms for this group
      const genderRooms = rooms.filter(room => room.gender === gender)
      const availableRooms = genderRooms.filter(room => room.allocations.length < room.capacity)
      
      const roomAnalysis = availableRooms.map(room => {
        if (room.allocations.length === 0) {
          return {
            roomId: room.id,
            roomName: room.name,
            capacity: room.capacity,
            currentOccupancy: 0,
            availableSpaces: room.capacity,
            suitable: true,
            reason: 'Empty room - suitable for any age group'
          }
        }

        // Calculate existing ages in room
        const existingAges = room.allocations.map(allocation => 
          calculateAge(allocation.registration.dateOfBirth)
        )
        const roomMinAge = Math.min(...existingAges)
        const roomMaxAge = Math.max(...existingAges)

        // Check compatibility
        const newMinAge = Math.min(roomMinAge, minAge)
        const newMaxAge = Math.max(roomMaxAge, maxAge)
        const totalAgeRange = newMaxAge - newMinAge
        const isCompatible = totalAgeRange <= maxAgeGap

        return {
          roomId: room.id,
          roomName: room.name,
          capacity: room.capacity,
          currentOccupancy: room.allocations.length,
          availableSpaces: room.capacity - room.allocations.length,
          existingAges: existingAges,
          roomAgeRange: `${roomMinAge}-${roomMaxAge}`,
          newAgeRange: `${newMinAge}-${newMaxAge}`,
          totalAgeRange,
          maxAllowedGap: maxAgeGap,
          suitable: isCompatible,
          reason: isCompatible 
            ? `Compatible - total age range ${totalAgeRange} ≤ ${maxAgeGap}`
            : `Incompatible - total age range ${totalAgeRange} > ${maxAgeGap}`
        }
      })

      const suitableRooms = roomAnalysis.filter(room => room.suitable)
      const totalAvailableSpaces = suitableRooms.reduce((sum, room) => sum + room.availableSpaces, 0)

      return {
        group: `${gender} (${ageGroup} years)`,
        registrations: registrations.map(reg => ({
          id: reg.id,
          name: reg.fullName,
          age: reg.age,
          isVerified: reg.isVerified
        })),
        count: registrations.length,
        averageAge: Math.round(registrations.reduce((sum, reg) => sum + reg.age, 0) / registrations.length),
        totalGenderRooms: genderRooms.length,
        availableGenderRooms: availableRooms.length,
        suitableRooms: suitableRooms.length,
        totalAvailableSpaces,
        canAllocateAll: totalAvailableSpaces >= registrations.length,
        roomAnalysis
      }
    })

    // Overall statistics
    const stats = {
      totalUnallocated: allUnallocatedRegistrations.length,
      verifiedUnallocated: verifiedUnallocatedRegistrations.length,
      unverifiedUnallocated: allUnallocatedRegistrations.length - verifiedUnallocatedRegistrations.length,
      totalRooms: rooms.length,
      totalCapacity: rooms.reduce((sum, room) => sum + room.capacity, 0),
      totalOccupied: rooms.reduce((sum, room) => sum + room.allocations.length, 0),
      totalAvailable: rooms.reduce((sum, room) => sum + (room.capacity - room.allocations.length), 0),
      ageRangeYears,
      maxAgeGap
    }

    return NextResponse.json({
      success: true,
      stats,
      groupAnalysis,
      rooms: rooms.map(room => ({
        id: room.id,
        name: room.name,
        gender: room.gender,
        capacity: room.capacity,
        currentOccupancy: room.allocations.length,
        availableSpaces: room.capacity - room.allocations.length,
        occupants: room.allocations.map(allocation => ({
          name: allocation.registration.fullName,
          age: calculateAge(allocation.registration.dateOfBirth)
        }))
      }))
    })

  } catch (error) {
    console.error('Error debugging allocation:', error)
    return NextResponse.json(
      { error: 'Failed to debug allocation' },
      { status: 500 }
    )
  }
}
