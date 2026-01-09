import { View, Text, StyleSheet, Image, Pressable, useWindowDimensions, Platform } from 'react-native'
import { Link } from 'react-router-dom'
import { Play, Info, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { GlassBadge } from '@bayit/shared/ui'

interface Content {
  id: string
  title: string
  description?: string
  backdrop?: string
  thumbnail?: string
  category?: string
  year?: number
  duration?: string
  rating?: string
}

interface HeroSectionProps {
  content: Content | null
}

export default function HeroSection({ content }: HeroSectionProps) {
  const { t } = useTranslation()
  const { height: windowHeight } = useWindowDimensions()

  if (!content) return null

  const heroHeight = Math.min(Math.max(windowHeight * 0.6, 400), 700)

  return (
    <View style={[styles.container, { height: heroHeight }]}>
      {/* Background Image */}
      <View style={StyleSheet.absoluteFill}>
        <Image
          source={{ uri: content.backdrop || content.thumbnail }}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        {/* Gradient Overlays - using CSS gradients for web */}
        <View style={[StyleSheet.absoluteFill, styles.gradientVertical]} />
        <View style={[StyleSheet.absoluteFill, styles.gradientHorizontal]} />
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        <View style={styles.content}>
          {/* Category/Type Badge */}
          {content.category && (
            <GlassBadge variant="primary" size="lg" style={styles.categoryBadge}>
              {content.category}
            </GlassBadge>
          )}

          {/* Title */}
          <Text style={styles.title}>{content.title}</Text>

          {/* Metadata */}
          <View style={styles.metadata}>
            {content.year && <Text style={styles.metaText}>{content.year}</Text>}
            {content.duration && <Text style={styles.metaText}>{content.duration}</Text>}
            {content.rating && (
              <GlassBadge variant="default" size="sm">
                {content.rating}
              </GlassBadge>
            )}
          </View>

          {/* Description */}
          {content.description && (
            <Text style={styles.description} numberOfLines={3}>
              {content.description}
            </Text>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <Link to={`/vod/${content.id}`} style={{ textDecoration: 'none' }}>
              <Pressable
                style={({ hovered }) => [
                  styles.primaryButton,
                  hovered && styles.primaryButtonHovered,
                ]}
              >
                <Play size={20} fill={colors.background} color={colors.background} />
                <Text style={styles.primaryButtonText}>{t('hero.watch')}</Text>
              </Pressable>
            </Link>

            <Link to={`/vod/${content.id}?info=true`} style={{ textDecoration: 'none' }}>
              <Pressable
                style={({ hovered }) => [
                  styles.secondaryButton,
                  hovered && styles.secondaryButtonHovered,
                ]}
              >
                <Info size={20} color={colors.text} />
                <Text style={styles.secondaryButtonText}>{t('hero.moreInfo')}</Text>
              </Pressable>
            </Link>

            <Pressable
              style={({ hovered }) => [
                styles.iconButton,
                hovered && styles.iconButtonHovered,
              ]}
              accessibilityLabel={t('hero.addToList')}
            >
              <Plus size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  gradientVertical: {
    backgroundImage: `linear-gradient(to top, ${colors.background}, rgba(17, 17, 34, 0.6), transparent)` as any,
  },
  gradientHorizontal: {
    backgroundImage: 'linear-gradient(to right, rgba(17, 17, 34, 0.7), rgba(17, 17, 34, 0.2), transparent)' as any,
  },
  contentContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingBottom: spacing.xl * 2,
    paddingHorizontal: spacing.md,
    maxWidth: 1280,
    marginHorizontal: 'auto' as any,
    width: '100%',
  },
  content: {
    maxWidth: 640,
  },
  categoryBadge: {
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
      },
      default: {},
    }),
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  metaText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  description: {
    fontSize: 18,
    color: colors.textSecondary,
    lineHeight: 28,
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  primaryButtonHovered: {
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
      },
      default: {},
    }),
    transform: [{ scale: 1.02 }],
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(26, 26, 46, 0.6)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    // @ts-ignore - Web-specific CSS
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  },
  secondaryButtonHovered: {
    backgroundColor: colors.glassStrong,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      default: {},
    }),
    transform: [{ scale: 1.02 }],
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  iconButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      default: {},
    }),
  },
})
