import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassCategoryPill } from '@bayit/shared/ui';
import { spacing, colors } from '@olorin/design-tokens';
import { NativeIcon } from '@olorin/shared-icons/native';
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

// Icon name mappings for categories (including Hebrew)
const CATEGORY_ICON_NAME_MAP: Record<string, string> = {
  'קומי': 'discover',
  'comedy': 'discover',
  'פסיכולוגיה': 'info',
  'psychology': 'info',
  'כללה': 'podcasts',
  'general': 'podcasts',
  'טכנולוגיה': 'discover',
  'technology': 'discover',
  'tech': 'discover',
  'חדשות ואקטואליה': 'info',
  'news': 'info',
  'היסטוריה': 'info',
  'history': 'info',
  'politics': 'discover',
  'business': 'discover',
  'entertainment': 'discover',
  'sports': 'discover',
  'jewish': 'judaism',
  'judaism': 'judaism',
  'educational': 'info',
  'science': 'info',
  'health': 'info',
  'fitness': 'discover',
  'arts': 'discover',
  'music': 'podcasts',
  'food': 'discover',
  'travel': 'discover',
  'lifestyle': 'discover',
  'relationships': 'discover',
  'parenting': 'info',
  'spirituality': 'judaism',
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
        icon={<NativeIcon name="podcasts" size="sm" color={selectedCategory === 'all' ? colors.primary : colors.textMuted} />}
        isActive={selectedCategory === 'all'}
        onPress={() => onCategoryChange('all')}
      />

      {/* Category Pills */}
      {categories.map((category) => {
        const iconName = CATEGORY_ICON_NAME_MAP[category.id.toLowerCase()] || CATEGORY_ICON_NAME_MAP[category.name?.toLowerCase()] || 'podcasts';
        const label = t(`podcasts.categories.${category.id}`, category.name);
        const isActive = selectedCategory === category.id;

        return (
          <GlassCategoryPill
            key={category.id}
            label={label}
            icon={<NativeIcon name={iconName} size="sm" color={isActive ? colors.primary : colors.textMuted} />}
            isActive={isActive}
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
