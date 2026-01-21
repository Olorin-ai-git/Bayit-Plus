/**
 * SettingsScreen
 * System settings and feature flags management
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { settingsService } from '../../services/adminApi';
import { SystemSettings } from '../../types/rbac';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
import { useModal } from '../../contexts/ModalContext';

export const SettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { showError, showSuccess, showConfirm } = useModal();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const [settingsData, flagsData] = await Promise.all([
        settingsService.getSettings(),
        settingsService.getFeatureFlags(),
      ]);
      setSettings(settingsData);
      setFeatureFlags(flagsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('admin.settings.loadError', 'Failed to load settings');
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSettingChange = (key: keyof SystemSettings, value: any) => {
    setSettings(prev => prev ? { ...prev, [key]: value } : null);
    setHasChanges(true);
  };

  const handleFeatureFlagChange = async (flag: string, enabled: boolean) => {
    try {
      await settingsService.updateFeatureFlag(flag, enabled);
      setFeatureFlags(prev => ({ ...prev, [flag]: enabled }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('admin.settings.flagError', 'Failed to update feature flag');
      showError(errorMessage);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await settingsService.updateSettings(settings);
      setHasChanges(false);
      showSuccess(t('admin.settings.savedMessage', 'Settings have been saved successfully'), t('admin.settings.saved', 'Saved'));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('admin.settings.saveError', 'Failed to save settings');
      showError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = () => {
    showConfirm(
      t('admin.settings.clearCacheConfirm', 'Are you sure you want to clear the system cache?'),
      async () => {
        try {
          await settingsService.clearCache();
          showSuccess(t('admin.settings.cacheCleared', 'Cache has been cleared successfully.'));
        } catch (err) {
          throw err;
        }
      },
      {
        title: t('admin.settings.clearCache', 'Clear Cache'),
        confirmText: t('admin.settings.clear', 'Clear'),
        destructive: true,
      }
    );
  };

  const handleResetAnalytics = () => {
    showConfirm(
      t('admin.settings.resetAnalyticsConfirm', 'Are you sure you want to reset all analytics data? This action cannot be undone.'),
      async () => {
        try {
          await settingsService.resetAnalytics();
          showSuccess(t('admin.settings.analyticsReset', 'Analytics have been reset successfully.'));
        } catch (err) {
          throw err;
        }
      },
      {
        title: t('admin.settings.resetAnalytics', 'Reset Analytics'),
        confirmText: t('admin.settings.reset', 'Reset'),
        destructive: true,
      }
    );
  };

  if (loading) {
    return (
      <AdminLayout title={t('admin.titles.settings', 'Settings')}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={t('admin.titles.settings', 'Settings')}
      actions={
        hasChanges && (
          <TouchableOpacity className={`px-4 py-2 bg-green-600 rounded-md flex-row items-center ${saving ? 'opacity-60' : ''}`} onPress={handleSaveSettings} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color={colors.text} /> : <Text className="text-sm text-white font-semibold">💾 {t('admin.settings.save', 'Save Changes')}</Text>}
          </TouchableOpacity>
        )
      }
    >
      <ScrollView className="flex-1" contentContainerClassName="p-6">
        {/* General Settings */}
        <View className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/10 p-6 mb-6">
          <Text className="text-lg font-bold text-white mb-1">{t('admin.settings.general', 'General Settings')}</Text>

          <View className="flex-row items-center justify-between py-4 border-b border-white/10">
            <View className="flex-1 mr-4">
              <Text className="text-sm font-semibold text-white">{t('admin.settings.defaultPlan', 'Default Plan')}</Text>
              <Text className="text-xs text-gray-400 mt-0.5">{t('admin.settings.defaultPlanDesc', 'Default subscription plan for new users')}</Text>
            </View>
            <View className="flex-row bg-gray-800 rounded-md p-0.5">
              {['free', 'basic', 'premium'].map((plan) => (
                <TouchableOpacity
                  key={plan}
                  className={`px-2 py-1 rounded-sm ${settings?.default_plan === plan ? 'bg-purple-600' : ''}`}
                  onPress={() => handleSettingChange('default_plan', plan)}
                >
                  <Text className={`text-sm capitalize ${settings?.default_plan === plan ? 'text-white font-semibold' : 'text-gray-400'}`}>{plan}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="flex-row items-center justify-between py-4 border-b border-white/10">
            <View className="flex-1 mr-4">
              <Text className="text-sm font-semibold text-white">{t('admin.settings.trialDays', 'Trial Days')}</Text>
              <Text className="text-xs text-gray-400 mt-0.5">{t('admin.settings.trialDaysDesc', 'Number of free trial days')}</Text>
            </View>
            <TextInput
              className="w-[60px] bg-gray-800 rounded-md border border-white/10 px-2 py-1 text-white text-base text-center"
              value={settings?.trial_days?.toString() || '0'}
              onChangeText={(text) => handleSettingChange('trial_days', parseInt(text) || 0)}
              keyboardType="numeric"
            />
          </View>

          <View className="flex-row items-center justify-between py-4 border-b border-white/10">
            <View className="flex-1 mr-4">
              <Text className="text-sm font-semibold text-white">{t('admin.settings.maxDevices', 'Max Devices')}</Text>
              <Text className="text-xs text-gray-400 mt-0.5">{t('admin.settings.maxDevicesDesc', 'Maximum devices per account')}</Text>
            </View>
            <TextInput
              className="w-[60px] bg-gray-800 rounded-md border border-white/10 px-2 py-1 text-white text-base text-center"
              value={settings?.max_devices?.toString() || '1'}
              onChangeText={(text) => handleSettingChange('max_devices', parseInt(text) || 1)}
              keyboardType="numeric"
            />
          </View>

          <View className="flex-row items-center justify-between py-4 border-b border-white/10">
            <View className="flex-1 mr-4">
              <Text className="text-sm font-semibold text-white">{t('admin.settings.maintenanceMode', 'Maintenance Mode')}</Text>
              <Text className="text-xs text-gray-400 mt-0.5">{t('admin.settings.maintenanceModeDesc', 'Show maintenance page to users')}</Text>
            </View>
            <Switch
              value={settings?.maintenance_mode || false}
              onValueChange={(value) => handleSettingChange('maintenance_mode', value)}
              trackColor={{ false: colors.backgroundLighter, true: colors.warning + '50' }}
              thumbColor={settings?.maintenance_mode ? colors.warning : colors.textMuted}
            />
          </View>
        </View>

        {/* Contact & Legal */}
        <View className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/10 p-6 mb-6">
          <Text className="text-lg font-bold text-white mb-1">{t('admin.settings.contactLegal', 'Contact & Legal')}</Text>

          <View className="flex-row items-center justify-between py-4 border-b border-white/10">
            <View className="flex-1 mr-4">
              <Text className="text-sm font-semibold text-white">{t('admin.settings.supportEmail', 'Support Email')}</Text>
            </View>
            <TextInput
              className="flex-1 max-w-[250px] bg-gray-800 rounded-md border border-white/10 px-2 py-1 text-white text-sm"
              value={settings?.support_email || ''}
              onChangeText={(text) => handleSettingChange('support_email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View className="flex-row items-center justify-between py-4 border-b border-white/10">
            <View className="flex-1 mr-4">
              <Text className="text-sm font-semibold text-white">{t('admin.settings.termsUrl', 'Terms of Service URL')}</Text>
            </View>
            <TextInput
              className="flex-1 max-w-[250px] bg-gray-800 rounded-md border border-white/10 px-2 py-1 text-white text-sm"
              value={settings?.terms_url || ''}
              onChangeText={(text) => handleSettingChange('terms_url', text)}
              autoCapitalize="none"
            />
          </View>

          <View className="flex-row items-center justify-between py-4 border-b border-white/10">
            <View className="flex-1 mr-4">
              <Text className="text-sm font-semibold text-white">{t('admin.settings.privacyUrl', 'Privacy Policy URL')}</Text>
            </View>
            <TextInput
              className="flex-1 max-w-[250px] bg-gray-800 rounded-md border border-white/10 px-2 py-1 text-white text-sm"
              value={settings?.privacy_url || ''}
              onChangeText={(text) => handleSettingChange('privacy_url', text)}
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Feature Flags */}
        <View className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/10 p-6 mb-6">
          <View className="mb-4">
            <Text className="text-lg font-bold text-white mb-1">{t('admin.settings.featureFlags', 'Feature Flags')}</Text>
            <Text className="text-sm text-gray-400">{t('admin.settings.featureFlagsDesc', 'Enable or disable features in real-time')}</Text>
          </View>

          {Object.entries(featureFlags).map(([flag, enabled]) => (
            <View key={flag} className="flex-row items-center justify-between py-2 border-b border-white/10">
              <View className="flex-1 mr-4">
                <Text className="text-sm font-semibold text-white">{formatFlagName(flag)}</Text>
                <Text className="text-xs text-gray-400 mt-0.5">{flag}</Text>
              </View>
              <Switch
                value={enabled}
                onValueChange={(value) => handleFeatureFlagChange(flag, value)}
                trackColor={{ false: colors.backgroundLighter, true: colors.primary + '50' }}
                thumbColor={enabled ? colors.primary : colors.textMuted}
              />
            </View>
          ))}
        </View>

        {/* Danger Zone */}
        <View className="bg-white/10 backdrop-blur-xl rounded-lg border border-red-600 p-6 mb-6">
          <Text className="text-lg font-bold text-red-600 mb-1">{t('admin.settings.dangerZone', 'Danger Zone')}</Text>

          <View className="flex-row items-center justify-between py-4">
            <View className="flex-1 mr-4">
              <Text className="text-sm font-semibold text-white">{t('admin.settings.clearCache', 'Clear System Cache')}</Text>
              <Text className="text-xs text-gray-400 mt-0.5">{t('admin.settings.clearCacheDesc', 'Clear all cached data from the system')}</Text>
            </View>
            <TouchableOpacity className="px-4 py-2 bg-red-600/20 rounded-md border border-red-600" onPress={handleClearCache}>
              <Text className="text-sm text-red-600 font-semibold">{t('admin.settings.clear', 'Clear')}</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center justify-between py-4">
            <View className="flex-1 mr-4">
              <Text className="text-sm font-semibold text-white">{t('admin.settings.resetAnalytics', 'Reset Analytics')}</Text>
              <Text className="text-xs text-gray-400 mt-0.5">{t('admin.settings.resetAnalyticsDesc', 'Reset all analytics data')}</Text>
            </View>
            <TouchableOpacity className="px-4 py-2 bg-red-600/20 rounded-md border border-red-600" onPress={handleResetAnalytics}>
              <Text className="text-sm text-red-600 font-semibold">{t('admin.settings.reset', 'Reset')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </AdminLayout>
  );
};

const formatFlagName = (flag: string): string => {
  return flag.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export default SettingsScreen;
