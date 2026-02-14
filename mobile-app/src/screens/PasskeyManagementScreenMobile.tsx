/**
 * PasskeyManagementScreenMobile - Manage registered passkeys
 *
 * List, add, and remove passkeys with native platform integration.
 */

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Pressable, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import { GlassButton, GlassView } from '@bayit/shared';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { GlassInput } from '@olorin/glass-ui/native';
import { NativeIcon } from '@olorin/shared-icons/native';
import { useDirection } from '@bayit/shared-hooks';
import { useNotifications } from '@olorin/glass-ui/hooks';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { usePasskeyNative } from '../hooks/usePasskeyNative';
import { Colors } from '../theme/colors';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('PasskeyManagementScreenMobile');

export const PasskeyManagementScreenMobile: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { isRTL, textAlign } = useDirection();
  const notifications = useNotifications();
  const pk = usePasskeyNative();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); ReactNativeHapticFeedback.trigger('impactLight');
    await pk.loadPasskeys(); setRefreshing(false);
  }, [pk]);

  const handleAdd = useCallback(async () => {
    if (!name.trim()) return;
    ReactNativeHapticFeedback.trigger('impactMedium');
    const ok = await pk.registerPasskey(name.trim());
    if (ok) {
      ReactNativeHapticFeedback.trigger('notificationSuccess');
      notifications.showSuccess(t('passkey.addedSuccess'), t('passkey.title'));
      setShowAdd(false); setName('');
    } else if (pk.error) {
      notifications.showError(t(pk.error), t('common.error'));
    }
  }, [name, pk, t, notifications]);

  const handleRemove = useCallback((id: string, deviceName: string) => {
    ReactNativeHapticFeedback.trigger('notificationWarning');
    notifications.show({
      level: 'warning', title: t('passkey.removeTitle'),
      message: t('passkey.removeMessage', { name: deviceName }), dismissable: true,
      action: { label: t('passkey.remove'), type: 'action', onPress: async () => {
        if (await pk.removePasskey(id)) {
          ReactNativeHapticFeedback.trigger('notificationSuccess');
          notifications.showSuccess(t('passkey.removedSuccess'), t('passkey.title'));
        }
      }},
    });
  }, [pk, t, notifications]);

  const header = (
    <View style={[st.header, isRTL && st.rowRev]}>
      <Pressable onPress={() => navigation.goBack()} style={st.back}
        accessibilityLabel={t('common.back')} accessibilityHint={t('common.backHint')} accessibilityRole="button">
        <Text style={st.chevron}>{isRTL ? '\u203A' : '\u2039'}</Text>
      </Pressable>
      <Text style={[st.headerTitle, { textAlign }]}>{t('passkey.title')}</Text>
    </View>
  );

  if (!pk.isSupported) return (
    <SafeAreaView style={st.safe}>
      {header}
      <View style={st.center}>
        <NativeIcon name="shield" size="xxl" color={Colors.Primary.p500} />
        <Text style={st.unsupTitle}>{t('passkey.notSupported')}</Text>
        <Text style={st.unsupDesc}>{t('passkey.notSupportedDesc')}</Text>
      </View>
    </SafeAreaView>
  );

  if (pk.isLoading && pk.passkeys.length === 0) return (
    <SafeAreaView style={st.safe}>
      <View style={st.center}><GlassLoadingSpinner size="large" /><Text style={st.loadText}>{t('common.loading')}</Text></View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={st.safe}>
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}>
        {header}
        <Text style={[st.desc, { textAlign }]}>{t('passkey.description')}</Text>

        {pk.passkeys.length === 0 ? (
          <GlassView style={st.empty}>
            <NativeIcon name="key" size="xxl" color={Colors.Primary.p500} style={st.emptyIcon} />
            <Text style={st.emptyTitle}>{t('passkey.noPasskeys')}</Text>
            <Text style={st.emptyDesc}>{t('passkey.noPasskeysDesc')}</Text>
          </GlassView>
        ) : pk.passkeys.map((p) => (
          <GlassView key={p.id} style={st.card}>
            <View style={[st.row, isRTL && st.rowRev]}>
              <View style={st.iconBox}>
                <NativeIcon name="smartphone" size="lg" color={Colors.Primary.p500} />
              </View>
              <View style={st.flex1}>
                <Text style={[st.pkName, { textAlign }]}>{p.deviceName}</Text>
                <Text style={[st.pkDate, { textAlign }]}>{t('passkey.created')}: {p.createdAt}</Text>
                <Text style={[st.pkDate, { textAlign }]}>{t('passkey.lastUsed')}: {p.lastUsed}</Text>
              </View>
              <Pressable onPress={() => handleRemove(p.id, p.deviceName)} style={st.removeBtn}
                accessibilityLabel={t('passkey.removeLabel', { name: p.deviceName })}
                accessibilityHint={t('passkey.removeHint')} accessibilityRole="button">
                <NativeIcon name="x" size="md" color={Colors.Error.default} />
              </Pressable>
            </View>
          </GlassView>
        ))}

        {showAdd ? (
          <GlassView style={st.addForm}>
            <Text style={[st.addTitle, { textAlign }]}>{t('passkey.addNew')}</Text>
            <GlassInput value={name} onChangeText={setName} placeholder={t('passkey.namePlaceholder')} autoFocus
              accessibilityLabel={t('passkey.nameInput')} accessibilityHint={t('passkey.nameInputHint')} />
            <View style={st.addBtns}>
              <GlassButton title={t('common.cancel')} onPress={() => { setShowAdd(false); setName(''); }} variant="secondary" style={st.flex1} />
              <GlassButton title={t('passkey.register')} onPress={handleAdd} variant="primary" disabled={!name.trim() || pk.isRegistering} style={st.flex1} />
            </View>
          </GlassView>
        ) : (
          <GlassButton title={t('passkey.addPasskey')} onPress={() => { ReactNativeHapticFeedback.trigger('impactLight'); setShowAdd(true); }}
            variant="primary" style={st.addBtn} />
        )}
        {pk.error ? <Text style={st.error}>{t(pk.error)}</Text> : null}
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
  desc: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.lg, lineHeight: fontSize.sm * 1.5 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl },
  unsupTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginTop: spacing.lg, textAlign: 'center' },
  unsupDesc: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.sm, textAlign: 'center', lineHeight: fontSize.sm * 1.5 },
  loadText: { color: colors.text, fontSize: fontSize.md, marginTop: spacing.md },
  empty: { alignItems: 'center', padding: spacing.xxl },
  emptyIcon: { marginBottom: spacing.lg },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  emptyDesc: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },
  card: { marginBottom: spacing.md, padding: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex1: { flex: 1 },
  iconBox: { width: 44, height: 44, borderRadius: borderRadius.full, backgroundColor: Colors.Glass.whiteLight, justifyContent: 'center', alignItems: 'center' },
  pkName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  pkDate: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xs },
  removeBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  addForm: { padding: spacing.lg, marginTop: spacing.md },
  addTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  addBtns: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  addBtn: { marginTop: spacing.lg },
  error: { color: colors.error, fontSize: fontSize.sm, marginTop: spacing.md, textAlign: 'center' },
});

export default PasskeyManagementScreenMobile;
