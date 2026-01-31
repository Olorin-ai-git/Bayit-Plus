import React from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { spacing } from '@olorin/design-tokens'
import { useDirection } from '@/hooks/useDirection'
import type { DataFlowNodeConfig } from '../types'
import DataFlowNode from './DataFlowNode'
import NodeConnector from './NodeConnector'

interface DataFlowPipelineProps {
  nodes: DataFlowNodeConfig[]
}

const DataFlowPipeline: React.FC<DataFlowPipelineProps> = ({ nodes }) => {
  const { isRTL } = useDirection()

  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pipeline}>
        {nodes.map((node, index) => (
          <React.Fragment key={node.id}>
            <DataFlowNode node={node} />
            {index < nodes.length - 1 && (
              <NodeConnector isRTL={isRTL} />
            )}
          </React.Fragment>
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing.xl,
  },
  pipeline: {
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%' as any,
    paddingHorizontal: spacing.md,
  },
})

export default DataFlowPipeline
