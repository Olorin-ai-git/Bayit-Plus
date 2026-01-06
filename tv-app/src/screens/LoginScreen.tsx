import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
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
  const { isRTL, textAlign, flexDirection } = useDirection();
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
    <View style={styles.container}>
      {/* Background Gradient Effect */}
      <View style={styles.backgroundGradient} pointerEvents="none" />

      <View style={[styles.content, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <AnimatedLogo size="large" />
          <Text style={styles.tagline}>{t('login.tagline')}</Text>
        </View>

        {/* Login Form */}
        <GlassView intensity="high" style={styles.form}>
          <Text style={[styles.title, { textAlign }]}>{t('login.title')}</Text>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { textAlign }]}>{t('login.email')}</Text>
            <TextInput
              ref={emailRef}
              style={[
                styles.input,
                focusedField === 'email' && styles.inputFocused,
              ]}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
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
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { textAlign }]}>{t('login.password')}</Text>
            <TextInput
              ref={passwordRef}
              style={[
                styles.input,
                focusedField === 'password' && styles.inputFocused,
              ]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
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
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text style={styles.buttonText}>{t('login.submit')}</Text>
            )}
          </TouchableOpacity>

          {/* QR Code Login Option */}
          <View style={styles.qrSection}>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('login.or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            <Text style={styles.qrInstructions}>
              {t('login.qrInstructions')}
            </Text>

            <View style={styles.qrPlaceholder}>
              <Text style={styles.qrPlaceholderText}>QR</Text>
            </View>

            <Text style={styles.qrUrl}>
              bayit.tv/tv-login
            </Text>
          </View>
        </GlassView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backgroundGradient: {
    position: 'absolute',
    top: -200,
    right: -200,
    width: 600,
    height: 600,
    borderRadius: 300,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 100,
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagline: {
    fontSize: 28,
    color: colors.textSecondary,
    marginTop: 32,
  },
  form: {
    flex: 1,
    maxWidth: 500,
    padding: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.backgroundLighter,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: colors.text,
    textAlign: 'left',
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.background,
    fontSize: 20,
    fontWeight: 'bold',
  },
  qrSection: {
    marginTop: 32,
    alignItems: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.backgroundLighter,
  },
  dividerText: {
    color: colors.textMuted,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  qrInstructions: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  qrPlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: colors.text,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  qrPlaceholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.background,
  },
  qrUrl: {
    color: colors.primary,
    fontSize: 14,
  },
});

export default LoginScreen;
