/**
 * MagicMirror - Full-screen mirror experience showing the user's avatar
 * reacting in real-time with animated expressions.
 *
 * Loads avatar data from the backend, streams emotion updates via polling,
 * and delegates rendering to MagicMirrorContent.
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { OlorinIcon } from '@olorin/icons/native';
import api from '@bayit/shared-services/api';
import { Colors } from '../../theme/colors';
import logger from '@/utils/logger';
import { MagicMirrorContent } from './MagicMirrorContent';

const mirrorLogger = logger.scope('MagicMirror');

interface MagicMirrorProps {
  avatarId: string;
  profileId: string;
  onClose: () => void;
}

interface MirrorState {
  expression: string;
  emotion: string;
  isAnimating: boolean;
}

const EMOTION_POLL_MS = 2000;

export const MagicMirror: React.FC<MagicMirrorProps> = ({
  avatarId,
  profileId,
  onClose,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [mirrorState, setMirrorState] = useState<MirrorState>({
    expression: 'neutral',
    emotion: 'calm',
    isAnimating: false,
  });
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchEmotionState = useCallback(async () => {
    try {
      const data = await api.get(`/zeh-ani/magic-mirror/${profileId}/emotion`, {
        params: { avatar_id: avatarId },
      }) as { expression: string; emotion: string };
      setMirrorState((prev) => ({
        expression: data.expression,
        emotion: data.emotion,
        isAnimating: prev.expression !== data.expression,
      }));
    } catch (err: unknown) {
      mirrorLogger.warn('Emotion poll failed', { avatarId, error: err });
    }
  }, [avatarId, profileId]);

  useEffect(() => {
    const init = async () => {
      try {
        await fetchEmotionState();
        setLoading(false);
        pollRef.current = setInterval(fetchEmotionState, EMOTION_POLL_MS);
        mirrorLogger.info('Mirror session started', { avatarId, profileId });
      } catch (err: unknown) {
        setError(t('zehAni.magicMirror.loadFailed'));
        setLoading(false);
        mirrorLogger.error('Mirror init failed', { avatarId, error: err });
      }
    };
    init();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [avatarId, profileId, fetchEmotionState, t]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <GlassLoadingSpinner />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText} accessibilityRole="alert">{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          {t('zehAni.magicMirror.title')}
        </Text>
        <Pressable onPress={onClose} style={styles.closeButton}
          accessibilityLabel={t('common.close')}
          accessibilityHint={t('zehAni.magicMirror.closeHint')}
          accessibilityRole="button">
          <OlorinIcon name="close" size={24} color={Colors.Text.primary} />
        </Pressable>
      </View>
      <MagicMirrorContent
        expression={mirrorState.expression}
        emotion={mirrorState.emotion}
        isAnimating={mirrorState.isAnimating}
      />
      <View style={styles.emotionLabel}>
        <Text style={styles.emotionText} accessibilityRole="text"
          accessibilityLabel={t('zehAni.magicMirror.currentEmotion', {
            emotion: mirrorState.emotion,
          })}>
          {t(`zehAni.magicMirror.emotions.${mirrorState.emotion}`)}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.Background.primary },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  title: { fontSize: 20, fontWeight: '700', color: Colors.Text.primary },
  closeButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.Glass.whiteSubtle,
    justifyContent: 'center', alignItems: 'center',
  },
  errorText: {
    fontSize: 16, color: Colors.Error.default, textAlign: 'center', padding: 24,
  },
  emotionLabel: {
    alignItems: 'center', paddingVertical: 16,
    backgroundColor: Colors.Glass.bgLight,
  },
  emotionText: { fontSize: 16, fontWeight: '600', color: Colors.Primary.p400 },
});
