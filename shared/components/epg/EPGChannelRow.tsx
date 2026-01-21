import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { EPGProgram, Channel, Timezone } from '../../services/epgApi';
import { colors, spacing, borderRadius } from '../../theme';
import { isTV } from '../../utils/platform';

// Simple time formatting
const formatTimeFromISO = (isoString: string, timezone: Timezone): string => {
  const date = new Date(isoString);
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone === 'israel' ? 'Asia/Jerusalem' : undefined,
  };
  return date.toLocaleTimeString('en-US', options);
};

interface EPGProgramSlotProps {
  program: EPGProgram;
  timezone: Timezone;
  onPress?: (program: EPGProgram) => void;
}

const EPGProgramSlot: React.FC<EPGProgramSlotProps> = ({
  program,
  timezone,
  onPress,
}) => {
  const { i18n, t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const currentLang = i18n.language;

  const getLocalizedTitle = () => {
    if (currentLang === 'he') return program.title;
    if (currentLang === 'es') return program.title_es || program.title_en || program.title;
    return program.title_en || program.title;
  };

  const startTime = formatTimeFromISO(program.start_time, timezone);
  const isNow = program.is_now;
  const isPast = program.is_past;

  // Calculate width based on duration (10px per minute, min 120px)
  const durationMinutes = program.duration_seconds / 60;
  const width = Math.max(120, durationMinutes * 3);

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.05,
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
    >
      <Animated.View
        style={[
          styles.programSlot,
          { width, transform: [{ scale: scaleAnim }] },
          isFocused && styles.programSlotFocused,
          isNow && styles.programSlotNow,
          isPast && styles.programSlotPast,
        ]}
      >
        <View style={styles.programHeader}>
          <Text style={styles.programTime}>{startTime}</Text>
          {isNow && (
            <View style={styles.liveDot} />
          )}
        </View>
        <Text style={styles.programTitle} numberOfLines={2}>
          {getLocalizedTitle()}
        </Text>
        {program.category && (
          <Text style={styles.programCategory} numberOfLines={1}>
            {program.category}
          </Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

interface EPGChannelRowProps {
  channel: Channel;
  programs: EPGProgram[];
  startTime: Date;
  endTime: Date;
  timezone: Timezone;
  onProgramPress?: (program: EPGProgram) => void;
  onChannelPress?: (channel: Channel) => void;
}

export const EPGChannelRow: React.FC<EPGChannelRowProps> = ({
  channel,
  programs,
  startTime,
  endTime,
  timezone,
  onProgramPress,
  onChannelPress,
}) => {
  const { i18n, t } = useTranslation();
  const [isChannelFocused, setIsChannelFocused] = useState(false);

  const currentLang = i18n.language;

  const getLocalizedChannelName = () => {
    if (currentLang === 'he') return channel.name;
    if (currentLang === 'es') return channel.name_es || channel.name_en || channel.name;
    return channel.name_en || channel.name;
  };

  // Filter programs for this channel
  const channelPrograms = programs.filter((p) => p.channel_id === channel.id);

  return (
    <View style={styles.row}>
      {/* Channel Info */}
      <TouchableOpacity
        onPress={() => onChannelPress?.(channel)}
        onFocus={() => setIsChannelFocused(true)}
        onBlur={() => setIsChannelFocused(false)}
        style={[
          styles.channelInfo,
          isChannelFocused && styles.channelInfoFocused,
        ]}
      >
        {channel.logo ? (
          <Image
            source={{ uri: channel.logo }}
            style={styles.channelLogo}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.channelLogoPlaceholder}>
            <Text style={styles.channelLogoIcon}>📺</Text>
          </View>
        )}
        <View style={styles.channelText}>
          <Text style={styles.channelName} numberOfLines={1}>
            {getLocalizedChannelName()}
          </Text>
          {channel.requires_subscription === 'premium' && (
            <Text style={styles.premiumBadge}>⭐ {t('common.premium', 'Premium')}</Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Programs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.programsScroll}
        contentContainerStyle={styles.programsContent}
      >
        {channelPrograms.length > 0 ? (
          channelPrograms.map((program) => (
            <EPGProgramSlot
              key={program.id}
              program={program}
              timezone={timezone}
              onPress={onProgramPress}
            />
          ))
        ) : (
          <View style={styles.noPrograms}>
            <Text style={styles.noProgramsText}>
              {t('epg.noPrograms', 'No programs scheduled')}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  channelInfo: {
    width: isTV ? 200 : 140,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  channelInfoFocused: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    borderColor: colors.primary,
  },
  channelLogo: {
    width: isTV ? 48 : 36,
    height: isTV ? 48 : 36,
    borderRadius: borderRadius.sm,
  },
  channelLogoPlaceholder: {
    width: isTV ? 48 : 36,
    height: isTV ? 48 : 36,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelLogoIcon: {
    fontSize: isTV ? 24 : 18,
  },
  channelText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  channelName: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    color: colors.text,
  },
  premiumBadge: {
    fontSize: isTV ? 12 : 10,
    color: '#fbbf24',
    marginTop: 2,
  },
  programsScroll: {
    flex: 1,
  },
  programsContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: spacing.xs,
  },
  programSlot: {
    height: isTV ? 100 : 80,
    marginHorizontal: spacing.xs,
    marginVertical: spacing.xs,
    padding: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'flex-start',
  },
  programSlotFocused: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    borderColor: colors.primary,
  },
  programSlotNow: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderColor: 'rgba(168, 85, 247, 0.5)',
  },
  programSlotPast: {
    opacity: 0.5,
  },
  programHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  programTime: {
    fontSize: isTV ? 12 : 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
    marginLeft: spacing.xs,
  },
  programTitle: {
    fontSize: isTV ? 14 : 12,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  programCategory: {
    fontSize: isTV ? 11 : 9,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  noPrograms: {
    width: 300,
    height: isTV ? 100 : 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noProgramsText: {
    fontSize: isTV ? 14 : 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
});

export default EPGChannelRow;
