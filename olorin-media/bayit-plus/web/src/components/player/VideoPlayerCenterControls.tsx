import { View, Text, StyleSheet } from 'react-native'
import { colors, spacing } from '@olorin/design-tokens'
import { VideoPlayerControls } from './hooks/useVideoPlayer'

interface VideoPlayerCenterControlsProps {
  isLive: boolean
  isPlaying: boolean
  controls: VideoPlayerControls
}

export default function VideoPlayerCenterControls({
  isLive,
  isPlaying,
  controls,
}: VideoPlayerCenterControlsProps) {
  return (
    <View style={styles.centerControls}>
      {/* Skip Backward 30s */}
      {!isLive && (
        <View
          onClick={(e: any) => {
            e?.stopPropagation?.()
            controls.skip(-30)
          }}
          style={styles.centerSkipButton}
        >
          <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2}>
            <path d="M12 5V1L7 6l5 5V7a6 6 0 11-6 6" />
          </svg>
          <Text style={styles.centerSkipText}>30</Text>
        </View>
      )}

      {/* Play/Pause Button */}
      <View
        onClick={(e: any) => {
          e?.stopPropagation?.()
          controls.togglePlay()
        }}
        style={styles.centerPlayButton}
      >
        {isPlaying ? (
          <svg width={40} height={40} viewBox="0 0 24 24" fill={colors.text}>
            <rect x="6" y="5" width="4" height="14" />
            <rect x="14" y="5" width="4" height="14" />
          </svg>
        ) : (
          <svg width={40} height={40} viewBox="0 0 24 24" fill={colors.text} style={{ marginLeft: 4 }}>
            <polygon points="5,3 19,12 5,21" />
          </svg>
        )}
      </View>

      {/* Skip Forward 30s */}
      {!isLive && (
        <View
          onClick={(e: any) => {
            e?.stopPropagation?.()
            controls.skip(30)
          }}
          style={styles.centerSkipButton}
        >
          <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2}>
            <path d="M12 5V1l5 5-5 5V7a6 6 0 106 6" />
          </svg>
          <Text style={styles.centerSkipText}>30</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  centerControls: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  centerSkipButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    cursor: 'pointer',
    opacity: 0.9,
  },
  centerSkipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    marginTop: -4,
  },
  centerPlayButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    cursor: 'pointer',
  },
})
