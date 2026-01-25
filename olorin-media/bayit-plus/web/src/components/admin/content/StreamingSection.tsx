import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { GlassView, GlassInput, GlassButton, GlassCheckbox } from '@bayit/shared/ui'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'
import type { Content } from '@/types/content'

interface StreamingSectionProps {
  formData: Partial<Content>
  onChange: (field: string, value: any) => void
  disabled?: boolean
}

export default function StreamingSection({ formData, onChange, disabled }: StreamingSectionProps) {
  const { t } = useTranslation()

  return (
    <GlassView style={styles.section} intensity="high">
      <Text style={styles.sectionTitle}>
        {t('admin.content.editor.sections.streaming', 'Streaming')}
      </Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>
          {t('admin.content.editor.fields.streamUrl', 'Stream URL')}
          <Text style={styles.required}>*</Text>
        </Text>
        <GlassInput
          placeholder="https://example.com/stream.m3u8"
          value={formData.stream_url || ''}
          onChangeText={(value) => onChange('stream_url', value)}
          editable={!disabled}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>
          {t('admin.content.editor.fields.streamType', 'Stream Type')}
        </Text>
        <View style={styles.buttonGroup}>
          {(['hls', 'dash'] as const).map((type) => (
            <GlassButton
              key={type}
              title={type.toUpperCase()}
              onPress={() => onChange('stream_type', type)}
              variant={formData.stream_type === type ? 'primary' : 'outline'}
              disabled={disabled}
              style={styles.button}
            />
          ))}
        </View>
      </View>

      <GlassCheckbox
        checked={formData.is_drm_protected || false}
        onChange={(checked) => onChange('is_drm_protected', checked)}
        label={t('admin.content.editor.fields.drmProtectedLabel', 'This content requires DRM protection')}
        disabled={disabled}
      />
    </GlassView>
  )
}

const styles = StyleSheet.create({
  section: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  formGroup: {
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  required: {
    color: colors.error.DEFAULT,
    marginLeft: spacing.xs,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  button: {
    flex: 1,
    minWidth: 100,
  },
})
