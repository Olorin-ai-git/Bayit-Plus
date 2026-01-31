import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ExternalLinkIcon } from 'lucide-react'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'
import type { ExternalService } from '../types'
import { EXTERNAL_SERVICE_CONFIGS } from '../types'

interface ExternalServiceBadgeProps {
  service: ExternalService
}

const ExternalServiceBadge: React.FC<ExternalServiceBadgeProps> = ({ service }) => {
  const { t } = useTranslation()
  const config = EXTERNAL_SERVICE_CONFIGS[service]
  const badgeColor = config.color

  return (
    <View style={[styles.badge, { borderColor: badgeColor }]}>
      <ExternalLinkIcon size={10} color={badgeColor} />
      <Text style={[styles.label, { color: badgeColor }]}>
        {t(config.labelKey)}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    backgroundColor: colors.glassWhiteFaint,
  },
  label: {
    fontSize: fontSize.xs - 1,
    fontWeight: '500',
  },
})

export default ExternalServiceBadge
