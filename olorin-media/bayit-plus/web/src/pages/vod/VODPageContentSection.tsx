import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Film, Tv, ChevronLeft, ChevronRight } from 'lucide-react';
import { z } from 'zod';
import ContentCard from '@/components/content/ContentCard';
import AnimatedCard from '@/components/common/AnimatedCard';
import { colors, spacing } from '@bayit/shared/theme';
import { useDirection } from '@/hooks/useDirection';
import { platformClass } from '@/utils/platformClass';
import VODPageEmptyState from './VODPageEmptyState';

const ContentItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  thumbnail: z.string().optional(),
  type: z.string().optional(),
  duration: z.string().optional(),
  year: z.string().optional(),
  category: z.string().optional(),
  category_name_en: z.string().optional(),
  category_name_es: z.string().optional(),
  is_series: z.boolean().optional(),
  available_subtitle_languages: z.array(z.string()).optional(),
  has_subtitles: z.boolean().optional(),
});

const VODPageContentSectionPropsSchema = z.object({
  type: z.enum(['movies', 'series']),
  items: z.array(ContentItemSchema),
  totalCount: z.number(),
  currentPage: z.number(),
  totalPages: z.number(),
  numColumns: z.number(),
  showPagination: z.boolean().default(true),
  onPageChange: z.function().args(z.number()).returns(z.void()),
});

type VODPageContentSectionProps = z.infer<typeof VODPageContentSectionPropsSchema>;

/**
 * VODPage Content Section Component
 *
 * Reusable section for displaying movies or series with pagination
 */
export default function VODPageContentSection({
  type,
  items,
  totalCount,
  currentPage,
  totalPages,
  numColumns,
  showPagination = true,
  onPageChange,
}: VODPageContentSectionProps) {
  const { t } = useTranslation();
  const { isRTL, flexDirection } = useDirection();

  const icon = type === 'movies' ? Film : Tv;
  const iconColor = type === 'movies' ? colors.primary : colors.secondary;
  const title = type === 'movies' ? t('vod.movies') : t('vod.series');
  const emptyMessage = type === 'movies' ? t('vod.noMovies') : t('vod.noSeries');

  const Icon = icon;

  return (
    <View className={platformClass('mb-8')}>
      {/* Section Header */}
      <View
        className={platformClass('flex-row items-center gap-2 mb-4 pb-2 border-b border-white/10')}
        style={{ flexDirection } as any}
      >
        <Icon size={24} color={iconColor} />
        <Text className={platformClass('text-2xl font-semibold text-white flex-1')}>
          {title}
        </Text>
        <View
          className={platformClass(
            'bg-white/10 px-2 py-1 rounded-full border border-white/10',
            'bg-white/10 px-2 py-1 rounded-full border border-white/10'
          )}
        >
          <Text className={platformClass('text-sm font-semibold text-gray-300')}>{totalCount}</Text>
        </View>
      </View>

      {/* Content Grid */}
      {items.length === 0 ? (
        <VODPageEmptyState variant="section" message={emptyMessage} />
      ) : (
        <View className={platformClass('flex-row flex-wrap')}>
          {items.map((item, index) => (
            <AnimatedCard
              key={item.id}
              index={index}
              variant="grid"
              style={{ width: `${100 / numColumns}%`, padding: spacing.xs } as any}
            >
              <ContentCard content={item} />
            </AnimatedCard>
          ))}
        </View>
      )}

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <View className={platformClass('flex-row items-center justify-center gap-4 mt-4 py-2')}>
          <Pressable
            onPress={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={platformClass(
              `p-2 rounded-lg ${currentPage === 1 ? 'opacity-30' : 'bg-white/10'}`,
              `p-2 rounded-lg ${currentPage === 1 ? 'opacity-30' : 'bg-white/10'}`
            )}
          >
            {isRTL ? (
              <ChevronRight size={16} color={colors.text} />
            ) : (
              <ChevronLeft size={16} color={colors.text} />
            )}
          </Pressable>
          <Text className={platformClass('text-sm font-semibold text-white')}>
            {currentPage} / {totalPages}
          </Text>
          <Pressable
            onPress={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className={platformClass(
              `p-2 rounded-lg ${currentPage === totalPages ? 'opacity-30' : 'bg-white/10'}`,
              `p-2 rounded-lg ${currentPage === totalPages ? 'opacity-30' : 'bg-white/10'}`
            )}
          >
            {isRTL ? (
              <ChevronLeft size={16} color={colors.text} />
            ) : (
              <ChevronRight size={16} color={colors.text} />
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}
