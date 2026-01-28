/**
 * SystemWidgetGallery Component
 *
 * Displays available system widgets that users can browse and add to their collection.
 * Part of the opt-in widget subscription model.
 * REBUILT: Using StyleSheet exclusively for reliable rendering
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, useWindowDimensions, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus, Check, Tv, Globe, Podcast, Radio, Film, RefreshCw, Eye, EyeOff, RotateCcw, Trash2 } from 'lucide-react';
import { GlassCard, GlassButton } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { adminWidgetsService } from '@/services/adminApi';
import { useWidgetStore } from '@/stores/widgetStore';
import { useDirection } from '@/hooks/useDirection';
import logger from '@/utils/logger';
import type { AvailableSystemWidget } from '@/types/widget';

interface SystemWidgetGalleryProps {
  onWidgetAdded?: () => void;
}

function SystemWidgetCard({
  widget,
  onAdd,
  onRemove,
  onShow,
  onResetPosition,
  isLoading,
  isHidden,
}: {
  widget: AvailableSystemWidget;
  onAdd: (id: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onShow: (id: string) => void;
  onResetPosition: (id: string) => void;
  isLoading: boolean;
  isHidden: boolean;  // Widget is added but closed/hidden
}) {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const getContentTypeIcon = (contentType?: string) => {
    switch (contentType) {
      case 'live_channel':
      case 'live':
        return <Tv size={14} color={colors.primary} />;
      case 'iframe':
        return <Globe size={14} color={colors.accent} />;
      case 'podcast':
        return <Podcast size={14} color={colors.success} />;
      case 'radio':
        return <Radio size={14} color={colors.warning} />;
      case 'vod':
        return <Film size={14} color={colors.info} />;
      case 'custom':
        return <Tv size={14} color={colors.info} />;
      default:
        return <Tv size={14} color={colors.textMuted} />;
    }
  };

  const getContentTypeLabel = (contentType?: string) => {
    switch (contentType) {
      case 'live_channel':
      case 'live':
        return t('widgets.contentTypes.liveChannel') || 'Live Channel';
      case 'iframe':
        return t('widgets.contentTypes.iframe') || 'Web Content';
      case 'podcast':
        return t('widgets.contentTypes.podcast') || 'Podcast';
      case 'radio':
        return t('widgets.contentTypes.radio') || 'Radio';
      case 'vod':
        return t('widgets.contentTypes.vod') || 'Video';
      case 'custom':
        return t('widgets.contentTypes.custom') || 'Custom';
      default:
        return t('widgets.contentTypes.widget') || 'Widget';
    }
  };


  const handleAction = async () => {
    // If hidden, just show it (no API call needed, just update local state)
    if (isHidden) {
      onShow(widget.id);
      return;
    }

    setActionLoading(true);
    try {
      if (widget.is_added) {
        await onRemove(widget.id);
      } else {
        await onAdd(widget.id);
      }
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <View
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={styles.cardWrapper}
    >
      <GlassCard style={[styles.cardInner, isHovered && styles.cardHovered]}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          {getContentTypeIcon(widget.content?.content_type)}
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {widget.title}
          </Text>
          {widget.description && (
            <Text style={styles.cardDescription} numberOfLines={2}>
              {widget.description}
            </Text>
          )}
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              {getContentTypeIcon(widget.content?.content_type)}
              <Text style={styles.badgeText}>
                {getContentTypeLabel(widget.content?.content_type)}
              </Text>
            </View>
          </View>
        </View>

        {/* Reset Position Button - only visible on hover for added widgets */}
        {isHovered && widget.is_added && (
          <Pressable
            onPress={(e) => {
              e?.stopPropagation?.();
              onResetPosition(widget.id);
            }}
            style={styles.resetButton}
          >
            <RotateCcw size={16} color={colors.text} />
          </Pressable>
        )}

        {/* Add/Remove/Show Button - Glassmorphic */}
        <GlassButton
          title={
            actionLoading
              ? '...'
              : isHidden
                ? t('widgets.show') || 'Show'
                : widget.is_added
                  ? t('widgets.added') || 'Added'
                  : t('widgets.add') || 'Add'
          }
          onPress={handleAction}
          disabled={actionLoading || isLoading}
          loading={actionLoading}
          variant={
            isHidden
              ? 'warning'
              : widget.is_added
                ? 'success'
                : 'primary'
          }
          size="sm"
          icon={
            !actionLoading &&
            (isHidden ? (
              <Eye size={16} color={colors.text} />
            ) : widget.is_added ? (
              <Check size={16} color={colors.text} />
            ) : (
              <Plus size={16} color={colors.text} />
            ))
          }
          style={styles.actionButton}
        />
      </GlassCard>
    </View>
  );
}

