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
import { spacing, colors, borderRadius } from '@olorin/design-tokens';

import logger from '@/utils/logger';


const moduleLogger = logger.scope('EPGScreenMobile');

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
    <View className="bg-white/5 rounded-lg mb-3 overflow-hidden">
      {/* Channel Header */}
      <TouchableOpacity
        className="p-3 border-b border-white/10"
        style={{ flexDirection: isRTL ? 'row' : 'row-reverse' }}
        onPress={() => {
          ReactNativeHapticFeedback.trigger('impactLight');
          onChannelPress(item.channel);
        }}
        activeOpacity={0.7}
      >
        {item.channel.logo ? (
          <Image
            source={{ uri: item.channel.logo }}
            className="w-12 h-12 rounded-lg"
            resizeMode="contain"
          />
        ) : (
          <View className="w-12 h-12 rounded-lg bg-white/5 justify-center items-center">
            <Text className="text-base font-bold text-white">{item.channel.number}</Text>
          </View>
        )}
        <View className="flex-1 mx-3" style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
          <Text className="text-base font-semibold text-white" style={{ textAlign }}>{item.channel.name}</Text>
          <Text className="text-xs text-white/60 mt-0.5" style={{ textAlign }}>
            {t('epg.channel', 'Channel')} {item.channel.number}
          </Text>
        </View>
        <View className="bg-red-600 px-2 py-1 rounded">
          <Text className="text-[10px] font-bold text-white tracking-wider">{t('epg.live', 'LIVE')}</Text>
        </View>
      </TouchableOpacity>

      {/* Current Program */}
      {item.currentProgram && (
        <TouchableOpacity
          className="p-3 bg-purple-600/10"
          onPress={() => {
            ReactNativeHapticFeedback.trigger('impactMedium');
            onProgramPress(item.currentProgram!);
          }}
          activeOpacity={0.7}
        >
          <View className="self-start bg-purple-600 px-2 py-0.5 rounded mb-1">
            <Text className="text-[10px] font-semibold text-white uppercase">{t('epg.nowPlaying', 'Now')}</Text>
          </View>
          <Text className="text-base font-semibold text-white mb-1" style={{ textAlign }} numberOfLines={1}>
            {item.currentProgram.title}
          </Text>
          <Text className="text-xs text-purple-600 mb-1" style={{ textAlign }}>
            {formatTime(new Date(item.currentProgram.start_time))} - {formatTime(new Date(item.currentProgram.end_time))}
          </Text>
          {item.currentProgram.description && (
            <Text className="text-[13px] text-white/60 leading-[18px]" style={{ textAlign }} numberOfLines={2}>
              {item.currentProgram.description}
            </Text>
          )}
        </TouchableOpacity>
      )}

      {/* Upcoming Programs */}
      {item.upcomingPrograms.length > 0 && (
        <View className="p-3 pt-2 border-t border-white/10">
          <Text className="text-xs font-semibold text-white/60 uppercase mb-2" style={{ textAlign }}>
            {t('epg.upcoming', 'Coming Up')}
          </Text>
          {item.upcomingPrograms.slice(0, 3).map((program) => (
            <TouchableOpacity
              key={program.id}
              className="flex-row items-center py-1"
              onPress={() => {
                if (program.is_past && isPremium) {
                  ReactNativeHapticFeedback.trigger('impactLight');
                  onProgramPress(program);
                }
              }}
              activeOpacity={program.is_past && isPremium ? 0.7 : 1}
            >
              <Text className="text-xs text-white/60 w-[50px]" style={{ textAlign }}>
                {formatTime(new Date(program.start_time))}
              </Text>
              <Text className="text-sm text-white flex-1" style={{ textAlign }} numberOfLines={1}>
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
      moduleLogger.error('Failed to fetch EPG data:', err);
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
      <View className="items-center pt-6 pb-3" style={{ flexDirection: isRTL ? 'row' : 'row-reverse', marginLeft: isRTL ? spacing.md : 0, marginRight: isRTL ? 0 : spacing.md }}>
        <View className="w-12 h-12 rounded-full bg-purple-600/20 justify-center items-center">
          <Text className="text-2xl">📺</Text>
        </View>
        <View className="flex-1">
          <Text className="text-[28px] font-bold text-white" style={{ textAlign }}>{t('epg.title', 'TV Guide')}</Text>
          <Text className="text-sm text-white/60 mt-0.5" style={{ textAlign }}>
            {t('epg.subtitle', 'Browse the TV schedule')}
          </Text>
        </View>
      </View>

      {/* Time Controls */}
      <View className="mb-6">
        <View className="flex-row justify-center items-center gap-3 mb-2">
          <TouchableOpacity
            onPress={() => handleTimeShift(-2)}
            className="px-3 py-2 bg-white/5 rounded-lg"
          >
            <Text className="text-sm text-white">{isRTL ? '→' : '←'} 2h</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleJumpToNow}
            className="px-6 py-2 bg-purple-600 rounded-lg"
          >
            <Text className="text-sm font-semibold text-white">{t('epg.now', 'Now')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleTimeShift(2)}
            className="px-3 py-2 bg-white/5 rounded-lg"
          >
            <Text className="text-sm text-white">2h {isRTL ? '←' : '→'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleTimezoneToggle}
          className="self-center px-3 py-1"
        >
          <Text className="text-xs text-white/60">
            🌍 {timezone === 'israel' ? t('epg.israelTime', 'Israel') : t('epg.localTime', 'Local')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-black">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-white text-base mt-3">{t('epg.loading', 'Loading TV guide...')}</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-black p-6">
        <Text className="text-5xl mb-3">⚠️</Text>
        <Text className="text-xl font-semibold text-red-600 mb-2">{t('epg.errorTitle', 'Error')}</Text>
        <Text className="text-sm text-white/60 text-center mb-6">{error}</Text>
        <TouchableOpacity onPress={fetchEPGData} className="px-6 py-3 bg-purple-600 rounded-lg">
          <Text className="text-base font-semibold text-white">{t('common.retry', 'Retry')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <FlatList
        data={channelsWithPrograms}
        keyExtractor={(item) => item.channel.id}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xl }}
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

export default EPGScreenMobile;
