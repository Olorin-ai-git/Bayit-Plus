/**
 * SeriesRuleCard
 * Display card for a series recording rule
 */

import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  Repeat, Trash2, Edit3, Subtitles, Volume2,
  Pause, Play, Hash, Radio
} from 'lucide-react'
import { GlassView } from '@bayit/shared/ui'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'
import { useDirection } from '@/hooks/useDirection'
import { SeriesRecordingRule } from '@/services/recordingApi'
import { useNotifications } from '@olorin/glass-ui/hooks'
import logger from '@/utils/logger'

interface SeriesRuleCardProps {
  rule: SeriesRecordingRule
  onEdit: (rule: SeriesRecordingRule) => void
  onDelete: (ruleId: string) => void
  onToggleActive: (ruleId: string, isActive: boolean) => void
}

export const SeriesRuleCard: React.FC<SeriesRuleCardProps> = ({
  rule,
  onEdit,
  onDelete,
  onToggleActive,
}) => {
  const { t } = useTranslation()
  const { flexDirection, textAlign } = useDirection()
  const notifications = useNotifications()
  const [isHovered, setIsHovered] = useState(false)

  const handleDelete = () => {
    notifications.show({
      level: 'warning',
      title: t('recordings.deleteRule'),
      message: t('recordings.confirmDeleteRule'),
      action: {
        label: t('common.delete'),
        type: 'action' as const,
        onPress: () => {
          logger.info('Series rule deletion confirmed', 'SeriesRuleCard', { ruleId: rule.id })
          onDelete(rule.id)
        },
      },
      dismissable: true,
    })
  }

  const scopeLabel = {
    episode: t('recordings.thisEpisode'),
    season: t('recordings.thisSeason'),
    all_seasons: t('recordings.allSeasons'),
  }[rule.scope]

  const matchTypeLabel = {
    exact: t('recordings.matchExact'),
    contains: t('recordings.matchContains'),
    starts_with: t('recordings.matchStartsWith'),
  }[rule.match_type]

  return (
    <GlassView
      style={[styles.card, !rule.is_active && styles.cardInactive]}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <View style={[styles.header, { flexDirection }]}>
        <View style={[styles.iconContainer, !rule.is_active && styles.iconInactive]}>
          <Repeat size={20} color={rule.is_active ? colors.text : colors.textMuted} />
        </View>
        <View style={styles.headerContent}>
          <Text style={[styles.ruleName, { textAlign }]} numberOfLines={1}>
            {rule.rule_name}
          </Text>
          <Text style={[styles.matchTitle, { textAlign }]} numberOfLines={1}>
            {matchTypeLabel}: &ldquo;{rule.match_title}&rdquo;
          </Text>
        </View>
      </View>

      {/* Badges */}
      <View style={[styles.badges, { flexDirection }]}>
        <View style={styles.badge}>
          <Radio size={12} color={colors.textSecondary} />
          <Text style={styles.badgeText}>{scopeLabel}</Text>
        </View>

        {rule.subtitle_enabled && (
          <View style={styles.badge}>
            <Subtitles size={12} color={colors.textSecondary} />
            <Text style={styles.badgeText}>
              {rule.subtitle_target_language?.toUpperCase()}
            </Text>
          </View>
        )}

        {rule.dubbing_enabled && (
          <View style={styles.badge}>
            <Volume2 size={12} color={colors.textSecondary} />
            <Text style={styles.badgeText}>
              {rule.dubbing_target_language?.toUpperCase()}
            </Text>
          </View>
        )}

        {rule.max_recordings > 0 && (
          <View style={styles.badge}>
            <Hash size={12} color={colors.textSecondary} />
            <Text style={styles.badgeText}>
              {rule.recordings_count}/{rule.max_recordings}
            </Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={[styles.statsRow, { flexDirection }]}>
        <Text style={styles.statsText}>
          {t('recordings.recordingsCount', { count: rule.recordings_count })}
        </Text>
        {rule.last_matched_at && (
          <Text style={styles.statsText}>
            {t('recordings.lastMatched')}: {new Date(rule.last_matched_at).toLocaleDateString()}
          </Text>
        )}
      </View>

      {/* Actions */}
      <View style={[styles.actions, { flexDirection }]}>
        <Pressable
          onPress={() => onToggleActive(rule.id, !rule.is_active)}
          style={[styles.actionButton, styles.toggleButton]}
        >
          {rule.is_active ? (
            <Pause size={14} color={colors.textSecondary} />
          ) : (
            <Play size={14} color={colors.primary} />
          )}
          <Text style={styles.actionButtonText}>
            {rule.is_active ? t('recordings.pauseRule') : t('recordings.resumeRule')}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onEdit(rule)}
          style={[styles.actionButton, styles.editButton]}
        >
          <Edit3 size={14} color={colors.text} />
        </Pressable>

        <Pressable onPress={handleDelete} style={[styles.actionButton, styles.deleteButton]}>
          <Trash2 size={14} color={colors.error} />
        </Pressable>
      </View>
    </GlassView>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardInactive: {
    opacity: 0.6,
  },
  header: {
    gap: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerContent: {
    flex: 1,
  },
  ruleName: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  matchTitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  badges: {
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  badgeText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statsRow: {
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  statsText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  actions: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  toggleButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  deleteButton: {
    backgroundColor: `${colors.error}15`,
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
  },
})
