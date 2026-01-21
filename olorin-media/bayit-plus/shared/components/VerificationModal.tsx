/**
 * VerificationModal - Two-step email + phone verification wizard
 * Follows GlassModal pattern
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassModal } from './ui/GlassModal';
import { GlassButton } from './ui/GlassButton';
import { GlassInput } from './ui/GlassInput';
import { verificationService } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { colors, spacing, fontSize } from '../theme';

interface VerificationModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'email' | 'phone' | 'phone-code' | 'success';

export const VerificationModal: React.FC<VerificationModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuthStore();
  const [step, setStep] = useState<Step>('email');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendEmail = async () => {
    setLoading(true);
    setError('');
    try {
      await verificationService.sendEmailVerification();
      setStep('email');
    } catch (err: any) {
      setError(err.detail || 'Failed to send verification email');
    } finally {
      setLoading(false);
    }
  };

  const handleSendPhone = async () => {
    if (!phoneNumber) {
      setError('Please enter your phone number');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await verificationService.sendPhoneVerification(phoneNumber);
      setStep('phone-code');
    } catch (err: any) {
      setError(err.detail || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await verificationService.verifyPhone(verificationCode);
      setStep('success');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.detail || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    if (step === 'email') {
      return (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>📧 Verify Your Email</Text>
          <Text style={styles.stepDescription}>
            Check your inbox at <Text style={styles.highlight}>{user?.email}</Text>
            {'\n\n'}Click the verification link we sent you.
          </Text>
          <GlassButton onPress={handleSendEmail} loading={loading}>
            Resend Email
          </GlassButton>
          <GlassButton variant="secondary" onPress={() => setStep('phone')}>
            Email Verified? Continue →
          </GlassButton>
        </View>
      );
    }

    if (step === 'phone') {
      return (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>📱 Verify Your Phone</Text>
          <Text style={styles.stepDescription}>
            Enter your phone number to receive a verification code
          </Text>
          <GlassInput
            placeholder="+1 555 123 4567"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />
          <GlassButton onPress={handleSendPhone} loading={loading}>
            Send Code
          </GlassButton>
        </View>
      );
    }

    if (step === 'phone-code') {
      return (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>🔑 Enter Code</Text>
          <Text style={styles.stepDescription}>
            Enter the 6-digit code sent to{'\n'}<Text style={styles.highlight}>{phoneNumber}</Text>
          </Text>
          <GlassInput
            placeholder="123456"
            value={verificationCode}
            onChangeText={setVerificationCode}
            keyboardType="number-pad"
            maxLength={6}
          />
          <GlassButton onPress={handleVerifyPhone} loading={loading}>
            Verify
          </GlassButton>
          <GlassButton variant="secondary" onPress={handleSendPhone}>
            Resend Code
          </GlassButton>
        </View>
      );
    }

    if (step === 'success') {
      return (
        <View style={styles.stepContent}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.stepTitle}>Verified!</Text>
          <Text style={styles.stepDescription}>
            Your account is now verified.{'\n'}Redirecting...
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <GlassModal
      visible={visible}
      type="info"
      title="Verify Your Account"
      onClose={onClose}
      dismissable={step !== 'success'}
    >
      {renderStepContent()}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </GlassModal>
  );
};

const styles = StyleSheet.create({
  stepContent: {
    alignItems: 'center',
    gap: spacing.md,
  },
  stepTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  highlight: {
    color: colors.primary,
    fontWeight: '600',
  },
  successIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  error: {
    color: colors.error,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
