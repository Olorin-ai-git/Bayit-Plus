import { View, Text, StyleSheet } from 'react-native'
import { GlassLoadingSpinner } from '@bayit/shared/ui'
import { colors, spacing, fontSize } from '@olorin/design-tokens'

interface AdminLoadingStateProps {
  message?: string
  isRTL?: boolean
}

export default function AdminLoadingState({
  message,
  isRTL = false,
}: AdminLoadingStateProps) {
  return (
    <View style={styles.container}>
      <GlassLoadingSpinner size="large" />
      {message && (
        <Text style={[styles.message, { textAlign: isRTL ? 'right' : 'left' }]}>
          {message}
        </Text>
      )}
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
  message: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    marginTop: spacing.lg,
  },
})
