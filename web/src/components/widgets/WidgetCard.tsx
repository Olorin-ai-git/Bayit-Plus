import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Trash2, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassCard, GlassButton } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
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
      style={styles.container}
    >
      <GlassCard
        style={[
          styles.card,
          isHovered && styles.cardHovered,
          isHidden && styles.cardHidden,
        ]}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>{getWidgetIcon(widget)}</Text>
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {widget.title}
          </Text>
          {widget.description && (
            <Text style={styles.description} numberOfLines={2}>
              {widget.description}
            </Text>
          )}

          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {getContentTypeLabel(widget.content?.content_type)}
              </Text>
            </View>
            <Text style={[styles.statusBadge, widget.is_active ? styles.statusActive : styles.statusInactive]}>
              {widget.is_active ? '● Active' : '● Inactive'}
            </Text>
            {isHidden && (
              <View style={styles.hiddenBadge}>
                <Text style={styles.hiddenBadgeText}>
                  {t('widgets.hidden') || 'Hidden'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {isHovered && (
          <View style={styles.actionButtons}>
            <GlassButton
              title=""
              onPress={() => onResetPosition(widget.id)}
              variant="ghost"
              size="sm"
              icon={<RotateCcw size={16} color={colors.text} />}
              style={styles.iconButton}
              accessibilityLabel={t('widgets.resetPosition') || 'Reset position'}
            />
            <GlassButton
              title=""
              onPress={() => onToggleVisibility(widget.id)}
              variant={isHidden ? 'warning' : 'ghost'}
              size="sm"
              icon={isHidden ? <Eye size={16} color={colors.text} /> : <EyeOff size={16} color={colors.text} />}
              style={styles.iconButton}
              accessibilityLabel={isHidden ? t('widgets.show') || 'Show' : t('widgets.hide') || 'Hide'}
            />
            <GlassButton
              title=""
              onPress={() => onDelete(widget.id)}
              variant="danger"
              size="sm"
              icon={<Trash2 size={16} color={colors.text} />}
              style={styles.iconButton}
              accessibilityLabel={t('widgets.delete') || 'Delete'}
            />
          </View>
        )}
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.glassBorderLight,
  },
  cardHovered: {
    backgroundColor: colors.glassPurpleLight,
    borderColor: colors.glassBorder,
  },
  cardHidden: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.glassPurple,
    borderWidth: 1,
    borderColor: colors.glassBorderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 28,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: colors.glassPurple,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: 12,
    color: colors.primaryLight,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusActive: {
    color: colors.success,
  },
  statusInactive: {
    color: colors.warning,
  },
  hiddenBadge: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.4)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  hiddenBadgeText: {
    fontSize: 11,
    color: colors.warning,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  iconButton: {
    width: 32,
    height: 32,
    minWidth: 32,
    minHeight: 32,
    paddingHorizontal: 0,
    paddingVertical: 0,
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
