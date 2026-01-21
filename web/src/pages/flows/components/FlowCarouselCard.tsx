/**
 * FlowCarouselCard Component
 * Compact vertical flow card optimized for horizontal carousels
 * Supports TV focus states and webapp hover effects
 */

import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Clock, Sparkles, Play, List } from 'lucide-react';
import LinearGradient from 'react-native-web-linear-gradient';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassView, GlassBadge } from '@bayit/shared/ui';
import { isTV } from '@bayit/shared-utils/platform';
import type { Flow } from '../types/flows.types';
import { getLocalizedName, formatTriggerTime } from '../utils/flowHelpers';

// Flow icon gradient configurations by name
const FLOW_GRADIENTS: Record<string, { colors: string[]; bg: string }> = {
  'טקס בוקר': { colors: ['#FF9500', '#FF6B00'], bg: 'rgba(255, 149, 0, 0.15)' },
  'Morning Ritual': { colors: ['#FF9500', '#FF6B00'], bg: 'rgba(255, 149, 0, 0.15)' },
  'ליל שבת': { colors: ['#5856D6', '#8B5CF6'], bg: 'rgba(88, 86, 214, 0.15)' },
  'Shabbat Evening': { colors: ['#5856D6', '#8B5CF6'], bg: 'rgba(88, 86, 214, 0.15)' },
  'שעת שינה': { colors: ['#1A1A2E', '#4A4A8A'], bg: 'rgba(74, 74, 138, 0.15)' },
  'Sleep Time': { colors: ['#1A1A2E', '#4A4A8A'], bg: 'rgba(74, 74, 138, 0.15)' },
  'זמן ילדים': { colors: ['#FF2D55', '#FF6B9D'], bg: 'rgba(255, 45, 85, 0.15)' },
  'Kids Time': { colors: ['#FF2D55', '#FF6B9D'], bg: 'rgba(255, 45, 85, 0.15)' },
};

const DEFAULT_GRADIENT = { colors: ['#a855f7', '#7c3aed'], bg: 'rgba(107, 33, 168, 0.3)' };

interface FlowCarouselCardProps {
  flow: Flow;
  onPress: () => void;
  isRTL?: boolean;
  isFocused?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  hasTVPreferredFocus?: boolean;
}

export function FlowCarouselCard({
  flow,
  onPress,
  isRTL = false,
  isFocused: externalFocused,
  onFocus,
  onBlur,
  hasTVPreferredFocus = false,
}: FlowCarouselCardProps) {
  const { t, i18n } = useTranslation();
  const [internalFocused, setInternalFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const isFocused = externalFocused !== undefined ? externalFocused : internalFocused;
  const gradient = FLOW_GRADIENTS[flow.name] || FLOW_GRADIENTS[flow.name_en || ''] || DEFAULT_GRADIENT;

  const localizedName = getLocalizedName(flow, i18n.language);
  const triggerDisplay = flow.triggers.length > 0
    ? formatTriggerTime(flow.triggers[0], t)
    : t('flows.manual');

  // Animate scale on focus
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isFocused ? 1.08 : 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  }, [isFocused, scaleAnim]);

  const handleFocus = () => {
    setInternalFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setInternalFocused(false);
    onBlur?.();
  };

  // Card sizes based on platform
  const cardWidth = isTV ? 280 : 220;
  const cardHeight = isTV ? 360 : 300;
  const iconSize = isTV ? 80 : 64;
  const titleSize = isTV ? 22 : 18;
  const metaSize = isTV ? 14 : 12;

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      activeOpacity={0.9}
      // @ts-ignore - TV prop
      hasTVPreferredFocus={hasTVPreferredFocus}
    >
      <Animated.View
        style={[
          { transform: [{ scale: scaleAnim }] },
          isFocused && { boxShadow: '0 12px 32px rgba(168, 85, 247, 0.4)' },
        ]}
      >
        <GlassView
          className={`items-center justify-start border-2 ${
            isFocused ? 'border-purple-600 border-[3px]' : 'border-transparent'
          } ${isTV ? 'p-4 rounded-2xl' : 'p-3 rounded-2xl'}`}
          style={{ width: cardWidth, height: cardHeight, backgroundColor: gradient.bg }}
          intensity="medium"
        >
          {/* Flow Icon */}
          <LinearGradient
            colors={gradient.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="justify-center items-center mb-4 mt-2"
            style={{ width: iconSize, height: iconSize, borderRadius: iconSize / 4 }}
          >
            <Play size={iconSize * 0.5} color="#fff" fill="#fff" />
          </LinearGradient>

          {/* System Badge */}
          {flow.flow_type === 'system' && (
            <View className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'}`}>
              <GlassBadge variant="primary" size="sm">
                {t('flows.system')}
              </GlassBadge>
            </View>
          )}

          {/* Flow Title */}
          <Text
            className={`font-bold text-white text-center mb-2 ${isRTL ? 'text-right' : ''}`}
            style={{ fontSize: titleSize, lineHeight: isTV ? 30 : 24 }}
            numberOfLines={2}
          >
            {localizedName}
          </Text>

          {/* Trigger Time */}
          <View className={`flex-row items-center gap-1 mb-3 px-2 py-1 bg-white/10 rounded-full ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Clock size={metaSize} color={colors.textMuted} />
            <Text className="text-gray-400 font-medium" style={{ fontSize: metaSize }}>
              {triggerDisplay}
            </Text>
          </View>

          {/* Feature Badges */}
          <View className={`flex-row flex-wrap gap-1 justify-center mt-auto pt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {flow.ai_enabled && (
              <View className="flex-row items-center gap-1 px-2 py-1 bg-white/10 rounded-full">
                <Sparkles size={12} color={colors.warning} />
                <Text className="text-xs font-semibold text-gray-400">AI</Text>
              </View>
            )}
            {flow.ai_brief_enabled && (
              <View className="flex-row items-center gap-1 px-2 py-1 bg-white/10 rounded-full">
                <Sparkles size={12} color={colors.info} />
                <Text className="text-xs font-semibold text-gray-400">{t('flows.brief')}</Text>
              </View>
            )}
            {flow.auto_play && (
              <View className="flex-row items-center gap-1 px-2 py-1 bg-white/10 rounded-full">
                <Play size={12} color={colors.primary} />
                <Text className="text-xs font-semibold text-gray-400">{t('flows.auto')}</Text>
              </View>
            )}
            {flow.items.length > 0 && (
              <View className="flex-row items-center gap-1 px-2 py-1 bg-white/10 rounded-full">
                <List size={12} color={colors.textMuted} />
                <Text className="text-xs font-semibold text-gray-400">{flow.items.length}</Text>
              </View>
            )}
          </View>
        </GlassView>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default FlowCarouselCard;
