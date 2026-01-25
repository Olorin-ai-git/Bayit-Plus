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
      const data = await adminWidgetsService.getMyWidgets('/');
      const response = Array.isArray(data) ? data : data?.items || [];

      // Only show personal widgets (user's own widgets)
      const personal = response.filter((w: Widget) => w.type === 'personal');

      setWidgets(personal);
    } catch (err) {
      logger.error('Failed to load widgets', 'UserWidgetsPage', err);
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
  };
}
