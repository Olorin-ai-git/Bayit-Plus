import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { GlassView, GlassButton } from '@bayit/shared/ui'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'
import type { Content } from '@/types/content'

interface AccessControlSectionProps {
  formData: Partial<Content>
  onChange: (field: string, value: any) => void
  disabled?: boolean
}

export default function AccessControlSection({
  formData,
  onChange,
  disabled,
}: AccessControlSectionProps) {
  const { t } = useTranslation()

  return (
    <GlassView style={styles.section} intensity="high">
      <Text style={styles.sectionTitle}>
        {t('admin.content.editor.sections.accessControl', 'Access Control')}
      </Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>
          {t('admin.content.editor.fields.requiredSubscription', 'Required Subscription')}
        </Text>
        <View style={styles.buttonGroup}>
          {(['basic', 'premium', 'family'] as const).map((sub) => (
            <GlassButton
              key={sub}
              title={t(
                `admin.content.editor.subscriptionTiers.${sub}`,
                sub.charAt(0).toUpperCase() + sub.slice(1)
              )}
              onPress={() => onChange('requires_subscription', sub)}
              variant={formData.requires_subscription === sub ? 'primary' : 'outline'}
              disabled={disabled}
              style={styles.button}
            />
          ))}
        </View>
      </View>
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
