/**
 * FlowHero Component
 * Large cinematic hero section for active/running flows
 * Displays flow info, progress, and action buttons
 */

import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Play, SkipForward, RefreshCw, Pause } from 'lucide-react';
import LinearGradient from 'react-native-web-linear-gradient';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassView, GlassButton, GlassProgressBar, GlassBadge } from '@bayit/shared/ui';
import { isTV } from '@bayit/shared/utils/platform';
import { useDirection } from '@/hooks/useDirection';
import type { Flow } from '../types/flows.types';
import { getLocalizedName, getLocalizedDescription, formatTriggerTime } from '../utils/flowHelpers';

// Flow gradient configurations
const FLOW_GRADIENTS: Record<string, string[]> = {
  'טקס בוקר': ['#FF9500', '#FF6B00'],
  'Morning Ritual': ['#FF9500', '#FF6B00'],
  'ליל שבת': ['#5856D6', '#8B5CF6'],
  'Shabbat Evening': ['#5856D6', '#8B5CF6'],
  'שעת שינה': ['#1A1A2E', '#4A4A8A'],
  'Sleep Time': ['#1A1A2E', '#4A4A8A'],
  'זמן ילדים': ['#FF2D55', '#FF6B9D'],
  'Kids Time': ['#FF2D55', '#FF6B9D'],
};

const DEFAULT_GRADIENT = ['#00D9FF', '#0099CC'];

interface FlowHeroProgress {
  currentIndex: number;
  total: number;
  isPlaying?: boolean;
}

interface FlowHeroProps {
  flow: Flow;
  isRunning?: boolean;
  progress?: FlowHeroProgress | null;
  onContinue?: () => void;
  onSkip?: () => void;
  onRestart?: () => void;
  onPause?: () => void;
}

