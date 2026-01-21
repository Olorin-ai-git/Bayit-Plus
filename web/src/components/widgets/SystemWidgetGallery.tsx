/**
 * SystemWidgetGallery Component
 *
 * Displays available system widgets that users can browse and add to their collection.
 * Part of the opt-in widget subscription model.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, useWindowDimensions, ActivityIndicator } from 'react-native';
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
      className="flex-1"
    >
      <GlassCard className={`px-4 py-4 mb-4 flex-row items-center gap-4 relative border-0 ${isHovered ? 'bg-blue-500/5' : ''}`}>
        <View className="w-12 h-12 rounded-full bg-white/5 justify-center items-center">
          <Text className="text-2xl">{getIcon()}</Text>
        </View>

        <View className="flex-1">
          <Text className="text-[15px] font-semibold text-white" numberOfLines={2}>
            {widget.title}
          </Text>
          {widget.description && (
            <Text className="text-xs text-white/60 mt-0.5" numberOfLines={2}>
              {widget.description}
            </Text>
          )}
          <View className="flex-row gap-2 mt-2">
            <View className="flex-row items-center gap-1 bg-white/5 px-2 py-0.5 rounded">
              {getContentTypeIcon(widget.content?.content_type)}
              <Text className="text-[11px] text-white/60 capitalize">
                {getContentTypeLabel(widget.content?.content_type)}
              </Text>
            </View>
          </View>
        </View>

        {/* Reset Position Button - only visible on hover for added widgets */}
        {isHovered && widget.is_added && (
          <Pressable
            onPress={() => onResetPosition(widget.id)}
            className="w-8 h-8 rounded-full bg-white/10 justify-center items-center mr-2"
          >
            <RotateCcw size={16} color={colors.text} />
          </Pressable>
        )}

        {/* Add/Remove/Show Button */}
        <Pressable
          onPress={handleAction}
          disabled={actionLoading || isLoading}
          className={`flex-row items-center gap-1.5 px-4 py-2 rounded-lg min-w-[80px] justify-center ${
            isHidden
              ? 'bg-yellow-500/20 border border-yellow-500/50'
              : widget.is_added
                ? 'bg-green-500/20 border border-green-500/50'
                : 'bg-blue-600'
          }`}
        >
          {actionLoading ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : isHidden ? (
            <>
              <Eye size={16} color={colors.text} />
              <Text className="text-[13px] font-semibold text-white">{t('widgets.show') || 'Show'}</Text>
            </>
          ) : widget.is_added ? (
            <>
              <Check size={16} color={colors.text} />
              <Text className="text-[13px] font-semibold text-white">{t('widgets.added') || 'Added'}</Text>
            </>
          ) : (
            <>
              <Plus size={16} color={colors.text} />
              <Text className="text-[13px] font-semibold text-white">{t('widgets.add') || 'Add'}</Text>
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
      <View className="p-8 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-2 text-white/60 text-sm">{t('common.loading') || 'Loading...'}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="p-6 items-center bg-red-500/10 rounded-lg mb-6">
        <Text className="text-red-500 text-sm mb-2">{error}</Text>
        <Pressable onPress={loadWidgets} className="flex-row items-center gap-2 px-4 py-2 bg-white/5 rounded-lg">
          <RefreshCw size={16} color={colors.text} />
          <Text className="text-white text-sm">{t('common.retry') || 'Retry'}</Text>
        </Pressable>
      </View>
    );
  }

  if (widgets.length === 0) {
    return (
      <View className="p-6 items-center bg-white/5 rounded-lg mb-6">
        <Text className="text-white/60 text-sm">
          {t('widgets.noSystemWidgets') || 'No system widgets available'}
        </Text>
      </View>
    );
  }

  return (
    <View className="mb-8">
      <View className="mb-4">
        <Text className="text-xl font-semibold text-white mb-2" style={{ textAlign }}>
          {t('widgets.systemWidgets') || 'System Widgets'}
        </Text>
        <Text className="text-sm text-white/60" style={{ textAlign }}>
          {t('widgets.systemWidgetsHint') || 'Browse and add widgets to your collection'}
        </Text>
      </View>

      <View className="flex-row flex-wrap" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
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

export default SystemWidgetGallery;
