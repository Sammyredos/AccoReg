'use client'

import { useState, KeyboardEvent, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Send, Paperclip, Smile, X } from 'lucide-react'

interface MessageInputProps {
  onSend: (message: string) => void
  onFileUpload?: (file: File) => void
  placeholder?: string
  disabled?: boolean
}

export function MessageInput({ onSend, onFileUpload, placeholder = "Type a message...", disabled = false }: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSend = () => {
    if ((message.trim() || selectedFile) && !disabled) {
      if (selectedFile && onFileUpload) {
        onFileUpload(selectedFile)
        setSelectedFile(null)
      }
      if (message.trim()) {
        onSend(message.trim())
        setMessage('')
      }
    }
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB')
        return
      }
      setSelectedFile(file)
    }
  }

  const handleAttachmentClick = () => {
    fileInputRef.current?.click()
  }

  const removeSelectedFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
      {/* Selected file preview */}
      {selectedFile && (
        <div className="mb-3 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Paperclip className="h-4 w-4 text-indigo-600" />
              <span className="font-apercu-regular text-sm text-gray-700 truncate">
                {selectedFile.name}
              </span>
              <span className="font-apercu-regular text-xs text-gray-500">
                ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeSelectedFile}
              className="p-1 hover:bg-gray-200 rounded-full"
            >
              <X className="h-4 w-4 text-gray-500" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-end space-x-2">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,application/pdf,.doc,.docx,.txt"
        />

        {/* Attachment button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAttachmentClick}
          className="p-2 hover:bg-gray-200 rounded-full flex-shrink-0"
          disabled={disabled}
        >
          <Paperclip className="h-5 w-5 text-gray-600" />
        </Button>

        {/* Message input */}
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full resize-none rounded-full border-0 bg-white px-4 py-3 pr-12 font-apercu-regular text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed shadow-sm"
            style={{
              minHeight: '44px',
              maxHeight: '120px',
              overflowY: message.split('\n').length > 3 ? 'scroll' : 'hidden'
            }}
          />

          {/* Emoji button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
            disabled={disabled}
          >
            <Smile className="h-4 w-4 text-gray-600" />
          </Button>
        </div>

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={(!message.trim() && !selectedFile) || disabled}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-3 flex-shrink-0 disabled:bg-gray-300 shadow-sm"
        >
          {disabled ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  )
}
