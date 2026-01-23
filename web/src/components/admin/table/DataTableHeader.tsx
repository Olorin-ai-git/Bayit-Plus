import { View, Text, StyleSheet } from 'react-native';
import { z } from 'zod';
import { useDirection } from '@/hooks/useDirection';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';

const ColumnSchema = z.object({
  key: z.string(),
  label: z.string(),
  width: z.union([z.string(), z.number()]).optional(),
  className: z.string().optional(),
  render: z.function().optional(),
});

const DataTableHeaderPropsSchema = z.object({
  columns: z.array(ColumnSchema),
  isRTL: z.boolean(),
});

export type Column = z.infer<typeof ColumnSchema>;

interface DataTableHeaderProps {
  columns: Column[];
  isRTL: boolean;
}

export default function DataTableHeader({ columns, isRTL }: DataTableHeaderProps) {
  // Validate props
  DataTableHeaderPropsSchema.parse({ columns, isRTL });

  const { textAlign } = useDirection();

  // For RTL, reverse column order so actions appear on the right side
  const displayColumns = isRTL ? [...columns].reverse() : columns;

  return (
    <View style={styles.container}>
      {displayColumns.map((col) => (
        <View
          key={col.key}
          style={[
            styles.column,
            col.width ? { width: col.width as any } : { flex: 1 }
          ]}
        >
          <Text
            style={[styles.label, { textAlign }]}
          >
            {col.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderWhite,
    width: '100%',
  },
  column: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 80,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
