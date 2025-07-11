import { NextResponse } from 'next/server'
import { getSetting } from '@/lib/settings'

export async function GET() {
  try {
    const [formClosureDate, minimumAge] = await Promise.all([
      getSetting('registration', 'formClosureDate', ''),
      getSetting('registration', 'minimumAge', 13)
    ])

    // Check if form is closed
    let isFormClosed = false
    if (formClosureDate && formClosureDate.trim()) {
      const closureDate = new Date(formClosureDate)
      const now = new Date()
      isFormClosed = now > closureDate
    }

    return NextResponse.json({
      formClosureDate,
      minimumAge,
      isFormClosed
    })
  } catch (error) {
    console.error('Error getting registration settings:', error)
    return NextResponse.json(
      { error: 'Failed to get registration settings' },
      { status: 500 }
    )
  }
}
