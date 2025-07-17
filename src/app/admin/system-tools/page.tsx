'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Database, AlertTriangle, CheckCircle, Settings } from 'lucide-react'

export default function SystemToolsPage() {
  const [isFixing, setIsFixing] = useState(false)
  const [fixResult, setFixResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const runDatabaseFix = async () => {
    setIsFixing(true)
    setError(null)
    setFixResult(null)

    try {
      const response = await fetch('/api/admin/system/force-db-fix', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Database fix failed')
      }

      setFixResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsFixing(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          System Tools
        </h1>
        <p className="text-muted-foreground mt-2">
          Administrative tools for system maintenance and troubleshooting
        </p>
      </div>

      {/* Database Fix Tool */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Emergency Database Fix
          </CardTitle>
          <CardDescription>
            Force creation of missing database tables and columns. Use this if you're experiencing 
            database-related errors like "table does not exist" or "column does not exist".
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Super Admin Only:</strong> This tool requires Super Admin permissions. 
                It will safely add missing tables and columns without affecting existing data.
              </AlertDescription>
            </Alert>

            <div className="flex gap-4">
              <Button 
                onClick={runDatabaseFix}
                disabled={isFixing}
                className="flex items-center gap-2"
              >
                {isFixing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Fixing Database...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" />
                    Run Database Fix
                  </>
                )}
              </Button>
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Error:</strong> {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Success Display */}
            {fixResult && (
              <Alert variant={fixResult.success ? "default" : "destructive"}>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p><strong>Result:</strong> {fixResult.message}</p>
                    <p><strong>Timestamp:</strong> {new Date(fixResult.timestamp).toLocaleString()}</p>
                    {fixResult.fixedBy && (
                      <p><strong>Fixed by:</strong> {fixResult.fixedBy}</p>
                    )}
                    
                    {fixResult.tests && (
                      <div className="mt-4">
                        <p className="font-semibold mb-2">Test Results:</p>
                        <div className="space-y-1">
                          {fixResult.tests.map((test: any, index: number) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              {test.status === 'success' ? (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              ) : (
                                <AlertTriangle className="h-3 w-3 text-red-500" />
                              )}
                              <span>{test.test}</span>
                              {test.result !== undefined && (
                                <span className="text-muted-foreground">({test.result})</span>
                              )}
                              {test.error && (
                                <span className="text-red-500 text-xs">- {test.error}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>When to Use This Tool</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <strong>Use this tool if you see errors like:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                <li>"The table `children_registrations` does not exist"</li>
                <li>"The column `age` does not exist"</li>
                <li>"The column `branch` does not exist"</li>
                <li>Registration or children registration forms not working</li>
              </ul>
            </div>
            
            <div>
              <strong>What this tool does:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                <li>Creates missing `children_registrations` table</li>
                <li>Adds missing `age` column to registrations</li>
                <li>Adds missing `branch` column to registrations</li>
                <li>Preserves all existing data</li>
                <li>Runs comprehensive tests to verify everything works</li>
              </ul>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Safe Operation:</strong> This tool only adds missing structures and never 
                deletes or modifies existing data. Your registered users and all data remain intact.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
