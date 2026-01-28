/**
 * YoungstersAgeGroupFilter - Age group selection pills
 */

import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { NativeIcon } from '@olorin/shared-icons/native';
import { colors } from '@olorin/design-tokens';
import { getLocalizedName } from '@bayit/shared-utils/contentLocalization';
import { platformClass } from '@/utils/platformClass';
import { AGE_GROUP_ICONS } from './constants';
import { AgeGroupSchema } from './types';

const YoungstersAgeGroupFilterPropsSchema = z.object({
  ageGroups: z.array(AgeGroupSchema),
  selectedAgeGroup: z.string().nullable(),
  onAgeGroupSelect: z.function().args(z.string()).returns(z.void()),
});

type YoungstersAgeGroupFilterProps = z.infer<typeof YoungstersAgeGroupFilterPropsSchema>;

/**
 * Age group filter pills
 * Allows filtering content by age group
 */
export default function YoungstersAgeGroupFilter({
  ageGroups,
  selectedAgeGroup,
  onAgeGroupSelect,
}: YoungstersAgeGroupFilterProps) {
  const { t, i18n } = useTranslation();

  if (ageGroups.length === 0) return null;

  return (
    <View className={platformClass('mb-6')}>
      <Text className={platformClass('text-sm font-semibold text-gray-400 mb-2')}>
        {t('taxonomy.subcategories.ageGroups.title')}
      </Text>
      <View className={platformClass('flex-row flex-wrap gap-2')}>
        {ageGroups.map((group) => {
          const isActive = selectedAgeGroup === group.slug;
          return (
            <Pressable
              key={group.slug}
              className={platformClass(
                isActive
                  ? 'flex-row items-center gap-1 px-4 py-2 rounded-full bg-purple-500/30 border border-purple-500'
                  : 'flex-row items-center gap-1 px-4 py-2 rounded-full bg-black/30 border border-white/10',
                isActive
                  ? 'flex-row items-center gap-1 px-4 py-2 rounded-full bg-purple-500/30 border border-purple-500'
                  : 'flex-row items-center gap-1 px-4 py-2 rounded-full bg-black/30 border border-white/10'
              )}
              onPress={() => onAgeGroupSelect(isActive ? '' : group.slug)}
            >
              <NativeIcon name={AGE_GROUP_ICONS[group.slug] || 'discover'} size="sm" color={isActive ? colors.primary : colors.textMuted} />
              <Text
                className={platformClass(
                  isActive
                    ? 'text-sm text-purple-500 font-semibold'
                    : 'text-sm text-gray-400'
                )}
              >
                {getLocalizedName(group, i18n.language)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
