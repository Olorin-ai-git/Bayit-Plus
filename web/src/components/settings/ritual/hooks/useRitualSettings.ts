/**
 * useRitualSettings Hook
 * Manages ritual settings state and API interactions
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ritualService } from '@/services/api';
import logger from '@/utils/logger';
import { RitualPreferences, ContentType } from '../types';

export function useRitualSettings() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';

  const [preferences, setPreferences] = useState<RitualPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const data = await ritualService.getPreferences();
      setPreferences(data);
    } catch (error) {
      logger.error('Failed to load ritual preferences', 'useRitualSettings', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = <K extends keyof RitualPreferences>(
    key: K,
    value: RitualPreferences[K]
  ) => {
    setPreferences((prev) => (prev ? { ...prev, [key]: value } : null));
    setSaved(false);
  };

  const handleContentToggle = (contentType: ContentType) => {
    const current = preferences?.morning_ritual_content || [];
    const updated = current.includes(contentType)
      ? current.filter((c) => c !== contentType)
      : [...current, contentType];
    handleChange('morning_ritual_content', updated);
  };

  const handleSave = async () => {
    if (!preferences) return;
    setSaving(true);
    try {
      await ritualService.updatePreferences(preferences);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      logger.error('Failed to save ritual preferences', 'useRitualSettings', error);
    } finally {
      setSaving(false);
    }
  };

  return {
    preferences,
    loading,
    saving,
    saved,
    isRTL,
    actions: {
      handleChange,
      handleContentToggle,
      handleSave,
    },
  };
}
