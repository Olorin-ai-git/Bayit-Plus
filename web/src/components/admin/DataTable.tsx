import { useState, ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { GlassCard, GlassView, GlassInput } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';

interface Column {
  key: string;
  label: string;
  width?: string | number;
  className?: string;
  render?: (value: any, row: any) => ReactNode;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  pagination?: Pagination;
  onSearch?: (value: string) => void;
  onPageChange?: (page: number) => void;
  emptyMessage?: string;
  actions?: ReactNode;
}

export default function DataTable({
  columns,
  data,
  loading = false,
  searchable = true,
  searchPlaceholder,
  pagination,
  onSearch,
  onPageChange,
  emptyMessage,
  actions,
}: DataTableProps) {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const [searchTerm, setSearchTerm] = useState('');

  // For RTL, reverse column order so actions appear on the right side
  const displayColumns = isRTL ? [...columns].reverse() : columns;

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 0;

  return (
    <GlassCard style={styles.container} autoSize>
      {/* Header */}
      {(searchable || actions) && (
        <View style={[styles.header, { flexDirection }]}>
          {searchable && (
            <GlassInput
              value={searchTerm}
              onChangeText={handleSearch}
              placeholder={searchPlaceholder || t('common.search', 'Search...')}
              containerStyle={[styles.searchContainer, { flexDirection }]}
              inputStyle={[styles.searchInput, { textAlign }]}
              leftIcon={<Search size={18} color={colors.textMuted} />}
            />
          )}
          {actions && <View style={[styles.actionsContainer, { flexDirection }]}>{actions}</View>}
        </View>
      )}

      {/* Table */}
      <View style={styles.tableWrapper}>
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            {displayColumns.map((col) => (
              <View key={col.key} style={[styles.headerCell, col.width ? { width: col.width as any } : { flex: 1 }]}>
                <Text style={[styles.headerText, { textAlign }]}>{col.label}</Text>
              </View>
            ))}
          </View>

          {/* Table Body */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
            </View>
          ) : data.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{emptyMessage || t('common.noData', 'No data')}</Text>
            </View>
          ) : (
            data.map((row, rowIndex) => (
              <View
                key={row.id || rowIndex}
                style={[styles.tableRow, rowIndex < data.length - 1 && styles.tableRowBorder]}
              >
                {displayColumns.map((col) => (
                  <View key={col.key} style={[styles.cell, col.width ? { width: col.width as any } : { flex: 1 }]}>
                    {col.render ? col.render(row[col.key], row) : (
                      <Text style={[styles.cellText, { textAlign }]}>{row[col.key]}</Text>
                    )}
                  </View>
                ))}
              </View>
            ))
          )}
        </View>
      </View>

      {/* Pagination */}
      {pagination && pagination.total > pagination.pageSize && (
        <View style={[styles.pagination, { flexDirection }]}>
          <Text style={styles.paginationText}>
            {t('common.showing', 'Showing')} {(pagination.page - 1) * pagination.pageSize + 1}-
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} {t('common.of', 'of')}{' '}
            {pagination.total}
          </Text>
          <View style={[styles.paginationButtons, { flexDirection }]}>
            <Pressable
              onPress={() => onPageChange && onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              style={[styles.pageButton, pagination.page <= 1 && styles.pageButtonDisabled]}
            >
              {isRTL ? (
                <ChevronRight size={16} color={pagination.page <= 1 ? colors.textMuted : colors.text} />
              ) : (
                <ChevronLeft size={16} color={pagination.page <= 1 ? colors.textMuted : colors.text} />
              )}
            </Pressable>
            <Text style={styles.pageText}>
              {pagination.page} / {totalPages}
            </Text>
            <Pressable
              onPress={() => onPageChange && onPageChange(pagination.page + 1)}
              disabled={pagination.page >= totalPages}
              style={[styles.pageButton, pagination.page >= totalPages && styles.pageButtonDisabled]}
            >
              {isRTL ? (
                <ChevronLeft size={16} color={pagination.page >= totalPages ? colors.textMuted : colors.text} />
              ) : (
                <ChevronRight size={16} color={pagination.page >= totalPages ? colors.textMuted : colors.text} />
              )}
            </Pressable>
          </View>
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 0,
    overflow: 'hidden',
    width: '100%' as any,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    gap: spacing.md,
  },
  searchContainer: {
    flex: 1,
    maxWidth: 280,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  searchIcon: {
    // margin handled inline based on RTL
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tableWrapper: {
    width: '100%' as any,
    minHeight: 200,
    overflowX: 'auto' as any,
  },
  table: {
    width: '100%' as any,
    minWidth: 600,
    display: 'flex' as any,
    flexDirection: 'column',
  },
  tableHeader: {
    display: 'flex' as any,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    width: '100%' as any,
  },
  headerCell: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 80,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    // textAlign handled inline based on RTL
  },
  tableRow: {
    display: 'flex' as any,
    flexDirection: 'row',
    width: '100%' as any,
  },
  tableRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  cell: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    minWidth: 80,
  },
  cellText: {
    fontSize: 14,
    color: colors.text,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  emptyContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  paginationText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  paginationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pageButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.glass,
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageText: {
    fontSize: 14,
    color: colors.text,
  },
});
