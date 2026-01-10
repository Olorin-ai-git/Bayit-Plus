/**
 * FlowCarouselCard Component
 * Compact vertical flow card optimized for horizontal carousels
 * Supports TV focus states and webapp hover effects
 */

import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Clock, Sparkles, Play, List } from 'lucide-react';
import LinearGradient from 'react-native-web-linear-gradient';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassView, GlassBadge } from '@bayit/shared/ui';
import { isTV } from '@bayit/shared/utils/platform';
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

const DEFAULT_GRADIENT = { colors: ['#00D9FF', '#0099CC'], bg: 'rgba(0, 217, 255, 0.15)' };

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
          isFocused && styles.focusedShadow,
        ]}
      >
        <GlassView
          style={[
            styles.card,
            { width: cardWidth, height: cardHeight, backgroundColor: gradient.bg },
            isFocused && styles.cardFocused,
          ]}
          intensity="medium"
        >
          {/* Flow Icon */}
          <LinearGradient
            colors={gradient.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.iconContainer, { width: iconSize, height: iconSize, borderRadius: iconSize / 4 }]}
          >
            <Play size={iconSize * 0.5} color="#fff" fill="#fff" />
          </LinearGradient>

          {/* System Badge */}
          {flow.flow_type === 'system' && (
            <View style={[styles.systemBadge, isRTL && styles.systemBadgeRTL]}>
              <GlassBadge variant="primary" size="sm">
                {t('flows.system')}
              </GlassBadge>
            </View>
          )}

          {/* Flow Title */}
          <Text
            style={[styles.title, { fontSize: titleSize }, isRTL && styles.textRTL]}
            numberOfLines={2}
          >
            {localizedName}
          </Text>

          {/* Trigger Time */}
          <View style={[styles.metaRow, isRTL && styles.metaRowRTL]}>
            <Clock size={metaSize} color={colors.textMuted} />
            <Text style={[styles.metaText, { fontSize: metaSize }]}>
              {triggerDisplay}
            </Text>
          </View>

          {/* Feature Badges */}
          <View style={[styles.badges, isRTL && styles.badgesRTL]}>
            {flow.ai_enabled && (
              <View style={styles.badge}>
                <Sparkles size={12} color={colors.warning} />
                <Text style={styles.badgeText}>AI</Text>
              </View>
            )}
            {flow.ai_brief_enabled && (
              <View style={styles.badge}>
                <Sparkles size={12} color={colors.info} />
                <Text style={styles.badgeText}>{t('flows.brief')}</Text>
              </View>
            )}
            {flow.auto_play && (
              <View style={styles.badge}>
                <Play size={12} color={colors.primary} />
                <Text style={styles.badgeText}>{t('flows.auto')}</Text>
              </View>
            )}
            {flow.items.length > 0 && (
              <View style={styles.badge}>
                <List size={12} color={colors.textMuted} />
                <Text style={styles.badgeText}>{flow.items.length}</Text>
              </View>
            )}
          </View>
        </GlassView>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: isTV ? spacing.lg : spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'flex-start',
    // @ts-ignore - Web transition
    transition: 'all 0.2s ease',
  },
  cardFocused: {
    borderColor: colors.primary,
  },
  focusedShadow: {
    // @ts-ignore - Web shadow
    boxShadow: '0 12px 32px rgba(0, 217, 255, 0.4)',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },
  systemBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  systemBadgeRTL: {
    right: 'auto' as any,
    left: spacing.sm,
  },
  title: {
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: isTV ? 30 : 24,
  },
  textRTL: {
    textAlign: 'right',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.full,
  },
  metaRowRTL: {
    flexDirection: 'row-reverse',
  },
  metaText: {
    color: colors.textMuted,
    fontWeight: '500',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'center',
    marginTop: 'auto' as any,
    paddingTop: spacing.sm,
  },
  badgesRTL: {
    flexDirection: 'row-reverse',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
});

export default FlowCarouselCard;
