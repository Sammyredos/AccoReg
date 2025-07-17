'use client'

import { useRealTimeAttendance } from '@/hooks/useRealTimeAttendance'
import { Activity } from 'lucide-react'

/**
 * Test component to verify connection status stability
 * This component can be temporarily added to test the flickering fix
 */
export function ConnectionStatusTest() {
  const { 
    isConnected, 
    connectionError, 
    isConnecting, 
    eventCount,
    rawIsConnected,
    rawConnectionError,
    rawEventCount,
    stableState
  } = useRealTimeAttendance()

  return (
    <div className="fixed bottom-4 right-4 bg-white border rounded-lg shadow-lg p-4 max-w-sm">
      <h3 className="font-bold text-sm mb-2">Connection Status Test</h3>
      
      {/* Stable UI State */}
      <div className="mb-3 p-2 border rounded">
        <h4 className="text-xs font-semibold mb-1">Stable UI State:</h4>
        <div className={`flex items-center space-x-2 px-2 py-1 rounded text-xs ${
          isConnected 
            ? 'bg-green-50 text-green-700' 
            : connectionError 
            ? 'bg-red-50 text-red-700' 
            : 'bg-blue-50 text-blue-700'
        }`}>
          <Activity className="h-3 w-3" />
          <span>
            {isConnected 
              ? `Connected (${eventCount})` 
              : connectionError 
              ? 'Offline' 
              : 'Connecting...'}
          </span>
        </div>
      </div>

      {/* Raw States for Debugging */}
      <div className="text-xs space-y-1 text-gray-600">
        <div><strong>Stable State:</strong> {stableState}</div>
        <div><strong>Raw Connected:</strong> {rawIsConnected ? 'true' : 'false'}</div>
        <div><strong>Raw Error:</strong> {rawConnectionError || 'none'}</div>
        <div><strong>Display Count:</strong> {eventCount}</div>
        <div><strong>Raw Count:</strong> {rawEventCount}</div>
        <div><strong>Is Connecting:</strong> {isConnecting ? 'true' : 'false'}</div>
      </div>

      <div className="mt-2 text-xs text-gray-500">
        This test component shows both stable UI state and raw states for debugging.
        The stable state should not flicker rapidly.
      </div>
    </div>
  )
}

/**
 * Usage: Temporarily add this component to any page to test connection stability
 * 
 * Example:
 * import { ConnectionStatusTest } from '@/components/admin/ConnectionStatusTest'
 * 
 * // Add to your component JSX:
 * {process.env.NODE_ENV === 'development' && <ConnectionStatusTest />}
 */
