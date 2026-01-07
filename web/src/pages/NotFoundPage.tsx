import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { Home, Search, ArrowRight } from 'lucide-react';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassView } from '@bayit/shared/ui';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();

  return (
    <View style={styles.container}>
      {/* Decorative blur circles */}
      <View style={[styles.blurCircle, styles.blurCirclePrimary]} />
      <View style={[styles.blurCircle, styles.blurCirclePurple]} />
      <View style={[styles.blurCircle, styles.blurCircleCyan]} />

      <View style={styles.content}>
        {/* Large 404 text */}
        <Text style={styles.errorCode}>404</Text>

        {/* Glass card with message */}
        <GlassView style={styles.card} intensity="medium">
          <View style={styles.iconContainer}>
            <Text style={styles.iconEmoji}>🏠</Text>
          </View>

          <Text style={styles.title}>{t('notFound.title')}</Text>
          <Text style={styles.description}>
            {t('notFound.description')}
          </Text>

          <View style={styles.buttons}>
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
              onPress={() => navigate('/')}
            >
              <Home size={20} color={colors.background} />
              <Text style={styles.primaryButtonText}>{t('notFound.homeButton')}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
              onPress={() => navigate('/search')}
            >
              <Search size={20} color={colors.text} />
              <Text style={styles.secondaryButtonText}>{t('notFound.searchButton')}</Text>
            </Pressable>
          </View>
        </GlassView>

        {/* Quick links */}
        <View style={styles.quickLinks}>
          <Text style={styles.quickLinksTitle}>{t('notFound.orTry')}</Text>
          <View style={styles.linksList}>
            <Pressable style={styles.quickLink} onPress={() => navigate('/live')}>
              <Text style={styles.quickLinkText}>{t('notFound.liveChannel')}</Text>
              <ArrowRight size={14} color={colors.primary} />
            </Pressable>
            <Pressable style={styles.quickLink} onPress={() => navigate('/vod')}>
              <Text style={styles.quickLinkText}>{t('notFound.vodLabel')}</Text>
              <ArrowRight size={14} color={colors.primary} />
            </Pressable>
            <Pressable style={styles.quickLink} onPress={() => navigate('/podcasts')}>
              <Text style={styles.quickLinkText}>{t('notFound.podcastsLabel')}</Text>
              <ArrowRight size={14} color={colors.primary} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 'calc(100vh - 64px)' as any,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl * 2,
  },
  content: {
    alignItems: 'center',
    zIndex: 10,
    maxWidth: 480,
    width: '100%',
  },
  blurCircle: {
    position: 'absolute',
    borderRadius: 9999,
    // @ts-ignore - Web CSS property
    filter: 'blur(120px)',
    pointerEvents: 'none',
  },
  blurCirclePrimary: {
    width: 400,
    height: 400,
    top: '10%' as any,
    right: '10%' as any,
    backgroundColor: colors.primary,
    opacity: 0.15,
  },
  blurCirclePurple: {
    width: 300,
    height: 300,
    bottom: '20%' as any,
    left: '5%' as any,
    backgroundColor: colors.secondary,
    opacity: 0.12,
  },
  blurCircleCyan: {
    width: 250,
    height: 250,
    top: '40%' as any,
    left: '30%' as any,
    backgroundColor: '#00d9ff',
    opacity: 0.08,
  },
  errorCode: {
    fontSize: 140,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: spacing.lg,
    letterSpacing: -4,
    // @ts-ignore
    textShadow: `0 0 60px ${colors.primary}40`,
  },
  card: {
    padding: spacing.xl * 1.5,
    alignItems: 'center',
    width: '100%',
    borderRadius: borderRadius.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconEmoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    // @ts-ignore
    transition: 'all 0.2s ease',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    // @ts-ignore
    transition: 'all 0.2s ease',
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  quickLinks: {
    marginTop: spacing.xl * 1.5,
    alignItems: 'center',
  },
  quickLinksTitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  linksList: {
    flexDirection: 'row',
    gap: spacing.lg,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    // @ts-ignore
    transition: 'all 0.2s ease',
  },
  quickLinkText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
});
