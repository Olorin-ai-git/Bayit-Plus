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
            <Volume2 size={20} color="#4a9eff" />
          ) : (
            <Radio size={20} color="rgba(74, 158, 255, 0.6)" />
          )}
        </View>
        <Pressable style={styles.favoriteButton}>
          <Heart size={16} color="rgba(255, 255, 255, 0.4)" />
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
          <Pause size={16} color="#fff" fill="#fff" />
        ) : (
          <Play size={16} color="#fff" fill="#fff" />
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
          <Radio size={24} color="#4a9eff" strokeWidth={2} />
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
          <ActivityIndicator size="large" color="#4a9eff" />
          <Text style={styles.loadingText}>Loading radio stations...</Text>
        </View>
      )}

      {/* Error State */}
      {error && !loading && (
        <View style={styles.centerContent}>
          <AlertCircle size={48} color="#e53935" />
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4a9eff" />
          }
        >
          {filteredStations.length === 0 ? (
            <View style={styles.emptyState}>
              <Radio size={48} color="rgba(255, 255, 255, 0.3)" />
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
  container: { flex: 1, backgroundColor: '#0d0d1a' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  countBadge: {
    backgroundColor: 'rgba(74, 158, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: { color: '#4a9eff', fontSize: 14, fontWeight: '600' },
  genreContainer: { maxHeight: 50 },
  genreContent: { paddingHorizontal: 16, gap: 8 },
  genreChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  genreChipActive: { backgroundColor: 'rgba(74, 158, 255, 0.2)', borderColor: '#4a9eff' },
  genreChipText: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 14, fontWeight: '500' },
  genreTextActive: { color: '#4a9eff' },
  scrollView: { flex: 1 },
  stationsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 },
  stationCard: {
    width: CARD_WIDTH,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  stationCardActive: { borderColor: '#4a9eff', backgroundColor: 'rgba(74, 158, 255, 0.1)' },
  stationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  stationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 158, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  stationIconActive: { backgroundColor: 'rgba(74, 158, 255, 0.3)' },
  stationLogo: { width: 40, height: 40, borderRadius: 20 },
  favoriteButton: { padding: 4 },
  stationName: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 2 },
  stationFrequency: { fontSize: 12, color: '#4a9eff', marginBottom: 4 },
  nowPlaying: { fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', marginBottom: 8 },
  genreBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(74, 158, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 12,
  },
  genreText: { fontSize: 10, color: '#4a9eff' },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(74, 158, 255, 0.8)',
    paddingVertical: 8,
    borderRadius: 8,
  },
  playButtonActive: { backgroundColor: '#e53935' },
  playButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 16 },
  errorText: { color: '#e53935', fontSize: 16, textAlign: 'center', paddingHorizontal: 32 },
  retryButton: {
    backgroundColor: 'rgba(74, 158, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: { color: '#4a9eff', fontSize: 16, fontWeight: '600' },
  emptyState: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  emptyText: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 16 },
});
