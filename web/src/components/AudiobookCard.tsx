/**
 * Audiobook Card Component
 * Displays individual audiobook in grid/list views
 * Supports both native Bayit+ and Audible audiobooks
 */

import { useState } from 'react'
import { View, Text, StyleSheet, Pressable, Image } from 'react-native'
import { Link } from 'react-router-dom'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { GlassCard } from '@bayit/shared/ui'
import type { Audiobook } from '@/types/audiobook'
import { AudibleBadge } from './audiobook/AudibleBadge'

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: spacing.sm,
    marginVertical: spacing.sm,
    minWidth: 160,
    maxWidth: 200,
  },
  linkContainer: {
    textDecoration: 'none',
    display: 'flex',
    flex: 1,
  },
  cardContent: {
    paddingBottom: spacing.md,
  },
  imageContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    height: 240,
    width: '100%',
    backgroundColor: colors.border,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    lineHeight: 20,
    minHeight: 40,
  },
  author: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    lineHeight: 16,
    minHeight: 16,
  },
  narrator: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    fontStyle: 'italic',
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  duration: {
    fontSize: 11,
    color: colors.textMuted,
  },
  badge: {
    backgroundColor: `${colors.primary.DEFAULT}33`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  badgeText: {
    fontSize: 10,
    color: colors.primary.DEFAULT,
    fontWeight: '500',
  },
  rating: {
    fontSize: 12,
    color: colors.accent,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    fontWeight: '500',
  },
  hovered: {
    transform: [{ scale: 1.05 }],
  },
  placeholder: {
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
})

interface AudiobookCardProps {
  audiobook: Audiobook & { source?: string; asin?: string }
  onAudiblePlay?: (asin: string) => void
}

export function AudiobookCard({ audiobook, onAudiblePlay }: AudiobookCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const isAudible = audiobook.source === 'audible'
  const viewCountDisplay =
    audiobook.view_count > 1000
      ? `${(audiobook.view_count / 1000).toFixed(1)}K`
      : audiobook.view_count.toString()

  const handlePress = () => {
    if (isAudible && audiobook.asin && onAudiblePlay) {
      onAudiblePlay(audiobook.asin)
    }
  }

  const cardContent = (
    <Pressable
      onPress={handlePress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={isHovered ? styles.hovered : undefined}
    >
      <GlassCard style={styles.cardContent}>
            {/* Image */}
            <View style={styles.imageContainer}>
              {audiobook.thumbnail ? (
                <Image
                  source={{ uri: audiobook.thumbnail }}
                  style={styles.image}
                />
              ) : (
                <View style={[styles.imageContainer, styles.placeholder]}>
                  <Text style={styles.placeholderText}>🎧</Text>
                </View>
              )}
              {/* Audible Badge */}
              {isAudible && <AudibleBadge variant="compact" />}
            </View>

            {/* Title */}
            <Text style={styles.title} numberOfLines={2}>
              {audiobook.title}
            </Text>

            {/* Author */}
            {audiobook.author && (
              <Text style={styles.author} numberOfLines={1}>
                {audiobook.author}
              </Text>
            )}

            {/* Narrator */}
            {audiobook.narrator && (
              <Text style={styles.narrator} numberOfLines={1}>
                {audiobook.narrator}
              </Text>
            )}

            {/* Rating and Duration */}
            <View style={styles.meta}>
              <Text style={styles.duration}>{audiobook.duration || 'N/A'}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>👁 {viewCountDisplay}</Text>
              </View>
            </View>

            {/* Rating */}
            {audiobook.avg_rating > 0 && (
              <Text style={styles.rating}>
                ⭐ {audiobook.avg_rating.toFixed(1)}/5
              </Text>
            )}
          </GlassCard>
      </Pressable>
    )

  return (
    <View style={styles.container}>
      {isAudible ? (
        cardContent
      ) : (
        <Link to={`/audiobooks/${audiobook.id}`} style={styles.linkContainer}>
          {cardContent}
        </Link>
      )}
    </View>
  )
}

export default AudiobookCard
