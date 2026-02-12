import { useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Loader, CheckCircle, XCircle, FileText, Video, Mic, Layers, ShieldCheck } from 'lucide-react';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { useStarStoryStore } from '@/stores/starStoryStore';
import { config } from '@/config/appConfig';
import logger from '@bayit/shared-utils/logger';

const progressLogger = logger.scope('GenerationProgress');

interface GenerationProgressProps {
  episodeId: string;
  profileId: string;
}

const GENERATION_STAGES = [
  { key: 'script', label: 'Writing Script', Icon: FileText },
  { key: 'video', label: 'Generating Video', Icon: Video },
  { key: 'audio', label: 'Creating Audio', Icon: Mic },
  { key: 'assembly', label: 'Assembling Episode', Icon: Layers },
  { key: 'safety', label: 'Safety Review', Icon: ShieldCheck },
];

const POLL_INTERVAL_MS = parseInt(import.meta.env.VITE_STAR_STORY_POLL_MS || '3000', 10);

export function GenerationProgress({ episodeId, profileId }: GenerationProgressProps) {
  const { generationProgress, pollProgress, fetchEpisodes } = useStarStoryStore();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      const progress = await pollProgress(episodeId);
      if (progress && (progress.status === 'completed' || progress.status === 'failed')) {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        if (progress.status === 'completed') {
          fetchEpisodes(profileId).catch((err: unknown) => progressLogger.error('Refresh episodes error', err));
        }
      }
    }, POLL_INTERVAL_MS);
  }, [episodeId, profileId, pollProgress, fetchEpisodes]);

  useEffect(() => {
    startPolling();
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [startPolling]);

  const currentStageIndex = GENERATION_STAGES.findIndex((s) => s.key === generationProgress?.current_stage);
  const progressPercent = generationProgress?.progress_percent ?? 0;
  const isCompleted = generationProgress?.status === 'completed';
  const isFailed = generationProgress?.status === 'failed';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>
          {isCompleted ? 'Episode Ready' : isFailed ? 'Generation Failed' : 'Creating Your Episode'}
        </Text>

        <View style={styles.stagesContainer}>
          {GENERATION_STAGES.map((stage, index) => {
            const isActive = index === currentStageIndex;
            const isDone = index < currentStageIndex || isCompleted;
            const StageIcon = stage.Icon;

            return (
              <View key={stage.key} style={styles.stageRow}>
                <View style={[styles.stageIcon, isDone && styles.stageIconDone, isActive && styles.stageIconActive]}>
                  {isDone ? (
                    <CheckCircle size={18} color={colors.white} />
                  ) : isActive ? (
                    <Loader size={18} color={colors.white} />
                  ) : (
                    <StageIcon size={18} color={colors.textMuted} />
                  )}
                </View>
                <Text style={[styles.stageLabel, isActive && styles.stageLabelActive, isDone && styles.stageLabelDone]}>
                  {stage.label}
                </Text>
                {index < GENERATION_STAGES.length - 1 && (
                  <View style={[styles.connector, isDone && styles.connectorDone]} />
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressPercent}>{Math.round(progressPercent)}%</Text>
        </View>

        {isFailed && generationProgress?.error_message && (
          <View style={styles.errorContainer}>
            <XCircle size={18} color={colors.error[500]} />
            <Text style={styles.errorText}>{generationProgress.error_message}</Text>
          </View>
        )}

        {!isCompleted && !isFailed && (
          <Text style={styles.estimateText}>This may take a few minutes</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[4], backgroundColor: colors.background },
  card: { backgroundColor: colors.glass.bgMedium, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.glass.border, padding: spacing[6], maxWidth: 480, width: '100%', gap: spacing[5] },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, textAlign: 'center' },
  stagesContainer: { gap: spacing[1] },
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[2] },
  stageIcon: { width: 36, height: 36, borderRadius: borderRadius.full, backgroundColor: colors.glass.bgStrong, justifyContent: 'center', alignItems: 'center' },
  stageIconDone: { backgroundColor: colors.success[500] },
  stageIconActive: { backgroundColor: colors.primary[600] },
  stageLabel: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: '500' },
  stageLabelActive: { color: colors.text, fontWeight: '600' },
  stageLabelDone: { color: colors.textSecondary },
  connector: { position: 'absolute', left: 17, top: 38, width: 2, height: 12, backgroundColor: colors.glass.bgStrong },
  connectorDone: { backgroundColor: colors.success[500] },
  progressBarContainer: { gap: spacing[2] },
  progressBarTrack: { height: 8, backgroundColor: colors.glass.bgStrong, borderRadius: borderRadius.full, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: colors.primary[400], borderRadius: borderRadius.full },
  progressPercent: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'right' },
  errorContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: colors.error[500] + '15', borderRadius: borderRadius.md, padding: spacing[3] },
  errorText: { fontSize: fontSize.sm, color: colors.error[500], flex: 1 },
  estimateText: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center' },
});
