/**
 * DropZone Component
 * Drag-and-drop file selection area with click-to-browse fallback
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { useTranslation } from 'react-i18next';
import { validateFiles } from '../../utils/fileValidation';
import { useNotifications } from '@olorin/glass-ui/hooks';
import { ALLOWED_VIDEO_EXTENSIONS, MAX_FILE_SIZE } from '../../constants';
import { formatFileSize } from '../../utils/formatters';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFilesSelected, disabled = false }) => {
  const { t } = useTranslation();
  const notifications = useNotifications();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const { valid, invalid, reasons } = validateFiles(acceptedFiles);

      if (invalid.length > 0) {
        const invalidList = invalid
          .map((file) => `${file.name}: ${reasons[file.name]}`)
          .join('\n');

        notifications.showWarning(
          t('admin.uploads.manualUpload.invalidFiles', {
            count: invalid.length,
            defaultValue: `${invalid.length} file(s) rejected`,
          }) + `\n\n${invalidList}`
        );
      }

      if (valid.length > 0) {
        onFilesSelected(valid);
      }
    },
    [onFilesSelected, notifications, t]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    accept: {
      'video/*': ALLOWED_VIDEO_EXTENSIONS,
    },
    maxSize: MAX_FILE_SIZE,
  });

  return (
    <Pressable
      {...getRootProps()}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={t('admin.uploads.manualUpload.dragOrClick')}
      accessibilityHint={isDragActive ? t('admin.uploads.manualUpload.dropFiles') : undefined}
    >
      <View
        style={[
          styles.dropZone,
          isDragActive && styles.dropZoneActive,
          disabled && styles.dropZoneDisabled,
        ]}
      >
        <input {...getInputProps()} />
        <Upload
          size={48}
          color={isDragActive ? colors.primary.DEFAULT : colors.glass.borderLight}
          aria-hidden="true"
        />
        <Text style={styles.title}>
          {isDragActive
            ? t('admin.uploads.manualUpload.dropFiles')
            : t('admin.uploads.manualUpload.dragOrClick')}
        </Text>
        <Text style={styles.subtitle}>
          {t('admin.uploads.manualUpload.acceptedFormats')}: {ALLOWED_VIDEO_EXTENSIONS.join(', ')}
        </Text>
        <Text style={styles.subtitle}>
          {t('admin.uploads.manualUpload.maxSize')}: {formatFileSize(MAX_FILE_SIZE)}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  dropZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.glass.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.glass.bg,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    minHeight: 200,
  },
  dropZoneActive: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.DEFAULT + '1A', // 10% opacity
  },
  dropZoneDisabled: {
    opacity: 0.5,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
