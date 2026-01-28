import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Plus, Edit2, Trash2, PlayCircle, PauseCircle } from 'lucide-react';
import { NativeIcon } from '@olorin/shared-icons/native';
import { campaignsService } from '@/services/adminApi';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { GlassCard, GlassButton, GlassInput, GlassModal, GlassPageHeader } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
import { useNotifications } from '@olorin/glass-ui/hooks';
import { ADMIN_PAGE_CONFIG } from '../../../../shared/utils/adminConstants';
import StatCard from '@/components/admin/StatCard';
import logger from '@/utils/logger';

interface Campaign {
  id: string;
  name: string;
  type: 'discount' | 'trial' | 'referral' | 'promotional';
  status: 'draft' | 'active' | 'scheduled' | 'paused' | 'ended';
  discount_percent?: number;
  discount_amount?: number;
  start_date?: string;
  end_date?: string;
  usage_count?: number;
  usage_limit?: number;
  created_at: string;
}

interface CampaignStats {
  total: number;
  active: number;
  scheduled: number;
  paused: number;
  total_usage: number;
}

const statusColors = {
  draft: { bg: 'rgba(107, 114, 128, 0.1)', text: colors.textMuted },
  active: { bg: 'rgba(34, 197, 94, 0.1)', text: colors.success.DEFAULT },
  scheduled: { bg: 'rgba(251, 191, 36, 0.1)', text: colors.warning },
  paused: { bg: 'rgba(147, 51, 234, 0.1)', text: colors.secondary },
  ended: { bg: 'rgba(239, 68, 68, 0.1)', text: colors.error.DEFAULT },
};

const typeIcons = {
  discount: 'discover',
  trial: 'discover',
  referral: 'discover',
  promotional: 'discover',
};

