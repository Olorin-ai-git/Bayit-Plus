/**
 * ContentTypePills Component
 *
 * Pill-style buttons for filtering by content type (All, VOD, Live, etc.)
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassButton } from '@bayit/glass';
import type { ContentType } from './SearchControls';
import { colors, borderRadius, spacing } from '../../theme/colors';

// Platform-specific touch target sizes
const TOUCH_TARGET_SIZE = Platform.select({
  ios: 44,
  android: 44,
  default: Platform.isTV ? 80 : 44,
});

interface ContentTypePillsProps {
  /** Currently selected content type */
  selected: ContentType;
  /** Callback when content type changes */
  onChange: (type: ContentType) => void;
}

const CONTENT_TYPES: { type: ContentType; label: string; emoji: string }[] = [
  { type: 'all', label: 'all', emoji: '🎬' },
  { type: 'vod', label: 'vod', emoji: '📺' },
  { type: 'live', label: 'live', emoji: '📡' },
  { type: 'radio', label: 'radio', emoji: '📻' },
  { type: 'podcast', label: 'podcast', emoji: '🎙️' },
];

/**
 * Horizontal scrollable pills for content type filtering
 */
export function ContentTypePills({ selected, onChange }: ContentTypePillsProps) {
  const { t } = useTranslation('search');
  const [focusedType, setFocusedType] = React.useState<ContentType | null>(null);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {CONTENT_TYPES.map(({ type, label, emoji }) => {
        const isSelected = selected === type;
        const isFocused = focusedType === type;

        return (
          <GlassButton
            key={type}
            variant={isSelected ? 'primary' : 'ghost'}
            style={[
              styles.pill,
              isSelected && styles.pillActive,
              isFocused && Platform.isTV && styles.pillFocused,
            ]}
            onPress={() => onChange(type)}
            onFocus={() => setFocusedType(type)}
            onBlur={() => setFocusedType(null)}
            focusable={Platform.isTV}
            hasTVPreferredFocus={isSelected && Platform.isTV}
            accessibilityLabel={t(`controls.contentTypes.${label}`)}
            accessibilityState={{ selected: isSelected }}
          >
            <Text style={styles.emoji}>{emoji}</Text>
            <Text style={[styles.label, isSelected && styles.labelActive]}>
              {t(`controls.contentTypes.${label}`)}
            </Text>
          </GlassButton>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: TOUCH_TARGET_SIZE,
    borderRadius: 20,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pillActive: {
    backgroundColor: colors.pillActive,
    borderColor: colors.pillActiveBorder,
  },
  pillFocused: {
    borderWidth: 2,
    borderColor: colors.primary,
    transform: [{ scale: 1.05 }],
  },
  emoji: {
    fontSize: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  labelActive: {
    color: colors.text,
    fontWeight: '600',
  },
});
