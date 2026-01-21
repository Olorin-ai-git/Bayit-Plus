import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Image,
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
  thumbnail?: string;
}

interface ChapterItemProps {
  chapter: Chapter;
  isActive: boolean;
  onPress: () => void;
  hasTVPreferredFocus?: boolean;
}

// Category colors using theme tokens for consistency
const getCategoryColor = (category: string): string => {
  const categoryColorMap: Record<string, string> = {
    intro: colors.primary,          // purple
    news: colors.error,             // red
    security: colors.warning,       // orange
    politics: colors.primary,       // purple
    economy: colors.success,        // green
    sports: colors.gold,            // yellow/gold
    weather: colors.primary,        // purple (cyan alternative)
    culture: colors.secondary,      // deep purple (pink alternative)
    conclusion: colors.textMuted,   // gray
    flashback: colors.primaryDark,  // dark purple (indigo alternative)
    journey: colors.success,        // green (teal alternative)
    climax: colors.error,           // red (rose alternative)
    setup: colors.warning,          // orange/amber
    action: colors.error,           // red
    conflict: colors.warning,       // orange
    cliffhanger: colors.secondary,  // deep purple (violet alternative)
    main: colors.primary,           // purple (blue alternative)
  };

  return categoryColorMap[category] || colors.primary;
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

  const categoryColor = getCategoryColor(chapter.category);

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

        {/* Thumbnail */}
        {chapter.thumbnail && (
          <View style={styles.thumbnailContainer}>
            <Image
              source={{ uri: chapter.thumbnail }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
            <View style={styles.thumbnailOverlay}>
              <View style={[styles.thumbnailBadge, { backgroundColor: categoryColor }]}>
                <Text style={styles.thumbnailBadgeText}>
                  {formatTime(chapter.start_time)}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.content}>
          {/* Title and time row */}
          <View style={styles.titleRow}>
            <Text
              style={[styles.title, isActive && styles.titleActive]}
              numberOfLines={2}
            >
              {chapter.title}
            </Text>
            {!chapter.thumbnail && (
              <Text style={styles.time}>{formatTime(chapter.start_time)}</Text>
            )}
          </View>

          {/* Summary (if available) */}
          {chapter.summary && (
            <Text style={styles.summary} numberOfLines={2}>
              {chapter.summary}
            </Text>
          )}

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
    backgroundColor: colors.glassBorderWhite,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 80,
  },
  containerActive: {
    backgroundColor: colors.glassPurpleLight,
    borderColor: colors.glassBorderFocus,
  },
  containerFocused: {
    borderColor: colors.primary,
    borderWidth: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  categoryBar: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginLeft: spacing.sm,
  },
  thumbnailContainer: {
    position: 'relative',
    width: 80,
    height: 60,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginHorizontal: spacing.sm,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.glassOverlay,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  thumbnailBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  thumbnailBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  content: {
    flex: 1,
    marginHorizontal: spacing.md,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    textAlign: 'right',
    lineHeight: 20,
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
  summary: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.xs,
    textAlign: 'right',
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
    backgroundColor: colors.glassBorderWhite,
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
