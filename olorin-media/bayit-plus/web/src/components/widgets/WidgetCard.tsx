import { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { Trash2, Eye, EyeOff, RotateCcw, Tv, Film, Radio, Mic, Globe, Zap, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassCard, GlassButton } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { Widget } from '@/types/widget';
import logger from '@/utils/logger';

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

function getWidgetIcon(widget: Widget): React.ReactNode {
  const iconProps = { size: 32, color: colors.primary.DEFAULT };

  if (widget.icon && typeof widget.icon === 'string' && !widget.icon.match(/[\p{Emoji}]/gu)) {
    // If icon is an icon name string (not emoji), return it
    const iconMap: Record<string, React.ReactNode> = {
      'live_channel': <Tv {...iconProps} />,
      'live': <Tv {...iconProps} />,
      'iframe': <Globe {...iconProps} />,
      'podcast': <Mic {...iconProps} />,
      'radio': <Radio {...iconProps} />,
      'vod': <Film {...iconProps} />,
      'custom': <Zap {...iconProps} />,
    };
    return iconMap[widget.icon] || <Target {...iconProps} />;
  }

  const contentType = widget.content?.content_type || '';
  const iconMap: Record<string, React.ReactNode> = {
    live_channel: <Tv {...iconProps} />,
    live: <Tv {...iconProps} />,
    iframe: <Globe {...iconProps} />,
    podcast: <Mic {...iconProps} />,
    radio: <Radio {...iconProps} />,
    vod: <Film {...iconProps} />,
    custom: <Zap {...iconProps} />,
  };
  return iconMap[contentType] || <Target {...iconProps} />;
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
  const [imageLoading, setImageLoading] = useState(!!widget.cover_url);

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
        <View style={styles.posterContainer}>
          {widget.cover_url ? (
            <>
              <Image
                source={{ uri: widget.cover_url }}
                style={styles.posterImage}
                onLoadEnd={() => setImageLoading(false)}
                onError={() => setImageLoading(false)}
              />
              {imageLoading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              )}
            </>
          ) : (
            <View style={styles.iconContainer}>
              {getWidgetIcon(widget)}
            </View>
          )}
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
              onPress={() => {
                logger.debug('Reset button clicked in WidgetCard', 'WidgetCard', { widgetId: widget.id });
                onResetPosition(widget.id);
              }}
              variant="ghost"
              size="sm"
              icon={<RotateCcw size={16} color={colors.text} />}
              style={styles.iconButton}
              accessibilityLabel={t('widgets.resetPosition') || 'Reset position'}
            />
            <GlassButton
              title=""
              onPress={(e) => {
                e?.stopPropagation?.();
                onToggleVisibility(widget.id);
              }}
              variant={isHidden ? 'warning' : 'ghost'}
              size="sm"
              icon={isHidden ? <Eye size={16} color={colors.text} /> : <EyeOff size={16} color={colors.text} />}
              style={styles.iconButton}
              accessibilityLabel={isHidden ? t('widgets.show') || 'Show' : t('widgets.hide') || 'Hide'}
            />
            <GlassButton
              title=""
              onPress={(e) => {
                e?.stopPropagation?.();
                onDelete(widget.id);
              }}
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
  posterContainer: {
    width: 120,
    height: 68,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.glassPurple,
    borderWidth: 1,
    borderColor: colors.glassBorderLight,
  },
  posterImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
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
    color: colors.success.DEFAULT,
  },
  statusInactive: {
    color: colors.warning.DEFAULT,
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
    color: colors.warning.DEFAULT,
  },
  actionButtons: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    zIndex: 10,
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
