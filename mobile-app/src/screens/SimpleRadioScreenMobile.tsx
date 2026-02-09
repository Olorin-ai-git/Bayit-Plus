/**
 * Radio Screen Mobile
 * Glass UI styled radio stations grid with real production data
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
  RefreshControl,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Radio, Play, Pause, Heart, Volume2, AlertCircle } from 'lucide-react-native';
import { radioService, RadioStation } from '../services/api';
import { Colors } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

const GENRES = ['All', 'News', 'Music', 'Talk', 'Pop', 'Classical', 'Jewish'];

function StationCard({ station, isPlaying, onToggle }: {
  station: RadioStation;
  isPlaying: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={[styles.stationCard, isPlaying && styles.stationCardActive]}>
      <View style={styles.stationHeader}>
        <View style={[styles.stationIcon, isPlaying && styles.stationIconActive]}>
          {station.logo ? (
            <Image source={{ uri: station.logo }} style={styles.stationLogo} resizeMode="contain" />
          ) : isPlaying ? (
            <Volume2 size={20} color={Colors.Info.default} />
          ) : (
            <Radio size={20} color={Colors.Info.i400} />
          )}
        </View>
        <Pressable style={styles.favoriteButton}>
          <Heart size={16} color={Colors.Text.disabled} />
        </Pressable>
      </View>
      <Text style={styles.stationName} numberOfLines={1}>{station.name}</Text>
      {station.frequency && (
        <Text style={styles.stationFrequency}>{station.frequency}</Text>
      )}
      {station.currentShow && (
        <Text style={styles.nowPlaying} numberOfLines={1}>{station.currentShow}</Text>
      )}
      {station.genre && (
        <View style={styles.genreBadge}>
          <Text style={styles.genreText}>{station.genre}</Text>
        </View>
      )}
      <Pressable
        style={[styles.playButton, isPlaying && styles.playButtonActive]}
        onPress={onToggle}
      >
        {isPlaying ? (
          <Pause size={16} color={Colors.Text.primary} fill={Colors.Text.primary} />
        ) : (
          <Play size={16} color={Colors.Text.primary} fill={Colors.Text.primary} />
        )}
        <Text style={styles.playButtonText}>{isPlaying ? 'Stop' : 'Listen'}</Text>
      </Pressable>
    </View>
  );
}

export function RadioScreenMobile() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [playingStationId, setPlayingStationId] = useState<string | null>(null);

  const loadStations = async () => {
    try {
      setError(null);
      const data = await radioService.getStations();
      setStations(data.stations || []);
    } catch (err) {
      setError('Failed to load radio stations. Please check your connection.');
      setStations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStations();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStations();
    setRefreshing(false);
  };

  const filteredStations = selectedGenre === 'All'
    ? stations
    : stations.filter(s => s.genre?.toLowerCase() === selectedGenre.toLowerCase());

  const handleTogglePlay = (stationId: string) => {
    setPlayingStationId(playingStationId === stationId ? null : stationId);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Radio size={24} color={Colors.Info.default} strokeWidth={2} />
          <Text style={styles.headerTitle}>Radio</Text>
        </View>
        {stations.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{stations.length}</Text>
          </View>
        )}
      </View>

      {/* Genre Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.genreContainer}
        contentContainerStyle={styles.genreContent}
      >
        {GENRES.map((genre) => (
          <Pressable
            key={genre}
            style={[
              styles.genreChip,
              selectedGenre === genre && styles.genreChipActive,
            ]}
            onPress={() => setSelectedGenre(genre)}
          >
            <Text
              style={[
                styles.genreChipText,
                selectedGenre === genre && styles.genreTextActive,
              ]}
            >
              {genre}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Loading State */}
      {loading && (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.Info.default} />
          <Text style={styles.loadingText}>Loading radio stations...</Text>
        </View>
      )}

      {/* Error State */}
      {error && !loading && (
        <View style={styles.centerContent}>
          <AlertCircle size={48} color={Colors.Error.e600} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={loadStations}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* Stations Grid */}
      {!loading && !error && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.stationsGrid}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.Info.default} />
          }
        >
          {filteredStations.length === 0 ? (
            <View style={styles.emptyState}>
              <Radio size={48} color={Colors.Text.disabled} />
              <Text style={styles.emptyText}>No stations found</Text>
            </View>
          ) : (
            filteredStations.map((station) => (
              <StationCard
                key={station.id}
                station={station}
                isPlaying={playingStationId === station.id}
                onToggle={() => handleTogglePlay(station.id)}
              />
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.Background.primary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.Text.primary },
  countBadge: {
    backgroundColor: Colors.Glass.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: { color: Colors.Info.default, fontSize: 14, fontWeight: '600' },
  genreContainer: { maxHeight: 50 },
  genreContent: { paddingHorizontal: 16, gap: 8 },
  genreChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.Glass.bgLight,
    borderWidth: 1,
    borderColor: Colors.Glass.borderLight,
  },
  genreChipActive: { backgroundColor: Colors.Glass.borderLight, borderColor: Colors.Info.default },
  genreChipText: { color: Colors.Text.secondary, fontSize: 14, fontWeight: '500' },
  genreTextActive: { color: Colors.Info.default },
  scrollView: { flex: 1 },
  stationsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 },
  stationCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.Glass.bgLight,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.Glass.borderLight,
  },
  stationCardActive: { borderColor: Colors.Info.default, backgroundColor: Colors.Glass.borderLight },
  stationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  stationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.Glass.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  stationIconActive: { backgroundColor: Colors.Glass.purpleLight },
  stationLogo: { width: 40, height: 40, borderRadius: 20 },
  favoriteButton: { padding: 4 },
  stationName: { fontSize: 16, fontWeight: '600', color: Colors.Text.primary, marginBottom: 2 },
  stationFrequency: { fontSize: 12, color: Colors.Info.default, marginBottom: 4 },
  nowPlaying: { fontSize: 12, color: Colors.Text.muted, marginBottom: 8 },
  genreBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.Glass.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 12,
  },
  genreText: { fontSize: 10, color: Colors.Info.default },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.Info.default,
    paddingVertical: 8,
    borderRadius: 8,
  },
  playButtonActive: { backgroundColor: Colors.Error.e600 },
  playButtonText: { color: Colors.Text.primary, fontWeight: '600', fontSize: 14 },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: { color: Colors.Text.muted, fontSize: 16 },
  errorText: { color: Colors.Error.e600, fontSize: 16, textAlign: 'center', paddingHorizontal: 32 },
  retryButton: {
    backgroundColor: Colors.Glass.borderLight,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: { color: Colors.Info.default, fontSize: 16, fontWeight: '600' },
  emptyState: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  emptyText: { color: Colors.Text.muted, fontSize: 16 },
});
