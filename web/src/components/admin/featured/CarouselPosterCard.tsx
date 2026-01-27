/**
 * CarouselPosterCard - Movie poster style card for 3D carousel
 * Displays thumbnail, title, order number, and remove action
 */

import React from 'react'
import { View, Text, Image, Pressable, StyleSheet } from 'react-native'
import { X, Film, Tv } from 'lucide-react'
import { GlassView } from '@bayit/shared/ui'
import { Content } from '@/services/adminApi'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'

interface CarouselPosterCardProps {
  item: Content
  index: number
  onRemove?: () => void
  isRTL?: boolean
}

export default function CarouselPosterCard({
  item,
  index,
  onRemove,
  isRTL = false,
}: CarouselPosterCardProps) {
  const isSeries = item.is_series || item.stream_type === 'series'

  return (
    <GlassView style={styles.card}>
      {/* Order Badge */}
      <View style={[styles.orderBadge, isRTL ? styles.orderBadgeRTL : styles.orderBadgeLTR]}>
        <Text style={styles.orderText}>{index + 1}</Text>
      </View>

      {/* Remove Button */}
      {onRemove && (
        <Pressable
          onPress={onRemove}
          style={({ hovered }: { hovered?: boolean }) => [
            styles.removeButton,
            isRTL ? styles.removeButtonRTL : styles.removeButtonLTR,
            hovered && styles.removeButtonHovered,
          ]}
        >
          <X size={16} color={colors.text} />
        </Pressable>
      )}

      {/* Poster Image */}
      <View style={styles.posterContainer}>
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            style={styles.posterImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.posterPlaceholder}>
            {isSeries ? (
              <Tv size={40} color={colors.textSecondary} />
            ) : (
              <Film size={40} color={colors.textSecondary} />
            )}
          </View>
        )}

        {/* Gradient Overlay */}
        <View style={styles.gradientOverlay} />

        {/* Bottom Info */}
        <View style={styles.bottomInfo}>
          <Text
            style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          <View style={[styles.metaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {/* Type Badge */}
            <View style={[styles.typeBadge, isSeries ? styles.seriesBadge : styles.movieBadge]}>
              {isSeries ? (
                <Tv size={10} color={colors.text} />
              ) : (
                <Film size={10} color={colors.text} />
              )}
            </View>

            {item.year && <Text style={styles.yearText}>{item.year}</Text>}
          </View>
        </View>
      </View>
    </GlassView>
  )
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    // @ts-ignore - Web-specific
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  },
  orderBadge: {
    position: 'absolute',
    top: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    // @ts-ignore - Web-specific
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
  },
  orderBadgeLTR: {
    left: spacing.sm,
  },
  orderBadgeRTL: {
    right: spacing.sm,
  },
  orderText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  removeButton: {
    position: 'absolute',
    top: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    // @ts-ignore - Web-specific
    backdropFilter: 'blur(4px)',
    opacity: 0,
    transition: 'opacity 0.2s ease',
  },
  removeButtonLTR: {
    right: spacing.sm,
  },
  removeButtonRTL: {
    left: spacing.sm,
  },
  removeButtonHovered: {
    opacity: 1,
    backgroundColor: colors.error.DEFAULT,
  },
  posterContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  posterPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.glass.bgMedium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    // @ts-ignore - Web-specific
    background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.9))',
  },
  bottomInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    // @ts-ignore - Web-specific
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  typeBadge: {
    width: 20,
    height: 20,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seriesBadge: {
    backgroundColor: colors.info.DEFAULT + '40',
  },
  movieBadge: {
    backgroundColor: colors.success.DEFAULT + '40',
  },
  yearText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
})
