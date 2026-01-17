/**
 * GlassQueue Component
 * Real-time upload queue display with glass morphism design
 * Shows active uploads, queued items, and recent completions with live updates
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Upload,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  Info,
  Hash,
  FileText,
  Cloud,
  Database,
  Film,
  Subtitles,
} from 'lucide-react';
import { GlassView, GlassCard, GlassBadge, GlassButton } from '@bayit/shared/ui';
import { colors, spacing, borderRadius, fontSize } from '@bayit/shared/theme';
import { useDirection } from '@/hooks/useDirection';
import { format } from 'date-fns';

// Stage configuration for visual display
// Critical stages (must succeed for upload to complete)
const CRITICAL_STAGES = [
  { key: 'hash_calculation', icon: Hash, label: 'Hash' },
  { key: 'metadata_extraction', icon: FileText, label: 'Metadata' },
  { key: 'gcs_upload', icon: Cloud, label: 'Cloud' },
  { key: 'database_insert', icon: Database, label: 'Database' },
] as const;

// Non-critical enrichment stages (run after upload, failures don't fail the upload)
const ENRICHMENT_STAGES = [
  { key: 'imdb_lookup', icon: Film, label: 'IMDB' },
  { key: 'subtitle_extraction', icon: Subtitles, label: 'Subtitles' },
] as const;

const UPLOAD_STAGES = [...CRITICAL_STAGES, ...ENRICHMENT_STAGES] as const;

// Stage Indicator Component
interface StageIndicatorProps {
  stages?: UploadStages;
  status: string;
  isRTL: boolean;
}

const StageIndicator: React.FC<StageIndicatorProps> = ({ stages, status, isRTL }) => {
  if (!stages || status === 'queued') return null;
  
  const criticalStagesCount = CRITICAL_STAGES.length;
  
  return (
    <View style={[stageStyles.container, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      {UPLOAD_STAGES.map((stage, index) => {
        const stageStatus = stages[stage.key as keyof UploadStages];
        const isActive = stageStatus === 'in_progress';
        const isCompleted = stageStatus === 'completed';
        const isSkipped = stageStatus === 'skipped';
        const isScheduled = stageStatus === 'scheduled';
        const isEnrichmentStage = index >= criticalStagesCount;
        
        const Icon = stage.icon;
        
        // Color logic: completed=green, active=blue, skipped=orange, pending=gray
        let iconColor = colors.textMuted;
        let bgColor = 'transparent';
        let borderColor = colors.glassBorder;
        
        if (isCompleted) {
          iconColor = colors.success;
          bgColor = colors.success + '20';
          borderColor = colors.success + '40';
        } else if (isActive) {
          iconColor = colors.primary;
          bgColor = colors.primary + '20';
          borderColor = colors.primary + '40';
        } else if (isSkipped) {
          iconColor = colors.warning;
          bgColor = colors.warning + '15';
          borderColor = colors.warning + '30';
        } else if (isScheduled) {
          iconColor = colors.info || colors.primary;
          bgColor = (colors.info || colors.primary) + '15';
          borderColor = (colors.info || colors.primary) + '30';
        }
        
        // Add visual separator before enrichment stages
        const showSeparator = index === criticalStagesCount;
        
        return (
          <React.Fragment key={stage.key}>
            {index > 0 && !showSeparator && (
              <View 
                style={[
                  stageStyles.connector,
                  { backgroundColor: isCompleted ? colors.success : colors.glassBorder }
                ]} 
              />
            )}
            {showSeparator && (
              <View style={stageStyles.enrichmentSeparator}>
                <View style={stageStyles.separatorDot} />
              </View>
            )}
            <View 
              style={[
                stageStyles.stage,
                isEnrichmentStage && stageStyles.enrichmentStage,
                { 
                  backgroundColor: bgColor,
                  borderColor: borderColor,
                }
              ]}
            >
              <Icon size={isEnrichmentStage ? 10 : 12} color={iconColor} />
              {isActive && (
                <ActivityIndicator size={8} color={colors.primary} style={stageStyles.spinner} />
              )}
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
};

const stageStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm,
    justifyContent: 'center',
  },
  stage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  enrichmentStage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    opacity: 0.85,
  },
  connector: {
    width: 20,
    height: 2,
    marginHorizontal: 2,
  },
  enrichmentSeparator: {
    marginHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
  },
  spinner: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
});

export interface UploadStages {
  hash_calculation?: 'pending' | 'in_progress' | 'completed';
  metadata_extraction?: 'pending' | 'in_progress' | 'completed';
  gcs_upload?: 'pending' | 'in_progress' | 'completed';
  database_insert?: 'pending' | 'in_progress' | 'completed';
  // Non-critical enrichment stages (run after upload is complete)
  imdb_lookup?: 'pending' | 'in_progress' | 'completed' | 'skipped';
  subtitle_extraction?: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'scheduled';
}

export interface QueueJob {
  job_id: string;
  filename: string;
  status: 'queued' | 'processing' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  file_size: number;
  bytes_uploaded: number;
  upload_speed?: number | null;
  eta_seconds?: number | null;
  error_message?: string | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  current_stage?: string | null;
  stages?: UploadStages;
}

export interface QueueStats {
  total_jobs: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
  skipped?: number; // Duplicates and informational skips
  total_size_bytes: number;
  uploaded_bytes: number;
}

interface GlassQueueProps {
  stats: QueueStats;
  activeJob?: QueueJob | null;
  queue: QueueJob[];
  recentCompleted: QueueJob[];
  queuePaused?: boolean;
  pauseReason?: string | null;
  loading?: boolean;
  onResumeQueue?: () => void;
  /** Hide the outer card wrapper (for use inside an expander) */
  noCard?: boolean;
  /** Hide the header (for use inside an expander that already shows title) */
  hideHeader?: boolean;
}

