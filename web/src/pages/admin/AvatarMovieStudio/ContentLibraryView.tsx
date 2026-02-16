/**
 * Content Library View
 *
 * Grid display of all VOD content with interactive moment status.
 */
import { useEffect } from 'react'
import { View, Text, Pressable, StyleSheet, TextInput } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Search, Filter, Play } from 'lucide-react'
import { GlassView, GlassButton } from '@bayit/shared/ui'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'
import { useDirection } from '@/hooks/useDirection'
import { useAvatarStudioStore } from '@/stores/avatarStudioStore'
import AdminLoadingState from '@/components/admin/shared/AdminLoadingState'

interface ContentLibraryViewProps {
  onOpenEditor: () => void
  disabled?: boolean
}

export default function ContentLibraryView({ onOpenEditor, disabled = false }: ContentLibraryViewProps) {
  const { t } = useTranslation()
  const { isRTL } = useDirection()
  const {
    movies,
    isLoading,
    error,
    statusFilter,
    searchQuery,
    loadMovies,
    setStatusFilter,
    setSearchQuery,
    selectMovie,
  } = useAvatarStudioStore()

  useEffect(() => {
    loadMovies()
  }, [])

  const handleMovieClick = (movieId: string) => {
    if (disabled) return
    selectMovie(movieId)
    onOpenEditor()
  }

  const statusBadges = {
    ready: { color: colors.success.DEFAULT, label: 'Ready' },
    in_progress: { color: colors.warning.DEFAULT, label: 'In Progress' },
    not_started: { color: colors.textMuted, label: 'Not Started' },
    needs_review: { color: colors.error.DEFAULT, label: 'Needs Review' },
  }

  if (isLoading) {
    return <AdminLoadingState message={t('common.loading', 'Loading...')} />
  }

  return (
    <View style={styles.container}>
      <View style={[styles.toolbar, isRTL && styles.toolbarRTL]}>
        <View style={styles.searchContainer}>
          <Search size={20} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, isRTL && styles.searchInputRTL]}
            placeholder={t('avatarStudio.searchPlaceholder', 'Search movies...')}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={[styles.filterButtons, isRTL && styles.filterButtonsRTL]}>
          {(['ready', 'in_progress', 'not_started'] as const).map((status) => (
            <GlassButton
              key={status}
              title={t(`avatarStudio.status.${status}`, statusBadges[status].label)}
              variant={statusFilter === status ? 'primary' : 'ghost'}
              onPress={() => setStatusFilter(statusFilter === status ? null : status)}
              size="small"
            />
          ))}
        </View>
      </View>

      {error && (
        <GlassView style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </GlassView>
      )}

      <View style={styles.grid}>
        {movies.map((movie) => {
          const status = statusBadges[movie.status]

          return (
            <Pressable
              key={movie.id}
              style={[styles.movieCard, disabled && styles.movieCardDisabled]}
              onPress={() => handleMovieClick(movie.id)}
              disabled={disabled}
            >
              <GlassView style={styles.movieCardContent}>
                {movie.poster_url && (
                  <View style={styles.posterContainer}>
                    <img
                      src={movie.poster_url}
                      alt={movie.title}
                      style={styles.poster}
                    />
                  </View>
                )}

                <View style={styles.movieInfo}>
                  <Text style={styles.movieTitle} numberOfLines={2}>
                    {movie.title}
                  </Text>
                  {movie.year && (
                    <Text style={styles.movieYear}>{movie.year}</Text>
                  )}

                  <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                    <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                    <Text style={[styles.statusText, { color: status.color }]}>
                      {t(`avatarStudio.status.${movie.status}`, status.label)}
                    </Text>
                  </View>

                  <Text style={styles.momentCount}>
                    {t('avatarStudio.momentCount', {
                      count: movie.moment_count,
                      defaultValue: `${movie.moment_count} moment(s)`,
                    })}
                  </Text>
                </View>

                <View style={styles.playIcon}>
                  <Play size={24} color={colors.primary.DEFAULT} />
                </View>
              </GlassView>
            </Pressable>
          )
        })}
      </View>

      {movies.length === 0 && !isLoading && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {searchQuery || statusFilter
              ? t('avatarStudio.noResults', 'No movies found')
              : t('avatarStudio.noMovies', 'No movies available')}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  toolbarRTL: {
    flexDirection: 'row-reverse',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glassDark,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: fontSize.base,
    color: colors.text,
  },
  searchInputRTL: {
    textAlign: 'right',
  },
  filterButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterButtonsRTL: {
    flexDirection: 'row-reverse',
  },
  errorBanner: {
    padding: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.error.DEFAULT + '20',
    borderRadius: borderRadius.md,
  },
  errorText: {
    color: colors.error.DEFAULT,
    fontSize: fontSize.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  movieCard: {
    width: 'calc(33.333% - 16px)',
    minWidth: 280,
  },
  movieCardDisabled: {
    opacity: 0.5,
  },
  movieCardContent: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    position: 'relative',
  },
  posterContainer: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  poster: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  movieInfo: {
    gap: spacing.xs,
  },
  movieTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  movieYear: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  momentCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  playIcon: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
  },
})
