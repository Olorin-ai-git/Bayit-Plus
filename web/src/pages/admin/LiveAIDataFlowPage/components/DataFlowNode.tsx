import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, Clock } from 'lucide-react'
import { GlassCard } from '@bayit/shared/ui'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'
import { useDirection } from '@/hooks/useDirection'
import type { DataFlowNodeConfig } from '../types'
import { CATEGORY_COLOR_MAP } from '../types'
import ExternalServiceBadge from './ExternalServiceBadge'

interface DataFlowNodeProps {
  node: DataFlowNodeConfig
}

const DataFlowNode: React.FC<DataFlowNodeProps> = ({ node }) => {
  const { t } = useTranslation()
  const { isRTL } = useDirection()
  const categoryColor = CATEGORY_COLOR_MAP[node.category]

  return (
    <GlassCard style={[styles.card, node.optional && styles.cardOptional]}>
      <View
        style={[
          styles.colorStrip,
          { backgroundColor: categoryColor },
          isRTL ? styles.colorStripRTL : styles.colorStripLTR,
        ]}
      />
      <View style={[styles.content, isRTL ? styles.contentRTL : styles.contentLTR]}>
        <View style={[styles.header, isRTL && styles.headerRTL]}>
          <View style={[styles.stepCircle, { backgroundColor: categoryColor }]}>
            <Text style={styles.stepNumber}>{node.stepNumber}</Text>
          </View>
          <Text style={[styles.title, isRTL && styles.textRTL]} numberOfLines={2}>
            {t(node.titleKey)}
          </Text>
          {node.latency && (
            <View style={styles.latencyBadge}>
              <Clock size={10} color={colors.textMuted} />
              <Text style={styles.latencyText}>{node.latency}</Text>
            </View>
          )}
        </View>
        <View style={styles.ioSection}>
          <View style={[styles.ioRow, isRTL && styles.ioRowRTL]}>
            <ArrowDown size={12} color={colors.info[400]} />
            <Text style={[styles.ioText, isRTL && styles.textRTL]}>{t(node.inputKey)}</Text>
          </View>
          <View style={[styles.ioRow, isRTL && styles.ioRowRTL]}>
            <ArrowUp size={12} color={colors.success[400]} />
            <Text style={[styles.ioText, isRTL && styles.textRTL]}>{t(node.outputKey)}</Text>
          </View>
        </View>
        {node.externalServices.length > 0 && (
          <View style={[styles.servicesRow, isRTL && styles.servicesRowRTL]}>
            {node.externalServices.map((svc) => (
              <ExternalServiceBadge key={svc} service={svc} />
            ))}
          </View>
        )}
      </View>
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glass,
    // @ts-ignore
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  },
  cardOptional: {
    borderStyle: 'dashed' as any,
    // @ts-ignore
    opacity: 0.85,
  },
  colorStrip: { width: 4 },
  colorStripLTR: { borderTopLeftRadius: borderRadius.lg, borderBottomLeftRadius: borderRadius.lg },
  colorStripRTL: { borderTopRightRadius: borderRadius.lg, borderBottomRightRadius: borderRadius.lg },
  content: { flex: 1, padding: spacing.md, gap: spacing.sm },
  contentLTR: { paddingLeft: spacing.md },
  contentRTL: { paddingRight: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerRTL: { flexDirection: 'row-reverse' },
  stepCircle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepNumber: { color: colors.white, fontSize: fontSize.xs, fontWeight: '700' },
  title: { flex: 1, color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  textRTL: { textAlign: 'right' },
  latencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.glassWhiteSubtle,
  },
  latencyText: { color: colors.textMuted, fontSize: fontSize.xs - 1, fontWeight: '500' },
  ioSection: { gap: 4 },
  ioRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ioRowRTL: { flexDirection: 'row-reverse' },
  ioText: { color: colors.textSecondary, fontSize: fontSize.xs, flex: 1 },
  servicesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  servicesRowRTL: { flexDirection: 'row-reverse' },
})

export default DataFlowNode
