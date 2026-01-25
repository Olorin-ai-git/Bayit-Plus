/**
 * CampaignsListScreen
 * Full campaigns management with promo codes, discounts, and trials
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useNotifications } from '@olorin/glass-ui/hooks';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { DataTable, Column } from '../../components/admin/DataTable';
import { campaignsService, CampaignsFilter } from '../../services/adminApi';
import { Campaign } from '../../types/rbac';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
import { formatDate } from '../../utils/formatters';
import { getStatusColor, getCampaignTypeIcon } from '../../utils/adminConstants';
import { logger } from '../../utils/logger';

type CampaignStatus = 'draft' | 'active' | 'scheduled' | 'ended' | 'all';
type CampaignType = 'discount' | 'trial' | 'referral' | 'promotional' | 'all';

// Scoped logger for campaigns list screen
const campaignsListLogger = logger.scope('Admin:CampaignsList');

export const CampaignsListScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const notifications = useNotifications();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCampaigns, setTotalCampaigns] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [campaignStats, setCampaignStats] = useState<any>(null);

  const [filters, setFilters] = useState<CampaignsFilter>({
    search: '',
    type: '',
    status: '',
    page: 1,
    page_size: 20,
  });

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await campaignsService.getCampaigns(filters);
      setCampaigns(response.items);
      setTotalCampaigns(response.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load campaigns';
      setError(message);
      campaignsListLogger.error('Error loading campaigns', {
        filters,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const handleSearch = (text: string) => {
    setFilters(prev => ({ ...prev, search: text, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    // Add sort logic
  };

  const handleViewCampaign = (campaign: Campaign) => {
    navigation.navigate('CampaignDetail', { campaignId: campaign.id });
  };

  const handleCreateCampaign = () => {
    navigation.navigate('CampaignDetail', { campaignId: undefined });
  };

  const handleViewStats = async (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    try {
      const stats = await campaignsService.getCampaignStats(campaign.id);
      setCampaignStats(stats);
      setShowStatsModal(true);
    } catch (err) {
      campaignsListLogger.error('Error loading campaign stats', {
        campaignId: campaign.id,
        campaignName: campaign.name,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      notifications.showError(t('admin.campaigns.statsError', 'Failed to load campaign statistics'), t('common.error', 'Error'));
    }
  };

  const handleActivateCampaign = async (campaign: Campaign) => {
    try {
      await campaignsService.activateCampaign(campaign.id);
      loadCampaigns();
    } catch (error) {
      campaignsListLogger.error('Error activating campaign', {
        campaignId: campaign.id,
        campaignName: campaign.name,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  };

  const handleDeactivateCampaign = async (campaign: Campaign) => {
    try {
      await campaignsService.deactivateCampaign(campaign.id);
      loadCampaigns();
    } catch (error) {
      campaignsListLogger.error('Error deactivating campaign', {
        campaignId: campaign.id,
        campaignName: campaign.name,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  };

  const handleDeleteCampaign = async (campaign: Campaign) => {
    notifications.show({
      level: 'warning',
      title: t('admin.campaigns.deleteConfirm', 'Delete Campaign'),
      message: t('admin.campaigns.deleteMessage', `Are you sure you want to delete "${campaign.name}"?`),
      dismissable: true,
      action: {
        label: t('common.delete', 'Delete'),
        type: 'action',
        onPress: async () => {
          try {
            await campaignsService.deleteCampaign(campaign.id);
            loadCampaigns();
          } catch (error) {
            campaignsListLogger.error('Error deleting campaign', {
              campaignId: campaign.id,
              campaignName: campaign.name,
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            });
          }
        },
      },
    });
  };


  const columns: Column<Campaign>[] = [
    {
      key: 'name',
      header: t('admin.campaigns.columns.name', 'Campaign'),
      width: 250,
      sortable: true,
      render: (campaign) => (
        <View style={styles.campaignCell}>
          <Text style={styles.campaignIcon}>{getCampaignTypeIcon(campaign.type)}</Text>
          <View>
            <Text style={styles.campaignName}>{campaign.name}</Text>
            <Text style={styles.campaignCode}>
              {campaign.promo_code ? `Code: ${campaign.promo_code}` : 'No code'}
            </Text>
          </View>
        </View>
      ),
    },
    {
      key: 'type',
      header: t('admin.campaigns.columns.type', 'Type'),
      width: 120,
      sortable: true,
      render: (campaign) => (
        <View style={[styles.typeBadge, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.typeBadgeText, { color: colors.primary.DEFAULT }]}>
            {campaign.type}
          </Text>
        </View>
      ),
    },
    {
      key: 'status',
      header: t('admin.campaigns.columns.status', 'Status'),
      width: 100,
      sortable: true,
      render: (campaign) => (
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(campaign.status) + '20' }]}>
          <Text style={[styles.statusBadgeText, { color: getStatusColor(campaign.status) }]}>
            {campaign.status}
          </Text>
        </View>
      ),
    },
    {
      key: 'discount',
      header: t('admin.campaigns.columns.discount', 'Discount'),
      width: 100,
      align: 'center',
      render: (campaign) => (
        <Text style={styles.discountText}>
          {campaign.discount_type === 'percentage'
            ? `${campaign.discount_value}%`
            : campaign.discount_type === 'fixed'
            ? `$${campaign.discount_value}`
            : `${campaign.discount_value} days`}
        </Text>
      ),
    },
    {
      key: 'usage',
      header: t('admin.campaigns.columns.usage', 'Usage'),
      width: 100,
      align: 'center',
      render: (campaign) => (
        <Text style={styles.usageText}>
          {campaign.usage_count || 0}
          {campaign.usage_limit ? ` / ${campaign.usage_limit}` : ''}
        </Text>
      ),
    },
    {
      key: 'dates',
      header: t('admin.campaigns.columns.dates', 'Period'),
      width: 180,
      render: (campaign) => (
        <View>
          <Text style={styles.dateText}>
            {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
          </Text>
        </View>
      ),
    },
  ];

  const renderActions = (campaign: Campaign) => (
    <View style={styles.actionsRow}>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => handleViewCampaign(campaign)}
      >
        <Text style={styles.actionIcon}>✏️</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => handleViewStats(campaign)}
      >
        <Text style={styles.actionIcon}>📊</Text>
      </TouchableOpacity>
      {campaign.status === 'draft' || campaign.status === 'paused' ? (
        <TouchableOpacity
          style={[styles.actionButton, styles.activateButton]}
          onPress={() => handleActivateCampaign(campaign)}
        >
          <Text style={styles.actionIcon}>▶️</Text>
        </TouchableOpacity>
      ) : campaign.status === 'active' ? (
        <TouchableOpacity
          style={[styles.actionButton, styles.pauseButton]}
          onPress={() => handleDeactivateCampaign(campaign)}
        >
          <Text style={styles.actionIcon}>⏸️</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        style={[styles.actionButton, styles.deleteButton]}
        onPress={() => handleDeleteCampaign(campaign)}
      >
        <Text style={styles.actionIcon}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );

  const headerActions = (
    <View style={styles.headerActions}>
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setShowFilters(true)}
      >
        <Text style={styles.filterButtonIcon}>🔍</Text>
        <Text style={styles.filterButtonText}>{t('admin.campaigns.filters', 'Filters')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.addButton}
        onPress={handleCreateCampaign}
      >
        <Text style={styles.addButtonIcon}>+</Text>
        <Text style={styles.addButtonText}>{t('admin.campaigns.create', 'Create Campaign')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <AdminLayout
      title={t('admin.titles.campaigns', 'Campaigns')}
      actions={headerActions}
    >
      <View style={styles.container}>
        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {campaigns.filter(c => c.status === 'active').length}
            </Text>
            <Text style={styles.statLabel}>{t('admin.campaigns.active', 'Active')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {campaigns.filter(c => c.status === 'scheduled').length}
            </Text>
            <Text style={styles.statLabel}>{t('admin.campaigns.scheduled', 'Scheduled')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {campaigns.reduce((acc, c) => acc + (c.usage_count || 0), 0)}
            </Text>
            <Text style={styles.statLabel}>{t('admin.campaigns.totalRedemptions', 'Total Redemptions')}</Text>
          </View>
        </View>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={campaigns}
          keyExtractor={(campaign) => campaign.id}
          loading={loading}
          searchable
          searchPlaceholder={t('admin.campaigns.searchPlaceholder', 'Search campaigns...')}
          onSearch={handleSearch}
          sortable
          onSort={handleSort}
          pagination={{
            page: filters.page || 1,
            pageSize: filters.page_size || 20,
            total: totalCampaigns,
            onPageChange: handlePageChange,
          }}
          onRowPress={handleViewCampaign}
          actions={renderActions}
          emptyMessage={t('admin.campaigns.noCampaigns', 'No campaigns found')}
        />

        {/* Filters Modal */}
        <Modal
          visible={showFilters}
          transparent
          animationType="fade"
          onRequestClose={() => setShowFilters(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('admin.campaigns.filterTitle', 'Filter Campaigns')}</Text>

              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>{t('admin.campaigns.filterType', 'Type')}</Text>
                <View style={styles.filterOptions}>
                  {(['all', 'discount', 'trial', 'referral', 'promotional'] as CampaignType[]).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.filterOption,
                        (filters.type === type || (type === 'all' && !filters.type)) && styles.filterOptionActive,
                      ]}
                      onPress={() => setFilters(prev => ({ ...prev, type: type === 'all' ? '' : type }))}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        (filters.type === type || (type === 'all' && !filters.type)) && styles.filterOptionTextActive,
                      ]}>
                        {type === 'all' ? t('common.all', 'All') : type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>{t('admin.campaigns.filterStatus', 'Status')}</Text>
                <View style={styles.filterOptions}>
                  {(['all', 'draft', 'active', 'scheduled', 'ended'] as CampaignStatus[]).map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.filterOption,
                        (filters.status === status || (status === 'all' && !filters.status)) && styles.filterOptionActive,
                      ]}
                      onPress={() => setFilters(prev => ({ ...prev, status: status === 'all' ? '' : status }))}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        (filters.status === status || (status === 'all' && !filters.status)) && styles.filterOptionTextActive,
                      ]}>
                        {status === 'all' ? t('common.all', 'All') : status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setFilters(prev => ({ ...prev, type: '', status: '' }));
                  }}
                >
                  <Text style={styles.modalCancelText}>{t('admin.campaigns.clearFilters', 'Clear')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalApplyButton}
                  onPress={() => setShowFilters(false)}
                >
                  <Text style={styles.modalApplyText}>{t('admin.campaigns.applyFilters', 'Apply')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Stats Modal */}
        <Modal
          visible={showStatsModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowStatsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.statsModal}>
              <Text style={styles.modalTitle}>
                {selectedCampaign?.name || 'Campaign'} - {t('admin.campaigns.statistics', 'Statistics')}
              </Text>

              {campaignStats && (
                <View style={styles.statsGrid}>
                  <View style={styles.statBox}>
                    <Text style={styles.statBoxValue}>{campaignStats.redemptions}</Text>
                    <Text style={styles.statBoxLabel}>{t('admin.campaigns.redemptions', 'Redemptions')}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statBoxValue}>${campaignStats.revenue_impact.toLocaleString()}</Text>
                    <Text style={styles.statBoxLabel}>{t('admin.campaigns.revenueImpact', 'Revenue Impact')}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statBoxValue}>{campaignStats.conversion_rate.toFixed(1)}%</Text>
                    <Text style={styles.statBoxLabel}>{t('admin.campaigns.conversionRate', 'Conversion Rate')}</Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowStatsModal(false)}
              >
                <Text style={styles.modalCloseText}>{t('common.close', 'Close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </AdminLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  filterButtonIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  filterButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
  },
  addButtonIcon: {
    fontSize: 18,
    color: colors.text,
    marginRight: spacing.xs,
    fontWeight: 'bold',
  },
  addButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  quickStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.primary.DEFAULT,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  campaignCell: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  campaignIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  campaignName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  campaignCode: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  discountText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.success,
  },
  usageText: {
    fontSize: fontSize.sm,
    color: colors.text,
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
    width: 30,
    height: 30,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.backgroundLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activateButton: {
    backgroundColor: colors.success + '30',
  },
  pauseButton: {
    backgroundColor: colors.warning + '30',
  },
  deleteButton: {
    backgroundColor: colors.error + '30',
  },
  actionIcon: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  filterSection: {
    marginBottom: spacing.lg,
  },
  filterLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filterOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundLighter,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  filterOptionActive: {
    backgroundColor: colors.primary + '30',
    borderColor: colors.primary,
  },
  filterOptionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  filterOptionTextActive: {
    color: colors.primary.DEFAULT,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalCancelButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundLighter,
    borderRadius: borderRadius.md,
  },
  modalCancelText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  modalApplyButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  modalApplyText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  statsModal: {
    width: '90%',
    maxWidth: 450,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.backgroundLighter,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  statBoxValue: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.primary.DEFAULT,
    marginBottom: spacing.xs,
  },
  statBoxLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalCloseButton: {
    paddingVertical: spacing.md,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  modalCloseText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
});

export default CampaignsListScreen;
