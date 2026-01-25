import { ReactNode } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { X } from 'lucide-react'
import { GlassButton } from '@bayit/shared/ui'
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens'

interface AdminBatchActionBarProps {
  selectedCount: number
  onClearSelection: () => void
  actions: Array<{
    label: string
    icon?: ReactNode
    onPress: () => void
    variant?: 'primary' | 'secondary' | 'danger'
    disabled?: boolean
  }>
  isRTL?: boolean
}

export default function AdminBatchActionBar({
  selectedCount,
  onClearSelection,
  actions,
  isRTL = false,
}: AdminBatchActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <View style={[styles.container, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <View style={[styles.leftSection, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={styles.countText}>
          {selectedCount} selected
        </Text>

        <GlassButton
          title="Clear"
          onPress={onClearSelection}
          variant="ghost"
          icon={<X size={16} />}
          size="sm"
        />
      </View>

      <View style={[styles.actionsSection, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {actions.map((action, index) => (
          <GlassButton
            key={index}
            title={action.label}
            onPress={action.onPress}
            variant={action.variant || 'secondary'}
            icon={action.icon}
            disabled={action.disabled}
            size="sm"
          />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.glass.bg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  countText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  actionsSection: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
})
