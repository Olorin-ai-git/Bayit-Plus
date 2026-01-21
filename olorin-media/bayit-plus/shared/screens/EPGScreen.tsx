import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { EPGGrid, EPGList, EPGTimeControls } from '../components/epg';
import { GlassView } from '../components/ui';
import { epgApi, EPGProgram, Channel, Timezone } from '../services/epgApi';
import { colors, spacing, borderRadius } from '../theme';
import { isTV } from '../utils/platform';
import { useAuthStore } from '../stores/authStore';
import { useDirection } from '../hooks/useDirection';

type ViewMode = 'grid' | 'list';

export const EPGScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { isRTL, textAlign, flexDirection } = useDirection();

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [timezone, setTimezone] = useState<Timezone>('israel');
  const [focusedViewButton, setFocusedViewButton] = useState<ViewMode | null>(null);

  // Time window state
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [timeWindow, setTimeWindow] = useState(() => {
    const now = new Date();
    return {
      start: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      end: new Date(now.getTime() + 4 * 60 * 60 * 1000), // 4 hours from now
    };
  });

  // Data state
  const [channels, setChannels] = useState<Channel[]>([]);
  const [programs, setPrograms] = useState<EPGProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is premium
  const isPremium = useMemo(() => {
    return (
      user?.subscription?.plan === 'premium' || user?.subscription?.plan === 'family'
    );
  }, [user]);

  // Calculate timezone string for API
  const timezoneString = useMemo(() => {
    return timezone === 'israel' ? 'Asia/Jerusalem' : Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, [timezone]);

  // Fetch EPG data
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

  // Load data on mount and when time window changes
  useEffect(() => {
    fetchEPGData();
  }, [fetchEPGData]);

  // Update current time every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Time navigation handlers
  const handleTimeShift = useCallback((hours: number) => {
    const shiftMs = hours * 60 * 60 * 1000;
    setTimeWindow((prev) => ({
      start: new Date(prev.start.getTime() + shiftMs),
      end: new Date(prev.end.getTime() + shiftMs),
    }));
  }, []);

  const handleJumpToNow = useCallback(() => {
    const now = new Date();
    setTimeWindow({
      start: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      end: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    });
    setCurrentTime(now);
  }, []);

  const handleTimezoneToggle = useCallback(() => {
    setTimezone((prev) => (prev === 'israel' ? 'local' : 'israel'));
  }, []);

  // Program click handler
  const handleProgramPress = useCallback(
    (program: EPGProgram) => {
      if (program.is_now) {
        // Navigate to live player
        navigation.navigate('Player', {
          id: program.channel_id,
          title: program.title,
          type: 'live',
        });
      } else if (program.is_past && isPremium) {
        // Navigate to catch-up stream
        navigation.navigate('Player', {
          id: program.id,
          title: program.title,
          type: 'catchup',
        });
      }
      // Future programs - could show details modal
    },
    [navigation, isPremium]
  );

  // Channel click handler
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

  return (
    <View className={`flex-1 bg-[${colors.background}] p-4`}>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4" style={{ flexDirection }}>
        <View className="flex-row items-center gap-4">
          <View className={`${isTV ? 'w-16 h-16 rounded-[32px]' : 'w-12 h-12 rounded-3xl'} bg-[#a855f7]/20 justify-center items-center`}>
            <Text className={`${isTV ? 'text-[32px]' : 'text-2xl'}`}>📺</Text>
          </View>
          <View>
            <Text className={`${isTV ? 'text-4xl' : 'text-[28px]'} font-bold text-[${colors.text}]`} style={{ textAlign }}>{t('epg.title', 'TV Guide')}</Text>
            <Text className={`${isTV ? 'text-lg' : 'text-sm'} text-[${colors.textSecondary}] mt-0.5`} style={{ textAlign }}>
              {t('epg.subtitle', 'Browse the TV schedule')}
            </Text>
          </View>
        </View>

        {/* View Toggle */}
        <View className="flex-row bg-black/20 rounded-lg p-1">
          <TouchableOpacity
            onPress={() => setViewMode('grid')}
            onFocus={() => setFocusedViewButton('grid')}
            onBlur={() => setFocusedViewButton(null)}
            className={`flex-row items-center px-4 py-2 rounded-md border-2 ${
              viewMode === 'grid' ? 'bg-[#a855f7]/20' : ''
            } ${
              focusedViewButton === 'grid' ? `border-[${colors.primary}]` : 'border-transparent'
            }`}
          >
            <Text className={`${isTV ? 'text-xl' : 'text-base'} text-[${colors.textSecondary}] mr-2`}>▦</Text>
            <Text
              className={`${isTV ? 'text-base' : 'text-sm'} ${
                viewMode === 'grid' ? `text-[${colors.primary}] font-semibold` : `text-[${colors.textSecondary}]`
              }`}
            >
              {t('epg.gridView', 'Grid')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setViewMode('list')}
            onFocus={() => setFocusedViewButton('list')}
            onBlur={() => setFocusedViewButton(null)}
            className={`flex-row items-center px-4 py-2 rounded-md border-2 ${
              viewMode === 'list' ? 'bg-[#a855f7]/20' : ''
            } ${
              focusedViewButton === 'list' ? `border-[${colors.primary}]` : 'border-transparent'
            }`}
          >
            <Text className={`${isTV ? 'text-xl' : 'text-base'} text-[${colors.textSecondary}] mr-2`}>☰</Text>
            <Text
              className={`${isTV ? 'text-base' : 'text-sm'} ${
                viewMode === 'list' ? `text-[${colors.primary}] font-semibold` : `text-[${colors.textSecondary}]`
              }`}
            >
              {t('epg.listView', 'List')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Time Controls */}
      <EPGTimeControls
        currentTime={currentTime}
        timezone={timezone}
        onTimeShift={handleTimeShift}
        onJumpToNow={handleJumpToNow}
        onTimezoneToggle={handleTimezoneToggle}
      />

      {/* Error State */}
      {error && (
        <GlassView className="flex-row items-start p-4 rounded-2xl mb-4 border border-red-500/30 bg-red-500/10">
          <Text className="text-2xl mr-4">⚠️</Text>
          <View className="flex-1">
            <Text className={`${isTV ? 'text-lg' : 'text-base'} font-semibold text-red-500 mb-1`}>{t('epg.errorTitle', 'Error')}</Text>
            <Text className={`${isTV ? 'text-sm' : 'text-xs'} text-red-500/80 mb-4`}>{error}</Text>
            <TouchableOpacity onPress={fetchEPGData} className="self-start px-4 py-2 bg-red-500/20 rounded-md">
              <Text className={`${isTV ? 'text-sm' : 'text-xs'} font-medium text-red-500`}>{t('common.retry', 'Retry')}</Text>
            </TouchableOpacity>
          </View>
        </GlassView>
      )}

      {/* Loading State */}
      {loading && (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className={`${isTV ? 'text-lg' : 'text-sm'} text-[${colors.text}] mt-4`}>{t('epg.loading', 'Loading TV guide...')}</Text>
        </View>
      )}

      {/* EPG Content */}
      {!loading && !error && (
        <View className="flex-1">
          {viewMode === 'grid' ? (
            <EPGGrid
              channels={channels}
              programs={programs}
              startTime={timeWindow.start}
              endTime={timeWindow.end}
              timezone={timezone}
              onProgramPress={handleProgramPress}
              onChannelPress={handleChannelPress}
            />
          ) : (
            <EPGList
              channels={channels}
              programs={programs}
              timezone={timezone}
              onProgramPress={handleProgramPress}
            />
          )}
        </View>
      )}
    </View>
  );
};

export default EPGScreen;
