'use client'

import { useState } from 'react'
import { UserCard } from '@/components/ui/user-card'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

/**
 * Test component to verify QR button visibility logic
 * This component can be temporarily added to test the QR button hiding functionality
 */

interface TestRegistration {
  id: string
  fullName: string
  email: string
  gender: string
  isVerified: boolean
  hasQRCode: boolean
  qrCode: string | null
}

export function QRButtonVisibilityTest() {
  const [testUsers, setTestUsers] = useState<TestRegistration[]>([
    {
      id: '1',
      fullName: 'John Doe',
      email: 'john@example.com',
      gender: 'Male',
      isVerified: false,
      hasQRCode: true,
      qrCode: 'QR123456'
    },
    {
      id: '2',
      fullName: 'Jane Smith',
      email: 'jane@example.com',
      gender: 'Female',
      isVerified: true,
      hasQRCode: true,
      qrCode: 'QR789012'
    },
    {
      id: '3',
      fullName: 'Bob Wilson',
      email: 'bob@example.com',
      gender: 'Male',
      isVerified: false,
      hasQRCode: false,
      qrCode: null
    }
  ])

  const toggleVerification = (id: string) => {
    setTestUsers(prev => prev.map(user => 
      user.id === id 
        ? { ...user, isVerified: !user.isVerified }
        : user
    ))
  }

  const generateQR = (id: string) => {
    setTestUsers(prev => prev.map(user => 
      user.id === id 
        ? { ...user, hasQRCode: true, qrCode: `QR${Date.now()}` }
        : user
    ))
  }

  return (
    <Card className="p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4">QR Button Visibility Test</h2>
      <p className="text-gray-600 mb-6">
        Test the QR button visibility logic. QR buttons should be hidden after verification.
      </p>

      <div className="space-y-4">
        {testUsers.map(user => (
          <div key={user.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">{user.fullName}</h3>
                <p className="text-sm text-gray-600">{user.email}</p>
                <div className="flex gap-2 mt-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    user.isVerified 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {user.isVerified ? 'Verified' : 'Unverified'}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    user.hasQRCode 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.hasQRCode ? 'Has QR' : 'No QR'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleVerification(user.id)}
                >
                  {user.isVerified ? 'Unverify' : 'Verify'}
                </Button>
                {!user.hasQRCode && (
                  <Button
                    size="sm"
                    onClick={() => generateQR(user.id)}
                  >
                    Generate QR
                  </Button>
                )}
              </div>
            </div>

            {/* Test the actual UserCard component with QR button logic */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-2">UserCard Component Test:</h4>
              <UserCard
                registration={{
                  id: user.id,
                  fullName: user.fullName,
                  email: user.email,
                  gender: user.gender as 'Male' | 'Female',
                  isVerified: user.isVerified,
                  hasQRCode: user.hasQRCode,
                  qrCode: user.qrCode,
                  dateOfBirth: '1990-01-01',
                  createdAt: new Date().toISOString(),
                  parentalPermissionGranted: true
                }}
                showQRButton={user.hasQRCode && !user.isVerified}
                showQRViewButton={!!user.qrCode && !user.isVerified}
                onVerify={() => console.log('Verify clicked')}
                onUnverify={() => console.log('Unverify clicked')}
                onGenerateQR={() => console.log('Generate QR clicked')}
                onViewQR={() => console.log('View QR clicked')}
                onEdit={() => console.log('Edit clicked')}
                onDelete={() => console.log('Delete clicked')}
              />
            </div>

            {/* Expected behavior explanation */}
            <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
              <h5 className="font-semibold mb-1">Expected Behavior:</h5>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• <strong>Generate QR Button:</strong> {user.hasQRCode && !user.isVerified ? '✅ Visible' : '❌ Hidden'} 
                  {user.hasQRCode && !user.isVerified ? ' (has QR + unverified)' : 
                   user.isVerified ? ' (verified)' : ' (no QR code)'}
                </li>
                <li>• <strong>View QR Button:</strong> {user.qrCode && !user.isVerified ? '✅ Visible' : '❌ Hidden'}
                  {user.qrCode && !user.isVerified ? ' (has QR + unverified)' : 
                   user.isVerified ? ' (verified)' : ' (no QR code)'}
                </li>
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Test Instructions:</h3>
        <ol className="text-sm text-blue-800 space-y-1">
          <li>1. Check that unverified users with QR codes show both "Generate QR" and "View QR" buttons</li>
          <li>2. Click "Verify" on a user and confirm both QR buttons disappear</li>
          <li>3. Click "Unverify" and confirm QR buttons reappear</li>
          <li>4. Users without QR codes should not show QR buttons regardless of verification status</li>
        </ol>
      </div>
    </Card>
  )
}

/**
 * Usage: Temporarily add this component to any page to test QR button visibility
 * 
 * Example:
 * import { QRButtonVisibilityTest } from '@/components/test/QRButtonVisibilityTest'
 * 
 * // Add to your component JSX:
 * {process.env.NODE_ENV === 'development' && <QRButtonVisibilityTest />}
 */
