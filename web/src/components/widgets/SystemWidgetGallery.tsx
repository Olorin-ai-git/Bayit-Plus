/**
 * SystemWidgetGallery Component
 *
 * Displays available system widgets that users can browse and add to their collection.
 * Part of the opt-in widget subscription model.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus, Check, Tv, Globe, Podcast, Radio, Film, RefreshCw, Eye, EyeOff, RotateCcw, Trash2 } from 'lucide-react';
import { GlassCard } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
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

  const getIcon = (): string => {
    if (widget.icon) return widget.icon;
    if (widget.content?.content_type === 'live_channel') return '📺';
    if (widget.content?.content_type === 'iframe') return '🌐';
    if (widget.content?.content_type === 'podcast') return '🎙️';
    if (widget.content?.content_type === 'radio') return '📻';
    return '🎯';
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
      <GlassCard style={[styles.card, isHovered && styles.cardHovered]}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{getIcon()}</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {widget.title}
          </Text>
          {widget.description && (
            <Text style={styles.description} numberOfLines={2}>
              {widget.description}
            </Text>
          )}
          <View style={styles.metadata}>
            <View style={styles.contentTypeBadge}>
              {getContentTypeIcon(widget.content?.content_type)}
              <Text style={styles.contentTypeText}>
                {getContentTypeLabel(widget.content?.content_type)}
              </Text>
            </View>
          </View>
        </View>

        {/* Reset Position Button - only visible on hover for added widgets */}
        {isHovered && widget.is_added && (
          <Pressable
            onPress={() => onResetPosition(widget.id)}
            style={styles.resetButton}
          >
            <RotateCcw size={16} color={colors.text} />
          </Pressable>
        )}

        {/* Add/Remove/Show Button */}
        <Pressable
          onPress={handleAction}
          disabled={actionLoading || isLoading}
          style={[
            styles.actionButton,
            isHidden ? styles.showButton : widget.is_added ? styles.addedButton : styles.addButton,
          ]}
        >
          {actionLoading ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : isHidden ? (
            <>
              <Eye size={16} color={colors.text} />
              <Text style={styles.actionButtonText}>{t('widgets.show') || 'Show'}</Text>
            </>
          ) : widget.is_added ? (
            <>
              <Check size={16} color={colors.text} />
              <Text style={styles.actionButtonText}>{t('widgets.added') || 'Added'}</Text>
            </>
          ) : (
            <>
              <Plus size={16} color={colors.text} />
              <Text style={styles.actionButtonText}>{t('widgets.add') || 'Add'}</Text>
            </>
          )}
        </Pressable>
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
  const { localState, showWidget, updatePosition } = useWidgetStore();

  // Reset widget position to defaults
  const handleResetPosition = useCallback((widgetId: string) => {
    const widget = widgets.find(w => w.id === widgetId);
    if (widget?.position) {
      updatePosition(widgetId, {
        x: widget.position.x,
        y: widget.position.y,
        width: widget.position.width,
        height: widget.position.height,
      });
    }
  }, [widgets, updatePosition]);

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
        <Pressable onPress={loadWidgets} style={styles.retryButton}>
          <RefreshCw size={16} color={colors.text} />
          <Text style={styles.retryText}>{t('common.retry') || 'Retry'}</Text>
        </Pressable>
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
        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('widgets.systemWidgets') || 'System Widgets'}
        </Text>
        <Text style={[styles.sectionDescription, { textAlign }]}>
          {t('widgets.systemWidgetsHint') || 'Browse and add widgets to your collection'}
        </Text>
      </View>

      <View style={[styles.grid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
    marginBottom: spacing.xl,
  },
  header: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cardWrapper: {
    flex: 1,
  },
  card: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    position: 'relative',
    borderWidth: 0,
  },
  cardHovered: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.glass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  description: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  metadata: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  contentTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.glass,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  contentTypeText: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  resetButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 80,
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: colors.primary,
  },
  addedButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.5)',
  },
  showButton: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.5)',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 14,
  },
  errorContainer: {
    padding: spacing.lg,
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
  },
  retryText: {
    color: colors.text,
    fontSize: 14,
  },
  emptyContainer: {
    padding: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
});

export default SystemWidgetGallery;
