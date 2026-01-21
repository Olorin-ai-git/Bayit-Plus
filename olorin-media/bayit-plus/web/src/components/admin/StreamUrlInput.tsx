import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { AlertCircle, CheckCircle, Copy } from 'lucide-react'
import { GlassView, GlassInput, GlassButton } from '@bayit/shared/ui'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
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
    <View style={styles.container}>
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
        <View style={styles.copiedMessage}>
          <Text style={styles.copiedText}>{t('admin.content.streamUrlInput.copied')}</Text>
        </View>
      )}

      {url && (
        <View style={styles.streamTypeSection}>
          <Text style={[styles.streamTypeLabel, { textAlign }]}>
            {t('admin.content.streamUrlInput.streamType')}
          </Text>
          <View style={styles.typeButtons}>
            {(['hls', 'dash', 'audio'] as const).map((type) => (
              <Pressable
                key={type}
                onPress={() => handleTypeChange(type)}
                style={styles.typeButtonWrapper}
              >
                <GlassView
                  style={[
                    styles.typeButton,
                    streamType === type && styles.typeButtonActive,
                  ]}
                  intensity={streamType === type ? 'high' : 'low'}
                  borderColor={streamType === type ? colors.primary : undefined}
                >
                  <Text style={styles.typeIcon}>{getStreamTypeIcon(type)}</Text>
                  <Text
                    style={[
                      styles.typeButtonText,
                      streamType === type && styles.typeButtonTextActive,
                    ]}
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
        <GlassView style={styles.errorMessage} intensity="low">
          <AlertCircle size={16} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </GlassView>
      )}

      {isValid && url && (
        <GlassView style={styles.successMessage} intensity="low">
          <CheckCircle size={16} color={colors.success} />
          <Text style={styles.successText}>
            {t('admin.content.streamUrlInput.validUrl', { type: streamType.toUpperCase() })}
          </Text>
        </GlassView>
      )}

      <GlassView style={styles.helpSection} intensity="low">
        <Text style={[styles.helpTitle, { textAlign }]}>
          {t('admin.content.streamUrlInput.supportedFormats.title')}
        </Text>
        <View style={styles.helpList}>
          <Text style={[styles.helpItem, { textAlign }]}>
            • {t('admin.content.streamUrlInput.supportedFormats.hls')}
          </Text>
          <Text style={[styles.helpItem, { textAlign }]}>
            • {t('admin.content.streamUrlInput.supportedFormats.dash')}
          </Text>
          <Text style={[styles.helpItem, { textAlign }]}>
            • {t('admin.content.streamUrlInput.supportedFormats.audio')}
          </Text>
        </View>
      </GlassView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing.md,
  },
  copiedMessage: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  copiedText: {
    fontSize: 12,
    color: colors.success,
  },
  streamTypeSection: {
    marginTop: spacing.md,
  },
  streamTypeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeButtonWrapper: {
    flex: 1,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  typeButtonActive: {
    borderWidth: 2,
  },
  typeIcon: {
    fontSize: 16,
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  typeButtonTextActive: {
    color: colors.primary,
  },
  errorMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.error}10`,
    borderWidth: 1,
    borderColor: `${colors.error}40`,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: colors.error,
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.success}10`,
    borderWidth: 1,
    borderColor: `${colors.success}40`,
  },
  successText: {
    flex: 1,
    fontSize: 12,
    color: colors.success,
  },
  helpSection: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  helpTitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  helpList: {
    gap: spacing.xs,
  },
  helpItem: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
})
