/**
 * UploadModeToggle Component
 * Toggle between individual files and folder upload modes
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { File, Folder } from 'lucide-react';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import { useTranslation } from 'react-i18next';
import type { UploadMode } from '../../types/folderTypes';

interface UploadModeToggleProps {
  mode: UploadMode;
  onChange: (mode: UploadMode) => void;
  disabled?: boolean;
}

export const UploadModeToggle: React.FC<UploadModeToggleProps> = ({
  mode,
  onChange,
  disabled = false,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('admin.uploads.manualUpload.uploadMode')}</Text>
      <View style={styles.toggleContainer}>
        <Pressable
          style={[
            styles.toggleButton,
            mode === 'files' && styles.activeButton,
            disabled && styles.disabledButton,
          ]}
          onPress={() => !disabled && onChange('files')}
          disabled={disabled}
        >
          <File
            size={16}
            color={mode === 'files' ? colors.buttonText : colors.text}
          />
          <Text
            style={[
              styles.buttonText,
              mode === 'files' && styles.activeButtonText,
            ]}
          >
            {t('admin.uploads.manualUpload.filesMode')}
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.toggleButton,
            mode === 'folder' && styles.activeButton,
            disabled && styles.disabledButton,
          ]}
          onPress={() => !disabled && onChange('folder')}
          disabled={disabled}
        >
          <Folder
            size={16}
            color={mode === 'folder' ? colors.buttonText : colors.text}
          />
          <Text
            style={[
              styles.buttonText,
              mode === 'folder' && styles.activeButtonText,
            ]}
          >
            {t('admin.uploads.manualUpload.folderMode')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.glass.bg,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    backgroundColor: 'transparent',
  },
  activeButton: {
    backgroundColor: colors.primary.DEFAULT,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  activeButtonText: {
    color: colors.buttonText,
    fontWeight: '500',
  },
});
