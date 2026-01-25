/**
 * Admin Uploads Page - Complete Rebuild
 * Multi-stage file upload system with monitored folders and queue management
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import {
  GlassCard,
  GlassButton,
  GlassInput,
  GlassModal,
  GlassSelect,
  GlassToggle,
  GlassPageHeader,
  GlassBadge,
} from '@bayit/shared/ui';
import { GlassDraggableExpander } from '../../../../shared/components/ui/GlassDraggableExpander';
import {
  Upload,
  FolderOpen,
  File,
  X,
  XCircle,
  CheckCircle,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Play,
  Folder,
} from 'lucide-react';
import { useDirection } from '@/hooks/useDirection';
import { useNotifications } from '@olorin/glass-ui/hooks';
import { adminButtonStyles } from '@olorin/design-tokens';
import { ADMIN_PAGE_CONFIG } from '../../../../shared/utils/adminConstants';
import * as uploadsService from '@/services/uploadsService';
import GlassQueue from '@/components/admin/GlassQueue';
import type { QueueJob, QueueStats } from '@/components/admin/GlassQueue';
import logger from '@/utils/logger';

// ========================================
// TYPES & CONSTANTS
// ========================================

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

type MonitoredFolder = uploadsService.MonitoredFolder;

const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v', '.wmv'];
const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB

// ========================================
// MAIN COMPONENT
// ========================================

const UploadsPage: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const notifications = useNotifications();

  // ========================================
  // STATE - Queue & WebSocket
  // ========================================

  const [loading, setLoading] = useState(true);
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

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ========================================
  // STATE - Monitored Folders
  // ========================================

  const [monitoredFolders, setMonitoredFolders] = useState<MonitoredFolder[]>([]);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<MonitoredFolder | null>(null);
  const [folderForm, setFolderForm] = useState({
    name: '',
    path: '',
    content_type: 'movie',
    enabled: true,
    auto_upload: true,
  });

  // ========================================
  // STATE - Manual Upload (Multi-Stage)
  // ========================================

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [manualContentType, setManualContentType] = useState<string>('movie');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: number]: number }>({});
  const [uploadResult, setUploadResult] = useState<{ successful: number; failed: number } | null>(
    null
  );

  // ========================================
  // STATE - UI
  // ========================================

  const [triggeringUpload, setTriggeringUpload] = useState(false);
  const [clearingQueue, setClearingQueue] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ========================================
  // UTILITY FUNCTIONS
  // ========================================

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const validateFile = (file: File): boolean => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    return ALLOWED_VIDEO_EXTENSIONS.includes(ext) && file.size <= MAX_FILE_SIZE;
  };

  // ========================================
  // DATA FETCHING
  // ========================================

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
      }

      // Fetch monitored folders
      try {
        const folders = await uploadsService.getMonitoredFolders();
        setMonitoredFolders(folders || []);
      } catch (err) {
        logger.error('Failed to fetch monitored folders', 'UploadsPage', err);
      }
    } catch (err) {
      logger.error('Error fetching upload data', 'UploadsPage', err);
      setError(err instanceof Error ? err.message : t('admin.uploads.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // ========================================
  // WEBSOCKET CONNECTION
  // ========================================

  const connectWebSocket = useCallback(() => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        logger.warn('No auth token found, skipping WebSocket connection', 'UploadsPage');
        return;
      }

      if (wsRef.current) {
        wsRef.current.close();
      }

      const wsProtocol =
        API_BASE_URL.startsWith('https') || window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsHost = window.location.host;
      const wsUrl = `${wsProtocol}://${wsHost}/api/v1/admin/uploads/ws?token=${token}`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => logger.info('✅ Uploads WebSocket connected', 'UploadsPage');

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'queue_update') {
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

      ws.onerror = (error) => logger.error('[WebSocket] Connection error', 'UploadsPage', error);

      ws.onclose = () => {
        logger.warn('[WebSocket] Connection closed, reconnecting in 5s', 'UploadsPage');
        wsRef.current = null;
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
      };

      wsRef.current = ws;
    } catch (err) {
      logger.error('[WebSocket] Failed to connect', 'UploadsPage', err);
    }
  }, []);

  // ========================================
  // MANUAL UPLOAD - DROPZONE HANDLERS
  // ========================================

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const validFiles = acceptedFiles.filter(validateFile);
      const invalidCount = acceptedFiles.length - validFiles.length;

      if (invalidCount > 0) {
        notifications.showWarning(
          t('admin.uploads.manualUpload.invalidFiles', {
            count: invalidCount,
            defaultValue: `${invalidCount} file(s) rejected - invalid type or too large`,
          }),
          t('admin.uploads.manualUpload.validationFailed')
        );
      }

      setPendingFiles((prev) => {
        const existingNames = new Set(prev.map((f) => f.name));
        const newFiles = validFiles.filter((f) => !existingNames.has(f.name));
        return [...prev, ...newFiles];
      });

      setUploadResult(null);
    },
    [notifications, t]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: false,
    noKeyboard: false,
    multiple: true,
    preventDropOnDocument: true,
    accept: {
      'video/*': ALLOWED_VIDEO_EXTENSIONS,
    },
  });

  const handleRemoveFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadProgress((prev) => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
  };

  const handleClearFiles = () => {
    setPendingFiles([]);
    setUploadProgress({});
    setUploadResult(null);
  };

  const handleUploadFiles = async () => {
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress({});
    setUploadResult(null);
    setError(null);

    try {
      const result = await uploadsService.uploadBrowserFiles(
        pendingFiles,
        manualContentType,
        (fileIndex, progress) => {
          setUploadProgress((prev) => ({ ...prev, [fileIndex]: progress }));
        },
        (fileIndex, job) => {
          logger.info(`File ${fileIndex + 1} uploaded successfully`, 'UploadsPage', {
            job_id: job.job_id,
          });
        }
      );

      setUploadResult({
        successful: result.successful.length,
        failed: result.failed.length,
      });

      if (result.failed.length > 0) {
        const failedNames = result.failed.map((f) => f.file.name).join(', ');
        notifications.showError(
          t('admin.uploads.manualUpload.uploadFailedDetails', {
            files: failedNames,
            defaultValue: `Failed: ${failedNames}`,
          }),
          t('admin.uploads.manualUpload.uploadFailed')
        );
      }

      if (result.successful.length > 0) {
        setPendingFiles(result.failed.map((f) => f.file));
        notifications.showSuccess(
          t('admin.uploads.manualUpload.uploadSuccess', {
            count: result.successful.length,
            defaultValue: `${result.successful.length} file(s) uploaded successfully`,
          }),
          t('common.success')
        );
        await fetchData();
      }
    } catch (err: any) {
      logger.error('Failed to upload files', 'UploadsPage', err);
      setError(err?.detail || err?.message || t('admin.uploads.manualUpload.uploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  // ========================================
  // QUEUE HANDLERS
  // ========================================

  const handleResumeQueue = async () => {
    try {
      await uploadsService.resumeUploadQueue();
      logger.info('✅ Upload queue resumed', 'UploadsPage');
      await fetchData();
    } catch (err) {
      logger.error('Failed to resume queue', 'UploadsPage', err);
      setError(err instanceof Error ? err.message : t('admin.uploads.errors.resumeFailed'));
    }
  };

  const handleClearQueue = () => {
    const hasActiveJobs = queueStats.queued > 0 || queueStats.processing > 0;

    if (!hasActiveJobs) {
      logger.info('No active jobs to clear', 'UploadsPage');
      return;
    }

    notifications.show({
      level: 'warning',
      title: t('admin.uploads.clearQueueConfirmTitle'),
      message: t('admin.uploads.clearQueueConfirmMessage', {
        count: queueStats.queued + queueStats.processing,
      }),
      dismissable: true,
      action: {
        label: t('admin.uploads.clearQueue'),
        type: 'action',
        onPress: async () => {
          try {
            setClearingQueue(true);
            setError(null);
            const result = await uploadsService.clearUploadQueue();
            logger.info('✅ Upload queue cleared', 'UploadsPage', result);
            await fetchData();
          } catch (err: any) {
            logger.error('Failed to clear queue', 'UploadsPage', err);
            setError(err?.detail || err?.message || t('admin.uploads.errors.clearFailed'));
          } finally {
            setClearingQueue(false);
          }
        },
      },
    });
  };

  const handleTriggerUpload = async () => {
    try {
      setTriggeringUpload(true);
      setError(null);

      const result = await uploadsService.triggerUploadScan();
      logger.info('Triggered upload scan', 'UploadsPage', result);

      if (result.files_found > 0) {
        notifications.showSuccess(
          t('admin.uploads.triggerUploadSuccess', {
            files_found: result.files_found,
            defaultValue: `Found ${result.files_found} file(s) to upload`,
          }),
          t('common.success')
        );
      } else {
        notifications.showInfo(
          t('admin.uploads.noFilesFound', { defaultValue: 'No new files found' }),
          t('admin.uploads.scanComplete')
        );
      }

      await fetchData();
    } catch (err: any) {
      logger.error('Error triggering upload', 'UploadsPage', err);
      setError(err?.detail || err?.message || t('admin.uploads.errors.triggerFailed'));
    } finally {
      setTriggeringUpload(false);
    }
  };

  // ========================================
  // MONITORED FOLDERS HANDLERS
  // ========================================

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
      if (!folderForm.path.trim()) {
        setError(t('admin.uploads.errors.pathRequired'));
        return;
      }

      if (editingFolder) {
        await uploadsService.updateMonitoredFolder(editingFolder.id, folderForm);
        logger.info('✅ Folder updated', 'UploadsPage', { id: editingFolder.id });
      } else {
        await uploadsService.addMonitoredFolder(folderForm);
        logger.info('✅ Folder added', 'UploadsPage', { path: folderForm.path });
      }

      setShowFolderModal(false);
      setEditingFolder(null);
      setError(null);
      await fetchData();
    } catch (err: any) {
      logger.error('Error saving folder', 'UploadsPage', err);
      setError(err?.detail || err?.message || t('admin.uploads.errors.saveFailed'));
    }
  };

  const handleDeleteFolder = (folder: MonitoredFolder) => {
    notifications.show({
      level: 'warning',
      message: t('admin.uploads.confirmDelete', {
        name: folder.name || folder.path,
        defaultValue: `Delete folder "${folder.name || folder.path}"?`,
      }),
      dismissable: true,
      action: {
        label: t('common.delete'),
        type: 'action',
        onPress: async () => {
          try {
            await uploadsService.deleteMonitoredFolder(folder.id);
            logger.info('✅ Folder deleted', 'UploadsPage', { id: folder.id });
            setError(null);
            await fetchData();
          } catch (err) {
            logger.error('Error deleting folder', 'UploadsPage', err);
            setError(
              err instanceof Error ? err.message : t('admin.uploads.errors.deleteFailed')
            );
          }
        },
      },
    });
  };

  // ========================================
  // LIFECYCLE
  // ========================================

  useEffect(() => {
    fetchData();
    connectWebSocket();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [fetchData, connectWebSocket]);

  // ========================================
  // RENDER - LOADING STATE
  // ========================================

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  // ========================================
  // RENDER - MAIN UI
  // ========================================

  const pageConfig = ADMIN_PAGE_CONFIG.uploads;
  const IconComponent = pageConfig.icon;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* ========================================
          PAGE HEADER
          ======================================== */}
      <GlassPageHeader
        title={t('admin.nav.uploads')}
        subtitle={t('admin.uploads.systemInfoText')}
        icon={<IconComponent size={24} color={pageConfig.iconColor} strokeWidth={2} />}
        iconColor={pageConfig.iconColor}
        iconBackgroundColor={pageConfig.iconBackgroundColor}
        isRTL={isRTL}
        action={
          <View style={[styles.actionButtons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <GlassButton
              title={triggeringUpload ? t('common.loading') : t('admin.uploads.triggerUpload')}
              variant="secondary"
              icon={triggeringUpload ? null : <Upload size={18} color={colors.info.DEFAULT} />}
              onPress={handleTriggerUpload}
              disabled={triggeringUpload}
              style={adminButtonStyles.infoButton}
              textStyle={adminButtonStyles.buttonText}
            >
              {triggeringUpload && (
                <ActivityIndicator
                  size="small"
                  color={colors.info.DEFAULT}
                  style={{ marginRight: spacing.sm }}
                />
              )}
            </GlassButton>
            <GlassButton
              title={clearingQueue ? t('common.loading') : t('admin.uploads.clearQueue')}
              variant="destructive"
              icon={clearingQueue ? null : <XCircle size={18} color={colors.error.DEFAULT} />}
              onPress={handleClearQueue}
              disabled={clearingQueue || (queueStats.queued === 0 && queueStats.processing === 0)}
              style={adminButtonStyles.dangerButton}
              textStyle={adminButtonStyles.buttonText}
            >
              {clearingQueue && (
                <ActivityIndicator
                  size="small"
                  color={colors.error.DEFAULT}
                  style={{ marginRight: spacing.sm }}
                />
              )}
            </GlassButton>
            <GlassButton
              title={t('admin.uploads.addFolder')}
              variant="secondary"
              icon={<Plus size={18} color={colors.success.DEFAULT} />}
              onPress={handleAddFolder}
              style={adminButtonStyles.primaryButton}
              textStyle={adminButtonStyles.buttonText}
            />
          </View>
        }
      />

      {/* ========================================
          ERROR BANNER
          ======================================== */}
      {error && (
        <View style={[styles.errorContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <AlertCircle size={18} color={colors.error.DEFAULT} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => setError(null)}>
            <X size={18} color={colors.error.DEFAULT} />
          </Pressable>
        </View>
      )}

      {/* ========================================
          UPLOAD QUEUE SECTION
          ======================================== */}
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

      {/* ========================================
          MANUAL UPLOAD SECTION - MULTI-STAGE
          ======================================== */}
      <GlassDraggableExpander
        title={t('admin.uploads.manualUpload.title')}
        subtitle={t('admin.uploads.manualUpload.subtitle')}
        defaultExpanded={false}
        icon={<Upload size={20} color={colors.primary.DEFAULT} />}
        style={styles.sectionExpander}
      >
        <View style={styles.manualUploadContainer}>
          {/* STAGE 1 & 2: DROP ZONE */}
          <View
            {...getRootProps()}
            style={[
              styles.dropZone,
              isDragActive && styles.dropZoneActive,
              isUploading && styles.dropZoneDisabled,
            ]}
          >
            <input {...getInputProps()} />
            <View style={styles.dropZoneContent}>
              <View
                style={[
                  styles.dropZoneIconContainer,
                  isDragActive && styles.dropZoneIconActive,
                ]}
              >
                <FolderOpen
                  size={32}
                  color={isDragActive ? colors.primary.DEFAULT : colors.textSecondary}
                />
              </View>
              <Text style={[styles.dropZoneText, { textAlign: 'center' }]}>
                {isDragActive
                  ? t('admin.uploads.manualUpload.dropHereActive')
                  : t('admin.uploads.manualUpload.dropHere')}
              </Text>
              <Text style={[styles.dropZoneSubtext, { textAlign: 'center' }]}>
                {t('admin.uploads.manualUpload.supportedFormats')}
              </Text>
            </View>
          </View>

          {/* STAGE 3: FILE LIST & CONFIGURATION */}
          {pendingFiles.length > 0 && (
            <View style={styles.fileListContainer}>
              <View
                style={[styles.fileListHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                <Text style={[styles.fileListTitle, { textAlign }]}>
                  {t('admin.uploads.manualUpload.selectedFiles')} ({pendingFiles.length})
                </Text>
                <GlassButton
                  title={t('admin.uploads.manualUpload.clearAll')}
                  variant="ghost"
                  onPress={handleClearFiles}
                  disabled={isUploading}
                  icon={<X size={14} color={colors.textMuted} />}
                />
              </View>

              <ScrollView style={styles.fileList} nestedScrollEnabled>
                {pendingFiles.map((file, index) => (
                  <View
                    key={`${file.name}-${index}`}
                    style={[styles.fileItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  >
                    <View style={styles.fileIcon}>
                      <File size={20} color={colors.primary.DEFAULT} />
                    </View>
                    <View style={styles.fileInfo}>
                      <Text style={[styles.fileName, { textAlign }]} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <Text style={[styles.fileSize, { textAlign }]}>
                        {formatFileSize(file.size)}
                      </Text>
                    </View>

                    {/* STAGE 4: UPLOAD PROGRESS */}
                    {uploadProgress[index] !== undefined && (
                      <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              { width: `${uploadProgress[index]}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles.progressText}>{uploadProgress[index]}%</Text>
                      </View>
                    )}

                    {!isUploading && (
                      <Pressable onPress={() => handleRemoveFile(index)} style={styles.removeButton}>
                        <X size={16} color={colors.error.DEFAULT} />
                      </Pressable>
                    )}
                  </View>
                ))}
              </ScrollView>

              {/* Content Type Selection */}
              <View style={styles.contentTypeContainer}>
                <GlassSelect
                  label={t('admin.uploads.form.contentType')}
                  value={manualContentType}
                  onChange={setManualContentType}
                  options={[
                    { value: 'movie', label: t('admin.uploads.contentTypes.movie') },
                    { value: 'series', label: t('admin.uploads.contentTypes.series') },
                    { value: 'audiobook', label: t('admin.uploads.contentTypes.audiobook') },
                  ]}
                />
              </View>

              {/* Upload Button */}
              <GlassButton
                title={
                  isUploading
                    ? t('admin.uploads.manualUpload.uploadingFiles', { count: pendingFiles.length })
                    : t('admin.uploads.manualUpload.uploadFiles', { count: pendingFiles.length })
                }
                variant="secondary"
                icon={isUploading ? null : <Upload size={18} color={colors.primary.DEFAULT} />}
                onPress={handleUploadFiles}
                disabled={isUploading || pendingFiles.length === 0}
                style={[adminButtonStyles.primaryButton, styles.uploadButton]}
                textStyle={adminButtonStyles.buttonText}
              >
                {isUploading && (
                  <ActivityIndicator
                    size="small"
                    color={colors.primary.DEFAULT}
                    style={{ marginRight: spacing.sm }}
                  />
                )}
              </GlassButton>
            </View>
          )}

          {/* STAGE 5: UPLOAD RESULTS */}
          {uploadResult && (
            <View style={styles.uploadResultContainer}>
              <View style={styles.uploadResultHeader}>
                <CheckCircle size={24} color={colors.success.DEFAULT} />
                <Text style={styles.uploadResultTitle}>
                  {t('admin.uploads.manualUpload.uploadComplete')}
                </Text>
              </View>
              <View style={styles.uploadResultStats}>
                <View style={styles.uploadResultStat}>
                  <CheckCircle size={16} color={colors.success.DEFAULT} />
                  <Text style={styles.uploadResultStatText}>
                    {t('admin.uploads.manualUpload.successful', {
                      count: uploadResult.successful,
                    })}
                  </Text>
                </View>
                {uploadResult.failed > 0 && (
                  <View style={styles.uploadResultStat}>
                    <XCircle size={16} color={colors.error.DEFAULT} />
                    <Text style={[styles.uploadResultStatText, { color: colors.error.DEFAULT }]}>
                      {t('admin.uploads.manualUpload.failed', { count: uploadResult.failed })}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </GlassDraggableExpander>

      {/* ========================================
          MONITORED FOLDERS SECTION
          ======================================== */}
      <GlassDraggableExpander
        title={t('admin.uploads.monitoredFolders')}
        subtitle={t('admin.uploads.monitoredFoldersSubtitle')}
        defaultExpanded={true}
        icon={<Folder size={20} color={colors.warning.DEFAULT} />}
        style={styles.sectionExpander}
      >
        <View style={styles.foldersContainer}>
          {monitoredFolders.length === 0 ? (
            <View style={styles.emptyState}>
              <FolderOpen size={48} color={colors.textMuted} style={styles.emptyIcon} />
              <Text style={[styles.emptyText, { textAlign }]}>
                {t('admin.uploads.noMonitoredFolders')}
              </Text>
              <Text style={[styles.emptyHint, { textAlign }]}>
                {t('admin.uploads.configureFoldersHelp')}
              </Text>
            </View>
          ) : (
            monitoredFolders.map((folder) => (
              <View key={folder.id} style={styles.folderCard}>
                <View
                  style={[styles.folderHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                >
                  <View style={styles.folderInfo}>
                    <Text style={[styles.folderName, { textAlign }]}>
                      {folder.name || folder.path}
                    </Text>
                    <Text style={[styles.folderPath, { textAlign }]}>{folder.path}</Text>
                  </View>
                  <View
                    style={[styles.folderActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  >
                    <GlassBadge
                      text={folder.enabled ? t('common.enabled') : t('common.disabled')}
                      color={folder.enabled ? colors.success.DEFAULT : colors.textMuted}
                    />
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
                      icon={<Trash2 size={16} color={colors.error.DEFAULT} />}
                      onPress={() => handleDeleteFolder(folder)}
                      style={styles.iconButton}
                    />
                  </View>
                </View>

                <View
                  style={[styles.folderMeta, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                >
                  <Text style={styles.folderMetaText}>
                    {t('admin.uploads.type')}: {t(`admin.uploads.contentTypes.${folder.content_type}`)}
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
        </View>
      </GlassDraggableExpander>

      {/* ========================================
          FOLDER MODAL
          ======================================== */}
      <GlassModal
        visible={showFolderModal}
        onClose={() => {
          setShowFolderModal(false);
          setError(null);
        }}
        title={
          editingFolder ? t('admin.uploads.editFolder') : t('admin.uploads.addFolder')
        }
      >
        <View style={styles.modalContent}>
          <View style={styles.formGroup}>
            <GlassInput
              label={t('admin.uploads.form.name')}
              value={folderForm.name}
              onChangeText={(name) => setFolderForm((prev) => ({ ...prev, name }))}
              placeholder={t('admin.uploads.form.namePlaceholder')}
            />
          </View>

          <View style={styles.formGroup}>
            <GlassInput
              label={t('admin.uploads.form.path')}
              value={folderForm.path}
              onChangeText={(path) => setFolderForm((prev) => ({ ...prev, path }))}
              placeholder="/path/to/folder"
              editable={!editingFolder}
            />
            <Text style={styles.helpText}>
              {editingFolder
                ? t('admin.uploads.form.pathReadOnly')
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

          <View style={styles.toggleGroup}>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{t('admin.uploads.form.enabled')}</Text>
              <GlassToggle
                value={folderForm.enabled}
                onValueChange={(enabled) => setFolderForm((prev) => ({ ...prev, enabled }))}
              />
            </View>
          </View>

          <View style={styles.toggleGroup}>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{t('admin.uploads.form.autoUpload')}</Text>
              <GlassToggle
                value={folderForm.auto_upload}
                onValueChange={(auto_upload) =>
                  setFolderForm((prev) => ({ ...prev, auto_upload }))
                }
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
                setError(null);
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

// ========================================
// STYLES
// ========================================

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

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },

  // Error Banner
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.error.DEFAULT + '20',
    borderWidth: 1,
    borderColor: colors.error.DEFAULT + '40',
    marginBottom: spacing.lg,
  },
  errorText: {
    flex: 1,
    color: colors.error.DEFAULT,
    fontSize: fontSize.sm,
  },

  // Section Expanders
  sectionExpander: {
    marginTop: spacing.lg,
  },

  // Manual Upload Section
  manualUploadContainer: {
    gap: spacing.lg,
  },
  dropZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.glassBorder,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    backgroundColor: colors.glass,
    minHeight: 160,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  dropZoneActive: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.DEFAULT + '10',
  },
  dropZoneDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  dropZoneContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dropZoneIconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  dropZoneIconActive: {
    backgroundColor: colors.primary.DEFAULT + '20',
    borderColor: colors.primary.DEFAULT,
  },
  dropZoneText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  dropZoneSubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },

  // File List
  fileListContainer: {
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: spacing.md,
  },
  fileListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  fileListTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  fileList: {
    maxHeight: 300,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary.DEFAULT + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.xs / 2,
  },
  fileSize: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressBar: {
    width: 100,
    height: 6,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary.DEFAULT,
  },
  progressText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.primary.DEFAULT,
    minWidth: 40,
  },
  removeButton: {
    padding: spacing.xs,
  },
  contentTypeContainer: {
    marginTop: spacing.sm,
  },
  uploadButton: {
    marginTop: spacing.sm,
  },

  // Upload Results
  uploadResultContainer: {
    backgroundColor: colors.success.DEFAULT + '10',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.success.DEFAULT + '40',
  },
  uploadResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  uploadResultTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.success.DEFAULT,
  },
  uploadResultStats: {
    gap: spacing.sm,
  },
  uploadResultStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  uploadResultStatText: {
    fontSize: fontSize.md,
    color: colors.text,
  },

  // Monitored Folders
  foldersContainer: {
    gap: spacing.md,
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
    marginBottom: spacing.sm,
  },
  emptyHint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    maxWidth: 400,
  },
  folderCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
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
  folderInfo: {
    flex: 1,
  },
  folderName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs / 2,
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
  iconButton: {
    minWidth: 32,
    height: 32,
    padding: spacing.xs,
  },
  folderMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  folderMetaText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },

  // Modal
  modalContent: {
    padding: spacing.md,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  helpText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
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
  modalError: {
    padding: spacing.md,
    backgroundColor: colors.error.DEFAULT + '20',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.error.DEFAULT + '40',
    marginTop: spacing.md,
  },
  modalErrorText: {
    color: colors.error.DEFAULT,
    fontSize: fontSize.sm,
    textAlign: 'center',
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
