import { useState, useEffect, useCallback } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { RefreshCw, Languages, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react'
import { GlassButton, GlassPageHeader } from '@bayit/shared/ui'
import { GlassTable } from '@bayit/shared/ui/web'
import { adminPodcastEpisodesService, FailedTranslationItem, TranslationStatusResponse } from '@/services/adminApi'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { useDirection } from '@/hooks/useDirection'
import { ADMIN_PAGE_CONFIG } from '../../../../shared/utils/adminConstants'
import logger from '@/utils/logger'
import type { PaginatedResponse } from '@/types/content'

const REFRESH_INTERVAL_MS = 30000 // 30 seconds auto-refresh

interface StatCardProps {
  title: string
  count: number
  icon: React.ReactNode
  color: string
  bgColor: string
}

function StatCard({ title, count, icon, color, bgColor }: StatCardProps) {
  return (
    <View style={[styles.statCard, { backgroundColor: bgColor }]}>
      <View style={[styles.statIconContainer, { backgroundColor: color }]}>{icon}</View>
      <Text style={[styles.statCount, { color }]}>{count}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  )
}

export default function TranslationDashboardPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { isRTL, textAlign, flexDirection } = useDirection()
  const [stats, setStats] = useState<TranslationStatusResponse | null>(null)
  const [failedItems, setFailedItems] = useState<FailedTranslationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 })

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true)
    setError(null)
    try {
      const [statusResponse, failedResponse] = await Promise.all([
        adminPodcastEpisodesService.getTranslationStatus(),
        adminPodcastEpisodesService.getFailedTranslations({
          page: pagination.page,
          page_size: pagination.pageSize,
        }),
      ])
      setStats(statusResponse)
      setFailedItems(failedResponse.items || [])
      setPagination((prev) => ({ ...prev, total: failedResponse.total || 0 }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load translation data'
      logger.error(msg, 'TranslationDashboardPage', err)
      setError(msg)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [pagination.page, pagination.pageSize])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadData(false)
    }, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [loadData])

  const handleRefresh = () => {
    setIsRefreshing(true)
    loadData(false)
  }

  const handleRetry = async (item: FailedTranslationItem) => {
    try {
      await adminPodcastEpisodesService.triggerTranslation(item.podcast_id, item.id)
      await loadData(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to retry translation'
      logger.error(msg, 'TranslationDashboardPage', err)
      setError(msg)
    }
  }

  const columns = [
    {
      key: 'title',
      label: t('admin.translation.columns.episodeTitle', 'Episode'),
      render: (title: string) => <Text style={styles.cellText}>{title}</Text>,
    },
    {
      key: 'podcast_title',
      label: t('admin.translation.columns.podcast', 'Podcast'),
      render: (podcastTitle: string) => <Text style={styles.cellText}>{podcastTitle}</Text>,
    },
    {
      key: 'retry_count',
      label: t('admin.translation.columns.retries', 'Retries'),
      width: 100,
      render: (retryCount: number, item: FailedTranslationItem) => (
        <Text style={[styles.cellText, { color: retryCount >= item.max_retries ? '#ef4444' : colors.textSecondary }]}>
          {retryCount}/{item.max_retries}
        </Text>
      ),
    },
    {
      key: 'updated_at',
      label: t('admin.translation.columns.lastAttempt', 'Last Attempt'),
      width: 150,
      render: (date: string) => (
        <Text style={styles.cellText}>{new Date(date).toLocaleString()}</Text>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: 120,
      render: (_: unknown, item: FailedTranslationItem) => (
        <View style={[styles.actionsCell, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <GlassButton
            variant="primary"
            size="sm"
            onPress={() => handleRetry(item)}
            disabled={item.retry_count >= item.max_retries}
            icon={<RefreshCw size={14} color={colors.text} />}
            accessibilityLabel={t('admin.translation.retryTranslation', { defaultValue: 'Retry translation' })}
          >
            {t('admin.translation.retry', 'Retry')}
          </GlassButton>
          <GlassButton
            variant="secondary"
            size="sm"
            onPress={() => navigate(`/admin/podcasts/${item.podcast_id}/episodes`)}
            accessibilityLabel={t('admin.translation.viewEpisodes', { defaultValue: 'View episodes' })}
          >
            {t('admin.translation.view', 'View')}
          </GlassButton>
        </View>
      ),
    },
  ]

  const pageConfig = ADMIN_PAGE_CONFIG.translation;
  const IconComponent = pageConfig.icon;
  const totalTranslations = (stats?.pending || 0) + (stats?.processing || 0) + (stats?.completed || 0) + (stats?.failed || 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <GlassPageHeader
        title={t('admin.translation.title', 'Translation Dashboard')}
        subtitle={t('admin.translation.subtitle', 'Monitor podcast episode translations')}
        icon={<IconComponent size={24} color={pageConfig.iconColor} strokeWidth={2} />}
        iconColor={pageConfig.iconColor}
        iconBackgroundColor={pageConfig.iconBackgroundColor}
        badge={totalTranslations}
        isRTL={isRTL}
        action={
          <GlassButton
            variant="secondary"
            onPress={handleRefresh}
            disabled={isRefreshing}
            icon={<RefreshCw size={18} color="white" style={isRefreshing ? styles.rotating : undefined} />}
            accessibilityLabel={t('common.refreshData', { defaultValue: 'Refresh data' })}
          >
            {isRefreshing ? t('common.refreshing') : t('common.refresh', 'Refresh')}
          </GlassButton>
        }
      />

      {error && (
        <View style={styles.errorContainer}>
          <AlertCircle size={18} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Stats Cards */}
      <View style={[styles.statsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <StatCard
          title={t('admin.translation.stats.pending', 'Pending')}
          count={stats?.pending || 0}
          icon={<Clock size={20} color="white" />}
          color="#f59e0b"
          bgColor="rgba(245, 158, 11, 0.1)"
        />
        <StatCard
          title={t('admin.translation.stats.processing', 'Processing')}
          count={stats?.processing || 0}
          icon={<RefreshCw size={20} color="white" />}
          color="#3b82f6"
          bgColor="rgba(59, 130, 246, 0.1)"
        />
        <StatCard
          title={t('admin.translation.stats.completed', 'Completed')}
          count={stats?.completed || 0}
          icon={<CheckCircle size={20} color="white" />}
          color="#10b981"
          bgColor="rgba(16, 185, 129, 0.1)"
        />
        <StatCard
          title={t('admin.translation.stats.failed', 'Failed')}
          count={stats?.failed || 0}
          icon={<XCircle size={20} color="white" />}
          color="#ef4444"
          bgColor="rgba(239, 68, 68, 0.1)"
        />
      </View>

      {/* Failed Episodes Table */}
      <View style={styles.section}>
        <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Languages size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>
            {t('admin.translation.failedEpisodes', 'Failed Translations')}
          </Text>
        </View>
        <GlassTable
          columns={columns}
          data={failedItems}
          loading={isLoading}
          pagination={pagination}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          emptyMessage={t('admin.translation.noFailed', 'No failed translations')}
          isRTL={isRTL}
        />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg },
  header: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  pageTitle: { color: colors.text, fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: colors.textSecondary, fontSize: 14, marginTop: spacing.xs },
  rotating: { transform: [{ rotate: '360deg' }] },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  errorText: { flex: 1, color: '#ef4444', fontSize: 14 },
  statsGrid: {
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    minWidth: 180,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statCount: { fontSize: 32, fontWeight: 'bold', marginBottom: spacing.xs },
  statTitle: { color: colors.textSecondary, fontSize: 14 },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  sectionHeader: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '600' },
  cellText: { color: colors.text, fontSize: 14 },
  actionsCell: { gap: spacing.sm },
})
