import { View, Text, StyleSheet } from 'react-native';
import { z } from 'zod';
import { useDirection } from '@/hooks/useDirection';
import { Column } from './DataTableHeader';
import { colors, spacing } from '@olorin/design-tokens';

const DataTableRowPropsSchema = z.object({
  row: z.record(z.any()),
  columns: z.array(z.any()),
  rowIndex: z.number(),
  isLastRow: z.boolean(),
  isRTL: z.boolean(),
});

interface DataTableRowProps {
  row: any;
  columns: Column[];
  rowIndex: number;
  isLastRow: boolean;
  isRTL: boolean;
}

export default function DataTableRow({
  row,
  columns,
  rowIndex,
  isLastRow,
  isRTL
}: DataTableRowProps) {
  // Validate props
  DataTableRowPropsSchema.parse({ row, columns, rowIndex, isLastRow, isRTL });

  const { textAlign } = useDirection();

  // For RTL, reverse column order
  const displayColumns = isRTL ? [...columns].reverse() : columns;

  return (
    <View style={[styles.container, !isLastRow && styles.containerWithBorder]}>
      {displayColumns.map((col) => (
        <View
          key={col.key}
          style={[
            styles.column,
            col.width ? { width: col.width as any } : { flex: 1 }
          ]}
        >
          {col.render ? (
            col.render(row[col.key], row)
          ) : (
            <Text style={[styles.text, { textAlign }]}>
              {row[col.key]}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: '100%',
  },
  containerWithBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderWhite,
  },
  column: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    minWidth: 80,
  },
  text: {
    fontSize: 14,
    color: colors.text,
  },
});
