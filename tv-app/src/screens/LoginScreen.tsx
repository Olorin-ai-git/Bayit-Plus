import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../stores/authStore';

export const LoginScreen: React.FC = () => {
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
      <View style={styles.backgroundGradient} />

      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>בית+</Text>
          <Text style={styles.tagline}>הבית שלך בארה״ב</Text>
        </View>

        {/* Login Form */}
        <View style={styles.form}>
          <Text style={styles.title}>התחברות</Text>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>אימייל</Text>
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
            <Text style={styles.label}>סיסמה</Text>
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
              <Text style={styles.buttonText}>התחברות</Text>
            )}
          </TouchableOpacity>

          {/* QR Code Login Option */}
          <View style={styles.qrSection}>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>או</Text>
              <View style={styles.dividerLine} />
            </View>

            <Text style={styles.qrInstructions}>
              סרוק את הקוד עם הטלפון להתחברות מהירה
            </Text>

            <View style={styles.qrPlaceholder}>
              <Text style={styles.qrPlaceholderText}>QR</Text>
            </View>

            <Text style={styles.qrUrl}>
              bayit.network/tv-login
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d1a',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 100,
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 120,
    fontWeight: 'bold',
    color: '#00d9ff',
  },
  tagline: {
    fontSize: 28,
    color: '#888888',
    marginTop: 16,
  },
  form: {
    flex: 1,
    maxWidth: 500,
    padding: 40,
    backgroundColor: 'rgba(26, 26, 46, 0.8)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    color: '#888888',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0d0d1a',
    borderWidth: 2,
    borderColor: '#2d2d44',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#ffffff',
  },
  inputFocused: {
    borderColor: '#00d9ff',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#00d9ff',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#000000',
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
    backgroundColor: '#2d2d44',
  },
  dividerText: {
    color: '#666666',
    paddingHorizontal: 16,
    fontSize: 14,
  },
  qrInstructions: {
    color: '#888888',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  qrPlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  qrPlaceholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0d0d1a',
  },
  qrUrl: {
    color: '#00d9ff',
    fontSize: 14,
  },
});

export default LoginScreen;
