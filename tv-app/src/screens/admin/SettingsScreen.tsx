/**
 * SettingsScreen
 * System settings and feature flags management
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { settingsService } from '../../services/adminApi';
import { SystemSettings } from '../../types/rbac';
import { colors, spacing, borderRadius, fontSize } from '../../theme';

export const SettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
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
      console.error('Error loading settings:', error);
      // Mock data
      setSettings({
        default_plan: 'free',
        trial_days: 7,
        max_devices: 4,
        maintenance_mode: false,
        support_email: 'support@bayit.tv',
        terms_url: 'https://bayit.tv/terms',
        privacy_url: 'https://bayit.tv/privacy',
      });
      setFeatureFlags({
        new_player: true,
        dark_mode: true,
        offline_mode: false,
        recommendations: true,
        social_features: false,
        live_chat: true,
        analytics_v2: false,
      });
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
    } catch (error) {
      console.error('Error updating feature flag:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await settingsService.updateSettings(settings);
      setHasChanges(false);
      Alert.alert(t('admin.settings.saved', 'Saved'), t('admin.settings.savedMessage', 'Settings have been saved successfully'));
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert(t('common.error', 'Error'), t('admin.settings.saveError', 'Failed to save settings'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title={t('admin.titles.settings', 'Settings')}>
        <View style={styles.loadingContainer}>
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
          <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSaveSettings} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color={colors.text} /> : <Text style={styles.saveButtonText}>💾 {t('admin.settings.save', 'Save Changes')}</Text>}
          </TouchableOpacity>
        )
      }
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* General Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.settings.general', 'General Settings')}</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t('admin.settings.defaultPlan', 'Default Plan')}</Text>
              <Text style={styles.settingDescription}>{t('admin.settings.defaultPlanDesc', 'Default subscription plan for new users')}</Text>
            </View>
            <View style={styles.planSelector}>
              {['free', 'basic', 'premium'].map((plan) => (
                <TouchableOpacity key={plan} style={[styles.planOption, settings?.default_plan === plan && styles.planOptionActive]} onPress={() => handleSettingChange('default_plan', plan)}>
                  <Text style={[styles.planOptionText, settings?.default_plan === plan && styles.planOptionTextActive]}>{plan}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t('admin.settings.trialDays', 'Trial Days')}</Text>
              <Text style={styles.settingDescription}>{t('admin.settings.trialDaysDesc', 'Number of free trial days')}</Text>
            </View>
            <TextInput style={styles.numberInput} value={settings?.trial_days?.toString() || '0'} onChangeText={(text) => handleSettingChange('trial_days', parseInt(text) || 0)} keyboardType="numeric" />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t('admin.settings.maxDevices', 'Max Devices')}</Text>
              <Text style={styles.settingDescription}>{t('admin.settings.maxDevicesDesc', 'Maximum devices per account')}</Text>
            </View>
            <TextInput style={styles.numberInput} value={settings?.max_devices?.toString() || '1'} onChangeText={(text) => handleSettingChange('max_devices', parseInt(text) || 1)} keyboardType="numeric" />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t('admin.settings.maintenanceMode', 'Maintenance Mode')}</Text>
              <Text style={styles.settingDescription}>{t('admin.settings.maintenanceModeDesc', 'Show maintenance page to users')}</Text>
            </View>
            <Switch value={settings?.maintenance_mode || false} onValueChange={(value) => handleSettingChange('maintenance_mode', value)} trackColor={{ false: colors.backgroundLighter, true: colors.warning + '50' }} thumbColor={settings?.maintenance_mode ? colors.warning : colors.textMuted} />
          </View>
        </View>

        {/* Contact & Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.settings.contactLegal', 'Contact & Legal')}</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t('admin.settings.supportEmail', 'Support Email')}</Text>
            </View>
            <TextInput style={styles.textInput} value={settings?.support_email || ''} onChangeText={(text) => handleSettingChange('support_email', text)} keyboardType="email-address" autoCapitalize="none" />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t('admin.settings.termsUrl', 'Terms of Service URL')}</Text>
            </View>
            <TextInput style={styles.textInput} value={settings?.terms_url || ''} onChangeText={(text) => handleSettingChange('terms_url', text)} autoCapitalize="none" />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t('admin.settings.privacyUrl', 'Privacy Policy URL')}</Text>
            </View>
            <TextInput style={styles.textInput} value={settings?.privacy_url || ''} onChangeText={(text) => handleSettingChange('privacy_url', text)} autoCapitalize="none" />
          </View>
        </View>

        {/* Feature Flags */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('admin.settings.featureFlags', 'Feature Flags')}</Text>
            <Text style={styles.sectionSubtitle}>{t('admin.settings.featureFlagsDesc', 'Enable or disable features in real-time')}</Text>
          </View>

          {Object.entries(featureFlags).map(([flag, enabled]) => (
            <View key={flag} style={styles.featureFlagItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>{formatFlagName(flag)}</Text>
                <Text style={styles.settingDescription}>{flag}</Text>
              </View>
              <Switch value={enabled} onValueChange={(value) => handleFeatureFlagChange(flag, value)} trackColor={{ false: colors.backgroundLighter, true: colors.primary + '50' }} thumbColor={enabled ? colors.primary : colors.textMuted} />
            </View>
          ))}
        </View>

        {/* Danger Zone */}
        <View style={[styles.section, styles.dangerSection]}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>{t('admin.settings.dangerZone', 'Danger Zone')}</Text>

          <View style={styles.dangerItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t('admin.settings.clearCache', 'Clear System Cache')}</Text>
              <Text style={styles.settingDescription}>{t('admin.settings.clearCacheDesc', 'Clear all cached data from the system')}</Text>
            </View>
            <TouchableOpacity style={styles.dangerButton} onPress={() => Alert.alert(t('admin.settings.clearCache', 'Clear Cache'), t('admin.settings.clearCacheConfirm', 'Are you sure?'))}>
              <Text style={styles.dangerButtonText}>{t('admin.settings.clear', 'Clear')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dangerItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t('admin.settings.resetAnalytics', 'Reset Analytics')}</Text>
              <Text style={styles.settingDescription}>{t('admin.settings.resetAnalyticsDesc', 'Reset all analytics data')}</Text>
            </View>
            <TouchableOpacity style={styles.dangerButton} onPress={() => Alert.alert(t('admin.settings.resetAnalytics', 'Reset Analytics'), t('admin.settings.resetAnalyticsConfirm', 'Are you sure?'))}>
              <Text style={styles.dangerButtonText}>{t('admin.settings.reset', 'Reset')}</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: spacing.lg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  saveButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.success, borderRadius: borderRadius.md, flexDirection: 'row', alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  section: { backgroundColor: colors.glass, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.glassBorder, padding: spacing.lg, marginBottom: spacing.lg },
  sectionHeader: { marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: 'bold', color: colors.text, marginBottom: spacing.xs },
  sectionSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary },
  settingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  settingInfo: { flex: 1, marginRight: spacing.md },
  settingLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  settingDescription: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  planSelector: { flexDirection: 'row', backgroundColor: colors.backgroundLighter, borderRadius: borderRadius.md, padding: 2 },
  planOption: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  planOptionActive: { backgroundColor: colors.primary },
  planOptionText: { fontSize: fontSize.sm, color: colors.textSecondary, textTransform: 'capitalize' },
  planOptionTextActive: { color: colors.text, fontWeight: '600' },
  numberInput: { width: 60, backgroundColor: colors.backgroundLighter, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.glassBorder, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, color: colors.text, fontSize: fontSize.md, textAlign: 'center' },
  textInput: { flex: 1, maxWidth: 250, backgroundColor: colors.backgroundLighter, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.glassBorder, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, color: colors.text, fontSize: fontSize.sm },
  featureFlagItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  dangerSection: { borderColor: colors.error },
  dangerTitle: { color: colors.error },
  dangerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md },
  dangerButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.error + '20', borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.error },
  dangerButtonText: { fontSize: fontSize.sm, color: colors.error, fontWeight: '600' },
});

export default SettingsScreen;
