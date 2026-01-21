/**
 * DataTable Component
 * Reusable data table with sorting, filtering, and pagination
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';

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
      <Text className="text-[10px] text-primary ml-1">
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
      <View className="flex flex-row justify-between items-center p-4 border-t border-glassBorder">
        <Text className="text-sm text-textSecondary">
          {t('admin.table.showing', 'Showing')} {startItem}-{endItem} {t('admin.table.of', 'of')} {total}
        </Text>

        <View className="flex flex-row items-center gap-1">
          <TouchableOpacity
            className={`w-8 h-8 rounded bg-backgroundLighter justify-center items-center ${page === 1 ? 'opacity-50' : ''}`}
            onPress={() => onPageChange(1)}
            disabled={page === 1}
          >
            <Text className="text-sm text-text font-semibold">{'<<'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`w-8 h-8 rounded bg-backgroundLighter justify-center items-center ${page === 1 ? 'opacity-50' : ''}`}
            onPress={() => onPageChange(page - 1)}
            disabled={page === 1}
          >
            <Text className="text-sm text-text font-semibold">{'<'}</Text>
          </TouchableOpacity>

          <View className="px-4">
            <Text className="text-sm text-text">
              {page} / {totalPages}
            </Text>
          </View>

          <TouchableOpacity
            className={`w-8 h-8 rounded bg-backgroundLighter justify-center items-center ${page === totalPages ? 'opacity-50' : ''}`}
            onPress={() => onPageChange(page + 1)}
            disabled={page === totalPages}
          >
            <Text className="text-sm text-text font-semibold">{'>'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`w-8 h-8 rounded bg-backgroundLighter justify-center items-center ${page === totalPages ? 'opacity-50' : ''}`}
            onPress={() => onPageChange(totalPages)}
            disabled={page === totalPages}
          >
            <Text className="text-sm text-text font-semibold">{'>>'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const hasSelection = !!onSelectionChange;
  const hasActions = !!actions;
  const allSelected = data.length > 0 && selectedRows.length === data.length;

  return (
    <View className="flex-1 bg-glass rounded-2xl border border-glassBorder overflow-hidden">
      {/* Search Bar */}
      {searchable && (
        <View className="flex flex-row items-center p-4 border-b border-glassBorder">
          <TextInput
            className="flex-1 h-10 bg-backgroundLighter rounded px-4 pr-10 text-text text-sm"
            placeholder={searchPlaceholder || t('admin.table.search', 'Search...')}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          <Text className="absolute right-6 text-base">🔍</Text>
        </View>
      )}

      {/* Table */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="min-w-full">
          {/* Header */}
          <View className="flex flex-row bg-backgroundLighter border-b border-glassBorder">
            {hasSelection && (
              <TouchableOpacity
                className="w-[50px] justify-center items-center p-4"
                onPress={handleSelectAll}
              >
                <View className={`w-5 h-5 rounded border-2 justify-center items-center ${allSelected ? 'bg-primary border-primary' : 'border-textMuted'}`}>
                  {allSelected && <Text className="text-text text-xs font-bold">✓</Text>}
                </View>
              </TouchableOpacity>
            )}

            {columns.map((column) => (
              <TouchableOpacity
                key={String(column.key)}
                className={`flex flex-row items-center p-4 min-w-[100px] ${column.align === 'center' ? 'items-center' : column.align === 'right' ? 'items-end' : ''}`}
                style={column.width ? { width: column.width as number } : { flex: 1 }}
                onPress={() => column.sortable && handleSort(String(column.key))}
                disabled={!column.sortable}
              >
                <Text className="text-sm font-semibold text-text">{column.header}</Text>
                {column.sortable && renderSortIndicator(String(column.key))}
              </TouchableOpacity>
            ))}

            {hasActions && (
              <View className="flex flex-row items-center p-4 w-[120px] justify-center">
                <Text className="text-sm font-semibold text-text">{t('admin.table.actions', 'Actions')}</Text>
              </View>
            )}
          </View>

          {/* Loading State */}
          {loading && (
            <View className="p-8 items-center justify-center">
              <ActivityIndicator size="large" color="#3B82F6" />
            </View>
          )}

          {/* Empty State */}
          {!loading && data.length === 0 && (
            <View className="p-8 items-center justify-center">
              <Text className="text-base text-textMuted">
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
                className={`flex flex-row border-b border-glassBorder ${index % 2 === 1 ? 'bg-backgroundLight/50' : ''} ${isSelected ? 'bg-primary/20' : ''}`}
                onPress={() => onRowPress?.(item)}
                disabled={!onRowPress}
              >
                {hasSelection && (
                  <TouchableOpacity
                    className="w-[50px] justify-center items-center p-4"
                    onPress={() => handleSelectRow(id)}
                  >
                    <View className={`w-5 h-5 rounded border-2 justify-center items-center ${isSelected ? 'bg-primary border-primary' : 'border-textMuted'}`}>
                      {isSelected && <Text className="text-text text-xs font-bold">✓</Text>}
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
                      className={`p-4 justify-center min-w-[100px] ${column.align === 'center' ? 'items-center' : column.align === 'right' ? 'items-end' : ''}`}
                      style={column.width ? { width: column.width as number } : { flex: 1 }}
                    >
                      {typeof value === 'string' || typeof value === 'number' ? (
                        <Text className="text-sm text-text" numberOfLines={2}>
                          {value}
                        </Text>
                      ) : (
                        value
                      )}
                    </View>
                  );
                })}

                {hasActions && (
                  <View className="p-4 w-[120px] flex flex-row items-center justify-center">
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

export default DataTable;
