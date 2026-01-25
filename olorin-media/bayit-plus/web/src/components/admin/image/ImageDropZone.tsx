import React, { useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { GlassView } from '@bayit/shared/ui';
import { colors, borderRadius } from '@olorin/design-tokens';
import { useDirection } from '@/hooks/useDirection';

const ImageDropZonePropsSchema = z.object({
  isDragging: z.boolean(),
  isUploading: z.boolean(),
  maxSizeMB: z.number().positive(),
  onDragOver: z.function().args(z.any()).returns(z.void()),
  onDragLeave: z.function().returns(z.void()),
  onDrop: z.function().args(z.any()).returns(z.void()),
  onFileSelect: z.function().args(z.any()).returns(z.void()),
});

export interface ImageDropZoneProps {
  isDragging: boolean;
  isUploading: boolean;
  maxSizeMB: number;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
  const { t } = useTranslation();
  const { textAlign } = useDirection();
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileSelect}
        disabled={isUploading}
        style={inputStyles}
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
          <View style={styles.content}>
            <Upload size={32} color={colors.primary} />
            <Text style={[styles.primaryText, { textAlign }]}>
              {t('admin.content.editor.imageUpload.dropHere')}
            </Text>
            <Text style={[styles.secondaryText, { textAlign }]}>
              {t('admin.content.editor.imageUpload.formats', { maxSize: maxSizeMB })}
            </Text>
            {isUploading && (
              <View style={styles.uploadingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.uploadingText}>
                  {t('admin.content.editor.imageUpload.uploading')}
                </Text>
              </View>
            )}
          </View>
        </GlassView>
      </Pressable>
    </>
  );
}

const inputStyles: React.CSSProperties = {
  position: 'absolute',
  width: 0,
  height: 0,
  opacity: 0,
  overflow: 'hidden',
  pointerEvents: 'none',
};

const styles = StyleSheet.create({
  dropZone: {
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 180,
    overflow: 'hidden',
  },
  dropZoneDragging: {
    borderColor: colors.primary.DEFAULT,
  },
  dropZoneUploading: {
    opacity: 0.5,
  },
  content: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  primaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  secondaryText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  uploadingText: {
    fontSize: 12,
    color: colors.primary.DEFAULT,
  },
});

if (process.env.NODE_ENV === 'development') {
  const originalComponent = ImageDropZone;
  (ImageDropZone as any) = (props: any) => {
    ImageDropZonePropsSchema.parse(props);
    return originalComponent(props);
  };
}

export default ImageDropZone;
