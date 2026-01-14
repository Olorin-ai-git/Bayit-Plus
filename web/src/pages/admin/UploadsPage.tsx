/**
 * Admin Uploads Page
 * Manages file uploads and monitored folders
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize } from '@bayit/shared/theme';
import { GlassCard, GlassButton, GlassInput, GlassModal, GlassSelect, GlassToggle } from '@bayit/shared/ui';
import { Plus, Edit2, Trash2, FolderOpen, AlertCircle, X } from 'lucide-react';
import { useDirection } from '@/hooks/useDirection';
import { useModal } from '@/contexts/ModalContext';
import { adminButtonStyles } from '@/styles/adminButtonStyles';

// Types
interface UploadJob {
  id: string;
  filename: string;
  type: string;
  status: 'queued' | 'processing' | 'uploading' | 'completed' | 'failed';
  progress: number;
  eta_seconds?: number;
  error_message?: string;
  created_at: string;
}

interface MonitoredFolder {
  id: string;
  name?: string;
  path: string;
  enabled: boolean;
  content_type: string;
  auto_upload: boolean;
  last_scanned?: string;
}

const UploadsPage: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL, flexDirection, textAlign } = useDirection();
  const { showConfirm } = useModal();
  
  const [loading, setLoading] = useState(true);
  const [activeJobs, setActiveJobs] = useState<UploadJob[]>([]);
  const [queuedJobs, setQueuedJobs] = useState<UploadJob[]>([]);
  const [monitoredFolders, setMonitoredFolders] = useState<MonitoredFolder[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<MonitoredFolder | null>(null);
  const [folderForm, setFolderForm] = useState({
    name: '',
    path: '',
    content_type: 'movie',
    enabled: true,
    auto_upload: true,
  });

  // Format ETA
  const formatETA = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  // Fetch upload data
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      
      // Note: These endpoints need authentication
      // For now, we'll show placeholder data
      
      // TODO: Implement actual API calls once authentication is working
      // const response = await fetch('/api/v1/admin/uploads/queue');
      // const data = await response.json();
      
      setActiveJobs([]);
      setQueuedJobs([]);
      setMonitoredFolders([]);
      
    } catch (err) {
      console.error('Error fetching upload data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load upload data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleAddFolder = () => {
    setEditingFolder(null);
    setFolderForm({
      name: '',
      path: '',
      content_type: 'movie',
      enabled: true,
      auto_upload: true,
    });
    setShowFolderModal(true);
  };

  const handleEditFolder = (folder: MonitoredFolder) => {
    setEditingFolder(folder);
    setFolderForm({
      name: folder.name || '',
      path: folder.path,
      content_type: folder.content_type,
      enabled: folder.enabled,
      auto_upload: folder.auto_upload,
    });
    setShowFolderModal(true);
  };

  const handleSaveFolder = async () => {
    try {
      // TODO: Implement API call
      console.log('Saving folder:', folderForm);
      
      // Close modal
      setShowFolderModal(false);
      setEditingFolder(null);
      
      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Error saving folder:', err);
      setError(err instanceof Error ? err.message : 'Failed to save folder');
    }
  };

  const handleDeleteFolder = (folder: MonitoredFolder) => {
    showConfirm(
      t('admin.uploads.confirmDelete', `Delete folder "${folder.name || folder.path}"?`),
      async () => {
        try {
          // TODO: Implement API call
          console.log('Deleting folder:', folder);
          
          // Refresh data
          await fetchData();
        } catch (err) {
          console.error('Error deleting folder:', err);
          setError(err instanceof Error ? err.message : 'Failed to delete folder');
        }
      },
      { destructive: true, confirmText: t('common.delete') }
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={[styles.header, { flexDirection }]}>
        <View>
          <Text style={[styles.pageTitle, { textAlign }]}>{t('admin.nav.uploads')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>
            {t('admin.uploads.systemInfoText')}
          </Text>
        </View>
        <View style={[styles.actionButtons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <GlassButton
            title={t('admin.uploads.addFolder')}
            variant="secondary"
            icon={<Plus size={18} color={colors.text} />}
            onPress={handleAddFolder}
            style={adminButtonStyles.primaryButton}
            textStyle={adminButtonStyles.buttonText}
          />
        </View>
      </View>

      {/* Error Message */}
      {error && (
        <View style={[styles.errorContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <AlertCircle size={18} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => setError(null)}>
            <X size={18} color={colors.error} />
          </Pressable>
        </View>
      )}

      {/* Active Uploads */}
      <GlassCard style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('admin.uploads.activeUploads')}
        </Text>
        {activeJobs.length === 0 ? (
          <Text style={[styles.emptyText, { textAlign }]}>
            {t('admin.uploads.noActiveUploads')}
          </Text>
        ) : (
          activeJobs.map((job) => (
            <View key={job.id} style={styles.uploadItem}>
              <Text style={[styles.uploadFilename, { textAlign }]}>{job.filename}</Text>
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${job.progress}%` }]} />
              </View>
              <View style={[styles.uploadMeta, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.uploadStatus}>
                  {job.status} - {job.progress.toFixed(1)}%
                </Text>
                {job.eta_seconds && (
                  <Text style={styles.uploadEta}>
                    ETA: {formatETA(job.eta_seconds)}
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
      </GlassCard>

      {/* Queued Uploads */}
      {queuedJobs.length > 0 && (
        <GlassCard style={styles.section}>
          <Text style={[styles.sectionTitle, { textAlign }]}>
            {t('admin.uploads.queuedUploads')} ({queuedJobs.length})
          </Text>
          {queuedJobs.slice(0, 5).map((job) => (
            <View key={job.id} style={styles.queuedItem}>
              <Text style={[styles.uploadFilename, { textAlign }]}>{job.filename}</Text>
              <Text style={[styles.queuedTime, { textAlign }]}>
                {t('admin.uploads.queued')} - {formatDate(job.created_at)}
              </Text>
            </View>
          ))}
          {queuedJobs.length > 5 && (
            <Text style={[styles.moreText, { textAlign }]}>
              {t('admin.uploads.andMore', { count: queuedJobs.length - 5 })}
            </Text>
          )}
        </GlassCard>
      )}

      {/* Monitored Folders */}
      <GlassCard style={styles.section}>
        <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.sectionTitle, { textAlign, flex: 1 }]}>
            {t('admin.uploads.monitoredFolders')}
          </Text>
        </View>
        
        {monitoredFolders.length === 0 ? (
          <View style={styles.emptyState}>
            <FolderOpen size={48} color={colors.textMuted} style={styles.emptyIcon} />
            <Text style={[styles.emptyText, { textAlign }]}>
              {t('admin.uploads.noMonitoredFolders')}
            </Text>
            <Text style={[styles.helpText, { textAlign }]}>
              {t('admin.uploads.configureFoldersHelp')}
            </Text>
          </View>
        ) : (
          monitoredFolders.map((folder) => (
            <View key={folder.id} style={styles.folderItem}>
              <View style={[styles.folderHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.folderName, { textAlign }]}>
                    {folder.name || folder.path}
                  </Text>
                  <Text style={[styles.folderPath, { textAlign }]}>{folder.path}</Text>
                </View>
                <View style={[styles.folderActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[
                    styles.folderStatus,
                    { backgroundColor: folder.enabled ? colors.success + '30' : colors.textMuted + '30' }
                  ]}>
                    {folder.enabled ? t('common.enabled') : t('common.disabled')}
                  </Text>
                  <GlassButton
                    title=""
                    variant="ghost"
                    icon={<Edit2 size={16} color={colors.textSecondary} />}
                    onPress={() => handleEditFolder(folder)}
                    style={styles.iconButton}
                  />
                  <GlassButton
                    title=""
                    variant="ghost"
                    icon={<Trash2 size={16} color={colors.error} />}
                    onPress={() => handleDeleteFolder(folder)}
                    style={styles.iconButton}
                  />
                </View>
              </View>
              <View style={[styles.folderMeta, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.folderMetaText}>
                  {t('admin.uploads.type')}: {folder.content_type}
                </Text>
                {folder.last_scanned && (
                  <Text style={styles.folderMetaText}>
                    {t('admin.uploads.lastScan')}: {formatDate(folder.last_scanned)}
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
      </GlassCard>

      {/* Add/Edit Folder Modal */}
      <GlassModal
        visible={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        title={editingFolder ? t('admin.uploads.editFolder') : t('admin.uploads.addFolder')}
      >
        <View style={styles.modalContent}>
          <View style={styles.formGroup}>
            <GlassInput
              label={t('admin.uploads.form.name')}
              value={folderForm.name}
              onChangeText={(name) => setFolderForm((prev) => ({ ...prev, name }))}
              placeholder={t('admin.uploads.form.namePlaceholder')}
              containerStyle={styles.inputContainer}
            />
          </View>

          <View style={styles.formGroup}>
            <GlassInput
              label={t('admin.uploads.form.path')}
              value={folderForm.path}
              onChangeText={(path) => setFolderForm((prev) => ({ ...prev, path }))}
              placeholder="/path/to/folder"
              containerStyle={styles.inputContainer}
            />
          </View>

          <View style={styles.formGroup}>
            <GlassSelect
              label={t('admin.uploads.form.contentType')}
              value={folderForm.content_type}
              onChange={(content_type) => setFolderForm((prev) => ({ ...prev, content_type }))}
              options={[
                { value: 'movie', label: t('admin.uploads.contentTypes.movie') },
                { value: 'podcast', label: t('admin.uploads.contentTypes.podcast') },
                { value: 'image', label: t('admin.uploads.contentTypes.image') },
              ]}
            />
          </View>

          <View style={[styles.formGroup, styles.toggleGroup]}>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{t('admin.uploads.form.enabled')}</Text>
              <GlassToggle
                value={folderForm.enabled}
                onValueChange={(enabled) => setFolderForm((prev) => ({ ...prev, enabled }))}
              />
            </View>
          </View>

          <View style={[styles.formGroup, styles.toggleGroup]}>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{t('admin.uploads.form.autoUpload')}</Text>
              <GlassToggle
                value={folderForm.auto_upload}
                onValueChange={(auto_upload) => setFolderForm((prev) => ({ ...prev, auto_upload }))}
              />
            </View>
          </View>

          <View style={[styles.modalActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <GlassButton
              title={t('common.cancel')}
              variant="secondary"
              onPress={() => setShowFolderModal(false)}
              style={adminButtonStyles.cancelButton}
              textStyle={adminButtonStyles.buttonText}
            />
            <GlassButton
              title={t('common.save')}
              variant="secondary"
              onPress={handleSaveFolder}
              style={adminButtonStyles.successButton}
              textStyle={adminButtonStyles.buttonText}
            />
          </View>
        </View>
      </GlassModal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.lg,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
    maxWidth: 600,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.error + '20',
    borderWidth: 1,
    borderColor: colors.error + '40',
    marginBottom: spacing.lg,
  },
  errorText: {
    flex: 1,
    color: colors.error,
    fontSize: 14,
  },
  section: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyIcon: {
    marginBottom: spacing.lg,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  helpText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 400,
  },
  uploadItem: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  uploadFilename: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  progressContainer: {
    height: 8,
    backgroundColor: colors.glassBorder,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  uploadMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  uploadStatus: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  uploadEta: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  queuedItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.sm,
  },
  queuedTime: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  moreText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  folderItem: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  folderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  folderName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  folderPath: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  folderActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  folderStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.text,
  },
  iconButton: {
    minWidth: 32,
    height: 32,
    padding: spacing.xs,
  },
  folderMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  folderMetaText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  modalContent: {
    padding: spacing.md,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  inputContainer: {
    marginBottom: 0,
  },
  toggleGroup: {
    marginBottom: spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  toggleLabel: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
});

export default UploadsPage;
