import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { EPGProgram, Timezone } from '../../services/epgApi';
import { colors, spacing, borderRadius } from '../../theme';
import { isTV } from '../../utils/platform';

// Simple time formatting without luxon dependency
const formatTimeFromISO = (isoString: string, timezone: Timezone): string => {
  const date = new Date(isoString);
  // For Israel timezone, add 2-3 hours offset (simplified)
  // In production, use proper timezone library
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone === 'israel' ? 'Asia/Jerusalem' : undefined,
  };
  return date.toLocaleTimeString('en-US', options);
};

interface EPGProgramCardProps {
  program: EPGProgram;
  channelName: string;
  timezone: Timezone;
  onPress?: (program: EPGProgram) => void;
}

export const EPGProgramCard: React.FC<EPGProgramCardProps> = ({
  program,
  channelName,
  timezone,
  onPress,
}) => {
  const { t, i18n } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const currentLang = i18n.language;

  // Get localized title
  const getLocalizedTitle = () => {
    if (currentLang === 'he') return program.title;
    if (currentLang === 'es') return program.title_es || program.title_en || program.title;
    return program.title_en || program.title;
  };

  // Get localized description
  const getLocalizedDescription = () => {
    if (currentLang === 'he') return program.description;
    if (currentLang === 'es')
      return program.description_es || program.description_en || program.description;
    return program.description_en || program.description;
  };

  const startTime = formatTimeFromISO(program.start_time, timezone);
  const endTime = formatTimeFromISO(program.end_time, timezone);
  const timeLabel = `${startTime} - ${endTime}`;

  const isPast = program.is_past;
  const isNow = program.is_now;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.02,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={() => onPress?.(program)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      activeOpacity={0.8}
      style={styles.touchable}
    >
      <Animated.View
        style={[
          styles.container,
          { transform: [{ scale: scaleAnim }] },
          isFocused && styles.containerFocused,
          isNow && styles.containerNow,
          isPast && styles.containerPast,
        ]}
      >
        {/* Thumbnail */}
        {program.thumbnail ? (
          <Image
            source={{ uri: program.thumbnail }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Text style={styles.thumbnailIcon}>📺</Text>
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={2}>
              {getLocalizedTitle()}
            </Text>
            {isNow && (
              <View style={styles.liveBadge}>
                <Text style={styles.liveBadgeText}>{t('common.live', 'LIVE')}</Text>
              </View>
            )}
          </View>

          {/* Channel & Time */}
          <View style={styles.meta}>
            <Text style={styles.channelName}>{channelName}</Text>
            <Text style={styles.separator}>•</Text>
            <Text style={styles.time}>🕐 {timeLabel}</Text>
            {program.category && (
              <>
                <Text style={styles.separator}>•</Text>
                <Text style={styles.category}>{program.category}</Text>
              </>
            )}
          </View>

          {/* Description */}
          {getLocalizedDescription() && (
            <Text style={styles.description} numberOfLines={2}>
              {getLocalizedDescription()}
            </Text>
          )}

          {/* Genres & Rating */}
          <View style={styles.tags}>
            {program.genres?.slice(0, 3).map((genre, index) => (
              <View key={index} style={styles.genreTag}>
                <Text style={styles.genreText}>{genre}</Text>
              </View>
            ))}
            {program.rating && (
              <View style={styles.ratingTag}>
                <Text style={styles.ratingText}>{program.rating}</Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    marginBottom: spacing.md,
  },
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  containerFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(107, 33, 168, 0.2)',
  },
  containerNow: {
    borderColor: 'rgba(168, 85, 247, 0.4)',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },
  containerPast: {
    opacity: 0.6,
  },
  thumbnail: {
    width: isTV ? 180 : 100,
    height: isTV ? 120 : 80,
  },
  thumbnailPlaceholder: {
    width: isTV ? 180 : 100,
    height: isTV ? 120 : 80,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailIcon: {
    fontSize: isTV ? 48 : 32,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: isTV ? 20 : 16,
    fontWeight: 'bold',
    color: colors.text,
    marginRight: spacing.sm,
  },
  liveBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  liveBadgeText: {
    color: '#ffffff',
    fontSize: isTV ? 12 : 10,
    fontWeight: 'bold',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: spacing.xs,
  },
  channelName: {
    fontSize: isTV ? 14 : 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  separator: {
    fontSize: isTV ? 14 : 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: spacing.xs,
  },
  time: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
  },
  category: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
  },
  description: {
    fontSize: isTV ? 14 : 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: spacing.sm,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  genreTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  genreText: {
    fontSize: isTV ? 12 : 10,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  ratingTag: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  ratingText: {
    fontSize: isTV ? 12 : 10,
    color: '#fbbf24',
  },
});

export default EPGProgramCard;
