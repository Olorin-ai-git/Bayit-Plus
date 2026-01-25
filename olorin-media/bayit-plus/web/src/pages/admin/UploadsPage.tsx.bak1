/**
 * Admin Uploads Page
 * Manages file uploads and monitored folders
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { colors, spacing, borderRadius, fontSize } from '@bayit/shared/theme';
import { GlassCard, GlassButton, GlassInput, GlassModal, GlassSelect, GlassToggle, GlassDraggableExpander, GlassCheckbox } from '@bayit/shared/ui';
import { Plus, Edit2, Trash2, FolderOpen, AlertCircle, X, Folder, Upload, XCircle, File, CheckCircle } from 'lucide-react';
import { useDirection } from '@/hooks/useDirection';
import { useModal } from '@/contexts/ModalContext';
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
  const [resettingCache, setResettingCache] = useState(false);
  const [moviesOnly, setMoviesOnly] = useState(false);
  const [seriesOnly, setSeriesOnly] = useState(false);
  const [audiobooksOnly, setAudiobooksOnly] = useState(false);
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
  
  // Connection status tracking
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsReconnecting, setWsReconnecting] = useState(false);
  const [lastTriggerResult, setLastTriggerResult] = useState<{filesFound: number; message: string} | null>(null);
  
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

  // Manual upload state
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [manualContentType, setManualContentType] = useState<string>('movie');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: number]: number }>({});
  const [uploadResult, setUploadResult] = useState<{ successful: number; failed: number } | null>(null);

  // File validation for manual upload
  const ALLOWED_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v', '.wmv'];
  
  const validateFile = (file: File): boolean => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    return ALLOWED_EXTENSIONS.includes(ext);
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // React Dropzone setup
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(validateFile);
    const invalidCount = acceptedFiles.length - validFiles.length;
    
    if (invalidCount > 0) {
      logger.warn(`${invalidCount} files rejected - invalid file type`, 'UploadsPage');
    }
    
    setPendingFiles((prev) => {
      // Avoid duplicates by filename
      const existingNames = new Set(prev.map(f => f.name));
      const newFiles = validFiles.filter(f => !existingNames.has(f.name));
      return [...prev, ...newFiles];
    });
    
    // Clear any previous upload result when new files are added
    setUploadResult(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: false,
    noKeyboard: false,
    multiple: true,
    preventDropOnDocument: true,  // Prevent files from opening in browser
    accept: {
      'video/*': ALLOWED_EXTENSIONS,
    },
  });

  // Remove file from pending list
  const handleRemoveFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadProgress((prev) => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
  };

  // Clear all pending files
  const handleClearFiles = () => {
    setPendingFiles([]);
    setUploadProgress({});
    setUploadResult(null);
  };

  // Upload all pending files
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
          setUploadProgress((prev) => ({
            ...prev,
            [fileIndex]: progress,
          }));
        },
        (fileIndex, job) => {
          logger.info(`File ${fileIndex + 1} uploaded successfully`, 'UploadsPage', { job_id: job.job_id });
        }
      );
      
      setUploadResult({
        successful: result.successful.length,
        failed: result.failed.length,
      });
      
      if (result.failed.length > 0) {
        const failedNames = result.failed.map(f => f.file.name).join(', ');
        logger.error(`Failed to upload: ${failedNames}`, 'UploadsPage');
      }
      
      // Clear successfully uploaded files
      if (result.successful.length > 0) {
        setPendingFiles(result.failed.map(f => f.file));
        
        // Refresh queue data
        await fetchData();
      }
      
    } catch (err: any) {
      logger.error('Failed to upload files', 'UploadsPage', err);
      setError(err?.detail || err?.message || t('admin.uploads.manualUpload.uploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

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

  // Fetch queue data via REST API (fallback when WebSocket unavailable)
  const fetchQueueData = useCallback(async () => {
    try {
      const queueData = await uploadsService.getUploadQueue();
      if (queueData.stats) {
        setQueueStats(queueData.stats);
      }
      setActiveJob(queueData.active_job || null);
      setQueuedJobs(queueData.queue || []);
      setRecentCompleted(queueData.recent_completed || []);
      setQueuePaused(queueData.queue_paused || false);
      setPauseReason(queueData.pause_reason || null);
    } catch (err) {
      logger.error('Failed to fetch upload queue', 'UploadsPage', err);
    }
  }, []);

  // Fetch monitored folders (always via REST)
  const fetchMonitoredFolders = useCallback(async () => {
    try {
      const folders = await uploadsService.getMonitoredFolders();
      setMonitoredFolders(folders || []);
    } catch (err) {
      logger.error('Failed to fetch monitored folders', 'UploadsPage', err);
    }
  }, []);

  // Fetch all data (used for refresh after actions)
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      await Promise.all([fetchQueueData(), fetchMonitoredFolders()]);
    } catch (err) {
      logger.error('Error fetching upload data', 'UploadsPage', err);
      setError(err instanceof Error ? err.message : 'Failed to load upload data');
    } finally {
      setLoading(false);
    }
  }, [fetchQueueData, fetchMonitoredFolders]);

  // WebSocket connection for real-time updates
  const connectWebSocket = useCallback(() => {
    try {
      // Get auth token from bayit-auth store (where it's actually stored)
      const authData = JSON.parse(localStorage.getItem('bayit-auth') || '{}');
      const token = authData?.state?.token;
      
      if (!token) {
        logger.warn('Session expired or invalid', 'UploadsPage');
        setIsAuthenticated(false);
        setWsConnected(false);
        return;
      }

      setIsAuthenticated(true);
      setWsReconnecting(true);

      // Close existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }

      // Determine WebSocket URL from API base URL
      const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      // Extract host from API_BASE_URL or use default backend port
      let wsHost = 'localhost:8000'; // Default for local development
      
      if (API_BASE_URL.startsWith('http')) {
        // Extract host from full URL
        const apiUrl = new URL(API_BASE_URL);
        wsHost = apiUrl.host;
      } else if (window.location.hostname !== 'localhost') {
        // Production: use same host as frontend
        wsHost = window.location.host;
      }
      
      const wsUrl = `${wsProtocol}://${wsHost}/api/v1/admin/uploads/ws?token=${token}`;

      logger.info('Connecting to uploads WebSocket', 'UploadsPage', { 
        host: wsHost,
        url: wsUrl.replace(token, '***') 
      });

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        logger.info('✅ Uploads WebSocket connected', 'UploadsPage');
        setWsConnected(true);
        setWsReconnecting(false);
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
        // Only log on first error, not every retry
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CONNECTING) {
          logger.warn('[WebSocket] Unable to connect to backend. Real-time updates disabled.', 'UploadsPage');
        }
        setWsConnected(false);
      };

      ws.onclose = (event) => {
        wsRef.current = null;
        setWsConnected(false);
        
        // Only reconnect if it wasn't a clean close and we have a token
        // Don't spam reconnection attempts if backend is down
        if (event.code !== 1000 && token) {
          logger.debug('[WebSocket] Connection closed, will retry in 10s', 'UploadsPage');
          setWsReconnecting(true);
          
          // Reconnect after 10 seconds (increased from 5s to reduce spam)
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, 10000);
        } else {
          setWsReconnecting(false);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      logger.error('[WebSocket] Failed to connect', 'UploadsPage', err);
      setWsConnected(false);
      setWsReconnecting(false);
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
  const handleClearQueue = () => {
    const hasActiveJobs = queueStats.queued > 0 || queueStats.processing > 0;
    
    if (!hasActiveJobs) {
      logger.info('No active jobs to clear', 'UploadsPage');
      return;
    }

    showConfirm(
      t('admin.uploads.clearQueueConfirmMessage', { 
        count: queueStats.queued + queueStats.processing 
      }),
      async () => {
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
      },
      {
        title: t('admin.uploads.clearQueueConfirmTitle'),
        confirmText: t('admin.uploads.clearQueue'),
        cancelText: t('common.cancel'),
        destructive: true,
      }
    );
  };

  // Handle reset cache
  const handleResetCache = async () => {
    try {
      setResettingCache(true);
      setError(null);
      
      const result = await uploadsService.resetFolderCache();
      logger.info(`✅ Cache reset: ${result.files_cleared} files cleared`, 'UploadsPage', result);
      
      // Show success message
      const message = t('admin.uploads.cacheResetSuccess', { 
        count: result.files_cleared,
        defaultValue: `Cache cleared: ${result.files_cleared} files will be rescanned`
      });
      setLastTriggerResult({
        filesFound: 0,
        message: message
      });
    } catch (err: any) {
      logger.error('Failed to reset cache', 'UploadsPage', err);
      const errorMessage = err?.detail || err?.message || t('admin.uploads.cacheResetFailed', 'Failed to reset cache');
      setError(errorMessage);
    } finally {
      setResettingCache(false);
    }
  };

  useEffect(() => {
    // Always fetch monitored folders (not provided via WebSocket)
    fetchMonitoredFolders().finally(() => setLoading(false));
    
    // Connect to WebSocket for real-time queue updates
    // WebSocket sends initial queue state on connect
    connectWebSocket();
    
    // Fallback: If WebSocket doesn't connect within 3 seconds, fetch queue via REST
    const fallbackTimeout = setTimeout(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        logger.info('WebSocket not connected, fetching queue data via REST API', 'UploadsPage');
        fetchQueueData();
      }
    }, 3000);
    
    // Cleanup
    return () => {
      clearTimeout(fallbackTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
    // Run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      setLastTriggerResult(null);
      
      // Check authentication first
      if (!isAuthenticated) {
        setError(t('admin.uploads.sessionExpired', 'Session expired. Please refresh the page or log in again.'));
        return;
      }
      
      // Check if there's already an active upload
      const hasActiveUploads = queueStats.processing > 0 || queueStats.queued > 0;
      if (hasActiveUploads) {
        setError(
          t('admin.uploads.uploadAlreadyRunning', 
            'Upload scan already in progress. Please wait for current uploads to complete.'
          )
        );
        return;
      }
      
      // Build content type options
      const contentTypeOptions = {
        moviesOnly,
        seriesOnly,
        audiobooksOnly,
      };
      
      const result = await uploadsService.triggerUploadScan(undefined, contentTypeOptions);
      logger.info('Triggered upload scan', 'UploadsPage', { ...result, filters: contentTypeOptions });
      
      // Show clear success/info message
      if (result.files_found > 0) {
        const message = t('admin.uploads.triggerUploadSuccess', { files_found: result.files_found });
        setLastTriggerResult({
          filesFound: result.files_found,
          message: message
        });
        logger.info(message, 'UploadsPage');
      } else {
        const message = t('admin.uploads.noFilesFound', 'No new files found in monitored folders');
        setLastTriggerResult({
          filesFound: 0,
          message: message
        });
        logger.info(message, 'UploadsPage');
      }
      
      // Refresh data immediately to show new jobs
      await fetchData();
      
    } catch (err: any) {
      logger.error('Error triggering upload', 'UploadsPage', err);
      let errorMessage = err?.detail || err?.message || t('admin.uploads.triggerUploadFailed');
      
      // Add helpful context to error
      if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
        errorMessage = t('admin.uploads.unauthorized', 'Unauthorized. Please log in again.');
      } else if (errorMessage.includes('404')) {
        errorMessage = t('admin.uploads.endpointNotFound', 'Upload service not available. Check server configuration.');
      } else if (errorMessage.includes('timeout')) {
        errorMessage = t('admin.uploads.timeout', 'Upload scan timed out. Try again or check monitored folders.');
      }
      
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
      <View style={styles.headerContainer}>
        <View style={styles.headerText}>
          <Text style={[styles.pageTitle, { textAlign }]}>{t('admin.nav.uploads')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>
            {t('admin.uploads.systemInfoText')}
          </Text>
        </View>
        
        {/* Content Type Filters */}
        <View style={styles.contentFilterSection}>
          <Text style={[styles.filterTitle, { textAlign }]}>
            {t('admin.uploads.contentTypeFilters', 'Content Type Filters')}
          </Text>
          <Text style={[styles.filterSubtitle, { textAlign }]}>
            {t('admin.uploads.contentTypeFiltersHelp', 'Optional - Leave all unchecked to process all content types')}
          </Text>
          
          <View style={[styles.checkboxContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.checkboxRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <GlassCheckbox
                label={t('admin.uploads.moviesOnly', 'Movies Only')}
                checked={moviesOnly}
                onChange={setMoviesOnly}
              />
            </View>
            
            <View style={[styles.checkboxRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <GlassCheckbox
                label={t('admin.uploads.seriesOnly', 'Series Only')}
                checked={seriesOnly}
                onChange={setSeriesOnly}
              />
            </View>
            
            <View style={[styles.checkboxRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <GlassCheckbox
                label={t('admin.uploads.audiobooksOnly', 'Audiobooks Only')}
                checked={audiobooksOnly}
                onChange={setAudiobooksOnly}
              />
            </View>
          </View>
        </View>
        
        <View style={[styles.actionButtonsContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Primary Actions */}
          <View style={[styles.buttonGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <GlassButton
              title={triggeringUpload ? t('common.loading') : t('admin.uploads.triggerUpload')}
              variant="ghost"
              icon={triggeringUpload ? null : <Upload size={18} color="white" />}
              onPress={handleTriggerUpload}
              disabled={triggeringUpload || queueStats.processing > 0 || queueStats.queued > 0}
            >
              {triggeringUpload && (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: spacing.sm }} />
              )}
            </GlassButton>

            <GlassButton
              title={t('admin.uploads.addFolder')}
              variant="primary"
              icon={<Plus size={18} color="white" />}
              onPress={handleAddFolder}
            />
          </View>
          
          {/* Management Actions */}
          <View style={[styles.buttonGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <GlassButton
              title={resettingCache ? t('common.loading') : t('admin.uploads.resetCache', 'Reset Cache')}
              variant="ghost"
              icon={resettingCache ? null : <FolderOpen size={18} color="white" />}
              onPress={handleResetCache}
              disabled={resettingCache}
            >
              {resettingCache && (
                <ActivityIndicator size="small" color={colors.warning} style={{ marginRight: spacing.sm }} />
              )}
            </GlassButton>

            <GlassButton
              title={clearingQueue ? t('common.loading') : t('admin.uploads.clearQueue')}
              variant="danger"
              icon={clearingQueue ? null : <XCircle size={18} color="white" />}
              onPress={handleClearQueue}
              disabled={clearingQueue || (queueStats.queued === 0 && queueStats.processing === 0)}
            >
              {clearingQueue && (
                <ActivityIndicator size="small" color={colors.error} style={{ marginRight: spacing.sm }} />
              )}
            </GlassButton>
          </View>
        </View>
      </View>

      {/* Error Message */}
      {/* Connection Status Banner */}
      {!isAuthenticated && (
        <View style={[styles.statusBanner, styles.statusBannerError, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <AlertCircle size={20} color={colors.error} />
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={[styles.statusBannerTitle, { color: colors.error }]}>
              {t('admin.uploads.sessionIssue', 'Session Issue')}
            </Text>
            <Text style={[styles.statusBannerText, { color: colors.error }]}>
              {t('admin.uploads.sessionIssueHelp', 'Your session may have expired. Please refresh the page to restore connection.')}
            </Text>
          </View>
        </View>
      )}

      {isAuthenticated && !wsConnected && !wsReconnecting && (
        <View style={[styles.statusBanner, styles.statusBannerWarning, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <AlertCircle size={20} color={colors.warning} />
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={[styles.statusBannerTitle, { color: colors.warning }]}>
              {t('admin.uploads.wsDisconnected', 'Real-time Updates Disabled')}
            </Text>
            <Text style={[styles.statusBannerText, { color: colors.warning }]}>
              {t('admin.uploads.wsDisconnectedHelp', 'WebSocket connection failed. Queue status may be outdated. Page will auto-retry.')}
            </Text>
          </View>
        </View>
      )}

      {isAuthenticated && wsReconnecting && (
        <View style={[styles.statusBanner, styles.statusBannerInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.statusBannerText, { marginLeft: spacing.sm }]}>
            {t('admin.uploads.wsReconnecting', 'Reconnecting to real-time updates...')}
          </Text>
        </View>
      )}

      {lastTriggerResult && (
        <View style={[styles.statusBanner, lastTriggerResult.filesFound > 0 ? styles.statusBannerSuccess : styles.statusBannerInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusBannerText, { color: lastTriggerResult.filesFound > 0 ? colors.success : colors.textMuted }]}>
              {lastTriggerResult.message}
            </Text>
          </View>
          <Pressable onPress={() => setLastTriggerResult(null)}>
            <X size={18} color={lastTriggerResult.filesFound > 0 ? colors.success : colors.textMuted} />
          </Pressable>
        </View>
      )}

      {/* Show notice if uploads are active */}
      {(queueStats.processing > 0 || queueStats.queued > 0) && !triggeringUpload && (
        <View style={[styles.statusBanner, styles.statusBannerInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={styles.statusBannerText}>
              {t('admin.uploads.uploadsActiveNotice', 
                'Uploads in progress ({{processing}} active, {{queued}} queued). New scan disabled until current batch completes.',
                { processing: queueStats.processing, queued: queueStats.queued }
              )}
            </Text>
          </View>
        </View>
      )}

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
      <GlassDraggableExpander
        title={t('admin.uploads.monitoredFolders')}
        defaultExpanded={false}
        emptyMessage={t('admin.uploads.noMonitoredFolders')}
        isEmpty={monitoredFolders.length === 0}
      >
        {monitoredFolders.map((folder) => (
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
          ))}
      </GlassDraggableExpander>

      {/* Manual Upload Section */}
      <GlassDraggableExpander
        title={t('admin.uploads.manualUpload.title')}
        subtitle={t('admin.uploads.manualUpload.subtitle')}
        defaultExpanded={false}
        icon={<Upload size={20} color={colors.primary} />}
        style={{ marginTop: spacing.lg }}
      >
        <View style={styles.manualUploadContainer}>
          {/* Drop Zone */}
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
              <View style={[styles.dropZoneIconContainer, isDragActive && styles.dropZoneIconActive]}>
                <FolderOpen size={28} color={isDragActive ? colors.primary : colors.textSecondary} />
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

          {/* Selected Files List */}
          {pendingFiles.length > 0 && (
            <View style={styles.fileListContainer}>
              <View style={[styles.fileListHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
                    <View style={[styles.fileIcon, { marginEnd: spacing.sm }]}>
                      <File size={20} color={colors.primary} />
                    </View>
                    <View style={styles.fileInfo}>
                      <Text style={[styles.fileName, { textAlign }]} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <Text style={[styles.fileSizeText, { textAlign }]}>
                        {formatFileSize(file.size)}
                      </Text>
                    </View>
                    {uploadProgress[index] !== undefined && (
                      <View style={styles.fileProgress}>
                        <View
                          style={[
                            styles.fileProgressBar,
                            { width: `${uploadProgress[index]}%` },
                          ]}
                        />
                        <Text style={styles.fileProgressText}>
                          {uploadProgress[index]}%
                        </Text>
                      </View>
                    )}
                    {!isUploading && (
                      <Pressable
                        onPress={() => handleRemoveFile(index)}
                        style={styles.removeFileButton}
                      >
                        <X size={16} color={colors.error} />
                      </Pressable>
                    )}
                  </View>
                ))}
              </ScrollView>

              {/* Content Type Selection */}
              <View style={styles.contentTypeSection}>
                <Text style={[styles.contentTypeLabel, { textAlign }]}>
                  {t('admin.uploads.manualUpload.selectContentType')}
                </Text>
                <GlassSelect
                  value={manualContentType}
                  onChange={setManualContentType}
                  options={[
                    { value: 'movie', label: t('admin.uploads.contentTypes.movie') },
                    { value: 'series', label: t('admin.uploads.contentTypes.series') },
                    { value: 'audiobook', label: t('admin.uploads.contentTypes.audiobook') },
                  ]}
                  disabled={isUploading}
                />
              </View>

              {/* Upload Button */}
              <View style={styles.uploadButtonContainer}>
                <GlassButton
                  title={
                    isUploading
                      ? t('admin.uploads.manualUpload.uploadingFiles', { count: pendingFiles.length })
                      : t('admin.uploads.manualUpload.uploadSelected')
                  }
                  variant="primary"
                  onPress={handleUploadFiles}
                  disabled={isUploading || pendingFiles.length === 0}
                  icon={isUploading ? null : <Upload size={18} color="white" />}
                >
                  {isUploading && (
                    <ActivityIndicator size="small" color="white" style={{ marginRight: spacing.sm }} />
                  )}
                </GlassButton>
              </View>

              {/* Upload Result */}
              {uploadResult && (
                <View
                  style={[
                    styles.uploadResult,
                    uploadResult.failed > 0 ? styles.uploadResultWarning : styles.uploadResultSuccess,
                  ]}
                >
                  <CheckCircle size={18} color={uploadResult.failed > 0 ? colors.warning : colors.success} />
                  <Text
                    style={[
                      styles.uploadResultText,
                      { color: uploadResult.failed > 0 ? colors.warning : colors.success },
                    ]}
                  >
                    {t('admin.uploads.manualUpload.uploadSuccess', { count: uploadResult.successful })}
                    {uploadResult.failed > 0 && ` (${uploadResult.failed} failed)`}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Empty state */}
          {pendingFiles.length === 0 && (
            <View style={styles.emptyFileState}>
              <Text style={[styles.emptyFileText, { textAlign }]}>
                {t('admin.uploads.manualUpload.noFilesSelected')}
              </Text>
            </View>
          )}
        </View>
      </GlassDraggableExpander>

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
              variant="cancel"
              onPress={() => {
                setShowFolderModal(false);
                setError(null); // Clear error when closing
              }}
            />
            <GlassButton
              title={t('common.save')}
              variant="success"
              onPress={handleSaveFolder}
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
  headerContainer: {
    marginBottom: spacing.lg,
    gap: spacing.lg,
  },
  headerText: {
    marginBottom: spacing.md,
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
  actionButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    alignItems: 'center',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  contentFilterSection: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  filterSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  checkboxContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
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
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  statusBannerError: {
    backgroundColor: colors.error + '20',
    borderColor: colors.error + '40',
  },
  statusBannerWarning: {
    backgroundColor: colors.warning + '20',
    borderColor: colors.warning + '40',
  },
  statusBannerSuccess: {
    backgroundColor: colors.success + '20',
    borderColor: colors.success + '40',
  },
  statusBannerInfo: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary + '40',
  },
  statusBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  statusBannerText: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
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
  // Manual Upload Styles
  manualUploadContainer: {
    gap: spacing.md,
  },
  dropZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.glassBorder,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    backgroundColor: colors.glassLight,
    minHeight: 140,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  dropZoneActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
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
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  dropZoneIconActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  dropZoneText: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
  },
  dropZoneSubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  fileListContainer: {
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  fileListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  fileListTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  fileList: {
    maxHeight: 250,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  fileIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary + '20',
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
  },
  fileSizeText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  fileProgress: {
    width: 80,
    height: 20,
    backgroundColor: colors.glassBorder,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileProgressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  fileProgressText: {
    fontSize: fontSize.xs,
    color: colors.text,
    fontWeight: '600',
    zIndex: 1,
  },
  removeFileButton: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.error + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentTypeSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  contentTypeLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  uploadButtonContainer: {
    marginTop: spacing.md,
    alignItems: 'flex-start',
  },
  uploadResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginTop: spacing.md,
  },
  uploadResultSuccess: {
    backgroundColor: colors.success + '20',
  },
  uploadResultWarning: {
    backgroundColor: colors.warning + '20',
  },
  uploadResultText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  emptyFileState: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyFileText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});

export default UploadsPage;
