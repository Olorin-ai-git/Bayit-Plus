import { useState, useEffect, useCallback } from 'react'
import { View, Text, Pressable, ScrollView, Image } from 'react-native';
import { useTranslation } from 'react-i18next'
import { Star, X, AlertCircle, RefreshCw, GripVertical, Film, Tv, Save } from 'lucide-react'
import { adminContentService, Content } from '@/services/adminApi'
import { GlassReorderableList } from '@bayit/shared/ui'
import { GlassCard, GlassButton, GlassSelect } from '@bayit/shared/ui'
import { useDirection } from '@/hooks/useDirection'
import { useNotifications } from '@olorin/glass-ui/hooks'
import logger from '@/utils/logger'
import { spacing, colors, borderRadius } from '@olorin/design-tokens'

type ContentType = 'all' | 'movie' | 'series'

export default function FeaturedManagementPage() {
  const { t } = useTranslation()
  const { isRTL } = useDirection()
  const notifications = useNotifications()
  const [items, setItems] = useState<Content[]>([])
  const [originalItems, setOriginalItems] = useState<Content[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<ContentType>('all')
  const [hasChanges, setHasChanges] = useState(false)

  const loadFeaturedContent = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await adminContentService.getContent({
        is_featured: true,
        page_size: 100,
      })
      const sortedItems = (response.items || []).sort((a, b) =>
        (a.featured_order ?? 999) - (b.featured_order ?? 999)
      )
      setItems(sortedItems)
      setOriginalItems(sortedItems)
      setHasChanges(false)
    } catch (err: unknown) {
      const errorObj = err as { detail?: string; message?: string }
      let msg = 'Failed to load featured content'
      if (errorObj?.detail) {
        msg = errorObj.detail
      } else if (errorObj?.message) {
        msg = errorObj.message
      }
      logger.error(msg, 'FeaturedManagementPage', err)
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFeaturedContent()
  }, [loadFeaturedContent])

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    setItems(prevItems => {
      const newItems = [...prevItems]
      const [removed] = newItems.splice(fromIndex, 1)
      newItems.splice(toIndex, 0, removed)
      return newItems
    })
    setHasChanges(true)
  }, [])

  const handleSaveOrder = async () => {
    setIsSaving(true)
    setError(null)
    try {
      // Update each item with its new order
      const updatePromises = items.map((item, index) =>
        adminContentService.updateContent(item.id, { featured_order: index })
      )
      await Promise.all(updatePromises)
      setOriginalItems(items)
      setHasChanges(false)
    } catch (err: unknown) {
      const errorObj = err as { detail?: string; message?: string }
      let msg = 'Failed to save order'
      if (errorObj?.detail) {
        msg = errorObj.detail
      } else if (errorObj?.message) {
        msg = errorObj.message
      }
      logger.error(msg, 'FeaturedManagementPage', err)
      setError(msg)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveFromFeatured = (item: Content) => {
    notifications.show({
      level: 'warning',
      message: t('admin.featured.confirmUnfeature', 'Remove from featured?'),
      dismissable: true,
      action: {
        label: t('admin.featured.remove', 'Remove'),
        type: 'action',
        onPress: async () => {
          try {
            await adminContentService.featureContent(item.id)
            await loadFeaturedContent()
          } catch (err: unknown) {
            const errorObj = err as { detail?: string; message?: string }
            const msg = errorObj?.message || 'Failed to remove from featured'
            logger.error(msg, 'FeaturedManagementPage', err)
            setError(msg)
          }
        },
      },
    })
  }

  const filteredItems = items.filter(item => {
    if (filterType === 'all') return true
    // Determine if item is a series or movie based on stream_type or other indicators
    const isSeries = item.stream_type === 'series' || Boolean(item.genre?.includes('Series'))
    if (filterType === 'series') return isSeries
    if (filterType === 'movie') return !isSeries
    return true
  })

  const renderItem = (item: Content, index: number, isDragging: boolean) => (
    <GlassCard
      style={[
        styles.itemCard,
        isDragging && styles.itemCardDragging,
      ]}
    >
      <View style={[styles.itemContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {/* Drag Handle */}
        <View style={styles.dragHandle} data-drag-handle="true">
          <GripVertical size={20} color={colors.textMuted} />
        </View>

        {/* Order Badge */}
        <View style={styles.orderBadge}>
          <Text style={styles.orderText}>{index + 1}</Text>
        </View>

        {/* Thumbnail */}
        <View style={styles.thumbnailContainer}>
          {item.thumbnail ? (
            <Image
              source={{ uri: item.thumbnail }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Film size={24} color={colors.textMuted} />
            </View>
          )}
        </View>

        {/* Content Info */}
        <View style={[styles.itemInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.itemTitle, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={[styles.metaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {/* Type Badge */}
            <View style={[
              styles.typeBadge,
              item.stream_type === 'series' ? styles.seriesBadge : styles.movieBadge
            ]}>
              {item.stream_type === 'series' ? (
                <Tv size={12} color={colors.text} />
              ) : (
                <Film size={12} color={colors.text} />
              )}
              <Text style={styles.typeText}>
                {item.stream_type === 'series' ? t('common.series', 'Series') : t('common.movie', 'Movie')}
              </Text>
            </View>
            {item.category_name && (
              <Text style={styles.categoryText}>{item.category_name}</Text>
            )}
            {item.year && (
              <Text style={styles.yearText}>{item.year}</Text>
            )}
          </View>
        </View>

        {/* Remove Button */}
        <Pressable
          onPress={() => handleRemoveFromFeatured(item)}
          style={({ hovered }: { hovered?: boolean }) => [
            styles.removeButton,
            hovered && styles.removeButtonHovered,
          ]}
        >
          <X size={18} color={colors.error} />
        </Pressable>
      </View>
    </GlassCard>
  )

  return (
    <ScrollView className="flex-1">
      <View style={styles.content}>
        {/* Header */}
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={{ flex: 1 }}>
            <View style={[styles.titleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Star size={28} color={colors.warning} fill={colors.warning} />
              <Text style={[styles.pageTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('admin.featured.title', 'Featured Content')}
              </Text>
            </View>
            <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('admin.featured.subtitle', 'Manage carousel order by dragging items')}
            </Text>
          </View>
          <View style={[styles.headerActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <GlassButton
              title=""
              onPress={loadFeaturedContent}
              variant="ghost"
              icon={<RefreshCw size={20} color="rgba(255,255,255,0.8)" />}
              disabled={isLoading}
              style={styles.iconButton}
            />
            {hasChanges && (
              <GlassButton
                title={t('common.save', 'Save')}
                onPress={handleSaveOrder}
                variant="primary"
                icon={<Save size={18} color="#fff" />}
                loading={isSaving}
                style={styles.saveButton}
              />
            )}
          </View>
        </View>

        {/* Unsaved Changes Warning */}
        {hasChanges && (
          <View style={styles.warningBanner}>
            <AlertCircle size={18} color={colors.warning} />
            <Text style={styles.warningText}>
              {t('admin.featured.unsavedChanges', 'You have unsaved changes')}
            </Text>
          </View>
        )}

        {/* Filters */}
        <View style={[styles.filtersContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.filterWrapper}>
            <GlassSelect
              placeholder={t('common.all', 'All')}
              value={filterType}
              onChange={(value) => setFilterType(value as ContentType)}
              options={[
                { value: 'all', label: t('common.all', 'All') },
                { value: 'movie', label: t('common.movies', 'Movies') },
                { value: 'series', label: t('common.series', 'Series') },
              ]}
            />
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {t('admin.featured.count', { count: filteredItems.length, defaultValue: '{{count}} items' })}
            </Text>
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <AlertCircle size={18} color="#ef4444" />
            <Text className="flex-1 text-red-500 text-sm">{error}</Text>
            <Pressable onPress={() => setError(null)}>
              <X size={18} color="#ef4444" />
            </Pressable>
          </View>
        )}

        {/* Content List */}
        {isLoading ? (
          <View className="flex-1 justify-center items-center gap-2">
            <Text className="text-sm text-gray-400">{t('common.loading', 'Loading...')}</Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Star size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {t('admin.featured.empty', 'No featured content')}
            </Text>
            <Text style={styles.emptyHint}>
              {t('admin.featured.emptyHint', 'Add content to featured from the Content Library')}
            </Text>
          </View>
        ) : (
          <GlassReorderableList
            items={filteredItems}
            onReorder={handleReorder}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            style={styles.list}
          />
        )}
      </View>
    </ScrollView>
  )
}

