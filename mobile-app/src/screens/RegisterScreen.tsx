import React, { useState } from 'react'
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { GlassCard, GlassTextField, GlassButton } from '../components/glass'
import { theme } from '../theme'
import { useNavigation } from '@react-navigation/native'
import auth from '@react-native-firebase/auth'
import { log } from '@bayit/shared-services/logger.native'

export default function RegisterScreen() {
  const navigation = useNavigation()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!displayName.trim()) {
      newErrors.displayName = 'Display name is required'
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid'
    }

    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleRegister = async () => {
    if (!validate()) return

    setLoading(true)
    setErrors({})
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(email, password)
      await userCredential.user.updateProfile({ displayName })
      log.info('User registered successfully', { userId: userCredential.user.uid })
      navigation.navigate('Main' as never)
    } catch (error: unknown) {
      const errorMessage = (error as { message?: string })?.message || 'Registration failed'
      log.error('Registration failed', { error: errorMessage })
      setErrors({ general: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <GlassCard style={styles.card}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Bayit+ to access premium content</Text>

          <GlassTextField
            label="Display Name"
            value={displayName}
            onChangeText={setDisplayName}
            error={errors.displayName}
            autoCapitalize="words"
            placeholder="Enter your name"
          />

          <GlassTextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="Enter your email"
          />

          <GlassTextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            secureTextEntry
            placeholder="At least 8 characters"
          />

          <GlassTextField
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={errors.confirmPassword}
            secureTextEntry
            placeholder="Re-enter password"
          />

          {errors.general && (
            <Text style={styles.generalError}>{errors.general}</Text>
          )}

          <GlassButton
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
            variant="primary"
          />

          <GlassButton
            title="Already have an account? Sign In"
            onPress={() => navigation.goBack()}
            variant="secondary"
          />
        </GlassCard>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.md,
  },
  card: {
    padding: theme.spacing.lg,
  },
  title: {
    ...theme.typography.headlineMedium,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  generalError: {
    ...theme.typography.bodySmall,
    color: theme.colors.error,
    textAlign: 'center',
    marginVertical: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    borderRadius: 8,
  },
})
