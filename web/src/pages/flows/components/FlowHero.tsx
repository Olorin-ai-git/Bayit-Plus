/**
 * FlowHero Component
 * Large cinematic hero section for active/running flows
 * Displays flow info, progress, and action buttons
 */

import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Play, SkipForward, RefreshCw, Pause } from 'lucide-react';
import LinearGradient from 'react-native-web-linear-gradient';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassView, GlassButton, GlassProgressBar, GlassBadge } from '@bayit/shared/ui';
import { isTV } from '@bayit/shared-utils/platform';
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

const DEFAULT_GRADIENT = ['#a855f7', '#7c3aed'];

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
    <Animated.View
      className={`relative overflow-hidden rounded-2xl ${isTV ? 'mx-16 mb-16' : 'mx-6 mb-6'}`}
      style={{ height: heroHeight as any, opacity: fadeAnim }}
    >
      {/* Background Gradient */}
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="absolute inset-0"
      />

      {/* Dark Overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0, 0, 0, 0.5)', 'rgba(0, 0, 0, 0.9)']}
        className="absolute inset-0"
      />

      {/* Content */}
      <View className={`relative flex-1 justify-end ${isTV ? 'p-16' : 'p-6'} ${isRTL ? 'items-end' : ''}`}>
        {/* Active Badge */}
        <View className={`flex-row mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <GlassBadge variant="success" size="default">
            <View className="w-2 h-2 rounded-full bg-green-500 mr-1" />
            <Text className="text-sm font-semibold text-white">
              {isRunning ? t('flows.hero.playing') : t('flows.hero.activeNow')}
            </Text>
          </GlassBadge>
        </View>

        {/* Title */}
        <Text
          className="font-extrabold text-white mb-2"
          style={{ fontSize: titleSize, textAlign, lineHeight: isTV ? 68 : 44, letterSpacing: -1 }}
        >
          {localizedName}
        </Text>

        {/* Description */}
        {localizedDescription && (
          <Text
            className="text-white/80 mb-3"
            style={{ fontSize: subtitleSize, textAlign, lineHeight: isTV ? 36 : 28, maxWidth: isTV ? '70%' : '100%' }}
            numberOfLines={2}
          >
            {localizedDescription}
          </Text>
        )}

        {/* Meta Info */}
        <View className={`flex-row items-center mb-4 gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Text className="text-white/90 font-medium" style={{ fontSize: metaSize }}>
            {triggerDisplay}
          </Text>
          {flow.auto_play && (
            <>
              <Text className="text-white/50" style={{ fontSize: metaSize }}>•</Text>
              <Text className="text-white/90 font-medium" style={{ fontSize: metaSize }}>
                {t('flows.autoPlay')}
              </Text>
            </>
          )}
          {flow.ai_enabled && (
            <>
              <Text className="text-white/50" style={{ fontSize: metaSize }}>•</Text>
              <Text className="text-white/90 font-medium" style={{ fontSize: metaSize }}>
                AI {t('common.enabled')}
              </Text>
            </>
          )}
        </View>

        {/* Progress Bar */}
        {progress && (
          <View className="mb-4" style={{ maxWidth: isTV ? 600 : '100%' }}>
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
        <View className={`flex-row gap-3 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
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
            style={{ minWidth: isTV ? 200 : 140 }}
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
      <View className="absolute opacity-50" style={{ top: isTV ? 80 : 40, right: isTV ? 80 : 40, transform: 'rotate(-15deg)' }}>
        <Play size={isTV ? 120 : 80} color="rgba(255, 255, 255, 0.1)" fill="rgba(255, 255, 255, 0.1)" />
      </View>
    </Animated.View>
  );
}

export default FlowHero;
