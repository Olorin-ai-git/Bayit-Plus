/**
 * YoungstersSubcategorySection - Expandable subcategory pills
 */

import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { GlassCategoryPill } from '@bayit/shared/ui';
import { getLocalizedName } from '@bayit/shared-utils/contentLocalization';
import { platformClass } from '@/utils/platformClass';
import { SUBCATEGORY_ICONS } from './constants';
import { SubcategorySchema } from './types';

const YoungstersSubcategorySectionPropsSchema = z.object({
  subcategories: z.array(SubcategorySchema),
  selectedSubcategory: z.string().nullable(),
  showSubcategories: z.boolean(),
  onSubcategorySelect: z.function().args(z.string()).returns(z.void()),
});

type YoungstersSubcategorySectionProps = z.infer<typeof YoungstersSubcategorySectionPropsSchema>;

/**
 * Expandable subcategory section
 * Shows filtered subcategories when expanded
 */
export default function YoungstersSubcategorySection({
  subcategories,
  selectedSubcategory,
  showSubcategories,
  onSubcategorySelect,
}: YoungstersSubcategorySectionProps) {
  const { i18n } = useTranslation();

  if (!showSubcategories || subcategories.length === 0) return null;

  return (
    <View className={platformClass(
      'flex-row flex-wrap gap-2 mb-4 px-2 py-2 bg-purple-500/5 rounded-lg'
    )}>
      {subcategories.map((subcategory) => (
        <GlassCategoryPill
          key={subcategory.slug}
          label={getLocalizedName(subcategory, i18n.language)}
          emoji={SUBCATEGORY_ICONS[subcategory.slug] || '📁'}
          isActive={selectedSubcategory === subcategory.slug}
          onPress={() => onSubcategorySelect(subcategory.slug)}
        />
      ))}
    </View>
  );
}
