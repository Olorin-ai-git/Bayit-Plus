/**
 * AuditLogsScreen
 * System audit logs with filtering and export
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { DataTable, Column } from '../../components/admin/DataTable';
import { auditLogsService, AuditLogsFilter } from '../../services/adminApi';
import { AuditLog, AuditAction } from '../../types/rbac';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { getActivityIcon } from '../../utils/adminConstants';

export const AuditLogsScreen: React.FC = () => {
  const { t } = useTranslation();
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
      render: (log) => <Text className="text-xs text-gray-400">{formatDateTime(log.created_at)}</Text>,
    },
    {
      key: 'action',
      header: t('admin.logs.columns.action', 'Action'),
      width: 180,
      render: (log) => (
        <View className="flex-row items-center">
          <Text className="text-base mr-1">{getActivityIcon(log.action)}</Text>
          <View style={{ backgroundColor: getActionColor(log.action) + '20' }} className="px-2 py-0.5 rounded-sm">
            <Text style={{ color: getActionColor(log.action) }} className="text-xs font-semibold capitalize">
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
      render: (log) => <Text className="text-xs text-white font-mono">{log.user_id.slice(0, 12)}...</Text>,
    },
    {
      key: 'resource_type',
      header: t('admin.logs.columns.resource', 'Resource'),
      width: 120,
      render: (log) => (
        <Text className="text-sm text-gray-400 capitalize">{log.resource_type || '-'}</Text>
      ),
    },
    {
      key: 'resource_id',
      header: t('admin.logs.columns.resourceId', 'Resource ID'),
      width: 120,
      render: (log) => (
        <Text className="text-xs text-gray-500 font-mono">{log.resource_id?.slice(0, 10) || '-'}</Text>
      ),
    },
    {
      key: 'ip_address',
      header: t('admin.logs.columns.ip', 'IP Address'),
      width: 120,
      render: (log) => <Text className="text-xs text-gray-500 font-mono">{log.ip_address || '-'}</Text>,
    },
  ];

  const renderActions = (log: AuditLog) => (
    <TouchableOpacity className="w-[30px] h-[30px] rounded-lg bg-white/5 justify-center items-center" onPress={() => handleViewDetails(log)}>
      <Text className="text-sm">👁️</Text>
    </TouchableOpacity>
  );

  const headerActions = (
    <View className="flex-row gap-2">
      <TouchableOpacity className="flex-row items-center px-4 py-2 bg-black/20 backdrop-blur-xl rounded-lg border border-white/10" onPress={() => setShowFilters(true)}>
        <Text className="text-base mr-1">🔍</Text>
        <Text className="text-sm text-white">{t('admin.logs.filters', 'Filters')}</Text>
      </TouchableOpacity>
      <TouchableOpacity className="px-4 py-2 bg-purple-600 rounded-lg" onPress={handleExport}>
        <Text className="text-sm text-white font-semibold">📥 {t('admin.logs.export', 'Export')}</Text>
      </TouchableOpacity>
    </View>
  );

  const actionTypes = ['', 'login', 'logout', 'user.created', 'user.updated', 'user.deleted', 'subscription.created', 'payment.received', 'settings.updated'];
  const resourceTypes = ['', 'user', 'subscription', 'payment', 'campaign', 'settings', 'session'];

  return (
    <AdminLayout title={t('admin.titles.auditLogs', 'Audit Logs')} actions={headerActions}>
      <View className="flex-1 p-4">
        {/* Active Filters */}
        {(filters.action || filters.resource_type || filters.user_id || filters.date_from) && (
          <View className="flex-row flex-wrap gap-1 mb-4">
            {filters.action && (
              <TouchableOpacity className="px-2 py-1 bg-purple-500/30 rounded-sm" onPress={() => setFilters(prev => ({ ...prev, action: '' }))}>
                <Text className="text-xs text-purple-400">{t('admin.common.filterAction')}: {filters.action} ✕</Text>
              </TouchableOpacity>
            )}
            {filters.resource_type && (
              <TouchableOpacity className="px-2 py-1 bg-purple-500/30 rounded-sm" onPress={() => setFilters(prev => ({ ...prev, resource_type: '' }))}>
                <Text className="text-xs text-purple-400">{t('admin.common.filterResource')}: {filters.resource_type} ✕</Text>
              </TouchableOpacity>
            )}
            {filters.user_id && (
              <TouchableOpacity className="px-2 py-1 bg-purple-500/30 rounded-sm" onPress={() => setFilters(prev => ({ ...prev, user_id: '' }))}>
                <Text className="text-xs text-purple-400">{t('admin.common.filterUser')}: {filters.user_id.slice(0, 8)}... ✕</Text>
              </TouchableOpacity>
            )}
            {filters.date_from && (
              <TouchableOpacity className="px-2 py-1 bg-purple-500/30 rounded-sm" onPress={() => setFilters(prev => ({ ...prev, date_from: '', date_to: '' }))}>
                <Text className="text-xs text-purple-400">{t('admin.common.filterDateRange')} ✕</Text>
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
                <TextInput style={styles.filterInput} value={filters.user_id || ''} onChangeText={(text) => setFilters(prev => ({ ...prev, user_id: text }))} placeholder={t('placeholder.filter.userId', 'Enter user ID')} placeholderTextColor={colors.textMuted} />
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>{t('admin.logs.filterDateRange', 'Date Range')}</Text>
                <View style={styles.dateInputs}>
                  <TextInput style={styles.dateInput} value={filters.date_from || ''} onChangeText={(text) => setFilters(prev => ({ ...prev, date_from: text }))} placeholder={t('placeholder.dateRange.from', 'From (YYYY-MM-DD)')} placeholderTextColor={colors.textMuted} />
                  <TextInput style={styles.dateInput} value={filters.date_to || ''} onChangeText={(text) => setFilters(prev => ({ ...prev, date_to: text }))} placeholder={t('placeholder.dateRange.to', 'To (YYYY-MM-DD)')} placeholderTextColor={colors.textMuted} />
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


export default AuditLogsScreen;
