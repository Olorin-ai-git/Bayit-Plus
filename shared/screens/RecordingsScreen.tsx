import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { GlassView } from '../components/ui';
import { useDirection } from '../hooks/useDirection';
import { useAuthStore } from '../stores/authStore';
import { recordingService } from '../services';
import { colors, spacing, borderRadius } from '../theme';
import { isTV } from '../utils/platform';

// Recording types
interface Recording {
  id: string;
  title: string;
  channel_name: string;
  thumbnail?: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  status: 'recording' | 'completed' | 'scheduled' | 'failed';
  file_size_mb?: number;
  stream_url?: string;
}

// Format duration
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

// Format date
const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

interface RecordingCardProps {
  recording: Recording;
  onPress: () => void;
  onDelete: () => void;
}

const RecordingCard: React.FC<RecordingCardProps> = ({ recording, onPress, onDelete }) => {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

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

  const getStatusBadge = () => {
    switch (recording.status) {
      case 'recording':
        return { color: '#ef4444', label: t('recordings.recording', 'Recording'), icon: '🔴' };
      case 'completed':
        return { color: '#22c55e', label: t('recordings.completed', 'Completed'), icon: '✓' };
      case 'scheduled':
        return { color: '#eab308', label: t('recordings.scheduled', 'Scheduled'), icon: '📅' };
      case 'failed':
        return { color: '#ef4444', label: t('recordings.failed', 'Failed'), icon: '✕' };
      default:
        return { color: colors.textMuted, label: '', icon: '' };
    }
  };

  const badge = getStatusBadge();

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      activeOpacity={0.8}
      style={styles.cardTouchable}
    >
      <Animated.View
        style={[
          styles.card,
          { transform: [{ scale: scaleAnim }] },
          isFocused && styles.cardFocused,
        ]}
      >
        {/* Thumbnail */}
        {recording.thumbnail ? (
          <Image
            source={{ uri: recording.thumbnail }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Text style={styles.thumbnailIcon}>📹</Text>
          </View>
        )}

        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: badge.color }]}>
          <Text style={styles.statusIcon}>{badge.icon}</Text>
          <Text style={styles.statusText}>{badge.label}</Text>
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { textAlign }]} numberOfLines={2}>
            {recording.title}
          </Text>
          <Text style={[styles.cardChannel, { textAlign }]} numberOfLines={1}>
            {recording.channel_name}
          </Text>
          <View style={[styles.cardMeta, { flexDirection }]}>
            <Text style={styles.cardDate}>{formatDate(recording.start_time)}</Text>
            <Text style={styles.cardDuration}>{formatDuration(recording.duration_seconds)}</Text>
          </View>
          {recording.file_size_mb && (
            <Text style={styles.cardSize}>{recording.file_size_mb.toFixed(1)} MB</Text>
          )}
        </View>

        {/* Play overlay on focus */}
        {isFocused && recording.status === 'completed' && (
          <View style={styles.playOverlay}>
            <View style={styles.playButton}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function RecordingsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const { user } = useAuthStore();

  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'completed' | 'scheduled'>('all');
  const [focusedFilter, setFocusedFilter] = useState<string | null>(null);

  const loadRecordings = useCallback(async () => {
    try {
      const data = await recordingService.getRecordings();
      setRecordings(data.recordings || []);
    } catch (error) {
      console.error('Failed to load recordings:', error);
      setRecordings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadRecordings();
  };

  const handleRecordingPress = (recording: Recording) => {
    if (recording.status === 'completed' && recording.stream_url) {
      navigation.navigate('Player', {
        id: recording.id,
        title: recording.title,
        type: 'recording',
      });
    }
  };

  const handleDeleteRecording = async (id: string) => {
    try {
      await recordingService.deleteRecording(id);
      setRecordings((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.error('Failed to delete recording:', error);
    }
  };

  const filteredRecordings = recordings.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'completed') return r.status === 'completed';
    if (filter === 'scheduled') return r.status === 'scheduled';
    return true;
  });

  const renderItem = ({ item }: { item: Recording }) => (
    <RecordingCard
      recording={item}
      onPress={() => handleRecordingPress(item)}
      onDelete={() => handleDeleteRecording(item.id)}
    />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('recordings.loading', 'Loading recordings...')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { flexDirection }]}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>📹</Text>
          </View>
          <View>
            <Text style={[styles.title, { textAlign }]}>
              {t('recordings.title', 'My Recordings')}
            </Text>
            <Text style={[styles.subtitle, { textAlign }]}>
              {t('recordings.subtitle', 'Your cloud DVR recordings')}
            </Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['all', 'completed', 'scheduled'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            onFocus={() => setFocusedFilter(f)}
            onBlur={() => setFocusedFilter(null)}
            style={[
              styles.filterButton,
              filter === f && styles.filterButtonActive,
              focusedFilter === f && styles.filterButtonFocused,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}
            >
              {t(`recordings.filter.${f}`, f.charAt(0).toUpperCase() + f.slice(1))}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recordings List */}
      {filteredRecordings.length === 0 ? (
        <GlassView style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📹</Text>
          <Text style={styles.emptyTitle}>
            {t('recordings.empty', 'No recordings yet')}
          </Text>
          <Text style={styles.emptySubtitle}>
            {t('recordings.emptyDescription', 'Record live TV from the EPG to watch later.')}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('EPG')}
            style={styles.emptyButton}
          >
            <Text style={styles.emptyButtonText}>
              {t('recordings.goToEPG', 'Go to TV Guide')}
            </Text>
          </TouchableOpacity>
        </GlassView>
      ) : (
        <FlatList
          data={filteredRecordings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={isTV ? 4 : 2}
          key={isTV ? 'tv' : 'mobile'}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: isTV ? spacing.xl : spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: isTV ? 18 : 14,
    color: colors.text,
    marginTop: spacing.lg,
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
  filterContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  filterButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  filterButtonFocused: {
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: isTV ? 16 : 14,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  cardTouchable: {
    flex: 1,
    margin: spacing.sm,
    maxWidth: isTV ? '25%' : '50%',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  thumbnailPlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailIcon: {
    fontSize: isTV ? 48 : 32,
  },
  statusBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  statusIcon: {
    fontSize: 10,
  },
  statusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  cardContent: {
    padding: spacing.md,
  },
  cardTitle: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardChannel: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  cardDate: {
    fontSize: isTV ? 12 : 10,
    color: colors.textMuted,
  },
  cardDuration: {
    fontSize: isTV ? 12 : 10,
    color: colors.textMuted,
  },
  cardSize: {
    fontSize: isTV ? 12 : 10,
    color: colors.textMuted,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 20,
    color: colors.background,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
    borderRadius: borderRadius.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: isTV ? 24 : 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: isTV ? 16 : 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    maxWidth: 300,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  emptyButtonText: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    color: colors.text,
  },
});
