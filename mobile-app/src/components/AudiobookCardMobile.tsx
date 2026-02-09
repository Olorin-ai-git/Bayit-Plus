/**
 * Audiobook Card (Mobile)
 * Touch-optimized card for mobile grid display
 */

import React from 'react'
import { View, Text, StyleSheet, Pressable, Image } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { NativeIcon } from '@olorin/shared-icons/native'
import type { Audiobook } from '@bayit/shared-services/api/types'

interface AudiobookCardMobileProps {
  audiobook: Audiobook
  cardWidth: number
  navigation: any
}

export default function AudiobookCardMobile({ audiobook, cardWidth, navigation }: AudiobookCardMobileProps) {
  const { t } = useTranslation()

  const handlePress = () => {
    navigation.navigate('AudiobookDetail', { id: audiobook.id })
  }

  const formatViewCount = (count: number) => count > 1000 ? `${(count / 1000).toFixed(1)}K` : count.toString()

  return (
    <Pressable onPress={handlePress} style={[styles.card, { width: cardWidth }]}>
      <View style={styles.imageContainer}>
        {audiobook.thumbnail ? (
          <Image source={{ uri: audiobook.thumbnail }} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <NativeIcon name="audiobooks" size="xxxl" color="rgba(255,255,255,0.3)" />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {audiobook.title}
        </Text>
        {audiobook.author && (
          <Text style={styles.author} numberOfLines={1}>
            {audiobook.author}
          </Text>
        )}

        <View style={styles.footer}>
          {audiobook.avg_rating > 0 && (
            <View style={styles.ratingContainer}>
              <NativeIcon name="star" size="xs" color={colors.primary.DEFAULT} />
              <Text style={styles.rating} numberOfLines={1}>
                {audiobook.avg_rating.toFixed(1)}
              </Text>
            </View>
          )}
          {audiobook.view_count > 0 && (
            <Text style={styles.viewCount} numberOfLines={1}>
              {formatViewCount(audiobook.view_count)}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: borderRadius.md, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  imageContainer: { width: '100%', height: 160, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  placeholder: { backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 48 },
  content: { padding: spacing.sm, gap: spacing.xs },
  title: { fontSize: 13, fontWeight: '600', color: colors.text, lineHeight: 16 },
  author: { fontSize: 11, color: colors.textMuted },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rating: { fontSize: 10, color: colors.primary.DEFAULT, fontWeight: '500' },
  viewCount: { fontSize: 10, color: colors.textMuted },
})
