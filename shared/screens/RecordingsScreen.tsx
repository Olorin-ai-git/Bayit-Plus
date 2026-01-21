import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
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
      className={`flex-1 m-2 ${isTV ? 'max-w-[25%]' : 'max-w-[50%]'}`}
    >
      <Animated.View
        className={`bg-white/5 rounded-lg overflow-hidden border-2 ${
          isFocused ? 'border-[#a855f7] bg-[rgba(168,85,247,0.1)]' : 'border-transparent'
        }`}
        style={{ transform: [{ scale: scaleAnim }] }}
      >
        {/* Thumbnail */}
        {recording.thumbnail ? (
          <Image
            source={{ uri: recording.thumbnail }}
            className="w-full aspect-video"
            resizeMode="cover"
          />
        ) : (
          <View className={`w-full aspect-video bg-black/40 justify-center items-center`}>
            <Text className={isTV ? 'text-5xl' : 'text-[32px]'}>📹</Text>
          </View>
        )}

        {/* Status Badge */}
        <View className="absolute top-2 right-2 flex-row items-center px-2 py-0.5 rounded-full gap-1" style={{ backgroundColor: badge.color }}>
          <Text className="text-[10px]">{badge.icon}</Text>
          <Text className="text-[10px] text-white font-semibold">{badge.label}</Text>
        </View>

        {/* Content */}
        <View className="p-4">
          <Text className={`${isTV ? 'text-base' : 'text-sm'} font-semibold text-white mb-1`} style={{ textAlign }} numberOfLines={2}>
            {recording.title}
          </Text>
          <Text className={`${isTV ? 'text-sm' : 'text-xs'} text-gray-400 mb-1`} style={{ textAlign }} numberOfLines={1}>
            {recording.channel_name}
          </Text>
          <View className="flex-row justify-between mb-1" style={{ flexDirection }}>
            <Text className={`${isTV ? 'text-xs' : 'text-[10px]'} text-gray-500`}>{formatDate(recording.start_time)}</Text>
            <Text className={`${isTV ? 'text-xs' : 'text-[10px]'} text-gray-500`}>{formatDuration(recording.duration_seconds)}</Text>
          </View>
          {recording.file_size_mb && (
            <Text className={`${isTV ? 'text-xs' : 'text-[10px]'} text-gray-500`}>{recording.file_size_mb.toFixed(1)} MB</Text>
          )}
        </View>

        {/* Play overlay on focus */}
        {isFocused && recording.status === 'completed' && (
          <View className="absolute inset-0 bg-black/40 justify-center items-center">
            <View className="w-12 h-12 rounded-full bg-[#a855f7] justify-center items-center">
              <Text className="text-xl text-black ml-1">▶</Text>
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
      <View className="flex-1 justify-center items-center bg-black">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className={`text-white ${isTV ? 'text-lg' : 'text-sm'} mt-4`}>{t('recordings.loading', 'Loading recordings...')}</Text>
      </View>
    );
  }

  return (
    <View className={`flex-1 bg-black ${isTV ? 'p-8' : 'p-4'}`}>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4" style={{ flexDirection }}>
        <View className="flex-row items-center gap-4">
          <View className={`${isTV ? 'w-16 h-16 rounded-[32px]' : 'w-12 h-12 rounded-[24px]'} bg-[rgba(168,85,247,0.2)] justify-center items-center`}>
            <Text className={isTV ? 'text-[32px]' : 'text-2xl'}>📹</Text>
          </View>
          <View>
            <Text className={`${isTV ? 'text-4xl' : 'text-[28px]'} font-bold text-white`} style={{ textAlign }}>
              {t('recordings.title', 'My Recordings')}
            </Text>
            <Text className={`${isTV ? 'text-lg' : 'text-sm'} text-gray-400 mt-0.5`} style={{ textAlign }}>
              {t('recordings.subtitle', 'Your cloud DVR recordings')}
            </Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View className="flex-row gap-2 mb-4">
        {(['all', 'completed', 'scheduled'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            onFocus={() => setFocusedFilter(f)}
            onBlur={() => setFocusedFilter(null)}
            className={`px-4 py-2 rounded-full bg-white/5 border-2 ${
              filter === f ? 'bg-[rgba(168,85,247,0.2)]' : ''
            } ${focusedFilter === f ? 'border-[#a855f7]' : 'border-transparent'}`}
          >
            <Text className={`${isTV ? 'text-base' : 'text-sm'} ${
              filter === f ? 'text-[#a855f7] font-semibold' : 'text-gray-400'
            }`}>
              {t(`recordings.filter.${f}`, f.charAt(0).toUpperCase() + f.slice(1))}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recordings List */}
      {filteredRecordings.length === 0 ? (
        <GlassView className="flex-1 justify-center items-center p-12 rounded-2xl">
          <Text className="text-[64px] mb-4">📹</Text>
          <Text className={`${isTV ? 'text-2xl' : 'text-xl'} font-semibold text-white mb-2`}>
            {t('recordings.empty', 'No recordings yet')}
          </Text>
          <Text className={`${isTV ? 'text-base' : 'text-sm'} text-gray-400 text-center mb-4 max-w-[300px]`}>
            {t('recordings.emptyDescription', 'Record live TV from the EPG to watch later.')}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('EPG')}
            className="bg-[#a855f7] px-6 py-3 rounded-lg"
          >
            <Text className={`${isTV ? 'text-base' : 'text-sm'} font-semibold text-white`}>
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
          contentContainerStyle={{ paddingBottom: 32 }}
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
