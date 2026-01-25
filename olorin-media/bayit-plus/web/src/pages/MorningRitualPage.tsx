import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView, Image, StyleSheet } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { ChevronLeft, ChevronRight, X, SkipForward } from 'lucide-react';
import { GlassView, GlassButton } from '@bayit/shared/ui';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { ritualService } from '@/services/api';
import logger from '@/utils/logger';

interface PlaylistItem {
  id: string;
  title: string;
  type: 'live' | 'radio' | 'vod';
  stream_url?: string;
  thumbnail?: string;
  duration?: number;
  category: string;
}

interface AIBrief {
  greeting: string;
  israel_update: string;
  recommendation: string;
  mood: string;
  israel_context: {
    israel_time: string;
    day_name_he: string;
    is_shabbat: boolean;
  };
}

interface RitualData {
  is_ritual_time: boolean;
  ritual_enabled: boolean;
  local_time: string;
  playlist?: PlaylistItem[];
  ai_brief?: AIBrief;
}

export default function MorningRitualPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const navigate = useNavigate();
  const [ritualData, setRitualData] = useState<RitualData | null>(null);
  const [aiBrief, setAIBrief] = useState<AIBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBrief, setShowBrief] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetchRitualData();
  }, []);

  const fetchRitualData = async () => {
    try {
      const [checkResult, briefResult] = await Promise.all([
        ritualService.check(),
        ritualService.getAIBrief(),
      ]);
      setRitualData(checkResult);
      setAIBrief(briefResult);
    } catch (err) {
      logger.error('Failed to fetch ritual data', 'MorningRitualPage', err);
      handleExit();
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      await ritualService.skipToday();
    } catch (err) {
      logger.error('Failed to skip ritual', 'MorningRitualPage', err);
    }
    handleExit();
  };

  const handleExit = () => {
    navigate('/');
  };

  const handleStart = () => {
    setShowBrief(false);
    if (ritualData?.playlist?.length) {
      setIsPlaying(true);
    }
  };

  const handleNextItem = useCallback(() => {
    if (!ritualData?.playlist) return;
    if (currentIndex < ritualData.playlist.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleExit();
    }
  }, [currentIndex, ritualData]);

  const handlePreviousItem = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const currentItem = ritualData?.playlist?.[currentIndex];

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.emojiLarge}>☀️</Text>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>{t('ritual.preparingRitual')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.backgroundOverlay} />

      {showBrief && aiBrief && (
        <View style={styles.briefContainer}>
          <Text style={styles.emojiXL}>☀️</Text>
          <Text style={styles.briefGreeting}>{t('ritual.greeting')}</Text>
          <Text style={styles.briefUpdate}>{t('ritual.israelUpdate')}</Text>
          <Text style={styles.briefRecommendation}>{t('ritual.recommendation')}</Text>

          <View style={styles.briefInfoRow}>
            <View style={styles.briefInfoItem}>
              <Text style={styles.emojiMedium}>🇮🇱</Text>
              <Text style={styles.briefInfoLabel}>{t('ritual.israelTime')}</Text>
              <Text style={styles.briefInfoValue}>{aiBrief.israel_context?.israel_time}</Text>
            </View>

            <View style={styles.briefInfoItem}>
              <Text style={styles.emojiMedium}>📅</Text>
              <Text style={styles.briefInfoLabel}>{t('ritual.day')}</Text>
              <Text style={styles.briefInfoValue}>{aiBrief.israel_context?.day_name_he}</Text>
            </View>

            {aiBrief.israel_context?.is_shabbat && (
              <GlassView style={styles.shabbatBadge}>
                <Text style={styles.emojiMedium}>🕯️</Text>
                <Text style={styles.shabbatText}>{t('clock.shabbatShalom')}</Text>
              </GlassView>
            )}
          </View>

          <GlassButton
            title={t('ritual.letsStart')}
            onPress={handleStart}
            variant="primary"
            style={styles.startButton}
          />
        </View>
      )}

      {!showBrief && (
        <View style={styles.contentContainer}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>{t('ritual.title')}</Text>
              <Text style={styles.headerTime}>{ritualData?.local_time}</Text>
            </View>

            <View style={styles.headerRight}>
              <Pressable style={styles.skipButton} onPress={handleSkip}>
                <SkipForward size={18} color={colors.text} />
                <Text style={styles.buttonText}>{t('ritual.skipToday')}</Text>
              </Pressable>

              <Pressable style={styles.exitButton} onPress={handleExit}>
                <X size={18} color={colors.text} />
                <Text style={styles.buttonText}>{t('ritual.finish')}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.mediaContainer}>
            {currentItem?.type === 'live' || currentItem?.type === 'vod' ? (
              <View style={styles.videoWrapper}>
                {currentItem.stream_url && (
                  <video
                    ref={videoRef}
                    src={currentItem.stream_url}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    autoPlay={isPlaying}
                    onEnded={handleNextItem}
                  />
                )}
                <GlassView style={styles.videoOverlay}>
                  <Text style={styles.videoTitle}>{currentItem.title}</Text>
                  <Text style={styles.videoCategory}>{currentItem.category}</Text>
                </GlassView>
              </View>
            ) : currentItem?.type === 'radio' ? (
              <GlassView style={styles.radioCard}>
                <View style={styles.radioThumbnailWrapper}>
                  {currentItem.thumbnail && (
                    <Image source={{ uri: currentItem.thumbnail }} style={styles.radioThumbnail} />
                  )}
                  <View style={styles.radioRings}>
                    <View style={[styles.radioRing, styles.radioRingOuter]} />
                    <View style={[styles.radioRing, styles.radioRingMiddle]} />
                    <View style={[styles.radioRing, styles.radioRingInner]} />
                  </View>
                </View>
                <Text style={styles.radioTitle}>{currentItem.title}</Text>
              </GlassView>
            ) : (
              <View style={styles.noContentContainer}>
                <Text style={styles.noContentText}>{t('ritual.noContentNow')}</Text>
              </View>
            )}
          </View>

          <GlassView style={styles.playlistContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.playlistScrollContent}
            >
              {ritualData?.playlist?.map((item, index) => (
                <Pressable
                  key={item.id}
                  style={[
                    styles.playlistItem,
                    index === currentIndex ? styles.playlistItemActive : styles.playlistItemInactive
                  ]}
                  onPress={() => setCurrentIndex(index)}
                >
                  {item.thumbnail && (
                    <Image source={{ uri: item.thumbnail }} style={styles.playlistThumbnail} />
                  )}
                  <View style={styles.playlistItemContent}>
                    <Text style={styles.playlistItemTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.playlistItemType}>
                      {item.type === 'live' ? `🔴 ${t('ritual.typeLive')}` :
                       item.type === 'radio' ? `📻 ${t('ritual.typeRadio')}` : `🎬 ${t('ritual.typeVideo')}`}
                    </Text>
                  </View>
                  {index === currentIndex && <View style={styles.playlistIndicator} />}
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.navigationControls}>
              <Pressable
                style={[
                  styles.navButton,
                  currentIndex === 0 && styles.navButtonDisabled
                ]}
                onPress={handlePreviousItem}
                disabled={currentIndex === 0}
              >
                <ChevronRight size={20} color={colors.text} />
              </Pressable>

              <Text style={styles.navigationCounter}>
                {currentIndex + 1} / {ritualData?.playlist?.length || 0}
              </Text>

              <Pressable
                style={[
                  styles.navButton,
                  currentIndex >= (ritualData?.playlist?.length || 0) - 1 && styles.navButtonDisabled
                ]}
                onPress={handleNextItem}
                disabled={currentIndex >= (ritualData?.playlist?.length || 0) - 1}
              >
                <ChevronLeft size={20} color={colors.text} />
              </Pressable>
            </View>
          </GlassView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1b4b',
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(126, 34, 206, 0.5)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiLarge: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emojiXL: {
    fontSize: 96,
    marginBottom: spacing.xl,
  },
  emojiMedium: {
    fontSize: 32,
  },
  loadingText: {
    fontSize: fontSize.lg,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: spacing.md,
  },
  briefContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: spacing.xl,
    zIndex: 10,
  },
  briefGreeting: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  briefUpdate: {
    fontSize: fontSize.xl,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  briefRecommendation: {
    fontSize: fontSize.lg,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  briefInfoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    marginBottom: spacing.xl,
    flexWrap: 'wrap',
  },
  briefInfoItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  briefInfoLabel: {
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  briefInfoValue: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  shabbatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  shabbatText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: '#fbbf24',
  },
  startButton: {
    paddingHorizontal: spacing.xl * 1.5,
    paddingVertical: spacing.md,
  },
  contentContainer: {
    flex: 1,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
  },
  headerTime: {
    fontSize: fontSize.base,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  headerRight: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  buttonText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  mediaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  videoWrapper: {
    width: '90%',
    maxWidth: 1200,
    aspectRatio: 16 / 9,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  videoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
  },
  videoTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  videoCategory: {
    fontSize: fontSize.base,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  radioCard: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
  },
  radioThumbnailWrapper: {
    width: 200,
    height: 200,
    marginBottom: spacing.lg,
    position: 'relative',
  },
  radioThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 9999,
  },
  radioRings: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  radioRingOuter: {
    opacity: 0.8,
  },
  radioRingMiddle: {
    opacity: 0.5,
  },
  radioRingInner: {
    opacity: 0.3,
  },
  radioTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: '600',
    color: colors.text,
  },
  noContentContainer: {
    padding: spacing.xl,
  },
  noContentText: {
    fontSize: fontSize.lg,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  playlistContainer: {
    padding: spacing.md,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  playlistScrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    paddingRight: spacing.md,
    minWidth: 200,
  },
  playlistItemActive: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.5)',
  },
  playlistItemInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  playlistThumbnail: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
  },
  playlistItemContent: {
    flex: 1,
    gap: spacing.xs,
  },
  playlistItemTitle: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
  },
  playlistItemType: {
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  playlistIndicator: {
    width: 10,
    height: 10,
    borderRadius: 9999,
    backgroundColor: '#f97316',
  },
  navigationControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navigationCounter: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
