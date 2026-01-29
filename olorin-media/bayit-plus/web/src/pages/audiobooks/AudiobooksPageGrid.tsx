/**
 * Audiobooks Page Grid
 * Responsive grid layout for audiobook display
 */

import { View, Text, StyleSheet, FlatList, Pressable, useWindowDimensions } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Book } from 'lucide-react'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { GlassButton, GlassView, GlassCard } from '@bayit/shared/ui'
import type { Audiobook } from '@/types/audiobook'
import AudiobookCard from '@/components/AudiobookCard'

const styles = StyleSheet.create({
  skeletonContainer: {
    flex: 1,
    minWidth: 150,
    maxWidth: '20%',
    marginHorizontal: 4,
  },
  skeletonCard: {
    aspectRatio: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 3,
  },
  emptyCard: {
    padding: spacing.xl * 1.5,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  gridContainer: {
    gap: 16,
  },
  columnWrapper: {
    gap: 16,
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
})

interface AudiobooksPageGridProps {
  audiobooks: Audiobook[]
  loading?: boolean
  currentPage?: number
  onPageChange?: (page: number) => void
  searchQuery?: string
}

// Skeleton Loading Card
function SkeletonCard() {
  return (
    <View style={styles.skeletonContainer}>
      <View style={styles.skeletonCard} />
    </View>
  )
}

// Empty State Component
function EmptyState({ searchQuery }: { searchQuery?: string }) {
  const { t } = useTranslation()

  return (
    <View style={styles.emptyContainer}>
      <GlassCard style={styles.emptyCard}>
        <Book size={64} color={colors.textMuted} />
        {searchQuery ? (
          <>
            <Text style={styles.emptyTitle}>{t('common.noResults')}</Text>
            <Text style={styles.emptyMessage}>{t('common.tryDifferentSearch')}</Text>
          </>
        ) : (
          <>
            <Text style={styles.emptyTitle}>{t('audiobooks.noAudiobooks')}</Text>
            <Text style={styles.emptyMessage}>{t('audiobooks.tryLater')}</Text>
          </>
        )}
      </GlassCard>
    </View>
  )
}

export default function AudiobooksPageGrid({
  audiobooks,
  loading = false,
  currentPage = 1,
  onPageChange = () => {},
  searchQuery = '',
}: AudiobooksPageGridProps) {
  const { t } = useTranslation()
  const { width } = useWindowDimensions()

  const numColumns = width >= 1280 ? 5 : width >= 1024 ? 4 : width >= 768 ? 3 : 2

  if (loading) {
    return (
      <View style={[styles.gridContainer, { flexDirection: 'row', flexWrap: 'wrap' }]}>
        {[...Array(10)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </View>
    )
  }

  return (
    <>
      <FlatList
        data={audiobooks}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        key={numColumns}
        contentContainerStyle={styles.gridContainer}
        columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
        renderItem={({ item }) => (
          <View style={{ flex: 1, maxWidth: `${100 / numColumns}%` }}>
            <AudiobookCard audiobook={item} />
          </View>
        )}
        ListEmptyComponent={<EmptyState searchQuery={searchQuery} />}
      />

      {/* Pagination */}
      {audiobooks.length > 0 && (
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
      )}
    </>
  )
}
