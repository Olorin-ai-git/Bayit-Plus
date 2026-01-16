/**
 * GlassTable - A consistent, glassmorphic table component for admin interfaces
 */

import React, { ReactNode, CSSProperties } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { GlassView } from './GlassView';
import { colors, borderRadius, spacing } from '../theme';

export interface GlassTableColumn<T = any> {
  key: string;
  label: string;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: T, index: number) => ReactNode;
}

export interface GlassTablePagination {
  page: number;
  pageSize: number;
  total: number;
}

export interface GlassTableProps<T = any> {
  columns: GlassTableColumn<T>[];
  data: T[];
  loading?: boolean;
  pagination?: GlassTablePagination;
  onPageChange?: (page: number) => void;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  isRTL?: boolean;
  rowKey?: string | ((row: T, index: number) => string);
  onRowPress?: (row: T, index: number) => void;
  stickyHeader?: boolean;
  /** Enable staggered row animations */
  animateRows?: boolean;
  style?: any;
}

export function GlassTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  pagination,
  onPageChange,
  emptyMessage = 'No data available',
  emptyIcon,
  isRTL = false,
  rowKey = 'id',
  onRowPress,
  stickyHeader = false,
  animateRows = true,
  style,
}: GlassTableProps<T>) {
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 0;
  
  // Generate row animation styles (web only)
  const getRowAnimationStyle = (index: number): CSSProperties => {
    if (!animateRows || Platform.OS !== 'web') return {};
    const delayIndex = Math.min(index, 19);
    const delayMs = delayIndex * 30; // 30ms increment per row
    const animationName = isRTL ? 'rowFadeSlideInRTL' : 'rowFadeSlideIn';
    return {
      animation: `${animationName} 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delayMs}ms both`,
    };
  };

  const getRowKey = (row: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(row, index);
    }
    return row[rowKey]?.toString() || index.toString();
  };

  const getTextAlign = (column: GlassTableColumn): 'left' | 'center' | 'right' => {
    if (column.align) return column.align;
    return isRTL ? 'right' : 'left';
  };

  return (
    <GlassView style={[styles.container, style]} intensity="medium">
      {/* Table */}
      <View style={styles.tableWrapper}>
        {/* Header */}
        <View style={[
          styles.headerRow,
          stickyHeader && styles.stickyHeader,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}>
          {columns.map((column) => (
            <View
              key={column.key}
              style={[
                styles.headerCell,
                column.width ? { width: column.width as any, flex: undefined } : { flex: 1 },
              ]}
            >
              <Text
                style={[
                  styles.headerText,
                  { textAlign: getTextAlign(column) },
                ]}
              >
                {column.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Body */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : data.length === 0 ? (
          <View style={styles.emptyContainer}>
            {emptyIcon}
            <Text style={styles.emptyText}>{emptyMessage}</Text>
          </View>
        ) : (
          data.map((row, rowIndex) => {
            const rowKey = getRowKey(row, rowIndex);
            const rowContent = (
              <Pressable
                onPress={onRowPress ? () => onRowPress(row, rowIndex) : undefined}
                style={[
                  styles.dataRow,
                  rowIndex < data.length - 1 && styles.dataRowBorder,
                ]}
              >
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flex: 1 }}>
                  {columns.map((column) => (
                    <View
                      key={column.key}
                      style={[
                        styles.dataCell,
                        column.width ? { width: column.width as any, flex: undefined } : { flex: 1 },
                      ]}
                    >
                      {column.render ? (
                        column.render(row[column.key], row, rowIndex)
                      ) : (
                        <Text
                          style={[
                            styles.cellText,
                            { textAlign: getTextAlign(column) },
                          ]}
                          numberOfLines={1}
                        >
                          {row[column.key]?.toString() || '-'}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              </Pressable>
            );

            // Wrap in animated div on web
            if (Platform.OS === 'web' && animateRows) {
              return (
                <div key={rowKey} style={getRowAnimationStyle(rowIndex)}>
                  {rowContent}
                </div>
              );
            }

            return <React.Fragment key={rowKey}>{rowContent}</React.Fragment>;
          })
        )}
      </View>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <View style={[styles.pagination, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={styles.paginationInfo}>
            {(pagination.page - 1) * pagination.pageSize + 1}-
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} / {pagination.total}
          </Text>
          <View style={[styles.paginationButtons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Pressable
              onPress={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              style={[styles.pageButton, pagination.page <= 1 && styles.pageButtonDisabled]}
            >
              {isRTL ? (
                <ChevronRight size={18} color={pagination.page <= 1 ? colors.textMuted : colors.text} />
              ) : (
                <ChevronLeft size={18} color={pagination.page <= 1 ? colors.textMuted : colors.text} />
              )}
            </Pressable>
            <Text style={styles.pageText}>{pagination.page} / {totalPages}</Text>
            <Pressable
              onPress={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= totalPages}
              style={[styles.pageButton, pagination.page >= totalPages && styles.pageButtonDisabled]}
            >
              {isRTL ? (
                <ChevronLeft size={18} color={pagination.page >= totalPages ? colors.textMuted : colors.text} />
              ) : (
                <ChevronRight size={18} color={pagination.page >= totalPages ? colors.textMuted : colors.text} />
              )}
            </Pressable>
          </View>
        </View>
      )}
    </GlassView>
  );
}

// Consistent cell content components for use with render prop
export const GlassTableCell = {
  Text: ({ children, muted = false }: { children: ReactNode; muted?: boolean }) => (
    <Text style={[styles.cellText, muted && styles.cellTextMuted]} numberOfLines={1}>
      {children}
    </Text>
  ),

  TwoLine: ({ primary, secondary, align = 'right' }: { primary: string; secondary?: string; align?: 'left' | 'right' }) => (
    <View style={{ alignItems: align === 'right' ? 'flex-end' : 'flex-start' }}>
      <Text style={styles.cellText} numberOfLines={1}>{primary}</Text>
      {secondary && <Text style={styles.cellTextSecondary} numberOfLines={1}>{secondary}</Text>}
    </View>
  ),

  Badge: ({ children, variant = 'default' }: { children: string; variant?: 'success' | 'warning' | 'error' | 'default' }) => {
    const variantStyles = {
      success: { bg: '#10b98120', text: '#10b981' },
      warning: { bg: '#f59e0b20', text: '#f59e0b' },
      error: { bg: '#ef444420', text: '#ef4444' },
      default: { bg: '#6b728020', text: '#6b7280' },
    };
    const style = variantStyles[variant];
    return (
      <View style={[styles.badge, { backgroundColor: style.bg }]}>
        <Text style={[styles.badgeText, { color: style.text }]}>{children}</Text>
      </View>
    );
  },

  Actions: ({ children, isRTL = false }: { children: ReactNode; isRTL?: boolean }) => (
    <View style={[styles.actionsContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      {children}
    </View>
  ),

  ActionButton: ({ onPress, icon, variant = 'default', disabled = false }: {
    onPress: () => void;
    icon: ReactNode;
    variant?: 'primary' | 'danger' | 'default';
    disabled?: boolean;
  }) => {
    const variantStyles = {
      primary: '#a855f7',
      danger: '#ef4444',
      default: colors.textMuted,
    };
    const color = variantStyles[variant];
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={[
          styles.actionButton,
          { backgroundColor: `${color}20` },
          disabled && { opacity: 0.5 },
        ]}
      >
        {icon}
      </Pressable>
    );
  },
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
  },
  tableWrapper: {
    minHeight: 200,
  },
  headerRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  stickyHeader: {
    position: 'sticky' as any,
    top: 0,
    zIndex: 10,
  },
  headerCell: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dataRow: {
    backgroundColor: 'transparent',
  },
  dataRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  dataRowPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  dataCell: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    justifyContent: 'center',
    minHeight: 56,
  },
  cellText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  cellTextMuted: {
    color: colors.textMuted,
  },
  cellTextSecondary: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  emptyContainer: {
    paddingVertical: spacing.xl * 2,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  paginationInfo: {
    fontSize: 13,
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageText: {
    fontSize: 13,
    color: colors.text,
    minWidth: 50,
    textAlign: 'center',
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default GlassTable;
