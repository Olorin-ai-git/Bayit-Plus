import { ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassCategoryPill } from '@bayit/shared/ui';
import { z } from 'zod';

const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
});

const PodcastsPageFiltersPropsSchema = z.object({
  categories: z.array(CategorySchema),
  selectedCategory: z.string(),
  onCategoryChange: z.function().args(z.string()).returns(z.void()),
});

export type PodcastsPageFiltersProps = z.infer<typeof PodcastsPageFiltersPropsSchema>;
export type Category = z.infer<typeof CategorySchema>;

// Emoji mappings for categories
const CATEGORY_EMOJI_MAP: Record<string, string> = {
  news: '📰',
  politics: '🏛️',
  tech: '💻',
  business: '💼',
  entertainment: '🎭',
  sports: '⚽',
  jewish: '✡️',
  history: '📚',
  educational: '🎓',
  general: '📌',
};

export default function PodcastsPageFilters({
  categories,
  selectedCategory,
  onCategoryChange,
}: PodcastsPageFiltersProps) {
  const { t } = useTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mb-6"
      contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
    >
      {/* All Categories */}
      <GlassCategoryPill
        label={t('podcasts.categories.all')}
        emoji="🎧"
        isActive={selectedCategory === 'all'}
        onPress={() => onCategoryChange('all')}
      />

      {/* Category Pills */}
      {categories.map((category) => {
        const emoji = CATEGORY_EMOJI_MAP[category.id] || '🎙️';
        const label = t(`podcasts.categories.${category.id}`, category.name);

        return (
          <GlassCategoryPill
            key={category.id}
            label={label}
            emoji={emoji}
            isActive={selectedCategory === category.id}
            onPress={() => onCategoryChange(category.id)}
          />
        );
      })}
    </ScrollView>
  );
}
