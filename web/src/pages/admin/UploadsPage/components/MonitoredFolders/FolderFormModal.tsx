/**
 * FolderFormModal Component
 * Add/edit monitored folder modal form
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassModal, GlassButton, GlassInput, GlassToggle } from '@bayit/shared/ui';
import { spacing, fontSize, colors } from '@olorin/design-tokens';
import { useTranslation } from 'react-i18next';
import type { MonitoredFolder, FolderFormData, ContentType } from '../../types';
import { ContentTypeSelector } from '../ManualUpload/ContentTypeSelector';

interface FolderFormModalProps {
  visible: boolean;
  folder?: MonitoredFolder | null;
  onSave: (data: FolderFormData) => Promise<boolean>;
  onClose: () => void;
  saving: boolean;
}

export const FolderFormModal: React.FC<FolderFormModalProps> = ({
  visible,
  folder,
  onSave,
  onClose,
  saving,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<FolderFormData>({
    name: '',
    path: '',
    content_type: 'movie',
    enabled: true,
    auto_upload: true,
  });

  useEffect(() => {
    if (folder) {
      setFormData({
        name: folder.name,
        path: folder.path,
        content_type: folder.content_type,
        enabled: folder.enabled,
        auto_upload: folder.auto_upload,
      });
    } else {
      setFormData({
        name: '',
        path: '',
        content_type: 'movie',
        enabled: true,
        auto_upload: true,
      });
    }
  }, [folder, visible]);

  const handleSave = async () => {
    const success = await onSave(formData);
    if (success) {
      onClose();
    }
  };

  return (
    <GlassModal
      visible={visible}
      onClose={onClose}
      title={folder ? t('admin.uploads.monitoredFolders.editFolder') : t('admin.uploads.monitoredFolders.addFolder')}
    >
      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>{t('admin.uploads.monitoredFolders.folderName')}</Text>
          <GlassInput
            value={formData.name}
            onChangeText={(name) => setFormData({ ...formData, name })}
            placeholder="e.g., Movies Import"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('admin.uploads.monitoredFolders.folderPath')}</Text>
          <GlassInput
            value={formData.path}
            onChangeText={(path) => setFormData({ ...formData, path })}
            placeholder="/path/to/folder"
          />
        </View>

        <ContentTypeSelector
          value={formData.content_type}
          onChange={(content_type) => setFormData({ ...formData, content_type })}
        />

        <View style={styles.toggleRow}>
          <Text style={styles.label}>{t('admin.uploads.monitoredFolders.enabled')}</Text>
          <GlassToggle
            value={formData.enabled}
            onValueChange={(enabled) => setFormData({ ...formData, enabled })}
          />
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.label}>{t('admin.uploads.monitoredFolders.autoUpload')}</Text>
          <GlassToggle
            value={formData.auto_upload}
            onValueChange={(auto_upload) => setFormData({ ...formData, auto_upload })}
          />
        </View>

        <View style={styles.actions}>
          <GlassButton onPress={onClose} variant="secondary" disabled={saving}>
            {t('common.cancel')}
          </GlassButton>
          <GlassButton onPress={handleSave} variant="primary" loading={saving}>
            {t('common.save')}
          </GlassButton>
        </View>
      </View>
    </GlassModal>
  );
};

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.md,
  },
});
