import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Plus, Send, Eye, Mail } from 'lucide-react';
import { marketingService } from '@/services/adminApi';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { GlassCard, GlassButton, GlassInput, GlassModal, GlassPageHeader } from '@bayit/shared/ui';
import { ADMIN_PAGE_CONFIG } from '../../../../shared/utils/adminConstants';
import { useDirection } from '@/hooks/useDirection';
import { useNotifications } from '@olorin/glass-ui/hooks';
import StatCard from '@/components/admin/StatCard';
import logger from '@/utils/logger';

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  recipients_count: number;
  sent_count?: number;
  opened_count?: number;
  clicked_count?: number;
  scheduled_at?: string;
  sent_at?: string;
  created_at: string;
}

interface EmailCampaignStats {
  total: number;
  sent: number;
  scheduled: number;
  draft: number;
  total_recipients: number;
  open_rate: number;
  click_rate: number;
}

const statusColors = {
  draft: { bg: 'rgba(107, 114, 128, 0.1)', text: colors.textMuted },
  scheduled: { bg: 'rgba(251, 191, 36, 0.1)', text: colors.warning },
  sending: { bg: 'rgba(59, 130, 246, 0.1)', text: colors.info.DEFAULT },
  sent: { bg: 'rgba(34, 197, 94, 0.1)', text: colors.success.DEFAULT },
  failed: { bg: 'rgba(239, 68, 68, 0.1)', text: colors.error.DEFAULT },
};

