import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { radioService } from '../services/api';

interface RadioStation {
  id: string;
  name: string;
  logo?: string;
  currentShow?: string;
  genre?: string;
  frequency?: string;
}

const StationCard: React.FC<{
  station: RadioStation;
  onPress: () => void;
  index: number;
}> = ({ station, onPress, index }) => {
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse animation for the audio wave effect
    if (isFocused) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.08,
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
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      activeOpacity={1}
      style={styles.cardTouchable}
      hasTVPreferredFocus={index === 0}
    >
      <Animated.View
        style={[
          styles.stationCard,
          { transform: [{ scale: scaleAnim }] },
          isFocused && styles.stationCardFocused,
        ]}
      >
        {/* Station Logo */}
        <View style={styles.logoContainer}>
          {station.logo ? (
            <Image
              source={{ uri: station.logo }}
              style={styles.stationLogo}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Animated.View
                style={[
                  styles.audioWave,
                  isFocused && { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <View style={[styles.waveBar, styles.waveBar1]} />
                <View style={[styles.waveBar, styles.waveBar2]} />
                <View style={[styles.waveBar, styles.waveBar3]} />
                <View style={[styles.waveBar, styles.waveBar2]} />
                <View style={[styles.waveBar, styles.waveBar1]} />
              </Animated.View>
            </View>
          )}
        </View>

        {/* Station Info */}
        <View style={styles.stationInfo}>
          <Text style={styles.stationName} numberOfLines={1}>
            {station.name}
          </Text>
          {station.frequency && (
            <Text style={styles.frequency}>{station.frequency}</Text>
          )}
          {station.currentShow && (
            <Text style={styles.currentShow} numberOfLines={1}>
              {station.currentShow}
            </Text>
          )}
          {station.genre && (
            <View style={styles.genreBadge}>
              <Text style={styles.genreText}>{station.genre}</Text>
            </View>
          )}
        </View>

        {/* Play Icon */}
        <View style={[styles.playIcon, isFocused && styles.playIconFocused]}>
          <Text style={styles.playIconText}>▶</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export const RadioScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>('all');

  const genres = [
    { id: 'all', label: 'הכל' },
    { id: 'news', label: 'חדשות' },
    { id: 'music', label: 'מוזיקה' },
    { id: 'talk', label: 'טוק' },
    { id: 'army', label: 'צבאי' },
  ];

  useEffect(() => {
    loadStations();
  }, []);

  const loadStations = async () => {
    try {
      setIsLoading(true);
      const response = await radioService.getStations();

      if (response.stations?.length) {
        setStations(response.stations);
      } else {
        // Demo data
        setStations([
          { id: 'glz', name: 'גלי צה"ל', frequency: '102.3 FM', currentShow: 'מוזיקה ישראלית', genre: 'army' },
          { id: 'kan_bet', name: 'כאן בית', frequency: '95.5 FM', currentShow: 'סיפורי בוקר', genre: 'talk' },
          { id: 'kan_gimel', name: 'כאן גימל', frequency: '97.8 FM', currentShow: 'להיטים ישראליים', genre: 'music' },
          { id: '88fm', name: 'כאן 88', frequency: '88 FM', currentShow: 'רוק ישראלי', genre: 'music' },
          { id: 'reshet_aleph', name: 'רשת א', frequency: '104.5 FM', currentShow: 'חדשות', genre: 'news' },
          { id: '103fm', name: '103FM', frequency: '103 FM', currentShow: 'מוזיקה לועזית', genre: 'music' },
          { id: 'eco99', name: 'Eco 99FM', frequency: '99 FM', currentShow: 'להיטים בינלאומיים', genre: 'music' },
          { id: 'radius100', name: 'רדיוס 100', frequency: '100 FM', currentShow: 'בוקר טוב', genre: 'talk' },
          { id: 'fm100', name: '100FM', frequency: '100 FM', currentShow: 'מגזין ערב', genre: 'talk' },
          { id: 'kan_moreshet', name: 'כאן מורשת', frequency: '93.0 FM', currentShow: 'מוזיקה מזרחית', genre: 'music' },
          { id: 'galatz', name: 'גלצ', frequency: '102.3 FM', currentShow: 'תוכנית הבוקר', genre: 'army' },
          { id: 'kol_hai', name: 'קול חי', frequency: '93.0 FM', currentShow: 'מוזיקה חסידית', genre: 'music' },
        ]);
      }
    } catch (error) {
      console.error('Failed to load stations:', error);
      setStations([
        { id: 'glz', name: 'גלי צה"ל', frequency: '102.3 FM', genre: 'army' },
        { id: 'kan_bet', name: 'כאן בית', frequency: '95.5 FM', genre: 'talk' },
        { id: 'kan_gimel', name: 'כאן גימל', frequency: '97.8 FM', genre: 'music' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStations = selectedGenre === 'all'
    ? stations
    : stations.filter(s => s.genre === selectedGenre);

  const handleStationPress = (station: RadioStation) => {
    navigation.navigate('Player', {
      id: station.id,
      title: station.name,
      type: 'radio',
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00d9ff" />
        <Text style={styles.loadingText}>טוען תחנות...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>📻</Text>
        </View>
        <View>
          <Text style={styles.title}>רדיו</Text>
          <Text style={styles.subtitle}>{filteredStations.length} תחנות</Text>
        </View>
      </View>

      {/* Genre Filter */}
      <View style={styles.genres}>
        {genres.map((genre, index) => (
          <TouchableOpacity
            key={genre.id}
            onPress={() => setSelectedGenre(genre.id)}
            style={[
              styles.genreButton,
              selectedGenre === genre.id && styles.genreButtonActive,
            ]}
          >
            <Text
              style={[
                styles.genreButtonText,
                selectedGenre === genre.id && styles.genreButtonTextActive,
              ]}
            >
              {genre.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Station Grid */}
      <FlatList
        data={filteredStations}
        keyExtractor={(item) => item.id}
        numColumns={4}
        contentContainerStyle={styles.grid}
        renderItem={({ item, index }) => (
          <StationCard
            station={item}
            onPress={() => handleStationPress(item)}
            index={index}
          />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d1a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0d0d1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 18,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingTop: 40,
    paddingBottom: 20,
    width: '100%',
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 20,
  },
  headerIconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 18,
    color: '#888888',
    marginTop: 2,
    textAlign: 'right',
  },
  genres: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 48,
    marginBottom: 24,
    gap: 12,
  },
  genreButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#1a1a2e',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  genreButtonActive: {
    backgroundColor: 'rgba(138, 43, 226, 0.2)',
    borderColor: '#8a2be2',
  },
  genreButtonText: {
    fontSize: 16,
    color: '#888888',
  },
  genreButtonTextActive: {
    color: '#8a2be2',
    fontWeight: 'bold',
  },
  grid: {
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  cardTouchable: {
    flex: 1,
    margin: 8,
    maxWidth: '25%',
  },
  stationCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    borderWidth: 3,
    borderColor: 'transparent',
    minHeight: 200,
    position: 'relative',
  },
  stationCardFocused: {
    borderColor: '#8a2be2',
    backgroundColor: '#252542',
    shadowColor: '#8a2be2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  logoContainer: {
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  stationLogo: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  logoPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(138, 43, 226, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioWave: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    gap: 3,
  },
  waveBar: {
    width: 4,
    backgroundColor: '#8a2be2',
    borderRadius: 2,
  },
  waveBar1: {
    height: 12,
  },
  waveBar2: {
    height: 20,
  },
  waveBar3: {
    height: 28,
  },
  stationInfo: {
    flex: 1,
    alignItems: 'center',
  },
  stationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  frequency: {
    fontSize: 14,
    color: '#8a2be2',
    fontWeight: '600',
    marginBottom: 4,
  },
  currentShow: {
    fontSize: 13,
    color: '#888888',
    textAlign: 'center',
  },
  genreBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(138, 43, 226, 0.2)',
  },
  genreText: {
    fontSize: 11,
    color: '#8a2be2',
  },
  playIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconFocused: {
    backgroundColor: '#8a2be2',
  },
  playIconText: {
    fontSize: 14,
    color: '#ffffff',
  },
});

export default RadioScreen;
