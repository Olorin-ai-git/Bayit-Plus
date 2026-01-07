import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Download, Filter } from 'lucide-react';
import DataTable from '@/components/admin/DataTable';
import { auditLogsService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassButton, GlassModal, GlassSelect } from '@bayit/shared/ui';
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
  user: { bg: 'rgba(0, 217, 255, 0.2)', text: '#00D9FF' },
  subscription: { bg: 'rgba(139, 92, 246, 0.2)', text: '#8B5CF6' },
  payment: { bg: 'rgba(34, 197, 94, 0.2)', text: '#22C55E' },
  settings: { bg: 'rgba(245, 158, 11, 0.2)', text: '#F59E0B' },
  campaign: { bg: 'rgba(236, 72, 153, 0.2)', text: '#EC4899' },
  content: { bg: 'rgba(59, 130, 246, 0.2)', text: '#3B82F6' },
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
    { key: 'action', label: 'פעולה', width: 200, render: (action: string) => getActionBadge(action) },
    {
      key: 'user_name',
      label: 'משתמש',
      render: (_: any, log: AuditLog) => (
        <View>
          <Text style={styles.userName}>{log.user_name}</Text>
          <Text style={styles.userId}>{log.user_id.slice(0, 8)}...</Text>
        </View>
      ),
    },
    { key: 'resource_type', label: 'משאב', width: 100, render: (type: string) => <Text style={styles.resourceText}>{type}</Text> },
    { key: 'ip_address', label: 'IP', width: 120, render: (ip: string) => <Text style={styles.ipText}>{ip}</Text> },
    {
      key: 'details',
      label: 'פרטים',
      width: 150,
      render: (details: Record<string, any>) => (
        <Text style={styles.detailsText} numberOfLines={1}>
          {details?.changed_fields ? `שונה: ${details.changed_fields.join(', ')}` : '-'}
        </Text>
      ),
    },
    { key: 'created_at', label: 'תאריך', width: 180, render: (date: string) => <Text style={styles.dateText}>{formatDate(date)}</Text> },
  ];

  const actionFilters = ['', 'user', 'subscription', 'payment', 'settings', 'campaign', 'content'];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>{t('admin.titles.auditLogs', 'לוג פעילות')}</Text>
          <Text style={styles.subtitle}>מעקב אחר כל הפעולות במערכת</Text>
        </View>
        <View style={styles.headerActions}>
          <GlassButton title="סנן" variant="secondary" icon={<Filter size={16} color={colors.text} />} onPress={() => setShowFilterModal(true)} />
          <GlassButton title="ייצא" variant="secondary" icon={<Download size={16} color={colors.text} />} onPress={handleExport} />
        </View>
      </View>

      <View style={styles.filtersRow}>
        {actionFilters.map((action) => (
          <Pressable key={action} onPress={() => setFilters((prev) => ({ ...prev, action }))} style={[styles.filterButton, filters.action === action && styles.filterButtonActive]}>
            <Text style={[styles.filterText, filters.action === action && styles.filterTextActive]}>
              {action === '' ? 'הכל' : action}
            </Text>
          </Pressable>
        ))}
      </View>

      <DataTable columns={columns} data={logs} loading={loading} pagination={pagination} onPageChange={handlePageChange} emptyMessage="לא נמצאו רשומות" searchable={false} />

      <GlassModal visible={showFilterModal} onClose={() => setShowFilterModal(false)} title="סינון מתקדם">
        <View style={styles.modalContent}>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>סוג פעולה</Text>
            <View style={styles.filterOptions}>
              {actionFilters.map((action) => (
                <Pressable key={action} onPress={() => setFilters((prev) => ({ ...prev, action }))} style={[styles.filterOption, filters.action === action && styles.filterOptionActive]}>
                  <Text style={[styles.filterOptionText, filters.action === action && styles.filterOptionTextActive]}>
                    {action === '' ? 'הכל' : action}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.modalActions}>
            <GlassButton title="נקה" variant="secondary" onPress={() => setFilters({ action: '', user_id: '' })} />
            <GlassButton title="החל" variant="primary" onPress={() => setShowFilterModal(false)} />
          </View>
        </View>
      </GlassModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  filterButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  filterButtonActive: { backgroundColor: colors.primary },
  filterText: { fontSize: 14, color: colors.textMuted, textTransform: 'capitalize' },
  filterTextActive: { color: colors.text, fontWeight: '500' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm, alignSelf: 'flex-start' },
  badgeIcon: { fontSize: 14 },
  badgeText: { fontSize: 12, fontWeight: '500', textTransform: 'capitalize' },
  userName: { fontSize: 14, fontWeight: '500', color: colors.text },
  userId: { fontSize: 11, color: colors.textMuted, fontFamily: 'monospace' },
  resourceText: { fontSize: 13, color: colors.textSecondary, textTransform: 'capitalize' },
  ipText: { fontSize: 12, color: colors.textMuted, fontFamily: 'monospace' },
  detailsText: { fontSize: 12, color: colors.textMuted },
  dateText: { fontSize: 12, color: colors.textMuted },
  modalContent: { gap: spacing.md },
  formGroup: { gap: spacing.sm },
  formLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filterOption: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.backgroundLighter },
  filterOptionActive: { backgroundColor: colors.primary },
  filterOptionText: { fontSize: 14, color: colors.textMuted, textTransform: 'capitalize' },
  filterOptionTextActive: { color: colors.text },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.md },
});
