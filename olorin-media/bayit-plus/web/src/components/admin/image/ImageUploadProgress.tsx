import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { X, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { GlassView, GlassInput, GlassButton } from '@bayit/shared/ui';
import { colors, borderRadius, spacing } from '@bayit/shared/theme';
import { useDirection } from '@/hooks/useDirection';

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
});

export interface ImageUploadProgressProps {
  allowUrl: boolean;
  isUploading: boolean;
  showUrlInput: boolean;
  urlInput: string;
  error: string | null;
  onShowUrlInput: (show: boolean) => void;
  onUrlInputChange: (value: string) => void;
  onUrlSubmit: () => void | Promise<void>;
  onClearError: () => void;
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
  const { t } = useTranslation();
  const { textAlign } = useDirection();

  return (
    <>
      {allowUrl && (
        <View style={styles.urlSection}>
          {!showUrlInput ? (
            <GlassButton
              title={t('admin.content.editor.imageUpload.orPasteUrl')}
              onPress={() => onShowUrlInput(true)}
              variant="ghost"
              disabled={isUploading}
              fullWidth
            />
          ) : (
            <GlassView style={styles.urlInputContainer} intensity="medium">
              <View style={styles.inputWrapper}>
                <GlassInput
                  value={urlInput}
                  onChangeText={onUrlInputChange}
                  placeholder={t('admin.content.editor.imageUpload.urlPlaceholder')}
                  editable={!isUploading}
                />
              </View>
              <View style={styles.buttonRow}>
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
                    onShowUrlInput(false);
                    onUrlInputChange('');
                    onClearError();
                  }}
                  disabled={isUploading}
                  style={styles.closeButtonWrapper}
                >
                  <GlassView style={styles.closeButton} intensity="high">
                    <X size={20} color={colors.textMuted} />
                  </GlassView>
                </Pressable>
              </View>
            </GlassView>
          )}
        </View>
      )}

      {error && (
        <GlassView
          style={styles.errorContainer}
          intensity="low"
        >
          <AlertCircle size={16} color={colors.error} />
          <Text style={[styles.errorText, { textAlign }]}>
            {error}
          </Text>
        </GlassView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  urlSection: {
    marginTop: 16,
  },
  urlInputContainer: {
    borderRadius: borderRadius.xl,
    padding: 24,
    gap: 16,
  },
  inputWrapper: {
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeButtonWrapper: {
    marginLeft: 8,
  },
  closeButton: {
    padding: 12,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    marginTop: 16,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    backgroundColor: `${colors.error}10`,
    borderColor: `${colors.error}40`,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: colors.error,
  },
});

if (process.env.NODE_ENV === 'development') {
  const originalComponent = ImageUploadProgress;
  (ImageUploadProgress as any) = (props: any) => {
    ImageUploadProgressPropsSchema.parse(props);
    return originalComponent(props);
  };
}

export default ImageUploadProgress;
