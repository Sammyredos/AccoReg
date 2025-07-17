'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AdminLayoutNew } from '@/components/admin/AdminLayoutNew'
import { useToast } from '@/contexts/ToastContext'
import { Loader2, Users, Home, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

interface DebugData {
  stats: {
    totalUnallocated: number
    verifiedUnallocated: number
    unverifiedUnallocated: number
    totalRooms: number
    totalCapacity: number
    totalOccupied: number
    totalAvailable: number
    ageRangeYears: number
    maxAgeGap: number
  }
  groupAnalysis: Array<{
    group: string
    registrations: Array<{
      id: string
      name: string
      age: number
      isVerified: boolean
    }>
    count: number
    averageAge: number
    totalGenderRooms: number
    availableGenderRooms: number
    suitableRooms: number
    totalAvailableSpaces: number
    canAllocateAll: boolean
    roomAnalysis: Array<{
      roomId: string
      roomName: string
      capacity: number
      currentOccupancy: number
      availableSpaces: number
      suitable: boolean
      reason: string
      existingAges?: number[]
      roomAgeRange?: string
      newAgeRange?: string
      totalAgeRange?: number
      maxAllowedGap?: number
    }>
  }>
  rooms: Array<{
    id: string
    name: string
    gender: string
    capacity: number
    currentOccupancy: number
    availableSpaces: number
    occupants: Array<{
      name: string
      age: number
    }>
  }>
}

export default function AllocationDebugPage() {
  const [debugData, setDebugData] = useState<DebugData | null>(null)
  const [loading, setLoading] = useState(false)
  const [ageRangeYears, setAgeRangeYears] = useState(5)
  const { success, error } = useToast()

  const fetchDebugData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/accommodations/debug-allocation?ageRangeYears=${ageRangeYears}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch debug data')
      }

      const data = await response.json()
      setDebugData(data)
    } catch (err) {
      console.error('Error fetching debug data:', err)
      error('Failed to fetch debug data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDebugData()
  }, [])

  const handleRefresh = () => {
    fetchDebugData()
  }

  if (loading && !debugData) {
    return (
      <AdminLayoutNew
        title="Allocation Debug"
        description="Analyze why auto allocation might not be working"
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
            <p className="text-gray-600">Loading debug data...</p>
          </div>
        </div>
      </AdminLayoutNew>
    )
  }

  return (
    <AdminLayoutNew
      title="Allocation Debug"
      description="Analyze why auto allocation might not be working"
    >
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="ageRange">Age Range (years):</Label>
              <Input
                id="ageRange"
                type="number"
                min="1"
                max="20"
                value={ageRangeYears}
                onChange={(e) => setAgeRangeYears(parseInt(e.target.value) || 5)}
                className="w-20"
              />
            </div>
            <Button onClick={handleRefresh} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Refresh
            </Button>
          </div>
        </div>

        {debugData && (
          <>
            {/* Overall Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Overall Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{debugData.stats.verifiedUnallocated}</div>
                    <div className="text-sm text-gray-600">Verified Unallocated</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{debugData.stats.unverifiedUnallocated}</div>
                    <div className="text-sm text-gray-600">Unverified Unallocated</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{debugData.stats.totalAvailable}</div>
                    <div className="text-sm text-gray-600">Available Spaces</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{debugData.stats.maxAgeGap}</div>
                    <div className="text-sm text-gray-600">Max Age Gap</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Group Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Age Group Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {debugData.groupAnalysis.map((group, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">{group.group}</h3>
                        <div className="flex items-center gap-2">
                          {group.canAllocateAll ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Can Allocate All
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Cannot Allocate All
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-xl font-bold">{group.count}</div>
                          <div className="text-sm text-gray-600">People</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold">{group.averageAge}</div>
                          <div className="text-sm text-gray-600">Avg Age</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold">{group.suitableRooms}</div>
                          <div className="text-sm text-gray-600">Suitable Rooms</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold">{group.totalAvailableSpaces}</div>
                          <div className="text-sm text-gray-600">Available Spaces</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold">{group.availableGenderRooms}</div>
                          <div className="text-sm text-gray-600">Gender Rooms</div>
                        </div>
                      </div>

                      {/* People in this group */}
                      <div className="mb-4">
                        <h4 className="font-medium mb-2">People in this group:</h4>
                        <div className="flex flex-wrap gap-2">
                          {group.registrations.map((person) => (
                            <Badge key={person.id} variant="outline">
                              {person.name} ({person.age}y)
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Room Analysis */}
                      {group.roomAnalysis.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Room Analysis:</h4>
                          <div className="space-y-2">
                            {group.roomAnalysis.map((room) => (
                              <div key={room.roomId} className={`p-3 rounded border ${room.suitable ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="font-medium">{room.roomName}</span>
                                    <span className="text-sm text-gray-600 ml-2">
                                      ({room.currentOccupancy}/{room.capacity} occupied, {room.availableSpaces} available)
                                    </span>
                                    {room.existingAges && room.existingAges.length > 0 && (
                                      <span className="text-sm text-gray-600 ml-2">
                                        Current ages: {room.existingAges.join(', ')}
                                      </span>
                                    )}
                                  </div>
                                  <Badge variant={room.suitable ? "default" : "destructive"}>
                                    {room.suitable ? 'Suitable' : 'Not Suitable'}
                                  </Badge>
                                </div>
                                <div className="text-sm text-gray-600 mt-1">{room.reason}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayoutNew>
  )
}
