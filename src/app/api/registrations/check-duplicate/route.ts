import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { emailAddress, phoneNumber, fullName } = await request.json()

    if (!emailAddress || !phoneNumber || !fullName) {
      return NextResponse.json(
        { error: 'Full name, email address and phone number are required' },
        { status: 400 }
      )
    }

    const normalizedEmail = emailAddress.toLowerCase().trim()
    const normalizedPhone = phoneNumber.trim()
    const normalizedName = fullName.toLowerCase().trim()

    // Check for existing registration with same email, phone, or full name
    const existingRegistration = await prisma.registration.findFirst({
      where: {
        OR: [
          { emailAddress: normalizedEmail },
          { phoneNumber: normalizedPhone },
          {
            fullName: {
              equals: normalizedName
            }
          }
        ]
      },
      select: {
        id: true,
        fullName: true,
        emailAddress: true,
        phoneNumber: true,
        createdAt: true
      }
    })

    // Additional check for very similar names (fuzzy matching)
    const similarNameRegistrations = await prisma.registration.findMany({
      where: {
        OR: [
          {
            fullName: {
              contains: normalizedName.split(' ')[0] // First name match
            }
          },
          {
            fullName: {
              contains: normalizedName.split(' ').slice(-1)[0] // Last name match
            }
          }
        ]
      },
      select: {
        id: true,
        fullName: true,
        emailAddress: true,
        phoneNumber: true,
        createdAt: true
      }
    })

    // Filter similar names to find potential duplicates (more strict)
    const potentialDuplicates = similarNameRegistrations.filter(reg => {
      const regName = reg.fullName.toLowerCase().trim()
      const nameWords = normalizedName.split(' ')
      const regWords = regName.split(' ')

      // Check if names have significant overlap (stricter matching)
      const commonWords = nameWords.filter(word =>
        regWords.some(regWord =>
          regWord.includes(word) || word.includes(regWord) ||
          // Check for similar sounding names (basic phonetic matching)
          Math.abs(regWord.length - word.length) <= 2 &&
          (regWord.startsWith(word.substring(0, 3)) || word.startsWith(regWord.substring(0, 3)))
        )
      )

      // More strict: require higher similarity threshold
      return commonWords.length >= Math.min(nameWords.length, regWords.length) * 0.6
    })

    if (existingRegistration) {
      // Determine which field(s) caused the duplicate
      const duplicateFields: string[] = []
      if (existingRegistration.emailAddress === normalizedEmail) {
        duplicateFields.push('email')
      }
      if (existingRegistration.phoneNumber === normalizedPhone) {
        duplicateFields.push('phone')
      }
      if (existingRegistration.fullName.toLowerCase().trim() === normalizedName) {
        duplicateFields.push('name')
      }

      return NextResponse.json({
        isDuplicate: true,
        duplicateFields,
        existingRegistration: {
          id: existingRegistration.id,
          fullName: existingRegistration.fullName,
          emailAddress: existingRegistration.emailAddress,
          phoneNumber: existingRegistration.phoneNumber,
          registrationDate: existingRegistration.createdAt
        }
      })
    }

    // Check for potential duplicates (similar names)
    if (potentialDuplicates.length > 0) {
      return NextResponse.json({
        isDuplicate: false,
        hasSimilarNames: true,
        similarRegistrations: potentialDuplicates.map(reg => ({
          id: reg.id,
          fullName: reg.fullName,
          emailAddress: reg.emailAddress,
          phoneNumber: reg.phoneNumber,
          registrationDate: reg.createdAt
        }))
      })
    }

    return NextResponse.json({
      isDuplicate: false,
      hasSimilarNames: false
    })

  } catch (error) {
    console.error('Duplicate check error:', error)
    return NextResponse.json(
      { error: 'Failed to check for duplicate registration' },
      { status: 500 }
    )
  }
}
