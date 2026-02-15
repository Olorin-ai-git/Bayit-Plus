import React from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import { colors } from '../../theme'

interface GlassCardProps {
  children: React.ReactNode
  style?: ViewStyle
}

export function GlassCard({ children, style }: GlassCardProps) {
  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
        style={styles.gradient}
      >
        {children}
      </LinearGradient>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  gradient: {
    padding: 16,
  },
})
