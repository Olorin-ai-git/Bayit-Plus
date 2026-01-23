import { View, Text } from 'react-native';
import clsx from 'clsx';
import { z } from 'zod';
import { useDirection } from '@/hooks/useDirection';

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
    <View
      className={clsx(
        'flex flex-row border-b border-white/5 w-full'
      )}
    >
      {displayColumns.map((col) => (
        <View
          key={col.key}
          className={clsx(
            'px-4 py-2 min-w-[80px]',
            col.className
          )}
          style={col.width ? { width: col.width as any } : { flex: 1 }}
        >
          <Text
            className="text-sm font-semibold text-gray-400"
            style={{ textAlign }}
          >
            {col.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
