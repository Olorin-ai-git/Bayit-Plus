import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';;
import { useTranslation } from 'react-i18next';
import { Download, Filter } from 'lucide-react';
import { GlassTable, GlassTableCell } from '@bayit/shared/ui/web';
import { auditLogsService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassButton, GlassModal, GlassSelect } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
import logger from '@/utils/logger';

interface AuditLog {
  id: string;
  action: string;
  user_id: string;
  user_name: string;
  ip_address: string;
  resource_type: string;
  resource_id: string;
  details: Record<string, any>;
  created_at: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

const actionColors: Record<string, { bg: string; text: string }> = {
  user: { bg: 'rgba(107, 33, 168, 0.3)', text: '#a855f7' },
  subscription: { bg: 'rgba(139, 92, 246, 0.2)', text: '#8B5CF6' },
  payment: { bg: 'rgba(34, 197, 94, 0.2)', text: '#22C55E' },
  settings: { bg: 'rgba(245, 158, 11, 0.2)', text: '#F59E0B' },
  campaign: { bg: 'rgba(236, 72, 153, 0.2)', text: '#EC4899' },
  content: { bg: 'rgba(107, 33, 168, 0.3)', text: '#3B82F6' },
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('he-IL', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
};

const getActionIcon = (action: string) => {
  if (action.includes('user')) return '👤';
  if (action.includes('subscription')) return '📦';
  if (action.includes('payment')) return '💰';
  if (action.includes('settings')) return '⚙️';
  if (action.includes('campaign')) return '🎯';
  if (action.includes('content')) return '📺';
  if (action.includes('login')) return '🔑';
  return '📋';
};

export default function AuditLogsPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({ action: '', user_id: '' });
  const [showFilterModal, setShowFilterModal] = useState(false);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await auditLogsService.getLogs({
        ...filters,
        page: pagination.page,
        page_size: pagination.pageSize,
      });
      setLogs(data.items || []);
      setPagination((prev) => ({ ...prev, total: data.total || 0 }));
    } catch (error) {
      logger.error('Failed to load audit logs', 'AuditLogsPage', error);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.pageSize]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleExport = async () => {
    try {
      const blob = await auditLogsService.exportLogs(filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('Failed to export audit logs', 'AuditLogsPage', error);
    }
  };

  const getActionBadge = (action: string) => {
    const type = action.split('.')[0];
    const style = actionColors[type] || { bg: 'rgba(107, 114, 128, 0.2)', text: '#6B7280' };
    return (
      <View style={[styles.badge, { backgroundColor: style.bg }]}>
        <Text style={styles.badgeIcon}>{getActionIcon(action)}</Text>
        <Text style={[styles.badgeText, { color: style.text }]}>{action.replace('.', ' ').replace(/_/g, ' ')}</Text>
      </View>
    );
  };

  const columns = [
    { key: 'action', label: t('admin.auditLogs.columns.action'), width: 200, render: (action: string) => getActionBadge(action) },
    {
      key: 'user_name',
      label: t('admin.auditLogs.columns.user'),
      render: (_: any, log: AuditLog) => (
        <View>
          <Text className="text-sm font-medium text-white">{log.user_name}</Text>
          <Text style={styles.userId}>{log.user_id.slice(0, 8)}...</Text>
        </View>
      ),
    },
    { key: 'resource_type', label: t('admin.auditLogs.columns.resource'), width: 100, render: (type: string) => <Text style={styles.resourceText}>{type}</Text> },
    { key: 'ip_address', label: t('admin.auditLogs.columns.ip'), width: 120, render: (ip: string) => <Text style={styles.ipText}>{ip}</Text> },
    {
      key: 'details',
      label: t('admin.auditLogs.columns.details'),
      width: 150,
      render: (details: Record<string, any>) => (
        <Text style={styles.detailsText} numberOfLines={1}>
          {details?.changed_fields ? `${t('admin.auditLogs.changed')}: ${details.changed_fields.join(', ')}` : '-'}
        </Text>
      ),
    },
    { key: 'created_at', label: t('admin.auditLogs.columns.date'), width: 180, render: (date: string) => <Text style={styles.dateText}>{formatDate(date)}</Text> },
  ];

  const actionFilters = ['', 'user', 'subscription', 'payment', 'settings', 'campaign', 'content'];

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: spacing.lg }}>
      <View style={[styles.header, { flexDirection }]}>
        <View>
          <Text style={[styles.pageTitle, { textAlign }]}>{t('admin.titles.auditLogs')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>{t('admin.auditLogs.subtitle')}</Text>
        </View>
        <View style={styles.headerActions}>
          <GlassButton title={t('admin.auditLogs.filter')} variant="secondary" icon={<Filter size={16} color={colors.text} />} onPress={() => setShowFilterModal(true)} />
          <GlassButton title={t('admin.auditLogs.export')} variant="secondary" icon={<Download size={16} color={colors.text} />} onPress={handleExport} />
        </View>
      </View>

      <View style={styles.filtersRow}>
        {actionFilters.map((action) => (
          <Pressable key={action} onPress={() => setFilters((prev) => ({ ...prev, action }))} style={[styles.filterButton, filters.action === action && styles.filterButtonActive]}>
            <Text style={[styles.filterText, filters.action === action && styles.filterTextActive]}>
              {action === '' ? t('admin.auditLogs.all') : t(`admin.auditLogs.actionFilters.${action}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <GlassTable columns={columns} data={logs} loading={loading} pagination={pagination} onPageChange={handlePageChange} emptyMessage={t('admin.auditLogs.noRecords')} searchable={false} isRTL={isRTL} />

      <GlassModal visible={showFilterModal} onClose={() => setShowFilterModal(false)} title={t('admin.auditLogs.advancedFiltering')}>
        <View style={styles.modalContent}>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('admin.auditLogs.actionType')}</Text>
            <View style={styles.filterOptions}>
              {actionFilters.map((action) => (
                <Pressable key={action} onPress={() => setFilters((prev) => ({ ...prev, action }))} style={[styles.filterOption, filters.action === action && styles.filterOptionActive]}>
                  <Text style={[styles.filterOptionText, filters.action === action && styles.filterOptionTextActive]}>
                    {action === '' ? t('admin.auditLogs.all') : t(`admin.auditLogs.actionFilters.${action}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View className="flex flex-row gap-4 mt-6">
            <GlassButton title={t('admin.auditLogs.clear')} variant="secondary" onPress={() => setFilters({ action: '', user_id: '' })} />
            <GlassButton title={t('admin.auditLogs.apply')} variant="primary" onPress={() => setShowFilterModal(false)} />
          </View>
        </View>
      </GlassModal>
    </ScrollView>
  );
}

