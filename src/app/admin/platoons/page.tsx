'use client'

import React, { useState, useEffect } from 'react'
import { AdminLayoutNew } from '@/components/admin/AdminLayoutNew'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { PlatoonCard } from '@/components/admin/PlatoonCard'
import { CreatePlatoonModal } from '@/components/admin/CreatePlatoonModal'
import { StatsCard, StatsGrid } from '@/components/admin/StatsCard'
import {
  Plus,
  Users,
  Search,
  Shuffle,
  AlertCircle,
  CheckCircle,
  Loader2,
  UserCheck,
  UserX,
  BarChart3
} from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'

interface Participant {
  id: string
  fullName: string
  gender: string
  age: string
  emailAddress: string
  phoneNumber: string
  verifiedAt: string
}

interface Platoon {
  id: string
  name: string
  leaderName: string
  leaderPhone: string
  label?: string | null
  isActive: boolean
  createdAt: string
  _count: {
    allocations: number
  }
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  pages: number
}

export default function PlatoonsPage() {
  const { toast } = useToast()

  // State management
  const [platoons, setPlatoons] = useState<Platoon[]>([])
  const [unallocatedParticipants, setUnallocatedParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [autoAllocating, setAutoAllocating] = useState(false)
  
  // Pagination
  const [platoonsPagination, setPlatoonsPagination] = useState<PaginationInfo>({
    page: 1, limit: 12, total: 0, pages: 0
  })
  const [participantsPagination, setParticipantsPagination] = useState<PaginationInfo>({
    page: 1, limit: 20, total: 0, pages: 0
  })
  
  // Search
  const [platoonSearch, setPlatoonSearch] = useState('')
  const [participantSearch, setParticipantSearch] = useState('')
  
  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Stats
  const [stats, setStats] = useState({
    totalPlatoons: 0,
    totalUnallocated: 0,
    totalAllocated: 0,
    averageSize: 0,
    genderDistribution: {} as Record<string, number>
  })

  // Load data
  useEffect(() => {
    loadPlatoons()
    loadUnallocatedParticipants()
  }, [platoonsPagination.page, participantsPagination.page, platoonSearch, participantSearch])

  const loadPlatoons = async () => {
    try {
      const params = new URLSearchParams({
        page: platoonsPagination.page.toString(),
        limit: platoonsPagination.limit.toString(),
        search: platoonSearch
      })

      const response = await fetch(`/api/admin/platoons?${params}`)
      const data = await response.json()

      if (response.ok) {
        setPlatoons(data.platoons)
        setPlatoonsPagination(data.pagination)

        // Calculate stats
        const totalAllocated = data.platoons.reduce((sum: number, platoon: any) => sum + platoon.participants.length, 0)
        const averageSize = data.platoons.length > 0 ? Math.round(totalAllocated / data.platoons.length) : 0

        setStats(prev => ({
          ...prev,
          totalPlatoons: data.pagination.total,
          totalAllocated,
          averageSize
        }))
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to load platoons', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load platoons', variant: 'destructive' })
    }
  }

  const loadUnallocatedParticipants = async () => {
    try {
      const params = new URLSearchParams({
        page: participantsPagination.page.toString(),
        limit: participantsPagination.limit.toString(),
        search: participantSearch
      })

      const response = await fetch(`/api/admin/platoons/unallocated?${params}`)
      const data = await response.json()

      if (response.ok) {
        setUnallocatedParticipants(data.participants)
        setParticipantsPagination(data.pagination)
        setStats(prev => ({
          ...prev,
          totalUnallocated: data.stats.total,
          genderDistribution: data.stats.genderDistribution
        }))
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to load unallocated participants', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load unallocated participants', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }



  const handleAutoAllocate = async () => {
    if (platoons.length === 0) {
      toast({ title: 'Error', description: 'Please create at least one platoon before auto-allocating', variant: 'destructive' })
      return
    }

    if (stats.totalUnallocated === 0) {
      toast({ title: 'Error', description: 'No unallocated participants found', variant: 'destructive' })
      return
    }

    setAutoAllocating(true)

    try {
      const activePlatoonIds = platoons.filter(p => p.isActive).map(p => p.id)
      
      const response = await fetch('/api/admin/platoons/auto-allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platoonIds: activePlatoonIds })
      })

      const data = await response.json()

      if (response.ok) {
        toast({ title: 'Success', description: data.message })
        loadPlatoons()
        loadUnallocatedParticipants()
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to auto-allocate participants', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to auto-allocate participants', variant: 'destructive' })
    } finally {
      setAutoAllocating(false)
    }
  }

  if (loading) {
    return (
      <AdminLayoutNew>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AdminLayoutNew>
    )
  }

  return (
    <AdminLayoutNew
      title="Platoons Management"
      description="Organize participants into balanced platoons for activities and events"
    >

      {/* Stats Cards */}
      <StatsGrid>
        <StatsCard
          title="Total Platoons"
          value={stats.totalPlatoons}
          icon={Users}
          color="blue"
        />
        <StatsCard
          title="Allocated Participants"
          value={stats.totalAllocated}
          icon={UserCheck}
          color="green"
        />
        <StatsCard
          title="Unallocated"
          value={stats.totalUnallocated}
          icon={UserX}
          color="orange"
        />
        <StatsCard
          title="Avg. Platoon Size"
          value={stats.averageSize}
          icon={BarChart3}
          color="purple"
        />
      </StatsGrid>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 font-apercu-medium h-12 sm:h-10"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Platoon
        </Button>
        <Button
          onClick={handleAutoAllocate}
          variant="outline"
          className="font-apercu-medium h-12 sm:h-10"
          disabled={autoAllocating || platoons.length === 0 || stats.totalUnallocated === 0}
        >
          {autoAllocating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Shuffle className="h-4 w-4 mr-2" />
          )}
          Auto Allocate
        </Button>
      </div>

      <div className="space-y-6">



        {/* Unallocated Participants Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Unallocated Participants ({stats.totalUnallocated})
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search participants..."
                    value={participantSearch}
                    onChange={(e) => setParticipantSearch(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {unallocatedParticipants.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-apercu-medium text-gray-900 mb-2">
                  All Participants Allocated
                </h3>
                <p className="text-gray-600">
                  All verified participants have been allocated to platoons.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {unallocatedParticipants.map((participant) => (
                    <Card key={participant.id} className="border-l-4 border-l-orange-500">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <h4 className="font-apercu-medium text-gray-900">
                            {participant.fullName}
                          </h4>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-xs">
                              {participant.gender}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Age: {participant.age}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <p>{participant.emailAddress}</p>
                            <p>{participant.phoneNumber}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Participants Pagination */}
                {participantsPagination.pages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Showing {((participantsPagination.page - 1) * participantsPagination.limit) + 1} to{' '}
                      {Math.min(participantsPagination.page * participantsPagination.limit, participantsPagination.total)} of{' '}
                      {participantsPagination.total} participants
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setParticipantsPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={participantsPagination.page === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setParticipantsPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={participantsPagination.page === participantsPagination.pages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Platoons Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Platoons ({stats.totalPlatoons})
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search platoons..."
                    value={platoonSearch}
                    onChange={(e) => setPlatoonSearch(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {platoons.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-apercu-medium text-gray-900 mb-2">
                  No Platoons Created
                </h3>
                <p className="text-gray-600 mb-4">
                  Create your first platoon to start organizing participants.
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Platoon
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  {platoons.map((platoon) => (
                    <PlatoonCard
                      key={platoon.id}
                      platoon={platoon}
                      onView={(platoon) => {
                        // TODO: Implement view modal
                        toast({ title: 'Info', description: 'View platoon details - Coming soon' })
                      }}
                      onEdit={(platoon) => {
                        // TODO: Implement edit modal
                        toast({ title: 'Info', description: 'Edit platoon - Coming soon' })
                      }}
                      onDelete={(platoon) => {
                        // TODO: Implement delete confirmation
                        toast({ title: 'Info', description: 'Delete platoon - Coming soon' })
                      }}
                    />
                  ))}
                </div>

                {/* Platoons Pagination */}
                {platoonsPagination.pages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Showing {((platoonsPagination.page - 1) * platoonsPagination.limit) + 1} to{' '}
                      {Math.min(platoonsPagination.page * platoonsPagination.limit, platoonsPagination.total)} of{' '}
                      {platoonsPagination.total} platoons
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPlatoonsPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={platoonsPagination.page === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPlatoonsPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={platoonsPagination.page === platoonsPagination.pages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Platoon Modal */}
      <CreatePlatoonModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          loadPlatoons()
          loadUnallocatedParticipants()
        }}
      />
    </AdminLayoutNew>
  )
}
