import React, { useState } from 'react'
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { GlassCard, GlassTextField, GlassButton } from '../components/glass'
import { theme } from '../theme'
import { useNavigation } from '@react-navigation/native'
import auth from '@react-native-firebase/auth'
import { log } from '@bayit/shared-services/logger.native'

export default function ForgotPasswordScreen() {
  const navigation = useNavigation()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError('Email is required')
      return
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Email is invalid')
      return
    }

    setLoading(true)
    setError('')
    try {
      await auth().sendPasswordResetEmail(email)
      log.info('Password reset email sent', { email })
      setSuccess(true)
    } catch (err: unknown) {
      const errorMessage = (err as { message?: string })?.message || 'Failed to send reset email'
      log.error('Password reset failed', { error: errorMessage })
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <View style={styles.container}>
        <GlassCard style={styles.card}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.title}>Check Your Email</Text>
          <Text style={styles.message}>
            Password reset instructions have been sent to:
          </Text>
          <Text style={styles.email}>{email}</Text>
          <Text style={styles.helpText}>
            If you don't see the email, check your spam folder.
          </Text>
          <GlassButton
            title="Back to Sign In"
            onPress={() => navigation.goBack()}
            variant="primary"
          />
        </GlassCard>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <GlassCard style={styles.card}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.message}>
          Enter your email address and we'll send you instructions to reset your password.
        </Text>

        <GlassTextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={error}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          placeholder="Enter your email"
        />

        <GlassButton
          title="Send Reset Email"
          onPress={handleResetPassword}
          loading={loading}
          variant="primary"
        />

        <GlassButton
          title="Back to Sign In"
          onPress={() => navigation.goBack()}
          variant="secondary"
        />
      </GlassCard>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    padding: theme.spacing.md,
  },
  card: {
    padding: theme.spacing.lg,
  },
  successIcon: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.headlineMedium,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  message: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
    lineHeight: 24,
  },
  email: {
    ...theme.typography.bodyLarge,
    color: theme.colors.primary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
    fontWeight: '600',
  },
  helpText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
    fontStyle: 'italic',
  },
})
