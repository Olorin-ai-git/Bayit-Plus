/**
 * PrivacySection
 * Privacy settings: analytics, crash reports, personalization, history.
 */

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { GlassButton, GlassModal } from '@bayit/shared/ui';
import {
  Shield, BarChart3, Bug, UserCheck, History, Search, Download, Trash2,
} from 'lucide-react';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
import { SettingSection } from './shared/SettingSection';
import { SettingRow } from './shared/SettingRow';
import { profilesService } from '@/services/api';
import api from '@/services/api';
import logger from '@/utils/logger';

interface PrivacyPrefs {
  analytics_enabled: boolean;
  crash_reports: boolean;
  personalization: boolean;
  watch_history_enabled: boolean;
  search_history_enabled: boolean;
}

const DEFAULTS: PrivacyPrefs = {
  analytics_enabled: true,
  crash_reports: true,
  personalization: true,
  watch_history_enabled: true,
  search_history_enabled: true,
};

export function PrivacySection() {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const [prefs, setPrefs] = useState<PrivacyPrefs>(DEFAULTS);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadPrefs();
  }, []);

  const loadPrefs = async () => {
    try {
      const data = await profilesService.getPrivacyPreferences();
      setPrefs({ ...DEFAULTS, ...data });
    } catch (error) {
      logger.error('Failed to load privacy prefs', 'PrivacySection', error);
    }
  };

  const updatePref = async <K extends keyof PrivacyPrefs>(key: K, value: PrivacyPrefs[K]) => {
    const prev = prefs;
    setPrefs((p) => ({ ...p, [key]: value }));
    try {
      await profilesService.updatePrivacyPreferences({ ...prefs, [key]: value });
    } catch (error) {
      logger.error('Failed to update privacy pref', 'PrivacySection', error);
      setPrefs(prev);
    }
  };

  const handleClearWatchHistory = async () => {
    try {
      await api.delete('/users/me/watch-history');
    } catch (error) {
      logger.error('Failed to clear watch history', 'PrivacySection', error);
    }
  };

  const handleClearSearchHistory = async () => {
    try {
      await api.delete('/users/me/search-history');
    } catch (error) {
      logger.error('Failed to clear search history', 'PrivacySection', error);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      await api.post('/users/me/data-export');
      setShowExportModal(false);
    } catch (error) {
      logger.error('Failed to request data export', 'PrivacySection', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <SettingSection title={t('settings.privacy', 'Privacy')} isRTL={isRTL}>
        <SettingRow
          type="toggle"
          icon={BarChart3}
          label={t('settings.analytics', 'Analytics')}
          description={t('settings.analyticsDesc', 'Help improve the app with usage data')}
          value={prefs.analytics_enabled}
          onValueChange={(v) => updatePref('analytics_enabled', v)}
          isRTL={isRTL}
        />
        <SettingRow
          type="toggle"
          icon={Bug}
          label={t('settings.crashReports', 'Crash Reports')}
          description={t('settings.crashReportsDesc', 'Automatically send crash reports')}
          value={prefs.crash_reports}
          onValueChange={(v) => updatePref('crash_reports', v)}
          isRTL={isRTL}
        />
        <SettingRow
          type="toggle"
          icon={UserCheck}
          label={t('settings.personalization', 'Personalization')}
          description={t('settings.personalizationDesc', 'Personalized content recommendations')}
          value={prefs.personalization}
          onValueChange={(v) => updatePref('personalization', v)}
          isRTL={isRTL}
        />
        <SettingRow
          type="toggle"
          icon={History}
          label={t('settings.watchHistory', 'Watch History')}
          value={prefs.watch_history_enabled}
          onValueChange={(v) => updatePref('watch_history_enabled', v)}
          isRTL={isRTL}
        />
        <SettingRow
          type="toggle"
          icon={Search}
          label={t('settings.searchHistory', 'Search History')}
          value={prefs.search_history_enabled}
          onValueChange={(v) => updatePref('search_history_enabled', v)}
          isRTL={isRTL}
        />
        <View style={styles.actions}>
          <GlassButton
            variant="secondary"
            size="sm"
            onPress={handleClearWatchHistory}
          >
            <Trash2 size={14} color={colors.textMuted} />
            <Text style={styles.actionText}>
              {t('settings.clearWatchHistory', 'Clear Watch History')}
            </Text>
          </GlassButton>
          <GlassButton
            variant="secondary"
            size="sm"
            onPress={handleClearSearchHistory}
          >
            <Trash2 size={14} color={colors.textMuted} />
            <Text style={styles.actionText}>
              {t('settings.clearSearchHistory', 'Clear Search History')}
            </Text>
          </GlassButton>
          <GlassButton
            variant="secondary"
            size="sm"
            onPress={() => setShowExportModal(true)}
          >
            <Download size={14} color={colors.textMuted} />
            <Text style={styles.actionText}>
              {t('settings.downloadData', 'Download My Data')}
            </Text>
          </GlassButton>
        </View>
      </SettingSection>

      <GlassModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        title={t('settings.downloadDataTitle', 'Download Your Data')}
        buttons={[
          { label: t('common.cancel', 'Cancel'), onPress: () => setShowExportModal(false) },
          {
            label: isExporting
              ? t('common.requesting', 'Requesting...')
              : t('common.request', 'Request Export'),
            onPress: handleExportData,
            disabled: isExporting,
          },
        ]}
      >
        <Text style={styles.modalText}>
          {t('settings.downloadDataDesc', 'We will prepare a copy of your data and send it to your registered email address.')}
        </Text>
      </GlassModal>
    </>
  );
}

const styles = StyleSheet.create({
  actions: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  actionText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginLeft: spacing.xs,
  },
  modalText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
});
