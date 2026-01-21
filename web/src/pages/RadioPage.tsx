import { useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, Image, ActivityIndicator, ScrollView, useWindowDimensions } from 'react-native';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { Radio, Volume2, Play } from 'lucide-react';
import { radioService } from '@/services/api';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassView, GlassBadge, GlassCategoryPill } from '@bayit/shared/ui';
import { getLocalizedName } from '@bayit/shared-utils/contentLocalization';
import logger from '@/utils/logger';

interface Category {
  id: string;
  name: string;
}

interface Station {
  id: string;
  name: string;
  logo?: string;
  currentShow?: string;
  genre?: string;
  category?: string;
}

function StationCard({ station }: { station: Station }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link to={`/radio/${station.id}`} style={{ textDecoration: 'none', flex: 1 }}>
      <Pressable
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
      >
        <GlassCard className={`p-4 m-1 ${isHovered ? '-translate-y-1' : ''}`} style={isHovered ? { boxShadow: '0 8px 32px rgba(107, 33, 168, 0.3)' } : undefined}>
          <View className="aspect-square mb-4 rounded-lg overflow-hidden relative">
            {station.logo ? (
              <Image
                source={{ uri: station.logo }}
                className="w-full h-full rounded-lg"
                resizeMode="contain"
              />
            ) : (
              <View className="w-full h-full bg-white/5 justify-center items-center rounded-lg">
                <Radio size={32} color={colors.secondary} />
              </View>
            )}
            {isHovered && (
              <View className="absolute inset-0 bg-black/50 justify-center items-center rounded-lg">
                <View className="w-14 h-14 rounded-full justify-center items-center" style={{ backgroundColor: colors.secondary, boxShadow: `0 0 20px ${colors.secondary}` }}>
                  <Play size={28} color={colors.text} fill={colors.text} />
                </View>
              </View>
            )}
          </View>
          <Text className={`text-lg font-semibold text-white mb-1 ${isHovered ? '' : ''}`} style={isHovered ? { color: colors.primary } : undefined} numberOfLines={1}>
            {station.name}
          </Text>
          {station.currentShow && (
            <View className="flex-row items-center gap-1 mb-2">
              <Volume2 size={14} color={colors.textSecondary} />
              <Text className="text-sm flex-1" style={{ color: colors.textSecondary }} numberOfLines={1}>
                {station.currentShow}
              </Text>
            </View>
          )}
          {station.genre && (
            <GlassBadge size="sm" className="mt-2">
              {station.genre}
            </GlassBadge>
          )}
        </GlassCard>
      </Pressable>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <View className="flex-1 m-1 min-w-[150px] max-w-[25%]">
      <View className="aspect-square rounded-lg mb-2" style={{ backgroundColor: colors.glass }} />
      <View className="h-5 rounded w-4/5" style={{ backgroundColor: colors.glass }} />
    </View>
  );
}

export default function RadioPage() {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign, flexDirection, justifyContent } = useDirection();
  const [stations, setStations] = useState<Station[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();

  const numColumns = width >= 1024 ? 4 : width >= 768 ? 3 : 2;

  useEffect(() => {
    loadStations();
  }, [selectedCategory]);

  const loadStations = async () => {
    try {
      const data = await radioService.getStations({
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
      });
      setStations(data.stations || []);
      if (data.categories) {
        setCategories(data.categories);
      }
    } catch (error) {
      logger.error('Failed to load stations', 'RadioPage', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStations = selectedCategory === 'all'
    ? stations
    : stations.filter(s => s.genre === selectedCategory || s.category === selectedCategory);

  if (loading) {
    return (
      <View className="flex-1 px-4 py-6 max-w-screen-xl mx-auto w-full">
        <View className="w-48 h-8 rounded-md mb-6" style={{ backgroundColor: colors.glass }} />
        <View className="flex-row flex-wrap gap-4">
          {[...Array(8)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 px-4 py-6 max-w-screen-xl mx-auto w-full">
      {/* Header */}
      <View className="flex-row items-center gap-2 mb-6" style={{ flexDirection, justifyContent }}>
        <GlassView className="w-12 h-12 rounded-full justify-center items-center">
          <Radio size={24} color={colors.secondary} />
        </GlassView>
        <Text className="text-4xl font-bold" style={{ color: colors.text, textAlign }}>{t('radio.title')}</Text>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-6"
        contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.sm }}
      >
        <GlassCategoryPill
          label={t('radio.categories.all')}
          emoji="📻"
          isActive={selectedCategory === 'all'}
          onPress={() => setSelectedCategory('all')}
        />
        <GlassCategoryPill
          label={t('radio.categories.music')}
          emoji="🎵"
          isActive={selectedCategory === 'music'}
          onPress={() => setSelectedCategory('music')}
        />
        <GlassCategoryPill
          label={t('radio.categories.news')}
          emoji="📰"
          isActive={selectedCategory === 'news'}
          onPress={() => setSelectedCategory('news')}
        />
        <GlassCategoryPill
          label={t('radio.categories.talk')}
          emoji="🎙️"
          isActive={selectedCategory === 'talk'}
          onPress={() => setSelectedCategory('talk')}
        />
        <GlassCategoryPill
          label={t('radio.categories.jewish')}
          emoji="✡️"
          isActive={selectedCategory === 'jewish'}
          onPress={() => setSelectedCategory('jewish')}
        />
        {categories.map((category) => (
          <GlassCategoryPill
            key={category.id}
            label={getLocalizedName(category, i18n.language)}
            isActive={selectedCategory === category.id}
            onPress={() => setSelectedCategory(category.id)}
          />
        ))}
      </ScrollView>

      {/* Stations Grid */}
      <FlatList
        data={filteredStations}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        key={numColumns}
        contentContainerStyle={{ gap: spacing.md }}
        columnWrapperStyle={numColumns > 1 ? { gap: spacing.md } : undefined}
        renderItem={({ item }) => (
          <View style={{ flex: 1, maxWidth: `${100 / numColumns}%` }}>
            <StationCard station={item} />
          </View>
        )}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-24">
            <GlassCard className="p-12 items-center">
              <Radio size={64} color={colors.textMuted} />
              <Text className="text-xl font-semibold mt-4 mb-2" style={{ color: colors.text }}>{t('radio.noStations')}</Text>
              <Text className="text-base" style={{ color: colors.textSecondary }}>{t('radio.tryLater')}</Text>
            </GlassCard>
          </View>
        }
      />
    </View>
  );
}