export default function CampaignsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const notifications = useNotifications();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
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
      if (typeFilter !== 'all') filters.type = typeFilter;

      const response = await campaignsService.getCampaigns(filters);
      const items = Array.isArray(response) ? response : response?.items || [];
      const totalCount = Array.isArray(response) ? response.length : response?.total || 0;

      setCampaigns(items.filter((item: any) => item != null));
      setTotal(totalCount);

      // Calculate stats
      const statsData: CampaignStats = {
        total: totalCount,
        active: items.filter((c: Campaign) => c?.status === 'active').length,
        scheduled: items.filter((c: Campaign) => c?.status === 'scheduled').length,
        paused: items.filter((c: Campaign) => c?.status === 'paused').length,
        total_usage: items.reduce((sum: number, c: Campaign) => sum + (c?.usage_count || 0), 0),
      };
      setStats(statsData);
    } catch (err: any) {
      const message = err?.message || 'Failed to load campaigns';
      logger.error('Failed to load campaigns', 'CampaignsListPage', err);
      notifications.showError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, pageSize, searchQuery, statusFilter, typeFilter]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCampaigns();
  };

  const handleCreateCampaign = () => {
    navigate('/admin/campaigns/new');
  };

  const handleEditCampaign = (id: string) => {
    navigate(`/admin/campaigns/${id}`);
  };

  const handleActivateCampaign = async (id: string) => {
    try {
      await campaignsService.activateCampaign(id);
      notifications.showSuccess(t('admin.campaigns.activateSuccess', 'Campaign activated'));
      loadCampaigns();
    } catch (err: any) {
      logger.error('Failed to activate campaign', 'CampaignsListPage', err);
      notifications.showError(t('admin.campaigns.activateFailed', 'Failed to activate campaign'));
    }
  };

  const handlePauseCampaign = async (id: string) => {
    try {
      await campaignsService.pauseCampaign(id);
      notifications.showSuccess(t('admin.campaigns.pauseSuccess', 'Campaign paused'));
      loadCampaigns();
    } catch (err: any) {
      logger.error('Failed to pause campaign', 'CampaignsListPage', err);
      notifications.showError(t('admin.campaigns.pauseFailed', 'Failed to pause campaign'));
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    notifications.show({
      level: 'warning',
      message: t('admin.campaigns.confirmDelete', 'Are you sure you want to delete this campaign?'),
      dismissable: true,
      action: {
        label: t('common.delete', 'Delete'),
        type: 'action',
        onPress: async () => {
          try {
            await campaignsService.deleteCampaign(id);
            notifications.showSuccess(t('admin.campaigns.deleteSuccess', 'Campaign deleted'));
            loadCampaigns();
          } catch (err: any) {
            logger.error('Failed to delete campaign', 'CampaignsListPage', err);
            notifications.showError(t('admin.campaigns.deleteFailed', 'Failed to delete campaign'));
          }
        },
      },
    });
  };

  const handleViewDetails = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowDetailsModal(true);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
      </View>
    );
  }

  const pageConfig = ADMIN_PAGE_CONFIG.campaigns;
  const IconComponent = pageConfig.icon;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      {/* Page Header */}
      <GlassPageHeader
        title={t('admin.campaigns.title', 'Marketing Campaigns')}
        subtitle={t('admin.campaigns.subtitle', 'Manage promotional campaigns and offers')}
        icon={<IconComponent size={24} color={pageConfig.iconColor} strokeWidth={2} />}
        iconColor={pageConfig.iconColor}
        iconBackgroundColor={pageConfig.iconBackgroundColor}
        badge={stats?.total}
        isRTL={isRTL}
        action={
          <View style={[styles.headerActions, { flexDirection }]}>
            <GlassButton
              title={t('admin.campaigns.create', 'Create Campaign')}
              variant="primary"
              icon={<Plus size={16} color="white" />}
              onPress={handleCreateCampaign}
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
            title={t('admin.campaigns.stats.total', 'Total')}
            value={stats.total.toString()}
            icon={<NativeIcon name="discover" size="md" color={colors.primary.DEFAULT} />}
            color="primary"
          />
          <StatCard
            title={t('admin.campaigns.stats.active', 'Active')}
            value={stats.active.toString()}
            icon={<NativeIcon name="info" size="md" color="#22C55E" />}
            color="success"
          />
          <StatCard
            title={t('admin.campaigns.stats.scheduled', 'Scheduled')}
            value={stats.scheduled.toString()}
            icon={<NativeIcon name="discover" size="md" color="#F59E0B" />}
            color="warning"
          />
          <StatCard
            title={t('admin.campaigns.stats.totalUsage', 'Total Usage')}
            value={stats.total_usage.toString()}
            icon={<NativeIcon name="discover" size="md" color="#8B5CF6" />}
            color="secondary"
          />
        </View>
      )}

      {/* Search and Filters */}
      <View style={[styles.filtersRow, { flexDirection }]}>
        <GlassInput
          placeholder={t('admin.campaigns.search', 'Search campaigns...')}
          value={searchQuery}
          onChangeText={(text) => { setSearchQuery(text); setPage(1); }}
          containerStyle={styles.searchInput}
        />
      </View>

      {/* Filter Pills */}
      <View style={styles.filtersSection}>
        <Text style={styles.filterLabel}>{t('admin.campaigns.filterByStatus', 'Status')}:</Text>
        <View style={[styles.filterPills, { flexDirection }]}>
          {['all', 'active', 'scheduled', 'paused', 'draft', 'ended'].map((status) => (
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
                {t(`admin.campaigns.status.${status}`, status)}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.filterLabel}>{t('admin.campaigns.filterByType', 'Type')}:</Text>
        <View style={[styles.filterPills, { flexDirection }]}>
          {['all', 'discount', 'trial', 'referral', 'promotional'].map((type) => (
            <Pressable
              key={type}
              style={[
                styles.filterPill,
                typeFilter === type && styles.filterPillActive,
              ]}
              onPress={() => { setTypeFilter(type); setPage(1); }}
            >
              <Text
                style={[
                  styles.filterPillText,
                  typeFilter === type && styles.filterPillTextActive,
                ]}
              >
                {t(`admin.campaigns.type.${type}`, type)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Campaigns Table */}
      <GlassCard style={styles.tableCard}>
        {/* Table Header */}
        <View style={[styles.tableHeader, { flexDirection }]}>
          <Text style={[styles.tableHeaderText, styles.colName]}>
            {t('admin.campaigns.columns.name', 'Campaign')}
          </Text>
          <Text style={[styles.tableHeaderText, styles.colType]}>
            {t('admin.campaigns.columns.type', 'Type')}
          </Text>
          <Text style={[styles.tableHeaderText, styles.colDiscount]}>
            {t('admin.campaigns.columns.discount', 'Discount')}
          </Text>
          <Text style={[styles.tableHeaderText, styles.colStatus]}>
            {t('admin.campaigns.columns.status', 'Status')}
          </Text>
          <Text style={[styles.tableHeaderText, styles.colDates]}>
            {t('admin.campaigns.columns.dates', 'Dates')}
          </Text>
          <Text style={[styles.tableHeaderText, styles.colUsage]}>
            {t('admin.campaigns.columns.usage', 'Usage')}
          </Text>
          <Text style={[styles.tableHeaderText, styles.colActions]}>
            {t('common.actions', 'Actions')}
          </Text>
        </View>

        {/* Table Body */}
        {campaigns.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {t('admin.campaigns.noData', 'No campaigns found')}
            </Text>
          </View>
        ) : (
          campaigns.map((campaign) => (
            <View key={campaign.id} style={[styles.tableRow, { flexDirection }]}>
              <View style={styles.colName}>
                <Text style={styles.campaignName}>{campaign.name}</Text>
              </View>
              <View style={styles.colType}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <NativeIcon name={typeIcons[campaign.type]} size="sm" color={colors.textMuted} />
                  <Text style={styles.typeText}>
                    {t(`admin.campaigns.type.${campaign.type}`, campaign.type)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.discountText, styles.colDiscount]}>
                {campaign.discount_percent ? `${campaign.discount_percent}%` :
                 campaign.discount_amount ? `$${campaign.discount_amount}` : '-'}
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
                      {t(`admin.campaigns.status.${campaign.status}`, campaign.status)}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.colDates}>
                <Text style={styles.dateText}>{formatDate(campaign.start_date || '')}</Text>
                {campaign.end_date && (
                  <Text style={styles.dateText}>→ {formatDate(campaign.end_date)}</Text>
                )}
              </View>
              <Text style={[styles.usageText, styles.colUsage]}>
                {campaign.usage_count || 0}
                {campaign.usage_limit ? ` / ${campaign.usage_limit}` : ''}
              </Text>
              <View style={[styles.actionsRow, styles.colActions]}>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => handleViewDetails(campaign)}
                >
                  <Text style={styles.actionText}>View</Text>
                </Pressable>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => handleEditCampaign(campaign.id)}
                >
                  <Edit2 size={14} color={colors.primary.DEFAULT} />
                  <Text style={styles.actionText}>Edit</Text>
                </Pressable>
                {campaign.status === 'active' ? (
                  <Pressable
                    style={[styles.actionButton, styles.warningButton]}
                    onPress={() => handlePauseCampaign(campaign.id)}
                  >
                    <PauseCircle size={14} color={colors.warning} />
                    <Text style={styles.actionText}>Pause</Text>
                  </Pressable>
                ) : campaign.status !== 'ended' ? (
                  <Pressable
                    style={[styles.actionButton, styles.successButton]}
                    onPress={() => handleActivateCampaign(campaign.id)}
                  >
                    <PlayCircle size={14} color={colors.success.DEFAULT} />
                    <Text style={styles.actionText}>Activate</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={[styles.actionButton, styles.dangerButton]}
                  onPress={() => handleDeleteCampaign(campaign.id)}
                >
                  <Trash2 size={14} color={colors.error.DEFAULT} />
                  <Text style={styles.actionText}>Delete</Text>
                </Pressable>
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
        title={t('admin.campaigns.details', 'Campaign Details')}
      >
        {selectedCampaign && (
          <View style={styles.modalContent}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.campaigns.columns.name', 'Name')}:</Text>
              <Text style={styles.detailValue}>{selectedCampaign.name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.campaigns.columns.type', 'Type')}:</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <NativeIcon name={typeIcons[selectedCampaign.type]} size="sm" color={colors.text} />
                <Text style={styles.detailValue}>
                  {selectedCampaign.type}
                </Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.campaigns.columns.status', 'Status')}:</Text>
              <Text style={styles.detailValue}>{selectedCampaign.status}</Text>
            </View>
            {selectedCampaign.discount_percent && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('admin.campaigns.discount', 'Discount')}:</Text>
                <Text style={styles.detailValue}>{selectedCampaign.discount_percent}%</Text>
              </View>
            )}
            {selectedCampaign.discount_amount && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('admin.campaigns.discount', 'Discount')}:</Text>
                <Text style={styles.detailValue}>${selectedCampaign.discount_amount}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.campaigns.startDate', 'Start Date')}:</Text>
              <Text style={styles.detailValue}>{formatDate(selectedCampaign.start_date || '')}</Text>
            </View>
            {selectedCampaign.end_date && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('admin.campaigns.endDate', 'End Date')}:</Text>
                <Text style={styles.detailValue}>{formatDate(selectedCampaign.end_date)}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.campaigns.columns.usage', 'Usage')}:</Text>
              <Text style={styles.detailValue}>
                {selectedCampaign.usage_count || 0}
                {selectedCampaign.usage_limit ? ` / ${selectedCampaign.usage_limit}` : ''}
              </Text>
            </View>
            <View style={styles.modalActions}>
              <GlassButton
                title={t('common.close', 'Close')}
                variant="ghost"
                onPress={() => setShowDetailsModal(false)}
              />
              <GlassButton
                title={t('common.edit', 'Edit')}
                variant="primary"
                onPress={() => {
                  setShowDetailsModal(false);
                  handleEditCampaign(selectedCampaign.id);
                }}
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
  filtersSection: {
    marginBottom: spacing.md,
  },
  filterLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  filterPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
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
  colType: {
    flex: 1.5,
  },
  colDiscount: {
    flex: 1,
  },
  colStatus: {
    flex: 1,
  },
  colDates: {
    flex: 1.5,
  },
  colUsage: {
    flex: 1,
  },
  colActions: {
    flex: 2.5,
  },
  campaignName: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  typeText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  discountText: {
    fontSize: fontSize.sm,
    color: colors.primary.DEFAULT,
    fontWeight: '600',
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
  dateText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  usageText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
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
  warningButton: {
    borderColor: colors.warning,
  },
  successButton: {
    borderColor: colors.success.DEFAULT,
  },
  dangerButton: {
    borderColor: colors.error.DEFAULT,
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
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
});
