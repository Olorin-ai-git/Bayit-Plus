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
import { liveService } from '../services/api';
import { colors, spacing } from '../theme';
import { useDirection } from '@bayit/shared/hooks';
import { GlassCategoryPill } from '../components';
import { getLocalizedName, getLocalizedCurrentProgram } from '@bayit/shared-utils/contentLocalization';

interface Channel {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
  logo?: string;
  currentProgram?: string;
  current_program?: string;
  current_program_en?: string;
  current_program_es?: string;
  category?: string;
}

const ChannelCard: React.FC<{
  channel: Channel;
  onPress: () => void;
  index: number;
  liveLabel: string;
  localizedName: string;
  localizedProgram: string;
}> = ({ channel, onPress, index, liveLabel, localizedName, localizedProgram }) => {
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

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
        className={`bg-white/10 rounded-2xl p-5 border ${isFocused ? 'border-purple-500' : 'border-white/20'} min-h-[180px]`}
        style={{ transform: [{ scale: scaleAnim }] }}
      >
        {/* Channel Logo */}
        <View className="h-[60px] justify-center items-center mb-4">
          {channel.logo ? (
            <Image
              source={{ uri: channel.logo }}
              className="w-20 h-[60px]"
              resizeMode="contain"
            />
          ) : (
            <View className="w-[60px] h-[60px] rounded-full bg-[#2a2235] justify-center items-center">
              <Text className="text-2xl font-bold text-purple-500">{channel.name[0]}</Text>
            </View>
          )}
        </View>

        {/* Channel Info */}
        <View className="flex-1">
          <Text className="text-xl font-bold text-white text-center mb-1" numberOfLines={1}>
            {localizedName}
          </Text>
          {localizedProgram && (
            <Text className="text-sm text-gray-400 text-center" numberOfLines={1}>
              {localizedProgram}
            </Text>
          )}
        </View>

        {/* Live Indicator */}
        <View className="flex-row items-center justify-center mt-3">
          <View className="w-2 h-2 rounded-full bg-red-500 mr-1.5" />
          <Text className="text-xs text-red-500 font-bold">{liveLabel}</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export const LiveTVScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  const categories = [
    { id: 'all', labelKey: 'liveTV.categories.all' },
    { id: 'news', labelKey: 'liveTV.categories.news' },
    { id: 'entertainment', labelKey: 'liveTV.categories.entertainment' },
    { id: 'sports', labelKey: 'liveTV.categories.sports' },
    { id: 'kids', labelKey: 'liveTV.categories.kids' },
  ];

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await liveService.getChannels() as any;
      setChannels(response.channels || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('liveTv.loadError', 'Failed to load channels');
      setError(errorMessage);
      setChannels([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredChannels = selectedCategory === 'all'
    ? channels
    : channels.filter(c => c.category === selectedCategory);

  const handleChannelPress = (channel: Channel) => {
    const localizedTitle = getLocalizedName(channel, i18n.language);
    navigation.navigate('Player', {
      id: channel.id,
      title: localizedTitle,
      type: 'live',
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
        <View className="w-[60px] h-[60px] rounded-full bg-purple-700/30 justify-center items-center" style={{ marginLeft: isRTL ? 20 : 0, marginRight: isRTL ? 0 : 20 }}>
          <Text className="text-[28px]">📺</Text>
        </View>
        <View>
          <Text className="text-[42px] font-bold text-white" style={{ textAlign }}>{t('liveTV.title')}</Text>
          <Text className="text-lg text-gray-400 mt-1" style={{ textAlign }}>{filteredChannels.length} {t('liveTV.channels')}</Text>
        </View>
      </View>

      {/* Category Filter */}
      <View className="px-12 mb-6 gap-3 z-10" style={{ flexDirection: isRTL ? 'row' : 'row-reverse', justifyContent: isRTL ? 'flex-start' : 'flex-start' }}>
        {categories.map((cat, index) => (
          <GlassCategoryPill
            key={cat.id}
            label={t(cat.labelKey)}
            isActive={selectedCategory === cat.id}
            onPress={() => setSelectedCategory(cat.id)}
            hasTVPreferredFocus={index === 0}
          />
        ))}
      </View>

      {/* Channel Grid */}
      <FlatList
        data={filteredChannels}
        keyExtractor={(item) => item.id}
        numColumns={4}
        contentContainerStyle={{ paddingHorizontal: 40, paddingBottom: 40, paddingTop: 16, direction: 'ltr' }}
        renderItem={({ item, index }) => (
          <ChannelCard
            channel={item}
            onPress={() => handleChannelPress(item)}
            index={index}
            liveLabel={t('common.live')}
            localizedName={getLocalizedName(item, i18n.language)}
            localizedProgram={getLocalizedCurrentProgram(item, i18n.language)}
          />
        )}
      />
    </View>
  );
};

export default LiveTVScreen;
