import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { fullName, dateOfBirth, gender } = await request.json()

    if (!fullName) {
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      )
    }

    const normalizedName = fullName.toLowerCase().trim()

    // Check for existing children registration with same name, age, and gender (enhanced duplicate validation)
    // First get all registrations and filter in JavaScript for SQLite compatibility
    const allRegistrations = await prisma.childrenRegistration.findMany({
      select: {
        id: true,
        fullName: true,
        parentGuardianEmail: true,
        parentGuardianPhone: true,
        dateOfBirth: true,
        gender: true,
        createdAt: true
      }
    })

    // Enhanced duplicate validation: Check for same name + gender + date of birth combination
    // This is the primary duplicate check for children registrations
    const duplicateRegistration = allRegistrations.find(reg => {
      const nameMatch = reg.fullName.toLowerCase().trim() === normalizedName
      const genderMatch = gender && reg.gender === gender
      const dateMatch = dateOfBirth && reg.dateOfBirth &&
        new Date(reg.dateOfBirth).getTime() === new Date(dateOfBirth).getTime()

      // For children, we require all three fields to match for a duplicate
      return nameMatch && genderMatch && dateMatch
    })

    // Also check for exact name match only (less strict)
    const nameOnlyMatch = allRegistrations.find(reg =>
      reg.fullName.toLowerCase().trim() === normalizedName
    )



    // Calculate age for display
    const calculateAge = (birthDate: Date) => {
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      return age
    }

    // Check for strict duplicate (name + gender + date of birth)
    if (duplicateRegistration) {
      return NextResponse.json({
        isDuplicate: true,
        duplicateFields: ['name', 'gender', 'dateOfBirth'],
        duplicateType: 'exact',
        existingRegistration: {
          id: duplicateRegistration.id,
          fullName: duplicateRegistration.fullName,
          parentGuardianEmail: duplicateRegistration.parentGuardianEmail,
          parentGuardianPhone: duplicateRegistration.parentGuardianPhone,
          age: calculateAge(duplicateRegistration.dateOfBirth),
          gender: duplicateRegistration.gender,
          registrationDate: duplicateRegistration.createdAt
        }
      })
    }

    // Check for name-only match (warning level)
    if (nameOnlyMatch) {
      return NextResponse.json({
        isDuplicate: false,
        hasSimilarNames: true,
        duplicateType: 'name_only',
        similarRegistrations: [{
          id: nameOnlyMatch.id,
          fullName: nameOnlyMatch.fullName,
          parentGuardianEmail: nameOnlyMatch.parentGuardianEmail,
          parentGuardianPhone: nameOnlyMatch.parentGuardianPhone,
          age: calculateAge(nameOnlyMatch.dateOfBirth),
          gender: nameOnlyMatch.gender,
          registrationDate: nameOnlyMatch.createdAt
        }]
      })
    }



    return NextResponse.json({
      isDuplicate: false,
      hasSimilarNames: false
    })

  } catch (error) {
    console.error('Children duplicate check error:', error)
    return NextResponse.json(
      { error: 'Failed to check for duplicate children registration' },
      { status: 500 }
    )
  }
}