const GlassQueue: React.FC<GlassQueueProps> = ({
  stats,
  activeJob,
  queue,
  recentCompleted,
  queuePaused = false,
  pauseReason = null,
  loading = false,
  onResumeQueue,
  noCard = false,
  hideHeader = false,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection: directionFlex } = useDirection();
  const [showQueue, setShowQueue] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true); // Default to expanded

  // Calculate skipped count (duplicates) from recent completed
  const skippedCount = stats.skipped ?? recentCompleted.filter(job => isDuplicate(job)).length;
  // Actual failures (not duplicates)
  const actualFailures = stats.failed - skippedCount;

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
  };

  // Format speed
  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatFileSize(bytesPerSecond)}/s`;
  };

  // Format ETA
  const formatETA = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  // Check if a job is a duplicate (informational, not an error)
  const isDuplicate = (job: QueueJob): boolean => {
    if (!job.error_message) return false;
    const lowerMsg = job.error_message.toLowerCase();
    return lowerMsg.includes('duplicate') || 
           lowerMsg.includes('already in library') ||
           lowerMsg.includes('already exists');
  };

  // Get status color
  const getStatusColor = (status: string, job?: QueueJob): string => {
    // If it's a failed/cancelled job but actually a duplicate, show as info
    if (job && (status === 'failed' || status === 'cancelled') && isDuplicate(job)) {
      return colors.info || colors.primary;
    }
    
    switch (status) {
      case 'completed':
        return colors.success;
      case 'failed':
      case 'cancelled':
        return colors.error;
      case 'uploading':
      case 'processing':
        return colors.primary;
      case 'queued':
        return colors.warning;
      default:
        return colors.textMuted;
    }
  };

  // Get status icon
  const getStatusIcon = (status: string, job?: QueueJob) => {
    const iconSize = 16;
    const iconColor = getStatusColor(status, job);
    
    // If it's a duplicate, show info icon instead of error
    if (job && (status === 'failed' || status === 'cancelled') && isDuplicate(job)) {
      return <Info size={iconSize} color={iconColor} />;
    }
    
    switch (status) {
      case 'completed':
        return <CheckCircle size={iconSize} color={iconColor} />;
      case 'failed':
        return <XCircle size={iconSize} color={iconColor} />;
      case 'uploading':
      case 'processing':
        return <Upload size={iconSize} color={iconColor} />;
      case 'queued':
        return <Clock size={iconSize} color={iconColor} />;
      case 'cancelled':
        return <XCircle size={iconSize} color={iconColor} />;
      default:
        return <AlertCircle size={iconSize} color={iconColor} />;
    }
  };

  if (loading) {
    const loadingContent = (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
    
    if (noCard) return loadingContent;
    return <GlassCard style={styles.container}>{loadingContent}</GlassCard>;
  }

  // Main content
  const queueContent = (
    <View style={noCard ? undefined : styles.container}>
      {/* Header with Stats - only show if not hidden */}
      {!hideHeader && (
        <View style={styles.header}>
          <View style={[styles.headerTop, { flexDirection: directionFlex }]}>
            <Text style={[styles.title, { textAlign }]}>
              {t('admin.uploads.queueStatus', 'Upload Queue')}
            </Text>
            <View style={[styles.statsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.total_jobs}</Text>
                <Text style={styles.statLabel}>{t('admin.uploads.totalJobs', 'Total')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.warning }]}>{stats.queued}</Text>
                <Text style={styles.statLabel}>{t('admin.uploads.queued', 'Queued')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>{stats.processing}</Text>
                <Text style={styles.statLabel}>{t('admin.uploads.processing', 'Active')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.success }]}>{stats.completed}</Text>
                <Text style={styles.statLabel}>{t('admin.uploads.completed', 'Done')}</Text>
              </View>
              {skippedCount > 0 && (
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.info }]}>{skippedCount}</Text>
                  <Text style={styles.statLabel}>{t('admin.uploads.skipped', 'Skipped')}</Text>
                </View>
              )}
              {actualFailures > 0 && (
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.error }]}>{actualFailures}</Text>
                  <Text style={styles.statLabel}>{t('admin.uploads.failed', 'Failed')}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Queue Paused Warning */}
      {queuePaused && (
        <View style={styles.pausedWarning}>
          <View style={[styles.pausedContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Pause size={20} color={colors.error} />
            <View style={{ flex: 1 }}>
              <Text style={styles.pausedTitle}>
                {t('admin.uploads.queuePaused', 'Queue Paused')}
              </Text>
              <Text style={styles.pausedReason}>{pauseReason}</Text>
            </View>
            {onResumeQueue && (
              <GlassButton
                title={t('admin.uploads.resumeQueue', 'Resume')}
                variant="secondary"
                icon={<Play size={16} color={colors.success} />}
                onPress={onResumeQueue}
                style={styles.resumeButton}
              />
            )}
          </View>
        </View>
      )}

      {/* Active Upload */}
      {activeJob && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { textAlign }]}>
            {t('admin.uploads.activeUpload', 'Active Upload')}
          </Text>
          <View style={styles.jobCard}>
            <View style={[styles.jobHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {getStatusIcon(activeJob.status, activeJob)}
              <Text style={[styles.jobFilename, { textAlign, flex: 1 }]} numberOfLines={1}>
                {activeJob.filename}
              </Text>
              <GlassBadge 
                label={`${activeJob.progress.toFixed(1)}%`}
                variant="info"
              />
            </View>
            
            {/* Stage Progress Indicator */}
            <StageIndicator 
              stages={activeJob.stages} 
              status={activeJob.status}
              isRTL={isRTL}
            />
            
            {/* Current Stage Text */}
            {activeJob.current_stage && (
              <Text style={[styles.currentStage, { textAlign }]}>
                {activeJob.current_stage}
              </Text>
            )}
            
            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${activeJob.progress}%` }]} />
            </View>
            
            {/* Job Details */}
            <View style={[styles.jobDetails, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.jobDetailText}>
                {formatFileSize(activeJob.bytes_uploaded)} / {formatFileSize(activeJob.file_size)}
              </Text>
              {activeJob.upload_speed && activeJob.upload_speed > 0 && (
                <Text style={styles.jobDetailText}>
                  {formatSpeed(activeJob.upload_speed)}
                </Text>
              )}
              {activeJob.eta_seconds && activeJob.eta_seconds > 0 && (
                <Text style={styles.jobDetailText}>
                  ETA: {formatETA(activeJob.eta_seconds)}
                </Text>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Queued Items */}
      <View style={styles.section}>
        <Pressable
          style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => setShowQueue(!showQueue)}
        >
          <Text style={[styles.sectionTitle, { textAlign, flex: 1 }]}>
            {t('admin.uploads.queuedItems', 'Queued')} ({queue.length})
          </Text>
          {showQueue ? (
            <ChevronUp size={20} color={colors.textMuted} />
          ) : (
            <ChevronDown size={20} color={colors.textMuted} />
          )}
        </Pressable>

        {showQueue && (
          <ScrollView 
            style={styles.jobList} 
            nestedScrollEnabled 
            showsVerticalScrollIndicator={false}
          >
            {queue.length === 0 ? (
              <Text style={[styles.emptyText, { textAlign }]}>
                {t('admin.uploads.noQueuedItems', 'No items in queue')}
              </Text>
            ) : (
              queue.map((job) => (
                <View key={job.job_id} style={styles.queuedJobCard}>
                  <View style={[styles.jobHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    {getStatusIcon(job.status, job)}
                    <Text style={[styles.jobFilename, { flex: 1, textAlign }]} numberOfLines={1}>
                      {job.filename}
                    </Text>
                    <Text style={styles.jobSize}>{formatFileSize(job.file_size)}</Text>
                  </View>
                  <Text style={[styles.jobTime, { textAlign }]}>
                    {t('admin.uploads.addedAt', 'Added')}: {format(new Date(job.created_at), 'MMM d, HH:mm')}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>

      {/* Recently Completed */}
      {recentCompleted.length > 0 && (
        <View style={styles.section}>
          <Pressable
            style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => setShowCompleted(!showCompleted)}
          >
            <Text style={[styles.sectionTitle, { textAlign, flex: 1 }]}>
              {t('admin.uploads.recentCompleted', 'Recently Completed')} ({recentCompleted.length})
            </Text>
            {showCompleted ? (
              <ChevronUp size={20} color={colors.textMuted} />
            ) : (
              <ChevronDown size={20} color={colors.textMuted} />
            )}
          </Pressable>

          {showCompleted && (
            <ScrollView 
              style={styles.jobList} 
              nestedScrollEnabled 
              showsVerticalScrollIndicator={false}
            >
              {recentCompleted.map((job) => {
                const isJobDuplicate = isDuplicate(job);
                const badgeVariant = job.status === 'completed' 
                  ? 'success' 
                  : isJobDuplicate 
                    ? 'primary' 
                    : 'danger';
                
                return (
                  <View key={job.job_id} style={styles.completedJobCard}>
                    <View style={[styles.jobHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      {getStatusIcon(job.status, job)}
                      <Text style={[styles.jobFilename, { flex: 1, textAlign }]} numberOfLines={1}>
                        {job.filename}
                      </Text>
                      <GlassBadge
                        label={isJobDuplicate ? 'Duplicate' : job.status}
                        variant={badgeVariant}
                      />
                    </View>
                    {job.error_message && (
                      <Text 
                        style={[
                          isJobDuplicate ? styles.infoText : styles.errorText
                        ]} 
                        numberOfLines={2}
                      >
                        {job.error_message}
                      </Text>
                    )}
                    {job.completed_at && (
                      <Text style={[styles.jobTime, { textAlign }]}>
                        {format(new Date(job.completed_at), 'MMM d, HH:mm:ss')}
                      </Text>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );

  // Return with or without card wrapper
  if (noCard) return queueContent;
  return <GlassCard style={styles.container}>{queueContent}</GlassCard>;
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  pausedWarning: {
    backgroundColor: colors.error + '15',
    borderWidth: 1,
    borderColor: colors.error + '40',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  pausedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pausedTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.error,
    marginBottom: spacing.xs,
  },
  pausedReason: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  resumeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  section: {
    marginBottom: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    cursor: 'pointer',
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  jobCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  queuedJobCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  completedJobCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  jobFilename: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  jobSize: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  currentStage: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
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
    borderRadius: borderRadius.sm,
  },
  jobDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  jobDetailText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  jobTime: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.info || colors.primary,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  jobList: {
    maxHeight: 300,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});

export default GlassQueue;
