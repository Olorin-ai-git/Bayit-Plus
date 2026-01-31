/**
 * VerificationModal - Two-step email + phone verification wizard
 * Follows GlassModal pattern
 */

import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { NativeIcon } from '@olorin/shared-icons/native';
import { GlassModal } from './ui/GlassModal';
import { GlassButton } from './ui/GlassButton';
import { GlassInput } from './ui/GlassInput';
import { verificationService } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { colors } from '@olorin/design-tokens';

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
        <View className="items-center gap-4">
          <View className="flex-row items-center gap-2">
            <NativeIcon name="mail" size={24} color="#a855f7" />
            <Text className="text-lg font-bold text-white text-center">Verify Your Email</Text>
          </View>
          <Text className="text-base text-white/70 text-center leading-[22px]">
            Check your inbox at <Text className="text-purple-500 font-semibold">{user?.email}</Text>
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
        <View className="items-center gap-4">
          <View className="flex-row items-center gap-2">
            <NativeIcon name="smartphone" size={24} color="#a855f7" />
            <Text className="text-lg font-bold text-white text-center">Verify Your Phone</Text>
          </View>
          <Text className="text-base text-white/70 text-center leading-[22px]">
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
        <View className="items-center gap-4">
          <View className="flex-row items-center gap-2">
            <NativeIcon name="key" size={24} color="#a855f7" />
            <Text className="text-lg font-bold text-white text-center">Enter Code</Text>
          </View>
          <Text className="text-base text-white/70 text-center leading-[22px]">
            Enter the 6-digit code sent to{'\n'}<Text className="text-purple-500 font-semibold">{phoneNumber}</Text>
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
        <View className="items-center gap-4">
          <NativeIcon name="checkCircle" size={60} color="#22c55e" style={{ marginBottom: 8 }} />
          <Text className="text-lg font-bold text-white text-center">Verified!</Text>
          <Text className="text-base text-white/70 text-center leading-[22px]">
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
      {error ? <Text className="text-red-500 text-sm text-center mt-4">{error}</Text> : null}
    </GlassModal>
  );
};
