import React, { useRef } from 'react'
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native'
import { Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { GlassView } from '@bayit/shared/ui'
import { colors } from '@bayit/shared/theme'
import { useDirection } from '@/hooks/useDirection'

// Zod schema for props validation
const ImageDropZonePropsSchema = z.object({
  isDragging: z.boolean(),
  isUploading: z.boolean(),
  maxSizeMB: z.number().positive(),
  onDragOver: z.function().args(z.any()).returns(z.void()),
  onDragLeave: z.function().returns(z.void()),
  onDrop: z.function().args(z.any()).returns(z.void()),
  onFileSelect: z.function().args(z.any()).returns(z.void()),
})

export interface ImageDropZoneProps {
  isDragging: boolean
  isUploading: boolean
  maxSizeMB: number
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function ImageDropZone({
  isDragging,
  isUploading,
  maxSizeMB,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
}: ImageDropZoneProps) {
  const { t } = useTranslation()
  const { textAlign } = useDirection()
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileSelect}
        disabled={isUploading}
        className="absolute w-0 h-0 opacity-0 overflow-hidden pointer-events-none"
      />

      <Pressable
        onPress={() => fileInputRef.current?.click()}
        disabled={isUploading}
        // @ts-ignore - web-specific drag handlers
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <GlassView
          style={[
            styles.dropZone,
            isDragging && styles.dropZoneDragging,
            isUploading && styles.dropZoneUploading,
          ]}
          intensity={isDragging ? 'high' : 'medium'}
          borderColor={isDragging ? colors.primary : undefined}
        >
          <View className="p-8 items-center justify-center gap-4">
            <Upload size={32} color={colors.primary} />
            <Text
              className="text-sm font-medium text-white"
              style={{ textAlign }}
            >
              {t('admin.content.editor.imageUpload.dropHere')}
            </Text>
            <Text
              className="text-xs text-gray-400"
              style={{ textAlign }}
            >
              {t('admin.content.editor.imageUpload.formats', { maxSize: maxSizeMB })}
            </Text>
            {isUploading && (
              <View className="flex-row items-center gap-2 mt-2">
                <ActivityIndicator size="small" color={colors.primary} />
                <Text className="text-xs" style={{ color: colors.primary }}>
                  {t('admin.content.editor.imageUpload.uploading')}
                </Text>
              </View>
            )}
          </View>
        </GlassView>
      </Pressable>
    </>
  )
}

const styles = StyleSheet.create({
  dropZone: {
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 180,
    overflow: 'hidden',
  },
  dropZoneDragging: {
    borderColor: colors.primary,
  },
  dropZoneUploading: {
    opacity: 0.5,
  },
});
