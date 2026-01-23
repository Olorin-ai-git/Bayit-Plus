import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { X, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { GlassView, GlassInput, GlassButton } from '@bayit/shared/ui'
import { colors } from '@bayit/shared/theme'
import { useDirection } from '@/hooks/useDirection'

// Zod schema for props validation
const ImageUploadProgressPropsSchema = z.object({
  allowUrl: z.boolean(),
  isUploading: z.boolean(),
  showUrlInput: z.boolean(),
  urlInput: z.string(),
  error: z.string().nullable(),
  onShowUrlInput: z.function().args(z.boolean()).returns(z.void()),
  onUrlInputChange: z.function().args(z.string()).returns(z.void()),
  onUrlSubmit: z.function().returns(z.void().or(z.promise(z.void()))),
  onClearError: z.function().returns(z.void()),
})

export interface ImageUploadProgressProps {
  allowUrl: boolean
  isUploading: boolean
  showUrlInput: boolean
  urlInput: string
  error: string | null
  onShowUrlInput: (show: boolean) => void
  onUrlInputChange: (value: string) => void
  onUrlSubmit: () => void | Promise<void>
  onClearError: () => void
}

export function ImageUploadProgress({
  allowUrl,
  isUploading,
  showUrlInput,
  urlInput,
  error,
  onShowUrlInput,
  onUrlInputChange,
  onUrlSubmit,
  onClearError,
}: ImageUploadProgressProps) {
  const { t } = useTranslation()
  const { textAlign } = useDirection()

  return (
    <>
      {/* URL Input Section */}
      {allowUrl && (
        <View className="mt-4">
          {!showUrlInput ? (
            <GlassButton
              title={t('admin.content.editor.imageUpload.orPasteUrl')}
              onPress={() => onShowUrlInput(true)}
              variant="ghost"
              disabled={isUploading}
              fullWidth
            />
          ) : (
            <GlassView className="rounded-2xl p-6 gap-4" intensity="medium">
              <View className="w-full">
                <GlassInput
                  value={urlInput}
                  onChangeText={onUrlInputChange}
                  placeholder={t('admin.content.editor.imageUpload.urlPlaceholder')}
                  editable={!isUploading}
                  className="w-full"
                />
              </View>
              <View className="flex-row items-center gap-2">
                <GlassButton
                  title={
                    isUploading
                      ? t('admin.content.editor.imageUpload.validating')
                      : t('admin.content.editor.imageUpload.validateButton')
                  }
                  onPress={onUrlSubmit}
                  variant="primary"
                  disabled={isUploading || !urlInput.trim()}
                  loading={isUploading}
                  fullWidth
                />
                <Pressable
                  onPress={() => {
                    onShowUrlInput(false)
                    onUrlInputChange('')
                    onClearError()
                  }}
                  disabled={isUploading}
                  className="ml-2"
                >
                  <GlassView className="p-3 rounded-2xl items-center justify-center" intensity="high">
                    <X size={20} color={colors.textMuted} />
                  </GlassView>
                </Pressable>
              </View>
            </GlassView>
          )}
        </View>
      )}

      {/* Error Display */}
      {error && (
        <GlassView
          className="flex-row items-center gap-2 p-4 mt-4 rounded-2xl border"
          intensity="low"
          style={{
            backgroundColor: `${colors.error}10`,
            borderColor: `${colors.error}40`,
          }}
        >
          <AlertCircle size={16} color={colors.error} />
          <Text className="flex-1 text-xs" style={{ color: colors.error, textAlign }}>
            {error}
          </Text>
        </GlassView>
      )}
    </>
  )
}
