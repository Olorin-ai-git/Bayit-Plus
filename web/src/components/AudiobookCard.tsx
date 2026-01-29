/**
 * Audiobook Card Component
 * Displays individual audiobook in grid/list views
 * Supports both native Bayit+ and Audible audiobooks
 */

import { useState } from 'react'
import { View, Text, StyleSheet, Pressable, Image } from 'react-native'
import { Link } from 'react-router-dom'
import { Book } from 'lucide-react'
import { colors } from '@olorin/design-tokens'
import { GlassCard } from '@bayit/shared/ui'
import type { Audiobook } from '@/types/audiobook'
import { AudibleBadge } from './audiobook/AudibleBadge'

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 4,
  },
  card: {
    aspectRatio: 1,
    marginBottom: 8,
    padding: 0,
    overflow: 'hidden',
  },
  cardHovered: {
    shadowColor: 'rgba(16, 185, 129, 0.3)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 32,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageHovered: {
    transform: [{ scale: 1.05 }],
  },
  imageDefault: {
    transform: [{ scale: 1 }],
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  titleHovered: {
    color: colors.primary.DEFAULT,
  },
  titleDefault: {
    color: '#ffffff',
  },
  author: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
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

  const linkStyles = { textDecoration: 'none', flex: 1 }

  const cardContent = (
    <Pressable
      onPress={isAudible ? handlePress : undefined}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
    >
      <View style={styles.container}>
        <GlassCard style={[styles.card, isHovered && styles.cardHovered]}>
          <View style={styles.imageContainer}>
            {audiobook.thumbnail ? (
              <Image
                source={{ uri: audiobook.thumbnail }}
                style={[styles.image, isHovered ? styles.imageHovered : styles.imageDefault]}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.placeholder}>
                <Book size={32} color={colors.primary.DEFAULT} />
              </View>
            )}
          </View>

          {/* Audible Badge */}
          {isAudible && <AudibleBadge variant="compact" />}
        </GlassCard>

        <Text
          style={[styles.title, isHovered ? styles.titleHovered : styles.titleDefault]}
          numberOfLines={1}
        >
          {audiobook.title}
        </Text>

        {audiobook.author && (
          <Text style={styles.author} numberOfLines={1}>
            {audiobook.author}
          </Text>
        )}

        <View style={styles.metaContainer}>
          <Text style={styles.metaText}>{audiobook.duration || 'N/A'}</Text>
          {audiobook.view_count > 0 && (
            <Text style={styles.metaText}>👁 {viewCountDisplay}</Text>
          )}
          {audiobook.avg_rating > 0 && (
            <Text style={styles.metaText}>⭐ {audiobook.avg_rating.toFixed(1)}</Text>
          )}
        </View>
      </View>
    </Pressable>
  )

  return isAudible ? (
    cardContent
  ) : (
    <Link to={`/audiobooks/${audiobook.id}`} style={linkStyles}>
      {cardContent}
    </Link>
  )
}

export default AudiobookCard
