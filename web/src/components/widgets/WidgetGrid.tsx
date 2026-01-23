/**
 * WidgetGrid - Responsive grid layout for widget cards
 *
 * Displays widgets in a responsive grid:
 * - 1 column on mobile (<768px)
 * - 2 columns on tablet (768-1023px)
 * - 3 columns on desktop (1024-1279px)
 * - 4 columns on large desktop (1280px+)
 */

import { View, useWindowDimensions } from 'react-native';
import { z } from 'zod';
import WidgetCard from './WidgetCard';

// Zod schema for Widget (matching WidgetCard schema)
const WidgetContentSchema = z.object({
  content_type: z.enum(['live_channel', 'iframe', 'live', 'vod', 'podcast', 'radio', 'custom']),
  live_channel_id: z.string().optional(),
  iframe_url: z.string().optional(),
  iframe_title: z.string().optional(),
});

const WidgetSchema = z.object({
  id: z.string(),
  type: z.enum(['personal', 'system']),
  title: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
  content: WidgetContentSchema.optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    z_index: z.number(),
  }).optional(),
  is_active: z.boolean(),
  is_muted: z.boolean(),
  is_visible: z.boolean(),
  is_closable: z.boolean(),
  is_draggable: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

type Widget = z.infer<typeof WidgetSchema>;

const WidgetGridPropsSchema = z.object({
  widgets: z.array(WidgetSchema),
  onDelete: z.function().args(z.string()).returns(z.void()),
  isWidgetHidden: z.function().args(z.string()).returns(z.boolean()),
  onToggleVisibility: z.function().args(z.string()).returns(z.void()),
  onResetPosition: z.function().args(z.string()).returns(z.void()),
});

type WidgetGridProps = z.infer<typeof WidgetGridPropsSchema>;

/**
 * Calculate number of columns based on screen width
 */
function getColumnCount(width: number): number {
  if (width >= 1280) return 4; // xl
  if (width >= 1024) return 3; // lg
  if (width >= 768) return 2;  // md
  return 1; // sm
}

/**
 * WidgetGrid - Responsive grid of widget cards
 */
export default function WidgetGrid({
  widgets,
  onDelete,
  isWidgetHidden,
  onToggleVisibility,
  onResetPosition,
}: WidgetGridProps) {
  const { width } = useWindowDimensions();
  const numColumns = getColumnCount(width);

  return (
    <View className="flex-row flex-wrap">
      {widgets.map((widget) => (
        <View
          key={widget.id}
          style={{ width: `${100 / numColumns}%` }}
          className="px-1"
        >
          <WidgetCard
            widget={widget}
            onDelete={onDelete}
            isHidden={isWidgetHidden(widget.id)}
            onToggleVisibility={onToggleVisibility}
            onResetPosition={onResetPosition}
          />
        </View>
      ))}
    </View>
  );
}
