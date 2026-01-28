/**
 * GlassPosterCard - Movie/TV poster card with glassmorphism
 *
 * Features:
 * - Poster thumbnail with gradient overlay
 * - Order badge with glass effect
 * - Remove button on hover
 * - RTL support
 * - Type indicator (movie/series)
 */

import React from 'react'
import { View, Text, Image, Pressable, StyleSheet, Platform } from 'react-native'
import { colors, spacing, borderRadius, fontSize } from '../../theme'
import { GlassView } from './GlassView'

export interface GlassPosterCardProps {
  /** Poster/thumbnail image URL */
  thumbnail?: string
  /** Content title */
  title: string
  /** Release year */
  year?: number | string
  /** Order number (1-based) */
  orderNumber?: number
  /** Whether content is a series */
  isSeries?: boolean
  /** RTL layout support */
  isRTL?: boolean
  /** Callback when remove button is pressed */
  onRemove?: () => void
  /** Callback when card is pressed */
  onPress?: () => void
  /** Show remove button (default: true when onRemove provided) */
  showRemoveButton?: boolean
}

export function GlassPosterCard({
  thumbnail,
  title,
  year,
  orderNumber,
  isSeries = false,
  isRTL = false,
  onRemove,
  onPress,
  showRemoveButton = true,
}: GlassPosterCardProps) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <GlassView intensity="low" style={styles.cardInner}>
        {/* Order Badge */}
        {orderNumber !== undefined && (
          <View style={[styles.orderBadge, isRTL ? styles.orderBadgeRTL : styles.orderBadgeLTR]}>
            <Text style={styles.orderText}>{orderNumber}</Text>
          </View>
        )}

        {/* Remove Button */}
        {showRemoveButton && onRemove && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.()
              onRemove()
            }}
            style={({ pressed }) => [
              styles.removeButton,
              isRTL ? styles.removeButtonRTL : styles.removeButtonLTR,
              pressed && styles.removeButtonPressed,
            ]}
          >
            <Text style={styles.removeIcon}>×</Text>
          </Pressable>
        )}

        {/* Poster Image */}
        <View style={styles.posterContainer}>
          {thumbnail ? (
            <Image
              source={{ uri: thumbnail }}
              style={styles.posterImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.posterPlaceholder}>
              <Text style={styles.placeholderIcon}>{isSeries ? '📺' : '🎬'}</Text>
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
              {title}
            </Text>

            <View style={[styles.metaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {/* Type Badge */}
              <View style={[styles.typeBadge, isSeries ? styles.seriesBadge : styles.movieBadge]}>
                <Text style={styles.typeIcon}>{isSeries ? '📺' : '🎬'}</Text>
              </View>

              {year && <Text style={styles.yearText}>{year}</Text>}
            </View>
          </View>
        </View>
      </GlassView>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    // @ts-ignore - Web-specific
    ...(Platform.OS === 'web' && {
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    }),
  },
  cardInner: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  orderBadge: {
    position: 'absolute',
    top: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    // @ts-ignore - Web-specific
    ...(Platform.OS === 'web' && {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
    }),
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
    opacity: 0,
    // @ts-ignore - Web-specific
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(4px)',
      transition: 'opacity 0.2s ease, background-color 0.2s ease',
      ':hover': {
        opacity: 1,
      },
    }),
  },
  removeButtonLTR: {
    right: spacing.sm,
  },
  removeButtonRTL: {
    left: spacing.sm,
  },
  removeButtonPressed: {
    opacity: 1,
    backgroundColor: colors.error,
  },
  removeIcon: {
    fontSize: 20,
    color: colors.text,
    fontWeight: 'bold',
    marginTop: -2,
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
    backgroundColor: colors.glassMedium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 40,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    // @ts-ignore - Web-specific
    ...(Platform.OS === 'web' && {
      background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.9))',
    }),
    // Native fallback
    ...(Platform.OS !== 'web' && {
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
    }),
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
    ...(Platform.OS === 'web' && {
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
    }),
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
    backgroundColor: colors.info + '40',
  },
  movieBadge: {
    backgroundColor: colors.success + '40',
  },
  typeIcon: {
    fontSize: 10,
  },
  yearText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
})

export default GlassPosterCard
