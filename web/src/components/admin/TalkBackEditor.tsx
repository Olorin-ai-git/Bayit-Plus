/**
 * TalkBackEditor - Admin timeline editor for Talk Back question points.
 */

import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { GlassCard, GlassButton } from '@bayit/shared/ui';
import api from '@/services/api';
import logger from '@/utils/logger';

interface TalkBackEditorProps {
  contentId: string;
}

interface TalkBackPoint {
  point_id: string;
  timestamp_seconds: number;
  character_name: string;
  character_name_he: string;
  question_text: string;
  question_text_he: string;
  expected_responses: string[];
  difficulty: string;
  shekel_reward: number;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#22C55E',
  medium: '#F59E0B',
  hard: '#EF4444',
};

export default function TalkBackEditor({ contentId }: TalkBackEditorProps) {
  const { t } = useTranslation();
  const [points, setPoints] = useState<TalkBackPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchPoints = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get(`/talk-back/points/${contentId}`) as { points: TalkBackPoint[] };
      setPoints(data.points || []);
    } catch (error) {
      logger.error('Failed to fetch talk back points', 'TalkBackEditor', error);
    }
    setLoading(false);
  }, [contentId]);

  useEffect(() => { fetchPoints(); }, [fetchPoints]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await api.post(`/talk-back/admin/content/${contentId}/generate`, {});
      await fetchPoints();
    } catch (error) {
      logger.error('Failed to generate talk back points', 'TalkBackEditor', error);
    }
    setGenerating(false);
  };

  const handleDelete = async (pointId: string) => {
    try {
      await api.delete(`/talk-back/admin/point/${pointId}`, {
        data: { content_id: contentId },
      });
      setPoints((prev) => prev.filter((p) => p.point_id !== pointId));
    } catch (error) {
      logger.error('Failed to delete talk back point', 'TalkBackEditor', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {t('admin.talkBack.title', 'Talk Back Points')}
        </Text>
        <View style={styles.headerActions}>
          <GlassButton
            label={generating
              ? t('admin.talkBack.generating', 'Generating...')
              : t('admin.talkBack.aiGenerate', 'AI Generate')}
            variant="primary"
            size="sm"
            onPress={handleGenerate}
            disabled={generating}
          />
        </View>
      </View>

      <Text style={styles.subtitle}>
        {t('admin.talkBack.count', '{{count}} question points', { count: points.length })}
      </Text>

      {/* Timeline Points */}
      {loading ? (
        <GlassCard style={styles.card}>
          <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
        </GlassCard>
      ) : (
        points
          .sort((a, b) => a.timestamp_seconds - b.timestamp_seconds)
          .map((point) => (
            <GlassCard key={point.point_id} style={styles.pointCard}>
              <View style={styles.pointHeader}>
                <View style={styles.timeChip}>
                  <Text style={styles.timeText}>{formatTime(point.timestamp_seconds)}</Text>
                </View>
                <View
                  style={[styles.difficultyChip,
                    { backgroundColor: DIFFICULTY_COLORS[point.difficulty] || '#6B7280' }]}
                >
                  <Text style={styles.difficultyText}>{point.difficulty}</Text>
                </View>
                <View style={styles.rewardChip}>
                  <Text style={styles.rewardText}>{point.shekel_reward} shekels</Text>
                </View>
                <Pressable style={styles.deleteBtn} onPress={() => handleDelete(point.point_id)}>
                  <Text style={styles.deleteText}>x</Text>
                </Pressable>
              </View>

              <Text style={styles.characterName}>{point.character_name}</Text>

              <View style={styles.questionRow}>
                <Text style={styles.questionLabel}>EN:</Text>
                <Text style={styles.questionText}>{point.question_text}</Text>
              </View>
              <View style={styles.questionRow}>
                <Text style={styles.questionLabel}>HE:</Text>
                <Text style={styles.questionTextHe}>{point.question_text_he}</Text>
              </View>

              <View style={styles.responsesRow}>
                <Text style={styles.responsesLabel}>
                  {t('admin.talkBack.expected', 'Expected:')}
                </Text>
                {point.expected_responses.map((resp, idx) => (
                  <View key={idx} style={styles.responseChip}>
                    <Text style={styles.responseText}>{resp}</Text>
                  </View>
                ))}
              </View>
            </GlassCard>
          ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  subtitle: { color: colors.textSecondary, fontSize: 13 },
  card: { padding: spacing.lg },
  loadingText: { color: colors.textSecondary, fontSize: 14 },
  pointCard: { padding: spacing.md, gap: spacing.sm },
  pointHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timeChip: {
    backgroundColor: 'rgba(59,130,246,0.2)', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  timeText: { color: '#60A5FA', fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  difficultyChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.sm },
  difficultyText: { color: '#fff', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  rewardChip: {
    backgroundColor: 'rgba(245,158,11,0.2)', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  rewardText: { color: '#FBBF24', fontSize: 11, fontWeight: '600' },
  deleteBtn: {
    marginLeft: 'auto', width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  deleteText: { color: '#EF4444', fontSize: 14, fontWeight: '700' },
  characterName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  questionRow: { flexDirection: 'row', gap: spacing.xs },
  questionLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600', width: 24 },
  questionText: { color: colors.textSecondary, fontSize: 13, flex: 1 },
  questionTextHe: { color: colors.textSecondary, fontSize: 13, flex: 1, textAlign: 'right' },
  responsesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, alignItems: 'center' },
  responsesLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  responseChip: { backgroundColor: 'rgba(34,197,94,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.sm },
  responseText: { color: '#4ADE80', fontSize: 12 },
});
