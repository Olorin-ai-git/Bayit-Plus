import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { flexDirection }]}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>📺</Text>
          </View>
          <View>
            <Text style={[styles.title, { textAlign }]}>{t('epg.title', 'TV Guide')}</Text>
            <Text style={[styles.subtitle, { textAlign }]}>
              {t('epg.subtitle', 'Browse the TV schedule')}
            </Text>
          </View>
        </View>

        {/* View Toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            onPress={() => setViewMode('grid')}
            onFocus={() => setFocusedViewButton('grid')}
            onBlur={() => setFocusedViewButton(null)}
            style={[
              styles.viewButton,
              viewMode === 'grid' && styles.viewButtonActive,
              focusedViewButton === 'grid' && styles.viewButtonFocused,
            ]}
          >
            <Text style={styles.viewButtonIcon}>▦</Text>
            <Text
              style={[
                styles.viewButtonText,
                viewMode === 'grid' && styles.viewButtonTextActive,
              ]}
            >
              {t('epg.gridView', 'Grid')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setViewMode('list')}
            onFocus={() => setFocusedViewButton('list')}
            onBlur={() => setFocusedViewButton(null)}
            style={[
              styles.viewButton,
              viewMode === 'list' && styles.viewButtonActive,
              focusedViewButton === 'list' && styles.viewButtonFocused,
            ]}
          >
            <Text style={styles.viewButtonIcon}>☰</Text>
            <Text
              style={[
                styles.viewButtonText,
                viewMode === 'list' && styles.viewButtonTextActive,
              ]}
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
        <GlassView style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <View style={styles.errorContent}>
            <Text style={styles.errorTitle}>{t('epg.errorTitle', 'Error')}</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={fetchEPGData} style={styles.retryButton}>
              <Text style={styles.retryText}>{t('common.retry', 'Retry')}</Text>
            </TouchableOpacity>
          </View>
        </GlassView>
      )}

      {/* Loading State */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('epg.loading', 'Loading TV guide...')}</Text>
        </View>
      )}

      {/* EPG Content */}
      {!loading && !error && (
        <View style={styles.content}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerIcon: {
    width: isTV ? 64 : 48,
    height: isTV ? 64 : 48,
    borderRadius: isTV ? 32 : 24,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconText: {
    fontSize: isTV ? 32 : 24,
  },
  title: {
    fontSize: isTV ? 36 : 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: isTV ? 18 : 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  viewButtonActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  viewButtonFocused: {
    borderColor: colors.primary,
  },
  viewButtonIcon: {
    fontSize: isTV ? 20 : 16,
    marginRight: spacing.sm,
    color: colors.textSecondary,
  },
  viewButtonText: {
    fontSize: isTV ? 16 : 14,
    color: colors.textSecondary,
  },
  viewButtonTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  errorIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  errorContent: {
    flex: 1,
  },
  errorTitle: {
    fontSize: isTV ? 18 : 16,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: spacing.xs,
  },
  errorText: {
    fontSize: isTV ? 14 : 12,
    color: 'rgba(239, 68, 68, 0.8)',
    marginBottom: spacing.md,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: borderRadius.md,
  },
  retryText: {
    fontSize: isTV ? 14 : 12,
    fontWeight: '500',
    color: '#ef4444',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: isTV ? 18 : 14,
    color: colors.text,
    marginTop: spacing.lg,
  },
  content: {
    flex: 1,
  },
});

export default EPGScreen;
