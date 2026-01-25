import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassCategoryPill } from '@bayit/shared/ui';
import { spacing } from '@olorin/design-tokens';
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

// Enhanced emoji mappings for categories (including Hebrew)
const CATEGORY_EMOJI_MAP: Record<string, string> = {
  'קומי': '😂',
  'comedy': '😂',
  'פסיכולוגיה': '🧠',
  'psychology': '🧠',
  'כללה': '📌',
  'general': '📌',
  'טכנולוגיה': '💻',
  'technology': '💻',
  'tech': '💻',
  'חדשות ואקטואליה': '📰',
  'news': '📰',
  'היסטוריה': '📚',
  'history': '📚',
  'politics': '🏛️',
  'business': '💼',
  'entertainment': '🎭',
  'sports': '⚽',
  'jewish': '✡️',
  'judaism': '✡️',
  'educational': '🎓',
  'science': '🔬',
  'health': '🏥',
  'fitness': '💪',
  'arts': '🎨',
  'music': '🎵',
  'food': '🍽️',
  'travel': '✈️',
  'lifestyle': '🌟',
  'relationships': '❤️',
  'parenting': '👶',
  'spirituality': '🙏',
};

export default function PodcastsPageFilters({
  categories,
  selectedCategory,
  onCategoryChange,
}: PodcastsPageFiltersProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      {/* All Categories */}
      <GlassCategoryPill
        label={t('podcasts.categories.all')}
        emoji="🎧"
        isActive={selectedCategory === 'all'}
        onPress={() => onCategoryChange('all')}
      />

      {/* Category Pills */}
      {categories.map((category) => {
        const emoji = CATEGORY_EMOJI_MAP[category.id.toLowerCase()] || CATEGORY_EMOJI_MAP[category.name?.toLowerCase()] || '🎙️';
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
});
