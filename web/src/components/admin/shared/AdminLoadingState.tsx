import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { colors, spacing, fontSize } from '@olorin/design-tokens'

interface AdminLoadingStateProps {
  message?: string
  isRTL?: boolean
}

export default function AdminLoadingState({
  message = 'Loading...',
  isRTL = false,
}: AdminLoadingStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.loadingSpinner}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
      <Text style={[styles.loadingText, { textAlign: isRTL ? 'right' : 'left' }]}>
        {message}
      </Text>
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
  loadingSpinner: {
    marginBottom: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
})
