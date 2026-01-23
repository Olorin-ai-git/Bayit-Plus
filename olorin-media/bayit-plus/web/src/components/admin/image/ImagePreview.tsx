import React from 'react'
import { View, Text, Image, Pressable } from 'react-native'
import { X, CheckCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { GlassView } from '@bayit/shared/ui'
import { colors } from '@bayit/shared/theme'

// Zod schema for props validation
const ImagePreviewPropsSchema = z.object({
  imageUrl: z.string().url(),
  aspectRatio: z.number().positive(),
  isUploading: z.boolean(),
  onClear: z.function().returns(z.void()),
})

export interface ImagePreviewProps {
  imageUrl: string
  aspectRatio: number
  isUploading: boolean
  onClear: () => void
}

export function ImagePreview({
  imageUrl,
  aspectRatio,
  isUploading,
  onClear,
}: ImagePreviewProps) {
  const { t } = useTranslation()

  // Calculate preview dimensions based on aspect ratio
  const previewWidth = 200
  const previewHeight = Math.round(previewWidth / aspectRatio)

  return (
    <GlassView className="rounded-2xl p-6 relative" intensity="medium">
      <Image
        source={{ uri: imageUrl }}
        style={{ width: previewWidth, height: previewHeight }}
        className="rounded-2xl border border-white/10 bg-black/50"
        resizeMode="cover"
      />
      <Pressable
        onPress={onClear}
        disabled={isUploading}
        className="absolute top-2 right-2"
      >
        <GlassView className="p-3 rounded-2xl" intensity="high">
          <X size={16} color={colors.error} />
        </GlassView>
      </Pressable>
      <View className="flex-row items-center gap-2 mt-4">
        <CheckCircle size={16} color={colors.success} />
        <Text className="text-xs" style={{ color: colors.success }}>
          {t('admin.content.editor.imageUpload.success')}
        </Text>
      </View>
    </GlassView>
  )
}
