import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { adminWidgetsService } from '@/services/adminApi';
import { useWidgetStore } from '@/stores/widgetStore';
import { DEFAULT_WIDGET_POSITION, Widget } from '@/types/widget';
import logger from '@/utils/logger';

export function useWidgetsPage() {
  const { t } = useTranslation();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWidgetForm, setShowWidgetForm] = useState(false);

  // Selection mode state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Get local state to check which widgets are hidden
  const { localState, showWidget, closeWidget, updatePosition, toggleMinimize } = useWidgetStore();

  // Intro video state
  const [showIntroVideo, setShowIntroVideo] = useState(false);
  const [hasSeenIntro, setHasSeenIntro] = useState(() => {
    try {
      return localStorage.getItem('widgets-intro-seen') === 'true';
    } catch (e) {
      logger.warn('Could not read intro dismissal', 'useWidgetsPage', e);
      return false;
    }
  });

  const handleDismissIntro = () => {
    try {
      localStorage.setItem('widgets-intro-seen', 'true');
    } catch (e) {
      logger.warn('Could not save intro dismissal', 'useWidgetsPage', e);
    }
    setHasSeenIntro(true);
    setShowIntroVideo(false);
  };

  // Check if a widget is hidden
  const isWidgetHidden = useCallback((widgetId: string): boolean => {
    const state = localState[widgetId];
    return state?.isVisible === false;
  }, [localState]);

  // Toggle widget visibility
  const handleToggleVisibility = useCallback((widgetId: string) => {
    if (isWidgetHidden(widgetId)) {
      showWidget(widgetId);
    } else {
      closeWidget(widgetId);
    }
  }, [isWidgetHidden, showWidget, closeWidget]);

  // Reset widget position to defaults
  const handleResetPosition = useCallback((widgetId: string) => {
    logger.debug('Reset position clicked', 'useWidgetsPage', { widgetId });

    // If widget is minimized, un-minimize it first
    const state = localState[widgetId];
    if (state?.isMinimized) {
      logger.debug('Widget is minimized, un-minimizing first', 'useWidgetsPage', { widgetId });
      toggleMinimize(widgetId);
    }

    const widget = widgets.find(w => w.id === widgetId);
    const defaultPosition = widget?.position || DEFAULT_WIDGET_POSITION;

    logger.debug('Resetting position to defaults', 'useWidgetsPage', {
      widgetId,
      defaultPosition
    });

    updatePosition(widgetId, {
      x: defaultPosition.x,
      y: defaultPosition.y,
      width: defaultPosition.width,
      height: defaultPosition.height,
    });
  }, [widgets, localState, updatePosition, toggleMinimize]);

  const handleCreateWidget = () => {
    logger.debug('Create button clicked', 'useWidgetsPage');
    setShowWidgetForm(true);
  };

  const handleSaveWidget = async (formData: any) => {
    try {
      await adminWidgetsService.createWidget(formData);
      setShowWidgetForm(false);
      setError(null);
      await loadWidgets();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save widget';
      logger.error(msg, 'UserWidgetsPage', err);
      setError(msg);
    }
  };

  const loadWidgets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminWidgetsService.getMyWidgets('/');
      // Centralized api already returns response.data, so response IS the data object
      // Backend returns {items: Widget[], total: number}
      const widgets = Array.isArray(response) ? response : response?.items || [];

      // Only show personal widgets (user's own widgets)
      const personal = widgets.filter((w: Widget) => w.type === 'personal');

      setWidgets(personal);
    } catch (err) {
      logger.error('Failed to load widgets', 'useWidgetsPage', err);
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const handleDelete = async (id: string) => {
    try {
      await adminWidgetsService.deleteWidget(id);
      setWidgets((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      logger.error('Failed to delete widget', 'UserWidgetsPage', err);
      setError(t('common.error'));
    }
  };

  // Selection mode handlers
  const toggleSelectMode = useCallback(() => {
    setSelectMode((prev) => {
      if (prev) {
        setSelectedIds(new Set());
      }
      return !prev;
    });
  }, []);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(widgets.map((w) => w.id)));
  }, [widgets]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    try {
      await adminWidgetsService.bulkSoftDelete(Array.from(selectedIds));
      setWidgets((prev) => prev.filter((w) => !selectedIds.has(w.id)));
      setSelectMode(false);
      setSelectedIds(new Set());
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error');
      logger.error(msg, 'useWidgetsPage', err);
      setError(msg);
    }
  }, [selectedIds, t]);

  useEffect(() => {
    loadWidgets();
  }, [loadWidgets]);

  return {
    widgets,
    loading,
    error,
    setError,
    showWidgetForm,
    showIntroVideo,
    hasSeenIntro,
    setShowWidgetForm,
    setShowIntroVideo,
    handleDismissIntro,
    isWidgetHidden,
    handleToggleVisibility,
    handleResetPosition,
    handleCreateWidget,
    handleSaveWidget,
    handleDelete,
    loadWidgets,
    selectMode,
    selectedIds,
    toggleSelectMode,
    toggleSelected,
    selectAll,
    handleBulkDelete,
  };
}
