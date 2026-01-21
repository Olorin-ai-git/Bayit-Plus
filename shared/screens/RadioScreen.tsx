import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
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
import { getLocalizedName } from '../utils/contentLocalization';

interface RadioStation {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
  logo?: string;
  currentShow?: string;
  current_show?: string;
  current_show_en?: string;
  current_show_es?: string;
  genre?: string;
  frequency?: string;
}

const StationCard: React.FC<{
  station: RadioStation;
  onPress: () => void;
  index: number;
  localizedName: string;
}> = ({ station, onPress, index, localizedName }) => {
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
      className="flex-1 m-2 max-w-[25%]"
      hasTVPreferredFocus={index === 0}
    >
      <Animated.View
        className={`bg-white/10 rounded-2xl p-5 border ${isFocused ? 'border-purple-500 bg-white/20' : 'border-white/20'} min-h-[200px] relative`}
        style={{ transform: [{ scale: scaleAnim }] }}
      >
        {/* Station Logo */}
        <View className="h-[70px] justify-center items-center mb-4">
          {station.logo ? (
            <Image
              source={{ uri: station.logo }}
              className="w-[70px] h-[70px] rounded-full"
              resizeMode="contain"
            />
          ) : (
            <View className="w-[70px] h-[70px] rounded-full bg-purple-500/20 justify-center items-center">
              <Animated.View
                className="flex-row items-center h-[30px] gap-1"
                style={isFocused ? { transform: [{ scale: pulseAnim }] } : undefined}
              >
                <View className="w-1 h-3 bg-purple-500 rounded-sm" />
                <View className="w-1 h-5 bg-purple-500 rounded-sm" />
                <View className="w-1 h-7 bg-purple-500 rounded-sm" />
                <View className="w-1 h-5 bg-purple-500 rounded-sm" />
                <View className="w-1 h-3 bg-purple-500 rounded-sm" />
              </Animated.View>
            </View>
          )}
        </View>

        {/* Station Info */}
        <View className="flex-1 items-center">
          <Text className="text-lg font-bold text-white text-center mb-1" numberOfLines={1}>
            {localizedName}
          </Text>
          {station.frequency && (
            <Text className="text-sm text-purple-500 font-semibold mb-1">{station.frequency}</Text>
          )}
          {station.currentShow && (
            <Text className="text-xs text-white/60 text-center" numberOfLines={1}>
              {station.currentShow}
            </Text>
          )}
          {station.genre && (
            <View className="mt-2 px-3 py-1 rounded-xl bg-purple-500/20">
              <Text className="text-xs text-purple-500">{station.genre}</Text>
            </View>
          )}
        </View>

        {/* Play Icon */}
        <View className={`absolute top-3 right-3 w-8 h-8 rounded-2xl ${isFocused ? 'bg-purple-500' : 'bg-white/20'} justify-center items-center`}>
          <Text className="text-sm text-white">▶</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export const RadioScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
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
    const localizedTitle = getLocalizedName(station, i18n.language);
    navigation.navigate('Player', {
      id: station.id,
      title: localizedTitle,
      type: 'radio',
    });
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color="#a855f7" />
        <Text className="text-white text-lg mt-4">{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Header */}
      <View
        className="px-12 pt-10 pb-5 items-center gap-3"
        style={{ flexDirection: isRTL ? 'row' : 'row-reverse' }}
      >
        <View
          className="w-[60px] h-[60px] rounded-full bg-purple-600/20 justify-center items-center"
          style={isRTL ? { marginLeft: 20 } : { marginRight: 20 }}
        >
          <Text className="text-3xl">📻</Text>
        </View>
        <View>
          <Text className="text-5xl font-bold text-white" style={{ textAlign }}>{t('radio.title')}</Text>
          <Text className="text-lg text-white/60 mt-0.5" style={{ textAlign }}>{filteredStations.length} {t('radio.stations')}</Text>
        </View>
      </View>

      {/* Genre Filter */}
      <View
        className="px-12 mb-6 gap-3 z-10"
        style={{ flexDirection: isRTL ? 'row' : 'row-reverse', justifyContent: 'flex-start' }}
      >
        {genres.map((genre, index) => (
          <TouchableOpacity
            key={genre.id}
            onPress={() => setSelectedGenre(genre.id)}
            className={`px-6 py-3 rounded-3xl border ${
              selectedGenre === genre.id
                ? 'bg-purple-600/20 border-purple-500'
                : 'bg-white/10 border-white/20'
            } justify-center items-center`}
          >
            <Text
              className={`text-base ${
                selectedGenre === genre.id
                  ? 'text-purple-500 font-bold'
                  : 'text-white/60'
              }`}
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
        contentContainerClassName="px-10 pb-10 pt-4"
        renderItem={({ item, index }) => (
          <StationCard
            station={item}
            onPress={() => handleStationPress(item)}
            index={index}
            localizedName={getLocalizedName(item, i18n.language)}
          />
        )}
      />
    </View>
  );
};

export default RadioScreen;
