/**
 * Interactive Moments Section - Admin Content Editor
 *
 * Section for managing VOD avatar interactions in content.
 * Opens the InteractiveMomentEditor modal for detailed editing.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Plus, Edit2 } from 'lucide-react';
import { GlassView, GlassButton } from '@bayit/shared/ui';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import api from '@/services/api';

// Import web-only editor component
const InteractiveMomentEditor = Platform.OS === 'web'
  ? require('@/components/admin/InteractiveMomentEditor').InteractiveMomentEditor
  : null;

interface Props {
  contentId: string;
  videoUrl?: string;
  disabled?: boolean;
}

interface InteractiveMoment {
  timestamp: number;
  character_name: string;
  interaction_prompt: string;
}

export default function InteractiveMomentsSection({ contentId, videoUrl, disabled }: Props) {
  const { t } = useTranslation();
  const [showEditor, setShowEditor] = useState(false);
  const [moments, setMoments] = useState<InteractiveMoment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMoments();
  }, [contentId]);

  const loadMoments = async () => {
    try {
      const content = await api.get(`/admin/content/${contentId}`);
      setMoments(content.interactive_moments || []);
    } catch (error) {
      console.error('Failed to load interactive moments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEditor = () => {
    if (!videoUrl) {
      alert(t('admin.interactiveMoments.noVideoUrl', 'Please save the content with a video URL first'));
      return;
    }
    setShowEditor(true);
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    loadMoments();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <GlassView style={styles.container} intensity="medium">
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <MessageSquare size={20} color={colors.primary.DEFAULT} />
          <Text style={styles.title}>
            {t('admin.interactiveMoments.title', 'Interactive Moments')}
          </Text>
        </View>
        <GlassButton
          title={moments.length > 0
            ? t('admin.interactiveMoments.edit', 'Edit Moments')
            : t('admin.interactiveMoments.add', 'Add Moments')
          }
          onPress={handleOpenEditor}
          variant="ghost"
          icon={moments.length > 0 ? <Edit2 size={16} /> : <Plus size={16} />}
          disabled={disabled || !videoUrl}
          style={styles.editButton}
        />
      </View>

      <Text style={styles.description}>
        {t(
          'admin.interactiveMoments.description',
          'Mark moments where avatars can interact with characters during playback'
        )}
      </Text>

      {isLoading ? (
        <Text style={styles.loadingText}>
          {t('common.loading', 'Loading...')}
        </Text>
      ) : moments.length > 0 ? (
        <View style={styles.momentsList}>
          <Text style={styles.momentsCount}>
            {t('admin.interactiveMoments.count', {
              defaultValue: '{{count}} interactive moment(s)',
              count: moments.length
            })}
          </Text>
          {moments.slice(0, 3).map((moment, index) => (
            <View key={index} style={styles.momentItem}>
              <Text style={styles.momentTime}>{formatTime(moment.timestamp)}</Text>
              <View style={styles.momentDetails}>
                <Text style={styles.momentCharacter}>{moment.character_name}</Text>
                <Text style={styles.momentPrompt} numberOfLines={1}>
                  {moment.interaction_prompt}
                </Text>
              </View>
            </View>
          ))}
          {moments.length > 3 && (
            <Text style={styles.moreText}>
              {t('admin.interactiveMoments.more', '+{{count}} more', { count: moments.length - 3 })}
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <MessageSquare size={40} color={colors.textSecondary} style={{ opacity: 0.3 }} />
          <Text style={styles.emptyText}>
            {t('admin.interactiveMoments.empty', 'No interactive moments added yet')}
          </Text>
        </View>
      )}

      {/* Web-only Editor Modal */}
      {Platform.OS === 'web' && showEditor && InteractiveMomentEditor && videoUrl && (
        <Modal
          visible={showEditor}
          transparent
          animationType="fade"
          onRequestClose={handleCloseEditor}
        >
          <InteractiveMomentEditor
            contentId={contentId}
            videoUrl={videoUrl}
            onClose={handleCloseEditor}
          />
        </Modal>
      )}
    </GlassView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  editButton: {
    minWidth: 120,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  momentsList: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  momentsCount: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  momentItem: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.glassBackground,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  momentTime: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary.DEFAULT,
    minWidth: 50,
  },
  momentDetails: {
    flex: 1,
    gap: spacing.xs,
  },
  momentCharacter: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  momentPrompt: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  moreText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
