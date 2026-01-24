/**
 * GlassTable - A consistent, glassmorphic table component for admin interfaces
 * Uses StyleSheet for React Native Web compatibility
 */

import React, { ReactNode, CSSProperties } from 'react';
import { View, Text, Pressable, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { GlassView } from './GlassView';
import { colors, spacing, borderRadius } from '../theme';

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

  const getRowAnimationStyle = (index: number): CSSProperties => {
    if (!animateRows || Platform.OS !== 'web') return {};
    const delayIndex = Math.min(index, 19);
    const delayMs = delayIndex * 30;
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
      <View style={styles.tableContainer}>
        <View
          style={[
            styles.headerRow,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
            stickyHeader && styles.stickyHeader
          ]}
        >
          {columns.map((column) => (
            <View
              key={column.key}
              style={[
                styles.headerCell,
                column.width ? { width: column.width as any, flex: undefined } : { flex: 1 }
              ]}
            >
              <Text style={[styles.headerText, { textAlign: getTextAlign(column) }]}>
                {column.label}
              </Text>
            </View>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingSpinner}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : data.length === 0 ? (
          <View style={styles.emptyContainer}>
            {emptyIcon && <View style={styles.emptyIcon}>{emptyIcon}</View>}
            <Text style={styles.emptyText}>{emptyMessage}</Text>
          </View>
        ) : (
          data.map((row, rowIndex) => {
            const rowKeyValue = getRowKey(row, rowIndex);
            const rowContent = (
              <Pressable
                onPress={onRowPress ? () => onRowPress(row, rowIndex) : undefined}
                style={[
                  styles.row,
                  rowIndex < data.length - 1 && styles.rowBorder
                ]}
              >
                <View style={[styles.rowContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {columns.map((column) => (
                    <View
                      key={column.key}
                      style={[
                        styles.cell,
                        column.width ? { width: column.width as any, flex: undefined } : { flex: 1 }
                      ]}
                    >
                      {column.render ? (
                        column.render(row[column.key], row, rowIndex)
                      ) : (
                        <Text
                          style={[styles.cellText, { textAlign: getTextAlign(column) }]}
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

            if (Platform.OS === 'web' && animateRows) {
              return (
                <div key={rowKeyValue} style={getRowAnimationStyle(rowIndex)}>
                  {rowContent}
                </div>
              );
            }

            return <React.Fragment key={rowKeyValue}>{rowContent}</React.Fragment>;
          })
        )}
      </View>

      {pagination && totalPages > 1 && (
        <View style={[styles.pagination, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={styles.paginationInfo}>
            {(pagination.page - 1) * pagination.pageSize + 1}-
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} / {pagination.total}
          </Text>
          <View style={[styles.paginationButtons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={styles.paginationButtonWrapper}>
              <Pressable
                onPress={() => onPageChange?.(pagination.page - 1)}
                disabled={pagination.page <= 1}
                style={[styles.paginationButton, pagination.page <= 1 && styles.paginationButtonDisabled]}
              >
                {isRTL ? (
                  <ChevronRight size={18} color={pagination.page <= 1 ? colors.textMuted : colors.text} />
                ) : (
                  <ChevronLeft size={18} color={pagination.page <= 1 ? colors.textMuted : colors.text} />
                )}
              </Pressable>
            </View>
            <View style={styles.paginationButtonWrapper}>
              <Text style={styles.paginationText}>{pagination.page} / {totalPages}</Text>
            </View>
            <View style={styles.paginationButtonWrapper}>
              <Pressable
                onPress={() => onPageChange?.(pagination.page + 1)}
                disabled={pagination.page >= totalPages}
                style={[styles.paginationButton, pagination.page >= totalPages && styles.paginationButtonDisabled]}
              >
                {isRTL ? (
                  <ChevronLeft size={18} color={pagination.page >= totalPages ? colors.textMuted : colors.text} />
                ) : (
                  <ChevronRight size={18} color={pagination.page >= totalPages ? colors.textMuted : colors.text} />
                )}
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </GlassView>
  );
}

export const GlassTableCell = {
  Text: ({ children, muted = false }: { children: ReactNode; muted?: boolean }) => (
    <Text style={[cellStyles.text, muted && cellStyles.textMuted]} numberOfLines={1}>
      {children}
    </Text>
  ),

  TwoLine: ({ primary, secondary, align = 'right' }: { primary: string; secondary?: string; align?: 'left' | 'right' }) => (
    <View style={{ alignItems: align === 'right' ? 'flex-end' : 'flex-start' }}>
      <Text style={cellStyles.primaryText} numberOfLines={1}>{primary}</Text>
      {secondary && <Text style={cellStyles.secondaryText} numberOfLines={1}>{secondary}</Text>}
    </View>
  ),

  Badge: ({ children, variant = 'default' }: { children: string; variant?: 'success' | 'warning' | 'error' | 'default' }) => {
    const variantStyles = {
      success: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981' },
      warning: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' },
      error: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' },
      default: { bg: 'rgba(107, 114, 128, 0.15)', text: '#6b7280' },
    };
    const style = variantStyles[variant];
    return (
      <View style={[cellStyles.badge, { backgroundColor: style.bg }]}>
        <Text style={[cellStyles.badgeText, { color: style.text }]}>{children}</Text>
      </View>
    );
  },

  Actions: ({ children, isRTL = false }: { children: ReactNode; isRTL?: boolean }) => {
    const childArray = React.Children.toArray(children);
    return (
      <View style={[cellStyles.actions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {childArray.map((child, index) => (
          <View key={index} style={cellStyles.actionButtonWrapper}>
            {child}
          </View>
        ))}
      </View>
    );
  },

  ActionButton: ({ onPress, icon, variant = 'default', disabled = false }: {
    onPress: () => void;
    icon: ReactNode;
    variant?: 'primary' | 'danger' | 'default';
    disabled?: boolean;
  }) => {
    const variantColors = {
      primary: 'rgba(168, 85, 247, 0.15)',
      danger: 'rgba(239, 68, 68, 0.15)',
      default: 'rgba(255, 255, 255, 0.05)',
    };
    const bgColor = variantColors[variant];
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={[
          cellStyles.actionButton,
          { backgroundColor: bgColor },
          disabled && cellStyles.actionButtonDisabled
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
  tableContainer: {
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
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  loadingSpinner: {
    marginRight: spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  emptyContainer: {
    paddingVertical: 64,
    alignItems: 'center',
  },
  emptyIcon: {
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  row: {
    backgroundColor: 'transparent',
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  rowContent: {
    flex: 1,
  },
  cell: {
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
  pagination: {
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
  },
  paginationButtonWrapper: {
    marginHorizontal: spacing.xs,
  },
  paginationButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationText: {
    fontSize: 13,
    color: colors.text,
    minWidth: 50,
    textAlign: 'center',
  },
});

const cellStyles = StyleSheet.create({
  text: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  textMuted: {
    color: colors.textMuted,
  },
  primaryText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  secondaryText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonWrapper: {
    marginHorizontal: spacing.xs / 2,
  },
  actionButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
});

export default GlassTable;
