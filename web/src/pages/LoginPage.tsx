import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Image } from 'react-native';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Mail } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassButton, GlassInput } from '@bayit/shared/ui';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, isLoading, error } = useAuthStore();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async () => {
    setFormError('');

    if (!formData.email || !formData.password) {
      setFormError('נא למלא את כל השדות');
      return;
    }

    try {
      await login(formData.email, formData.password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setFormError(err.message || 'שגיאה בהתחברות. נסה שוב.');
    }
  };

  return (
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
          <Text style={styles.title}>התחברות</Text>

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
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                style={styles.input}
              />
            </View>
          </View>

          {/* Forgot Password */}
          <View style={styles.forgotPassword}>
            <Link to="/forgot-password" style={{ textDecoration: 'none' }}>
              <Text style={styles.forgotPasswordText}>שכחת סיסמה?</Text>
            </Link>
          </View>

          {/* Error Message */}
          {(formError || error) && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{formError || error}</Text>
            </View>
          )}

          {/* Submit Button */}
          <GlassButton
            title={isLoading ? 'מתחבר...' : 'התחברות'}
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
            title="המשך עם Google"
            variant="secondary"
            onPress={() => loginWithGoogle()}
            disabled={isLoading}
            fullWidth
            icon={<GoogleIcon />}
          />

          {/* Register Link */}
          <View style={styles.registerLink}>
            <Text style={styles.registerText}>אין לך חשבון? </Text>
            <Link to="/register" style={{ textDecoration: 'none' }}>
              <Text style={styles.registerLinkText}>הרשמה</Text>
            </Link>
          </View>
        </GlassCard>
      </View>
    </View>
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
  container: {
    flex: 1,
    minHeight: '100vh' as any,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
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
  forgotPassword: {
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: colors.primary,
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
  registerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  registerText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  registerLinkText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
});
