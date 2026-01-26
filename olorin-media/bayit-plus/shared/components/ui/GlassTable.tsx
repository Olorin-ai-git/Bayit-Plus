/**
 * GlassTable - A consistent, glassmorphic table component for admin interfaces
 * Uses StyleSheet for React Native Web compatibility
 */

import React, { ReactNode, CSSProperties, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { GlassView } from './GlassView';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';

export interface GlassTableColumn<T = any> {
  key: string;
  label: string;
  width?: number | string;
  minWidth?: number;
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  resizable?: boolean;
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
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (columnKey: string, direction: 'asc' | 'desc') => void;
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
  sortBy,
  sortDirection,
  onSort,
  style,
}: GlassTableProps<T>) {
  // State for column widths
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const widths: Record<string, number> = {};
    columns.forEach(column => {
      if (typeof column.width === 'number') {
        widths[column.key] = column.width;
      }
    });
    return widths;
  });

  // State for column resizing
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 0;

  // Handle sort column click
  const handleSort = useCallback((columnKey: string) => {
    if (!onSort) return;

    // Toggle direction: if already sorting by this column, toggle direction
    // Otherwise, start with ascending
    const newDirection = sortBy === columnKey && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(columnKey, newDirection);
  }, [sortBy, sortDirection, onSort]);

  // Get sort icon for column
  const getSortIcon = (columnKey: string) => {
    if (sortBy !== columnKey) {
      return <ArrowUpDown size={14} color={colors.textMuted} style={{ opacity: 0.4 }} />;
    }

    return sortDirection === 'asc'
      ? <ArrowUp size={14} color={colors.primary.DEFAULT} />
      : <ArrowDown size={14} color={colors.primary.DEFAULT} />;
  };

  // Get column width with state override
  const getColumnWidth = (column: GlassTableColumn): number | string | undefined => {
    if (columnWidths[column.key] !== undefined) {
      return columnWidths[column.key];
    }
    return column.width;
  };

  // Handle column resize start
  const handleResizeStart = useCallback((e: any, columnKey: string, currentWidth: number) => {
    e.preventDefault();
    e.stopPropagation();

    setResizingColumn(columnKey);
    resizeStartX.current = e.pageX || e.clientX;
    resizeStartWidth.current = currentWidth;
  }, []);

  // Handle column resize move
  const handleResizeMove = useCallback((e: any) => {
    if (!resizingColumn) return;

    const currentX = e.pageX || e.clientX;
    const deltaX = isRTL ? resizeStartX.current - currentX : currentX - resizeStartX.current;
    const newWidth = resizeStartWidth.current + deltaX;

    // Get column config for constraints
    const column = columns.find(col => col.key === resizingColumn);
    if (!column) return;

    const minWidth = column.minWidth || 100;
    const maxWidth = column.maxWidth || 600;
    const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

    setColumnWidths(prev => ({
      ...prev,
      [resizingColumn]: constrainedWidth,
    }));
  }, [resizingColumn, columns, isRTL]);

  // Handle column resize end
  const handleResizeEnd = useCallback(() => {
    if (resizingColumn) {
      setResizingColumn(null);
    }
  }, [resizingColumn]);

  // Setup global mouse event listeners for resize
  useEffect(() => {
    if (resizingColumn) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.addEventListener('mouseleave', handleResizeEnd);

      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
        document.removeEventListener('mouseleave', handleResizeEnd);
      };
    }
  }, [resizingColumn, handleResizeMove, handleResizeEnd]);

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
          {columns.map((column, index) => {
            const currentWidth = getColumnWidth(column);
            const numericWidth = typeof currentWidth === 'number' ? currentWidth : undefined;
            return (
              <View
                key={column.key}
                style={[
                  styles.headerCellContainer,
                  currentWidth ? { width: currentWidth as any, flex: undefined } : { flex: 1 }
                ]}
              >
                <Pressable
                  onPress={() => column.sortable && handleSort(column.key)}
                  style={[
                    styles.headerCell,
                    column.sortable && styles.headerCellSortable
                  ]}
                >
                  <View style={[styles.headerContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={[styles.headerText, { textAlign: getTextAlign(column) }]}>
                      {column.label}
                    </Text>
                    {column.sortable && (
                      <View style={styles.sortIcon}>
                        {getSortIcon(column.key)}
                      </View>
                    )}
                  </View>
                </Pressable>

                {column.resizable && index < columns.length - 1 && (
                  <Pressable
                    onMouseDown={(e) => handleResizeStart(e, column.key, numericWidth || 150)}
                    style={[
                      styles.resizeHandle,
                      resizingColumn === column.key && styles.resizeHandleActive
                    ]}
                  >
                    <View style={styles.resizeHandleLine} />
                  </Pressable>
                )}
              </View>
            );
          })}
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
                  {columns.map((column) => {
                    const currentWidth = getColumnWidth(column);
                    return (
                      <View
                        key={column.key}
                        style={[
                          styles.cell,
                          currentWidth ? { width: currentWidth as any, flex: undefined } : { flex: 1 }
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
                    );
                  })}
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
    position: 'relative' as any,
  },
  stickyHeader: {
    position: 'sticky' as any,
    top: 0,
    zIndex: 10,
  },
  headerCellContainer: {
    position: 'relative' as any,
    flexDirection: 'row' as any,
  },
  headerCell: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerCellSortable: {
    cursor: 'pointer',
    userSelect: 'none',
  } as any,
  headerContent: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    // @ts-ignore - Web CSS
    whiteSpace: 'nowrap',
  },
  sortIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs / 2,
  } as any,
  resizeHandle: {
    position: 'absolute' as any,
    right: -1,
    top: 0,
    bottom: 0,
    width: 4,
    cursor: 'col-resize',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
  } as any,
  resizeHandleActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
  } as any,
  resizeHandleLine: {
    width: 1,
    height: '60%',
    backgroundColor: 'rgba(139, 92, 246, 0.5)',
  } as any,
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
