import { ReactNode } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Inbox } from 'lucide-react'
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens'

interface AdminEmptyStateProps {
  icon?: ReactNode
  title: string
  message?: string
  action?: ReactNode
  isRTL?: boolean
}

export default function AdminEmptyState({
  icon,
  title,
  message,
  action,
  isRTL = false,
}: AdminEmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.glassContainer}>
        <View style={styles.iconContainer}>
          {icon || <Inbox size={48} color={colors.text.secondary} />}
        </View>

        <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>
          {title}
        </Text>

        {message && (
          <Text style={[styles.message, { textAlign: isRTL ? 'right' : 'left' }]}>
            {message}
          </Text>
        )}

        {action && (
          <View style={styles.actionContainer}>
            {action}
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  glassContainer: {
    backgroundColor: colors.glass.bg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: spacing.xl,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  iconContainer: {
    marginBottom: spacing.lg,
    opacity: 0.6,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  actionContainer: {
    marginTop: spacing.md,
  },
})
