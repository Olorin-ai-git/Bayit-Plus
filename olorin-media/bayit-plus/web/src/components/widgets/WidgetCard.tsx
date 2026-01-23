import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Trash2, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassCard, GlassButton } from '@bayit/shared/ui';
import { colors } from '@bayit/shared/theme';
import { Widget } from '@/types/widget';

interface WidgetCardProps {
  widget: Widget;
  onDelete: (id: string) => void;
  isHidden: boolean;
  onToggleVisibility: (id: string) => void;
  onResetPosition: (id: string) => void;
}

function getContentTypeLabel(contentType?: string): string {
  const labels: Record<string, string> = {
    live_channel: 'Live Channel',
    iframe: 'iFrame',
    live: 'Live Stream',
    vod: 'Video',
    podcast: 'Podcast',
    radio: 'Radio',
    custom: 'Custom',
  };
  return labels[contentType || ''] || 'Widget';
}

function getWidgetIcon(widget: Widget): string {
  if (widget.icon) return widget.icon;
  const icons: Record<string, string> = {
    live_channel: '📺',
    live: '📺',
    iframe: '🌐',
    podcast: '🎙️',
    radio: '📻',
    vod: '🎬',
    custom: '⚡',
  };
  return icons[widget.content?.content_type || ''] || '🎯';
}

export default function WidgetCard({
  widget,
  onDelete,
  isHidden,
  onToggleVisibility,
  onResetPosition,
}: WidgetCardProps) {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <View
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="flex-1"
    >
      <GlassCard
        className="px-4 py-4 mb-4 flex-row items-center gap-4 relative border-0"
        style={[
          isHovered && styles.cardHovered,
          isHidden && styles.cardHidden,
        ]}
      >
        <View className="w-14 h-14 rounded-full bg-white/10 justify-center items-center">
          <Text className="text-3xl">{getWidgetIcon(widget)}</Text>
        </View>

        <View className="flex-1">
          <Text className="text-base font-semibold text-white" numberOfLines={2}>
            {widget.title}
          </Text>
          {widget.description && (
            <Text className="text-sm text-gray-400 mt-1" numberOfLines={2}>
              {widget.description}
            </Text>
          )}

          <View className="flex-row gap-2 mt-2">
            <Text className="text-xs text-gray-400 bg-white/10 px-2 py-1 rounded">
              {getContentTypeLabel(widget.content?.content_type)}
            </Text>
            <Text className="text-xs font-medium"
              style={[widget.is_active ? styles.statusActive : styles.statusInactive]}>
              {widget.is_active ? '● Active' : '● Inactive'}
            </Text>
            {isHidden && (
              <Text className="text-[11px] text-amber-400 bg-amber-400/20 px-2 py-0.5 rounded">
                {t('widgets.hidden') || 'Hidden'}
              </Text>
            )}
          </View>
        </View>

        {isHovered && (
          <View className="flex-row items-center gap-1">
            <GlassButton
              onPress={() => onResetPosition(widget.id)}
              variant="secondary"
              size="icon"
              style={styles.iconButton}
            >
              <RotateCcw size={16} color={colors.text} />
            </GlassButton>
            <GlassButton
              onPress={() => onToggleVisibility(widget.id)}
              variant="secondary"
              size="icon"
              style={[styles.iconButton, isHidden ? styles.visibilityButtonHidden : styles.visibilityButtonVisible]}
            >
              {isHidden ? <Eye size={16} color={colors.text} /> : <EyeOff size={16} color={colors.text} />}
            </GlassButton>
            <GlassButton
              onPress={() => onDelete(widget.id)}
              variant="destructive"
              size="icon"
              style={styles.iconButton}
            >
              <Trash2 size={16} color={colors.text} />
            </GlassButton>
          </View>
        )}
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  cardHovered: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  cardHidden: {
    opacity: 0.6,
  },
  statusActive: {
    color: '#22c55e',
  },
  statusInactive: {
    color: '#f59e0b',
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visibilityButtonHidden: {
    backgroundColor: 'rgba(252, 211, 77, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(252, 211, 77, 0.5)',
  },
  visibilityButtonVisible: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});
