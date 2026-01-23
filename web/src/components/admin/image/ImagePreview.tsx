import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { X, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { GlassView } from '@bayit/shared/ui';
import { colors, borderRadius } from '@bayit/shared/theme';

const ImagePreviewPropsSchema = z.object({
  imageUrl: z.string().url(),
  aspectRatio: z.number().positive(),
  isUploading: z.boolean(),
  onClear: z.function().returns(z.void()),
});

export interface ImagePreviewProps {
  imageUrl: string;
  aspectRatio: number;
  isUploading: boolean;
  onClear: () => void;
}

export function ImagePreview({
  imageUrl,
  aspectRatio,
  isUploading,
  onClear,
}: ImagePreviewProps) {
  const { t } = useTranslation();

  const previewWidth = 200;
  const previewHeight = Math.round(previewWidth / aspectRatio);

  return (
    <GlassView style={styles.container} intensity="medium">
      <Image
        source={{ uri: imageUrl }}
        style={[styles.image, { width: previewWidth, height: previewHeight }]}
        resizeMode="cover"
      />
      <Pressable
        onPress={onClear}
        disabled={isUploading}
        style={styles.clearButton}
      >
        <GlassView style={styles.clearButtonInner} intensity="high">
          <X size={16} color={colors.error} />
        </GlassView>
      </Pressable>
      <View style={styles.successRow}>
        <CheckCircle size={16} color={colors.success} />
        <Text style={styles.successText}>
          {t('admin.content.editor.imageUpload.success')}
        </Text>
      </View>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    padding: 24,
    position: 'relative',
  },
  image: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  clearButton: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  clearButtonInner: {
    padding: 12,
    borderRadius: borderRadius.xl,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  successText: {
    fontSize: 12,
    color: colors.success,
  },
});

if (process.env.NODE_ENV === 'development') {
  const originalComponent = ImagePreview;
  (ImagePreview as any) = (props: any) => {
    ImagePreviewPropsSchema.parse(props);
    return originalComponent(props);
  };
}

export default ImagePreview;
