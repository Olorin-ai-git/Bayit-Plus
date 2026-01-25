import { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  Trash2,
  Eye,
  Download,
  ChevronUp,
  ChevronDown,
  Search,
  Filter,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreVertical,
} from 'lucide-react';
import { GlassButton, GlassBadge, GlassInput } from '@bayit/shared/ui';
import { GlassDraggableExpander } from '@bayit/shared/ui/web';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import { AuditReport } from '@/services/librarianService';
import { format, formatDistanceToNow } from 'date-fns';

interface RecentReportsListProps {
  reports: AuditReport[];
  clearingReports: boolean;
  isRTL: boolean;
  onViewReport: (auditId: string) => void;
  onClearReports: () => void;
  onDownloadReport?: (auditId: string) => void;
  onDeleteReport?: (auditId: string) => void;
}

type SortField = 'date' | 'type' | 'status' | 'duration' | 'issues';
type SortDirection = 'asc' | 'desc';

export const RecentReportsList = ({
  reports,
  clearingReports,
  isRTL,
  onViewReport,
  onClearReports,
  onDownloadReport,
  onDeleteReport,
}: RecentReportsListProps) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredAndSortedReports = useMemo(() => {
    let filtered = reports;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (report) =>
          report.audit_type.toLowerCase().includes(query) ||
          report.status.toLowerCase().includes(query) ||
          report.audit_id.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter((report) => report.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'date':
          comparison = new Date(a.audit_date).getTime() - new Date(b.audit_date).getTime();
          break;
        case 'type':
          comparison = a.audit_type.localeCompare(b.audit_type);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'duration':
          comparison = a.execution_time_seconds - b.execution_time_seconds;
          break;
        case 'issues':
          comparison = a.issues_count - b.issues_count;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [reports, searchQuery, statusFilter, sortField, sortDirection]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp size={14} color={colors.primary} />
    ) : (
      <ChevronDown size={14} color={colors.primary} />
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} color={colors.success.DEFAULT} />;
      case 'failed':
        return <XCircle size={16} color={colors.error.DEFAULT} />;
      case 'partial':
        return <AlertCircle size={16} color={colors.warning.DEFAULT} />;
      default:
        return <Clock size={16} color={colors.textMuted} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return colors.success.DEFAULT;
      case 'failed':
        return colors.error.DEFAULT;
      case 'partial':
        return colors.warning.DEFAULT;
      default:
        return colors.textMuted;
    }
  };

  return (
    <GlassDraggableExpander
      title={t('admin.librarian.reports.title', 'Recent Audit Reports')}
      subtitle={`${filteredAndSortedReports.length} ${
        filteredAndSortedReports.length === 1
          ? t('admin.librarian.reports.report', 'report')
          : t('admin.librarian.reports.reports', 'reports')
      }`}
      icon={<FileText size={18} color={colors.primary} />}
      defaultExpanded={false}
    >
      <View style={styles.container}>
        {/* Toolbar */}
        <View style={styles.toolbar}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Search size={16} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('admin.librarian.reports.search', 'Search reports...')}
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Status Filter */}
          <View style={styles.filterContainer}>
            {['completed', 'failed', 'partial'].map((status) => (
              <Pressable
                key={status}
                style={[
                  styles.filterChip,
                  statusFilter === status && styles.filterChipActive,
                ]}
                onPress={() => setStatusFilter(statusFilter === status ? null : status)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    statusFilter === status && styles.filterChipTextActive,
                  ]}
                >
                  {t(`admin.librarian.status.${status}`, status)}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Clear All Button */}
          {reports.length > 0 && (
            <GlassButton
              title={t('admin.librarian.reports.clearAll', 'Clear All')}
              variant="ghost"
              size="sm"
              icon={<Trash2 size={14} color={colors.error.DEFAULT} />}
              onPress={onClearReports}
              loading={clearingReports}
              disabled={clearingReports}
              style={styles.clearButton}
            />
          )}
        </View>

        {/* Table */}
        {filteredAndSortedReports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FileText size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>
              {searchQuery || statusFilter
                ? t('admin.librarian.reports.noMatchingReports', 'No matching reports found')
                : t('admin.librarian.reports.emptyMessage', 'No audit reports yet')}
            </Text>
            {(searchQuery || statusFilter) && (
              <GlassButton
                title={t('admin.librarian.reports.clearFilters', 'Clear Filters')}
                variant="ghost"
                size="sm"
                onPress={() => {
                  setSearchQuery('');
                  setStatusFilter(null);
                }}
                style={styles.clearFiltersButton}
              />
            )}
          </View>
        ) : (
          <View style={styles.tableContainer}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Pressable
                style={[styles.headerCell, styles.dateColumn]}
                onPress={() => handleSort('date')}
              >
                <Text style={styles.headerText}>
                  {t('admin.librarian.reports.date', 'DATE')}
                </Text>
                {renderSortIcon('date')}
              </Pressable>

              <Pressable
                style={[styles.headerCell, styles.typeColumn]}
                onPress={() => handleSort('type')}
              >
                <Text style={styles.headerText}>
                  {t('admin.librarian.reports.type', 'TYPE')}
                </Text>
                {renderSortIcon('type')}
              </Pressable>

              <Pressable
                style={[styles.headerCell, styles.statusColumn]}
                onPress={() => handleSort('status')}
              >
                <Text style={styles.headerText}>
                  {t('admin.librarian.reports.status', 'STATUS')}
                </Text>
                {renderSortIcon('status')}
              </Pressable>

              <Pressable
                style={[styles.headerCell, styles.durationColumn]}
                onPress={() => handleSort('duration')}
              >
                <Text style={styles.headerText}>
                  {t('admin.librarian.reports.duration', 'DURATION')}
                </Text>
                {renderSortIcon('duration')}
              </Pressable>

              <Pressable
                style={[styles.headerCell, styles.issuesColumn]}
                onPress={() => handleSort('issues')}
              >
                <Text style={styles.headerText}>
                  {t('admin.librarian.reports.issues', 'ISSUES')}
                </Text>
                {renderSortIcon('issues')}
              </Pressable>

              <View style={[styles.headerCell, styles.fixesColumn]}>
                <Text style={styles.headerText}>
                  {t('admin.librarian.reports.fixes', 'FIXES')}
                </Text>
              </View>

              <View style={[styles.headerCell, styles.actionsColumn]}>
                <Text style={styles.headerText}>
                  {t('admin.librarian.reports.actions', 'ACTIONS')}
                </Text>
              </View>
            </View>

            {/* Table Body */}
            <ScrollView style={styles.tableBody} nestedScrollEnabled>
              {filteredAndSortedReports.map((report) => (
                <View key={report.audit_id} style={styles.tableRow}>
                  <View style={[styles.cell, styles.dateColumn]}>
                    <Text style={styles.cellTextPrimary}>
                      {format(new Date(report.audit_date), 'MMM d, yyyy')}
                    </Text>
                    <Text style={styles.cellTextSecondary}>
                      {format(new Date(report.audit_date), 'HH:mm:ss')}
                    </Text>
                    <Text style={styles.cellTextTertiary}>
                      {formatDistanceToNow(new Date(report.audit_date), { addSuffix: true })}
                    </Text>
                  </View>

                  <View style={[styles.cell, styles.typeColumn]}>
                    <Text style={styles.cellTextPrimary}>
                      {t(
                        `admin.librarian.auditTypes.${report.audit_type}`,
                        report.audit_type.replace('_', ' ')
                      )}
                    </Text>
                  </View>

                  <View style={[styles.cell, styles.statusColumn]}>
                    <View style={styles.statusBadge}>
                      {getStatusIcon(report.status)}
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(report.status) },
                        ]}
                      >
                        {t(`admin.librarian.status.${report.status}`, report.status)}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.cell, styles.durationColumn]}>
                    <View style={styles.durationBadge}>
                      <Clock size={14} color={colors.textMuted} />
                      <Text style={styles.cellTextPrimary}>
                        {report.execution_time_seconds < 60
                          ? `${report.execution_time_seconds.toFixed(1)}s`
                          : `${(report.execution_time_seconds / 60).toFixed(1)}m`}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.cell, styles.issuesColumn]}>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{report.issues_count}</Text>
                    </View>
                  </View>

                  <View style={[styles.cell, styles.fixesColumn]}>
                    <View style={[styles.countBadge, styles.successBadge]}>
                      <Text style={styles.countBadgeText}>{report.fixes_count}</Text>
                    </View>
                  </View>

                  <View style={[styles.cell, styles.actionsColumn]}>
                    <View style={styles.actionButtons}>
                      <Pressable
                        style={({ hovered }) => [
                          styles.actionButton,
                          hovered && styles.actionButtonHovered,
                        ]}
                        onPress={() => onViewReport(report.audit_id)}
                      >
                        <Eye size={16} color={colors.primary} />
                      </Pressable>

                      {onDownloadReport && (
                        <Pressable
                          style={({ hovered }) => [
                            styles.actionButton,
                            hovered && styles.actionButtonHovered,
                          ]}
                          onPress={() => onDownloadReport(report.audit_id)}
                        >
                          <Download size={16} color={colors.textMuted} />
                        </Pressable>
                      )}

                      {onDeleteReport && (
                        <Pressable
                          style={({ hovered }) => [
                            styles.actionButton,
                            hovered && styles.actionButtonHovered,
                          ]}
                          onPress={() => onDeleteReport(report.audit_id)}
                        >
                          <Trash2 size={16} color={colors.error.DEFAULT} />
                        </Pressable>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Pagination Info */}
            {filteredAndSortedReports.length > 0 && (
              <View style={styles.paginationInfo}>
                <Text style={styles.paginationText}>
                  {t('admin.librarian.reports.showing', 'Showing')} {filteredAndSortedReports.length}{' '}
                  {t('admin.librarian.reports.of', 'of')} {reports.length}{' '}
                  {t('admin.librarian.reports.reports', 'reports')}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </GlassDraggableExpander>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  toolbar: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    minWidth: 240,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.sm,
    height: 36,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    outlineStyle: 'none',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    cursor: 'pointer',
  },
  filterChipActive: {
    backgroundColor: `${colors.primary}20`,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  filterChipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  clearButton: {
    marginLeft: 'auto',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: 'center',
  },
  clearFiltersButton: {
    marginTop: spacing.sm,
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  headerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    cursor: 'pointer',
  },
  headerText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateColumn: {
    flex: 2,
  },
  typeColumn: {
    flex: 2.5,
  },
  statusColumn: {
    flex: 1.5,
  },
  durationColumn: {
    flex: 1.2,
  },
  issuesColumn: {
    flex: 1,
  },
  fixesColumn: {
    flex: 1,
  },
  actionsColumn: {
    flex: 1.5,
  },
  tableBody: {
    maxHeight: 600,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  cell: {
    justifyContent: 'center',
  },
  cellTextPrimary: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  cellTextSecondary: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  cellTextTertiary: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  countBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    minWidth: 32,
    alignItems: 'center',
  },
  successBadge: {
    backgroundColor: `${colors.success.DEFAULT}20`,
  },
  countBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  actionButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transform: [{ scale: 1.05 }],
  },
  paginationInfo: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  paginationText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
