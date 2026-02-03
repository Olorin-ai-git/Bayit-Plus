/**
 * SeriesRulesPage
 * Manage active series recording rules
 */

import { useState, useEffect, useCallback } from 'react'
import { View, Text, FlatList, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Repeat } from 'lucide-react'
import { useDirection } from '@/hooks/useDirection'
import { recordingApi, SeriesRecordingRule } from '@/services/recordingApi'
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens'
import { GlassPageHeader, GlassEmptyState } from '@bayit/shared/ui'
import { SeriesRuleCard } from '@/components/recordings/SeriesRuleCard'
import { useNotifications } from '@olorin/glass-ui/hooks'
import logger from '@/utils/logger'

export default function SeriesRulesPage() {
  const { t } = useTranslation()
  const { isRTL, flexDirection, textAlign } = useDirection()
  const notifications = useNotifications()

  const [rules, setRules] = useState<SeriesRecordingRule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRules()
  }, [])

  const loadRules = async () => {
    try {
      setLoading(true)
      const data = await recordingApi.listSeriesRules()
      setRules(data)
    } catch (error) {
      logger.error('Failed to load series rules', 'SeriesRulesPage', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = useCallback((rule: SeriesRecordingRule) => {
    logger.debug('Edit series rule', 'SeriesRulesPage', { ruleId: rule.id })
    // Navigation to edit form handled by parent navigator
  }, [])

  const handleDelete = useCallback(async (ruleId: string) => {
    try {
      await recordingApi.deleteSeriesRule(ruleId)
      setRules(prev => prev.filter(r => r.id !== ruleId))
      notifications.showSuccess(
        t('recordings.ruleDeleted'),
        t('recordings.seriesRules')
      )
    } catch (error) {
      logger.error('Failed to delete rule', 'SeriesRulesPage', error)
      notifications.showError(
        t('recordings.ruleDeleteFailed'),
        t('recordings.error')
      )
    }
  }, [notifications, t])

  const handleToggleActive = useCallback(async (ruleId: string, isActive: boolean) => {
    try {
      const updated = await recordingApi.updateSeriesRule(ruleId, {})
      setRules(prev => prev.map(r =>
        r.id === ruleId ? { ...r, is_active: isActive } : r
      ))
      logger.info('Rule toggled', 'SeriesRulesPage', { ruleId, isActive })
    } catch (error) {
      logger.error('Failed to toggle rule', 'SeriesRulesPage', error)
    }
  }, [])

  const activeRules = rules.filter(r => r.is_active)
  const inactiveRules = rules.filter(r => !r.is_active)

  return (
    <View style={styles.container}>
      <GlassPageHeader
        title={t('recordings.seriesRules')}
        pageType="series-rules"
        badge={rules.length}
        isRTL={isRTL}
      />

      <View style={[styles.header, { flexDirection }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { textAlign }]}>
            {t('recordings.seriesRules')}
          </Text>
          <Text style={[styles.headerSubtitle, { textAlign }]}>
            {t('recordings.seriesRulesDesc')}
          </Text>
        </View>
      </View>

      {loading ? (
        <LoadingState
          message={t('recordings.loadingRules')}
          spinnerColor={colors.primary}
        />
      ) : rules.length === 0 ? (
        <GlassEmptyState
          variant="no-content"
          icon={<Repeat size={72} color={colors.textSecondary} strokeWidth={1.5} />}
          title={t('recordings.noSeriesRules')}
          description={t('recordings.noSeriesRulesHint')}
        />
      ) : (
        <FlatList
          data={[...activeRules, ...inactiveRules]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SeriesRuleCard
              rule={item}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
            />
          )}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            activeRules.length > 0 && inactiveRules.length > 0 ? (
              <View style={styles.sectionDivider}>
                <Text style={styles.sectionLabel}>
                  {t('recordings.activeRules')} ({activeRules.length})
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d1a',
  },
  header: {
    padding: spacing.xl,
    gap: spacing.lg,
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  listContent: {
    padding: spacing.lg,
  },
  sectionDivider: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
})
