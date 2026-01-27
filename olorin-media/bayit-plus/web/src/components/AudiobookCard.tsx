/**
 * Audiobook Card Component
 * Displays individual audiobook in grid/list views
 */

import { useState } from 'react'
import { View, Text, StyleSheet, Pressable, Image } from 'react-native'
import { Link } from 'react-router-dom'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { GlassCard } from '@bayit/shared/ui'
import type { Audiobook } from '@/types/audiobook'

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: spacing.sm,
    marginVertical: spacing.sm,
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
    height: 180,
    width: '100%',
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
  },
  author: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    lineHeight: 16,
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
  audiobook: Audiobook
}

export function AudiobookCard({ audiobook }: AudiobookCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const viewCountDisplay =
    audiobook.view_count > 1000
      ? `${(audiobook.view_count / 1000).toFixed(1)}K`
      : audiobook.view_count.toString()

  return (
    <View style={styles.container}>
      <Link to={`/audiobooks/${audiobook.id}`} style={styles.linkContainer}>
        <Pressable
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
      </Link>
    </View>
  )
}

export default AudiobookCard
