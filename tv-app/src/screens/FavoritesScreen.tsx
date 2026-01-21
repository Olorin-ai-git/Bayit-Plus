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
import { GlassView } from '../components';
import { colors, spacing, borderRadius } from '../theme';
import { isTV } from '../utils/platform';
import { useDirection } from '@bayit/shared/hooks';
import { demoFavorites, type FavoriteItem } from '../demo/favorites';

const TYPE_ICONS: Record<string, string> = {
  movie: '🎬',
  series: '📺',
  channel: '📡',
  podcast: '🎙️',
  radio: '📻',
};

const FavoriteCard: React.FC<{
  item: FavoriteItem;
  onPress: () => void;
  onRemove: () => void;
  index: number;
  getLocalizedText: (item: any, field: string) => string;
}> = ({ item, onPress, onRemove, index, getLocalizedText }) => {
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { isRTL, textAlign } = useDirection();

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
      // @ts-ignore
      hasTVPreferredFocus={index === 0}
    >
      <Animated.View
        className={`bg-[#1a1525] rounded-lg overflow-hidden border-[3px] ${isFocused ? 'border-purple-500' : 'border-transparent'}`}
        style={{ transform: [{ scale: scaleAnim }] }}
      >
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            className="w-full aspect-video"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full aspect-video bg-[#2a2235] justify-center items-center">
            <Text className="text-[32px]">{TYPE_ICONS[item.type] || '⭐'}</Text>
          </View>
        )}
        <View className="absolute top-2 bg-black/70 rounded-xl px-2 py-1" style={isRTL ? { left: 8 } : { right: 8 }}>
          <Text className="text-sm">{TYPE_ICONS[item.type]}</Text>
        </View>
        <View className="p-2">
          <Text className="text-sm font-semibold text-white" style={{ textAlign }} numberOfLines={1}>
            {getLocalizedText(item, 'title')}
          </Text>
          {item.subtitle && (
            <Text className="text-xs text-gray-400 mt-0.5" style={{ textAlign }} numberOfLines={1}>
              {getLocalizedText(item, 'subtitle')}
            </Text>
          )}
        </View>
        {isFocused && (
          <View className="absolute inset-0 bg-black/40 justify-center items-center">
            <View className="flex-row gap-4">
              <View className="w-12 h-12 rounded-full bg-purple-500 justify-center items-center">
                <Text className="text-xl text-[#0a0a1a] ml-1">▶</Text>
              </View>
              <TouchableOpacity onPress={onRemove} className="w-12 h-12 rounded-full bg-white/20 justify-center items-center">
                <Text className="text-lg text-white">✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

export const FavoritesScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const currentLang = i18n.language;

  // Helper to get localized text
  const getLocalizedText = (item: any, field: string) => {
    if (currentLang === 'he') return item[field] || item.title || item.name;
    if (currentLang === 'es') return item[`${field}_es`] || item[`${field}_en`] || item[field];
    return item[`${field}_en`] || item[field];
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      setIsLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setFavorites(demoFavorites);
    } catch (err) {
      console.error('Failed to load favorites:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemPress = (item: FavoriteItem) => {
    const typeMap: Record<string, string> = {
      movie: 'vod',
      series: 'vod',
      channel: 'live',
      podcast: 'podcast',
      radio: 'radio',
    };
    navigation.navigate('Player', {
      id: item.id,
      title: getLocalizedText(item, 'title'),
      type: typeMap[item.type] || 'vod',
    });
  };

  const handleRemoveFavorite = (id: string) => {
    setFavorites(prev => prev.filter(item => item.id !== id));
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#0a0a1a] justify-center items-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-white text-lg mt-4">{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0a0a1a]">
      {/* Header */}
      <View className="flex-row items-center px-12 pt-10 pb-5" style={{ flexDirection: isRTL ? 'row' : 'row-reverse' }}>
        <View className="w-[60px] h-[60px] rounded-full bg-yellow-500/20 justify-center items-center" style={{ marginLeft: isRTL ? 20 : 0, marginRight: isRTL ? 0 : 20 }}>
          <Text className="text-[28px]">⭐</Text>
        </View>
        <View>
          <Text className="text-[42px] font-bold text-white" style={{ textAlign }}>{t('favorites.title')}</Text>
          <Text className="text-lg text-gray-400 mt-0.5" style={{ textAlign }}>
            {favorites.length} {t('favorites.items')}
          </Text>
        </View>
      </View>

      {/* Content Grid */}
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        numColumns={isTV ? 6 : 4}
        key={isTV ? 'tv' : 'mobile'}
        contentContainerStyle={{ paddingHorizontal: 32, paddingBottom: 48, paddingTop: 16 }}
        renderItem={({ item, index }) => (
          <FavoriteCard
            item={item}
            onPress={() => handleItemPress(item)}
            onRemove={() => handleRemoveFavorite(item.id)}
            index={index}
            getLocalizedText={getLocalizedText}
          />
        )}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-[60px]">
            <GlassView className="p-12 items-center">
              <Text className="text-[64px] mb-4">⭐</Text>
              <Text className="text-xl font-semibold text-white mb-2" style={{ textAlign }}>{t('favorites.empty')}</Text>
              <Text className="text-base text-gray-400" style={{ textAlign }}>{t('favorites.emptyHint')}</Text>
            </GlassView>
          </View>
        }
      />
    </View>
  );
};

export default FavoritesScreen;
