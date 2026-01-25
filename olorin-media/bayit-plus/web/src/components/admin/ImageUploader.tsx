import React, { useState, useRef } from 'react'
import { View, Text, StyleSheet, Pressable, Image, ActivityIndicator } from 'react-native'
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { GlassView, GlassInput, GlassButton } from '@bayit/shared/ui'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { useDirection } from '@/hooks/useDirection'

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
  const { textAlign } = useDirection()
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
      const msg = t('admin.content.editor.imageUpload.errors.imageOnly')
      setError(msg)
      onError?.(msg)
      return false
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      const msg = t('admin.content.editor.imageUpload.errors.tooLarge', { maxSize: maxSizeMB })
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
      const msg = err instanceof Error ? err.message : t('admin.content.editor.imageUpload.errors.uploadFailed')
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
        const errorMsg = response.message || t('admin.content.editor.imageUpload.errors.invalidUrl')
        setError(errorMsg)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('admin.content.editor.imageUpload.errors.invalidUrl')
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
    <View style={styles.container}>
      {label && <Text style={[styles.label, { textAlign }]}>{label}</Text>}

      {value ? (
        <GlassView style={styles.previewContainer} intensity="medium">
          <Image
            source={{ uri: value }}
            style={[styles.preview, { width: previewWidth, height: previewHeight }]}
            resizeMode="cover"
          />
          <Pressable
            onPress={handleClear}
            disabled={isUploading}
            style={styles.clearButton}
          >
            <GlassView style={styles.clearButtonInner} intensity="high">
              <X size={16} color={colors.error} />
            </GlassView>
          </Pressable>
          <View style={styles.successMessage}>
            <CheckCircle size={16} color={colors.success} />
            <Text style={styles.successText}>{t('admin.content.editor.imageUpload.success')}</Text>
          </View>
        </GlassView>
      ) : (
        <>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={isUploading}
            style={{
              position: 'absolute',
              width: 0,
              height: 0,
              opacity: 0,
              overflow: 'hidden',
              pointerEvents: 'none',
            }}
          />

          <Pressable
            onPress={() => fileInputRef.current?.click()}
            disabled={isUploading}
            // @ts-ignore - web-specific drag handlers
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <GlassView
              style={[
                styles.dropZone,
                isDragging && styles.dropZoneDragging,
                isUploading && styles.dropZoneDisabled,
              ]}
              intensity={isDragging ? 'high' : 'medium'}
              borderColor={isDragging ? colors.primary : undefined}
            >
              <View style={styles.dropZoneContent}>
                <Upload size={32} color={colors.primary} />
                <Text style={[styles.dropZoneTitle, { textAlign }]}>
                  {t('admin.content.editor.imageUpload.dropHere')}
                </Text>
                <Text style={[styles.dropZoneSubtitle, { textAlign }]}>
                  {t('admin.content.editor.imageUpload.formats', { maxSize: maxSizeMB })}
                </Text>
                {isUploading && (
                  <View style={styles.uploadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.uploadingText}>
                      {t('admin.content.editor.imageUpload.uploading')}
                    </Text>
                  </View>
                )}
              </View>
            </GlassView>
          </Pressable>

          {allowUrl && (
            <View style={styles.urlSection}>
              {!showUrlInput ? (
                <GlassButton
                  title={t('admin.content.editor.imageUpload.orPasteUrl')}
                  onPress={() => setShowUrlInput(true)}
                  variant="ghost"
                  disabled={isUploading}
                  fullWidth
                />
              ) : (
                <GlassView style={styles.urlInputCard} intensity="medium">
                  <View style={styles.urlInputRow}>
                    <GlassInput
                      value={urlInput}
                      onChangeText={setUrlInput}
                      placeholder={t('admin.content.editor.imageUpload.urlPlaceholder')}
                      editable={!isUploading}
                      style={styles.urlInput}
                    />
                  </View>
                  <View style={styles.urlButtonRow}>
                    <GlassButton
                      title={isUploading ? t('admin.content.editor.imageUpload.validating') : t('admin.content.editor.imageUpload.validateButton')}
                      onPress={handleUrlSubmit}
                      variant="primary"
                      disabled={isUploading || !urlInput.trim()}
                      loading={isUploading}
                      fullWidth
                    />
                    <Pressable
                      onPress={() => {
                        setShowUrlInput(false)
                        setUrlInput('')
                        setError(null)
                      }}
                      disabled={isUploading}
                      style={styles.cancelButtonWrapper}
                    >
                      <GlassView style={styles.cancelButton} intensity="high">
                        <X size={20} color={colors.textMuted} />
                      </GlassView>
                    </Pressable>
                  </View>
                </GlassView>
              )}
            </View>
          )}
        </>
      )}

      {error && (
        <GlassView style={styles.errorContainer} intensity="low">
          <AlertCircle size={16} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </GlassView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  previewContainer: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    position: 'relative',
  },
  preview: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  clearButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  clearButtonInner: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  successText: {
    fontSize: 12,
    color: colors.success.DEFAULT,
  },
  dropZone: {
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    minHeight: 180,
    overflow: 'hidden',
  },
  dropZoneDragging: {
    borderColor: colors.primary.DEFAULT,
  },
  dropZoneDisabled: {
    opacity: 0.5,
  },
  dropZoneContent: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  dropZoneTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  dropZoneSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  uploadingText: {
    fontSize: 12,
    color: colors.primary.DEFAULT,
  },
  urlSection: {
    marginTop: spacing.md,
  },
  urlInputCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  urlInputRow: {
    width: '100%',
  },
  urlInput: {
    width: '100%',
  },
  urlButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cancelButtonWrapper: {
    marginLeft: spacing.sm,
  },
  cancelButton: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: `${colors.error}10`,
    borderWidth: 1,
    borderColor: `${colors.error}40`,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: colors.error.DEFAULT,
  },
})
