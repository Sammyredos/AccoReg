'use client'

import React, { useState } from 'react'
import { AdminLayoutNew } from '@/components/admin/AdminLayoutNew'
import { Button } from '@/components/ui/button'
import { useToast } from '@/contexts/ToastContext'
import { Plus } from 'lucide-react'

export default function PlatoonsPage() {
  const { toast } = useToast()
  const [showCreateModal, setShowCreateModal] = useState(false)

  const handleAutoAllocate = () => {
    toast({ title: 'Info', description: 'Auto-allocate feature coming soon' })
  }

  return (
    <AdminLayoutNew
      title="Platoons Management"
      description="Organize participants into balanced platoons for activities and events"
    >
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Platoons Management</h2>
        <p className="text-gray-600 mb-6">
          Organize participants into balanced platoons for activities and events.
        </p>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Platoon
        </Button>
      </div>
    </AdminLayoutNew>
  )
}
