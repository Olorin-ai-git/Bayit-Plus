/**
 * UploadsScreen
 * Admin screen for managing file uploads, queue, and monitored folders
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatCard } from '../../components/admin/StatCard';
import { UploadProgress } from '../../components/admin/UploadProgress';
import { MonitoredFolderManager } from '../../components/admin/MonitoredFolderManager';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassTable } from '../../components/ui/GlassTable';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassBadge } from '../../components/ui/GlassBadge';
import { GlassDraggableExpander } from '../../components/ui/GlassDraggableExpander';
import { colors, spacing, fontSize } from '../../theme';
import { useUploadProgress } from '../../hooks/useUploadProgress';
import uploadService, {
  MonitoredFolder,
  MonitoredFolderCreate,
  MonitoredFolderUpdate,
} from '../../services/uploadService';

export const UploadsScreen: React.FC = () => {
  const { t } = useTranslation();
  const {
    stats,
    activeJob,
    queue,
    recentCompleted,
    connected,
    error: wsError,
    formatFileSize,
    formatUploadSpeed,
    formatETA,
    getProgressPercentage,
  } = useUploadProgress();

  const [refreshing, setRefreshing] = useState(false);
  const [monitoredFolders, setMonitoredFolders] = useState<MonitoredFolder[]>([]);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<MonitoredFolder | null>(null);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load monitored folders
  const loadMonitoredFolders = async () => {
    try {
      const folders = await uploadService.getMonitoredFolders();
      setMonitoredFolders(folders);
    } catch (err) {
      console.error('Failed to load monitored folders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonitoredFolders();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMonitoredFolders();
    setRefreshing(false);
  };

  const handleCancelUpload = async (jobId: string) => {
    try {
      await uploadService.cancelUpload(jobId);
      Alert.alert('Success', 'Upload cancelled');
    } catch (err) {
      Alert.alert('Error', 'Failed to cancel upload');
    }
  };

  const handleScanNow = async (folderId?: string) => {
    setScanning(true);
    try {
      const result = await uploadService.scanNow(folderId);
      Alert.alert(
        'Scan Complete',
        `Found ${result.files_found || 0} files, enqueued ${result.files_enqueued || 0} for upload`
      );
      await loadMonitoredFolders();
    } catch (err) {
      Alert.alert('Error', 'Failed to scan folders');
    } finally {
      setScanning(false);
    }
  };

  const handleAddFolder = () => {
    setSelectedFolder(null);
    setShowFolderModal(true);
  };

  const handleEditFolder = (folder: MonitoredFolder) => {
    setSelectedFolder(folder);
    setShowFolderModal(true);
  };

  const handleSaveFolder = async (data: MonitoredFolderCreate | MonitoredFolderUpdate) => {
    try {
      if (selectedFolder) {
        await uploadService.updateMonitoredFolder(selectedFolder.id, data as MonitoredFolderUpdate);
      } else {
        await uploadService.addMonitoredFolder(data as MonitoredFolderCreate);
      }
      await loadMonitoredFolders();
    } catch (err) {
      throw err;
    }
  };

  const handleRemoveFolder = async (folderId: string) => {
    Alert.alert(
      'Remove Folder',
      'Are you sure you want to remove this monitored folder?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await uploadService.removeMonitoredFolder(folderId);
              await loadMonitoredFolders();
              Alert.alert('Success', 'Folder removed');
            } catch (err) {
              Alert.alert('Error', 'Failed to remove folder');
            }
          },
        },
      ]
    );
  };

  const handleToggleFolder = async (folder: MonitoredFolder) => {
    try {
      await uploadService.updateMonitoredFolder(folder.id, {
        enabled: !folder.enabled,
      });
      await loadMonitoredFolders();
    } catch (err) {
      Alert.alert('Error', 'Failed to update folder');
    }
  };

  return (
    <AdminLayout title="Uploads Management">
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Connection Status */}
        {!connected && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              ⚠️ Real-time updates disconnected
            </Text>
          </View>
        )}

        {wsError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>Error: {wsError}</Text>
          </View>
        )}

        {/* Statistics Cards */}
        <View style={styles.statsRow}>
          <StatCard
            title="Total Uploads"
            value={stats?.total_jobs || 0}
            icon="📊"
            color={colors.primary}
          />
          <StatCard
            title="In Queue"
            value={stats?.queued || 0}
            icon="⏳"
            color={colors.warning}
          />
          <StatCard
            title="Completed"
            value={stats?.completed || 0}
            icon="✅"
            color={colors.success}
          />
          <StatCard
            title="Failed"
            value={stats?.failed || 0}
            icon="❌"
            color={colors.error}
          />
        </View>

        {/* Overall Progress */}
        {stats && stats.total_size_bytes > 0 && (
          <GlassCard autoSize style={styles.section}>
            <Text style={styles.sectionTitle}>Overall Progress</Text>
            <View style={styles.overallProgress}>
              <Text style={styles.progressLabel}>
                {formatFileSize(stats.uploaded_bytes)} / {formatFileSize(stats.total_size_bytes)}
              </Text>
              <Text style={styles.progressPercent}>
                {getProgressPercentage().toFixed(1)}%
              </Text>
            </View>
          </GlassCard>
        )}

        {/* Active Upload */}
        {activeJob && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Upload</Text>
            <UploadProgress
              job={activeJob}
              onCancel={handleCancelUpload}
              formatFileSize={formatFileSize}
              formatUploadSpeed={formatUploadSpeed}
              formatETA={formatETA}
            />
          </View>
        )}

        {/* Upload Queue */}
        {queue.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upload Queue ({queue.length})</Text>
            {queue.map((job) => (
              <UploadProgress
                key={job.job_id}
                job={job}
                onCancel={handleCancelUpload}
                formatFileSize={formatFileSize}
              />
            ))}
          </View>
        )}

        {/* Recent Completed */}
        {recentCompleted.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Uploads</Text>
            {recentCompleted.map((job) => (
              <UploadProgress
                key={job.job_id}
                job={job}
                formatFileSize={formatFileSize}
              />
            ))}
          </View>
        )}

        {/* Monitored Folders */}
        <GlassDraggableExpander
          title="Monitored Folders"
          defaultExpanded={false}
          emptyMessage="No monitored folders configured"
          isEmpty={monitoredFolders.length === 0}
          headerActions={
            <View style={styles.headerButtons}>
              <GlassButton
                title="Scan Now"
                onPress={() => handleScanNow()}
                loading={scanning}
                size="small"
                style={styles.headerButton}
              />
              <GlassButton
                title="Add Folder"
                onPress={handleAddFolder}
                size="small"
                style={styles.headerButton}
              />
            </View>
          }
        >
          {monitoredFolders.map((folder) => (
              <GlassCard key={folder.id} autoSize style={styles.folderCard}>
                <View style={styles.folderHeader}>
                  <View style={styles.folderInfo}>
                    <Text style={styles.folderName}>
                      {folder.name || folder.path}
                    </Text>
                    <Text style={styles.folderPath} numberOfLines={1}>
                      {folder.path}
                    </Text>
                  </View>
                  <View style={styles.folderBadges}>
                    <GlassBadge
                      text={folder.content_type}
                      color={colors.primary}
                    />
                    {folder.enabled ? (
                      <GlassBadge text="Enabled" color={colors.success} />
                    ) : (
                      <GlassBadge text="Disabled" color={colors.textMuted} />
                    )}
                  </View>
                </View>

                <View style={styles.folderStats}>
                  <Text style={styles.folderStat}>
                    Found: {folder.files_found}
                  </Text>
                  <Text style={styles.folderStat}>
                    Uploaded: {folder.files_uploaded}
                  </Text>
                  {folder.last_scanned && (
                    <Text style={styles.folderStat}>
                      Last scan: {new Date(folder.last_scanned).toLocaleString()}
                    </Text>
                  )}
                </View>

                {folder.last_error && (
                  <View style={styles.folderError}>
                    <Text style={styles.folderErrorText}>
                      Error: {folder.last_error}
                    </Text>
                  </View>
                )}

                <View style={styles.folderActions}>
                  <GlassButton
                    title={folder.enabled ? 'Disable' : 'Enable'}
                    onPress={() => handleToggleFolder(folder)}
                    size="small"
                    variant="secondary"
                  />
                  <GlassButton
                    title="Scan"
                    onPress={() => handleScanNow(folder.id)}
                    size="small"
                    variant="secondary"
                  />
                  <GlassButton
                    title="Edit"
                    onPress={() => handleEditFolder(folder)}
                    size="small"
                  />
                  <GlassButton
                    title="Remove"
                    onPress={() => handleRemoveFolder(folder.id)}
                    size="small"
                    variant="secondary"
                  />
                </View>
              </GlassCard>
            ))}
        </GlassDraggableExpander>
      </ScrollView>

      {/* Folder Modal */}
      <MonitoredFolderManager
        visible={showFolderModal}
        folder={selectedFolder}
        onClose={() => setShowFolderModal(false)}
        onSave={handleSaveFolder}
      />
    </AdminLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  warningBanner: {
    backgroundColor: colors.warning + '20',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  warningText: {
    color: colors.warning,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: colors.error + '20',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    minWidth: 100,
  },
  overallProgress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  progressPercent: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.primary,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emptyHint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  folderCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  folderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  folderInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  folderName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  folderPath: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  folderBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  folderStats: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  folderStat: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  folderError: {
    backgroundColor: colors.error + '20',
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  folderErrorText: {
    fontSize: fontSize.sm,
    color: colors.error,
  },
  folderActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
});

export default UploadsScreen;
