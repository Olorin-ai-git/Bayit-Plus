import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, MoreVertical, Edit, Power, Trash2, Copy } from 'lucide-react';
import DataTable from '@/components/admin/DataTable';
import { campaignsService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassButton } from '@bayit/shared/ui';
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

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'rgba(34, 197, 94, 0.2)', text: '#22C55E', label: 'פעיל' },
  inactive: { bg: 'rgba(107, 114, 128, 0.2)', text: '#6B7280', label: 'לא פעיל' },
  expired: { bg: 'rgba(239, 68, 68, 0.2)', text: '#EF4444', label: 'פג תוקף' },
};

export default function CampaignsListPage() {
  const { t } = useTranslation();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0 });

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

  const getStatusBadge = (status: string) => {
    const style = statusColors[status] || statusColors.inactive;
    return (
      <View style={[styles.badge, { backgroundColor: style.bg }]}>
        <Text style={[styles.badgeText, { color: style.text }]}>{style.label}</Text>
      </View>
    );
  };

  const columns = [
    {
      key: 'name',
      label: 'שם',
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
      label: 'הנחה',
      render: (discount: number) => (
        <Text style={styles.discountText}>{discount}%</Text>
      ),
    },
    {
      key: 'usage_count',
      label: 'שימושים',
      render: (count: number, campaign: Campaign) => (
        <Text style={styles.cellText}>
          {count}
          {campaign.max_uses && <Text style={styles.maxUsesText}> / {campaign.max_uses}</Text>}
        </Text>
      ),
    },
    {
      key: 'valid_until',
      label: 'תוקף',
      render: (date: string) => (
        <Text style={styles.dateText}>
          {new Date(date).toLocaleDateString('he-IL')}
        </Text>
      ),
    },
    {
      key: 'status',
      label: 'סטטוס',
      render: (status: string) => getStatusBadge(status),
    },
    {
      key: 'actions',
      label: '',
      width: 50,
      render: (_: any, campaign: Campaign) => (
        <View style={styles.actionsCell}>
          <Pressable style={styles.actionButton}>
            <MoreVertical size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      ),
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>{t('admin.titles.campaigns')}</Text>
          <Text style={styles.subtitle}>נהל קודי קופון והנחות</Text>
        </View>
        <Link to="/admin/campaigns/new" style={{ textDecoration: 'none' }}>
          <GlassButton
            title="קמפיין חדש"
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
        searchPlaceholder="חפש קמפיין..."
        pagination={pagination}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        emptyMessage="לא נמצאו קמפיינים"
      />
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
    position: 'relative',
  },
  actionButton: {
    padding: spacing.xs,
  },
});
