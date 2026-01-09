import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal } from 'react-native';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Power, Trash2, Copy, X } from 'lucide-react';
import DataTable from '@/components/admin/DataTable';
import { campaignsService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassButton, GlassView } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
import logger from '@/utils/logger';

interface Campaign {
  id: string;
  name: string;
  code: string;
  discount_percent: number;
  usage_count: number;
  max_uses?: number;
  valid_until: string;
  status: 'active' | 'inactive' | 'expired';
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

const statusColors: Record<string, { bg: string; text: string; labelKey: string }> = {
  active: { bg: 'rgba(34, 197, 94, 0.2)', text: '#22C55E', labelKey: 'admin.campaigns.status.active' },
  inactive: { bg: 'rgba(107, 114, 128, 0.2)', text: '#6B7280', labelKey: 'admin.campaigns.status.inactive' },
  expired: { bg: 'rgba(239, 68, 68, 0.2)', text: '#EF4444', labelKey: 'admin.campaigns.expired' },
};

export default function CampaignsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0 });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; campaign: Campaign | null }>({ open: false, campaign: null });
  const [actionLoading, setActionLoading] = useState(false);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await campaignsService.getCampaigns({
        page: pagination.page,
        page_size: pagination.pageSize,
      });
      setCampaigns(data.items || []);
      setPagination((prev) => ({ ...prev, total: data.total || 0 }));
    } catch (error) {
      logger.error('Failed to load campaigns', 'CampaignsListPage', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const handleToggleStatus = async (campaign: Campaign) => {
    try {
      if (campaign.status === 'active') {
        await campaignsService.deactivateCampaign(campaign.id);
      } else {
        await campaignsService.activateCampaign(campaign.id);
      }
      loadCampaigns();
    } catch (error) {
      logger.error('Failed to toggle campaign status', 'CampaignsListPage', error);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const handleEdit = (campaign: Campaign) => {
    navigate(`/admin/campaigns/${campaign.id}`);
  };

  const handleDeleteClick = (campaign: Campaign) => {
    setDeleteModal({ open: true, campaign });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.campaign) return;
    setActionLoading(true);
    try {
      await campaignsService.deleteCampaign(deleteModal.campaign.id);
      setDeleteModal({ open: false, campaign: null });
      loadCampaigns();
    } catch (error) {
      logger.error('Failed to delete campaign', 'CampaignsListPage', error);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const style = statusColors[status] || statusColors.inactive;
    return (
      <View style={[styles.badge, { backgroundColor: style.bg }]}>
        <Text style={[styles.badgeText, { color: style.text }]}>{t(style.labelKey, { defaultValue: status })}</Text>
      </View>
    );
  };

  const columns = [
    {
      key: 'name',
      label: t('admin.campaigns.columns.name', { defaultValue: 'Name' }),
      render: (name: string, campaign: Campaign) => (
        <View>
          <Text style={styles.campaignName}>{name}</Text>
          <View style={styles.codeRow}>
            <View style={styles.codeContainer}>
              <Text style={styles.codeText}>{campaign.code}</Text>
            </View>
            <Pressable onPress={() => handleCopyCode(campaign.code)} style={styles.copyButton}>
              <Copy size={12} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>
      ),
    },
    {
      key: 'discount_percent',
      label: t('admin.campaigns.columns.discount', { defaultValue: 'Discount' }),
      render: (discount: number) => (
        <Text style={styles.discountText}>{discount}%</Text>
      ),
    },
    {
      key: 'usage_count',
      label: t('admin.campaigns.columns.usage', { defaultValue: 'Uses' }),
      render: (count: number, campaign: Campaign) => (
        <Text style={styles.cellText}>
          {count}
          {campaign.max_uses && <Text style={styles.maxUsesText}> / {campaign.max_uses}</Text>}
        </Text>
      ),
    },
    {
      key: 'valid_until',
      label: t('admin.campaigns.columns.validUntil', { defaultValue: 'Valid Until' }),
      render: (date: string) => (
        <Text style={styles.dateText}>
          {new Date(date).toLocaleDateString('he-IL')}
        </Text>
      ),
    },
    {
      key: 'status',
      label: t('admin.campaigns.columns.status', { defaultValue: 'Status' }),
      render: (status: string) => getStatusBadge(status),
    },
    {
      key: 'actions',
      label: t('admin.campaigns.columns.actions', 'Actions'),
      width: 120,
      render: (_: any, campaign: Campaign) => (
        <View style={styles.actionsCell}>
          <Pressable
            style={styles.actionButton}
            onPress={() => handleEdit(campaign)}
            title={t('common.edit', 'Edit')}
          >
            <Edit size={16} color={colors.primary} />
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={() => handleToggleStatus(campaign)}
            title={campaign.status === 'active' ? t('admin.campaigns.deactivate', 'Deactivate') : t('admin.campaigns.activate', 'Activate')}
          >
            <Power size={16} color={campaign.status === 'active' ? '#22C55E' : colors.textMuted} />
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={() => handleDeleteClick(campaign)}
            title={t('common.delete', 'Delete')}
          >
            <Trash2 size={16} color={colors.error} />
          </Pressable>
        </View>
      ),
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={[styles.header, { flexDirection }]}>
        <View>
          <Text style={[styles.pageTitle, { textAlign }]}>{t('admin.titles.campaigns')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>{t('admin.campaigns.subtitle', { defaultValue: 'Manage coupon codes and discounts' })}</Text>
        </View>
        <Link to="/admin/campaigns/new" style={{ textDecoration: 'none' }}>
          <GlassButton
            title={t('admin.actions.newCampaign')}
            variant="primary"
            icon={<Plus size={18} color={colors.text} />}
          />
        </Link>
      </View>

      {/* Table */}
      <DataTable
        columns={columns}
        data={campaigns}
        loading={loading}
        searchPlaceholder={t('admin.campaigns.searchPlaceholder', 'Search campaigns...')}
        pagination={pagination}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        emptyMessage={t('admin.campaigns.emptyMessage', 'No campaigns found')}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModal.open}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModal({ open: false, campaign: null })}
      >
        <View style={styles.modalOverlay}>
          <GlassView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('admin.campaigns.confirmDelete', 'Delete Campaign')}</Text>
              <Pressable onPress={() => setDeleteModal({ open: false, campaign: null })}>
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            <Text style={styles.modalText}>
              {t('admin.campaigns.confirmDeleteMessage', 'Are you sure you want to delete "{{name}}"? This action cannot be undone.', { name: deleteModal.campaign?.name })}
            </Text>
            <View style={styles.modalActions}>
              <GlassButton
                title={t('common.cancel', 'Cancel')}
                variant="secondary"
                onPress={() => setDeleteModal({ open: false, campaign: null })}
              />
              <GlassButton
                title={actionLoading ? t('common.deleting', 'Deleting...') : t('common.delete', 'Delete')}
                variant="primary"
                onPress={handleDeleteConfirm}
                disabled={actionLoading}
                style={{ backgroundColor: colors.error }}
              />
            </View>
          </GlassView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  campaignName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  codeContainer: {
    backgroundColor: colors.backgroundLighter,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  codeText: {
    fontSize: 12,
    color: colors.primary,
    fontFamily: 'monospace',
  },
  copyButton: {
    padding: spacing.xs,
  },
  discountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22C55E',
  },
  cellText: {
    fontSize: 14,
    color: colors.text,
  },
  maxUsesText: {
    color: colors.textMuted,
  },
  dateText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionsCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modalText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});
