'use client'

import { Check, CheckCheck, Download, FileText, Image, Video, Music, File, Eye } from 'lucide-react'
import { memo, useState } from 'react'

interface FileAttachment {
  originalName: string
  filename: string
  size: number
  type: string
  url: string
}

interface ChatMessageProps {
  id: string
  content: string
  timestamp: string
  isFromUser: boolean
  isRead: boolean
  senderName?: string
  status: 'sent' | 'delivered' | 'read'
  fileAttachment?: FileAttachment
}

function ChatMessageComponent({
  content,
  timestamp,
  isFromUser,
  isRead: _isRead,
  senderName,
  status,
  fileAttachment
}: ChatMessageProps) {
  const [imageError, setImageError] = useState(false)

  // Helper function to get file icon based on type
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return Image
    if (fileType.startsWith('video/')) return Video
    if (fileType.startsWith('audio/')) return Music
    if (fileType.includes('pdf') || fileType.includes('document')) return FileText
    return File
  }

  // Helper function to format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Helper function to check if file can be previewed
  const canPreview = (fileType: string) => {
    return fileType.startsWith('image/') ||
           fileType.startsWith('video/') ||
           fileType.startsWith('audio/') ||
           fileType.includes('pdf')
  }

  // Handle file download
  const handleDownload = async () => {
    if (!fileAttachment) return

    try {
      const response = await fetch(fileAttachment.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileAttachment.originalName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  // Handle file preview - open in new tab
  const handlePreview = () => {
    if (!fileAttachment) return
    window.open(fileAttachment.url, '_blank')
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div className={`flex ${isFromUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-[70%] rounded-lg px-3 py-2 shadow-sm ${
          isFromUser
            ? 'bg-indigo-600 text-white rounded-br-none text-white'
            : 'bg-gray-100 text-gray-700 rounded-bl-none border border-gray-300'
        }`}
      >
        {/* Sender name for received messages */}
        {!isFromUser && senderName && (
          <div className="text-xs font-apercu-medium text-gray-600 mb-1">
            {senderName}
          </div>
        )}

        {/* File attachment */}
        {fileAttachment && (
          <div className="mb-3">
            {fileAttachment.type.startsWith('image/') ? (
              <div className="relative">
                <img
                  src={fileAttachment.url}
                  alt={fileAttachment.originalName}
                  className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ maxHeight: '200px', maxWidth: '250px' }}
                  onClick={handlePreview}
                  onError={() => setImageError(true)}
                />
                {!imageError && (
                  <div className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full p-1">
                    <Eye className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ) : fileAttachment.type.startsWith('video/') ? (
              <div className="relative">
                <video
                  src={fileAttachment.url}
                  className="max-w-full h-auto rounded-lg"
                  style={{ maxHeight: '200px', maxWidth: '250px' }}
                  controls
                  preload="metadata"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            ) : fileAttachment.type.startsWith('audio/') ? (
              <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
                <div className="flex items-center space-x-3 mb-2">
                  <Music className="h-5 w-5 text-indigo-600" />
                  <span className="font-apercu-medium text-sm text-gray-900 truncate">
                    {fileAttachment.originalName}
                  </span>
                </div>
                <audio
                  src={fileAttachment.url}
                  controls
                  className="w-full"
                  preload="metadata"
                >
                  Your browser does not support the audio tag.
                </audio>
              </div>
            ) : (
              <div className={`rounded-lg p-3 max-w-xs border ${
                isFromUser ? 'bg-indigo-600 border-indigo-600' : 'bg-gray-200 border-gray-300'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    isFromUser ? 'bg-indigo-700' : 'bg-gray-300'
                  }`}>
                    {(() => {
                      const IconComponent = getFileIcon(fileAttachment.type)
                      return <IconComponent className={`h-5 w-5 ${
                        isFromUser ? 'text-indigo-100' : 'text-gray-600'
                      }`} />
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-apercu-medium text-sm truncate ${
                      isFromUser ? 'text-white' : 'text-gray-700'
                    }`}>
                      {fileAttachment.originalName}
                    </p>
                    <p className={`font-apercu-regular text-xs ${
                      isFromUser ? 'text-white' : 'text-gray-500'
                    }`}>
                      {formatFileSize(fileAttachment.size)}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2 mt-3">
                  {canPreview(fileAttachment.type) && (
                    <button
                      onClick={handlePreview}
                      className={`flex items-center space-x-1 px-3 py-1 rounded-md text-xs font-apercu-medium transition-colors ${
                        isFromUser
                          ? 'bg-indigo-700 hover:bg-indigo-800 text-white'
                          : 'bg-gray-600 hover:bg-gray-700 text-white'
                      }`}
                    >
                      <Eye className="h-3 w-3 text-white" />
                      <span className="text-white">Preview</span>
                    </button>
                  )}
                  <button
                    onClick={handleDownload}
                    className={`flex items-center space-x-1 px-3 py-1 rounded-md text-xs font-apercu-medium transition-colors ${
                      isFromUser
                        ? 'bg-indigo-700 hover:bg-indigo-800 text-white'
                        : 'bg-gray-600 hover:bg-gray-700 text-white'
                    }`}
                  >
                    <Download className="h-3 w-3 text-white" />
                    <span className="text-white" >Download</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Message content */}
        {content && (
          <div className="font-apercu-regular text-sm leading-relaxed text-white whitespace-pre-wrap">
            {content}
          </div>
        )}
        
        {/* Timestamp and status */}
        <div className={`flex items-center justify-end mt-1 space-x-1 ${
          isFromUser ? 'text-indigo-100' : 'text-gray-500'
        }`}>
          <span className={`text-xs font-apercu-regular ${
            isFromUser ? 'text-white' : 'text-gray-500'
          }`}>
            {formatTime(timestamp)}
          </span>

          {/* Status indicators for sent messages */}
          {isFromUser && (
            <div className="flex items-center">
              {status === 'sent' && (
                <Check className="h-3 w-3 text-indigo-100" />
              )}
              {status === 'delivered' && (
                <CheckCheck className="h-3 w-3 text-indigo-100" />
              )}
              {status === 'read' && (
                <CheckCheck className="h-3 w-3 text-blue-200" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Export memoized component for better performance
export const ChatMessage = memo(ChatMessageComponent, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.content === nextProps.content &&
    prevProps.timestamp === nextProps.timestamp &&
    prevProps.isFromUser === nextProps.isFromUser &&
    prevProps.isRead === nextProps.isRead &&
    prevProps.status === nextProps.status &&
    prevProps.fileAttachment?.url === nextProps.fileAttachment?.url
  )
})
