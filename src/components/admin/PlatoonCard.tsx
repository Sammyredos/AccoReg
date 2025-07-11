'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  User, 
  Phone, 
  Tag, 
  Calendar,
  Edit,
  Trash2,
  Eye
} from 'lucide-react'

interface PlatoonCardProps {
  platoon: {
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
    allocations?: Array<{
      registration: {
        id: string
        fullName: string
        gender: string
        dateOfBirth: string
        emailAddress: string
        phoneNumber: string
      }
    }>
  }
  onView?: (platoon: any) => void
  onEdit?: (platoon: any) => void
  onDelete?: (platoon: any) => void
  showActions?: boolean
}

export const PlatoonCard: React.FC<PlatoonCardProps> = ({
  platoon,
  onView,
  onEdit,
  onDelete,
  showActions = true
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getGenderDistribution = () => {
    if (!platoon.allocations) return null
    
    const distribution = platoon.allocations.reduce((acc, allocation) => {
      const gender = allocation.registration.gender
      acc[gender] = (acc[gender] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return distribution
  }

  const genderDistribution = getGenderDistribution()

  return (
    <Card className="h-full hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-apercu-bold text-gray-900 mb-1">
              {platoon.name}
            </CardTitle>
            {platoon.label && (
              <div className="flex items-center gap-1 mb-2">
                <Tag className="h-3 w-3 text-gray-500" />
                <span className="text-xs text-gray-600 font-apercu-medium">
                  {platoon.label}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Badge 
              variant={platoon.isActive ? "default" : "secondary"}
              className="text-xs"
            >
              {platoon.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Platoon Leader Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-apercu-medium text-gray-900">
              {platoon.leaderName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600 font-apercu-regular">
              {platoon.leaderPhone}
            </span>
          </div>
        </div>

        {/* Participant Count */}
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
          <Users className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-apercu-medium text-gray-900">
            {platoon._count.allocations} Participants
          </span>
        </div>

        {/* Gender Distribution (if allocations are loaded) */}
        {genderDistribution && (
          <div className="space-y-2">
            <h4 className="text-xs font-apercu-medium text-gray-700 uppercase tracking-wide">
              Gender Distribution
            </h4>
            <div className="flex gap-2">
              {Object.entries(genderDistribution).map(([gender, count]) => (
                <Badge key={gender} variant="outline" className="text-xs">
                  {gender}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Created Date */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Calendar className="h-3 w-3" />
          <span>Created {formatDate(platoon.createdAt)}</span>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 pt-2 border-t">
            {onView && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onView(platoon)}
                className="flex-1 text-xs"
              >
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
            )}
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(platoon)}
                className="flex-1 text-xs"
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(platoon)}
                className="flex-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
