/**
 * Moment Editor
 *
 * Bottom panel for editing moment details.
 */
import { RefObject, useState } from 'react'
import { View, Text, TextInput, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Camera, Save } from 'lucide-react'
import { GlassView, GlassButton, GlassInput } from '@bayit/shared/ui'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'
import { useDirection } from '@/hooks/useDirection'
import { InteractiveMoment, useAvatarStudioStore } from '@/stores/avatarStudioStore'
import api from '@/services/api'

interface MomentEditorProps {
  moment: InteractiveMoment
  videoRef: RefObject<HTMLVideoElement>
}

export default function MomentEditor({ moment, videoRef }: MomentEditorProps) {
  const { t } = useTranslation()
  const { isRTL } = useDirection()
  const { updateMoment, selectedMovie } = useAvatarStudioStore()

  const [characterName, setCharacterName] = useState(moment.character_name || '')
  const [interactionPrompt, setInteractionPrompt] = useState(moment.interaction_prompt || '')
  const [context, setContext] = useState(moment.context || '')
  const [isExtractingFrame, setIsExtractingFrame] = useState(false)

  const handleExtractFrame = async () => {
    if (!videoRef.current || !selectedMovie) return

    setIsExtractingFrame(true)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(videoRef.current, 0, 0)

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95)
      })

      const formData = new FormData()
      formData.append('file', blob, 'frame.jpg')
      formData.append('content_id', selectedMovie.id)
      formData.append('timestamp', videoRef.current.currentTime.toString())

      const response = await api.post('/admin/content/extract-frame', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      await updateMoment(moment.id, { character_frame_url: response.frame_url })
    } catch (error: any) {
      alert('Failed to extract frame: ' + error.message)
    } finally {
      setIsExtractingFrame(false)
    }
  }

  const handleSave = async () => {
    await updateMoment(moment.id, {
      character_name: characterName,
      interaction_prompt: interactionPrompt,
      context,
    })
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {t('avatarStudio.editMoment', 'Edit Moment')}
      </Text>

      <View style={[styles.form, isRTL && styles.formRTL]}>
        <View style={styles.formRow}>
          <View style={styles.frameSection}>
            <Text style={styles.label}>
              {t('avatarStudio.characterFrame', 'Character Frame')}
            </Text>
            {moment.character_frame_url ? (
              <img
                src={moment.character_frame_url}
                alt="Character"
                style={styles.framePreview}
              />
            ) : (
              <View style={styles.framePreview}>
                <Text style={styles.noFrame}>
                  {t('avatarStudio.noFrame', 'No frame extracted')}
                </Text>
              </View>
            )}
            <GlassButton
              title={t('avatarStudio.extractFrame', 'Extract Frame')}
              onPress={handleExtractFrame}
              variant="secondary"
              icon={<Camera size={20} color={colors.text} />}
              disabled={isExtractingFrame}
            />
          </View>

          <View style={styles.fieldsSection}>
            <View style={styles.field}>
              <Text style={styles.label}>
                {t('avatarStudio.characterName', 'Character Name')}
              </Text>
              <GlassInput
                value={characterName}
                onChangeText={setCharacterName}
                placeholder={t('avatarStudio.characterNamePlaceholder', 'e.g., Moses')}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                {t('avatarStudio.interactionPrompt', 'Interaction Prompt')}
              </Text>
              <TextInput
                style={styles.textArea}
                value={interactionPrompt}
                onChangeText={setInteractionPrompt}
                placeholder={t('avatarStudio.promptPlaceholder', 'What should users ask or discuss?')}
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                {t('avatarStudio.context', 'Context (optional)')}
              </Text>
              <TextInput
                style={styles.textArea}
                value={context}
                onChangeText={setContext}
                placeholder={t('avatarStudio.contextPlaceholder', 'Background context for the AI')}
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={2}
              />
            </View>

            <GlassButton
              title={t('common.save', 'Save Changes')}
              onPress={handleSave}
              variant="primary"
              icon={<Save size={20} color={colors.text} />}
            />
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  form: {
    gap: spacing.md,
  },
  formRTL: {
    flexDirection: 'row-reverse',
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  frameSection: {
    width: 200,
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  framePreview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.glassDark,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noFrame: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  fieldsSection: {
    flex: 1,
    gap: spacing.md,
  },
  field: {
    gap: spacing.xs,
  },
  textArea: {
    backgroundColor: colors.glassDark,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: spacing.md,
    fontSize: fontSize.base,
    color: colors.text,
    minHeight: 80,
  },
})
