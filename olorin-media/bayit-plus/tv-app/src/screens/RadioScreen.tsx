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
import { useDirection } from '@bayit/shared/hooks';

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
      className="flex-1 m-2 max-w-[25%]"
      hasTVPreferredFocus={index === 0}
    >
      <Animated.View
        className={`bg-white/10 rounded-2xl p-5 border relative min-h-[200px] ${isFocused ? 'border-purple-600' : 'border-white/20'}`}
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
            <View className="w-[70px] h-[70px] rounded-full bg-purple-600/20 justify-center items-center">
              <Animated.View
                className="flex-row items-center h-[30px] gap-[3px]"
                style={isFocused && { transform: [{ scale: pulseAnim }] }}
              >
                <View className="w-1 h-3 bg-purple-600 rounded-sm" />
                <View className="w-1 h-5 bg-purple-600 rounded-sm" />
                <View className="w-1 h-7 bg-purple-600 rounded-sm" />
                <View className="w-1 h-5 bg-purple-600 rounded-sm" />
                <View className="w-1 h-3 bg-purple-600 rounded-sm" />
              </Animated.View>
            </View>
          )}
        </View>

        {/* Station Info */}
        <View className="flex-1 items-center">
          <Text className="text-lg font-bold text-white text-center mb-1" numberOfLines={1}>
            {station.name}
          </Text>
          {station.frequency && (
            <Text className="text-sm text-purple-600 font-semibold mb-1">{station.frequency}</Text>
          )}
          {station.currentShow && (
            <Text className="text-[13px] text-gray-400 text-center" numberOfLines={1}>
              {station.currentShow}
            </Text>
          )}
          {station.genre && (
            <View className="mt-2 px-3 py-1 rounded-xl bg-purple-600/20">
              <Text className="text-[11px] text-purple-600">{station.genre}</Text>
            </View>
          )}
        </View>

        {/* Play Icon */}
        <View className={`absolute top-3 right-3 w-8 h-8 rounded-full justify-center items-center ${isFocused ? 'bg-purple-600' : 'bg-white/20'}`}>
          <Text className="text-sm text-white">▶</Text>
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
      <View className="flex-1 bg-[#0a0a1a] justify-center items-center">
        <ActivityIndicator size="large" color="#a855f7" />
        <Text className="text-white text-lg mt-4">{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0a0a1a]">
      {/* Header */}
      <View className="flex-row items-center px-12 pt-10 pb-5" style={{ flexDirection: isRTL ? 'row' : 'row-reverse' }}>
        <View className="w-[60px] h-[60px] rounded-full bg-purple-600/20 justify-center items-center" style={{ marginLeft: isRTL ? 20 : 0, marginRight: isRTL ? 0 : 20 }}>
          <Text className="text-[28px]">📻</Text>
        </View>
        <View>
          <Text className="text-[42px] font-bold text-white text-right" style={{ textAlign }}>{t('radio.title')}</Text>
          <Text className="text-lg text-gray-400 mt-0.5 text-right" style={{ textAlign }}>{filteredStations.length} {t('radio.stations')}</Text>
        </View>
      </View>

      {/* Genre Filter */}
      <View className="px-12 mb-6 gap-3 z-10" style={{ flexDirection: isRTL ? 'row' : 'row-reverse', justifyContent: 'flex-start' }}>
        {genres.map((genre, index) => (
          <TouchableOpacity
            key={genre.id}
            onPress={() => setSelectedGenre(genre.id)}
            className={`px-6 py-3 rounded-full border justify-center items-center ${selectedGenre === genre.id ? 'bg-purple-600/20 border-purple-600' : 'bg-white/10 border-white/20'}`}
          >
            <Text
              className={`text-base ${selectedGenre === genre.id ? 'text-purple-600 font-bold' : 'text-gray-400'}`}
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
        contentContainerStyle={{ paddingHorizontal: 40, paddingBottom: 40, paddingTop: 16, direction: 'ltr' }}
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

export default RadioScreen;
