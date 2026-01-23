import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { z } from 'zod';
import { GlassInput, GlassCheckbox } from '@bayit/shared/ui';
import { colors } from '@bayit/shared/theme';
import { platformClass } from '@/utils/platformClass';

const VODPageSearchPropsSchema = z.object({
  searchQuery: z.string(),
  onSearchChange: z.function().args(z.string()).returns(z.void()),
  showOnlyWithSubtitles: z.boolean(),
  onSubtitlesFilterChange: z.function().args(z.boolean()).returns(z.void()),
});

type VODPageSearchProps = z.infer<typeof VODPageSearchPropsSchema>;

/**
 * VODPage Search Component
 *
 * Search input and subtitle filter checkbox
 */
export default function VODPageSearch({
  searchQuery,
  onSearchChange,
  showOnlyWithSubtitles,
  onSubtitlesFilterChange,
}: VODPageSearchProps) {
  const { t } = useTranslation();

  return (
    <View className={platformClass('mb-6')}>
      <GlassInput
        placeholder={t('vod.searchPlaceholder')}
        value={searchQuery}
        onChangeText={onSearchChange}
        icon={<Search size={20} color={colors.textMuted} />}
        containerStyle={{ marginBottom: 0 }}
      />
      <View className={platformClass('mt-4 flex-row items-center')}>
        <GlassCheckbox
          label={t('vod.showOnlyWithSubtitles', 'Show only with subtitles')}
          checked={showOnlyWithSubtitles}
          onChange={onSubtitlesFilterChange}
        />
      </View>
    </View>
  );
}