export function SystemWidgetGallery({ onWidgetAdded }: SystemWidgetGalleryProps) {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const { width } = useWindowDimensions();
  const [widgets, setWidgets] = useState<AvailableSystemWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get local state to check which widgets are hidden
  const { localState, showWidget, updatePosition, toggleMinimize } = useWidgetStore();

  // Reset widget position to defaults
  const handleResetPosition = useCallback((widgetId: string) => {
    logger.debug('Reset position clicked (SystemWidget)', 'SystemWidgetGallery', { widgetId });

    // If widget is minimized, un-minimize it first
    const state = localState[widgetId];
    if (state?.isMinimized) {
      logger.debug('Widget is minimized, un-minimizing first', 'SystemWidgetGallery', { widgetId });
      toggleMinimize(widgetId);
    }

    const widget = widgets.find(w => w.id === widgetId);
    if (widget?.position) {
      logger.debug('Resetting position to defaults', 'SystemWidgetGallery', {
        widgetId,
        position: widget.position
      });

      updatePosition(widgetId, {
        x: widget.position.x,
        y: widget.position.y,
        width: widget.position.width,
        height: widget.position.height,
      });
    }
  }, [widgets, localState, updatePosition, toggleMinimize]);

  const numColumns = width >= 1280 ? 4 : width >= 1024 ? 3 : width >= 768 ? 2 : 1;

  // Check if a widget is hidden (added but closed)
  const isWidgetHidden = useCallback((widgetId: string, isAdded: boolean): boolean => {
    if (!isAdded) return false;
    const state = localState[widgetId];
    return state?.isVisible === false;
  }, [localState]);

  const loadWidgets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminWidgetsService.getAvailableSystemWidgets();
      const data = response?.data || response;
      setWidgets(data?.items || []);
    } catch (err) {
      logger.error('Failed to load available system widgets', 'SystemWidgetGallery', err);
      setError(t('common.error') || 'Failed to load widgets');
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadWidgets();
  }, [loadWidgets]);

  const handleAdd = async (widgetId: string) => {
    try {
      await adminWidgetsService.addSystemWidget(widgetId);
      // Update local state
      setWidgets((prev) =>
        prev.map((w) => (w.id === widgetId ? { ...w, is_added: true } : w))
      );
      onWidgetAdded?.();
    } catch (err) {
      logger.error('Failed to add system widget', 'SystemWidgetGallery', err);
      throw err;
    }
  };

  const handleRemove = async (widgetId: string) => {
    try {
      await adminWidgetsService.removeSystemWidget(widgetId);
      // Update local state
      setWidgets((prev) =>
        prev.map((w) => (w.id === widgetId ? { ...w, is_added: false } : w))
      );
      onWidgetAdded?.();
    } catch (err) {
      logger.error('Failed to remove system widget', 'SystemWidgetGallery', err);
      throw err;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading') || 'Loading...'}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <GlassButton
          title={t('common.retry') || 'Retry'}
          onPress={loadWidgets}
          variant="ghost"
          size="sm"
          icon={<RefreshCw size={16} color={colors.text} />}
        />
      </View>
    );
  }

  if (widgets.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {t('widgets.noSystemWidgets') || 'No system widgets available'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { textAlign }]}>
          {t('widgets.systemWidgets') || 'System Widgets'}
        </Text>
        <Text style={[styles.headerSubtitle, { textAlign }]}>
          {t('widgets.systemWidgetsHint') || 'Browse and add widgets to your collection'}
        </Text>
      </View>

      <View style={[styles.gridContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {widgets.map((widget) => (
          <View key={widget.id} style={{ width: `${100 / numColumns}%`, paddingHorizontal: spacing.xs }}>
            <SystemWidgetCard
              widget={widget}
              onAdd={handleAdd}
              onRemove={handleRemove}
              onShow={showWidget}
              onResetPosition={handleResetPosition}
              isLoading={loading}
              isHidden={isWidgetHidden(widget.id, widget.is_added)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg * 2,
  },
  header: {
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cardWrapper: {
    flex: 1,
  },
  cardInner: {
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
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.glassPurple,
    borderWidth: 1,
    borderColor: colors.glassBorderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 24,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  cardDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    backgroundColor: colors.glassPurple,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: 11,
    color: colors.primaryLight,
    textTransform: 'capitalize',
  },
  resetButton: {
    position: 'absolute',
    top: spacing.md,
    right: 140,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.glassPurple,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    minWidth: 90,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: 14,
  },
  errorContainer: {
    padding: spacing.lg,
    alignItems: 'center',
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.error.DEFAULT,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  emptyContainer: {
    padding: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.glassLight,
    borderWidth: 1,
    borderColor: colors.glassBorderLight,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});

export default SystemWidgetGallery;
