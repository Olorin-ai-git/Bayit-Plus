/**
 * AuditLogsScreen
 * System audit logs with filtering and export
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared/hooks';
import { AdminLayout, DataTable, Column } from '@bayit/shared/admin';
import { auditLogsService, AuditLogsFilter } from '../../services/adminApi';
import { AuditLog, AuditAction } from '../../types/rbac';
import { colors, spacing, borderRadius, fontSize } from '@bayit/shared/theme';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { getActivityIcon } from '../../utils/adminConstants';

export const AuditLogsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalLogs, setTotalLogs] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const [filters, setFilters] = useState<AuditLogsFilter>({
    user_id: '',
    action: '',
    resource_type: '',
    date_from: '',
    date_to: '',
    page: 1,
    page_size: 50,
  });

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await auditLogsService.getLogs(filters);
      setLogs(response.items);
      setTotalLogs(response.total);
    } catch (err) {
      console.error('Error loading logs:', err);
      setError(t('admin.logs.loadError', 'Failed to load audit logs. Please try again.'));
      setLogs([]);
      setTotalLogs(0);
    } finally {
      setLoading(false);
    }
  }, [filters, t]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handlePageChange = (page: number) => setFilters(prev => ({ ...prev, page }));

  const handleExport = async () => {
    try {
      await auditLogsService.exportLogs(filters);
      Alert.alert(t('admin.logs.exported', 'Exported'), t('admin.logs.exportedMessage', 'Audit logs have been exported'));
    } catch (error) {
      console.error('Error exporting logs:', error);
    }
  };

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setShowDetails(true);
  };

  const getActionColor = (action: string): string => {
    if (action.includes('create') || action.includes('login')) return colors.success;
    if (action.includes('delete') || action.includes('ban')) return colors.error;
    if (action.includes('update') || action.includes('change')) return colors.warning;
    return colors.primary;
  };

  const columns: Column<AuditLog>[] = [
    {
      key: 'created_at',
      header: t('admin.logs.columns.timestamp', 'Timestamp'),
      width: 180,
      sortable: true,
      render: (log) => <Text style={styles.dateText}>{formatDateTime(log.created_at)}</Text>,
    },
    {
      key: 'action',
      header: t('admin.logs.columns.action', 'Action'),
      width: 180,
      render: (log) => (
        <View style={styles.actionCell}>
          <Text style={styles.actionIcon}>{getActivityIcon(log.action)}</Text>
          <View style={[styles.actionBadge, { backgroundColor: getActionColor(log.action) + '20' }]}>
            <Text style={[styles.actionText, { color: getActionColor(log.action) }]}>
              {log.action.replace(/\./g, ' ').replace(/_/g, ' ')}
            </Text>
          </View>
        </View>
      ),
    },
    {
      key: 'user_id',
      header: t('admin.logs.columns.user', 'User'),
      width: 140,
      render: (log) => <Text style={styles.userText}>{log.user_id.slice(0, 12)}...</Text>,
    },
    {
      key: 'resource_type',
      header: t('admin.logs.columns.resource', 'Resource'),
      width: 120,
      render: (log) => (
        <Text style={styles.resourceText}>{log.resource_type || '-'}</Text>
      ),
    },
    {
      key: 'resource_id',
      header: t('admin.logs.columns.resourceId', 'Resource ID'),
      width: 120,
      render: (log) => (
        <Text style={styles.resourceIdText}>{log.resource_id?.slice(0, 10) || '-'}</Text>
      ),
    },
    {
      key: 'ip_address',
      header: t('admin.logs.columns.ip', 'IP Address'),
      width: 120,
      render: (log) => <Text style={styles.ipText}>{log.ip_address || '-'}</Text>,
    },
  ];

  const renderActions = (log: AuditLog) => (
    <TouchableOpacity style={styles.viewButton} onPress={() => handleViewDetails(log)}>
      <Text style={styles.viewButtonText}>👁️</Text>
    </TouchableOpacity>
  );

  const headerActions = (
    <View style={styles.headerActions}>
      <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(true)}>
        <Text style={styles.filterButtonIcon}>🔍</Text>
        <Text style={styles.filterButtonText}>{t('admin.logs.filters', 'Filters')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
        <Text style={styles.exportButtonText}>📥 {t('admin.logs.export', 'Export')}</Text>
      </TouchableOpacity>
    </View>
  );

  const actionTypes = ['', 'login', 'logout', 'user.created', 'user.updated', 'user.deleted', 'subscription.created', 'payment.received', 'settings.updated'];
  const resourceTypes = ['', 'user', 'subscription', 'payment', 'campaign', 'settings', 'session'];

  return (
    <AdminLayout title={t('admin.titles.auditLogs', 'Audit Logs')} actions={headerActions}>
      <View style={styles.container}>
        {/* Active Filters */}
        {(filters.action || filters.resource_type || filters.user_id || filters.date_from) && (
          <View style={styles.activeFilters}>
            {filters.action && (
              <TouchableOpacity style={styles.filterChip} onPress={() => setFilters(prev => ({ ...prev, action: '' }))}>
                <Text style={styles.filterChipText}>Action: {filters.action} ✕</Text>
              </TouchableOpacity>
            )}
            {filters.resource_type && (
              <TouchableOpacity style={styles.filterChip} onPress={() => setFilters(prev => ({ ...prev, resource_type: '' }))}>
                <Text style={styles.filterChipText}>Resource: {filters.resource_type} ✕</Text>
              </TouchableOpacity>
            )}
            {filters.user_id && (
              <TouchableOpacity style={styles.filterChip} onPress={() => setFilters(prev => ({ ...prev, user_id: '' }))}>
                <Text style={styles.filterChipText}>User: {filters.user_id.slice(0, 8)}... ✕</Text>
              </TouchableOpacity>
            )}
            {filters.date_from && (
              <TouchableOpacity style={styles.filterChip} onPress={() => setFilters(prev => ({ ...prev, date_from: '', date_to: '' }))}>
                <Text style={styles.filterChipText}>Date range ✕</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <DataTable
          columns={columns}
          data={logs}
          keyExtractor={(log) => log.id}
          loading={loading}
          pagination={{
            page: filters.page || 1,
            pageSize: filters.page_size || 50,
            total: totalLogs,
            onPageChange: handlePageChange,
          }}
          actions={renderActions}
          emptyMessage={t('admin.logs.noLogs', 'No audit logs found')}
        />

        {/* Filters Modal */}
        <Modal visible={showFilters} transparent animationType="fade" onRequestClose={() => setShowFilters(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('admin.logs.filterTitle', 'Filter Logs')}</Text>

              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>{t('admin.logs.filterAction', 'Action')}</Text>
                <View style={styles.filterOptions}>
                  {actionTypes.map((action) => (
                    <TouchableOpacity key={action} style={[styles.filterOption, filters.action === action && styles.filterOptionActive]} onPress={() => setFilters(prev => ({ ...prev, action }))}>
                      <Text style={[styles.filterOptionText, filters.action === action && styles.filterOptionTextActive]}>{action || 'All'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>{t('admin.logs.filterResource', 'Resource Type')}</Text>
                <View style={styles.filterOptions}>
                  {resourceTypes.map((type) => (
                    <TouchableOpacity key={type} style={[styles.filterOption, filters.resource_type === type && styles.filterOptionActive]} onPress={() => setFilters(prev => ({ ...prev, resource_type: type }))}>
                      <Text style={[styles.filterOptionText, filters.resource_type === type && styles.filterOptionTextActive]}>{type || 'All'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>{t('admin.logs.filterUser', 'User ID')}</Text>
                <TextInput style={styles.filterInput} value={filters.user_id || ''} onChangeText={(text) => setFilters(prev => ({ ...prev, user_id: text }))} placeholder="Enter user ID" placeholderTextColor={colors.textMuted} />
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>{t('admin.logs.filterDateRange', 'Date Range')}</Text>
                <View style={styles.dateInputs}>
                  <TextInput style={styles.dateInput} value={filters.date_from || ''} onChangeText={(text) => setFilters(prev => ({ ...prev, date_from: text }))} placeholder="From (YYYY-MM-DD)" placeholderTextColor={colors.textMuted} />
                  <TextInput style={styles.dateInput} value={filters.date_to || ''} onChangeText={(text) => setFilters(prev => ({ ...prev, date_to: text }))} placeholder="To (YYYY-MM-DD)" placeholderTextColor={colors.textMuted} />
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.clearButton} onPress={() => setFilters({ page: 1, page_size: 50 })}>
                  <Text style={styles.clearButtonText}>{t('admin.logs.clearFilters', 'Clear')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.applyButton} onPress={() => setShowFilters(false)}>
                  <Text style={styles.applyButtonText}>{t('admin.logs.apply', 'Apply')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Details Modal */}
        <Modal visible={showDetails} transparent animationType="fade" onRequestClose={() => setShowDetails(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.detailsModal}>
              <Text style={styles.modalTitle}>{t('admin.logs.details', 'Log Details')}</Text>

              {selectedLog && (
                <View style={styles.detailsList}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('admin.logs.id', 'Log ID')}</Text>
                    <Text style={styles.detailValue}>{selectedLog.id}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('admin.logs.timestamp', 'Timestamp')}</Text>
                    <Text style={styles.detailValue}>{formatDateTime(selectedLog.created_at)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('admin.logs.action', 'Action')}</Text>
                    <Text style={styles.detailValue}>{selectedLog.action}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('admin.logs.userId', 'User ID')}</Text>
                    <Text style={styles.detailValue}>{selectedLog.user_id}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('admin.logs.resourceType', 'Resource Type')}</Text>
                    <Text style={styles.detailValue}>{selectedLog.resource_type || '-'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('admin.logs.resourceId', 'Resource ID')}</Text>
                    <Text style={styles.detailValue}>{selectedLog.resource_id || '-'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('admin.logs.ipAddress', 'IP Address')}</Text>
                    <Text style={styles.detailValue}>{selectedLog.ip_address || '-'}</Text>
                  </View>
                  {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailLabel}>{t('admin.logs.additionalDetails', 'Additional Details')}</Text>
                      <View style={styles.jsonBox}>
                        <Text style={styles.jsonText}>{JSON.stringify(selectedLog.details, null, 2)}</Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

              <TouchableOpacity style={styles.closeButton} onPress={() => setShowDetails(false)}>
                <Text style={styles.closeButtonText}>{t('common.close', 'Close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </AdminLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  filterButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.glass, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.glassBorder },
  filterButtonIcon: { fontSize: 16, marginRight: spacing.xs },
  filterButtonText: { fontSize: fontSize.sm, color: colors.text },
  exportButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.secondary, borderRadius: borderRadius.md },
  exportButtonText: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  activeFilters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  filterChip: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, backgroundColor: colors.primary + '30', borderRadius: borderRadius.sm },
  filterChipText: { fontSize: fontSize.xs, color: colors.primary },
  dateText: { fontSize: fontSize.xs, color: colors.textSecondary },
  actionCell: { flexDirection: 'row', alignItems: 'center' },
  actionIcon: { fontSize: 16, marginRight: spacing.xs },
  actionBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  actionText: { fontSize: fontSize.xs, fontWeight: '600', textTransform: 'capitalize' },
  userText: { fontSize: fontSize.xs, color: colors.text, fontFamily: 'monospace' },
  resourceText: { fontSize: fontSize.sm, color: colors.textSecondary, textTransform: 'capitalize' },
  resourceIdText: { fontSize: fontSize.xs, color: colors.textMuted, fontFamily: 'monospace' },
  ipText: { fontSize: fontSize.xs, color: colors.textMuted, fontFamily: 'monospace' },
  viewButton: { width: 30, height: 30, borderRadius: borderRadius.sm, backgroundColor: colors.backgroundLighter, justifyContent: 'center', alignItems: 'center' },
  viewButtonText: { fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 550, backgroundColor: colors.backgroundLight, borderRadius: borderRadius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.glassBorder },
  detailsModal: { width: '90%', maxWidth: 500, backgroundColor: colors.backgroundLight, borderRadius: borderRadius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.glassBorder, maxHeight: '80%' },
  modalTitle: { fontSize: fontSize.xl, fontWeight: 'bold', color: colors.text, marginBottom: spacing.lg },
  filterSection: { marginBottom: spacing.md },
  filterLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  filterOption: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, backgroundColor: colors.backgroundLighter, borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.glassBorder },
  filterOptionActive: { backgroundColor: colors.primary + '30', borderColor: colors.primary },
  filterOptionText: { fontSize: fontSize.xs, color: colors.textSecondary },
  filterOptionTextActive: { color: colors.primary, fontWeight: '600' },
  filterInput: { backgroundColor: colors.backgroundLighter, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.glassBorder, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text, fontSize: fontSize.sm },
  dateInputs: { flexDirection: 'row', gap: spacing.sm },
  dateInput: { flex: 1, backgroundColor: colors.backgroundLighter, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.glassBorder, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text, fontSize: fontSize.sm },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
  clearButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.backgroundLighter, borderRadius: borderRadius.md },
  clearButtonText: { fontSize: fontSize.sm, color: colors.textSecondary },
  applyButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.primary, borderRadius: borderRadius.md },
  applyButtonText: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  detailsList: { marginBottom: spacing.lg },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  detailLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  detailValue: { fontSize: fontSize.sm, color: colors.text, maxWidth: '60%', textAlign: 'right' },
  detailsSection: { marginTop: spacing.md },
  jsonBox: { backgroundColor: colors.backgroundLighter, borderRadius: borderRadius.md, padding: spacing.sm, marginTop: spacing.xs },
  jsonText: { fontSize: fontSize.xs, color: colors.textSecondary, fontFamily: 'monospace' },
  closeButton: { paddingVertical: spacing.md, backgroundColor: colors.glass, borderRadius: borderRadius.md, alignItems: 'center', borderWidth: 1, borderColor: colors.glassBorder },
  closeButtonText: { fontSize: fontSize.sm, color: colors.text },
});

export default AuditLogsScreen;
