/**
 * Studio Editor
 *
 * Full-screen workspace for marking interactive moments on videos.
 */
import { useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { X, Save, Plus } from 'lucide-react'
import { GlassView, GlassButton, GlassErrorBanner } from '@bayit/shared/ui'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'
import { useDirection } from '@/hooks/useDirection'
import { useAvatarStudioStore } from '@/stores/avatarStudioStore'
import VideoTimeline from './components/VideoTimeline'
import MomentCard from './components/MomentCard'
import MomentEditor from './components/MomentEditor'

interface StudioEditorProps {
  onClose: () => void
}

export default function StudioEditor({ onClose }: StudioEditorProps) {
  const { t } = useTranslation()
  const { isRTL } = useDirection()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const {
    selectedMovie,
    moments,
    selectedMoment,
    videoTime,
    isLoading,
    error,
    setVideoTime,
    addMoment,
    selectMoment,
    saveMoments,
    setError,
  } = useAvatarStudioStore()

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = videoTime
    }
  }, [videoTime])

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setVideoTime(videoRef.current.currentTime)
    }
  }

  const handleAddMoment = () => {
    if (videoRef.current) {
      addMoment(videoRef.current.currentTime)
      videoRef.current.pause()
      setIsPlaying(false)
    }
  }

  const handleSave = async () => {
    await saveMoments()
  }

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  if (!selectedMovie) {
    return null
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <Text style={styles.title}>{selectedMovie.title}</Text>
        <View style={[styles.headerActions, isRTL && styles.headerActionsRTL]}>
          <GlassButton
            title={t('common.save', 'Save')}
            onPress={handleSave}
            variant="primary"
            icon={<Save size={20} color={colors.text} />}
            disabled={isLoading}
          />
          <GlassButton
            title={t('common.close', 'Close')}
            onPress={onClose}
            variant="ghost"
            icon={<X size={20} color={colors.textSecondary} />}
          />
        </View>
      </View>

      {error && (
        <GlassErrorBanner
          message={error}
          onDismiss={() => setError(null)}
          marginBottom={spacing.md}
        />
      )}

      <View style={styles.editorLayout}>
        <View style={styles.videoPanel}>
          <GlassView style={styles.videoContainer}>
            {selectedMovie.video_url ? (
              <video
                ref={videoRef}
                src={selectedMovie.video_url}
                style={styles.video}
                onTimeUpdate={handleTimeUpdate}
                controls
              />
            ) : (
              <Text style={styles.noVideo}>
                {t('avatarStudio.noVideoUrl', 'No video URL available')}
              </Text>
            )}
          </GlassView>

          <VideoTimeline
            videoRef={videoRef}
            moments={moments}
            selectedMoment={selectedMoment}
            onMomentClick={selectMoment}
          />

          <View style={[styles.videoControls, isRTL && styles.videoControlsRTL]}>
            <GlassButton
              title={t('avatarStudio.addMoment', 'Add Moment')}
              onPress={handleAddMoment}
              variant="primary"
              icon={<Plus size={20} color={colors.text} />}
            />
          </View>
        </View>

        <View style={styles.momentsPanel}>
          <Text style={styles.sectionTitle}>
            {t('avatarStudio.moments', 'Interactive Moments')} ({moments.length})
          </Text>

          <ScrollView style={styles.momentsList} contentContainerStyle={styles.momentsListContent}>
            {moments.map((moment) => (
              <MomentCard
                key={moment.id}
                moment={moment}
                isSelected={selectedMoment?.id === moment.id}
                onSelect={() => selectMoment(moment)}
              />
            ))}

            {moments.length === 0 && (
              <View style={styles.emptyMoments}>
                <Text style={styles.emptyText}>
                  {t('avatarStudio.noMoments', 'No moments added yet')}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {selectedMoment && (
        <View style={styles.editorPanel}>
          <MomentEditor
            moment={selectedMoment}
            videoRef={videoRef}
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: colors.glassDark,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerActionsRTL: {
    flexDirection: 'row-reverse',
  },
  editorLayout: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.lg,
    padding: spacing.lg,
  },
  videoPanel: {
    flex: 2,
    gap: spacing.md,
  },
  videoContainer: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.black,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  noVideo: {
    padding: spacing.xl,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: fontSize.lg,
  },
  videoControls: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  videoControlsRTL: {
    flexDirection: 'row-reverse',
  },
  momentsPanel: {
    flex: 1,
    backgroundColor: colors.glassDark,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  momentsList: {
    flex: 1,
  },
  momentsListContent: {
    gap: spacing.sm,
  },
  emptyMoments: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  editorPanel: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: colors.glassDark,
  },
})
