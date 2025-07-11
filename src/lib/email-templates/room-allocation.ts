/**
 * Room Allocation Email Templates
 * Generates professional email templates for room allocation notifications
 */

interface RoomAllocationData {
  registrant: {
    id: string
    fullName: string
    emailAddress: string
    phoneNumber: string
    gender: string
    dateOfBirth: string
  }
  room: {
    id: string
    name: string
    gender: string
    capacity: number
    currentOccupancy: number
  }
  roommates: Array<{
    fullName: string
    phoneNumber?: string
  }>
  allocationDate: string
  allocatedBy: string
  eventDetails?: {
    name: string
    startDate: string
    endDate: string
    venue: string
    checkInTime?: string
    checkOutTime?: string
  }
}

export function generateRoomAllocationEmail(data: RoomAllocationData): string {
  const { registrant, room, roommates, allocationDate, allocatedBy, eventDetails } = data
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const roommatesList = roommates.length > 0 
    ? roommates.map(roommate => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">
            <strong>${roommate.fullName}</strong>
            ${roommate.phoneNumber ? `<br><span style="color: #6b7280; font-size: 14px;">${roommate.phoneNumber}</span>` : ''}
          </td>
        </tr>
      `).join('')
    : '<tr><td style="padding: 12px; text-align: center; color: #6b7280;">You are the first person in this room</td></tr>'

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Room Allocation Confirmation</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🏠 Room Allocation Confirmed</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your accommodation details for the youth program</p>
        </div>

        <!-- Main Content -->
        <div style="padding: 30px 20px;">
          
          <!-- Greeting -->
          <div style="margin-bottom: 30px;">
            <h2 style="color: #1f2937; margin: 0 0 10px 0; font-size: 24px;">Hello ${registrant.fullName}! 👋</h2>
            <p style="color: #4b5563; margin: 0; font-size: 16px; line-height: 1.6;">
              Great news! We've successfully allocated you to a room for the upcoming youth program. 
              Here are your accommodation details:
            </p>
          </div>

          <!-- Room Details Card -->
          <div style="background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
            <h3 style="color: #1e40af; margin: 0 0 20px 0; font-size: 20px; display: flex; align-items: center;">
              🏠 Your Room Details
            </h3>
            
            <div style="display: grid; gap: 15px;">
              <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="font-weight: 600; color: #374151;">Room Name:</span>
                <span style="color: #1f2937; font-weight: bold; font-size: 18px;">${room.name}</span>
              </div>
              
              <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="font-weight: 600; color: #374151;">Room Type:</span>
                <span style="color: #1f2937;">${room.gender} Accommodation</span>
              </div>
              
              <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="font-weight: 600; color: #374151;">Capacity:</span>
                <span style="color: #1f2937;">${room.currentOccupancy} / ${room.capacity} people</span>
              </div>
              
              <div style="display: flex; justify-content: space-between; padding: 10px 0;">
                <span style="font-weight: 600; color: #374151;">Allocated On:</span>
                <span style="color: #1f2937;">${formatDateTime(allocationDate)}</span>
              </div>
            </div>
          </div>

          <!-- Roommates Section -->
          <div style="background-color: #fefefe; border: 2px solid #d1fae5; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
            <h3 style="color: #059669; margin: 0 0 20px 0; font-size: 20px;">
              👥 Your Roommates (${roommates.length} ${roommates.length === 1 ? 'person' : 'people'})
            </h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              ${roommatesList}
            </table>
            
            ${roommates.length > 0 ? `
              <div style="margin-top: 15px; padding: 15px; background-color: #ecfdf5; border-radius: 8px;">
                <p style="margin: 0; color: #065f46; font-size: 14px;">
                  💡 <strong>Tip:</strong> We encourage you to reach out to your roommates before the event to introduce yourself and coordinate any shared items!
                </p>
              </div>
            ` : ''}
          </div>

          ${eventDetails ? `
            <!-- Event Details -->
            <div style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
              <h3 style="color: #92400e; margin: 0 0 20px 0; font-size: 20px;">
                📅 Event Information
              </h3>
              
              <div style="display: grid; gap: 12px;">
                <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                  <span style="font-weight: 600; color: #78350f;">Event:</span>
                  <span style="color: #92400e; font-weight: bold;">${eventDetails.name}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                  <span style="font-weight: 600; color: #78350f;">Dates:</span>
                  <span style="color: #92400e;">${formatDate(eventDetails.startDate)} - ${formatDate(eventDetails.endDate)}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                  <span style="font-weight: 600; color: #78350f;">Venue:</span>
                  <span style="color: #92400e;">${eventDetails.venue}</span>
                </div>
                
                ${eventDetails.checkInTime ? `
                  <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                    <span style="font-weight: 600; color: #78350f;">Check-in:</span>
                    <span style="color: #92400e;">${eventDetails.checkInTime}</span>
                  </div>
                ` : ''}
                
                ${eventDetails.checkOutTime ? `
                  <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                    <span style="font-weight: 600; color: #78350f;">Check-out:</span>
                    <span style="color: #92400e;">${eventDetails.checkOutTime}</span>
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}

          <!-- Important Notes -->
          <div style="background-color: #fef2f2; border: 2px solid #f87171; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
            <h3 style="color: #dc2626; margin: 0 0 15px 0; font-size: 18px;">
              ⚠️ Important Notes
            </h3>
            
            <ul style="color: #7f1d1d; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li>Please bring your own bedding, toiletries, and personal items</li>
              <li>Respect your roommates and maintain cleanliness in shared spaces</li>
              <li>Follow all accommodation rules and guidelines</li>
              <li>Report any issues or concerns to the accommodation team immediately</li>
              <li>Keep your room allocation details safe - you may need them for check-in</li>
            </ul>
          </div>

          <!-- Contact Information -->
          <div style="background-color: #eff6ff; border: 2px solid #3b82f6; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
            <h3 style="color: #1d4ed8; margin: 0 0 15px 0; font-size: 18px;">
              📞 Need Help?
            </h3>
            
            <p style="color: #1e40af; margin: 0 0 10px 0; line-height: 1.6;">
              If you have any questions about your room allocation or need to make changes, please contact our accommodation team:
            </p>
            
            <div style="color: #1e40af; font-weight: 600;">
              📧 Email: accommodations@youth.com<br>
              📱 Phone: +1 (555) 123-4567<br>
              🕒 Available: Monday - Friday, 9:00 AM - 5:00 PM
            </div>
          </div>

          <!-- Footer Message -->
          <div style="text-align: center; padding: 20px 0; border-top: 2px solid #e5e7eb;">
            <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 16px;">
              We're excited to have you join us for this amazing youth program! 🎉
            </p>
            <p style="color: #9ca3af; margin: 0; font-size: 14px;">
              This email was sent automatically by the Youth Registration System.<br>
              Allocated by: ${allocatedBy}
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

export function generateRoomAllocationTextEmail(data: RoomAllocationData): string {
  const { registrant, room, roommates, allocationDate, eventDetails } = data
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const roommatesList = roommates.length > 0 
    ? roommates.map(roommate => `- ${roommate.fullName}${roommate.phoneNumber ? ` (${roommate.phoneNumber})` : ''}`).join('\n')
    : 'You are the first person in this room'

  return `
ROOM ALLOCATION CONFIRMED

Hello ${registrant.fullName}!

Great news! We've successfully allocated you to a room for the upcoming youth program.

YOUR ROOM DETAILS:
- Room Name: ${room.name}
- Room Type: ${room.gender} Accommodation
- Capacity: ${room.currentOccupancy} / ${room.capacity} people
- Allocated On: ${new Date(allocationDate).toLocaleDateString()}

YOUR ROOMMATES (${roommates.length} ${roommates.length === 1 ? 'person' : 'people'}):
${roommatesList}

${eventDetails ? `
EVENT INFORMATION:
- Event: ${eventDetails.name}
- Dates: ${formatDate(eventDetails.startDate)} - ${formatDate(eventDetails.endDate)}
- Venue: ${eventDetails.venue}
${eventDetails.checkInTime ? `- Check-in: ${eventDetails.checkInTime}` : ''}
${eventDetails.checkOutTime ? `- Check-out: ${eventDetails.checkOutTime}` : ''}
` : ''}

IMPORTANT NOTES:
- Please bring your own bedding, toiletries, and personal items
- Respect your roommates and maintain cleanliness in shared spaces
- Follow all accommodation rules and guidelines
- Report any issues or concerns to the accommodation team immediately
- Keep your room allocation details safe - you may need them for check-in

NEED HELP?
If you have any questions about your room allocation or need to make changes:
Email: accommodations@youth.com
Phone: +1 (555) 123-4567
Available: Monday - Friday, 9:00 AM - 5:00 PM

We're excited to have you join us for this amazing youth program!

---
This email was sent automatically by the Youth Registration System.
  `.trim()
}
