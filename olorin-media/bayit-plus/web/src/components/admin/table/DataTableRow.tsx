import { View, Text } from 'react-native';
import clsx from 'clsx';
import { z } from 'zod';
import { useDirection } from '@/hooks/useDirection';
import { Column } from './DataTableHeader';

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
    <View
      className={clsx(
        'flex flex-row w-full',
        !isLastRow && 'border-b border-white/5'
      )}
    >
      {displayColumns.map((col) => (
        <View
          key={col.key}
          className={clsx(
            'px-4 py-2 justify-center min-w-[80px]',
            col.className
          )}
          style={col.width ? { width: col.width as any } : { flex: 1 }}
        >
          {col.render ? (
            col.render(row[col.key], row)
          ) : (
            <Text
              className="text-sm text-white"
              style={{ textAlign }}
            >
              {row[col.key]}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}
