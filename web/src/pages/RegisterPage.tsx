import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Image, ScrollView } from 'react-native';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, User, Lock } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassButton } from '@bayit/shared/ui';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, loginWithGoogle, isLoading, error } = useAuthStore();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async () => {
    setFormError('');

    if (!formData.name || !formData.email || !formData.password) {
      setFormError('נא למלא את כל השדות');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setFormError('הסיסמאות אינן תואמות');
      return;
    }

    if (formData.password.length < 8) {
      setFormError('הסיסמה חייבת להכיל לפחות 8 תווים');
      return;
    }

    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      navigate('/subscribe', { replace: true });
    } catch (err: any) {
      setFormError(err.message || 'שגיאה בהרשמה. נסה שוב.');
    }
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        {/* Decorative blur circles */}
        <View style={[styles.blurCircle, styles.blurCirclePrimary]} />
        <View style={[styles.blurCircle, styles.blurCirclePurple]} />

        <View style={styles.content}>
          {/* Logo */}
          <Link to="/" style={{ textDecoration: 'none' }}>
            <View style={styles.logoContainer}>
              <Image
                source={{ uri: '/logo.png' }}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.logoText}>בית+</Text>
            </View>
          </Link>

          {/* Form Card */}
          <GlassCard style={styles.formCard}>
            <Text style={styles.title}>יצירת חשבון</Text>

            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>שם מלא</Text>
              <View style={styles.inputContainer}>
                <User size={20} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="ישראל ישראלי"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>אימייל</Text>
              <View style={styles.inputContainer}>
                <Mail size={20} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  placeholder="your@email.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>סיסמה</Text>
              <View style={styles.inputContainer}>
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.inputIcon}>
                  {showPassword ? (
                    <EyeOff size={20} color={colors.textMuted} />
                  ) : (
                    <Eye size={20} color={colors.textMuted} />
                  )}
                </Pressable>
                <TextInput
                  value={formData.password}
                  onChangeText={(text) => setFormData({ ...formData, password: text })}
                  placeholder="לפחות 8 תווים"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  style={styles.input}
                />
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>אימות סיסמה</Text>
              <View style={styles.inputContainer}>
                <Lock size={20} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  value={formData.confirmPassword}
                  onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                  placeholder="הזן שוב את הסיסמה"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  style={styles.input}
                />
              </View>
            </View>

            {/* Error Message */}
            {(formError || error) && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{formError || error}</Text>
              </View>
            )}

            {/* Terms */}
            <Text style={styles.termsText}>
              בהרשמה אתה מאשר את{' '}
              <Link to="/terms" style={{ textDecoration: 'none' }}>
                <Text style={styles.termsLink}>תנאי השימוש</Text>
              </Link>
              {' '}ואת{' '}
              <Link to="/privacy" style={{ textDecoration: 'none' }}>
                <Text style={styles.termsLink}>מדיניות הפרטיות</Text>
              </Link>
            </Text>

            {/* Submit Button */}
            <GlassButton
              title={isLoading ? 'נרשם...' : 'הרשמה'}
              variant="primary"
              onPress={handleSubmit}
              disabled={isLoading}
              fullWidth
            />

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>או</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Login */}
            <GlassButton
              title="הרשמה עם Google"
              variant="secondary"
              onPress={() => loginWithGoogle()}
              disabled={isLoading}
              fullWidth
              icon={<GoogleIcon />}
            />

            {/* Login Link */}
            <View style={styles.loginLink}>
              <Text style={styles.loginText}>כבר יש לך חשבון? </Text>
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <Text style={styles.loginLinkText}>התחברות</Text>
              </Link>
            </View>
          </GlassCard>
        </View>
      </View>
    </ScrollView>
  );
}

function GoogleIcon() {
  return (
    <View style={{ width: 20, height: 20 }}>
      <Text style={{ fontSize: 16 }}>G</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    minHeight: '100vh' as any,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    position: 'relative',
  },
  blurCircle: {
    position: 'absolute',
    borderRadius: 9999,
    // @ts-ignore
    filter: 'blur(100px)',
  },
  blurCirclePrimary: {
    width: 320,
    height: 320,
    top: -160,
    right: -160,
    backgroundColor: colors.primary,
    opacity: 0.5,
  },
  blurCirclePurple: {
    width: 256,
    height: 256,
    bottom: 80,
    left: -128,
    backgroundColor: colors.secondary,
    opacity: 0.4,
  },
  content: {
    width: '100%',
    maxWidth: 448,
    zIndex: 10,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logo: {
    width: 80,
    height: 80,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: spacing.sm,
  },
  formCard: {
    padding: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
  },
  termsText: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  termsLink: {
    color: colors.primary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    paddingHorizontal: spacing.sm,
    fontSize: 14,
    color: colors.textMuted,
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  loginText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  loginLinkText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
});
