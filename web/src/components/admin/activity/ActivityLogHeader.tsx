import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { GlassSelect } from '@bayit/shared/ui';
import { colors } from '@bayit/shared/theme';
import { platformClass } from '../../../utils/platformClass';
import { LibrarianConfig } from '@/services/librarianService';

// Zod schema for props validation
const ActivityLogHeaderPropsSchema = z.object({
  filter: z.string(),
  onFilterChange: z.function().args(z.string()).returns(z.void()),
  config: z.custom<LibrarianConfig>(),
  textAlign: z.enum(['left', 'right']),
});

export type ActivityLogHeaderProps = z.infer<typeof ActivityLogHeaderPropsSchema>;

/**
 * ActivityLogHeader - Filter controls and title for activity log
 *
 * Displays the activity log title and filter dropdown for action types.
 * Fully styled with TailwindCSS via platformClass utility.
 */
const ActivityLogHeader: React.FC<ActivityLogHeaderProps> = ({
  filter,
  onFilterChange,
  config,
  textAlign,
}) => {
  const { t } = useTranslation();

  // Helper to convert snake_case to camelCase for translation keys
  const toCamelCase = (str: string) => {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  };

  // Build filter options from config with translations
  const filterOptions = [
    { label: t('admin.librarian.activityLog.allActions'), value: 'all' },
    ...config.action_types.map((actionType) => ({
      label: t(`admin.librarian.activityLog.actionTypes.${toCamelCase(actionType.value)}`),
      value: actionType.value,
    })),
  ];

  return (
    <View className={platformClass('justify-between items-center mb-6 gap-4')}>
      <Text
        className={platformClass('text-xl font-semibold')}
        style={{ textAlign, color: colors.text }}
      >
        {t('admin.librarian.activityLog.title')}
      </Text>
      <View className={platformClass('min-w-[200px]')}>
        <GlassSelect
          options={filterOptions}
          value={filter}
          onChange={onFilterChange}
          placeholder={t('admin.librarian.activityLog.filterByType')}
        />
      </View>
    </View>
  );
};

// Validate props at runtime in development
if (process.env.NODE_ENV === 'development') {
  const originalComponent = ActivityLogHeader;
  (ActivityLogHeader as any) = (props: any) => {
    ActivityLogHeaderPropsSchema.parse(props);
    return originalComponent(props);
  };
}

export default ActivityLogHeader;
