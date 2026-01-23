import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { Home, Search, ArrowRight } from 'lucide-react';
import { colors, spacing } from '@bayit/shared/theme';
import { GlassCard, GlassView } from '@bayit/shared/ui';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();

  return (
    <View style={styles.container}>
      {/* Decorative blur circles */}
      <View style={[styles.blurCircle, styles.blurCircle1]} />
      <View style={[styles.blurCircle, styles.blurCircle2]} />
      <View style={[styles.blurCircle, styles.blurCircle3]} />

      <View style={styles.content}>
        {/* Large 404 text */}
        <Text style={styles.errorCode}>404</Text>

        {/* Glass card with message */}
        <GlassView style={styles.glassCard}>
          <View style={styles.iconCircle}>
            <Text style={styles.emoji}>🏠</Text>
          </View>

          <Text style={[styles.title, { textAlign }]}>{t('notFound.title')}</Text>
          <Text style={[styles.description, { textAlign }]}>
            {t('notFound.description')}
          </Text>

          <View style={[styles.buttonRow, { flexDirection }]}>
            <Pressable
              style={styles.primaryButton}
              onPress={() => navigate('/')}
            >
              <Home size={20} color={colors.background} />
              <Text style={styles.primaryButtonText}>{t('notFound.homeButton')}</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => navigate('/search')}
            >
              <Search size={20} color={colors.text} />
              <Text style={styles.secondaryButtonText}>{t('notFound.searchButton')}</Text>
            </Pressable>
          </View>
        </GlassView>

        {/* Quick links */}
        <View style={styles.quickLinksContainer}>
          <Text style={styles.quickLinksLabel}>{t('notFound.orTry')}</Text>
          <View style={[styles.quickLinksRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
    minHeight: '100vh' as any,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl * 2,
  },
  // Decorative blur circles
  blurCircle: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.15,
  },
  blurCircle1: {
    width: 400,
    height: 400,
    top: '10%',
    right: '10%',
    backgroundColor: '#9333ea',
    filter: 'blur(120px)' as any,
  },
  blurCircle2: {
    width: 300,
    height: 300,
    bottom: '20%',
    left: '5%',
    backgroundColor: '#7c3aed',
    opacity: 0.12,
    filter: 'blur(120px)' as any,
  },
  blurCircle3: {
    width: 250,
    height: 250,
    top: '40%',
    left: '30%',
    backgroundColor: '#a855f7',
    opacity: 0.08,
    filter: 'blur(120px)' as any,
  },
  content: {
    alignItems: 'center',
    zIndex: 10,
    maxWidth: 480,
    width: '100%',
  },
  // Large 404 text
  errorCode: {
    fontSize: 140,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: spacing.lg,
    letterSpacing: -4,
    textShadowColor: `${colors.primary}40` as any,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 60,
  },
  // Glass card
  glassCard: {
    padding: spacing.xl * 1.5,
    alignItems: 'center',
    width: '100%',
    borderRadius: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(147, 51, 234, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emoji: {
    fontSize: 48,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  // Quick links
  quickLinksContainer: {
    marginTop: spacing.xl * 1.5,
    alignItems: 'center',
  },
  quickLinksLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: spacing.md,
  },
  quickLinksRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  quickLinkText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
});
