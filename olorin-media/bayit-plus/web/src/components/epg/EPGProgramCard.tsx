import React from 'react'
import { View, Text, Image, Pressable, StyleSheet } from 'react-native'
import { Clock, Info } from 'lucide-react'
import { EPGProgram } from '@/services/epgApi'
import { DateTime } from 'luxon'

interface EPGProgramCardProps {
  program: EPGProgram
  channelName: string
  timezone: 'israel' | 'local'
  onClick?: (program: EPGProgram) => void
}

const EPGProgramCard: React.FC<EPGProgramCardProps> = ({
  program,
  channelName,
  timezone,
  onClick
}) => {
  const zoneName = timezone === 'israel' ? 'Asia/Jerusalem' : 'local'

  const startTime = DateTime.fromISO(program.start_time).setZone(zoneName)
  const endTime = DateTime.fromISO(program.end_time).setZone(zoneName)
  const timeLabel = `${startTime.toFormat('HH:mm')} - ${endTime.toFormat('HH:mm')}`

  const isPast = program.is_past
  const isNow = program.is_now

  const containerStyle = [
    styles.container,
    isNow && styles.containerLive,
    isPast && styles.containerPast,
  ]

  return (
    <Pressable
      onPress={() => onClick?.(program)}
      style={({ pressed }) => [
        ...containerStyle,
        pressed && styles.containerPressed,
      ]}
    >
      {program.thumbnail ? (
        <Image
          source={{ uri: program.thumbnail }}
          alt={program.title}
          style={styles.thumbnail}
        />
      ) : (
        <View style={styles.thumbnailPlaceholder}>
          <Text style={styles.thumbnailEmoji}>📺</Text>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>
            {program.title}
          </Text>
          {isNow && (
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          )}
        </View>

        <View style={styles.metadata}>
          <Text style={styles.metadataText}>{channelName}</Text>
          <Text style={styles.metadataDivider}>•</Text>
          <View style={styles.timeRow}>
            <Clock size={14} color="rgba(255, 255, 255, 0.7)" />
            <Text style={styles.metadataText}>{timeLabel}</Text>
          </View>
          {program.category && (
            <>
              <Text style={styles.metadataDivider}>•</Text>
              <Text style={styles.metadataText}>{program.category}</Text>
            </>
          )}
        </View>

        {program.description && (
          <Text style={styles.description} numberOfLines={2}>
            {program.description}
          </Text>
        )}

        <View style={styles.tags}>
          {program.genres && program.genres.length > 0 && (
            <View style={styles.genreList}>
              {program.genres.slice(0, 3).map((genre, index) => (
                <View key={index} style={styles.genreTag}>
                  <Text style={styles.genreText}>{genre}</Text>
                </View>
              ))}
            </View>
          )}
          {program.rating && (
            <View style={styles.ratingTag}>
              <Text style={styles.ratingText}>{program.rating}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.actionHint}>
        <Info size={20} color="#a855f7" />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    backdropFilter: 'blur(16px)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  containerLive: {
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },
  containerPast: {
    opacity: 0.6,
  },
  containerPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderColor: 'rgba(168, 85, 247, 0.4)',
  },
  thumbnail: {
    width: 96,
    height: 96,
    resizeMode: 'cover',
    borderRadius: 8,
    flexShrink: 0,
  },
  thumbnailPlaceholder: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 8,
    flexShrink: 0,
  },
  thumbnailEmoji: {
    fontSize: 36,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  liveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    flexShrink: 0,
  },
  liveBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  metadataText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  metadataDivider: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
    lineHeight: 20,
  },
  tags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  genreList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  genreTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  genreText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  ratingTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 12,
    color: '#fbbf24',
  },
  actionHint: {
    flexShrink: 0,
    alignSelf: 'center',
    opacity: 0,
  },
})

export default EPGProgramCard
