'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, MessageSquare } from 'lucide-react'
import { UserDirectory } from './UserDirectory'
import { SimpleMessaging } from './SimpleMessaging'
import { EmailConfigDisplay } from './EmailConfigDisplay'

interface User {
  id: string
  name: string
  email: string
  role: {
    name: string
  }
  type: 'admin' | 'user'
}

interface UniversalUserAccessProps {
  className?: string
  variant?: 'button' | 'compact' | 'full'
}

export function UniversalUserAccess({ className = '', variant = 'button' }: UniversalUserAccessProps) {
  const [showUserDirectory, setShowUserDirectory] = useState(false)
  const [showMessaging, setShowMessaging] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  const handleSendMessage = (user: User) => {
    setSelectedUser(user)
    setShowUserDirectory(false)
    setShowMessaging(true)
  }

  const handleCloseMessaging = () => {
    setShowMessaging(false)
    setSelectedUser(null)
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowUserDirectory(true)}
          className="font-apercu-medium text-xs"
        >
          <Users className="h-3 w-3 mr-1" />
          Users
        </Button>
        
        <UserDirectory
          isOpen={showUserDirectory}
          onClose={() => setShowUserDirectory(false)}
          onSendMessage={handleSendMessage}
        />
        
        <SimpleMessaging
          isOpen={showMessaging}
          onClose={handleCloseMessaging}
          recipient={selectedUser}
          hideSubject={true}
        />
      </div>
    )
  }

  if (variant === 'full') {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Email Configuration */}
        <EmailConfigDisplay />
        
        {/* User Directory Access */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-indigo-600" />
              <h3 className="font-apercu-bold text-sm text-gray-900">User Directory & Messaging</h3>
              <Badge variant="secondary" className="font-apercu-medium text-xs">
                Universal Access
              </Badge>
            </div>
          </div>
          
          <p className="font-apercu-regular text-sm text-gray-600 mb-4">
            View all system users and send direct messages to any user regardless of your access level.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => setShowUserDirectory(true)}
              className="font-apercu-medium bg-indigo-600 hover:bg-indigo-700"
            >
              <Users className="h-4 w-4 mr-2" />
              View User Directory
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowUserDirectory(true)}
              className="font-apercu-medium"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </div>
        </div>
        
        <UserDirectory
          isOpen={showUserDirectory}
          onClose={() => setShowUserDirectory(false)}
          onSendMessage={handleSendMessage}
        />
        
        <SimpleMessaging
          isOpen={showMessaging}
          onClose={handleCloseMessaging}
          recipient={selectedUser}
          hideSubject={true}
        />
      </div>
    )
  }

  // Default button variant
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Button
        variant="outline"
        onClick={() => setShowUserDirectory(true)}
        className="font-apercu-medium"
      >
        <Users className="h-4 w-4 mr-2" />
        User Directory
      </Button>
      
      <UserDirectory
        isOpen={showUserDirectory}
        onClose={() => setShowUserDirectory(false)}
        onSendMessage={handleSendMessage}
      />
      
      <SimpleMessaging
        isOpen={showMessaging}
        onClose={handleCloseMessaging}
        recipient={selectedUser}
        hideSubject={true}
      />
    </div>
  )
}