export default function EmailCampaignsPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const notifications = useNotifications();

  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [stats, setStats] = useState<EmailCampaignStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const loadCampaigns = useCallback(async () => {
    try {
      const filters: any = {
        page,
        page_size: pageSize,
      };

      if (searchQuery) filters.search = searchQuery;
      if (statusFilter !== 'all') filters.status = statusFilter;

      const response = await marketingService.getEmailCampaigns(filters);
      const items = Array.isArray(response) ? response : response?.items || [];
      const totalCount = Array.isArray(response) ? response.length : response?.total || 0;

      setCampaigns(items.filter((item: any) => item != null));
      setTotal(totalCount);

      // Calculate stats
      const totalSent = items.filter((c: EmailCampaign) => c?.sent_count).reduce((sum: number, c: EmailCampaign) => sum + (c.sent_count || 0), 0);
      const totalOpened = items.filter((c: EmailCampaign) => c?.opened_count).reduce((sum: number, c: EmailCampaign) => sum + (c.opened_count || 0), 0);
      const totalClicked = items.filter((c: EmailCampaign) => c?.clicked_count).reduce((sum: number, c: EmailCampaign) => sum + (c.clicked_count || 0), 0);

      const statsData: EmailCampaignStats = {
        total: totalCount,
        sent: items.filter((c: EmailCampaign) => c?.status === 'sent').length,
        scheduled: items.filter((c: EmailCampaign) => c?.status === 'scheduled').length,
        draft: items.filter((c: EmailCampaign) => c?.status === 'draft').length,
        total_recipients: items.reduce((sum: number, c: EmailCampaign) => sum + (c?.recipients_count || 0), 0),
        open_rate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0,
        click_rate: totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0,
      };
      setStats(statsData);
    } catch (err: any) {
      const message = err?.message || 'Failed to load email campaigns';
      logger.error('Failed to load email campaigns', 'EmailCampaignsPage', err);
      notifications.showError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, pageSize, searchQuery, statusFilter]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCampaigns();
  };

  const handleViewDetails = (campaign: EmailCampaign) => {
    setSelectedCampaign(campaign);
    setShowDetailsModal(true);
  };

  const handleSendTest = async (id: string) => {
    try {
      notifications.showInfo(t('admin.emailCampaigns.sendingTest', 'Sending test email...'));
      await marketingService.sendTestEmail(id);
      notifications.showSuccess(t('admin.emailCampaigns.testSent', 'Test email sent'));
    } catch (err: any) {
      logger.error('Failed to send test email', 'EmailCampaignsPage', err);
      notifications.showError(t('admin.emailCampaigns.testFailed', 'Failed to send test email'));
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateRate = (count: number, total: number) => {
    if (!total) return '0%';
    return `${Math.round((count / total) * 100)}%`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
      </View>
    );
  }

  const pageConfig = ADMIN_PAGE_CONFIG['email-campaigns'];
  const IconComponent = pageConfig.icon;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <GlassPageHeader
        title={t('admin.emailCampaigns.title', 'Email Campaigns')}
        subtitle={t('admin.emailCampaigns.subtitle', 'Manage email marketing campaigns')}
        icon={<IconComponent size={24} color={pageConfig.iconColor} strokeWidth={2} />}
        iconColor={pageConfig.iconColor}
        iconBackgroundColor={pageConfig.iconBackgroundColor}
        badge={stats?.total}
        isRTL={isRTL}
        action={
          <View style={[styles.headerActions, { flexDirection }]}>
            <GlassButton
              title={t('admin.emailCampaigns.create', 'Create Campaign')}
              variant="primary"
              icon={<Plus size={16} color="white" />}
              onPress={() => notifications.showInfo('Create email campaign coming soon')}
            />
            <GlassButton
              title={t('admin.dashboard.refresh', 'Refresh')}
              variant="ghost"
              icon={<RefreshCw size={16} color="white" />}
              onPress={handleRefresh}
              disabled={refreshing}
            />
          </View>
        }
      />

      {/* Stats */}
      {stats && (
        <View style={styles.statsGrid}>
          <StatCard
            title={t('admin.emailCampaigns.stats.total', 'Total')}
            value={stats.total.toString()}
            icon="📊"
            color="primary"
          />
          <StatCard
            title={t('admin.emailCampaigns.stats.sent', 'Sent')}
            value={stats.sent.toString()}
            icon="✅"
            color="success"
          />
          <StatCard
            title={t('admin.emailCampaigns.stats.recipients', 'Recipients')}
            value={stats.total_recipients.toLocaleString()}
            icon="👥"
            color="secondary"
          />
          <StatCard
            title={t('admin.emailCampaigns.stats.openRate', 'Open Rate')}
            value={`${stats.open_rate}%`}
            icon="📧"
            color="warning"
          />
        </View>
      )}

      {/* Search and Filters */}
      <View style={[styles.filtersRow, { flexDirection }]}>
        <GlassInput
          placeholder={t('admin.emailCampaigns.search', 'Search campaigns...')}
          value={searchQuery}
          onChangeText={(text) => { setSearchQuery(text); setPage(1); }}
          containerStyle={styles.searchInput}
        />
      </View>

      {/* Status Filter Pills */}
      <View style={[styles.filterPills, { flexDirection }]}>
        {['all', 'sent', 'scheduled', 'sending', 'draft', 'failed'].map((status) => (
          <Pressable
            key={status}
            style={[
              styles.filterPill,
              statusFilter === status && styles.filterPillActive,
            ]}
            onPress={() => { setStatusFilter(status); setPage(1); }}
          >
            <Text
              style={[
                styles.filterPillText,
                statusFilter === status && styles.filterPillTextActive,
              ]}
            >
              {t(`admin.emailCampaigns.status.${status}`, status)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Campaigns Table */}
      <GlassCard style={styles.tableCard}>
        {/* Table Header */}
        <View style={[styles.tableHeader, { flexDirection }]}>
          <Text style={[styles.tableHeaderText, styles.colName]}>
            {t('admin.emailCampaigns.columns.name', 'Campaign')}
          </Text>
          <Text style={[styles.tableHeaderText, styles.colSubject]}>
            {t('admin.emailCampaigns.columns.subject', 'Subject')}
          </Text>
          <Text style={[styles.tableHeaderText, styles.colStatus]}>
            {t('admin.emailCampaigns.columns.status', 'Status')}
          </Text>
          <Text style={[styles.tableHeaderText, styles.colRecipients]}>
            {t('admin.emailCampaigns.columns.recipients', 'Recipients')}
          </Text>
          <Text style={[styles.tableHeaderText, styles.colMetrics]}>
            {t('admin.emailCampaigns.columns.metrics', 'Metrics')}
          </Text>
          <Text style={[styles.tableHeaderText, styles.colDate]}>
            {t('admin.emailCampaigns.columns.date', 'Date')}
          </Text>
          <Text style={[styles.tableHeaderText, styles.colActions]}>
            {t('common.actions', 'Actions')}
          </Text>
        </View>

        {/* Table Body */}
        {campaigns.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {t('admin.emailCampaigns.noData', 'No email campaigns found')}
            </Text>
          </View>
        ) : (
          campaigns.map((campaign) => (
            <View key={campaign.id} style={[styles.tableRow, { flexDirection }]}>
              <View style={styles.colName}>
                <Text style={styles.campaignName}>{campaign.name}</Text>
              </View>
              <Text style={[styles.subjectText, styles.colSubject]} numberOfLines={1}>
                {campaign.subject}
              </Text>
              <View style={styles.colStatus}>
                {campaign.status && (
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusColors[campaign.status]?.bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: statusColors[campaign.status]?.text },
                      ]}
                    >
                      {t(`admin.emailCampaigns.status.${campaign.status}`, campaign.status)}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.recipientsText, styles.colRecipients]}>
                {campaign.sent_count || 0} / {campaign.recipients_count}
              </Text>
              <View style={styles.colMetrics}>
                {campaign.sent_count && campaign.sent_count > 0 ? (
                  <>
                    <Text style={styles.metricText}>
                      📧 {calculateRate(campaign.opened_count || 0, campaign.sent_count)}
                    </Text>
                    <Text style={styles.metricText}>
                      🔗 {calculateRate(campaign.clicked_count || 0, campaign.sent_count)}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.metricText}>-</Text>
                )}
              </View>
              <Text style={[styles.dateText, styles.colDate]}>
                {formatDate(campaign.sent_at || campaign.scheduled_at || campaign.created_at)}
              </Text>
              <View style={[styles.actionsRow, styles.colActions]}>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => handleViewDetails(campaign)}
                >
                  <Eye size={14} color={colors.primary.DEFAULT} />
                  <Text style={styles.actionText}>View</Text>
                </Pressable>
                {campaign.status === 'draft' && (
                  <Pressable
                    style={[styles.actionButton, styles.successButton]}
                    onPress={() => handleSendTest(campaign.id)}
                  >
                    <Send size={14} color={colors.success.DEFAULT} />
                    <Text style={styles.actionText}>Test</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))
        )}
      </GlassCard>

      {/* Pagination */}
      {total > pageSize && (
        <View style={[styles.pagination, { flexDirection }]}>
          <GlassButton
            title={t('common.previous', 'Previous')}
            variant="ghost"
            onPress={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          />
          <Text style={styles.pageInfo}>
            {t('common.pageOf', `Page ${page} of ${Math.ceil(total / pageSize)}`)}
          </Text>
          <GlassButton
            title={t('common.next', 'Next')}
            variant="ghost"
            onPress={() => setPage((p) => Math.min(Math.ceil(total / pageSize), p + 1))}
            disabled={page >= Math.ceil(total / pageSize)}
          />
        </View>
      )}

      {/* Details Modal */}
      <GlassModal
        visible={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title={t('admin.emailCampaigns.details', 'Campaign Details')}
      >
        {selectedCampaign && (
          <View style={styles.modalContent}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.emailCampaigns.columns.name', 'Name')}:</Text>
              <Text style={styles.detailValue}>{selectedCampaign.name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.emailCampaigns.columns.subject', 'Subject')}:</Text>
              <Text style={styles.detailValue}>{selectedCampaign.subject}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.emailCampaigns.columns.status', 'Status')}:</Text>
              <Text style={styles.detailValue}>{selectedCampaign.status}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.emailCampaigns.columns.recipients', 'Recipients')}:</Text>
              <Text style={styles.detailValue}>
                {selectedCampaign.sent_count || 0} / {selectedCampaign.recipients_count}
              </Text>
            </View>
            {selectedCampaign.sent_count && selectedCampaign.sent_count > 0 && (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('admin.emailCampaigns.opened', 'Opened')}:</Text>
                  <Text style={styles.detailValue}>
                    {selectedCampaign.opened_count || 0} ({calculateRate(selectedCampaign.opened_count || 0, selectedCampaign.sent_count)})
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('admin.emailCampaigns.clicked', 'Clicked')}:</Text>
                  <Text style={styles.detailValue}>
                    {selectedCampaign.clicked_count || 0} ({calculateRate(selectedCampaign.clicked_count || 0, selectedCampaign.sent_count)})
                  </Text>
                </View>
              </>
            )}
            {selectedCampaign.scheduled_at && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('admin.emailCampaigns.scheduledAt', 'Scheduled')}:</Text>
                <Text style={styles.detailValue}>{formatDate(selectedCampaign.scheduled_at)}</Text>
              </View>
            )}
            {selectedCampaign.sent_at && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('admin.emailCampaigns.sentAt', 'Sent')}:</Text>
                <Text style={styles.detailValue}>{formatDate(selectedCampaign.sent_at)}</Text>
              </View>
            )}
            <View style={styles.modalActions}>
              <GlassButton
                title={t('common.close', 'Close')}
                variant="ghost"
                onPress={() => setShowDetailsModal(false)}
              />
            </View>
          </View>
        )}
      </GlassModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  header: {
    marginBottom: spacing.xl,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pageTitle: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  headerActions: {
    gap: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  filtersRow: {
    gap: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
  },
  filterPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  filterPillActive: {
    backgroundColor: colors.glassPurple,
    borderColor: colors.primary.DEFAULT,
  },
  filterPillText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: colors.primary.DEFAULT,
  },
  tableCard: {
    padding: 0,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.glass,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  tableHeaderText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  tableRow: {
    flexDirection: 'row',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    alignItems: 'center',
  },
  colName: {
    flex: 2,
  },
  colSubject: {
    flex: 2,
  },
  colStatus: {
    flex: 1,
  },
  colRecipients: {
    flex: 1,
  },
  colMetrics: {
    flex: 1.5,
  },
  colDate: {
    flex: 1.5,
  },
  colActions: {
    flex: 1.5,
  },
  campaignName: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  subjectText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  recipientsText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  metricText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  dateText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  successButton: {
    borderColor: colors.success.DEFAULT,
  },
  actionText: {
    fontSize: fontSize.xs,
    color: colors.text,
    fontWeight: '500',
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  pageInfo: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  modalContent: {
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  modalActions: {
    marginTop: spacing.md,
  },
});
