import { useState, useEffect } from 'react';
import { View, Text, ScrollView, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useDirection } from '@/hooks/useDirection';
import { Radio } from 'lucide-react';
import { liveService } from '@/services/api';
import { colors, spacing } from '@bayit/shared/theme';
import { GlassView, GlassCard, GlassCategoryPill, GlassLiveChannelCard } from '@bayit/shared/ui';
import AnimatedCard from '@/components/common/AnimatedCard';
import logger from '@/utils/logger';

interface Channel {
  id: string;
  name: string;
  thumbnail?: string;
  logo?: string;
  currentShow?: string;
  nextShow?: string;
  category?: string;
}

export default function LivePage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection, justifyContent } = useDirection();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();
  const nextLabel = t('live.next');
  const liveLabel = t('common.live');

  const numColumns = width >= 1280 ? 5 : width >= 1024 ? 4 : width >= 768 ? 3 : 2;

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    try {
      const data = await liveService.getChannels();
      setChannels(data.channels || []);
    } catch (error) {
      logger.error('Failed to load channels', 'LivePage', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredChannels = selectedCategory === 'all'
    ? channels
    : channels.filter(c => c.category === selectedCategory);

  if (loading) {
    return (
      <View className="flex-1 px-4 py-6 max-w-[1400px] mx-auto w-full">
        <View className="w-48 h-8 bg-white/5 rounded-lg mb-6" />
        <View className="flex-row flex-wrap">
          {[...Array(10)].map((_, index) => (
            <View key={`skeleton-${index}`} style={{ width: `${100 / numColumns}%`, padding: spacing.xs }}>
              <View className="aspect-video bg-white/5 rounded-2xl" />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
      <View className="flex-1 px-4 py-6 max-w-[1400px] mx-auto w-full">
        {/* Header */}
        <View className={`flex-row items-center gap-2 mb-6 ${flexDirection === 'row-reverse' ? 'flex-row-reverse' : ''} ${justifyContent === 'flex-end' ? 'justify-end' : ''}`}>
          <GlassView className="w-12 h-12 rounded-full justify-center items-center bg-red-500/20">
            <Radio size={24} color={colors.error} />
          </GlassView>
          <Text className={`text-3xl font-bold text-white flex-1 ${textAlign === 'right' ? 'text-right' : ''}`}>{t('live.title')}</Text>
          {filteredChannels.length > 0 && (
            <View className="bg-white/10 px-3 py-1 rounded-full border border-white/20">
              <Text className="text-sm font-semibold text-white/70">{filteredChannels.length}</Text>
            </View>
          )}
        </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-6"
        contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.sm }}
      >
        <GlassCategoryPill
          label={t('live.categories.all')}
          isActive={selectedCategory === 'all'}
          onPress={() => setSelectedCategory('all')}
        />
        <GlassCategoryPill
          label={t('live.categories.news')}
          isActive={selectedCategory === 'news'}
          onPress={() => setSelectedCategory('news')}
        />
        <GlassCategoryPill
          label={t('live.categories.entertainment')}
          isActive={selectedCategory === 'entertainment'}
          onPress={() => setSelectedCategory('entertainment')}
        />
        <GlassCategoryPill
          label={t('live.categories.sports')}
          isActive={selectedCategory === 'sports'}
          onPress={() => setSelectedCategory('sports')}
        />
        <GlassCategoryPill
          label={t('live.categories.kids')}
          isActive={selectedCategory === 'kids'}
          onPress={() => setSelectedCategory('kids')}
        />
        <GlassCategoryPill
          label={t('live.categories.music')}
          isActive={selectedCategory === 'music'}
          onPress={() => setSelectedCategory('music')}
        />
      </ScrollView>

      {/* Channels Grid */}
      {filteredChannels.length > 0 ? (
        <View className="flex-row flex-wrap">
          {filteredChannels.map((channel, index) => (
            <AnimatedCard
              key={channel.id}
              index={index}
              variant="grid"
              style={{ width: `${100 / numColumns}%`, padding: spacing.xs } as any}
            >
              <Link to={`/live/${channel.id}`} style={{ textDecoration: 'none' }}>
                <GlassLiveChannelCard
                  channel={channel}
                  liveLabel={liveLabel}
                />
              </Link>
            </AnimatedCard>
          ))}
        </View>
      ) : (
        <View className="flex-1 justify-center items-center py-16">
          <GlassCard className="p-12 items-center">
            <Radio size={64} color={colors.textMuted} />
            <Text className="text-xl font-semibold text-white mt-4 mb-2">{t('live.noChannels')}</Text>
            <Text className="text-base text-white/70">{t('live.tryLater')}</Text>
          </GlassCard>
        </View>
      )}
      </View>
    </ScrollView>
  );
}