export function FlowHero({
  flow,
  isRunning = false,
  progress,
  onContinue,
  onSkip,
  onRestart,
  onPause,
}: FlowHeroProps) {
  const { t, i18n } = useTranslation();
  const { isRTL, flexDirection, textAlign } = useDirection();
  const [focusedButton, setFocusedButton] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const gradient = FLOW_GRADIENTS[flow.name] || FLOW_GRADIENTS[flow.name_en || ''] || DEFAULT_GRADIENT;
  const localizedName = getLocalizedName(flow, i18n.language);
  const localizedDescription = getLocalizedDescription(flow, i18n.language);
  const triggerDisplay = flow.triggers.length > 0
    ? formatTriggerTime(flow.triggers[0], t)
    : t('flows.manual');

  // Calculate progress percentage
  const progressPercent = progress
    ? (progress.currentIndex / progress.total) * 100
    : 0;

  // Fade in animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Dimensions based on platform
  const heroHeight = isTV ? '70vh' : 400;
  const titleSize = isTV ? 56 : 36;
  const subtitleSize = isTV ? 24 : 18;
  const metaSize = isTV ? 18 : 14;
  const buttonSize = isTV ? 'lg' : 'md';

  return (
    <Animated.View style={[styles.container, { height: heroHeight as any, opacity: fadeAnim }]}>
      {/* Background Gradient */}
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backdrop}
      />

      {/* Dark Overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0, 0, 0, 0.5)', 'rgba(0, 0, 0, 0.9)']}
        style={styles.overlay}
      />

      {/* Content */}
      <View style={[styles.content, isRTL && styles.contentRTL]}>
        {/* Active Badge */}
        <View style={[styles.badgeContainer, { flexDirection }]}>
          <GlassBadge variant="success" size="default">
            <View style={styles.activeDot} />
            <Text style={styles.badgeText}>
              {isRunning ? t('flows.hero.playing') : t('flows.hero.activeNow')}
            </Text>
          </GlassBadge>
        </View>

        {/* Title */}
        <Text style={[styles.title, { fontSize: titleSize, textAlign }]}>
          {localizedName}
        </Text>

        {/* Description */}
        {localizedDescription && (
          <Text style={[styles.description, { fontSize: subtitleSize, textAlign }]} numberOfLines={2}>
            {localizedDescription}
          </Text>
        )}

        {/* Meta Info */}
        <View style={[styles.meta, { flexDirection }]}>
          <Text style={[styles.metaText, { fontSize: metaSize }]}>
            {triggerDisplay}
          </Text>
          {flow.auto_play && (
            <>
              <Text style={[styles.metaDivider, { fontSize: metaSize }]}>•</Text>
              <Text style={[styles.metaText, { fontSize: metaSize }]}>
                {t('flows.autoPlay')}
              </Text>
            </>
          )}
          {flow.ai_enabled && (
            <>
              <Text style={[styles.metaDivider, { fontSize: metaSize }]}>•</Text>
              <Text style={[styles.metaText, { fontSize: metaSize }]}>
                AI {t('common.enabled')}
              </Text>
            </>
          )}
        </View>

        {/* Progress Bar */}
        {progress && (
          <View style={styles.progressContainer}>
            <GlassProgressBar
              progress={progressPercent}
              current={progress.currentIndex}
              total={progress.total}
              showSegments={progress.total <= 10}
              showLabel
              size="md"
              variant="gradient"
              isRTL={isRTL}
            />
          </View>
        )}

        {/* Action Buttons */}
        <View style={[styles.actions, { flexDirection }]}>
          {/* Primary Action: Continue or Play/Pause */}
          <GlassButton
            title={isRunning && progress?.isPlaying ? t('flows.hero.pause') : t('flows.hero.continueFlow')}
            icon={isRunning && progress?.isPlaying
              ? <Pause size={isTV ? 24 : 20} color="#000" />
              : <Play size={isTV ? 24 : 20} color="#000" />}
            variant="primary"
            size={buttonSize as any}
            onPress={isRunning && progress?.isPlaying ? onPause : onContinue}
            hasTVPreferredFocus
            style={styles.primaryBtn}
          />

          {/* Skip Today */}
          {!isRunning && (
            <GlassButton
              title={t('flows.hero.skipToday')}
              icon={<SkipForward size={isTV ? 20 : 16} color={colors.text} />}
              variant="ghost"
              size={buttonSize as any}
              onPress={onSkip}
            />
          )}

          {/* Restart */}
          {isRunning && (
            <GlassButton
              title={t('flows.hero.restart')}
              icon={<RefreshCw size={isTV ? 20 : 16} color={colors.text} />}
              variant="ghost"
              size={buttonSize as any}
              onPress={onRestart}
            />
          )}
        </View>
      </View>

      {/* Play Icon Overlay (decorative) */}
      <View style={styles.decorativeIcon}>
        <Play size={isTV ? 120 : 80} color="rgba(255, 255, 255, 0.1)" fill="rgba(255, 255, 255, 0.1)" />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginHorizontal: isTV ? spacing.xl * 2 : spacing.lg,
    marginBottom: isTV ? spacing.xl * 2 : spacing.xl,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    position: 'relative',
    flex: 1,
    padding: isTV ? spacing.xl * 2 : spacing.xl,
    justifyContent: 'flex-end',
  },
  contentRTL: {
    alignItems: 'flex-end',
  },
  badgeContainer: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: spacing.xs,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  title: {
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.sm,
    lineHeight: isTV ? 68 : 44,
    letterSpacing: -1,
  },
  description: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: spacing.md,
    lineHeight: isTV ? 36 : 28,
    maxWidth: isTV ? '70%' : '100%',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  metaText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  metaDivider: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  progressContainer: {
    marginBottom: spacing.lg,
    maxWidth: isTV ? 600 : '100%',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  primaryBtn: {
    minWidth: isTV ? 200 : 140,
  },
  decorativeIcon: {
    position: 'absolute',
    top: isTV ? 80 : 40,
    right: isTV ? 80 : 40,
    opacity: 0.5,
    // @ts-ignore - Web transform
    transform: 'rotate(-15deg)',
  },
});

export default FlowHero;
