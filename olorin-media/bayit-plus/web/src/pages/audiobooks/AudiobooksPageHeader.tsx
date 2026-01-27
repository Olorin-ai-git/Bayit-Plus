/**
 * Audiobooks Page Header
 * Title and description header for discovery page
 */

import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors, spacing } from '@olorin/design-tokens'

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.border}33`,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: `${colors.border}33`,
  },
  stat: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary.DEFAULT,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
})

interface AudiobooksPageHeaderProps {
  totalCount?: number
  lastUpdated?: string
}

export default function AudiobooksPageHeader({
  totalCount = 0,
  lastUpdated,
}: AudiobooksPageHeaderProps) {
  const { t } = useTranslation()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {t('audiobooks.title', 'Audiobooks')}
      </Text>
      <Text style={styles.description}>
        {t('audiobooks.description', 'Discover audiobooks from around the world')}
      </Text>

      {totalCount > 0 && (
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{totalCount}</Text>
            <Text style={styles.statLabel}>
              {t('audiobooks.available', 'Available')}
            </Text>
          </View>
          {lastUpdated && (
            <View style={styles.stat}>
              <Text style={styles.statValue}>✓</Text>
              <Text style={styles.statLabel}>
                {t('common.lastUpdated', 'Updated')}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  )
}
