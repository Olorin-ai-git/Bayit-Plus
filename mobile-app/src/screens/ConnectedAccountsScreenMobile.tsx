/**
 * ConnectedAccountsScreenMobile - Social/OAuth account management
 *
 * Google, Apple, Facebook connect/disconnect with pull-to-refresh and RTL support.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Pressable, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import { GlassView } from '@bayit/shared';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { NativeIcon } from '@olorin/shared-icons/native';
import { useDirection } from '@bayit/shared-hooks';
import { useNotifications } from '@olorin/glass-ui/hooks';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { securityService } from '@bayit/shared-services';
import { Colors } from '../theme/colors';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('ConnectedAccountsScreenMobile');

interface Account { provider: string; email: string; connected: boolean; connectedAt: string | null; }
type Provider = 'google' | 'apple' | 'facebook';

const PROVIDERS: Record<Provider, { icon: string; color: string; label: string }> = {
  google: { icon: 'search', color: '#4285F4', label: 'Google' },
  apple: { icon: 'smartphone', color: '#FFFFFF', label: 'Apple' },
  facebook: { icon: 'users', color: '#1877F2', label: 'Facebook' },
};

export const ConnectedAccountsScreenMobile: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { isRTL, textAlign } = useDirection();
  const notifications = useNotifications();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      await securityService.getSecuritySettings();
      setAccounts((['google', 'apple', 'facebook'] as Provider[]).map((p) => ({
        provider: p, email: '', connected: false, connectedAt: null,
      })));
    } catch (err) {
      moduleLogger.error('Failed to load connected accounts', err);
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); ReactNativeHapticFeedback.trigger('impactLight');
    await load(); setRefreshing(false);
  }, [load]);

  const handleConnect = useCallback(async (provider: string) => {
    ReactNativeHapticFeedback.trigger('impactMedium'); setBusy(provider);
    try {
      await securityService.enableBiometric();
      setAccounts((prev) => prev.map((a) =>
        a.provider === provider ? { ...a, connected: true, connectedAt: new Date().toISOString() } : a));
      ReactNativeHapticFeedback.trigger('notificationSuccess');
      const cfg = PROVIDERS[provider as Provider];
      notifications.showSuccess(t('connectedAccounts.connectedSuccess', { provider: cfg?.label ?? provider }), t('connectedAccounts.title'));
    } catch (err) {
      moduleLogger.error('Failed to connect account', { provider, error: err });
      notifications.showError(t('connectedAccounts.connectFailed'), t('common.error'));
    } finally { setBusy(null); }
  }, [t, notifications]);

  const handleDisconnect = useCallback((provider: string) => {
    const cfg = PROVIDERS[provider as Provider];
    ReactNativeHapticFeedback.trigger('notificationWarning');
    notifications.show({
      level: 'warning', title: t('connectedAccounts.disconnectTitle'),
      message: t('connectedAccounts.disconnectMessage', { provider: cfg?.label ?? provider }),
      dismissable: true,
      action: { label: t('connectedAccounts.disconnect'), type: 'action', onPress: async () => {
        setBusy(provider);
        try {
          await securityService.disableBiometric();
          setAccounts((prev) => prev.map((a) =>
            a.provider === provider ? { ...a, connected: false, email: '', connectedAt: null } : a));
          ReactNativeHapticFeedback.trigger('notificationSuccess');
        } catch (err) {
          moduleLogger.error('Failed to disconnect account', { provider, error: err });
          notifications.showError(t('connectedAccounts.disconnectFailed'), t('common.error'));
        } finally { setBusy(null); }
      }},
    });
  }, [t, notifications]);

  if (isLoading) return (
    <SafeAreaView style={st.safe}>
      <View style={st.center}><GlassLoadingSpinner size="large" /><Text style={st.loadText}>{t('common.loading')}</Text></View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={st.safe}>
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}>
        <View style={[st.header, isRTL && st.rowRev]}>
          <Pressable onPress={() => navigation.goBack()} style={st.back}
            accessibilityLabel={t('common.back')} accessibilityHint={t('common.backHint')} accessibilityRole="button">
            <Text style={st.chevron}>{isRTL ? '\u203A' : '\u2039'}</Text>
          </Pressable>
          <Text style={[st.headerTitle, { textAlign }]}>{t('connectedAccounts.title')}</Text>
        </View>
        <Text style={[st.desc, { textAlign }]}>{t('connectedAccounts.description')}</Text>

        {accounts.map((acct) => {
          const cfg = PROVIDERS[acct.provider as Provider];
          if (!cfg) return null;
          return (
            <GlassView key={acct.provider} style={st.card}>
              <View style={[st.row, isRTL && st.rowRev]}>
                <View style={[st.iconBox, { backgroundColor: `${cfg.color}20` }]}>
                  <NativeIcon name={cfg.icon} size="lg" color={cfg.color} />
                </View>
                <View style={st.flex1}>
                  <Text style={[st.provName, { textAlign }]}>{cfg.label}</Text>
                  {acct.email ? <Text style={[st.provEmail, { textAlign }]}>{acct.email}</Text> : null}
                  <Text style={[st.provStatus, acct.connected && st.connected, { textAlign }]}>
                    {t(acct.connected ? 'connectedAccounts.connected' : 'connectedAccounts.notConnected')}
                  </Text>
                </View>
                <View style={st.actionBox}>
                  {busy === acct.provider ? <GlassLoadingSpinner size="small" /> : (
                    <Pressable onPress={() => acct.connected ? handleDisconnect(acct.provider) : handleConnect(acct.provider)}
                      style={acct.connected ? st.disconnectBtn : st.connectBtn}
                      accessibilityLabel={t(acct.connected ? 'connectedAccounts.disconnectLabel' : 'connectedAccounts.connectLabel', { provider: cfg.label })}
                      accessibilityHint={t(acct.connected ? 'connectedAccounts.disconnectHint' : 'connectedAccounts.connectHint', { provider: cfg.label })}
                      accessibilityRole="button">
                      <Text style={acct.connected ? st.disconnectTxt : st.connectTxt}>
                        {t(acct.connected ? 'connectedAccounts.disconnect' : 'connectedAccounts.connect')}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </GlassView>
          );
        })}

        <GlassView style={st.infoCard}>
          <View style={[st.row, isRTL && st.rowRev]}>
            <NativeIcon name="info" size="md" color={Colors.Info.default} />
            <Text style={[st.infoText, { textAlign }]}>{t('connectedAccounts.privacyNote')}</Text>
          </View>
        </GlassView>
      </ScrollView>
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
  rowRev: { flexDirection: 'row-reverse' },
  back: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  chevron: { fontSize: fontSize['3xl'], color: colors.text, fontWeight: '300' },
  headerTitle: { flex: 1, fontSize: fontSize['2xl'], fontWeight: 'bold', color: colors.text },
  desc: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.xl, lineHeight: fontSize.sm * 1.5 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadText: { color: colors.text, fontSize: fontSize.md, marginTop: spacing.md },
  card: { marginBottom: spacing.md, padding: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex1: { flex: 1 },
  iconBox: { width: 48, height: 48, borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center' },
  provName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  provEmail: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xs },
  provStatus: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xs },
  connected: { color: Colors.Success.default },
  actionBox: { minWidth: 80, alignItems: 'center' },
  connectBtn: { backgroundColor: Colors.Primary.p700, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  connectTxt: { color: colors.text, fontSize: fontSize.xs, fontWeight: '600' },
  disconnectBtn: { borderWidth: 1, borderColor: Colors.Error.default, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  disconnectTxt: { color: Colors.Error.default, fontSize: fontSize.xs, fontWeight: '600' },
  infoCard: { marginTop: spacing.lg, padding: spacing.lg },
  infoText: { flex: 1, fontSize: fontSize.xs, color: colors.textMuted, lineHeight: fontSize.xs * 1.6 },
});

export default ConnectedAccountsScreenMobile;
