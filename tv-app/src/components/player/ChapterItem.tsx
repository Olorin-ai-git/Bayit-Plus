import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, borderRadius, spacing } from '../../theme';
import { isTV } from '../../utils/platform';

export interface Chapter {
  id?: string;
  title: string;
  start_time: number;
  end_time: number;
  category: string;
  summary?: string;
}

interface ChapterItemProps {
  chapter: Chapter;
  isActive: boolean;
  onPress: () => void;
  hasTVPreferredFocus?: boolean;
}

// Category colors matching web app
const categoryColors: Record<string, string> = {
  intro: '#a855f7',     // blue
  news: '#ef4444',      // red
  security: '#f97316',  // orange
  politics: '#a855f7',  // purple
  economy: '#22c55e',   // green
  sports: '#eab308',    // yellow
  weather: '#06b6d4',   // cyan
  culture: '#ec4899',   // pink
  conclusion: '#6b7280', // gray
  flashback: '#6366f1', // indigo
  journey: '#14b8a6',   // teal
  climax: '#f43f5e',    // rose
  setup: '#f59e0b',     // amber
  action: '#dc2626',    // red-600
  conflict: '#ea580c',  // orange-600
  cliffhanger: '#8b5cf6', // violet
  main: '#2563eb',      // blue-600
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const ChapterItem: React.FC<ChapterItemProps> = ({
  chapter,
  isActive,
  onPress,
  hasTVPreferredFocus = false,
}) => {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const categoryColor = categoryColors[chapter.category] || colors.primary;

  const handleFocus = () => {
    setIsFocused(true);
    if (isTV || Platform.OS !== 'web') {
      Animated.spring(scaleAnim, {
        toValue: 1.02,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (isTV || Platform.OS !== 'web') {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      activeOpacity={0.8}
      // @ts-ignore - TV-specific prop
      hasTVPreferredFocus={hasTVPreferredFocus}
    >
      <Animated.View
        style={[
          styles.container,
          isActive && styles.containerActive,
          isFocused && styles.containerFocused,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Category indicator bar */}
        <View style={[styles.categoryBar, { backgroundColor: categoryColor }]} />

        <View style={styles.content}>
          {/* Title and time row */}
          <View style={styles.titleRow}>
            <Text
              style={[styles.title, isActive && styles.titleActive]}
              numberOfLines={1}
            >
              {chapter.title}
            </Text>
            <Text style={styles.time}>{formatTime(chapter.start_time)}</Text>
          </View>

          {/* Category badge row */}
          <View style={styles.badgeRow}>
            <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}33` }]}>
              <Text style={[styles.categoryText, { color: categoryColor }]}>
                {t(`chapters.categories.${chapter.category}`, chapter.category)}
              </Text>
            </View>
            {isActive && (
              <Text style={styles.currentText}>{t('chapters.current')}</Text>
            )}
          </View>
        </View>

        {/* Play indicator */}
        <View style={[styles.playButton, isActive && styles.playButtonActive]}>
          <Text style={[styles.playIcon, isActive && styles.playIconActive]}>
            {isActive ? '▶' : '▷'}
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  containerActive: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    borderColor: 'rgba(168, 85, 247, 0.6)',
  },
  containerFocused: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  categoryBar: {
    width: 4,
    height: 48,
    borderRadius: 2,
    marginLeft: spacing.sm,
  },
  content: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
  titleActive: {
    color: colors.primary,
  },
  time: {
    fontSize: 12,
    color: colors.textMuted,
    marginRight: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '500',
  },
  currentText: {
    fontSize: 11,
    color: colors.primary,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonActive: {
    backgroundColor: colors.primary,
  },
  playIcon: {
    fontSize: 14,
    color: colors.textMuted,
  },
  playIconActive: {
    color: colors.background,
  },
});

export default ChapterItem;
