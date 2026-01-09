import React, { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, Copy } from 'lucide-react'

interface StreamUrlInputProps {
  value?: string
  onChange: (url: string) => void
  onStreamTypeChange?: (type: 'hls' | 'dash' | 'audio') => void
  label?: string
  placeholder?: string
  required?: boolean
  onError?: (error: string | null) => void
}

export function StreamUrlInput({
  value = '',
  onChange,
  onStreamTypeChange,
  label,
  placeholder = 'https://example.com/stream.m3u8',
  required = true,
  onError,
}: StreamUrlInputProps) {
  const [url, setUrl] = useState(value)
  const [streamType, setStreamType] = useState<'hls' | 'dash' | 'audio'>('hls')
  const [error, setError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setUrl(value)
  }, [value])

  // Auto-detect stream type from URL
  const detectStreamType = (urlString: string): 'hls' | 'dash' | 'audio' => {
    const lower = urlString.toLowerCase()
    if (lower.includes('.m3u8') || lower.includes('hls')) return 'hls'
    if (lower.includes('.mpd') || lower.includes('dash')) return 'dash'
    if (lower.includes('.mp3') || lower.includes('.aac') || lower.includes('audio')) return 'audio'
    return 'hls' // default
  }

  const validateUrl = (urlString: string) => {
    setError(null)
    setIsValid(false)

    if (!urlString.trim()) {
      if (required) {
        const msg = 'Stream URL is required'
        setError(msg)
        onError?.(msg)
      }
      return
    }

    try {
      new URL(urlString)
    } catch {
      const msg = 'Invalid URL format'
      setError(msg)
      onError?.(msg)
      return
    }

    const detected = detectStreamType(urlString)
    setStreamType(detected)
    onStreamTypeChange?.(detected)
    setIsValid(true)
    onError?.(null)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value
    setUrl(newUrl)
    onChange(newUrl)
    validateUrl(newUrl)
  }

  const handleTypeChange = (type: 'hls' | 'dash' | 'audio') => {
    setStreamType(type)
    onStreamTypeChange?.(type)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getStreamTypeIcon = (type: string) => {
    switch (type) {
      case 'hls':
        return '📺'
      case 'dash':
        return '🎬'
      case 'audio':
        return '🎵'
      default:
        return '📡'
    }
  }

  return (
    <div className="w-full space-y-3">
      {label && <label className="block text-sm font-medium text-white">{label}</label>}

      <div className="space-y-2">
        <div className="relative">
          <input
            type="url"
            value={url}
            onChange={handleChange}
            placeholder={placeholder}
            className={`w-full px-4 py-3 rounded-lg border bg-white/5 text-white placeholder-gray-500 text-sm focus:outline-none transition-colors ${
              error
                ? 'border-red-500/50 focus:border-red-500'
                : isValid
                  ? 'border-green-500/50 focus:border-green-500'
                  : 'border-white/20 focus:border-blue-500'
            }`}
          />
          {url && (
            <button
              onClick={handleCopy}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded transition-colors"
              title="Copy URL"
            >
              <Copy className="w-4 h-4 text-gray-400 hover:text-gray-300" />
            </button>
          )}
        </div>

        {copied && <p className="text-xs text-green-400">URL copied to clipboard</p>}
      </div>

      {url && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-300">Stream Type</div>
          <div className="grid grid-cols-3 gap-2">
            {(['hls', 'dash', 'audio'] as const).map((type) => (
              <button
                key={type}
                onClick={() => handleTypeChange(type)}
                className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                  streamType === type
                    ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                    : 'border-white/20 text-gray-400 hover:border-white/40 hover:text-gray-300'
                }`}
              >
                <span>{getStreamTypeIcon(type)}</span>
                {type.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {isValid && url && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <p className="text-xs text-green-300">URL is valid - detected as {streamType.toUpperCase()}</p>
        </div>
      )}

      <div className="text-xs text-gray-400 space-y-1">
        <p>Supported formats:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-500">
          <li>HLS: .m3u8 streams</li>
          <li>DASH: .mpd streams</li>
          <li>Audio: .mp3, .aac, or audio streams</li>
        </ul>
      </div>
    </div>
  )
}
