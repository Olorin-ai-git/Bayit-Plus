import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView, Image } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, X, SkipForward } from 'lucide-react';
import { GlassView, GlassButton } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
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
          <Text style={styles.loadingEmoji}>☀️</Text>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>{t('ritual.preparingRitual')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.gradientBg} />

      {showBrief && aiBrief && (
        <View style={styles.briefOverlay}>
          <Text style={styles.briefEmoji}>☀️</Text>
          <Text style={styles.briefGreeting}>{t('ritual.greeting')}</Text>
          <Text style={styles.briefIsrael}>{t('ritual.israelUpdate')}</Text>
          <Text style={styles.briefRecommendation}>{t('ritual.recommendation')}</Text>

          <View style={styles.israelContext}>
            <View style={styles.contextItem}>
              <Text style={styles.contextIcon}>🇮🇱</Text>
              <Text style={styles.contextLabel}>{t('ritual.israelTime')}</Text>
              <Text style={styles.contextValue}>{aiBrief.israel_context?.israel_time}</Text>
            </View>

            <View style={styles.contextItem}>
              <Text style={styles.contextIcon}>📅</Text>
              <Text style={styles.contextLabel}>{t('ritual.day')}</Text>
              <Text style={styles.contextValue}>{aiBrief.israel_context?.day_name_he}</Text>
            </View>

            {aiBrief.israel_context?.is_shabbat && (
              <GlassView style={styles.shabbatBadge}>
                <Text style={styles.contextIcon}>🕯️</Text>
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
        <View style={styles.mainContent}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.ritualTitle}>{t('ritual.title')}</Text>
              <Text style={styles.ritualTime}>{ritualData?.local_time}</Text>
            </View>

            <View style={styles.headerRight}>
              <Pressable style={styles.headerButton} onPress={handleSkip}>
                <SkipForward size={18} color={colors.text} />
                <Text style={styles.headerButtonText}>{t('ritual.skipToday')}</Text>
              </Pressable>

              <Pressable style={[styles.headerButton, styles.exitButton]} onPress={handleExit}>
                <X size={18} color={colors.text} />
                <Text style={styles.headerButtonText}>{t('ritual.finish')}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.playerArea}>
            {currentItem?.type === 'live' || currentItem?.type === 'vod' ? (
              <View style={styles.videoContainer}>
                {currentItem.stream_url && (
                  <video
                    ref={videoRef}
                    src={currentItem.stream_url}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    autoPlay={isPlaying}
                    onEnded={handleNextItem}
                  />
                )}
                <GlassView style={styles.videoInfo}>
                  <Text style={styles.videoTitle}>{currentItem.title}</Text>
                  <Text style={styles.videoCategory}>{currentItem.category}</Text>
                </GlassView>
              </View>
            ) : currentItem?.type === 'radio' ? (
              <GlassView style={styles.radioContainer}>
                <View style={styles.radioVisual}>
                  {currentItem.thumbnail && (
                    <Image source={{ uri: currentItem.thumbnail }} style={styles.radioImage} />
                  )}
                  <View style={styles.radioWaves}>
                    <View style={[styles.wave, { opacity: 0.8 }]} />
                    <View style={[styles.wave, { opacity: 0.5 }]} />
                    <View style={[styles.wave, { opacity: 0.3 }]} />
                  </View>
                </View>
                <Text style={styles.radioTitle}>{currentItem.title}</Text>
              </GlassView>
            ) : (
              <View style={styles.noContent}>
                <Text style={styles.noContentText}>{t('ritual.noContentNow')}</Text>
              </View>
            )}
          </View>

          <GlassView style={styles.playlistBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.playlistScroll}>
              {ritualData?.playlist?.map((item, index) => (
                <Pressable
                  key={item.id}
                  style={[styles.playlistItem, index === currentIndex && styles.playlistItemActive]}
                  onPress={() => setCurrentIndex(index)}
                >
                  {item.thumbnail && (
                    <Image source={{ uri: item.thumbnail }} style={styles.playlistThumb} />
                  )}
                  <View style={styles.playlistInfo}>
                    <Text style={styles.playlistTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.playlistType}>
                      {item.type === 'live' ? `🔴 ${t('ritual.typeLive')}` :
                       item.type === 'radio' ? `📻 ${t('ritual.typeRadio')}` : `🎬 ${t('ritual.typeVideo')}`}
                    </Text>
                  </View>
                  {index === currentIndex && <View style={styles.playingIndicator} />}
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.navControls}>
              <Pressable
                style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
                onPress={handlePreviousItem}
                disabled={currentIndex === 0}
              >
                <ChevronRight size={20} color={colors.text} />
              </Pressable>

              <Text style={styles.navCounter}>
                {currentIndex + 1} / {ritualData?.playlist?.length || 0}
              </Text>

              <Pressable
                style={[styles.navButton, currentIndex >= (ritualData?.playlist?.length || 0) - 1 && styles.navButtonDisabled]}
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
  container: { flex: 1, backgroundColor: '#1e1b4b' },
  gradientBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(49, 46, 129, 0.5)' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingEmoji: { fontSize: 64, marginBottom: spacing.lg },
  loadingText: { fontSize: 18, color: colors.textSecondary, marginTop: spacing.md },
  briefOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)', padding: spacing.xl, zIndex: 10 },
  briefEmoji: { fontSize: 80, marginBottom: spacing.xl },
  briefGreeting: { fontSize: 36, fontWeight: '700', color: colors.text, marginBottom: spacing.md, textAlign: 'center' },
  briefIsrael: { fontSize: 20, color: 'rgba(255, 255, 255, 0.9)', marginBottom: spacing.sm, textAlign: 'center' },
  briefRecommendation: { fontSize: 18, color: 'rgba(255, 255, 255, 0.7)', marginBottom: spacing.xl, textAlign: 'center' },
  israelContext: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl, marginBottom: spacing.xl, flexWrap: 'wrap' },
  contextItem: { alignItems: 'center', gap: spacing.xs },
  contextIcon: { fontSize: 24 },
  contextLabel: { fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' },
  contextValue: { fontSize: 18, fontWeight: '600', color: colors.text },
  shabbatBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.lg },
  shabbatText: { fontSize: 18, fontWeight: '600', color: '#fbbf24' },
  startButton: { paddingHorizontal: 48, paddingVertical: 16 },
  mainContent: { flex: 1, zIndex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  ritualTitle: { fontSize: 20, fontWeight: '600', color: colors.text },
  ritualTime: { fontSize: 16, color: colors.textSecondary },
  headerRight: { flexDirection: 'row', gap: spacing.md },
  headerButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: 'rgba(255, 255, 255, 0.15)' },
  exitButton: { backgroundColor: 'rgba(255, 255, 255, 0.25)' },
  headerButtonText: { fontSize: 14, color: colors.text },
  playerArea: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  videoContainer: { width: '90%', maxWidth: 1200, aspectRatio: 16 / 9, borderRadius: borderRadius.xl, overflow: 'hidden', position: 'relative' },
  videoInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg },
  videoTitle: { fontSize: 24, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  videoCategory: { fontSize: 16, color: colors.textSecondary },
  radioContainer: { alignItems: 'center', padding: spacing.xl, borderRadius: borderRadius.xl },
  radioVisual: { width: 200, height: 200, marginBottom: spacing.lg, position: 'relative' },
  radioImage: { width: '100%', height: '100%', borderRadius: 100 },
  radioWaves: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  wave: { position: 'absolute', width: '100%', height: '100%', borderRadius: 100, borderWidth: 2, borderColor: '#fbbf24' },
  radioTitle: { fontSize: 24, fontWeight: '600', color: colors.text },
  noContent: { padding: spacing.xl },
  noContentText: { fontSize: 18, color: colors.textSecondary },
  playlistBar: { padding: spacing.md, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl },
  playlistScroll: { gap: spacing.md, paddingBottom: spacing.sm },
  playlistItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: borderRadius.lg, padding: spacing.sm, paddingRight: spacing.md, minWidth: 200 },
  playlistItemActive: { backgroundColor: 'rgba(251, 191, 36, 0.2)', borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.5)' },
  playlistThumb: { width: 48, height: 48, borderRadius: borderRadius.md },
  playlistInfo: { flex: 1, gap: spacing.xs },
  playlistTitle: { fontSize: 14, fontWeight: '500', color: colors.text },
  playlistType: { fontSize: 12, color: colors.textSecondary },
  playingIndicator: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#f59e0b' },
  navControls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.lg, marginTop: spacing.sm },
  navButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center' },
  navButtonDisabled: { opacity: 0.5 },
  navCounter: { fontSize: 14, color: colors.textSecondary },
});
