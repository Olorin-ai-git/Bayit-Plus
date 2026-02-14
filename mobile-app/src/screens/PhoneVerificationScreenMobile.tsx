/**
 * PhoneVerificationScreenMobile - Phone number verification with OTP
 *
 * Enter phone number -> Receive code -> Enter code with resend timer and max attempts
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
import { GlassButton, GlassView } from '@bayit/shared';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { GlassInput } from '@olorin/glass-ui/native';
import { NativeIcon } from '@olorin/shared-icons/native';
import { useDirection } from '@bayit/shared-hooks';
import { useNotifications } from '@olorin/glass-ui/hooks';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { securityService } from '@bayit/shared-services';
import { Colors } from '../theme/colors';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('PhoneVerificationScreenMobile');
const RESEND_INTERVAL_S = 60;
const MAX_RESEND = 3;
const CODE_LEN = 6;
const MAX_VERIFY = 5;

export const PhoneVerificationScreenMobile: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { isRTL, textAlign } = useDirection();
  const notifications = useNotifications();

  const [phase, setPhase] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [verifyCount, setVerifyCount] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const startTimer = useCallback(() => {
    setTimer(RESEND_INTERVAL_S);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((p) => { if (p <= 1) { clearInterval(timerRef.current!); return 0; } return p - 1; });
    }, 1000);
  }, []);

  const handleSendCode = useCallback(async () => {
    if (!phone.trim()) { setError('phoneVerification.enterPhone'); return; }
    setIsLoading(true); setError(null);
    ReactNativeHapticFeedback.trigger('impactMedium');
    try {
      await securityService.enableTwoFactor();
      setPhase('code'); startTimer(); setResendCount((p) => p + 1);
      moduleLogger.info('Verification code sent', { phone: phone.slice(-4) });
    } catch (err) {
      moduleLogger.error('Failed to send verification code', err);
      setError('phoneVerification.sendFailed');
    } finally { setIsLoading(false); }
  }, [phone, startTimer]);

  const handleResend = useCallback(async () => {
    if (resendCount >= MAX_RESEND) { setError('phoneVerification.maxResendReached'); return; }
    setIsLoading(true); setError(null);
    ReactNativeHapticFeedback.trigger('impactLight');
    try {
      await securityService.enableTwoFactor();
      startTimer(); setResendCount((p) => p + 1);
      notifications.showSuccess(t('phoneVerification.codeSent'), t('phoneVerification.resent'));
    } catch (err) {
      moduleLogger.error('Failed to resend verification code', err);
      setError('phoneVerification.resendFailed');
    } finally { setIsLoading(false); }
  }, [resendCount, startTimer, t, notifications]);

  const handleVerify = useCallback(async () => {
    if (verifyCount >= MAX_VERIFY) { setError('phoneVerification.maxAttemptsReached'); return; }
    setIsLoading(true); setError(null);
    ReactNativeHapticFeedback.trigger('impactMedium');
    try {
      const ok = await securityService.verifyTwoFactor(code);
      if (ok) {
        ReactNativeHapticFeedback.trigger('notificationSuccess');
        notifications.showSuccess(t('phoneVerification.verified'), t('phoneVerification.success'));
        navigation.goBack();
      } else {
        setVerifyCount((p) => p + 1); setError('phoneVerification.invalidCode');
        ReactNativeHapticFeedback.trigger('notificationError');
      }
    } catch (err) {
      moduleLogger.error('Verification failed', err);
      setVerifyCount((p) => p + 1); setError('phoneVerification.verifyFailed');
    } finally { setIsLoading(false); }
  }, [code, verifyCount, t, notifications, navigation]);

  const fmtTimer = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <SafeAreaView style={st.safe}>
      <View style={[st.header, isRTL && st.rowRev]}>
        <Pressable onPress={() => navigation.goBack()} style={st.back}
          accessibilityLabel={t('common.back')} accessibilityHint={t('common.backHint')} accessibilityRole="button">
          <Text style={st.chevron}>{isRTL ? '\u203A' : '\u2039'}</Text>
        </Pressable>
        <Text style={[st.headerTitle, { textAlign }]}>{t('phoneVerification.title')}</Text>
      </View>

      <View style={st.form}>
        <NativeIcon name={phase === 'phone' ? 'smartphone' : 'key'} size="xxl" color={Colors.Primary.p500} style={st.icon} />
        <Text style={[st.title, { textAlign }]}>
          {t(phase === 'phone' ? 'phoneVerification.enterPhoneTitle' : 'phoneVerification.enterCodeTitle')}
        </Text>
        <Text style={[st.desc, { textAlign }]}>
          {phase === 'phone' ? t('phoneVerification.enterPhoneDesc') : t('phoneVerification.enterCodeDesc', { phone })}
        </Text>

        {phase === 'phone' ? (
          <GlassInput value={phone} onChangeText={setPhone} placeholder={t('phoneVerification.phonePlaceholder')}
            keyboardType="phone-pad" autoFocus
            accessibilityLabel={t('phoneVerification.phoneInput')} accessibilityHint={t('phoneVerification.phoneInputHint')} />
        ) : (
          <GlassInput value={code} onChangeText={setCode} placeholder={t('phoneVerification.codePlaceholder')}
            keyboardType="number-pad" maxLength={CODE_LEN} autoFocus
            accessibilityLabel={t('phoneVerification.codeInput')} accessibilityHint={t('phoneVerification.codeInputHint')} />
        )}

        {error ? <Text style={st.error}>{t(error)}</Text> : null}

        {phase === 'code' ? (
          <Text style={st.attempts}>
            {t('phoneVerification.attemptsRemaining', { count: MAX_VERIFY - verifyCount })}
          </Text>
        ) : null}

        <GlassButton
          title={t(phase === 'phone' ? 'phoneVerification.sendCode' : 'phoneVerification.verify')}
          onPress={phase === 'phone' ? handleSendCode : handleVerify}
          variant="primary"
          disabled={(phase === 'phone' ? !phone.trim() : code.length < CODE_LEN) || isLoading}
          style={st.btn}
        />

        {phase === 'code' ? (
          <View style={st.resendBox}>
            {timer > 0 ? (
              <Text style={st.timerText}>{t('phoneVerification.resendIn', { time: fmtTimer(timer) })}</Text>
            ) : (
              <Pressable onPress={handleResend} disabled={resendCount >= MAX_RESEND}
                accessibilityLabel={t('phoneVerification.resendCode')} accessibilityHint={t('phoneVerification.resendCodeHint')} accessibilityRole="button">
                <Text style={[st.resendText, resendCount >= MAX_RESEND && st.disabled]}>
                  {t('phoneVerification.resendCode')}
                </Text>
              </Pressable>
            )}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md },
  rowRev: { flexDirection: 'row-reverse' },
  back: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  chevron: { fontSize: fontSize['3xl'], color: colors.text, fontWeight: '300' },
  headerTitle: { flex: 1, fontSize: fontSize['2xl'], fontWeight: 'bold', color: colors.text },
  form: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, alignItems: 'center' },
  icon: { marginBottom: spacing.lg },
  title: { fontSize: fontSize.xl, fontWeight: '600', color: colors.text, marginBottom: spacing.sm, width: '100%' },
  desc: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.xl, lineHeight: fontSize.sm * 1.5, width: '100%' },
  error: { color: colors.error, fontSize: fontSize.sm, marginTop: spacing.sm, textAlign: 'center' },
  attempts: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: spacing.sm, textAlign: 'center' },
  btn: { marginTop: spacing.lg, width: '100%' },
  resendBox: { marginTop: spacing.xl, alignItems: 'center' },
  timerText: { color: colors.textMuted, fontSize: fontSize.sm },
  resendText: { color: Colors.Primary.p500, fontSize: fontSize.sm, fontWeight: '600' },
  disabled: { color: colors.textMuted },
});

export default PhoneVerificationScreenMobile;
