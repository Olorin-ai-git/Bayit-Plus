import { ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { GlassCategoryPill } from '@bayit/shared/ui';
import { getLocalizedName } from '@bayit/shared-utils/contentLocalization';
import { platformClass } from '@/utils/platformClass';

const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  name_en: z.string().optional(),
  name_es: z.string().optional(),
});

const VODPageFiltersPropsSchema = z.object({
  categories: z.array(CategorySchema),
  selectedCategory: z.string(),
  onCategoryChange: z.function().args(z.string()).returns(z.void()),
});

type VODPageFiltersProps = z.infer<typeof VODPageFiltersPropsSchema>;

/**
 * VODPage Filters Component
 *
 * Horizontal scrolling category pills
 */
export default function VODPageFilters({
  categories,
  selectedCategory,
  onCategoryChange,
}: VODPageFiltersProps) {
  const { t, i18n } = useTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className={platformClass('mb-6')}
      contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
    >
      <GlassCategoryPill
        label={t('vod.allCategories')}
        isActive={selectedCategory === 'all'}
        onPress={() => onCategoryChange('all')}
      />
      {categories.map((category) => (
        <GlassCategoryPill
          key={category.id}
          label={getLocalizedName(category, i18n.language)}
          isActive={selectedCategory === category.id}
          onPress={() => onCategoryChange(category.id)}
        />
      ))}
    </ScrollView>
  );
}
