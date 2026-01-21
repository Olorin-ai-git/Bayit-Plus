/**
 * DataTable Component
 * Reusable data table with sorting, filtering, and pagination
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize } from '../../theme';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: number | string;
  sortable?: boolean;
  render?: (item: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  sortable?: boolean;
  defaultSort?: {
    key: string;
    direction: 'asc' | 'desc';
  };
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onRowPress?: (item: T) => void;
  selectedRows?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  actions?: (item: T) => React.ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyMessage,
  searchable = false,
  searchPlaceholder,
  onSearch,
  pagination,
  sortable = false,
  defaultSort,
  onSort,
  onRowPress,
  selectedRows = [],
  onSelectionChange,
  actions,
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState(defaultSort || { key: '', direction: 'asc' as const });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  const handleSort = (key: string) => {
    if (!sortable) return;

    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
    onSort?.(key, direction);
  };

  const handleSelectAll = () => {
    if (!onSelectionChange) return;

    if (selectedRows.length === data.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(data.map(keyExtractor));
    }
  };

  const handleSelectRow = (id: string) => {
    if (!onSelectionChange) return;

    if (selectedRows.includes(id)) {
      onSelectionChange(selectedRows.filter(rowId => rowId !== id));
    } else {
      onSelectionChange([...selectedRows, id]);
    }
  };

  const renderSortIndicator = (columnKey: string) => {
    if (sortConfig.key !== columnKey) return null;
    return (
      <Text style={styles.sortIndicator}>
        {sortConfig.direction === 'asc' ? '▲' : '▼'}
      </Text>
    );
  };

  const renderPagination = () => {
    if (!pagination) return null;

    const { page, pageSize, total, onPageChange } = pagination;
    const totalPages = Math.ceil(total / pageSize);
    const startItem = (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, total);

    return (
      <View style={styles.paginationContainer}>
        <Text style={styles.paginationInfo}>
          {t('admin.table.showing', 'Showing')} {startItem}-{endItem} {t('admin.table.of', 'of')} {total}
        </Text>

        <View style={styles.paginationControls}>
          <TouchableOpacity
            style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
            onPress={() => onPageChange(1)}
            disabled={page === 1}
          >
            <Text style={styles.pageButtonText}>{'<<'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
            onPress={() => onPageChange(page - 1)}
            disabled={page === 1}
          >
            <Text style={styles.pageButtonText}>{'<'}</Text>
          </TouchableOpacity>

          <View style={styles.pageIndicator}>
            <Text style={styles.pageIndicatorText}>
              {page} / {totalPages}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.pageButton, page === totalPages && styles.pageButtonDisabled]}
            onPress={() => onPageChange(page + 1)}
            disabled={page === totalPages}
          >
            <Text style={styles.pageButtonText}>{'>'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pageButton, page === totalPages && styles.pageButtonDisabled]}
            onPress={() => onPageChange(totalPages)}
            disabled={page === totalPages}
          >
            <Text style={styles.pageButtonText}>{'>>'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const hasSelection = !!onSelectionChange;
  const hasActions = !!actions;
  const allSelected = data.length > 0 && selectedRows.length === data.length;

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      {searchable && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={searchPlaceholder || t('admin.table.search', 'Search...')}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          <Text style={styles.searchIcon}>🔍</Text>
        </View>
      )}

      {/* Table */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.headerRow}>
            {hasSelection && (
              <TouchableOpacity
                style={styles.checkboxCell}
                onPress={handleSelectAll}
              >
                <View style={[styles.checkbox, allSelected && styles.checkboxSelected]}>
                  {allSelected && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </TouchableOpacity>
            )}

            {columns.map((column) => (
              <TouchableOpacity
                key={String(column.key)}
                style={[
                  styles.headerCell,
                  column.width ? { width: column.width as number } : { flex: 1 },
                  column.align === 'center' && styles.alignCenter,
                  column.align === 'right' && styles.alignRight,
                ]}
                onPress={() => column.sortable && handleSort(String(column.key))}
                disabled={!column.sortable}
              >
                <Text style={styles.headerText}>{column.header}</Text>
                {column.sortable && renderSortIndicator(String(column.key))}
              </TouchableOpacity>
            ))}

            {hasActions && (
              <View style={[styles.headerCell, styles.actionsCell]}>
                <Text style={styles.headerText}>{t('admin.table.actions', 'Actions')}</Text>
              </View>
            )}
          </View>

          {/* Loading State */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}

          {/* Empty State */}
          {!loading && data.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {emptyMessage || t('admin.table.noData', 'No data available')}
              </Text>
            </View>
          )}

          {/* Data Rows */}
          {!loading && data.map((item, index) => {
            const id = keyExtractor(item);
            const isSelected = selectedRows.includes(id);

            return (
              <TouchableOpacity
                key={id}
                style={[
                  styles.dataRow,
                  index % 2 === 1 && styles.dataRowAlt,
                  isSelected && styles.dataRowSelected,
                ]}
                onPress={() => onRowPress?.(item)}
                disabled={!onRowPress}
              >
                {hasSelection && (
                  <TouchableOpacity
                    style={styles.checkboxCell}
                    onPress={() => handleSelectRow(id)}
                  >
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                )}

                {columns.map((column) => {
                  const value = column.render
                    ? column.render(item, index)
                    : (item as any)[column.key];

                  return (
                    <View
                      key={String(column.key)}
                      style={[
                        styles.dataCell,
                        column.width ? { width: column.width as number } : { flex: 1 },
                        column.align === 'center' && styles.alignCenter,
                        column.align === 'right' && styles.alignRight,
                      ]}
                    >
                      {typeof value === 'string' || typeof value === 'number' ? (
                        <Text style={styles.dataText} numberOfLines={2}>
                          {value}
                        </Text>
                      ) : (
                        value
                      )}
                    </View>
                  );
                })}

                {hasActions && (
                  <View style={[styles.dataCell, styles.actionsCell]}>
                    {actions(item)}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Pagination */}
      {renderPagination()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: colors.backgroundLighter,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingRight: 40,
    color: colors.text,
    fontSize: fontSize.sm,
  },
  searchIcon: {
    position: 'absolute',
    right: spacing.lg + spacing.sm,
    fontSize: 16,
  },
  table: {
    minWidth: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundLighter,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  headerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    minWidth: 100,
  },
  headerText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  sortIndicator: {
    fontSize: 10,
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  dataRowAlt: {
    backgroundColor: colors.backgroundLight + '50',
  },
  dataRowSelected: {
    backgroundColor: colors.primary + '20',
  },
  dataCell: {
    padding: spacing.md,
    justifyContent: 'center',
    minWidth: 100,
  },
  dataText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  checkboxCell: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionsCell: {
    width: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alignCenter: {
    alignItems: 'center',
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  loadingContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  paginationInfo: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pageButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.backgroundLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  pageIndicator: {
    paddingHorizontal: spacing.md,
  },
  pageIndicatorText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
});

export default DataTable;
