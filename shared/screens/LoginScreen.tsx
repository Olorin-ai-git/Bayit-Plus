import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { AnimatedLogo } from '../components/AnimatedLogo';
import { GlassView } from '../components/ui';
import { colors } from '../theme';
import { useDirection } from '../hooks/useDirection';

export const LoginScreen: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const navigation = useNavigation<any>();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      return;
    }

    try {
      await login(email, password);
      navigation.replace('Home');
    } catch (err) {
      // Error is handled by store
    }
  };

  return (
    <View className="flex-1 bg-[#0d0d1a]">
      {/* Background Gradient Effect */}
      <View
        className="absolute -top-[200px] -right-[200px] w-[600px] h-[600px] rounded-full bg-purple-600/30"
        pointerEvents="none"
      />

      <View className={`flex-1 items-center justify-center px-[100px] ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Logo */}
        <View className="flex-1 items-center justify-center">
          <AnimatedLogo size="large" />
          <Text className="text-[28px] text-gray-400 mt-8">{t('login.tagline')}</Text>
        </View>

        {/* Login Form */}
        <GlassView intensity="high" className="flex-1 max-w-[500px] p-10">
          <Text className={`text-4xl font-bold text-white mb-8 ${textAlign === 'right' ? 'text-right' : 'text-left'}`}>
            {t('login.title')}
          </Text>

          {/* Email Input */}
          <View className="mb-6">
            <Text className={`text-base text-gray-400 mb-2 ${textAlign === 'right' ? 'text-right' : 'text-left'}`}>
              {t('login.email')}
            </Text>
            <TextInput
              ref={emailRef}
              className={`bg-[#0d0d1a] border-2 ${focusedField === 'email' ? 'border-purple-500' : 'border-gray-700'} rounded-xl p-4 text-lg text-white text-left`}
              value={email}
              onChangeText={setEmail}
              placeholder={t('placeholder.email', 'your@email.com')}
              placeholderTextColor="#666666"
              keyboardType="email-address"
              autoCapitalize="none"
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              onSubmitEditing={() => passwordRef.current?.focus()}
              returnKeyType="next"
            />
          </View>

          {/* Password Input */}
          <View className="mb-6">
            <Text className={`text-base text-gray-400 mb-2 ${textAlign === 'right' ? 'text-right' : 'text-left'}`}>
              {t('login.password')}
            </Text>
            <TextInput
              ref={passwordRef}
              className={`bg-[#0d0d1a] border-2 ${focusedField === 'password' ? 'border-purple-500' : 'border-gray-700'} rounded-xl p-4 text-lg text-white text-left`}
              value={password}
              onChangeText={setPassword}
              placeholder={t('placeholder.password', '••••••••')}
              placeholderTextColor="#666666"
              secureTextEntry
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              onSubmitEditing={handleLogin}
              returnKeyType="done"
            />
          </View>

          {/* Error Message */}
          {error && (
            <View className="bg-red-500/10 p-3 rounded-lg mb-4">
              <Text className="text-red-500 text-sm text-center">{error}</Text>
            </View>
          )}

          {/* Login Button */}
          <TouchableOpacity
            className={`bg-purple-500 p-[18px] rounded-xl items-center ${isLoading ? 'opacity-60' : ''}`}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text className="text-[#0d0d1a] text-xl font-bold">{t('login.submit')}</Text>
            )}
          </TouchableOpacity>

          {/* QR Code Login Option */}
          <View className="mt-8 items-center">
            <View className="flex-row items-center mb-6">
              <View className="flex-1 h-px bg-gray-700" />
              <Text className="text-gray-500 px-4 text-sm">{t('login.or')}</Text>
              <View className="flex-1 h-px bg-gray-700" />
            </View>

            <Text className="text-gray-400 text-sm mb-4 text-center">
              {t('login.qrInstructions')}
            </Text>

            <View className="w-[120px] h-[120px] bg-white rounded-xl justify-center items-center mb-3">
              <Text className="text-2xl font-bold text-[#0d0d1a]">QR</Text>
            </View>

            <Text className="text-purple-500 text-sm">
              bayit.tv/tv-login
            </Text>
          </View>
        </GlassView>
      </View>
    </View>
  );
};

export default LoginScreen;
