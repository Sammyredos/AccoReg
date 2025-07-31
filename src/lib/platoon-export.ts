/**
 * Platoon Export Utilities
 * CSV and PDF export functionality for platoon allocations
 */

import { generateEnhancedPDF } from './enhanced-pdf-utils'

export interface PlatoonData {
  id: string
  name: string
  label: string
  leaderName: string
  leaderPhone: string
  capacity: number
  participants: ParticipantData[]
  occupancy: number
  occupancyRate: number
}

export interface ParticipantData {
  id: string
  fullName: string
  gender: string
  dateOfBirth: string
  phoneNumber: string
  emailAddress: string
  branch: string
  age?: number
}

export interface PlatoonStats {
  totalPlatoons: number
  totalVerified: number
  totalAllocated: number
  totalUnallocated: number
  allocationRate: number
  activePlatoons: number
}

/**
 * Export platoon data to CSV
 */
export const exportPlatoonsToCSV = (
  platoons: PlatoonData[],
  stats: PlatoonStats,
  unallocatedParticipants: ParticipantData[]
): void => {
  const csvData: string[] = []
  
  // Add header with stats
  csvData.push('Platoon Allocation Report')
  csvData.push(`Generated on: ${new Date().toLocaleDateString()}`)
  csvData.push('')
  csvData.push('SUMMARY STATISTICS')
  csvData.push(`Total Platoons,${stats.totalPlatoons}`)
  csvData.push(`Total Verified Participants,${stats.totalVerified}`)
  csvData.push(`Total Allocated,${stats.totalAllocated}`)
  csvData.push(`Total Unallocated,${stats.totalUnallocated}`)
  csvData.push(`Allocation Rate,${stats.allocationRate.toFixed(1)}%`)
  csvData.push('')
  
  // Add platoon data
  csvData.push('PLATOON DETAILS')
  csvData.push('Platoon Name,Label,Leader Name,Leader Phone,Capacity,Occupied,Occupancy Rate')
  
  platoons.forEach(platoon => {
    csvData.push(
      `"${platoon.name}","${platoon.label}","${platoon.leaderName}","${platoon.leaderPhone}",${platoon.capacity},${platoon.occupancy},"${platoon.occupancyRate.toFixed(1)}%"`
    )
  })
  
  csvData.push('')
  
  // Add participant allocations
  csvData.push('PARTICIPANT ALLOCATIONS')
  csvData.push('Participant Name,Gender,Age,Phone,Email,Branch,Platoon,Platoon Label')
  
  platoons.forEach(platoon => {
    platoon.participants.forEach(participant => {
      const age = participant.age || calculateAge(participant.dateOfBirth)
      csvData.push(
        `"${participant.fullName}","${participant.gender}",${age},"${participant.phoneNumber}","${participant.emailAddress}","${participant.branch}","${platoon.name}","${platoon.label}"`
      )
    })
  })
  
  // Add unallocated participants
  if (unallocatedParticipants.length > 0) {
    csvData.push('')
    csvData.push('UNALLOCATED PARTICIPANTS')
    csvData.push('Participant Name,Gender,Age,Phone,Email,Branch')
    
    unallocatedParticipants.forEach(participant => {
      const age = participant.age || calculateAge(participant.dateOfBirth)
      csvData.push(
        `"${participant.fullName}","${participant.gender}",${age},"${participant.phoneNumber}","${participant.emailAddress}","${participant.branch}"`
      )
    })
  }
  
  // Create and download CSV
  const csvContent = csvData.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `platoon-allocations-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

/**
 * Export platoon data to PDF
 */
export const exportPlatoonsToPDF = async (
  platoons: PlatoonData[],
  stats: PlatoonStats,
  unallocatedParticipants: ParticipantData[]
): Promise<void> => {
  const htmlContent = generatePlatoonPDFContent(platoons, stats, unallocatedParticipants)
  
  await generateEnhancedPDF(htmlContent, {
    title: 'Platoon Allocation Report',
    filename: `platoon-allocations-${new Date().toISOString().split('T')[0]}.pdf`,
    orientation: 'portrait',
    subtitle: `Generated on ${new Date().toLocaleDateString()}`,
    showHeader: true,
    showFooter: true
  })
}

/**
 * Generate HTML content for PDF
 */
const generatePlatoonPDFContent = (
  platoons: PlatoonData[],
  stats: PlatoonStats,
  unallocatedParticipants: ParticipantData[]
): string => {
  return `
    <div class="pdf-content">
      <!-- Summary Statistics -->
      <div class="stats-section">
        <h2>Summary Statistics</h2>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Total Platoons:</span>
            <span class="stat-value">${stats.totalPlatoons}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Total Verified:</span>
            <span class="stat-value">${stats.totalVerified}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Total Allocated:</span>
            <span class="stat-value">${stats.totalAllocated}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Total Unallocated:</span>
            <span class="stat-value">${stats.totalUnallocated}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Allocation Rate:</span>
            <span class="stat-value">${stats.allocationRate.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <!-- Platoon Details -->
      <div class="platoons-section">
        <h2>Platoon Details</h2>
        ${platoons.map(platoon => `
          <div class="platoon-card">
            <div class="platoon-header">
              <h3>${platoon.name} (${platoon.label})</h3>
              <div class="platoon-meta">
                <span>Leader: ${platoon.leaderName}</span>
                <span>Phone: ${platoon.leaderPhone}</span>
                <span>Capacity: ${platoon.occupancy}/${platoon.capacity} (${platoon.occupancyRate.toFixed(1)}%)</span>
              </div>
            </div>
            
            ${platoon.participants.length > 0 ? `
              <div class="participants-table">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Gender</th>
                      <th>Age</th>
                      <th>Phone</th>
                      <th>Branch</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${platoon.participants.map(participant => {
                      const age = participant.age || calculateAge(participant.dateOfBirth)
                      return `
                        <tr>
                          <td>${participant.fullName}</td>
                          <td>${participant.gender}</td>
                          <td>${age}</td>
                          <td>${participant.phoneNumber}</td>
                          <td>${participant.branch}</td>
                        </tr>
                      `
                    }).join('')}
                  </tbody>
                </table>
              </div>
            ` : `
              <div class="empty-platoon">No participants allocated</div>
            `}
          </div>
        `).join('')}
      </div>

      <!-- Unallocated Participants -->
      ${unallocatedParticipants.length > 0 ? `
        <div class="unallocated-section">
          <h2>Unallocated Participants (${unallocatedParticipants.length})</h2>
          <div class="participants-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Gender</th>
                  <th>Age</th>
                  <th>Phone</th>
                  <th>Branch</th>
                </tr>
              </thead>
              <tbody>
                ${unallocatedParticipants.map(participant => {
                  const age = participant.age || calculateAge(participant.dateOfBirth)
                  return `
                    <tr>
                      <td>${participant.fullName}</td>
                      <td>${participant.gender}</td>
                      <td>${age}</td>
                      <td>${participant.phoneNumber}</td>
                      <td>${participant.branch}</td>
                    </tr>
                  `
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}
    </div>
  `
}

/**
 * Calculate age from date of birth
 */
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
