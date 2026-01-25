/**
 * MonitoredFolders Component
 * Complete monitored folders management interface
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { GlassButton, GlassModal, GlassCard } from '@bayit/shared/ui';
import { Plus, AlertTriangle } from 'lucide-react';
import { spacing, colors, fontSize } from '@olorin/design-tokens';
import { useTranslation } from 'react-i18next';
import { useMonitoredFolders } from '../../hooks/useMonitoredFolders';
import { FolderCard } from './FolderCard';
import { FolderFormModal } from './FolderFormModal';
import type { MonitoredFolder, FolderFormData } from '../../types';

export const MonitoredFolders: React.FC = () => {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<MonitoredFolder | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<MonitoredFolder | null>(null);

  const { folders, actionInProgress, addFolder, updateFolder, deleteFolder, scanFolder } =
    useMonitoredFolders();

  const handleAdd = () => {
    setEditingFolder(null);
    setShowModal(true);
  };

  const handleEdit = (folder: MonitoredFolder) => {
    setEditingFolder(folder);
    setShowModal(true);
  };

  const handleSave = async (data: FolderFormData) => {
    if (editingFolder) {
      return await updateFolder(editingFolder._id, data);
    } else {
      return await addFolder(data);
    }
  };

  const handleDelete = (folder: MonitoredFolder) => {
    setFolderToDelete(folder);
    setShowDeleteConfirm(true);
  };

  const handleScan = (folder: MonitoredFolder) => {
    scanFolder(folder._id);
  };

  const confirmDelete = async () => {
    if (folderToDelete) {
      await deleteFolder(folderToDelete._id);
    }
    setShowDeleteConfirm(false);
    setFolderToDelete(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <GlassButton onPress={handleAdd} variant="primary" leftIcon={<Plus size={18} />}>
          {t('admin.uploads.monitoredFolders.addFolder')}
        </GlassButton>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {folders.map((folder, index) => (
          <FolderCard
            key={folder._id || `folder-${index}`}
            folder={folder}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onScan={handleScan}
            actionInProgress={actionInProgress}
          />
        ))}
      </ScrollView>

      <FolderFormModal
        visible={showModal}
        folder={editingFolder}
        onSave={handleSave}
        onClose={() => setShowModal(false)}
        saving={actionInProgress}
      />

      <GlassModal
        visible={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setFolderToDelete(null);
        }}
        title={t('admin.uploads.monitoredFolders.confirmDelete')}
      >
        <GlassCard style={styles.confirmDialog}>
          <View style={styles.confirmIcon}>
            <AlertTriangle size={48} color={colors.error} />
          </View>
          <Text style={styles.confirmMessage}>
            {folderToDelete ? `${folderToDelete.name} - ${folderToDelete.path}` : ''}
          </Text>
          <View style={styles.confirmActions}>
            <GlassButton
              onPress={() => {
                setShowDeleteConfirm(false);
                setFolderToDelete(null);
              }}
              variant="secondary"
              style={styles.confirmButton}
            >
              {t('common.cancel')}
            </GlassButton>
            <GlassButton
              onPress={confirmDelete}
              variant="primary"
              style={[styles.confirmButton, styles.deleteButton]}
            >
              {t('common.delete')}
            </GlassButton>
          </View>
        </GlassCard>
      </GlassModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    flex: 1,
  },
  header: {
    alignItems: 'flex-start',
  },
  list: {
    gap: spacing.md,
  },
  confirmDialog: {
    padding: spacing.xl,
    gap: spacing.lg,
    alignItems: 'center',
  },
  confirmIcon: {
    marginBottom: spacing.md,
  },
  confirmMessage: {
    fontSize: fontSize.md,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  confirmButton: {
    flex: 1,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
});
