/**
 * useWidgetForm Hook
 * Form state management for widget forms
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import logger from '@/utils/logger';
import type { ContentItem } from './ContentSelectionSection';
import { buildWidgetPayload, mapInitialDataToFormState } from './widgetFormUtils';

export interface FormState {
  title: string;
  description: string;
  icon: string;
  content_type: 'live_channel' | 'iframe' | 'podcast' | 'vod' | 'radio' | 'live';
  content_id: string;
  iframe_url: string;
  iframe_title: string;
  position_x: number;
  position_y: number;
  position_width: number;
  position_height: number;
  is_muted?: boolean;
  is_closable?: boolean;
  is_draggable?: boolean;
  visible_to_roles?: string[];
  target_pages?: string[];
  order?: number;
}

const DEFAULT_FORM_STATE: FormState = {
  title: '',
  description: '',
  icon: '',
  content_type: 'live_channel',
  content_id: '',
  iframe_url: '',
  iframe_title: '',
  position_x: 20,
  position_y: 100,
  position_width: 350,
  position_height: 197,
  is_muted: true,
  is_closable: true,
  is_draggable: true,
  visible_to_roles: ['user'],
  target_pages: [],
  order: 0,
};

export function useWidgetForm(
  visible: boolean,
  initialData?: any,
  isAdminWidget: boolean = false
) {
  const { t } = useTranslation();
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM_STATE);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Initialize form when modal opens
  useEffect(() => {
    if (visible) {
      if (initialData) {
        setFormState(mapInitialDataToFormState(initialData));
      } else {
        setFormState(DEFAULT_FORM_STATE);
      }
      setError(null);
      setSelectedContent(null);
    }
  }, [visible, initialData]);

  const updateField = (field: keyof FormState, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleContentSelected = (items: ContentItem[]) => {
    if (items.length > 0) {
      const item = items[0];
      let contentType = item.type as any;
      if (contentType === 'live') contentType = 'live_channel';

      setFormState((prev) => ({
        ...prev,
        content_type: contentType,
        content_id: item.id,
        title: prev.title || item.title,
        icon: prev.icon || (item.icon || ''),
      }));
      setSelectedContent(item);
    }
  };

  const switchToIframe = () => {
    setFormState((prev) => ({ ...prev, content_type: 'iframe', content_id: '' }));
    setSelectedContent(null);
  };

  const validateForm = (): boolean => {
    if (!formState.title.trim()) {
      setError(t('widgets.form.errors.titleRequired', 'Title is required'));
      return false;
    }

    if (formState.content_type === 'iframe') {
      if (!formState.iframe_url.trim()) {
        setError(t('widgets.form.errors.iframeUrlRequired', 'iFrame URL is required'));
        return false;
      }
    } else {
      if (!formState.content_id) {
        setError(t('widgets.form.errors.contentRequired', 'Please select content'));
        return false;
      }
    }

    return true;
  };

  const handleSave = async (
    onSaveCallback: (data: any) => Promise<void>,
    onCloseCallback: () => void
  ) => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = buildWidgetPayload(formState, isAdminWidget);
      await onSaveCallback(payload);
      setFormState(DEFAULT_FORM_STATE);
      setSelectedContent(null);
      onCloseCallback();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save widget';
      logger.error(msg, 'useWidgetForm', err);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return {
    formState,
    selectedContent,
    error,
    saving,
    updateField,
    handleContentSelected,
    switchToIframe,
    handleSave,
  };
}
