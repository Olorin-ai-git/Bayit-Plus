import { ReactNode } from 'react'
import { View, StyleSheet } from 'react-native'
import { GlassPageHeader, GlassLoadingSpinner } from '@bayit/shared/ui'
import { useNotifications } from '@olorin/glass-ui/hooks'
import { spacing, colors, borderRadius } from '@olorin/design-tokens'

interface AdminPageLayoutProps {
  title: string
  subtitle?: string
  icon?: ReactNode
  badge?: number
  action?: ReactNode
  loading?: boolean
  error?: string | null
  success?: string | null
  onErrorDismiss?: () => void
  onSuccessDismiss?: () => void
  children: ReactNode
  isRTL: boolean
}

export default function AdminPageLayout({
  title,
  subtitle,
  icon,
  badge,
  action,
  loading,
  error,
  success,
  onErrorDismiss,
  onSuccessDismiss,
  children,
  isRTL,
}: AdminPageLayoutProps) {
  const { showNotification } = useNotifications()

  // Show error notification if error prop changes
  if (error && onErrorDismiss) {
    showNotification({
      type: 'error',
      message: error,
      duration: 5000,
    })
    onErrorDismiss()
  }

  // Show success notification if success prop changes
  if (success && onSuccessDismiss) {
    showNotification({
      type: 'success',
      message: success,
      duration: 3000,
    })
    onSuccessDismiss()
  }

  return (
    <View style={[styles.container, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <View style={styles.content}>
        <GlassPageHeader
          title={title}
          subtitle={subtitle}
          icon={icon}
          badge={badge}
          action={action}
          isRTL={isRTL}
        />

        {loading ? (
          <View style={styles.loadingContainer}>
            <GlassLoadingSpinner size="large" />
          </View>
        ) : (
          children
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
})
