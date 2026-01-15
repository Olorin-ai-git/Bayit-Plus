import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Save, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import { settingsService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassButton, GlassModal, GlassInput, GlassToggle, GlassView } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
import { useModal } from '@/contexts/ModalContext';
import logger from '@/utils/logger';
import { adminButtonStyles } from '@/styles/adminButtonStyles';

interface SystemSettings {
  default_plan: string;
  trial_days: number;
  max_devices: number;
  maintenance_mode: boolean;
  support_email: string;
  terms_url: string;
  privacy_url: string;
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const { showConfirm } = useModal();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadSettings = async () => {
    setLoading(true);
    try {
      const settingsData = await settingsService.getSettings();
      setSettings(settingsData);
    } catch (error: any) {
      logger.error('Failed to load settings', 'SettingsPage', error);
      setErrorMessage(error?.message || error?.detail || 'Failed to load settings. Please check your permissions and try again.');
      setErrorModalOpen(true);
      // Set empty settings so page can still render
      setSettings({
        default_plan: 'free',
        trial_days: 7,
        max_devices: 4,
        maintenance_mode: false,
        support_email: 'support@bayit.tv',
        terms_url: 'https://bayit.tv/terms',
        privacy_url: 'https://bayit.tv/privacy',
      });
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

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await settingsService.updateSettings(settings);
      setHasChanges(false);
      setSuccessMessage(t('admin.settings.savingSuccess'));
      setSuccessModalOpen(true);
    } catch (error: any) {
      logger.error('Failed to save settings', 'SettingsPage', error);
      setErrorMessage(error?.message || error?.detail || 'Failed to save settings. Please check your permissions.');
      setErrorModalOpen(true);
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
          setSuccessMessage(t('admin.settings.cacheCleared'));
          setSuccessModalOpen(true);
        } catch (error: any) {
          logger.error('Failed to clear cache', 'SettingsPage', error);
          setErrorMessage(error?.message || error?.detail || 'Failed to clear cache. Please check your permissions.');
          setErrorModalOpen(true);
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
          setSuccessMessage(t('admin.settings.analyticsReset'));
          setSuccessModalOpen(true);
        } catch (error: any) {
          logger.error('Failed to reset analytics', 'SettingsPage', error);
          setErrorMessage(error?.message || error?.detail || 'Failed to reset analytics. Please check your permissions.');
          setErrorModalOpen(true);
        }
      },
      { destructive: true, confirmText: t('common.reset', 'Reset') }
    );
  };

  if (loading || !settings) {
    return (
      <GlassView style={styles.loadingContainer} intensity="medium">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </GlassView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={[styles.header, { flexDirection }]}>
        <View>
          <Text style={[styles.pageTitle, { textAlign }]}>{t('admin.titles.settings')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>{t('admin.settings.subtitle')}</Text>
        </View>
        <GlassButton title={t('admin.settings.saveChanges')} variant="secondary" icon={<Save size={16} color={colors.text} />} onPress={handleSave} disabled={!hasChanges || saving} style={adminButtonStyles.successButton} textStyle={adminButtonStyles.buttonText} />
      </View>

      <View style={styles.sectionsContainer}>
        <GlassCard style={styles.section}>
          <Text style={[styles.sectionTitle, { textAlign }]}>{t('admin.settings.generalSettings')}</Text>

          <View style={styles.formGroup}>
            <GlassInput label={t('admin.settings.supportEmail')} value={settings.support_email || ''} onChangeText={(v) => handleSettingChange('support_email', v)} keyboardType="email-address" />
          </View>

          <View style={styles.formGroup}>
            <GlassInput label={t('admin.settings.defaultPlan')} value={settings.default_plan || ''} onChangeText={(v) => handleSettingChange('default_plan', v)} />
          </View>

          <View style={styles.formGroup}>
            <GlassInput label={t('admin.settings.termsUrl')} value={settings.terms_url || ''} onChangeText={(v) => handleSettingChange('terms_url', v)} />
          </View>

          <View style={styles.formGroup}>
            <GlassInput label={t('admin.settings.privacyUrl')} value={settings.privacy_url || ''} onChangeText={(v) => handleSettingChange('privacy_url', v)} />
          </View>
        </GlassCard>

        <GlassCard style={styles.section}>
          <Text style={[styles.sectionTitle, { textAlign }]}>{t('admin.settings.userSettings')}</Text>

          <View style={styles.formGroup}>
            <GlassInput label={t('admin.settings.maxDevices')} value={(settings.max_devices || 1).toString()} onChangeText={(v) => handleSettingChange('max_devices', parseInt(v) || 1)} keyboardType="number-pad" />
          </View>

          <View style={styles.formGroup}>
            <GlassInput label={t('admin.settings.trialDays')} value={(settings.trial_days || 0).toString()} onChangeText={(v) => handleSettingChange('trial_days', parseInt(v) || 0)} keyboardType="number-pad" />
          </View>
        </GlassCard>

        <GlassCard style={styles.section}>
          <Text style={[styles.sectionTitle, { textAlign }]}>{t('admin.settings.maintenanceMode')}</Text>

          <GlassToggle
            value={settings.maintenance_mode}
            onValueChange={(v) => handleSettingChange('maintenance_mode', v)}
            label={t('admin.settings.maintenanceMode')}
            description={t('admin.settings.maintenanceModeDesc')}
            isRTL={isRTL}
          />
        </GlassCard>

        <GlassCard style={[styles.section, styles.dangerSection]}>
          <Text style={[styles.sectionTitle, { textAlign }]}>{t('admin.settings.systemActions')}</Text>

          <View style={[styles.dangerActions, { flexDirection }]}>
            <GlassButton title={t('admin.settings.clearCache')} variant="secondary" icon={<RefreshCw size={16} color={colors.warning} />} onPress={handleClearCache} style={[adminButtonStyles.warningButton, { flex: 1 }]} textStyle={adminButtonStyles.buttonText} />
            <GlassButton title={t('admin.settings.resetAnalytics')} variant="secondary" icon={<Trash2 size={16} color={colors.error} />} onPress={handleResetAnalytics} style={[adminButtonStyles.dangerButton, { flex: 1 }]} textStyle={adminButtonStyles.buttonText} />
          </View>

          <GlassView style={[styles.warningBox, { flexDirection }]} intensity="light">
            <AlertTriangle size={16} color={colors.warning} />
            <Text style={[styles.warningText, { textAlign }]}>{t('admin.settings.actionsWarning')}</Text>
          </GlassView>
        </GlassCard>
      </View>

      {/* Success Modal */}
      <GlassModal
        visible={successModalOpen}
        title={t('common.success')}
        onClose={() => setSuccessModalOpen(false)}
        dismissable={true}
      >
        <Text style={styles.modalText}>{successMessage}</Text>
        <View style={styles.modalActions}>
          <GlassButton
            title={t('common.ok')}
            onPress={() => setSuccessModalOpen(false)}
            variant="secondary"
            style={adminButtonStyles.successButton}
            textStyle={adminButtonStyles.buttonText}
          />
        </View>
      </GlassModal>

      {/* Error Modal */}
      <GlassModal
        visible={errorModalOpen}
        title={t('common.error', 'Error')}
        onClose={() => setErrorModalOpen(false)}
        dismissable={true}
      >
        <Text style={styles.modalText}>{errorMessage}</Text>
        <View style={styles.modalActions}>
          <GlassButton
            title={t('common.ok')}
            onPress={() => setErrorModalOpen(false)}
            variant="secondary"
            style={adminButtonStyles.dangerButton}
            textStyle={adminButtonStyles.buttonText}
          />
        </View>
      </GlassModal>
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
  dangerSection: { borderWidth: 1, borderColor: colors.glassBorderStrong },
  dangerActions: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  warningBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: `${colors.warning}30` },
  warningText: { flex: 1, fontSize: 12, color: colors.warning },
  modalText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});
