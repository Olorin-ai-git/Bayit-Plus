import { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Save, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import { settingsService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassButton, GlassModal, GlassInput, GlassToggle, GlassView } from '@bayit/shared/ui';
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
      <GlassView className="flex-1 justify-center items-center gap-2" intensity="medium">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-sm text-gray-400">{t('common.loading')}</Text>
      </GlassView>
    );
  }

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: spacing.lg }}>
      <View className={`flex ${flexDirection} items-center justify-between mb-6`}>
        <View>
          <Text className={`text-2xl font-bold text-white ${textAlign}`}>{t('admin.titles.settings')}</Text>
          <Text className={`text-sm text-gray-400 mt-1 ${textAlign}`}>{t('admin.settings.subtitle')}</Text>
        </View>
        <GlassButton title={t('admin.settings.saveChanges')} variant="success" icon={<Save size={16} color="white" />} onPress={handleSave} disabled={!hasChanges || saving} />
      </View>

      <View className="gap-4">
        <GlassCard className="p-6">
          <Text className={`text-lg font-semibold text-white mb-6 ${textAlign}`}>{t('admin.settings.generalSettings')}</Text>

          <View className="mb-4">
            <GlassInput label={t('admin.settings.supportEmail')} value={settings.support_email || ''} onChangeText={(v) => handleSettingChange('support_email', v)} keyboardType="email-address" />
          </View>

          <View className="mb-4">
            <GlassInput label={t('admin.settings.defaultPlan')} value={settings.default_plan || ''} onChangeText={(v) => handleSettingChange('default_plan', v)} />
          </View>

          <View className="mb-4">
            <GlassInput label={t('admin.settings.termsUrl')} value={settings.terms_url || ''} onChangeText={(v) => handleSettingChange('terms_url', v)} />
          </View>

          <View className="mb-4">
            <GlassInput label={t('admin.settings.privacyUrl')} value={settings.privacy_url || ''} onChangeText={(v) => handleSettingChange('privacy_url', v)} />
          </View>
        </GlassCard>

        <GlassCard className="p-6">
          <Text className={`text-lg font-semibold text-white mb-6 ${textAlign}`}>{t('admin.settings.userSettings')}</Text>

          <View className="mb-4">
            <GlassInput label={t('admin.settings.maxDevices')} value={(settings.max_devices || 1).toString()} onChangeText={(v) => handleSettingChange('max_devices', parseInt(v) || 1)} keyboardType="number-pad" />
          </View>

          <View className="mb-4">
            <GlassInput label={t('admin.settings.trialDays')} value={(settings.trial_days || 0).toString()} onChangeText={(v) => handleSettingChange('trial_days', parseInt(v) || 0)} keyboardType="number-pad" />
          </View>
        </GlassCard>

        <GlassCard className="p-6">
          <Text className={`text-lg font-semibold text-white mb-6 ${textAlign}`}>{t('admin.settings.maintenanceMode')}</Text>

          <GlassToggle
            value={settings.maintenance_mode}
            onValueChange={(v) => handleSettingChange('maintenance_mode', v)}
            label={t('admin.settings.maintenanceMode')}
            description={t('admin.settings.maintenanceModeDesc')}
            isRTL={isRTL}
          />
        </GlassCard>

        <GlassCard className="p-6 border border-white/10">
          <Text className={`text-lg font-semibold text-white mb-6 ${textAlign}`}>{t('admin.settings.systemActions')}</Text>

          <View className={`flex ${flexDirection} gap-4 mb-4`}>
            <GlassButton title={t('admin.settings.clearCache')} variant="warning" icon={<RefreshCw size={16} color="white" />} onPress={handleClearCache} style={{ flex: 1 }} />
            <GlassButton title={t('admin.settings.resetAnalytics')} variant="danger" icon={<Trash2 size={16} color="white" />} onPress={handleResetAnalytics} style={{ flex: 1 }} />
          </View>

          <GlassView className={`flex ${flexDirection} items-center gap-2 p-4 rounded-lg border border-yellow-500/20`} intensity="light">
            <AlertTriangle size={16} color={colors.warning} />
            <Text className={`flex-1 text-xs text-yellow-500 ${textAlign}`}>{t('admin.settings.actionsWarning')}</Text>
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
        <Text className="text-sm text-white mb-6 leading-5">{successMessage}</Text>
        <View className="flex flex-row justify-end gap-2">
          <GlassButton
            title={t('common.ok')}
            onPress={() => setSuccessModalOpen(false)}
            variant="success"
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
        <Text className="text-sm text-white mb-6 leading-5">{errorMessage}</Text>
        <View className="flex flex-row justify-end gap-2">
          <GlassButton
            title={t('common.ok')}
            onPress={() => setErrorModalOpen(false)}
            variant="primary"
          />
        </View>
      </GlassModal>
    </ScrollView>
  );
}

