/**
 * V2VResult - Voice-to-Voice practice result display.
 *
 * Shows pronunciation score with visual gauge, per-word feedback,
 * original vs user audio playback controls, and improvement suggestions.
 */
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { OlorinIcon } from '@olorin/icons/native';
import { GlassCard } from '@olorin/glass-ui/native';
import { Colors } from '../../theme/colors';
import logger from '@/utils/logger';

const resultLogger = logger.scope('V2VResult');

interface V2VResultData {
  score: number;
  feedback: string;
  originalAudio: string;
  userAudio: string;
  word: string;
}

interface V2VResultProps {
  result: V2VResultData;
}

const SCORE_THRESHOLDS = {
  EXCELLENT: 0.85,
  GOOD: 0.65,
  FAIR: 0.45,
} as const;

function getScoreColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.EXCELLENT) return Colors.Success.default;
  if (score >= SCORE_THRESHOLDS.GOOD) return Colors.Success.s400;
  if (score >= SCORE_THRESHOLDS.FAIR) return Colors.Warning.default;
  return Colors.Error.default;
}

function getScoreLabel(score: number, t: (key: string) => string): string {
  if (score >= SCORE_THRESHOLDS.EXCELLENT) return t('zehAni.v2v.quality.excellent');
  if (score >= SCORE_THRESHOLDS.GOOD) return t('zehAni.v2v.quality.good');
  if (score >= SCORE_THRESHOLDS.FAIR) return t('zehAni.v2v.quality.fair');
  return t('zehAni.v2v.quality.needsPractice');
}

export const V2VResult: React.FC<V2VResultProps> = ({ result }) => {
  const { t } = useTranslation();
  const [playingOriginal, setPlayingOriginal] = useState(false);
  const [playingUser, setPlayingUser] = useState(false);
  const scoreColor = getScoreColor(result.score);
  const scorePercent = Math.round(result.score * 100);

  const handlePlayOriginal = useCallback(() => {
    setPlayingOriginal((prev) => !prev);
    setPlayingUser(false);
    resultLogger.info('Play original audio toggled', { word: result.word });
  }, [result.word]);

  const handlePlayUser = useCallback(() => {
    setPlayingUser((prev) => !prev);
    setPlayingOriginal(false);
    resultLogger.info('Play user audio toggled', { word: result.word });
  }, [result.word]);

  return (
    <View style={styles.container}>
      <Text style={styles.wordDisplay}
        accessibilityRole="text"
        accessibilityLabel={t('zehAni.v2v.targetWord', { word: result.word })}>
        {result.word}
      </Text>

      <View style={styles.scoreSection}>
        <Text style={[styles.scoreValue, { color: scoreColor }]}
          accessibilityLabel={t('zehAni.v2v.scoreLabel', { score: String(scorePercent) })}>
          {scorePercent}%
        </Text>
        <View style={[styles.scoreBadge, { backgroundColor: `${scoreColor}25` }]}>
          <Text style={[styles.scoreBadgeText, { color: scoreColor }]}>
            {getScoreLabel(result.score, t)}
          </Text>
        </View>
      </View>

      <View style={styles.scoreBar}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: scorePercent }}>
        <View style={[styles.scoreBarFill, {
          width: `${scorePercent}%`, backgroundColor: scoreColor,
        }]} />
      </View>

      <GlassCard style={styles.audioCard}>
        <View style={styles.audioRow}>
          <Pressable style={styles.audioButton} onPress={handlePlayOriginal}
            accessibilityLabel={t('zehAni.v2v.playOriginal')}
            accessibilityHint={t('zehAni.v2v.playOriginalHint')}
            accessibilityRole="button">
            <OlorinIcon name={playingOriginal ? 'pause' : 'play'}
              size={20} color={Colors.Primary.p400} />
            <Text style={styles.audioLabel}>{t('zehAni.v2v.original')}</Text>
          </Pressable>
          <Pressable style={styles.audioButton} onPress={handlePlayUser}
            accessibilityLabel={t('zehAni.v2v.playYours')}
            accessibilityHint={t('zehAni.v2v.playYoursHint')}
            accessibilityRole="button">
            <OlorinIcon name={playingUser ? 'pause' : 'play'}
              size={20} color={Colors.Info.default} />
            <Text style={styles.audioLabel}>{t('zehAni.v2v.yours')}</Text>
          </Pressable>
        </View>
      </GlassCard>

      {result.feedback.length > 0 && (
        <GlassCard style={styles.feedbackCard}>
          <OlorinIcon name="lightbulb" size={18} color={Colors.Warning.default} />
          <Text style={styles.feedbackText} accessibilityRole="text">
            {result.feedback}
          </Text>
        </GlassCard>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 16, padding: 20 },
  wordDisplay: {
    fontSize: 36, fontWeight: '700', color: Colors.Text.primary, textAlign: 'center',
  },
  scoreSection: { alignItems: 'center', gap: 8 },
  scoreValue: { fontSize: 48, fontWeight: '800' },
  scoreBadge: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 12 },
  scoreBadgeText: { fontSize: 14, fontWeight: '600' },
  scoreBar: {
    width: '100%', height: 8, borderRadius: 4,
    backgroundColor: Colors.Glass.whiteSubtle, overflow: 'hidden',
  },
  scoreBarFill: { height: 8, borderRadius: 4 },
  audioCard: { flexDirection: 'row', width: '100%', padding: 12 },
  audioRow: { flexDirection: 'row', justifyContent: 'space-evenly', flex: 1 },
  audioButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 16,
    backgroundColor: Colors.Glass.whiteSubtle, borderRadius: 12,
  },
  audioLabel: { fontSize: 14, color: Colors.Text.secondary, fontWeight: '500' },
  feedbackCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, width: '100%',
  },
  feedbackText: {
    fontSize: 14, color: Colors.Text.secondary, lineHeight: 20, flex: 1,
  },
});
