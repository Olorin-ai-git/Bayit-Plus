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
        title={t('admin.uploads.manualUpload.uploadFiles')}
        onPress={onUpload}
        variant="primary"
        disabled={!hasFiles || isUploading}
        loading={isUploading}
        icon={<Upload size={18} />}
        iconPosition="left"
      />

      <GlassButton
        title={t('admin.uploads.manualUpload.clearFiles')}
        onPress={onClear}
        variant="secondary"
        disabled={!hasFiles || isUploading}
        icon={<Trash2 size={18} />}
        iconPosition="left"
      />
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
