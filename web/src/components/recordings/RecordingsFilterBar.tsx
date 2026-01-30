/**
 * RecordingsFilterBar
 * Filter pills (All/Manual/Scheduled/Series) + sort dropdown for recordings
 */

import React from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { SlidersHorizontal, ArrowDownAZ, ArrowUpAZ, Calendar, HardDrive } from 'lucide-react'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'
import { useDirection } from '@/hooks/useDirection'

export type RecordingFilter = 'all' | 'manual' | 'scheduled' | 'series'
export type RecordingSortField = 'date' | 'size' | 'duration' | 'title'
export type RecordingSortOrder = 'asc' | 'desc'

interface RecordingsFilterBarProps {
  activeFilter: RecordingFilter
  onFilterChange: (filter: RecordingFilter) => void
  sortField: RecordingSortField
  sortOrder: RecordingSortOrder
  onSortChange: (field: RecordingSortField) => void
  onSortOrderToggle: () => void
  totalCount: number
}

export const RecordingsFilterBar: React.FC<RecordingsFilterBarProps> = ({
  activeFilter,
  onFilterChange,
  sortField,
  sortOrder,
  onSortChange,
  onSortOrderToggle,
  totalCount,
}) => {
  const { t } = useTranslation()
  const { flexDirection } = useDirection()

  const filters: { key: RecordingFilter; label: string }[] = [
    { key: 'all', label: t('recordings.filterAll') },
    { key: 'manual', label: t('recordings.filterManual') },
    { key: 'scheduled', label: t('recordings.filterScheduled') },
    { key: 'series', label: t('recordings.filterSeries') },
  ]

  const sortOptions: { key: RecordingSortField; label: string }[] = [
    { key: 'date', label: t('recordings.sortDate') },
    { key: 'size', label: t('recordings.sortSize') },
    { key: 'duration', label: t('recordings.sortDuration') },
    { key: 'title', label: t('recordings.sortTitle') },
  ]

  const SortIcon = sortOrder === 'desc' ? ArrowDownAZ : ArrowUpAZ

  return (
    <View style={styles.container}>
      {/* Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filtersRow, { flexDirection }]}
      >
        {filters.map((filter) => {
          const isActive = activeFilter === filter.key
          return (
            <Pressable
              key={filter.key}
              style={[styles.filterPill, isActive && styles.filterPillActive]}
              onPress={() => onFilterChange(filter.key)}
            >
              <Text style={[
                styles.filterPillText,
                isActive && styles.filterPillTextActive,
              ]}>
                {filter.label}
              </Text>
            </Pressable>
          )
        })}

        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{totalCount}</Text>
        </View>
      </ScrollView>

      {/* Sort Controls */}
      <View style={[styles.sortRow, { flexDirection }]}>
        <SlidersHorizontal size={14} color={colors.textSecondary} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortOptions}
        >
          {sortOptions.map((option) => {
            const isActive = sortField === option.key
            return (
              <Pressable
                key={option.key}
                style={[styles.sortChip, isActive && styles.sortChipActive]}
                onPress={() => onSortChange(option.key)}
              >
                <Text style={[
                  styles.sortChipText,
                  isActive && styles.sortChipTextActive,
                ]}>
                  {option.label}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>

        <Pressable onPress={onSortOrderToggle} style={styles.sortOrderButton}>
          <SortIcon size={16} color={colors.text} />
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filtersRow: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterPillActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderColor: 'rgba(168, 85, 247, 0.5)',
  },
  filterPillText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  countBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
  },
  countBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.text,
  },
  sortRow: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  sortOptions: {
    flexDirection: 'row',
    gap: spacing.xs,
    flex: 1,
  },
  sortChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: 'transparent',
  },
  sortChipActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  sortChipText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  sortChipTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  sortOrderButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
})
