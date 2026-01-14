/**
 * Admin Uploads Page
 * Manages file uploads and monitored folders
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize } from '@bayit/shared/theme';
import { GlassCard, GlassButton, GlassInput, GlassModal, GlassSelect, GlassToggle } from '@bayit/shared/ui';
import { Plus, Edit2, Trash2, FolderOpen, AlertCircle, X, Folder, Upload, XCircle } from 'lucide-react';
import { useDirection } from '@/hooks/useDirection';
import { useModal } from '@/contexts/ModalContext';
import { adminButtonStyles } from '@/styles/adminButtonStyles';
import * as uploadsService from '@/services/uploadsService';
import GlassQueue from '@/components/admin/GlassQueue';
import type { QueueJob, QueueStats } from '@/components/admin/GlassQueue';
import logger from '@/utils/logger';

// Get API base URL for WebSocket connection
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Import types from service
type UploadJob = uploadsService.UploadJob;
type MonitoredFolder = uploadsService.MonitoredFolder;

const UploadsPage: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL, flexDirection, textAlign } = useDirection();
  const { showConfirm } = useModal();
  
  const [loading, setLoading] = useState(true);
  const [triggeringUpload, setTriggeringUpload] = useState(false);
  const [clearingQueue, setClearingQueue] = useState(false);
  const [queueStats, setQueueStats] = useState<QueueStats>({
    total_jobs: 0,
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    total_size_bytes: 0,
    uploaded_bytes: 0,
  });
  const [activeJob, setActiveJob] = useState<QueueJob | null>(null);
  const [queuedJobs, setQueuedJobs] = useState<QueueJob[]>([]);
  const [recentCompleted, setRecentCompleted] = useState<QueueJob[]>([]);
  const [queuePaused, setQueuePaused] = useState(false);
  const [pauseReason, setPauseReason] = useState<string | null>(null);
  const [monitoredFolders, setMonitoredFolders] = useState<MonitoredFolder[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // WebSocket ref for real-time updates
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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
      
      // Fetch upload queue
      try {
        const queueData = await uploadsService.getUploadQueue();
        setQueueStats(queueData.stats || queueStats);
        setActiveJob(queueData.active_job || null);
        setQueuedJobs(queueData.queue || []);
        setRecentCompleted(queueData.recent_completed || []);
        setQueuePaused(queueData.queue_paused || false);
        setPauseReason(queueData.pause_reason || null);
      } catch (err) {
        logger.error('Failed to fetch upload queue', 'UploadsPage', err);
        // Don't fail the entire page if queue fetch fails
      }
      
      // Fetch monitored folders
      try {
        const folders = await uploadsService.getMonitoredFolders();
        setMonitoredFolders(folders || []);
      } catch (err) {
        logger.error('Failed to fetch monitored folders', 'UploadsPage', err);
        // Don't fail the entire page if folders fetch fails
      }
      
    } catch (err) {
      logger.error('Error fetching upload data', 'UploadsPage', err);
      setError(err instanceof Error ? err.message : 'Failed to load upload data');
    } finally {
      setLoading(false);
    }
  }, [queueStats]);

  // WebSocket connection for real-time updates
  const connectWebSocket = useCallback(() => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        logger.warn('No auth token found, skipping WebSocket connection', 'UploadsPage');
        return;
      }

      // Close existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }

      // Determine WebSocket protocol based on API URL
      const wsProtocol = API_BASE_URL.startsWith('https') || window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsHost = window.location.host; // Use current host for WebSocket
      const wsUrl = `${wsProtocol}://${wsHost}/api/v1/admin/uploads/ws?token=${token}`;

      logger.info('Connecting to uploads WebSocket', 'UploadsPage', { url: wsUrl.replace(token, '***') });

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        logger.info('✅ Uploads WebSocket connected', 'UploadsPage');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          logger.debug('[WebSocket] Received queue update', 'UploadsPage', data);

          if (data.type === 'queue_update') {
            // Update state with real-time data
            if (data.stats) setQueueStats(data.stats);
            if (data.active_job !== undefined) setActiveJob(data.active_job);
            if (data.queue) setQueuedJobs(data.queue);
            if (data.recent_completed) setRecentCompleted(data.recent_completed);
            if (data.queue_paused !== undefined) setQueuePaused(data.queue_paused);
            if (data.pause_reason !== undefined) setPauseReason(data.pause_reason);
          }
        } catch (err) {
          logger.error('[WebSocket] Failed to parse message', 'UploadsPage', err);
        }
      };

      ws.onerror = (error) => {
        logger.error('[WebSocket] Connection error', 'UploadsPage', error);
      };

      ws.onclose = () => {
        logger.warn('[WebSocket] Connection closed, reconnecting in 5s', 'UploadsPage');
        wsRef.current = null;
        
        // Reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
      };

      wsRef.current = ws;
    } catch (err) {
      logger.error('[WebSocket] Failed to connect', 'UploadsPage', err);
    }
  }, []);

  // Handle resume queue
  const handleResumeQueue = async () => {
    try {
      await uploadsService.resumeUploadQueue();
      logger.info('✅ Upload queue resumed', 'UploadsPage');
      
      // Refresh data
      await fetchData();
    } catch (err) {
      logger.error('Failed to resume queue', 'UploadsPage', err);
      setError(err instanceof Error ? err.message : 'Failed to resume queue');
    }
  };

  // Handle clear queue
  const handleClearQueue = async () => {
    const hasActiveJobs = queueStats.queued > 0 || queueStats.processing > 0;
    
    if (!hasActiveJobs) {
      logger.info('No active jobs to clear', 'UploadsPage');
      return;
    }

    const confirmed = await showConfirm({
      title: t('admin.uploads.clearQueueConfirmTitle'),
      message: t('admin.uploads.clearQueueConfirmMessage', { 
        count: queueStats.queued + queueStats.processing 
      }),
      confirmText: t('admin.uploads.clearQueue'),
      cancelText: t('common.cancel'),
    });

    if (!confirmed) return;

    try {
      setClearingQueue(true);
      setError(null);
      
      const result = await uploadsService.clearUploadQueue();
      logger.info('✅ Upload queue cleared', 'UploadsPage', result);
      
      // Refresh data
      await fetchData();
    } catch (err: any) {
      logger.error('Failed to clear queue', 'UploadsPage', err);
      const errorMessage = err?.detail || err?.message || t('admin.uploads.clearQueueFailed');
      setError(errorMessage);
    } finally {
      setClearingQueue(false);
    }
  };

  useEffect(() => {
    // Initial data fetch
    fetchData();
    
    // Connect to WebSocket for real-time updates
    connectWebSocket();
    
    // Cleanup
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [fetchData, connectWebSocket]);

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
      // Validate required fields
      if (!folderForm.path.trim()) {
        setError(t('admin.uploads.errors.pathRequired'));
        return;
      }
      
      if (editingFolder) {
        // Update existing folder via API
        logger.info('Updating folder', 'UploadsPage', { 
          id: editingFolder.id, 
          updates: folderForm 
        });
        const updated = await uploadsService.updateMonitoredFolder(editingFolder.id, folderForm);
        logger.info('✅ Folder updated successfully', 'UploadsPage', { 
          id: editingFolder.id,
          result: updated 
        });
      } else {
        // Add new folder via API
        await uploadsService.addMonitoredFolder(folderForm);
        logger.info('Added monitored folder', 'UploadsPage', { path: folderForm.path });
      }
      
      // Close modal
      setShowFolderModal(false);
      setEditingFolder(null);
      
      // Clear error and refresh data immediately
      setError(null);
      await fetchData();
      
    } catch (err: any) {
      logger.error('Error saving folder', 'UploadsPage', err);
      // Extract error message from API response
      const errorMessage = err?.detail || err?.message || 'Failed to save folder';
      setError(errorMessage);
    }
  };

  const handleDeleteFolder = (folder: MonitoredFolder) => {
    showConfirm(
      t('admin.uploads.confirmDelete', `Delete folder "${folder.name || folder.path}"?`),
      async () => {
        try {
          // Delete via API
          await uploadsService.deleteMonitoredFolder(folder.id);
          logger.info('Deleted monitored folder', 'UploadsPage', { id: folder.id });
          
          // Clear error and refresh data
          setError(null);
          await fetchData();
          
        } catch (err) {
          logger.error('Error deleting folder', 'UploadsPage', err);
          setError(err instanceof Error ? err.message : 'Failed to delete folder');
        }
      },
      { destructive: true, confirmText: t('common.delete') }
    );
  };

  const handleTriggerUpload = async () => {
    try {
      setTriggeringUpload(true);
      setError(null);
      
      const result = await uploadsService.triggerUploadScan();
      logger.info('Triggered upload scan', 'UploadsPage', result);
      
      // Show success message
      if (result.files_found > 0) {
        logger.info(t('admin.uploads.triggerUploadSuccess', { files_found: result.files_found }), 'UploadsPage');
      } else {
        logger.info('No new files found to upload', 'UploadsPage');
      }
      
      // Refresh data immediately to show new jobs
      await fetchData();
      
    } catch (err: any) {
      logger.error('Error triggering upload', 'UploadsPage', err);
      const errorMessage = err?.detail || err?.message || t('admin.uploads.triggerUploadFailed');
      setError(errorMessage);
    } finally {
      setTriggeringUpload(false);
    }
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
            title={triggeringUpload ? t('common.loading') : t('admin.uploads.triggerUpload')}
            variant="secondary"
            icon={triggeringUpload ? null : <Upload size={18} color={colors.primary} />}
            onPress={handleTriggerUpload}
            disabled={triggeringUpload}
            style={[adminButtonStyles.secondaryButton, triggeringUpload && { opacity: 0.7 }]}
            textStyle={adminButtonStyles.buttonText}
          >
            {triggeringUpload && (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: spacing.sm }} />
            )}
          </GlassButton>
          <GlassButton
            title={clearingQueue ? t('common.loading') : t('admin.uploads.clearQueue')}
            variant="destructive"
            icon={clearingQueue ? null : <XCircle size={18} color={colors.error} />}
            onPress={handleClearQueue}
            disabled={clearingQueue || (queueStats.queued === 0 && queueStats.processing === 0)}
            style={[adminButtonStyles.secondaryButton, clearingQueue && { opacity: 0.7 }]}
            textStyle={adminButtonStyles.buttonText}
          >
            {clearingQueue && (
              <ActivityIndicator size="small" color={colors.error} style={{ marginRight: spacing.sm }} />
            )}
          </GlassButton>
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

      {/* Real-time Upload Queue */}
      <GlassQueue
        stats={queueStats}
        activeJob={activeJob}
        queue={queuedJobs}
        recentCompleted={recentCompleted}
        queuePaused={queuePaused}
        pauseReason={pauseReason}
        loading={false}
        onResumeQueue={handleResumeQueue}
      />

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
                  {t('admin.uploads.type')}: {t(`admin.uploads.contentTypes.${folder.content_type}`, folder.content_type)}
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
              editable={!editingFolder} // Path is read-only when editing
            />
            <Text style={styles.helpText}>
              {editingFolder 
                ? t('admin.uploads.form.pathReadOnly', 'Path cannot be changed after creation') 
                : t('admin.uploads.form.pathHelp')}
            </Text>
          </View>

          <View style={styles.formGroup}>
            <GlassSelect
              label={t('admin.uploads.form.contentType')}
              value={folderForm.content_type}
              onChange={(content_type) => setFolderForm((prev) => ({ ...prev, content_type }))}
              options={[
                { value: 'movie', label: t('admin.uploads.contentTypes.movie') },
                { value: 'series', label: t('admin.uploads.contentTypes.series') },
                { value: 'audiobook', label: t('admin.uploads.contentTypes.audiobook') },
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

          {error && (
            <View style={styles.modalError}>
              <Text style={styles.modalErrorText}>{error}</Text>
            </View>
          )}

          <View style={[styles.modalActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <GlassButton
              title={t('common.cancel')}
              variant="secondary"
              onPress={() => {
                setShowFolderModal(false);
                setError(null); // Clear error when closing
              }}
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
  helpText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
    lineHeight: 16,
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
  modalError: {
    padding: spacing.md,
    backgroundColor: colors.error + '20',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.error + '40',
    marginTop: spacing.md,
  },
  modalErrorText: {
    color: colors.error,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});

export default UploadsPage;
