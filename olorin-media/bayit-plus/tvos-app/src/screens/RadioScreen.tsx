/**
 * RadioScreen - Radio stations grid
 *
 * Features:
 * - Radio station grid (6 columns)
 * - Station logos and names
 * - Genre filters
 * - Now playing indicator
 */

import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Radio } from 'lucide-react-native';
import { api } from '@bayit/shared-services';
import { TVHeader } from '../components/TVHeader';
import { config } from '../config/appConfig';

interface RadioStation {
  id: string;
  name: string;
  logo?: string;
  genre?: string;
  frequency?: string;
  is_playing?: boolean;
}

const GENRES = ['All', 'News', 'Music', 'Talk', 'Sports', 'Religious'];

export const RadioScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [focusedStation, setFocusedStation] = useState<string | null>(null);

  const { data: stations, isLoading } = useQuery({
    queryKey: ['radio', selectedGenre],
    queryFn: async () => {
      const response = await api.get('/radio/stations', {
        params: { genre: selectedGenre === 'All' ? undefined : selectedGenre },
      });
      return response.data;
    },
  });

  const handleStationSelect = (station: RadioStation) => {
    navigation.navigate('Player', { stationId: station.id });
  };

  const renderGenre = ({ item }: { item: string }) => {
    const isSelected = selectedGenre === item;
    return (
      <Pressable onPress={() => setSelectedGenre(item)}>
        <View style={[styles.genre, isSelected && styles.genreSelected]}>
          <Text style={[styles.genreText, isSelected && styles.genreTextSelected]}>
            {item}
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderStation = ({ item, index }: { item: RadioStation; index: number }) => {
    const isFocused = focusedStation === item.id;
    return (
      <Pressable
        onPress={() => handleStationSelect(item)}
        onFocus={() => setFocusedStation(item.id)}
        hasTVPreferredFocus={index === 0}
        style={styles.stationButton}
      >
        <View style={[styles.stationCard, isFocused && styles.stationCardFocused]}>
          <View style={styles.logoContainer}>
            {item.logo ? (
              <Image source={{ uri: item.logo }} style={styles.logo} resizeMode="contain" />
            ) : (
              <Radio size={48} color="#A855F7" />
            )}
          </View>
          <Text style={styles.stationName} numberOfLines={2}>
            {item.name}
          </Text>
          {item.frequency && (
            <Text style={styles.frequency}>{item.frequency}</Text>
          )}
          {item.is_playing && <View style={styles.playingBadge} />}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <TVHeader currentScreen="radio" navigation={navigation} />

      <View style={styles.content}>
        <Text style={styles.title}>Radio Stations</Text>

        <FlatList
          horizontal
          data={GENRES}
          renderItem={renderGenre}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.genresContent}
        />

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading stations...</Text>
          </View>
        ) : stations && stations.length > 0 ? (
          <FlatList
            data={stations}
            renderItem={renderStation}
            keyExtractor={(item: RadioStation) => item.id}
            numColumns={6}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={styles.gridRow}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No stations available</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    paddingHorizontal: config.tv.safeZoneMarginPt,
  },
  title: {
    fontSize: config.tv.minTitleTextSizePt,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 24,
    marginBottom: 24,
  },
  genresContent: {
    gap: 12,
    marginBottom: 32,
  },
  genre: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    marginRight: 12,
  },
  genreSelected: {
    backgroundColor: '#A855F7',
  },
  genreText: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  genreTextSelected: {
    color: '#ffffff',
  },
  gridContent: {
    paddingBottom: config.tv.safeZoneMarginPt,
  },
  gridRow: {
    gap: 16,
    marginBottom: 16,
  },
  stationButton: {
    width: 180,
  },
  stationCard: {
    backgroundColor: 'rgba(20,20,35,0.85)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    gap: 8,
  },
  stationCardFocused: {
    borderColor: '#A855F7',
    borderWidth: config.tv.focusBorderWidth,
    transform: [{ scale: config.tv.focusScaleFactor }],
  },
  logoContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 40,
  },
  logo: {
    width: 64,
    height: 64,
  },
  stationName: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  frequency: {
    fontSize: 18,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
  },
  playingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: config.tv.minBodyTextSizePt,
    color: 'rgba(255,255,255,0.7)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: config.tv.minTitleTextSizePt,
    color: 'rgba(255,255,255,0.8)',
  },
});
