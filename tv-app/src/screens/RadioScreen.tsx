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
import { useTranslation } from 'react-i18next';
import { radioService } from '../services/api';
import { colors } from '../theme';
import { useDirection } from '../hooks/useDirection';

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
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>('all');

  const genres = [
    { id: 'all', labelKey: 'radio.genres.all' },
    { id: 'news', labelKey: 'radio.genres.news' },
    { id: 'music', labelKey: 'radio.genres.music' },
    { id: 'talk', labelKey: 'radio.genres.talk' },
    { id: 'army', labelKey: 'radio.genres.army' },
  ];

  useEffect(() => {
    loadStations();
  }, []);

  const loadStations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await radioService.getStations() as any;
      setStations(response.stations || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('radio.loadError', 'Failed to load stations');
      setError(errorMessage);
      setStations([]);
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
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
        <View style={[styles.headerIcon, { marginLeft: isRTL ? 20 : 0, marginRight: isRTL ? 0 : 20 }]}>
          <Text style={styles.headerIconText}>📻</Text>
        </View>
        <View>
          <Text style={[styles.title, { textAlign }]}>{t('radio.title')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>{filteredStations.length} {t('radio.stations')}</Text>
        </View>
      </View>

      {/* Genre Filter */}
      <View style={[styles.genres, { flexDirection: isRTL ? 'row' : 'row-reverse', justifyContent: 'flex-start' }]}>
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
              {t(genre.labelKey)}
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
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text,
    fontSize: 18,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingTop: 40,
    paddingBottom: 20,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(138, 43, 226, 0.2)',
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
    color: colors.text,
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'right',
  },
  genres: {
    flexDirection: 'row',
    paddingHorizontal: 48,
    marginBottom: 24,
    gap: 12,
    zIndex: 10,
  },
  genreButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genreButtonActive: {
    backgroundColor: 'rgba(138, 43, 226, 0.2)',
    borderColor: colors.secondary,
  },
  genreButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  genreButtonTextActive: {
    color: colors.secondary,
    fontWeight: 'bold',
  },
  grid: {
    paddingHorizontal: 40,
    paddingBottom: 40,
    paddingTop: 16,
    direction: 'ltr',
  },
  cardTouchable: {
    flex: 1,
    margin: 8,
    maxWidth: '25%',
  },
  stationCard: {
    backgroundColor: colors.glass,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    minHeight: 200,
    position: 'relative',
  },
  stationCardFocused: {
    borderColor: colors.secondary,
    backgroundColor: colors.backgroundLighter,
    // @ts-ignore - Web CSS property for glow effect
    boxShadow: `0 0 20px ${colors.secondary}`,
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
    backgroundColor: colors.secondary,
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
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  frequency: {
    fontSize: 14,
    color: colors.secondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  currentShow: {
    fontSize: 13,
    color: colors.textSecondary,
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
    color: colors.secondary,
  },
  playIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconFocused: {
    backgroundColor: colors.secondary,
  },
  playIconText: {
    fontSize: 14,
    color: colors.text,
  },
});

export default RadioScreen;
