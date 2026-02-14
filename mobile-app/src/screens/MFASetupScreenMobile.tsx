/**
 * MFASetupScreenMobile - Multi-factor authentication setup
 *
 * Steps: Choose method (TOTP/SMS) -> Configure -> Verify code -> Backup codes
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
import { GlassButton, GlassView } from '@bayit/shared';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { GlassInput } from '@olorin/glass-ui/native';
import { NativeIcon } from '@olorin/shared-icons/native';
import { useDirection } from '@bayit/shared-hooks';
import { useNotifications } from '@olorin/glass-ui/hooks';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Clipboard from '@react-native-clipboard/clipboard';
import { useMFA } from '../hooks/useMFA';
import { Colors } from '../theme/colors';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('MFASetupScreenMobile');

export const MFASetupScreenMobile: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { isRTL, textAlign } = useDirection();
  const notifications = useNotifications();
  const mfa = useMFA();
  const [codeInput, setCodeInput] = React.useState('');

  const handleSelectTOTP = useCallback(() => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    mfa.selectMethod('totp');
    mfa.initiateSetup();
  }, [mfa]);

  const handleSelectSMS = useCallback(() => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    mfa.selectMethod('sms');
    navigation.navigate('PhoneVerification', { purpose: 'mfa' });
  }, [mfa, navigation]);

  const handleVerify = useCallback(async () => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    const success = await mfa.verifyCode(codeInput);
    if (success) {
      ReactNativeHapticFeedback.trigger('notificationSuccess');
      notifications.showSuccess(t('mfa.verifiedSuccess'), t('mfa.setupComplete'));
    }
  }, [mfa, codeInput, t, notifications]);

  const handleCopyBackupCodes = useCallback(() => {
    if (mfa.setupData?.backupCodes) {
      Clipboard.setString(mfa.setupData.backupCodes.join('\n'));
      ReactNativeHapticFeedback.trigger('notificationSuccess');
      notifications.showSuccess(t('mfa.codesCopied'), t('mfa.backupCodes'));
    }
  }, [mfa.setupData, t, notifications]);

  const handleCopySecret = useCallback(() => {
    if (mfa.setupData?.secret) {
      Clipboard.setString(mfa.setupData.secret);
      ReactNativeHapticFeedback.trigger('notificationSuccess');
      notifications.showSuccess(t('mfa.secretCopied'), t('mfa.manualEntry'));
    }
  }, [mfa.setupData, t, notifications]);

  const renderMethodCard = (method: 'totp' | 'sms', icon: string, titleKey: string, descKey: string, onPress: () => void) => (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && s.pressed]}
      accessibilityLabel={t(titleKey)} accessibilityHint={t(descKey)} accessibilityRole="button">
      <GlassView style={s.methodCard}>
        <View style={[s.row, isRTL && s.rowReverse]}>
          <NativeIcon name={icon} size="xl" color={Colors.Primary.p500} />
          <View style={s.flex1}>
            <Text style={[s.methodTitle, { textAlign }]}>{t(titleKey)}</Text>
            <Text style={[s.subtitle, { textAlign }]}>{t(descKey)}</Text>
          </View>
        </View>
      </GlassView>
    </Pressable>
  );

  const renderStep = () => {
    if (mfa.step === 'select_method') return (
      <View style={s.body}>
        <Text style={[s.title, { textAlign }]}>{t('mfa.chooseMethod')}</Text>
        <Text style={[s.desc, { textAlign }]}>{t('mfa.chooseMethodDesc')}</Text>
        {renderMethodCard('totp', 'shield', 'mfa.authenticatorApp', 'mfa.authenticatorAppDesc', handleSelectTOTP)}
        {renderMethodCard('sms', 'smartphone', 'mfa.smsVerification', 'mfa.smsVerificationDesc', handleSelectSMS)}
      </View>
    );
    if (mfa.step === 'configure') return (
      <View style={s.body}>
        <Text style={[s.title, { textAlign }]}>{t('mfa.scanQRCode')}</Text>
        <Text style={[s.desc, { textAlign }]}>{t('mfa.scanQRCodeDesc')}</Text>
        {mfa.setupData?.qrCodeUri ? (
          <GlassView style={s.qrBox}><Text style={s.qrLabel}>{t('mfa.qrCodeLabel')}</Text></GlassView>
        ) : null}
        <Pressable onPress={handleCopySecret} accessibilityLabel={t('mfa.copySecret')}
          accessibilityHint={t('mfa.copySecretHint')} accessibilityRole="button">
          <GlassView style={s.secretBox}>
            <Text style={[s.subtitle, { textAlign }]}>{t('mfa.manualEntry')}</Text>
            <Text style={s.secretVal}>{mfa.setupData?.secret}</Text>
          </GlassView>
        </Pressable>
        <GlassButton title={t('mfa.continue')} onPress={() => mfa.goToStep('verify')} variant="primary" style={s.btn} />
      </View>
    );
    if (mfa.step === 'verify') return (
      <View style={s.body}>
        <Text style={[s.title, { textAlign }]}>{t('mfa.enterCode')}</Text>
        <Text style={[s.desc, { textAlign }]}>{t('mfa.enterCodeDesc')}</Text>
        <GlassInput value={codeInput} onChangeText={setCodeInput} placeholder={t('mfa.codePlaceholder')}
          keyboardType="number-pad" maxLength={6} autoFocus
          accessibilityLabel={t('mfa.verificationCode')} accessibilityHint={t('mfa.verificationCodeHint')} />
        {mfa.error ? <Text style={s.error}>{t(mfa.error)}</Text> : null}
        <Text style={s.attempts}>{t('mfa.attemptsRemaining', { count: 5 - mfa.verificationAttempts })}</Text>
        <GlassButton title={t('mfa.verify')} onPress={handleVerify} variant="primary"
          disabled={codeInput.length < 6 || mfa.isLoading} style={s.btn} />
      </View>
    );
    return (
      <View style={s.body}>
        <Text style={[s.title, { textAlign }]}>{t('mfa.backupCodes')}</Text>
        <Text style={[s.desc, { textAlign }]}>{t('mfa.backupCodesDesc')}</Text>
        <GlassView style={s.codesBox}>
          {mfa.setupData?.backupCodes.map((code, i) => (
            <Text key={`bc-${i}`} style={s.code}>{code}</Text>
          ))}
        </GlassView>
        <GlassButton title={t('mfa.copyAllCodes')} onPress={handleCopyBackupCodes} variant="secondary" style={s.btn} />
        <GlassButton title={t('mfa.done')} onPress={() => { mfa.reset(); navigation.goBack(); }} variant="primary" style={s.btn} />
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={[s.header, isRTL && s.rowReverse]}>
          <Pressable onPress={() => navigation.goBack()} style={s.back}
            accessibilityLabel={t('common.back')} accessibilityHint={t('common.backHint')} accessibilityRole="button">
            <Text style={s.chevron}>{isRTL ? '\u203A' : '\u2039'}</Text>
          </Pressable>
          <Text style={[s.headerTitle, { textAlign }]}>{t('mfa.title')}</Text>
        </View>
        {mfa.isLoading && mfa.step !== 'verify' ? (
          <View style={s.loading}><GlassLoadingSpinner size="large" /></View>
        ) : renderStep()}
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
  rowReverse: { flexDirection: 'row-reverse' },
  back: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  chevron: { fontSize: fontSize['3xl'], color: colors.text, fontWeight: '300' },
  headerTitle: { flex: 1, fontSize: fontSize['2xl'], fontWeight: 'bold', color: colors.text },
  body: { marginTop: spacing.lg },
  title: { fontSize: fontSize.xl, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  desc: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.lg, lineHeight: fontSize.sm * 1.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex1: { flex: 1 },
  methodCard: { marginBottom: spacing.md, padding: spacing.lg },
  methodTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  subtitle: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs },
  pressed: { opacity: 0.7 },
  qrBox: { alignItems: 'center', padding: spacing.xl, marginBottom: spacing.lg },
  qrLabel: { fontSize: fontSize.lg, color: colors.text },
  secretBox: { padding: spacing.lg, marginBottom: spacing.lg },
  secretVal: { fontSize: fontSize.md, color: colors.text, fontFamily: 'Courier', textAlign: 'center', letterSpacing: 2, marginTop: spacing.sm },
  error: { color: colors.error, fontSize: fontSize.sm, marginTop: spacing.sm, textAlign: 'center' },
  attempts: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: spacing.sm, textAlign: 'center' },
  btn: { marginTop: spacing.lg },
  codesBox: { padding: spacing.lg, marginBottom: spacing.lg },
  code: { fontSize: fontSize.md, color: colors.text, fontFamily: 'Courier', textAlign: 'center', paddingVertical: spacing.xs, letterSpacing: 2 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: spacing.xxxl },
});

export default MFASetupScreenMobile;
