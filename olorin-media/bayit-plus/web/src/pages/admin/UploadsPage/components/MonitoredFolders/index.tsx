/**
 * MonitoredFolders Component
 * Complete monitored folders management interface
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { GlassButton, GlassConfirmDialog } from '@bayit/shared/ui';
import { Plus } from 'lucide-react';
import { spacing } from '@olorin/design-tokens';
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
        {folders.map((folder) => (
          <FolderCard
            key={folder._id}
            folder={folder}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onScan={scanFolder}
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

      <GlassConfirmDialog
        visible={showDeleteConfirm}
        title={t('admin.uploads.monitoredFolders.confirmDelete')}
        message={folderToDelete ? `${folderToDelete.name} - ${folderToDelete.path}` : ''}
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setFolderToDelete(null);
        }}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="destructive"
      />
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
});
