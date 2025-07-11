import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify token
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get current user
    const userType = payload.type || 'admin'
    let currentUser

    if (userType === 'admin') {
      currentUser = await prisma.admin.findUnique({
        where: { id: payload.adminId },
        include: { role: true }
      })
    } else {
      currentUser = await prisma.user.findUnique({
        where: { id: payload.adminId },
        include: { role: true }
      })
    }

    if (!currentUser || !currentUser.isActive) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 })
    }

    // Check permissions - Staff can view but not download reports
    const allowedRoles = ['Super Admin', 'Admin', 'Manager']
    if (!allowedRoles.includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions to download reports' }, { status: 403 })
    }

    const body = await request.json()
    const { reportType, dateRange, format } = body

    // Calculate date range
    let startDate: Date
    let endDate = new Date()

    switch (dateRange) {
      case 'last7days':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'last30days':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'last3months':
        startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case 'last6months':
        startDate = new Date(endDate.getTime() - 180 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    // Get registrations within date range
    const registrations = await prisma.registration.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    let reportData: any = {}

    switch (reportType) {
      case 'summary':
        reportData = generateSummaryReport(registrations, startDate, endDate)
        break
      case 'demographics':
        reportData = generateDemographicsReport(registrations)
        break
      case 'analytics':
        reportData = generateAnalyticsReport(registrations, startDate, endDate)
        break
      default:
        reportData = generateSummaryReport(registrations, startDate, endDate)
    }

    // Generate report content based on format
    let reportContent: string | Buffer
    let contentType: string
    let filename: string

    switch (format) {
      case 'csv':
        reportContent = generateCSVReport(reportData, reportType)
        contentType = 'text/csv'
        filename = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`
        break
      case 'json':
        reportContent = JSON.stringify(reportData, null, 2)
        contentType = 'application/json'
        filename = `${reportType}-report-${new Date().toISOString().split('T')[0]}.json`
        break
      case 'pdf':
        // Generate HTML content that can be printed to PDF by the browser
        const htmlContent = generateHTMLReport(reportData, reportType, startDate, endDate)
        reportContent = htmlContent
        contentType = 'text/html'
        filename = `${reportType}-report-${new Date().toISOString().split('T')[0]}.html`
        break
      default:
        reportContent = generateHTMLReport(reportData, reportType, startDate, endDate)
        contentType = 'text/html'
        filename = `${reportType}-report-${new Date().toISOString().split('T')[0]}.html`
    }

    return new NextResponse(reportContent, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}

function generateSummaryReport(registrations: any[], startDate: Date, endDate: Date) {
  const totalRegistrations = registrations.length
  const ageGroups = { '10-12': 0, '13-15': 0, '16-18': 0, '19+': 0 }
  const genderDistribution = { male: 0, female: 0 }

  registrations.forEach(reg => {
    const age = calculateAge(reg.dateOfBirth)
    if (age >= 10 && age <= 12) ageGroups['10-12']++
    else if (age >= 13 && age <= 15) ageGroups['13-15']++
    else if (age >= 16 && age <= 18) ageGroups['16-18']++
    else if (age >= 19) ageGroups['19+']++

    if (reg.gender.toLowerCase() === 'male') genderDistribution.male++
    else if (reg.gender.toLowerCase() === 'female') genderDistribution.female++
  })

  return {
    summary: {
      totalRegistrations,
      dateRange: { startDate, endDate },
      ageGroups,
      genderDistribution
    },
    registrations
  }
}

function generateDemographicsReport(registrations: any[]) {
  const demographics = {
    totalParticipants: registrations.length,
    ageDistribution: {} as Record<number, number>,
    genderDistribution: { male: 0, female: 0 },
    medicalInfo: {
      withMedications: 0,
      withAllergies: 0,
      withSpecialNeeds: 0,
      withDietaryRestrictions: 0
    }
  }

  registrations.forEach(reg => {
    const age = calculateAge(reg.dateOfBirth)
    demographics.ageDistribution[age] = (demographics.ageDistribution[age] || 0) + 1

    if (reg.gender.toLowerCase() === 'male') demographics.genderDistribution.male++
    else if (reg.gender.toLowerCase() === 'female') demographics.genderDistribution.female++

    if (reg.medications && reg.medications !== 'None') demographics.medicalInfo.withMedications++
    if (reg.allergies && reg.allergies !== 'None') demographics.medicalInfo.withAllergies++
    if (reg.specialNeeds && reg.specialNeeds !== 'None') demographics.medicalInfo.withSpecialNeeds++
    if (reg.dietaryRestrictions && reg.dietaryRestrictions !== 'None') demographics.medicalInfo.withDietaryRestrictions++
  })

  return demographics
}

function generateAnalyticsReport(registrations: any[], startDate: Date, endDate: Date) {
  const dailyRegistrations: Record<string, number> = {}
  const monthlyTrends: Record<string, number> = {}

  registrations.forEach(reg => {
    const date = new Date(reg.createdAt).toISOString().split('T')[0]
    const month = new Date(reg.createdAt).toISOString().substring(0, 7)

    dailyRegistrations[date] = (dailyRegistrations[date] || 0) + 1
    monthlyTrends[month] = (monthlyTrends[month] || 0) + 1
  })

  return {
    analytics: {
      totalRegistrations: registrations.length,
      dailyRegistrations,
      monthlyTrends,
      averageAge: registrations.length > 0
        ? Math.round(registrations.reduce((sum, reg) => sum + calculateAge(reg.dateOfBirth), 0) / registrations.length)
        : 0
    }
  }
}

function generateCSVReport(data: any, reportType: string): string {
  if (reportType === 'summary' && data.registrations) {
    const headers = ['Name', 'Email', 'Phone', 'Age', 'Gender', 'Registration Date']
    const rows = data.registrations.map((reg: any) => [
      reg.fullName,
      reg.emailAddress,
      reg.phoneNumber,
      calculateAge(reg.dateOfBirth),
      reg.gender,
      new Date(reg.createdAt).toLocaleDateString()
    ])

    return [headers.join(','), ...rows.map((row: any[]) => row.join(','))].join('\n')
  }

  return JSON.stringify(data, null, 2)
}

function generateHTMLReport(data: any, reportType: string, startDate: Date, endDate: Date): string {
  switch (reportType) {
    case 'summary':
      return generateSummaryHTMLReport(data, startDate, endDate)
    case 'demographics':
      return generateDemographicsHTMLReport(data, startDate, endDate)
    case 'analytics':
      return generateAnalyticsHTMLReport(data, startDate, endDate)
    default:
      return generateSummaryHTMLReport(data, startDate, endDate)
  }
}

function generateSummaryHTMLReport(data: any, startDate: Date, endDate: Date): string {
  const { summary, registrations } = data

  return `
<!DOCTYPE html>
<html>
<head>
    <title>Registration Summary Report</title>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f8f9fa;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            border-radius: 12px;
            margin-bottom: 30px;
            text-align: center;
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { font-size: 1.1em; opacity: 0.9; }

        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .metric-card {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            text-align: center;
            border-left: 5px solid #667eea;
        }
        .metric-value {
            font-size: 3em;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 10px;
        }
        .metric-label {
            font-size: 1.1em;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .charts-section {
            background: white;
            padding: 40px;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .chart-title {
            font-size: 1.5em;
            margin-bottom: 30px;
            color: #333;
            text-align: center;
        }

        .age-chart, .gender-chart {
            margin-bottom: 40px;
        }
        .chart-bar {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .bar-label {
            width: 120px;
            font-weight: bold;
            color: #555;
        }
        .bar-container {
            flex: 1;
            height: 30px;
            background: #e9ecef;
            border-radius: 15px;
            margin: 0 15px;
            overflow: hidden;
        }
        .bar-fill {
            height: 100%;
            border-radius: 15px;
            transition: width 0.8s ease;
        }
        .age-bar { background: linear-gradient(90deg, #667eea, #764ba2); }
        .gender-male { background: linear-gradient(90deg, #4facfe, #00f2fe); }
        .gender-female { background: linear-gradient(90deg, #f093fb, #f5576c); }
        .bar-value {
            width: 60px;
            text-align: right;
            font-weight: bold;
            color: #333;
        }

        .participants-table {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .table-header {
            background: #667eea;
            color: white;
            padding: 20px;
            font-size: 1.3em;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 15px;
            text-align: left;
            border-bottom: 1px solid #e9ecef;
        }
        th {
            background: #f8f9fa;
            font-weight: bold;
            color: #555;
        }
        tr:hover { background: #f8f9fa; }

        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            color: #666;
            font-size: 0.9em;
        }

        @media print {
            body { background: white; }
            .container { padding: 0; }
            .header { background: #667eea !important; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Registration Summary Report</h1>
            <p>Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</p>
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">${summary.totalRegistrations}</div>
                <div class="metric-label">Total Participants</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${summary.genderDistribution.male}</div>
                <div class="metric-label">Male Participants</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${summary.genderDistribution.female}</div>
                <div class="metric-label">Female Participants</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${Object.values(summary.ageGroups).reduce((a: any, b: any) => Math.max(a, b), 0)}</div>
                <div class="metric-label">Largest Age Group</div>
            </div>
        </div>

        <div class="charts-section">
            <div class="age-chart">
                <h3 class="chart-title">👥 Age Distribution</h3>
                ${Object.entries(summary.ageGroups).map(([ageGroup, count]: [string, any]) => `
                    <div class="chart-bar">
                        <div class="bar-label">${ageGroup} years</div>
                        <div class="bar-container">
                            <div class="bar-fill age-bar" style="width: ${(count / summary.totalRegistrations) * 100}%"></div>
                        </div>
                        <div class="bar-value">${count} people</div>
                    </div>
                `).join('')}
            </div>

            <div class="gender-chart">
                <h3 class="chart-title">⚥ Gender Distribution</h3>
                <div class="chart-bar">
                    <div class="bar-label">Male</div>
                    <div class="bar-container">
                        <div class="bar-fill gender-male" style="width: ${(summary.genderDistribution.male / summary.totalRegistrations) * 100}%"></div>
                    </div>
                    <div class="bar-value">${summary.genderDistribution.male} people</div>
                </div>
                <div class="chart-bar">
                    <div class="bar-label">Female</div>
                    <div class="bar-container">
                        <div class="bar-fill gender-female" style="width: ${(summary.genderDistribution.female / summary.totalRegistrations) * 100}%"></div>
                    </div>
                    <div class="bar-value">${summary.genderDistribution.female} people</div>
                </div>
            </div>
        </div>

        <div class="participants-table">
            <div class="table-header">
                👤 Participant Details
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Age</th>
                        <th>Gender</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Registration Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${registrations.map((reg: any) => `
                        <tr>
                            <td><strong>${reg.fullName}</strong></td>
                            <td>${calculateAge(reg.dateOfBirth)} years</td>
                            <td>${reg.gender}</td>
                            <td>${reg.emailAddress}</td>
                            <td>${reg.phoneNumber}</td>
                            <td>${new Date(reg.createdAt).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="footer">
            <p>📋 This report was automatically generated by the Youth Registration System</p>
            <p>For questions or support, please contact the system administrator</p>
        </div>
    </div>
</body>
</html>`
}

function generateDemographicsHTMLReport(data: any, startDate: Date, endDate: Date): string {
  const { totalParticipants, ageDistribution, genderDistribution, medicalInfo } = data

  return `
<!DOCTYPE html>
<html>
<head>
    <title>Demographics Report</title>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f8f9fa;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            padding: 40px;
            border-radius: 12px;
            margin-bottom: 30px;
            text-align: center;
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { font-size: 1.1em; opacity: 0.9; }

        .summary-card {
            background: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            text-align: center;
        }
        .total-participants {
            font-size: 4em;
            font-weight: bold;
            color: #28a745;
            margin-bottom: 10px;
        }
        .participants-label {
            font-size: 1.3em;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 2px;
        }

        .demographics-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
        }
        .demo-section {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .section-title {
            font-size: 1.4em;
            margin-bottom: 25px;
            color: #333;
            text-align: center;
            padding-bottom: 10px;
            border-bottom: 2px solid #28a745;
        }

        .age-item, .medical-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #e9ecef;
        }
        .age-item:last-child, .medical-item:last-child { border-bottom: none; }
        .age-label, .medical-label {
            font-weight: bold;
            color: #555;
        }
        .age-count, .medical-count {
            background: #28a745;
            color: white;
            padding: 5px 12px;
            border-radius: 20px;
            font-weight: bold;
        }

        .gender-visual {
            display: flex;
            height: 60px;
            border-radius: 30px;
            overflow: hidden;
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .male-section {
            background: linear-gradient(90deg, #4facfe, #00f2fe);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
        }
        .female-section {
            background: linear-gradient(90deg, #f093fb, #f5576c);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
        }

        .medical-overview {
            grid-column: 1 / -1;
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        .insights-section {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-top: 30px;
        }
        .insight-item {
            margin-bottom: 15px;
            padding: 15px;
            background: rgba(255,255,255,0.1);
            border-radius: 8px;
        }
        .insight-icon {
            font-size: 1.5em;
            margin-right: 10px;
        }

        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            color: #666;
            font-size: 0.9em;
        }

        @media print {
            body { background: white; }
            .container { padding: 0; }
            .header { background: #28a745 !important; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>👥 Demographics Report</h1>
            <p>Participant Analysis & Insights</p>
            <p>Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</p>
        </div>

        <div class="summary-card">
            <div class="total-participants">${totalParticipants}</div>
            <div class="participants-label">Total Participants Analyzed</div>
        </div>

        <div class="demographics-grid">
            <div class="demo-section">
                <h3 class="section-title">🎂 Age Breakdown</h3>
                ${Object.entries(ageDistribution).map(([age, count]: [string, any]) => `
                    <div class="age-item">
                        <span class="age-label">${age} years old</span>
                        <span class="age-count">${count}</span>
                    </div>
                `).join('')}
            </div>

            <div class="demo-section">
                <h3 class="section-title">⚥ Gender Distribution</h3>
                <div class="gender-visual">
                    <div class="male-section" style="width: ${(genderDistribution.male / totalParticipants) * 100}%">
                        👨 ${genderDistribution.male} Male
                    </div>
                    <div class="female-section" style="width: ${(genderDistribution.female / totalParticipants) * 100}%">
                        👩 ${genderDistribution.female} Female
                    </div>
                </div>
                <div style="text-align: center; margin-top: 15px;">
                    <strong>Male:</strong> ${Math.round((genderDistribution.male / totalParticipants) * 100)}% |
                    <strong>Female:</strong> ${Math.round((genderDistribution.female / totalParticipants) * 100)}%
                </div>
            </div>

            <div class="medical-overview">
                <h3 class="section-title">🏥 Medical & Dietary Information</h3>
                <div class="medical-item">
                    <span class="medical-label">💊 Participants with Medications</span>
                    <span class="medical-count">${medicalInfo.withMedications}</span>
                </div>
                <div class="medical-item">
                    <span class="medical-label">🤧 Participants with Allergies</span>
                    <span class="medical-count">${medicalInfo.withAllergies}</span>
                </div>
                <div class="medical-item">
                    <span class="medical-label">♿ Participants with Special Needs</span>
                    <span class="medical-count">${medicalInfo.withSpecialNeeds}</span>
                </div>
                <div class="medical-item">
                    <span class="medical-label">🥗 Participants with Dietary Restrictions</span>
                    <span class="medical-count">${medicalInfo.withDietaryRestrictions}</span>
                </div>
            </div>
        </div>

        <div class="insights-section">
            <h3 style="margin-bottom: 20px; font-size: 1.5em;">💡 Key Insights</h3>
            <div class="insight-item">
                <span class="insight-icon">📊</span>
                <strong>Most Common Age:</strong> ${Object.entries(ageDistribution).reduce((a: any, b: any) => ageDistribution[a[0]] > ageDistribution[b[0]] ? a : b)[0]} years old
            </div>
            <div class="insight-item">
                <span class="insight-icon">⚖️</span>
                <strong>Gender Balance:</strong> ${Math.abs(genderDistribution.male - genderDistribution.female) <= 2 ? 'Well balanced' : genderDistribution.male > genderDistribution.female ? 'More males' : 'More females'}
            </div>
            <div class="insight-item">
                <span class="insight-icon">🏥</span>
                <strong>Medical Attention:</strong> ${Math.round(((medicalInfo.withMedications + medicalInfo.withAllergies + medicalInfo.withSpecialNeeds) / totalParticipants) * 100)}% of participants require special medical attention
            </div>
            <div class="insight-item">
                <span class="insight-icon">🍽️</span>
                <strong>Dietary Considerations:</strong> ${Math.round((medicalInfo.withDietaryRestrictions / totalParticipants) * 100)}% of participants have dietary restrictions
            </div>
        </div>

        <div class="footer">
            <p>📋 This demographics report was automatically generated by the Youth Registration System</p>
            <p>Use these insights to better plan activities and accommodate participant needs</p>
        </div>
    </div>
</body>
</html>`
}

function generateAnalyticsHTMLReport(data: any, startDate: Date, endDate: Date): string {
  const { analytics } = data

  // Calculate completion rate based on registrations vs expected target
  const expectedRegistrations = Object.keys(analytics.dailyRegistrations).length * 5 // Assume 5 per day target
  const completionRate = Math.min(Math.round((analytics.totalRegistrations / Math.max(expectedRegistrations, 1)) * 100), 100)

  return `
<!DOCTYPE html>
<html>
<head>
    <title>Analytics Report</title>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f8f9fa;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header {
            background: linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%);
            color: white;
            padding: 40px;
            border-radius: 12px;
            margin-bottom: 30px;
            text-align: center;
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { font-size: 1.1em; opacity: 0.9; }

        .metrics-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .metric-box {
            background: white;
            padding: 25px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            border-top: 4px solid #6f42c1;
        }
        .metric-number {
            font-size: 2.5em;
            font-weight: bold;
            color: #6f42c1;
            margin-bottom: 5px;
            animation: countUp 2s ease-out;
        }
        .metric-title {
            color: #666;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 0.9em;
            letter-spacing: 1px;
        }

        /* Animated completion rate */
        .completion-rate {
            position: relative;
            margin: 10px 0;
        }
        .completion-circle {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: conic-gradient(#6f42c1 0deg, #6f42c1 var(--completion-angle), #e9ecef var(--completion-angle), #e9ecef 360deg);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 10px;
            animation: rotateIn 2s ease-out;
        }
        .completion-circle::before {
            content: '';
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: white;
            position: absolute;
        }
        .completion-percentage {
            position: relative;
            z-index: 1;
            font-weight: bold;
            color: #6f42c1;
            font-size: 1.2em;
        }

        @keyframes countUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes rotateIn {
            from { transform: rotate(-90deg) scale(0.8); opacity: 0; }
            to { transform: rotate(0deg) scale(1); opacity: 1; }
        }

        .trends-section {
            background: white;
            padding: 40px;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .trends-title {
            font-size: 1.5em;
            margin-bottom: 30px;
            color: #333;
            text-align: center;
            border-bottom: 2px solid #6f42c1;
            padding-bottom: 10px;
        }

        .timeline {
            position: relative;
            margin: 30px 0;
        }
        .timeline-item {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #6f42c1;
        }
        .timeline-date {
            width: 120px;
            font-weight: bold;
            color: #6f42c1;
        }
        .timeline-bar {
            flex: 1;
            height: 20px;
            background: #e9ecef;
            border-radius: 10px;
            margin: 0 15px;
            overflow: hidden;
        }
        .timeline-fill {
            height: 100%;
            background: linear-gradient(90deg, #6f42c1, #e83e8c);
            border-radius: 10px;
        }
        .timeline-count {
            width: 80px;
            text-align: right;
            font-weight: bold;
            color: #333;
        }

        .summary-insights {
            background: linear-gradient(135deg, #17a2b8 0%, #6f42c1 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-top: 30px;
        }
        .insight-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .insight-card {
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 8px;
        }
        .insight-icon {
            font-size: 2em;
            margin-bottom: 10px;
        }
        .insight-title {
            font-weight: bold;
            margin-bottom: 5px;
        }

        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            color: #666;
            font-size: 0.9em;
        }

        @media print {
            body { background: white; }
            .container { padding: 0; }
            .header { background: #6f42c1 !important; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📈 Analytics Report</h1>
            <p>Registration Trends & Performance Analysis</p>
            <p>Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</p>
        </div>

        <div class="metrics-row">
            <div class="metric-box">
                <div class="metric-number">${analytics.totalRegistrations}</div>
                <div class="metric-title">Total Registrations</div>
            </div>
            <div class="metric-box">
                <div class="metric-number">${analytics.averageAge}</div>
                <div class="metric-title">Average Age</div>
            </div>
            <div class="metric-box">
                <div class="completion-rate">
                    <div class="completion-circle" style="--completion-angle: ${completionRate * 3.6}deg;">
                        <div class="completion-percentage">${completionRate}%</div>
                    </div>
                </div>
                <div class="metric-title">Completion Rate</div>
            </div>
            <div class="metric-box">
                <div class="metric-number">${Math.round(analytics.totalRegistrations / Object.keys(analytics.dailyRegistrations).length) || 0}</div>
                <div class="metric-title">Daily Average</div>
            </div>
        </div>

        <div class="trends-section">
            <h3 class="trends-title">📅 Daily Registration Trends</h3>
            <div class="timeline">
                ${Object.entries(analytics.dailyRegistrations).map(([date, count]: [string, any]) => `
                    <div class="timeline-item">
                        <div class="timeline-date">${new Date(date).toLocaleDateString()}</div>
                        <div class="timeline-bar">
                            <div class="timeline-fill" style="width: ${Math.max((count / Math.max(...(Object.values(analytics.dailyRegistrations) as number[]))) * 100, 5)}%"></div>
                        </div>
                        <div class="timeline-count">${count} registrations</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="summary-insights">
            <h3 style="margin-bottom: 20px; font-size: 1.5em;">🎯 Performance Insights</h3>
            <div class="insight-grid">
                <div class="insight-card">
                    <div class="insight-icon">🚀</div>
                    <div class="insight-title">Peak Registration Day</div>
                    <div>${Object.entries(analytics.dailyRegistrations).reduce((a: any, b: any) => a[1] > b[1] ? a : b)[0]} with ${Math.max(...(Object.values(analytics.dailyRegistrations) as number[]))} registrations</div>
                </div>
                <div class="insight-card">
                    <div class="insight-icon">📊</div>
                    <div class="insight-title">Registration Velocity</div>
                    <div>${analytics.totalRegistrations > 50 ? 'High' : analytics.totalRegistrations > 20 ? 'Moderate' : 'Low'} registration activity</div>
                </div>
                <div class="insight-card">
                    <div class="insight-icon">🎯</div>
                    <div class="insight-title">Consistency</div>
                    <div>${Object.values(analytics.dailyRegistrations).filter((count: any) => count > 0).length} days with registrations</div>
                </div>
                <div class="insight-card">
                    <div class="insight-icon">📈</div>
                    <div class="insight-title">Growth Trend</div>
                    <div>${analytics.totalRegistrations > 0 ? 'Positive' : 'No'} registration growth</div>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>📋 This analytics report was automatically generated by the Youth Registration System</p>
            <p>Use these insights to optimize your registration campaigns and understand participant behavior</p>
        </div>
    </div>
</body>
</html>`
}

// PDF generation function removed - using browser print-to-PDF instead
// The HTML reports can be printed to PDF using the browser's built-in functionality

function calculateAge(dateOfBirth: Date): number {
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  return age
}
