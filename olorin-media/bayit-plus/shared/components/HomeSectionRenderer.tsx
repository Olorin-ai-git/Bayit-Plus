import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ContentRow } from './ContentRow';
import { TrendingRow } from './TrendingRow';
import { JerusalemRow } from './JerusalemRow';
import { TelAvivRow } from './TelAvivRow';
import { GlassLiveChannelCard } from './ui/GlassLiveChannelCard';
import { useDirection } from '../hooks/useDirection';
import { isTV } from '../utils/platform';
import { getCategoryDisplayName } from '../utils/categoryDisplay';
import type { HomeSectionId } from '../types/homePageConfig';
import type { ContentItem, Channel } from '../hooks/useHomeContent';

interface HomeSectionRendererProps {
  sectionId: HomeSectionId;
  continueWatching: ContentItem[];
  featured: ContentItem[];
  liveChannels: Channel[];
  categories: { name: string; items: ContentItem[] }[];
  onItemPress: (item: ContentItem) => void;
  onLiveChannelPress: (channel: Channel) => void;
}

export const HomeSectionRenderer: React.FC<HomeSectionRendererProps> = ({
  sectionId,
  continueWatching,
  featured,
  liveChannels,
  categories,
  onItemPress,
  onLiveChannelPress,
}) => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const { isRTL } = useDirection();

  switch (sectionId) {
    case 'continue_watching':
      return continueWatching.length > 0 ? (
        <ContentRow
          key="continue_watching"
          title={t('home.continueWatching')}
          items={continueWatching}
          onItemPress={onItemPress}
        />
      ) : null;

    case 'live_tv':
      return liveChannels.length > 0 ? (
        <View key="live_tv" className={`${isTV ? 'mt-12' : 'mt-8'} ${isTV ? 'px-8' : 'px-4'}`}>
          <View className={`flex-row items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <View className={`flex-row items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <View className="flex-row items-center bg-red-600 px-2 py-1 rounded gap-1">
                <View className="w-1.5 h-1.5 rounded-full bg-white" />
                <Text className={`${isTV ? 'text-xs' : 'text-[10px]'} font-bold text-white`}>{t('common.live')}</Text>
              </View>
              <Text className={`${isTV ? 'text-[28px]' : 'text-xl'} font-bold text-white ${isRTL ? 'text-right' : ''}`}>{t('home.liveTV')}</Text>
            </View>
            <Pressable
              onPress={() => navigation.navigate('LiveTV')}
              className={({ focused }: any) => `px-2 py-1 rounded-sm border-2 ${focused ? 'border-purple-600 bg-purple-600/20' : 'border-transparent'}`}
            >
              <Text className={`${isTV ? 'text-lg' : 'text-sm'} text-purple-500 font-medium`}>{t('home.allChannels')}</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: isTV ? 16 : 12, paddingRight: 16 }}
            className={isRTL ? 'flex-row-reverse' : ''}
          >
            {liveChannels.slice(0, 8).map((channel) => (
              <View key={channel.id} className={isTV ? 'w-80' : 'w-60'}>
                <GlassLiveChannelCard
                  channel={channel}
                  liveLabel={t('common.live')}
                  onPress={() => onLiveChannelPress(channel)}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null;

    case 'trending':
      return (
        <View key="trending" className={`${isTV ? 'mt-12' : 'mt-8'} ${isTV ? 'px-8' : 'px-4'}`}>
          <TrendingRow
            onTopicPress={(topic) => {
              const lang = i18n.language;
              const localizedTitle = lang === 'he'
                ? topic.title
                : lang === 'es'
                  ? (topic.title_es || topic.title_en || topic.title)
                  : (topic.title_en || topic.title);
              navigation.navigate('Search', { query: localizedTitle });
            }}
          />
        </View>
      );

    case 'jerusalem':
      return (
        <View key="jerusalem" className={`${isTV ? 'mt-12' : 'mt-8'} ${isTV ? 'px-8' : 'px-4'}`}>
          <JerusalemRow />
        </View>
      );

    case 'tel_aviv':
      return (
        <View key="tel_aviv" className={`${isTV ? 'mt-12' : 'mt-8'} ${isTV ? 'px-8' : 'px-4'}`}>
          <TelAvivRow />
        </View>
      );

    case 'featured':
      return featured.length > 0 ? (
        <ContentRow
          key="featured"
          title={t('home.featuredContent')}
          items={featured}
          onItemPress={onItemPress}
        />
      ) : null;

    case 'categories':
      return (
        <React.Fragment key="categories">
          {categories.map((category) => (
            category.items.length > 0 && (
              <ContentRow
                key={category.name}
                title={getCategoryDisplayName(
                  category,
                  `home.${category.name}`,
                  i18n.language,
                  t
                )}
                items={category.items}
                onItemPress={onItemPress}
              />
            )
          ))}
        </React.Fragment>
      );

    default:
      return null;
  }
};
