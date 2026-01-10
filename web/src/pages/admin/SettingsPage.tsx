import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Switch, ActivityIndicator, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Save, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import { settingsService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassButton } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
import { useModal } from '@/contexts/ModalContext';
import logger from '@/utils/logger';

interface SystemSettings {
  default_plan: string;
  trial_days: number;
  max_devices: number;
  maintenance_mode: boolean;
  support_email: string;
  terms_url: string;
  privacy_url: string;
}

interface FeatureFlags {
  [key: string]: boolean;
}

const FEATURE_FLAG_KEYS = ['new_player', 'live_chat', 'downloads', 'watch_party', 'voice_search', 'ai_recommendations'] as const;

export default function SettingsPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const { showConfirm } = useModal();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>({});
  const [hasChanges, setHasChanges] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [settingsData, flagsData] = await Promise.all([
        settingsService.getSettings(),
        settingsService.getFeatureFlags(),
      ]);
      setSettings(settingsData);
      setFeatureFlags(flagsData);
    } catch (error) {
      logger.error('Failed to load settings', 'SettingsPage', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSettingChange = (key: keyof SystemSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
    setHasChanges(true);
  };

  const handleFeatureFlagChange = async (flag: string, enabled: boolean) => {
    try {
      await settingsService.updateFeatureFlag(flag, enabled);
      setFeatureFlags((prev) => ({ ...prev, [flag]: enabled }));
    } catch (error) {
      logger.error('Failed to update feature flag', 'SettingsPage', error);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await settingsService.updateSettings(settings);
      setHasChanges(false);
      alert(t('admin.settings.savingSuccess'));
    } catch (error) {
      logger.error('Failed to save settings', 'SettingsPage', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = () => {
    showConfirm(
      t('admin.settings.confirmClearCache'),
      async () => {
        try {
          await settingsService.clearCache();
          alert(t('admin.settings.cacheCleared'));
        } catch (error) {
          logger.error('Failed to clear cache', 'SettingsPage', error);
        }
      },
      { confirmText: t('common.confirm', 'Confirm') }
    );
  };

  const handleResetAnalytics = () => {
    showConfirm(
      t('admin.settings.confirmResetAnalytics'),
      async () => {
        try {
          await settingsService.resetAnalytics();
          alert(t('admin.settings.analyticsReset'));
        } catch (error) {
          logger.error('Failed to reset analytics', 'SettingsPage', error);
        }
      },
      { destructive: true, confirmText: t('common.reset', 'Reset') }
    );
  };

  if (loading || !settings) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={[styles.header, { flexDirection }]}>
        <View>
          <Text style={[styles.pageTitle, { textAlign }]}>{t('admin.titles.settings')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>{t('admin.settings.subtitle')}</Text>
        </View>
        <GlassButton title={t('admin.settings.saveChanges')} variant="primary" icon={<Save size={16} color={colors.text} />} onPress={handleSave} disabled={!hasChanges || saving} />
      </View>

      <View style={styles.sectionsContainer}>
        <GlassCard style={styles.section}>
          <Text style={[styles.sectionTitle, { textAlign }]}>{t('admin.settings.generalSettings')}</Text>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('admin.settings.supportEmail')}</Text>
            <TextInput style={styles.input} value={settings.support_email || ''} onChangeText={(v) => handleSettingChange('support_email', v)} keyboardType="email-address" />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('admin.settings.defaultPlan')}</Text>
            <TextInput style={styles.input} value={settings.default_plan || ''} onChangeText={(v) => handleSettingChange('default_plan', v)} />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('admin.settings.termsUrl')}</Text>
            <TextInput style={styles.input} value={settings.terms_url || ''} onChangeText={(v) => handleSettingChange('terms_url', v)} />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('admin.settings.privacyUrl')}</Text>
            <TextInput style={styles.input} value={settings.privacy_url || ''} onChangeText={(v) => handleSettingChange('privacy_url', v)} />
          </View>
        </GlassCard>

        <GlassCard style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.settings.userSettings')}</Text>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('admin.settings.maxDevices')}</Text>
            <TextInput style={styles.input} value={(settings.max_devices || 1).toString()} onChangeText={(v) => handleSettingChange('max_devices', parseInt(v) || 1)} keyboardType="number-pad" />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('admin.settings.trialDays')}</Text>
            <TextInput style={styles.input} value={(settings.trial_days || 0).toString()} onChangeText={(v) => handleSettingChange('trial_days', parseInt(v) || 0)} keyboardType="number-pad" />
          </View>
        </GlassCard>

        <GlassCard style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.settings.maintenanceMode')}</Text>

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>{t('admin.settings.maintenanceMode')}</Text>
              <Text style={styles.switchDescription}>{t('admin.settings.maintenanceModeDesc')}</Text>
            </View>
            <Switch value={settings.maintenance_mode} onValueChange={(v) => handleSettingChange('maintenance_mode', v)} trackColor={{ false: colors.backgroundLighter, true: colors.warning }} />
          </View>
        </GlassCard>

        <GlassCard style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.settings.featureFlags')}</Text>

          {Object.entries(featureFlags).map(([flag, enabled]) => (
            <View key={flag} style={styles.switchRow}>
              <Text style={styles.switchLabel}>{t(`admin.settings.featureFlagLabels.${flag}`, { defaultValue: flag })}</Text>
              <Switch value={enabled} onValueChange={(v) => handleFeatureFlagChange(flag, v)} trackColor={{ false: colors.backgroundLighter, true: colors.primary }} />
            </View>
          ))}
        </GlassCard>

        <GlassCard style={[styles.section, styles.dangerSection]}>
          <Text style={styles.sectionTitle}>{t('admin.settings.systemActions')}</Text>

          <View style={styles.dangerActions}>
            <GlassButton title={t('admin.settings.clearCache')} variant="secondary" icon={<RefreshCw size={16} color={colors.warning} />} onPress={handleClearCache} />
            <GlassButton title={t('admin.settings.resetAnalytics')} variant="secondary" icon={<Trash2 size={16} color={colors.error} />} onPress={handleResetAnalytics} />
          </View>

          <View style={styles.warningBox}>
            <AlertTriangle size={16} color={colors.warning} />
            <Text style={styles.warningText}>{t('admin.settings.actionsWarning')}</Text>
          </View>
        </GlassCard>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: spacing.lg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  loadingText: { fontSize: 14, color: colors.textMuted },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  sectionsContainer: { gap: spacing.md },
  section: { padding: spacing.lg },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: spacing.lg },
  formGroup: { marginBottom: spacing.md },
  formLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  input: { backgroundColor: colors.backgroundLighter, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.glassBorder, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text, fontSize: 14 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  switchLabel: { fontSize: 14, fontWeight: '500', color: colors.text },
  switchDescription: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  dangerSection: { borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  dangerActions: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  warningBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: borderRadius.md },
  warningText: { flex: 1, fontSize: 12, color: colors.warning },
});
