import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticateRequest } from '@/lib/auth-helpers'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to export accommodations (Staff and Viewer cannot export)
    if (!['Super Admin', 'Admin', 'Manager'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv' // 'csv' or 'pdf'
    const search = searchParams.get('search') || ''
    const filter = searchParams.get('filter') || 'all'

    // Build search conditions (same as search route)
    const searchConditions: any[] = []

    if (search.trim()) {
      const searchTerm = search.trim()
      searchConditions.push({
        OR: [
          { fullName: { contains: searchTerm } },
          { emailAddress: { contains: searchTerm } },
          { phoneNumber: { contains: searchTerm } },
          {
            roomAllocation: {
              room: {
                name: { contains: searchTerm }
              }
            }
          }
        ]
      })
    }

    if (filter === 'allocated') {
      searchConditions.push({
        roomAllocation: {
          isNot: null
        }
      })
    } else if (filter === 'unallocated') {
      searchConditions.push({
        roomAllocation: null
      })
    }

    const whereClause = searchConditions.length > 0 ? { AND: searchConditions } : {}

    // Get data for export
    const registrations = await prisma.registration.findMany({
      where: whereClause,
      include: {
        roomAllocation: {
          include: {
            room: {
              select: {
                id: true,
                name: true,
                gender: true,
                capacity: true,
                description: true
              }
            }
          }
        }
      },
      orderBy: [
        { roomAllocation: { room: { name: 'asc' } } },
        { fullName: 'asc' }
      ]
    })

    if (format === 'csv') {
      return generateCSV(registrations)
    } else if (format === 'pdf') {
      return generatePDF(registrations)
    } else {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error exporting accommodations:', error)
    return NextResponse.json(
      { error: 'Failed to export accommodations' },
      { status: 500 }
    )
  }
}

function generateCSV(registrations: any[]) {
  const headers = [
    'Full Name',
    'Gender',
    'Age',
    'Email',
    'Phone',
    'Address',
    'Room Name',
    'Room Gender',
    'Room Capacity',
    'Emergency Contact Name',
    'Emergency Contact Phone',
    'Emergency Contact Relationship',
    'Parent/Guardian Name',
    'Parent/Guardian Phone',
    'Medications',
    'Allergies',
    'Special Needs',
    'Dietary Restrictions',
    'Registration Date'
  ]

  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const csvRows = [
    headers.join(','),
    ...registrations.map(reg => [
      `"${reg.fullName}"`,
      `"${reg.gender}"`,
      calculateAge(reg.dateOfBirth),
      `"${reg.emailAddress}"`,
      `"${reg.phoneNumber}"`,
      `"${reg.address}"`,
      `"${reg.roomAllocation?.room?.name || 'Unallocated'}"`,
      `"${reg.roomAllocation?.room?.gender || 'N/A'}"`,
      reg.roomAllocation?.room?.capacity || 'N/A',
      `"${reg.emergencyContactName}"`,
      `"${reg.emergencyContactPhone}"`,
      `"${reg.emergencyContactRelationship}"`,
      `"${reg.parentGuardianName || ''}"`,
      `"${reg.parentGuardianPhone || ''}"`,
      `"${reg.medications || ''}"`,
      `"${reg.allergies || ''}"`,
      `"${reg.specialNeeds || ''}"`,
      `"${reg.dietaryRestrictions || ''}"`,
      `"${new Date(reg.createdAt).toLocaleDateString()}"`
    ].join(','))
  ]

  const csvContent = csvRows.join('\n')

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="accommodation-report-${new Date().toISOString().split('T')[0]}.csv"`
    }
  })
}

function generatePDF(registrations: any[]) {
  // Generate HTML content that can be printed as PDF by the browser
  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  // Group by rooms
  const roomGroups = registrations.reduce((groups, reg) => {
    const roomName = reg.roomAllocation?.room?.name || 'Unallocated'
    if (!groups[roomName]) {
      groups[roomName] = []
    }
    groups[roomName].push(reg)
    return groups
  }, {} as Record<string, any[]>)

  let htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accommodation Report</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            padding: 20px;
            background: #fff;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #6366f1;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #6366f1;
            font-size: 28px;
            margin-bottom: 10px;
        }
        .header p {
            color: #6b7280;
            font-size: 14px;
        }
        .room-section {
            margin-bottom: 30px;
            page-break-inside: avoid;
        }
        .room-header {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
        }
        .room-title {
            font-size: 18px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 5px;
        }
        .room-info {
            color: #64748b;
            font-size: 14px;
        }
        .participants-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .participants-table th,
        .participants-table td {
            border: 1px solid #e2e8f0;
            padding: 8px 12px;
            text-align: left;
            font-size: 12px;
        }
        .participants-table th {
            background: #f1f5f9;
            font-weight: bold;
            color: #334155;
        }
        .participants-table tr:nth-child(even) {
            background: #f8fafc;
        }
        .summary {
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 8px;
            padding: 15px;
            margin-top: 30px;
        }
        @media print {
            body { padding: 10px; }
            .room-section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Accommodation Report</h1>
        <p>Generated on: ${new Date().toLocaleDateString()}</p>
        <p>Total Registrations: ${registrations.length}</p>
    </div>
`

  Object.entries(roomGroups).forEach(([roomName, roomRegistrations]) => {
    const room = roomRegistrations[0]?.roomAllocation?.room

    htmlContent += `
    <div class="room-section">
        <div class="room-header">
            <div class="room-title">${roomName}</div>`

    if (room) {
      htmlContent += `
            <div class="room-info">
                Gender: ${room.gender} | Capacity: ${room.capacity} | Current Occupancy: ${roomRegistrations.length}
            </div>`
    }

    htmlContent += `
        </div>

        <table class="participants-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Gender</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Emergency Contact</th>
                    <th>Medical Notes</th>
                </tr>
            </thead>
            <tbody>`

    roomRegistrations.forEach((reg, index) => {
      const age = calculateAge(reg.dateOfBirth)
      const medicalNotes = ['None'] // Medical information not collected in registration form

      htmlContent += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${reg.fullName}</td>
                    <td>${age}</td>
                    <td>${reg.gender}</td>
                    <td>${reg.emailAddress || reg.email}</td>
                    <td>${reg.phoneNumber}</td>
                    <td>${reg.emergencyContactName} (${reg.emergencyContactPhone})</td>
                    <td>${medicalNotes.join(' | ') || 'None'}</td>
                </tr>`
    })

    htmlContent += `
            </tbody>
        </table>
    </div>`
  })

  htmlContent += `
    <div class="summary">
        <h3>Summary</h3>
        <p><strong>Total Rooms:</strong> ${Object.keys(roomGroups).length}</p>
        <p><strong>Total Participants:</strong> ${registrations.length}</p>
        <p><strong>Allocated:</strong> ${registrations.filter(r => r.roomAllocation).length}</p>
        <p><strong>Unallocated:</strong> ${registrations.filter(r => !r.roomAllocation).length}</p>
    </div>
</body>
</html>`

  return new NextResponse(htmlContent, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Disposition': `attachment; filename="accommodation-report-${new Date().toISOString().split('T')[0]}.html"`
    }
  })
}
