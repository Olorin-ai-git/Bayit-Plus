import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassButton } from '@bayit/shared/ui';

export default function NotFoundPage() {
  return (
    <View style={styles.container}>
      {/* Decorative blur circles */}
      <View style={[styles.blurCircle, styles.blurCirclePrimary]} />
      <View style={[styles.blurCircle, styles.blurCirclePurple]} />

      <GlassCard style={styles.card}>
        <Text style={styles.errorCode}>404</Text>
        <Text style={styles.title}>הדף לא נמצא</Text>
        <Text style={styles.description}>
          הדף שחיפשת לא קיים או הועבר למקום אחר.
        </Text>
        <View style={styles.buttons}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <GlassButton
              title="לדף הבית"
              variant="primary"
              icon={<Home size={20} color={colors.text} />}
            />
          </Link>
          <Link to="/search" style={{ textDecoration: 'none' }}>
            <GlassButton
              title="חיפוש"
              variant="secondary"
              icon={<Search size={20} color={colors.text} />}
            />
          </Link>
        </View>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: '60vh' as any,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    paddingHorizontal: spacing.md,
  },
  blurCircle: {
    position: 'absolute',
    borderRadius: 9999,
    // @ts-ignore - Web CSS property
    filter: 'blur(100px)',
  },
  blurCirclePrimary: {
    width: 256,
    height: 256,
    top: -128,
    right: '25%' as any,
    backgroundColor: colors.primary,
    opacity: 0.5,
  },
  blurCirclePurple: {
    width: 192,
    height: 192,
    bottom: 0,
    left: '33%' as any,
    backgroundColor: colors.secondary,
    opacity: 0.4,
  },
  card: {
    padding: spacing.xl * 1.5,
    alignItems: 'center',
    maxWidth: 512,
    width: '100%',
    zIndex: 10,
  },
  errorCode: {
    fontSize: 96,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
  },
});
