/**
 * YoungstersFilters - Main category filter pills and action buttons
 */

import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { GlassCategoryPill } from '@bayit/shared/ui';
import { getLocalizedName } from '@bayit/shared-utils/contentLocalization';
import { platformClass } from '@/utils/platformClass';
import { NativeIcon } from '@olorin/shared-icons/native';
import { colors } from '@olorin/design-tokens';
import { CATEGORY_ICON_NAMES } from './constants';
import { CategorySchema } from './types';

const YoungstersFiltersPropsSchema = z.object({
  categories: z.array(CategorySchema),
  selectedCategory: z.string(),
  selectedSubcategory: z.string().nullable(),
  selectedAgeGroup: z.string().nullable(),
  showSubcategories: z.boolean(),
  showTrending: z.boolean(),
  showNews: z.boolean(),
  onCategorySelect: z.function().args(z.string()).returns(z.void()),
  onToggleSubcategories: z.function().args().returns(z.void()),
  onToggleTrending: z.function().args().returns(z.void()),
  onToggleNews: z.function().args().returns(z.void()),
});

type YoungstersFiltersProps = z.infer<typeof YoungstersFiltersPropsSchema>;

/**
 * Main category filters for Youngsters page
 * Horizontal scrollable pills for category selection
 */
export default function YoungstersFilters({
  categories,
  selectedCategory,
  selectedSubcategory,
  selectedAgeGroup,
  showSubcategories,
  showTrending,
  showNews,
  onCategorySelect,
  onToggleSubcategories,
  onToggleTrending,
  onToggleNews,
}: YoungstersFiltersProps) {
  const { t, i18n } = useTranslation();

  if (categories.length === 0) return null;

  return (
    <View className={platformClass('flex-row flex-wrap gap-2 mb-4')}>
      {categories.map((category) => {
        const iconName = CATEGORY_ICON_NAMES[category.id] || 'discover';
        const isActive =
          selectedCategory === category.id &&
          !selectedSubcategory &&
          !selectedAgeGroup;
        return (
          <GlassCategoryPill
            key={category.id}
            label={getLocalizedName(category, i18n.language)}
            icon={<NativeIcon name={iconName} size="sm" color={isActive ? colors.primary : colors.textMuted} />}
            isActive={isActive}
            onPress={() => onCategorySelect(category.id)}
          />
        );
      })}
      <GlassCategoryPill
        label={t('taxonomy.subcategories.title')}
        icon={<NativeIcon name="discover" size="sm" color={showSubcategories ? colors.primary : colors.textMuted} />}
        isActive={showSubcategories}
        onPress={onToggleSubcategories}
      />
      <GlassCategoryPill
        label={t('youngsters.trending')}
        icon={<NativeIcon name="discover" size="sm" color={showTrending ? colors.primary : colors.textMuted} />}
        isActive={showTrending}
        onPress={onToggleTrending}
      />
      <GlassCategoryPill
        label={t('youngsters.news')}
        icon={<NativeIcon name="info" size="sm" color={showNews ? colors.primary : colors.textMuted} />}
        isActive={showNews}
        onPress={onToggleNews}
      />
    </View>
  );
}
