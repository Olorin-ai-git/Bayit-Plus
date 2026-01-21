import React, { useState, useEffect } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { AlertCircle, CheckCircle, Copy } from 'lucide-react'
import { GlassView, GlassInput, GlassButton } from '@bayit/shared/ui'
import { colors } from '@bayit/shared/theme'
import { useDirection } from '@/hooks/useDirection'

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
  const { t } = useTranslation()
  const { textAlign } = useDirection()
  const [url, setUrl] = useState(value)
  const [streamType, setStreamType] = useState<'hls' | 'dash' | 'audio'>('hls')
  const [error, setError] = useState<string | null>(null)
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
        const msg = t('admin.content.streamUrlInput.errors.required')
        setError(msg)
        onError?.(msg)
      }
      return
    }

    try {
      new URL(urlString)
    } catch {
      const msg = t('admin.content.streamUrlInput.errors.invalidFormat')
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

  const handleChange = (newUrl: string) => {
    setUrl(newUrl)
    onChange(newUrl)
    validateUrl(newUrl)
  }

  const handleTypeChange = (type: 'hls' | 'dash' | 'audio') => {
    setStreamType(type)
    onStreamTypeChange?.(type)
  }

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
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
    <View className="w-full mb-4">
      <GlassInput
        label={label}
        value={url}
        onChangeText={handleChange}
        placeholder={placeholder}
        error={error}
        rightIcon={url ? <Copy size={16} color={colors.textMuted} /> : undefined}
        onRightIconPress={url ? handleCopy : undefined}
      />

      {copied && (
        <View className="mt-1 px-2">
          <Text className="text-xs" style={{ color: colors.success }}>
            {t('admin.content.streamUrlInput.copied')}
          </Text>
        </View>
      )}

      {url && (
        <View className="mt-4">
          <Text className="text-xs font-medium mb-2" style={{ textAlign, color: colors.text }}>
            {t('admin.content.streamUrlInput.streamType')}
          </Text>
          <View className="flex-row gap-2">
            {(['hls', 'dash', 'audio'] as const).map((type) => (
              <Pressable
                key={type}
                onPress={() => handleTypeChange(type)}
                className="flex-1"
              >
                <GlassView
                  className={`flex-row items-center justify-center gap-1 py-2 px-4 rounded-lg ${streamType === type ? 'border-2' : ''}`}
                  intensity={streamType === type ? 'high' : 'low'}
                  borderColor={streamType === type ? colors.primary : undefined}
                >
                  <Text className="text-base">{getStreamTypeIcon(type)}</Text>
                  <Text
                    className="text-xs font-medium"
                    style={{ color: streamType === type ? colors.primary : colors.textMuted }}
                  >
                    {type.toUpperCase()}
                  </Text>
                </GlassView>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {error && (
        <GlassView className="flex-row items-center gap-2 p-4 mt-2 rounded-lg border" intensity="low" style={{ backgroundColor: `${colors.error}10`, borderColor: `${colors.error}40` }}>
          <AlertCircle size={16} color={colors.error} />
          <Text className="flex-1 text-xs" style={{ color: colors.error }}>{error}</Text>
        </GlassView>
      )}

      {isValid && url && (
        <GlassView className="flex-row items-center gap-2 p-4 mt-2 rounded-lg border" intensity="low" style={{ backgroundColor: `${colors.success}10`, borderColor: `${colors.success}40` }}>
          <CheckCircle size={16} color={colors.success} />
          <Text className="flex-1 text-xs" style={{ color: colors.success }}>
            {t('admin.content.streamUrlInput.validUrl', { type: streamType.toUpperCase() })}
          </Text>
        </GlassView>
      )}

      <GlassView className="mt-4 p-4 rounded-lg" intensity="low">
        <Text className="text-xs mb-1" style={{ textAlign, color: colors.textMuted }}>
          {t('admin.content.streamUrlInput.supportedFormats.title')}
        </Text>
        <View className="gap-1">
          <Text className="text-xs leading-[18px]" style={{ textAlign, color: colors.textMuted }}>
            • {t('admin.content.streamUrlInput.supportedFormats.hls')}
          </Text>
          <Text className="text-xs leading-[18px]" style={{ textAlign, color: colors.textMuted }}>
            • {t('admin.content.streamUrlInput.supportedFormats.dash')}
          </Text>
          <Text className="text-xs leading-[18px]" style={{ textAlign, color: colors.textMuted }}>
            • {t('admin.content.streamUrlInput.supportedFormats.audio')}
          </Text>
        </View>
      </GlassView>
    </View>
  )
}
