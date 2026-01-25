/**
 * UploadActions Component
 * Action buttons for uploading and clearing files
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GlassButton } from '@bayit/shared/ui';
import { Upload, Trash2 } from 'lucide-react';
import { spacing } from '@olorin/design-tokens';
import { useTranslation } from 'react-i18next';

interface UploadActionsProps {
  onUpload: () => void;
  onClear: () => void;
  isUploading: boolean;
  hasFiles: boolean;
}

export const UploadActions: React.FC<UploadActionsProps> = ({
  onUpload,
  onClear,
  isUploading,
  hasFiles,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <GlassButton
        onPress={onUpload}
        variant="primary"
        disabled={!hasFiles || isUploading}
        loading={isUploading}
        leftIcon={<Upload size={18} />}
      >
        {t('admin.uploads.manualUpload.uploadFiles')}
      </GlassButton>

      <GlassButton
        onPress={onClear}
        variant="secondary"
        disabled={!hasFiles || isUploading}
        leftIcon={<Trash2 size={18} />}
      >
        {t('admin.uploads.manualUpload.clearFiles')}
      </GlassButton>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'flex-end',
  },
});
