import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { GlassSelect } from '@bayit/shared/ui';
import { colors, spacing } from '@bayit/shared/theme';
import { LibrarianConfig } from '@/services/librarianService';

const ActivityLogHeaderPropsSchema = z.object({
  filter: z.string(),
  onFilterChange: z.function().args(z.string()).returns(z.void()),
  config: z.custom<LibrarianConfig>(),
  textAlign: z.enum(['left', 'right']),
});

export type ActivityLogHeaderProps = z.infer<typeof ActivityLogHeaderPropsSchema>;

const ActivityLogHeader: React.FC<ActivityLogHeaderProps> = ({
  filter,
  onFilterChange,
  config,
  textAlign,
}) => {
  const { t } = useTranslation();

  const toCamelCase = (str: string) => {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  };

  const filterOptions = [
    { label: t('admin.librarian.activityLog.allActions'), value: 'all' },
    ...config.action_types.map((actionType) => ({
      label: t(`admin.librarian.activityLog.actionTypes.${toCamelCase(actionType.value)}`),
      value: actionType.value,
    })),
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { textAlign }]}>
        {t('admin.librarian.activityLog.title')}
      </Text>
      <View style={styles.filterContainer}>
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

const styles = StyleSheet.create({
  container: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  filterContainer: {
    minWidth: 200,
  },
});

if (process.env.NODE_ENV === 'development') {
  const originalComponent = ActivityLogHeader;
  (ActivityLogHeader as any) = (props: any) => {
    ActivityLogHeaderPropsSchema.parse(props);
    return originalComponent(props);
  };
}

export default ActivityLogHeader;
