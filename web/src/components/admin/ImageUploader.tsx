import React, { useState, useRef } from 'react'
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface ImageUploaderProps {
  value?: string
  onChange: (url: string) => void
  label?: string
  aspectRatio?: number
  maxSizeMB?: number
  allowUrl?: boolean
  onError?: (error: string) => void
}

export function ImageUploader({
  value,
  onChange,
  label,
  aspectRatio = 16 / 9,
  maxSizeMB = 5,
  allowUrl = true,
  onError,
}: ImageUploaderProps) {
  const { t } = useTranslation()
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const validateFile = (file: File): boolean => {
    if (!file.type.startsWith('image/')) {
      const msg = 'Please select an image file'
      setError(msg)
      onError?.(msg)
      return false
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      const msg = `File size must be less than ${maxSizeMB}MB`
      setError(msg)
      onError?.(msg)
      return false
    }

    return true
  }

  const uploadFile = async (file: File) => {
    if (!validateFile(file)) return

    setIsUploading(true)
    setError(null)

    try {
      const { uploadsService } = await import('../../services/adminApi')
      const response = await uploadsService.uploadImage(file, 'content')
      onChange(response.url)
      setError(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setError(msg)
      onError?.(msg)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      uploadFile(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files && files.length > 0) {
      uploadFile(files[0])
    }
    // Reset input
    e.currentTarget.value = ''
  }

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return

    setIsUploading(true)
    setError(null)

    try {
      const { uploadsService } = await import('../../services/adminApi')
      const response = await uploadsService.validateUrl(urlInput)
      if (response.valid) {
        onChange(urlInput)
        setUrlInput('')
        setShowUrlInput(false)
      } else {
        setError(response.message || 'Invalid URL')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'URL validation failed'
      setError(msg)
      onError?.(msg)
    } finally {
      setIsUploading(false)
    }
  }

  const handleClear = () => {
    onChange('')
    setError(null)
  }

  // Calculate preview dimensions based on aspect ratio
  const previewWidth = 200
  const previewHeight = Math.round(previewWidth / aspectRatio)

  return (
    <div className="w-full space-y-3">
      {label && <label className="block text-sm font-medium text-white">{label}</label>}

      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-white/10 bg-white/5 p-4">
          <div
            style={{
              width: previewWidth,
              height: previewHeight,
              backgroundImage: `url(${value})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            className="rounded-lg border border-white/10"
          />
          <button
            onClick={handleClear}
            disabled={isUploading}
            className="absolute top-2 right-2 p-2 rounded-lg bg-red-500/80 hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <p className="mt-3 text-xs text-green-400 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Image uploaded successfully
          </p>
        </div>
      ) : (
        <>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative rounded-lg border-2 border-dashed transition-all cursor-pointer ${
              isDragging
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
            } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={isUploading}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="p-8 text-center">
              <Upload className="w-8 h-8 mx-auto mb-3 text-blue-400" />
              <p className="text-sm font-medium text-white mb-1">Drop image here or click to upload</p>
              <p className="text-xs text-gray-400">PNG, JPG, WebP up to {maxSizeMB}MB</p>
              {isUploading && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                  <span className="text-xs text-blue-400">Uploading...</span>
                </div>
              )}
            </div>
          </div>

          {allowUrl && (
            <div className="space-y-2">
              {!showUrlInput ? (
                <button
                  onClick={() => setShowUrlInput(true)}
                  disabled={isUploading}
                  className="w-full py-2 px-3 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-sm text-gray-300 hover:text-white transition-colors disabled:opacity-50"
                >
                  Or paste image URL
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    disabled={isUploading}
                    className="flex-1 px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                  <button
                    onClick={handleUrlSubmit}
                    disabled={isUploading || !urlInput.trim()}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {isUploading ? 'Validating...' : 'Add'}
                  </button>
                  <button
                    onClick={() => {
                      setShowUrlInput(false)
                      setUrlInput('')
                    }}
                    disabled={isUploading}
                    className="px-3 py-2 rounded-lg border border-white/20 hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}
    </div>
  )
}
