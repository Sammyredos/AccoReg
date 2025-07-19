import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { searchTerm } = await request.json()

    if (!searchTerm || searchTerm.length < 2) {
      return NextResponse.json({
        success: true,
        results: [],
        message: 'Search term too short'
      })
    }

    const normalizedSearchTerm = searchTerm.toLowerCase().trim()

    // Search for similar children registrations
    let registrations: any[] = []

    try {
      registrations = await prisma.childrenRegistration.findMany({
        where: {
          OR: [
            {
              fullName: {
                contains: normalizedSearchTerm,
                mode: 'insensitive'
              }
            },
            {
              parentGuardianName: {
                contains: normalizedSearchTerm,
                mode: 'insensitive'
              }
            },
            {
              parentGuardianEmail: {
                contains: normalizedSearchTerm,
                mode: 'insensitive'
              }
            }
          ]
        },
        select: {
          id: true,
          fullName: true,
          parentGuardianEmail: true,
          parentGuardianPhone: true,
          dateOfBirth: true,
          gender: true,
          createdAt: true
        },
        orderBy: [
          { fullName: 'asc' }
        ],
        take: 5 // Limit to 5 results for performance
      })
    } catch (error: any) {
      // If table doesn't exist, return empty results
      if (error.code === 'P2021' && error.message.includes('does not exist')) {
        console.log('Children registrations table does not exist, no search results possible')
        return NextResponse.json({
          success: true,
          results: [],
          message: 'No registrations found'
        })
      }
      throw error
    }

    // Calculate age for each registration
    const calculateAge = (dateOfBirth: Date) => {
      const today = new Date()
      let age = today.getFullYear() - dateOfBirth.getFullYear()
      const monthDiff = today.getMonth() - dateOfBirth.getMonth()
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
        age--
      }
      
      return age
    }

    // Format results
    const results = registrations.map(reg => ({
      id: reg.id,
      fullName: reg.fullName,
      parentGuardianEmail: reg.parentGuardianEmail,
      parentGuardianPhone: reg.parentGuardianPhone,
      age: calculateAge(new Date(reg.dateOfBirth)),
      gender: reg.gender,
      registrationDate: reg.createdAt
    }))

    return NextResponse.json({
      success: true,
      results,
      total: results.length,
      searchTerm,
      message: `Found ${results.length} similar registration(s)`
    })

  } catch (error) {
    console.error('Children search error:', error)
    return NextResponse.json(
      { error: 'Failed to search children registrations' },
      { status: 500 }
    )
  }
}
