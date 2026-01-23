import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { GlassView, GlassCategoryPill } from '../components/ui';
import { colors, spacing, borderRadius } from '../theme';
import { isTV } from '../utils/platform';
import { useDirection } from '../hooks/useDirection';
import { useYouTubeThumbnail } from '../hooks/useYouTubeThumbnail';
import { getLocalizedName, getLocalizedDescription } from '../utils/contentLocalization';
import { judaismService } from '../services/api';
import { JerusalemRow } from '../components/JerusalemRow';
import { TelAvivRow } from '../components/TelAvivRow';

interface JudaismItem {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  subtitle?: string;
  subtitle_en?: string;
  subtitle_es?: string;
  thumbnail?: string;
  type: 'shiur' | 'prayer' | 'music' | 'documentary' | 'lecture' | 'holiday';
  duration?: string;
  rabbi?: string;
  rabbi_en?: string;
  rabbi_es?: string;
}

interface Category {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
  icon: string;
}

const TYPE_ICONS: Record<string, string> = {
  shiur: '📖',
  prayer: '🕯️',
  music: '🎵',
  documentary: '🎬',
  lecture: '🎓',
  holiday: '🕎',
};

const JudaismCard: React.FC<{
  item: JudaismItem;
  onPress: () => void;
  index: number;
  getLocalizedText: (item: any, field: string) => string;
}> = ({ item, onPress, index, getLocalizedText }) => {
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { isRTL, textAlign } = useDirection();
  const { thumbnailUrl, handleError } = useYouTubeThumbnail(item.thumbnail);

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
      className={`flex-1 m-2 ${isTV ? 'max-w-[20%]' : 'max-w-[33.33%]'}`}
      // @ts-ignore
      hasTVPreferredFocus={index === 0}
    >
      <Animated.View
        style={{ transform: [{ scale: scaleAnim }] }}
        className={`bg-white/10 rounded-2xl overflow-hidden border-[3px] ${isFocused ? 'border-purple-500' : 'border-transparent'}`}
      >
        {thumbnailUrl ? (
          <Image
            source={{ uri: thumbnailUrl }}
            className="w-full aspect-video"
            resizeMode="cover"
            onError={handleError}
          />
        ) : (
          <View className="w-full aspect-video bg-white/20 justify-center items-center">
            <Text className="text-5xl">{TYPE_ICONS[item.type] || '✡️'}</Text>
          </View>
        )}
        <View className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'} bg-black/70 rounded-xl px-2 py-1`}>
          <Text className="text-sm">{TYPE_ICONS[item.type]}</Text>
        </View>
        {item.duration && (
          <View className={`absolute top-2 ${isRTL ? 'right-2' : 'left-2'} bg-purple-500 rounded-lg px-1.5 py-0.5`}>
            <Text className="text-[10px] text-white font-bold">{item.duration}</Text>
          </View>
        )}
        <View className="p-2">
          <Text className={`text-sm font-semibold text-white ${textAlign === 'right' ? 'text-right' : 'text-left'}`} numberOfLines={2}>
            {getLocalizedText(item, 'title')}
          </Text>
          {item.rabbi && (
            <Text className={`text-xs text-purple-300 mt-0.5 ${textAlign === 'right' ? 'text-right' : 'text-left'}`} numberOfLines={1}>
              {getLocalizedText(item, 'rabbi')}
            </Text>
          )}
          {item.subtitle && (
            <Text className={`text-[11px] text-gray-400 mt-0.5 ${textAlign === 'right' ? 'text-right' : 'text-left'}`} numberOfLines={1}>
              {getLocalizedText(item, 'subtitle')}
            </Text>
          )}
        </View>
        {isFocused && (
          <View className="absolute inset-0 bg-black/60 justify-center items-center">
            <View className="w-14 h-14 rounded-full bg-purple-500 justify-center items-center">
              <Text className="text-2xl text-white ml-1">▶</Text>
            </View>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

export const JudaismScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState<JudaismItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const currentLang = i18n.language;

  const getLocalizedText = (item: any, field: string) => {
    if (field === 'title') return getLocalizedName(item, currentLang);
    if (field === 'description') return getLocalizedDescription(item, currentLang);
    // Fallback for other fields
    if (currentLang === 'he') return item[field] || item.title || item.name;
    if (currentLang === 'es') return item[`${field}_es`] || item[`${field}_en`] || item[field];
    return item[`${field}_en`] || item[field];
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadContent();
  }, [selectedCategory]);

  const loadCategories = async () => {
    try {
      const response = await judaismService.getCategories();
      // Response is already unwrapped by axios interceptor
      if (response?.categories && Array.isArray(response.categories)) {
        setCategories(response.categories);
      }
    } catch (err) {
      console.error('Failed to load Judaism categories:', err);
    }
  };

  const loadContent = async () => {
    try {
      setIsLoading(true);
      const category = selectedCategory !== 'all' ? selectedCategory : undefined;
      const response = await judaismService.getContent(category);
      // Response is already unwrapped by axios interceptor
      if (response?.content && Array.isArray(response.content)) {
        setContent(response.content);
      }
    } catch (err) {
      console.error('Failed to load Judaism content:', err);
      setContent([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemPress = (item: JudaismItem) => {
    navigation.navigate('Player', {
      id: item.id,
      title: getLocalizedText(item, 'title'),
      type: item.type === 'music' ? 'radio' : 'vod',
    });
  };

  if (isLoading && content.length === 0) {
    return (
      <View className="flex-1 bg-[#0a0a14] justify-center items-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-white text-lg mt-4">{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0a0a14]">
      <View className={`flex-row items-center px-12 pt-10 pb-6 ${isRTL ? 'flex-row' : 'flex-row-reverse'}`}>
        <View className={`w-[60px] h-[60px] rounded-full bg-purple-600/20 justify-center items-center ${isRTL ? 'ml-6' : 'mr-6'}`}>
          <Text className="text-[28px]">✡️</Text>
        </View>
        <View>
          <Text className={`text-[42px] font-bold text-white ${textAlign === 'right' ? 'text-right' : 'text-left'}`}>{t('judaism.title')}</Text>
          <Text className={`text-lg text-gray-400 mt-0.5 ${textAlign === 'right' ? 'text-right' : 'text-left'}`}>
            {content.length} {t('judaism.items')}
          </Text>
        </View>
      </View>

      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 48, marginBottom: 24, gap: 12, flexDirection: isRTL ? 'row' : 'row-reverse' }}
        >
          {(isRTL ? categories : [...categories].reverse()).map((category, index) => (
            <GlassCategoryPill
              key={category.id}
              label={getLocalizedText(category, 'name')}
              emoji={category.icon}
              isActive={selectedCategory === category.id}
              onPress={() => setSelectedCategory(category.id)}
              hasTVPreferredFocus={index === 0}
            />
          ))}
        </ScrollView>
      )}

      <FlatList
        data={content}
        keyExtractor={(item) => item.id}
        numColumns={isTV ? 5 : 3}
        key={isTV ? 'tv' : 'mobile'}
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: 48, paddingTop: 16 }}
        ListHeaderComponent={
          <View>
            <View className="mb-6 -mx-4">
              <JerusalemRow showTitle={false} />
            </View>
            <View className="mb-6 -mx-4">
              <TelAvivRow showTitle={false} />
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <JudaismCard
            item={item}
            onPress={() => handleItemPress(item)}
            index={index}
            getLocalizedText={getLocalizedText}
          />
        )}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-15">
            <GlassView className="p-12 items-center">
              <Text className="text-[64px] mb-4">✡️</Text>
              <Text className={`text-xl font-semibold text-white mb-2 ${textAlign === 'right' ? 'text-right' : 'text-left'}`}>{t('judaism.empty')}</Text>
              <Text className={`text-base text-gray-400 ${textAlign === 'right' ? 'text-right' : 'text-left'}`}>{t('judaism.emptyHint')}</Text>
            </GlassView>
          </View>
        }
      />
    </View>
  );
};

export default JudaismScreen;
