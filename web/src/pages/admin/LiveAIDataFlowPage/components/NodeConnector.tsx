import React from 'react'
import { View, StyleSheet } from 'react-native'
import { colors, spacing } from '@olorin/design-tokens'
import { ChevronDown } from 'lucide-react'

interface NodeConnectorProps {
  isRTL?: boolean
}

const NodeConnector: React.FC<NodeConnectorProps> = ({ isRTL = false }) => {
  return (
    <View style={[styles.container, isRTL && styles.containerRTL]}>
      <View style={styles.line} />
      <ChevronDown size={16} color={colors.textMuted} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
  },
  containerRTL: {
    alignSelf: 'center',
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: colors.glassBorder,
  },
})

export default NodeConnector
