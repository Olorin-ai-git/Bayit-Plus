/**
 * EPGScreenMobile - Mobile-optimized Electronic Program Guide
 *
 * Features:
 * - Default to list view (mobile-friendly)
 * - Swipe for time navigation
 * - Single-column channels
 * - Current program highlighted
 * - RTL support
 * - Pull-to-refresh
 * - Haptic feedback
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { epgApi, EPGProgram, Channel } from '@bayit/shared-services';
import { useDirection } from '@bayit/shared-hooks';
import { useAuthStore } from '@bayit/shared-stores';
import { spacing, colors, borderRadius } from '../theme';

type Timezone = 'israel' | 'local';

interface ChannelWithPrograms {
  channel: Channel;
  currentProgram?: EPGProgram;
  upcomingPrograms: EPGProgram[];
}

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

interface ChannelCardProps {
  item: ChannelWithPrograms;
  onChannelPress: (channel: Channel) => void;
  onProgramPress: (program: EPGProgram) => void;
  isPremium: boolean;
}

const ChannelCard: React.FC<ChannelCardProps> = ({
  item,
  onChannelPress,
  onProgramPress,
  isPremium,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();

  return (
    <View style={styles.channelCard}>
      {/* Channel Header */}
      <TouchableOpacity
        style={[styles.channelHeader, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}
        onPress={() => {
          ReactNativeHapticFeedback.trigger('impactLight');
          onChannelPress(item.channel);
        }}
        activeOpacity={0.7}
      >
        {item.channel.logo ? (
          <Image
            source={{ uri: item.channel.logo }}
            style={styles.channelLogo}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.channelLogoPlaceholder}>
            <Text style={styles.channelLogoText}>{item.channel.number}</Text>
          </View>
        )}
        <View style={[styles.channelInfo, { alignItems: isRTL ? 'flex-start' : 'flex-end' }]}>
          <Text style={[styles.channelName, { textAlign }]}>{item.channel.name}</Text>
          <Text style={[styles.channelNumber, { textAlign }]}>
            {t('epg.channel', 'Channel')} {item.channel.number}
          </Text>
        </View>
        <View style={styles.liveIndicator}>
          <Text style={styles.liveText}>{t('epg.live', 'LIVE')}</Text>
        </View>
      </TouchableOpacity>

      {/* Current Program */}
      {item.currentProgram && (
        <TouchableOpacity
          style={styles.currentProgram}
          onPress={() => {
            ReactNativeHapticFeedback.trigger('impactMedium');
            onProgramPress(item.currentProgram!);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.nowPlayingBadge}>
            <Text style={styles.nowPlayingText}>{t('epg.nowPlaying', 'Now')}</Text>
          </View>
          <Text style={[styles.programTitle, { textAlign }]} numberOfLines={1}>
            {item.currentProgram.title}
          </Text>
          <Text style={[styles.programTime, { textAlign }]}>
            {formatTime(new Date(item.currentProgram.start_time))} - {formatTime(new Date(item.currentProgram.end_time))}
          </Text>
          {item.currentProgram.description && (
            <Text style={[styles.programDescription, { textAlign }]} numberOfLines={2}>
              {item.currentProgram.description}
            </Text>
          )}
        </TouchableOpacity>
      )}

      {/* Upcoming Programs */}
      {item.upcomingPrograms.length > 0 && (
        <View style={styles.upcomingSection}>
          <Text style={[styles.upcomingTitle, { textAlign }]}>
            {t('epg.upcoming', 'Coming Up')}
          </Text>
          {item.upcomingPrograms.slice(0, 3).map((program) => (
            <TouchableOpacity
              key={program.id}
              style={styles.upcomingProgram}
              onPress={() => {
                if (program.is_past && isPremium) {
                  ReactNativeHapticFeedback.trigger('impactLight');
                  onProgramPress(program);
                }
              }}
              activeOpacity={program.is_past && isPremium ? 0.7 : 1}
            >
              <Text style={[styles.upcomingTime, { textAlign }]}>
                {formatTime(new Date(program.start_time))}
              </Text>
              <Text style={[styles.upcomingProgramTitle, { textAlign, flex: 1 }]} numberOfLines={1}>
                {program.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

export const EPGScreenMobile: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { isRTL, textAlign } = useDirection();

  const [timezone, setTimezone] = useState<Timezone>('israel');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [timeWindow, setTimeWindow] = useState(() => {
    const now = new Date();
    return {
      start: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      end: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    };
  });

  const [channels, setChannels] = useState<Channel[]>([]);
  const [programs, setPrograms] = useState<EPGProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPremium = useMemo(() => {
    return (
      user?.subscription?.plan === 'premium' || user?.subscription?.plan === 'family'
    );
  }, [user]);

  const timezoneString = useMemo(() => {
    return timezone === 'israel' ? 'Asia/Jerusalem' : Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, [timezone]);

  const channelsWithPrograms = useMemo((): ChannelWithPrograms[] => {
    const now = currentTime.getTime();

    return channels.map(channel => {
      const channelPrograms = programs.filter(p => p.channel_id === channel.id);
      const currentProgram = channelPrograms.find(p => {
        const start = new Date(p.start_time).getTime();
        const end = new Date(p.end_time).getTime();
        return now >= start && now < end;
      });
      const upcomingPrograms = channelPrograms
        .filter(p => new Date(p.start_time).getTime() > now)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      return {
        channel,
        currentProgram,
        upcomingPrograms,
      };
    });
  }, [channels, programs, currentTime]);

  const fetchEPGData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await epgApi.getEPGData({
        startTime: timeWindow.start.toISOString(),
        endTime: timeWindow.end.toISOString(),
        timezone: timezoneString,
      });

      setChannels(response.channels);
      setPrograms(response.programs);
    } catch (err: any) {
      console.error('Failed to fetch EPG data:', err);
      setError(err.message || t('epg.errorLoading', 'Failed to load TV guide'));
    } finally {
      setLoading(false);
    }
  }, [timeWindow, timezoneString, t]);

  useEffect(() => {
    fetchEPGData();
  }, [fetchEPGData]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    ReactNativeHapticFeedback.trigger('impactLight');
    await fetchEPGData();
    setRefreshing(false);
  }, [fetchEPGData]);

  const handleTimeShift = useCallback((hours: number) => {
    ReactNativeHapticFeedback.trigger('impactLight');
    const shiftMs = hours * 60 * 60 * 1000;
    setTimeWindow((prev) => ({
      start: new Date(prev.start.getTime() + shiftMs),
      end: new Date(prev.end.getTime() + shiftMs),
    }));
  }, []);

  const handleJumpToNow = useCallback(() => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    const now = new Date();
    setTimeWindow({
      start: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      end: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    });
    setCurrentTime(now);
  }, []);

  const handleTimezoneToggle = useCallback(() => {
    ReactNativeHapticFeedback.trigger('selection');
    setTimezone((prev) => (prev === 'israel' ? 'local' : 'israel'));
  }, []);

  const handleProgramPress = useCallback(
    (program: EPGProgram) => {
      if (program.is_now) {
        navigation.navigate('Player', {
          id: program.channel_id,
          title: program.title,
          type: 'live',
        });
      } else if (program.is_past && isPremium) {
        navigation.navigate('Player', {
          id: program.id,
          title: program.title,
          type: 'catchup',
        });
      }
    },
    [navigation, isPremium]
  );

  const handleChannelPress = useCallback(
    (channel: Channel) => {
      navigation.navigate('Player', {
        id: channel.id,
        title: channel.name,
        type: 'live',
      });
    },
    [navigation]
  );

  const renderHeader = () => (
    <View>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
        <View style={[styles.headerIcon, { marginLeft: isRTL ? spacing.md : 0, marginRight: isRTL ? 0 : spacing.md }]}>
          <Text style={styles.headerIconText}>📺</Text>
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.title, { textAlign }]}>{t('epg.title', 'TV Guide')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>
            {t('epg.subtitle', 'Browse the TV schedule')}
          </Text>
        </View>
      </View>

      {/* Time Controls */}
      <View style={styles.timeControls}>
        <View style={styles.timeNavigation}>
          <TouchableOpacity
            onPress={() => handleTimeShift(-2)}
            style={styles.timeButton}
          >
            <Text style={styles.timeButtonText}>{isRTL ? '→' : '←'} 2h</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleJumpToNow}
            style={styles.nowButton}
          >
            <Text style={styles.nowButtonText}>{t('epg.now', 'Now')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleTimeShift(2)}
            style={styles.timeButton}
          >
            <Text style={styles.timeButtonText}>2h {isRTL ? '←' : '→'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleTimezoneToggle}
          style={styles.timezoneButton}
        >
          <Text style={styles.timezoneText}>
            🌍 {timezone === 'israel' ? t('epg.israelTime', 'Israel') : t('epg.localTime', 'Local')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('epg.loading', 'Loading TV guide...')}</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>{t('epg.errorTitle', 'Error')}</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchEPGData} style={styles.retryButton}>
          <Text style={styles.retryText}>{t('common.retry', 'Retry')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={channelsWithPrograms}
        keyExtractor={(item) => item.channel.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <ChannelCard
            item={item}
            onChannelPress={handleChannelPress}
            onProgramPress={handleProgramPress}
            isPremium={isPremium}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.text,
    fontSize: 16,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.error,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(126, 34, 206, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconText: {
    fontSize: 24,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  timeControls: {
    marginBottom: spacing.lg,
  },
  timeNavigation: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  timeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
  },
  timeButtonText: {
    fontSize: 14,
    color: colors.text,
  },
  nowButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  nowButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  timezoneButton: {
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  timezoneText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  channelCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  channelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  channelLogo: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.backgroundElevated,
  },
  channelLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelLogoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  channelInfo: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  channelName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  channelNumber: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  liveIndicator: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.5,
  },
  currentProgram: {
    padding: spacing.md,
    backgroundColor: 'rgba(126, 34, 206, 0.1)',
  },
  nowPlayingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: spacing.xs,
  },
  nowPlayingText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'uppercase',
  },
  programTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  programTime: {
    fontSize: 12,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  programDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  upcomingSection: {
    padding: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  upcomingTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  upcomingProgram: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  upcomingTime: {
    fontSize: 12,
    color: colors.textSecondary,
    width: 50,
  },
  upcomingProgramTitle: {
    fontSize: 14,
    color: colors.text,
  },
});

export default EPGScreenMobile;
