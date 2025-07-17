'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Download, 
  Upload, 
  Database, 
  RefreshCw, 
  Trash2, 
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  HardDrive,
  Shield,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'

interface BackupFile {
  filename: string
  size: number
  sizeFormatted: string
  created: string
}

interface ImportConfig {
  maxFileSize: number
  maxFileSizeFormatted: string
  allowedExtensions: string[]
  supportedActions: string[]
}

interface MergeConfig {
  conflictResolutionOptions: Array<{
    value: string
    label: string
    description: string
  }>
  supportedTables: string[]
  features: {
    dryRun: boolean
    preserveNewer: boolean
    selectiveTables: boolean
    conflictPreview: boolean
    manualResolution: boolean
  }
}

interface ConflictRecord {
  table: string
  id: string
  current: any
  backup: any
  conflictFields: string[]
  action: 'update' | 'skip' | 'merge'
}

interface MergeAnalysis {
  summary: {
    totalRecords: number
    tableBreakdown: Record<string, number>
    estimatedChanges: {
      newRecords: number
      updatedRecords: number
      conflicts: number
    }
  }
  conflicts: ConflictRecord[]
  filename: string
  fileSize: number
  fileSizeFormatted: string
}

export default function BackupManagementPage() {
  const [backups, setBackups] = useState<BackupFile[]>([])
  const [importConfig, setImportConfig] = useState<ImportConfig | null>(null)
  const [mergeConfig, setMergeConfig] = useState<MergeConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [merging, setMerging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [restoreImmediately, setRestoreImmediately] = useState(false)
  const [mergeMode, setMergeMode] = useState(false)
  const [mergeAnalysis, setMergeAnalysis] = useState<MergeAnalysis | null>(null)
  const [conflictResolution, setConflictResolution] = useState('backup_wins')
  const [preserveNewer, setPreserveNewer] = useState(true)
  const [selectedTables, setSelectedTables] = useState<string[]>([])
  const [showConflicts, setShowConflicts] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    description: string
    action: () => void
    variant?: 'danger' | 'warning' | 'info'
  }>({
    isOpen: false,
    title: '',
    description: '',
    action: () => {}
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadBackups()
    loadImportConfig()
    loadMergeConfig()
  }, [])

  const loadBackups = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/backup', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setBackups(data.backups || [])
      } else {
        const error = await response.json()
        toast.error('Failed to load backups', {
          description: error.error || 'Unknown error occurred'
        })
      }
    } catch (error) {
      toast.error('Failed to load backups', {
        description: 'Network error occurred'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadImportConfig = async () => {
    try {
      const response = await fetch('/api/admin/backup/import', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setImportConfig(data.config)
      }
    } catch (error) {
      console.error('Failed to load import config:', error)
    }
  }

  const loadMergeConfig = async () => {
    try {
      const response = await fetch('/api/admin/backup/merge', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setMergeConfig(data.config)
        setSelectedTables(data.config.supportedTables || [])
      }
    } catch (error) {
      console.error('Failed to load merge config:', error)
    }
  }

  const createAndDownloadBackup = async () => {
    try {
      setCreating(true)
      toast.info('Creating backup...', {
        description: 'This may take a few moments'
      })

      const response = await fetch('/api/admin/backup/download?action=create-and-download', {
        credentials: 'include'
      })

      if (response.ok) {
        // Get backup info from headers
        const backupInfo = response.headers.get('X-Backup-Info')
        const info = backupInfo ? JSON.parse(backupInfo) : {}

        // Create blob and download
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = info.filename || 'backup.sql'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        toast.success('Backup created and downloaded', {
          description: `File: ${info.filename} (${info.sizeFormatted})`
        })

        // Refresh backup list
        loadBackups()
      } else {
        const error = await response.json()
        toast.error('Failed to create backup', {
          description: error.error || 'Unknown error occurred'
        })
      }
    } catch (error) {
      toast.error('Failed to create backup', {
        description: 'Network error occurred'
      })
    } finally {
      setCreating(false)
    }
  }

  const downloadBackup = async (filename: string) => {
    try {
      toast.info('Downloading backup...', {
        description: filename
      })

      const response = await fetch(`/api/admin/backup/download?action=download&filename=${encodeURIComponent(filename)}`, {
        credentials: 'include'
      })

      if (response.ok) {
        // Get backup info from headers
        const backupInfo = response.headers.get('X-Backup-Info')
        const info = backupInfo ? JSON.parse(backupInfo) : {}

        // Create blob and download
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        toast.success('Backup downloaded', {
          description: `${filename} (${info.sizeFormatted})`
        })
      } else {
        const error = await response.json()
        toast.error('Failed to download backup', {
          description: error.error || 'Unknown error occurred'
        })
      }
    } catch (error) {
      toast.error('Failed to download backup', {
        description: 'Network error occurred'
      })
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file
      if (importConfig) {
        if (!importConfig.allowedExtensions.some(ext => file.name.endsWith(ext))) {
          toast.error('Invalid file type', {
            description: `Only ${importConfig.allowedExtensions.join(', ')} files are allowed`
          })
          return
        }

        if (file.size > importConfig.maxFileSize) {
          toast.error('File too large', {
            description: `Maximum size is ${importConfig.maxFileSizeFormatted}`
          })
          return
        }
      }

      setSelectedFile(file)
      setMergeAnalysis(null) // Reset analysis when new file is selected
    }
  }

  const analyzeBackupForMerge = async (filename: string) => {
    try {
      setAnalyzing(true)

      toast.info('Analyzing backup file...', {
        description: 'Checking for conflicts and changes'
      })

      const response = await fetch('/api/admin/backup/merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'analyze',
          filename,
          options: {
            conflictResolution,
            preserveNewer,
            onlyTables: selectedTables.length < (mergeConfig?.supportedTables.length || 0) ? selectedTables : undefined
          }
        }),
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setMergeAnalysis(data.analysis)

        toast.success('Analysis completed', {
          description: `Found ${data.analysis.summary.estimatedChanges.conflicts} conflicts, ${data.analysis.summary.estimatedChanges.newRecords} new records`
        })

        if (data.analysis.conflicts.length > 0) {
          setShowConflicts(true)
        }
      } else {
        const error = await response.json()
        toast.error('Analysis failed', {
          description: error.error || 'Unknown error occurred'
        })
      }
    } catch (error) {
      toast.error('Analysis failed', {
        description: 'Network error occurred'
      })
    } finally {
      setAnalyzing(false)
    }
  }

  const performIncrementalMerge = async (filename: string, dryRun = false) => {
    try {
      setMerging(true)

      toast.info(dryRun ? 'Running merge preview...' : 'Performing incremental merge...', {
        description: 'This may take a few moments'
      })

      const response = await fetch('/api/admin/backup/merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'merge',
          filename,
          options: {
            conflictResolution,
            preserveNewer,
            onlyTables: selectedTables.length < (mergeConfig?.supportedTables.length || 0) ? selectedTables : undefined,
            dryRun
          }
        }),
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()

        if (dryRun) {
          toast.success('Merge preview completed', {
            description: `Would add ${data.result.summary.recordsAdded} records, update ${data.result.summary.recordsUpdated} records`
          })
        } else {
          toast.success('Incremental merge completed', {
            description: `Added ${data.result.summary.recordsAdded} records, updated ${data.result.summary.recordsUpdated} records`
          })

          // Refresh backup list and reset form
          loadBackups()
          setSelectedFile(null)
          setMergeMode(false)
          setMergeAnalysis(null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        }
      } else {
        const error = await response.json()
        toast.error('Merge failed', {
          description: error.error || 'Unknown error occurred'
        })
      }
    } catch (error) {
      toast.error('Merge failed', {
        description: 'Network error occurred'
      })
    } finally {
      setMerging(false)
    }
  }

  const uploadBackup = async () => {
    if (!selectedFile) return

    try {
      setUploading(true)
      
      const formData = new FormData()
      formData.append('backup', selectedFile)
      formData.append('action', 'upload')
      formData.append('restoreImmediately', restoreImmediately.toString())

      toast.info(restoreImmediately ? 'Uploading and restoring...' : 'Uploading backup...', {
        description: 'This may take a few moments'
      })

      const response = await fetch('/api/admin/backup/import', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.backup.restored) {
          toast.success('Backup uploaded and restored successfully', {
            description: `Database restored from ${data.backup.originalName}`
          })
        } else {
          toast.success('Backup uploaded successfully', {
            description: `${data.backup.originalName} (${data.backup.sizeFormatted})`
          })
        }

        // Clear selected file and refresh backups
        setSelectedFile(null)
        setRestoreImmediately(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        loadBackups()
      } else {
        const error = await response.json()
        toast.error('Failed to upload backup', {
          description: error.error || 'Unknown error occurred'
        })
      }
    } catch (error) {
      toast.error('Failed to upload backup', {
        description: 'Network error occurred'
      })
    } finally {
      setUploading(false)
    }
  }

  const restoreBackup = async (filename: string) => {
    try {
      setRestoring(true)
      
      toast.info('Restoring database...', {
        description: 'This may take a few moments'
      })

      const response = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'restore',
          filename
        }),
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        toast.success('Database restored successfully', {
          description: `Restored from ${filename}`
        })
      } else {
        const error = await response.json()
        toast.error('Failed to restore database', {
          description: error.error || 'Unknown error occurred'
        })
      }
    } catch (error) {
      toast.error('Failed to restore database', {
        description: 'Network error occurred'
      })
    } finally {
      setRestoring(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Backup Management</h1>
        <p className="text-gray-600">Create, download, upload, and restore database backups</p>
      </div>

      {/* Create New Backup */}
      <Card className="p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4">
              <Database className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Create New Backup</h2>
              <p className="text-gray-600">Generate and download a complete database backup</p>
            </div>
          </div>
          <Button
            onClick={createAndDownloadBackup}
            disabled={creating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Create & Download
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div className="flex items-center">
            <Shield className="h-4 w-4 mr-2 text-green-600" />
            Includes all data and settings
          </div>
          <div className="flex items-center">
            <HardDrive className="h-4 w-4 mr-2 text-blue-600" />
            Compressed for smaller file size
          </div>
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-2 text-orange-600" />
            Automatic cleanup of old backups
          </div>
        </div>
      </Card>

      {/* Upload Backup */}
      <Card className="p-6 mb-8">
        <div className="flex items-center mb-6">
          <div className="h-12 w-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-4">
            <Upload className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Upload & Restore Backup</h2>
            <p className="text-gray-600">Upload a backup file and optionally restore it immediately</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="backup-file">Select Backup File</Label>
            <Input
              ref={fileInputRef}
              id="backup-file"
              type="file"
              accept=".sql,.sql.gz"
              onChange={handleFileSelect}
              className="mt-1"
            />
            {importConfig && (
              <p className="text-sm text-gray-500 mt-1">
                Max size: {importConfig.maxFileSizeFormatted}. Allowed: {importConfig.allowedExtensions.join(', ')}
              </p>
            )}
          </div>

          {selectedFile && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-gray-600 mr-2" />
                  <div>
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-600">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={restoreImmediately}
                      onChange={(e) => setRestoreImmediately(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Restore immediately</span>
                  </label>
                  <Button
                    onClick={uploadBackup}
                    disabled={uploading}
                    size="sm"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {restoreImmediately ? 'Uploading & Restoring...' : 'Uploading...'}
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        {restoreImmediately ? 'Upload & Restore' : 'Upload'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Incremental Merge */}
      <Card className="p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center mr-4">
              <RefreshCw className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Incremental Merge</h2>
              <p className="text-gray-600">Smart merge that preserves current data and resolves conflicts</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setMergeMode(!mergeMode)}
              variant={mergeMode ? "default" : "outline"}
              size="sm"
            >
              {mergeMode ? 'Exit Merge Mode' : 'Enable Merge Mode'}
            </Button>
          </div>
        </div>

        {mergeMode && (
          <div className="space-y-6">
            {/* Merge Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="conflict-resolution">Conflict Resolution</Label>
                <select
                  id="conflict-resolution"
                  value={conflictResolution}
                  onChange={(e) => setConflictResolution(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {mergeConfig?.conflictResolutionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {mergeConfig?.conflictResolutionOptions.find(o => o.value === conflictResolution)?.description}
                </p>
              </div>

              <div>
                <Label>Options</Label>
                <div className="mt-1 space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preserveNewer}
                      onChange={(e) => setPreserveNewer(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">Preserve newer records</span>
                  </label>
                </div>
              </div>
            </div>

            {/* File Selection for Merge */}
            {selectedFile && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-blue-600 mr-2" />
                    <div>
                      <p className="font-medium text-blue-900">{selectedFile.name}</p>
                      <p className="text-sm text-blue-600">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => analyzeBackupForMerge(selectedFile.name)}
                      disabled={analyzing}
                      size="sm"
                      variant="outline"
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        'Analyze for Merge'
                      )}
                    </Button>
                  </div>
                </div>

                {/* Merge Analysis Results */}
                {mergeAnalysis && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white p-3 rounded border">
                        <div className="text-sm font-medium text-gray-600">New Records</div>
                        <div className="text-lg font-bold text-green-600">
                          {mergeAnalysis.summary.estimatedChanges.newRecords}
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <div className="text-sm font-medium text-gray-600">Updates</div>
                        <div className="text-lg font-bold text-blue-600">
                          {mergeAnalysis.summary.estimatedChanges.updatedRecords}
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <div className="text-sm font-medium text-gray-600">Conflicts</div>
                        <div className="text-lg font-bold text-orange-600">
                          {mergeAnalysis.summary.estimatedChanges.conflicts}
                        </div>
                      </div>
                    </div>

                    {mergeAnalysis.conflicts.length > 0 && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-orange-900">Conflicts Detected</h4>
                          <Button
                            onClick={() => setShowConflicts(!showConflicts)}
                            variant="outline"
                            size="sm"
                          >
                            {showConflicts ? 'Hide' : 'Show'} Conflicts
                          </Button>
                        </div>
                        {showConflicts && (
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {mergeAnalysis.conflicts.slice(0, 10).map((conflict, index) => (
                              <div key={index} className="text-sm bg-white p-2 rounded border">
                                <span className="font-medium">{conflict.table}</span> - ID: {conflict.id}
                                <div className="text-xs text-gray-600">
                                  Fields: {conflict.conflictFields.join(', ')}
                                </div>
                              </div>
                            ))}
                            {mergeAnalysis.conflicts.length > 10 && (
                              <div className="text-sm text-gray-600 text-center">
                                ... and {mergeAnalysis.conflicts.length - 10} more conflicts
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center space-x-3">
                      <Button
                        onClick={() => performIncrementalMerge(selectedFile.name, true)}
                        disabled={merging}
                        variant="outline"
                        size="sm"
                      >
                        Preview Merge
                      </Button>
                      <Button
                        onClick={() => performIncrementalMerge(selectedFile.name, false)}
                        disabled={merging}
                        size="sm"
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        {merging ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Merging...
                          </>
                        ) : (
                          'Perform Incremental Merge'
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!selectedFile && (
              <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                <RefreshCw className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Select a backup file above to analyze for incremental merge</p>
                <p className="text-sm">Incremental merge preserves your current data while adding new records</p>
              </div>
            )}
          </div>
        )}

        {!mergeMode && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
              Preserves existing data
            </div>
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 mr-2 text-orange-600" />
              Detects and resolves conflicts
            </div>
            <div className="flex items-center">
              <Shield className="h-4 w-4 mr-2 text-blue-600" />
              Safe merge with preview option
            </div>
          </div>
        )}
      </Card>

      {/* Existing Backups */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mr-4">
              <HardDrive className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Existing Backups</h2>
              <p className="text-gray-600">Manage your stored backup files</p>
            </div>
          </div>
          <Button
            onClick={loadBackups}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>

        {backups.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No backups found</p>
            <p className="text-sm">Create your first backup to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {backups.map((backup) => (
              <div
                key={backup.filename}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-gray-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">{backup.filename}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>{backup.sizeFormatted}</span>
                      <span>{formatDate(backup.created)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => downloadBackup(backup.filename)}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  <Button
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: 'Restore Database',
                        description: `Are you sure you want to restore the database from "${backup.filename}"? This will replace all current data.`,
                        action: () => restoreBackup(backup.filename),
                        variant: 'warning'
                      })
                    }}
                    variant="outline"
                    size="sm"
                    disabled={restoring}
                  >
                    {restoring ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-1" />
                    )}
                    Restore
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          confirmModal.action()
          setConfirmModal(prev => ({ ...prev, isOpen: false }))
        }}
        title={confirmModal.title}
        description={confirmModal.description}
        variant={confirmModal.variant}
        confirmText="Confirm"
        cancelText="Cancel"
      />
    </div>
  )
}
