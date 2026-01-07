import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Switch, ActivityIndicator, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Save, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import { settingsService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassButton } from '@bayit/shared/ui';
import logger from '@/utils/logger';

interface SystemSettings {
  site_name: string;
  support_email: string;
  default_language: string;
  maintenance_mode: boolean;
  allow_registration: boolean;
  require_email_verification: boolean;
  max_profiles_per_account: number;
  trial_period_days: number;
  currency: string;
}

interface FeatureFlags {
  [key: string]: boolean;
}

const featureFlagLabels: Record<string, string> = {
  new_player: 'נגן חדש',
  live_chat: 'צ׳אט חי',
  downloads: 'הורדות',
  watch_party: 'צפייה משותפת',
  voice_search: 'חיפוש קולי',
  ai_recommendations: 'המלצות AI',
};

export default function SettingsPage() {
  const { t } = useTranslation();
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
      alert('ההגדרות נשמרו בהצלחה');
    } catch (error) {
      logger.error('Failed to save settings', 'SettingsPage', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = async () => {
    if (!window.confirm('לנקות את הקאש? זה עשוי להשפיע על הביצועים באופן זמני.')) return;
    try {
      await settingsService.clearCache();
      alert('הקאש נוקה בהצלחה');
    } catch (error) {
      logger.error('Failed to clear cache', 'SettingsPage', error);
    }
  };

  const handleResetAnalytics = async () => {
    if (!window.confirm('לאפס את נתוני האנליטיקס? פעולה זו אינה הפיכה!')) return;
    try {
      await settingsService.resetAnalytics();
      alert('נתוני האנליטיקס אופסו');
    } catch (error) {
      logger.error('Failed to reset analytics', 'SettingsPage', error);
    }
  };

  if (loading || !settings) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading', 'טוען...')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>{t('admin.titles.settings', 'הגדרות מערכת')}</Text>
          <Text style={styles.subtitle}>הגדר את פרמטרי המערכת</Text>
        </View>
        <GlassButton title="שמור שינויים" variant="primary" icon={<Save size={16} color={colors.text} />} onPress={handleSave} disabled={!hasChanges || saving} />
      </View>

      <View style={styles.sectionsContainer}>
        <GlassCard style={styles.section}>
          <Text style={styles.sectionTitle}>הגדרות כלליות</Text>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>שם האתר</Text>
            <TextInput style={styles.input} value={settings.site_name} onChangeText={(v) => handleSettingChange('site_name', v)} />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>אימייל תמיכה</Text>
            <TextInput style={styles.input} value={settings.support_email} onChangeText={(v) => handleSettingChange('support_email', v)} keyboardType="email-address" />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>שפת ברירת מחדל</Text>
            <View style={styles.languageButtons}>
              {['he', 'en'].map((lang) => (
                <Pressable key={lang} style={[styles.languageButton, settings.default_language === lang && styles.languageButtonActive]} onPress={() => handleSettingChange('default_language', lang)}>
                  <Text style={[styles.languageButtonText, settings.default_language === lang && styles.languageButtonTextActive]}>
                    {lang === 'he' ? 'עברית' : 'English'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>מטבע</Text>
            <TextInput style={styles.input} value={settings.currency} onChangeText={(v) => handleSettingChange('currency', v)} />
          </View>
        </GlassCard>

        <GlassCard style={styles.section}>
          <Text style={styles.sectionTitle}>הגדרות משתמשים</Text>

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>אפשר הרשמה</Text>
              <Text style={styles.switchDescription}>משתמשים חדשים יכולים להירשם</Text>
            </View>
            <Switch value={settings.allow_registration} onValueChange={(v) => handleSettingChange('allow_registration', v)} trackColor={{ false: colors.backgroundLighter, true: colors.primary }} />
          </View>

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>אימות אימייל</Text>
              <Text style={styles.switchDescription}>דרוש אימות אימייל בהרשמה</Text>
            </View>
            <Switch value={settings.require_email_verification} onValueChange={(v) => handleSettingChange('require_email_verification', v)} trackColor={{ false: colors.backgroundLighter, true: colors.primary }} />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>מקסימום פרופילים לחשבון</Text>
            <TextInput style={styles.input} value={settings.max_profiles_per_account.toString()} onChangeText={(v) => handleSettingChange('max_profiles_per_account', parseInt(v) || 1)} keyboardType="number-pad" />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>ימי תקופת נסיון</Text>
            <TextInput style={styles.input} value={settings.trial_period_days.toString()} onChangeText={(v) => handleSettingChange('trial_period_days', parseInt(v) || 0)} keyboardType="number-pad" />
          </View>
        </GlassCard>

        <GlassCard style={styles.section}>
          <Text style={styles.sectionTitle}>מצב תחזוקה</Text>

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>מצב תחזוקה</Text>
              <Text style={styles.switchDescription}>כאשר פעיל, המערכת תהיה לא נגישה למשתמשים</Text>
            </View>
            <Switch value={settings.maintenance_mode} onValueChange={(v) => handleSettingChange('maintenance_mode', v)} trackColor={{ false: colors.backgroundLighter, true: colors.warning }} />
          </View>
        </GlassCard>

        <GlassCard style={styles.section}>
          <Text style={styles.sectionTitle}>Feature Flags</Text>

          {Object.entries(featureFlags).map(([flag, enabled]) => (
            <View key={flag} style={styles.switchRow}>
              <Text style={styles.switchLabel}>{featureFlagLabels[flag] || flag}</Text>
              <Switch value={enabled} onValueChange={(v) => handleFeatureFlagChange(flag, v)} trackColor={{ false: colors.backgroundLighter, true: colors.primary }} />
            </View>
          ))}
        </GlassCard>

        <GlassCard style={[styles.section, styles.dangerSection]}>
          <Text style={styles.sectionTitle}>פעולות מערכת</Text>

          <View style={styles.dangerActions}>
            <GlassButton title="נקה קאש" variant="secondary" icon={<RefreshCw size={16} color={colors.warning} />} onPress={handleClearCache} />
            <GlassButton title="אפס אנליטיקס" variant="secondary" icon={<Trash2 size={16} color={colors.error} />} onPress={handleResetAnalytics} />
          </View>

          <View style={styles.warningBox}>
            <AlertTriangle size={16} color={colors.warning} />
            <Text style={styles.warningText}>פעולות אלו עשויות להשפיע על תפקוד המערכת. השתמש בזהירות.</Text>
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
  languageButtons: { flexDirection: 'row', gap: spacing.sm },
  languageButton: { flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.backgroundLighter, alignItems: 'center' },
  languageButtonActive: { backgroundColor: colors.primary },
  languageButtonText: { fontSize: 14, color: colors.textMuted },
  languageButtonTextActive: { color: colors.text, fontWeight: '500' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  switchLabel: { fontSize: 14, fontWeight: '500', color: colors.text },
  switchDescription: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  dangerSection: { borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  dangerActions: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  warningBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: borderRadius.md },
  warningText: { flex: 1, fontSize: 12, color: colors.warning },
});
