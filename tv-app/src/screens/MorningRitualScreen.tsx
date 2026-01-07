import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Video from 'react-native-video';
import { GlassView } from '../components';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { ritualService } from '../services/api';
import { isTV } from '../utils/platform';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PlaylistItem {
  id: string;
  title: string;
  type: 'live' | 'radio' | 'vod';
  stream_url?: string;
  thumbnail?: string;
  duration_hint?: number;
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

/**
 * MorningRitualScreen for TV App
 * Full-screen morning ritual experience optimized for D-pad navigation.
 */
export default function MorningRitualScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [ritualData, setRitualData] = useState<RitualData | null>(null);
  const [aiBrief, setAIBrief] = useState<AIBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBrief, setShowBrief] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [focusedButton, setFocusedButton] = useState<string>('start');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const sunAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(sunAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    fetchRitualData();
  }, []);

  const fetchRitualData = async () => {
    try {
      const [checkResult, briefResult] = await Promise.all([
        ritualService.check(),
        ritualService.getAIBrief(),
      ]) as [any, any];

      setRitualData(checkResult);
      setAIBrief(briefResult);

      // Auto-hide brief after 6 seconds on TV
      setTimeout(() => {
        setShowBrief(false);
        if (checkResult.playlist?.length) {
          setIsPlaying(true);
        }
      }, 6000);
    } catch (err) {
      console.error('Failed to fetch ritual data:', err);
      handleExit();
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      await ritualService.skipToday();
    } catch (err) {
      console.error('Failed to skip ritual:', err);
    }
    handleExit();
  };

  const handleExit = () => {
    navigation.navigate('Home' as never);
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
          <Animated.Text
            style={[
              styles.loadingEmoji,
              { transform: [{ scale: sunAnim }] },
            ]}
          >
            ☀️
          </Animated.Text>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>{t('ritual.preparingRitual')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Gradient Background */}
      <View style={styles.gradientBg}>
        <View style={styles.gradientOverlay} />
      </View>

      {/* AI Brief Overlay */}
      {showBrief && aiBrief && (
        <Animated.View
          style={[
            styles.briefOverlay,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Animated.Text
            style={[
              styles.briefEmoji,
              { transform: [{ scale: sunAnim }] },
            ]}
          >
            ☀️
          </Animated.Text>

          <Text style={styles.briefGreeting}>{aiBrief.greeting}</Text>
          <Text style={styles.briefIsrael}>{aiBrief.israel_update}</Text>
          <Text style={styles.briefRecommendation}>{aiBrief.recommendation}</Text>

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
              <GlassView style={styles.shabbatBadge} intensity="medium">
                <Text style={styles.contextIcon}>🕯️</Text>
                <Text style={styles.shabbatText}>{t('clock.shabbatShalom')}</Text>
              </GlassView>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.startButton,
              focusedButton === 'start' && styles.buttonFocused,
            ]}
            onPress={() => setShowBrief(false)}
            onFocus={() => setFocusedButton('start')}
          >
            <Text style={styles.startButtonText}>{t('ritual.letsStart')}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Main Content */}
      {!showBrief && (
        <View style={styles.mainContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.ritualTitle}>{t('ritual.title')}</Text>
              <Text style={styles.ritualTime}>{ritualData?.local_time}</Text>
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity
                style={[
                  styles.headerButton,
                  focusedButton === 'skip' && styles.buttonFocused,
                ]}
                onPress={handleSkip}
                onFocus={() => setFocusedButton('skip')}
              >
                <Text style={styles.headerButtonText}>{t('ritual.skipToday')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.headerButton,
                  styles.exitButton,
                  focusedButton === 'exit' && styles.buttonFocused,
                ]}
                onPress={handleExit}
                onFocus={() => setFocusedButton('exit')}
              >
                <Text style={styles.headerButtonText}>{t('ritual.finish')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Player Area */}
          <View style={styles.playerArea}>
            {currentItem?.type === 'live' || currentItem?.type === 'vod' ? (
              <View style={styles.videoContainer}>
                {currentItem.stream_url && (
                  <Video
                    source={{ uri: currentItem.stream_url }}
                    style={styles.video}
                    resizeMode="cover"
                    paused={!isPlaying}
                    onEnd={handleNextItem}
                  />
                )}
                <GlassView style={styles.videoInfo} intensity="medium">
                  <Text style={styles.videoTitle}>{currentItem.title}</Text>
                  <Text style={styles.videoCategory}>{currentItem.category}</Text>
                </GlassView>
              </View>
            ) : currentItem?.type === 'radio' ? (
              <GlassView style={styles.radioContainer} intensity="medium">
                <View style={styles.radioVisual}>
                  {currentItem.thumbnail && (
                    <Image
                      source={{ uri: currentItem.thumbnail }}
                      style={styles.radioImage}
                    />
                  )}
                  <View style={styles.radioWaves}>
                    <Animated.View style={[styles.wave, { opacity: 0.8 }]} />
                    <Animated.View style={[styles.wave, { opacity: 0.5 }]} />
                    <Animated.View style={[styles.wave, { opacity: 0.3 }]} />
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

          {/* Playlist Bar */}
          <GlassView style={styles.playlistBar} intensity="light">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.playlistScroll}
            >
              {ritualData?.playlist?.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.playlistItem,
                    index === currentIndex && styles.playlistItemActive,
                    focusedButton === `item-${index}` && styles.buttonFocused,
                  ]}
                  onPress={() => setCurrentIndex(index)}
                  onFocus={() => setFocusedButton(`item-${index}`)}
                >
                  {item.thumbnail && (
                    <Image
                      source={{ uri: item.thumbnail }}
                      style={styles.playlistThumb}
                    />
                  )}
                  <View style={styles.playlistInfo}>
                    <Text style={styles.playlistTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.playlistType}>
                      {item.type === 'live' ? `🔴 ${t('ritual.typeLive')}` :
                       item.type === 'radio' ? `📻 ${t('ritual.typeRadio')}` : `🎬 ${t('ritual.typeVideo')}`}
                    </Text>
                  </View>
                  {index === currentIndex && (
                    <View style={styles.playingIndicator} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.navControls}>
              <TouchableOpacity
                style={[
                  styles.navButton,
                  focusedButton === 'prev' && styles.buttonFocused,
                ]}
                onPress={handlePreviousItem}
                onFocus={() => setFocusedButton('prev')}
                disabled={currentIndex === 0}
              >
                <Text style={styles.navButtonText}>←</Text>
              </TouchableOpacity>

              <Text style={styles.navCounter}>
                {currentIndex + 1} / {ritualData?.playlist?.length || 0}
              </Text>

              <TouchableOpacity
                style={[
                  styles.navButton,
                  focusedButton === 'next' && styles.buttonFocused,
                ]}
                onPress={handleNextItem}
                onFocus={() => setFocusedButton('next')}
                disabled={currentIndex >= (ritualData?.playlist?.length || 0) - 1}
              >
                <Text style={styles.navButtonText}>→</Text>
              </TouchableOpacity>
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
  gradientBg: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientOverlay: {
    flex: 1,
    backgroundColor: 'rgba(49, 46, 129, 0.5)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingEmoji: {
    fontSize: isTV ? 80 : 64,
    marginBottom: spacing.lg,
  },
  loadingText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  briefOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: spacing.xl,
  },
  briefEmoji: {
    fontSize: isTV ? 100 : 80,
    marginBottom: spacing.xl,
  },
  briefGreeting: {
    fontSize: isTV ? 48 : 36,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  briefIsrael: {
    fontSize: isTV ? 24 : 20,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  briefRecommendation: {
    fontSize: isTV ? 20 : 18,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  israelContext: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    marginBottom: spacing.xl,
    flexWrap: 'wrap',
  },
  contextItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  contextIcon: {
    fontSize: isTV ? 32 : 24,
  },
  contextLabel: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  contextValue: {
    fontSize: isTV ? 22 : 18,
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
    backgroundColor: '#f59e0b',
    paddingHorizontal: isTV ? 60 : 48,
    paddingVertical: isTV ? 20 : 16,
    borderRadius: borderRadius.full,
  },
  startButtonText: {
    fontSize: isTV ? 22 : 18,
    fontWeight: '600',
    color: '#1e1b4b',
  },
  buttonFocused: {
    borderWidth: 3,
    borderColor: colors.primary,
    transform: [{ scale: 1.05 }],
  },
  mainContent: {
    flex: 1,
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
  ritualTitle: {
    fontSize: isTV ? 24 : 20,
    fontWeight: '600',
    color: colors.text,
  },
  ritualTime: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  headerRight: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  exitButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  headerButtonText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  playerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  videoContainer: {
    width: '90%',
    aspectRatio: 16 / 9,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
  },
  videoTitle: {
    fontSize: isTV ? 28 : 24,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  videoCategory: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  radioContainer: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
  },
  radioVisual: {
    width: isTV ? 250 : 200,
    height: isTV ? 250 : 200,
    marginBottom: spacing.lg,
    position: 'relative',
  },
  radioImage: {
    width: '100%',
    height: '100%',
    borderRadius: 125,
  },
  radioWaves: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wave: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 150,
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  radioTitle: {
    fontSize: isTV ? 28 : 24,
    fontWeight: '600',
    color: colors.text,
  },
  noContent: {
    padding: spacing.xl,
  },
  noContentText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
  },
  playlistBar: {
    padding: spacing.md,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  playlistScroll: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    paddingRight: spacing.md,
    minWidth: isTV ? 250 : 200,
  },
  playlistItemActive: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.5)',
  },
  playlistThumb: {
    width: isTV ? 60 : 48,
    height: isTV ? 60 : 48,
    borderRadius: borderRadius.md,
  },
  playlistInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  playlistTitle: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
  },
  playlistType: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  playingIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f59e0b',
  },
  navControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  navButton: {
    width: isTV ? 50 : 40,
    height: isTV ? 50 : 40,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: isTV ? 24 : 18,
    color: colors.text,
  },
  navCounter: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
});
