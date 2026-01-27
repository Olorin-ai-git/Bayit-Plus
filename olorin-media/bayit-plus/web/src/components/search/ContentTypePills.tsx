/**
 * ContentTypePills Component
 *
 * Pill-style buttons for filtering by content type (All, VOD, Live, etc.)
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassButton } from '../../../../shared/components/ui/GlassButton';
import { NativeIcon } from '@olorin/shared-icons/native';
import type { ContentType } from './SearchControls';
import { colors, borderRadius, spacing } from '@olorin/design-tokens';

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

const CONTENT_TYPES: { type: ContentType; label: string; icon: string }[] = [
  { type: 'all', label: 'all', icon: 'vod' },
  { type: 'vod', label: 'vod', icon: 'vod' },
  { type: 'live', label: 'live', icon: 'live' },
  { type: 'radio', label: 'radio', icon: 'radio' },
  { type: 'podcast', label: 'podcast', icon: 'podcasts' },
];

/**
 * Horizontal scrollable pills for content type filtering
 */
export function ContentTypePills({ selected, onChange }: ContentTypePillsProps) {
  const { t } = useTranslation();
  const [focusedType, setFocusedType] = React.useState<ContentType | null>(null);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {CONTENT_TYPES.map(({ type, label, icon }) => {
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
            accessibilityLabel={t(`search.controls.contentTypes.${label}`)}
            accessibilityState={{ selected: isSelected }}
          >
            <NativeIcon
              name={icon}
              size="sm"
              color={isSelected ? colors.text : colors.textSecondary}
            />
            <Text style={[styles.label, isSelected && styles.labelActive]}>
              {t(`search.controls.contentTypes.${label}`)}
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
    borderColor: colors.primary.DEFAULT,
    transform: [{ scale: 1.05 }],
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
