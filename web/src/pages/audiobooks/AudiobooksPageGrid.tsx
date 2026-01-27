/**
 * Audiobooks Page Grid
 * Responsive grid layout for audiobook display
 */

import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { GlassButton, GlassView } from '@bayit/shared/ui'
import type { Audiobook } from '@/types/audiobook'
import AudiobookCard from '@/components/AudiobookCard'

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  skeletonCard: {
    height: 280,
    borderRadius: borderRadius.lg,
    backgroundColor: `${colors.border}33`,
    overflow: 'hidden',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: `${colors.border}33`,
  },
  paginationButton: {
    padding: spacing.md,
  },
  pageInfo: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  loadingContainer: {
    marginVertical: spacing.lg,
  },
})

interface AudiobooksPageGridProps {
  audiobooks: Audiobook[]
  loading?: boolean
  numColumns?: number
  currentPage?: number
  onPageChange?: (page: number) => void
  isRTL?: boolean
}

export default function AudiobooksPageGrid({
  audiobooks,
  loading = false,
  numColumns = 3,
  currentPage = 1,
  onPageChange = () => {},
  isRTL = false,
}: AudiobooksPageGridProps) {
  const { t } = useTranslation()

  // Calculate responsive column width
  const calculateColumnWidth = () => {
    const totalGap = spacing.md * (numColumns - 1)
    const containerWidth = 100 // percentage
    return (containerWidth - (totalGap / 360) * 100) / numColumns
  }

  if (loading && audiobooks.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <View key={i} style={styles.skeletonCard} />
            ))}
        </View>
      </View>
    )
  }

  if (audiobooks.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {t('audiobooks.noResults', 'No audiobooks found. Try adjusting your filters.')}
          </Text>
          <GlassButton>
            {t('common.refresh', 'Refresh')}
          </GlassButton>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Grid */}
      <View style={styles.grid}>
        {audiobooks.map((book) => (
          <View
            key={book.id}
            style={{
              width: `${100 / numColumns}%`,
              paddingHorizontal: spacing.sm,
            }}
          >
            <AudiobookCard audiobook={book} />
          </View>
        ))}
      </View>

      {/* Pagination */}
      <GlassView style={styles.paginationContainer}>
        <Pressable
          style={styles.paginationButton}
          disabled={currentPage === 1}
          onPress={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft
            size={20}
            color={currentPage === 1 ? colors.textMuted : colors.text}
          />
        </Pressable>

        <Text style={styles.pageInfo}>
          {t('common.page', 'Page')} {currentPage}
        </Text>

        <Pressable
          style={styles.paginationButton}
          onPress={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight size={20} color={colors.text} />
        </Pressable>
      </GlassView>
    </View>
  )
}
