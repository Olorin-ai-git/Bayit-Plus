/**
 * GlassHierarchicalTable - A glassmorphic hierarchical table component
 *
 * Features:
 * - Expandable/collapsible parent rows with nested children
 * - Multi-select with checkboxes
 * - Customizable columns with render functions
 * - Column sorting with direction toggle
 * - Resizable column widths by dragging
 * - Proper glassmorphic styling
 * - RTL support
 * - Pagination
 * - Loading states
 * - Empty states
 *
 * @module GlassHierarchicalTable
 */

import React, { useState, useCallback, ReactNode, useRef, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Image, Animated } from 'react-native';
import { ChevronRight, ChevronDown, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { GlassView } from './GlassView';
import { GlassCheckbox } from './GlassCheckbox';

// ============================================
// Types & Interfaces
// ============================================

export interface HierarchicalTableColumn<T = any> {
  key: string;
  label: string;
  width?: number | string;
  minWidth?: number;
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  resizable?: boolean;
  render?: (value: any, row: T, level: number) => ReactNode;
  renderChild?: (value: any, row: T, parent: T, level: number) => ReactNode;
}

export interface HierarchicalTableRow<T = any> {
  id: string;
  data: T;
  children?: HierarchicalTableRow<T>[];
  isExpanded?: boolean;
}

export interface HierarchicalTablePagination {
  page: number;
  pageSize: number;
  total: number;
}

export interface HierarchicalTableProps<T = any> {
  columns: HierarchicalTableColumn<T>[];
  rows: HierarchicalTableRow<T>[];
  loading?: boolean;
  pagination?: HierarchicalTablePagination;
  onPageChange?: (page: number) => void;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  isRTL?: boolean;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  onRowPress?: (row: HierarchicalTableRow<T>) => void;
  onExpandToggle?: (rowId: string, expanded: boolean) => void;
  expandable?: boolean;
  defaultExpandAll?: boolean;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (columnKey: string, direction: 'asc' | 'desc') => void;
  style?: any;
}

// ============================================
// Main Component
// ============================================

export function GlassHierarchicalTable<T extends Record<string, any>>({
  columns,
  rows,
  loading = false,
  pagination,
  onPageChange,
  emptyMessage = 'No data available',
  emptyIcon,
  isRTL = false,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  onRowPress,
  onExpandToggle,
  expandable = true,
  defaultExpandAll = false,
  sortBy,
  sortDirection,
  onSort,
  style,
}: HierarchicalTableProps<T>) {
  // ============================================
  // State Management
  // ============================================

  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => {
    if (defaultExpandAll) {
      return new Set(rows.map(row => row.id));
    }
    return new Set();
  });

  // Column width state - initialize from column definitions
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const widths: Record<string, number> = {};
    columns.forEach(column => {
      if (typeof column.width === 'number') {
        widths[column.key] = column.width;
      }
    });
    return widths;
  });

  // Resize drag state
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);

  // ============================================
  // Handlers
  // ============================================

  const handleToggleExpand = useCallback((rowId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      const isExpanded = !newSet.has(rowId);

      if (isExpanded) {
        newSet.add(rowId);
      } else {
        newSet.delete(rowId);
      }

      onExpandToggle?.(rowId, isExpanded);
      return newSet;
    });
  }, [onExpandToggle]);

  const handleSelectRow = useCallback((rowId: string) => {
    if (!selectable || !onSelectionChange) return;

    const newSelectedIds = selectedIds.includes(rowId)
      ? selectedIds.filter(id => id !== rowId)
      : [...selectedIds, rowId];

    onSelectionChange(newSelectedIds);
  }, [selectable, selectedIds, onSelectionChange]);

  const handleSelectAll = useCallback(() => {
    if (!selectable || !onSelectionChange) return;

    const allRowIds: string[] = [];
    const collectIds = (rowList: HierarchicalTableRow<T>[]) => {
      rowList.forEach(row => {
        allRowIds.push(row.id);
        if (row.children) {
          collectIds(row.children);
        }
      });
    };
    collectIds(rows);

    const allSelected = allRowIds.length > 0 && allRowIds.every(id => selectedIds.includes(id));
    onSelectionChange(allSelected ? [] : allRowIds);
  }, [selectable, rows, selectedIds, onSelectionChange]);

  const isAllSelected = useCallback(() => {
    if (!selectable || rows.length === 0) return false;

    const allRowIds: string[] = [];
    const collectIds = (rowList: HierarchicalTableRow<T>[]) => {
      rowList.forEach(row => {
        allRowIds.push(row.id);
        if (row.children) {
          collectIds(row.children);
        }
      });
    };
    collectIds(rows);

    return allRowIds.length > 0 && allRowIds.every(id => selectedIds.includes(id));
  }, [selectable, rows, selectedIds]);

  const getTextAlign = (column: HierarchicalTableColumn): 'left' | 'center' | 'right' => {
    if (column.align) return column.align;
    return isRTL ? 'right' : 'left';
  };

  const getColumnWidth = (column: HierarchicalTableColumn): number | string | undefined => {
    // Use state width if available (user has resized)
    if (columnWidths[column.key] !== undefined) {
      return columnWidths[column.key];
    }
    // Otherwise use column definition width
    return column.width;
  };

  const handleSort = useCallback((columnKey: string) => {
    if (!onSort) return;

    console.log('[GlassHierarchicalTable] handleSort called:', {
      columnKey,
      currentSortBy: sortBy,
      currentSortDirection: sortDirection,
    });

    // Toggle direction: if already sorting by this column, toggle direction
    // Otherwise, start with ascending
    const newDirection = sortBy === columnKey && sortDirection === 'asc' ? 'desc' : 'asc';

    console.log('[GlassHierarchicalTable] Calling onSort with:', {
      columnKey,
      newDirection,
    });

    onSort(columnKey, newDirection);
  }, [sortBy, sortDirection, onSort]);

  const getSortIcon = (columnKey: string) => {
    console.log('[GlassHierarchicalTable] getSortIcon:', {
      columnKey,
      sortBy,
      sortDirection,
      isMatch: sortBy === columnKey,
    });

    if (sortBy !== columnKey) {
      return <ArrowUpDown size={14} color={colors.textMuted} style={{ opacity: 0.4 }} />;
    }

    return sortDirection === 'asc'
      ? <ArrowUp size={14} color={colors.primary.DEFAULT} />
      : <ArrowDown size={14} color={colors.primary.DEFAULT} />;
  };

  // Column resize handlers
  const handleResizeStart = useCallback((e: any, columnKey: string, currentWidth: number) => {
    e.preventDefault();
    e.stopPropagation();

    setResizingColumn(columnKey);
    resizeStartX.current = e.pageX || e.clientX;
    resizeStartWidth.current = currentWidth;

    console.log('[GlassHierarchicalTable] Resize start:', { columnKey, currentWidth, startX: resizeStartX.current });
  }, []);

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

  const handleResizeEnd = useCallback(() => {
    if (resizingColumn) {
      console.log('[GlassHierarchicalTable] Resize end:', {
        columnKey: resizingColumn,
        finalWidth: columnWidths[resizingColumn]
      });
      setResizingColumn(null);
    }
  }, [resizingColumn, columnWidths]);

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

  // Debug: Log when sort props change
  useEffect(() => {
    console.log('[GlassHierarchicalTable] Sort props updated:', {
      sortBy,
      sortDirection,
    });
  }, [sortBy, sortDirection]);

  // ============================================
  // Animated Components
  // ============================================

  const AnimatedChevron: React.FC<{
    isExpanded: boolean;
    onPress: () => void;
  }> = ({ isExpanded, onPress }) => {
    const rotation = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

    useEffect(() => {
      Animated.timing(rotation, {
        toValue: isExpanded ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }, [isExpanded]);

    const rotateInterpolate = rotation.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '90deg'],
    });

    return (
      <Pressable onPress={onPress} style={styles.expandButton}>
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <ChevronRight
            size={18}
            color={isExpanded ? colors.primary.DEFAULT : colors.textMuted}
          />
        </Animated.View>
      </Pressable>
    );
  };

  const AnimatedChildren: React.FC<{
    isExpanded: boolean;
    children: ReactNode;
  }> = ({ isExpanded, children }) => {
    const animatedHeight = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;
    const animatedOpacity = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.timing(animatedHeight, {
          toValue: isExpanded ? 1 : 0,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(animatedOpacity, {
          toValue: isExpanded ? 1 : 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }, [isExpanded]);

    if (!isExpanded && animatedHeight._value === 0) {
      return null;
    }

    return (
      <Animated.View
        style={{
          opacity: animatedOpacity,
          transform: [
            {
              scaleY: animatedHeight,
            },
          ],
        }}
      >
        {children}
      </Animated.View>
    );
  };

  // ============================================
  // Render Functions
  // ============================================

  const renderRow = (
    row: HierarchicalTableRow<T>,
    level: number = 0,
    parent?: HierarchicalTableRow<T>
  ): ReactNode => {
    const isExpanded = expandedRows.has(row.id);
    // Consider a row to have children if children array exists (even if empty - allows for lazy loading)
    const hasChildren = row.children !== undefined && row.children !== null;
    const isSelected = selectedIds.includes(row.id);

    return (
      <React.Fragment key={row.id}>
        {/* Parent Row */}
        <Pressable
          onPress={() => onRowPress?.(row)}
          style={[
            styles.row,
            level === 0 && styles.parentRow,
            level > 0 && styles.childRow,
          ]}
        >
          <View style={[styles.rowContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {/* Selection Checkbox */}
            {selectable && (
              <View style={styles.checkboxCell}>
                <GlassCheckbox
                  checked={isSelected}
                  onChange={() => handleSelectRow(row.id)}
                />
              </View>
            )}

            {/* Expand/Collapse Chevron */}
            {expandable && level === 0 && (
              <View style={styles.expandCell}>
                {hasChildren ? (
                  <AnimatedChevron
                    isExpanded={isExpanded}
                    onPress={() => handleToggleExpand(row.id)}
                  />
                ) : (
                  <View style={styles.expandPlaceholder} />
                )}
              </View>
            )}

            {/* Data Columns */}
            {columns.map((column) => {
              const renderFn = level > 0 && column.renderChild ? column.renderChild : column.render;
              const columnWidth = getColumnWidth(column);

              return (
                <View
                  key={column.key}
                  style={[
                    styles.cell,
                    columnWidth ? { width: columnWidth as any, flex: undefined } : { flex: 1 },
                    level > 0 && styles.childCell,
                  ]}
                >
                  {renderFn ? (
                    renderFn(row.data[column.key], row.data, level)
                  ) : (
                    <Text
                      style={[
                        styles.cellText,
                        level > 0 && styles.childCellText,
                        { textAlign: getTextAlign(column) },
                      ]}
                      numberOfLines={1}
                    >
                      {row.data[column.key]?.toString() || '-'}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </Pressable>

        {/* Child Rows */}
        {hasChildren && row.children && row.children.length > 0 && (
          <AnimatedChildren isExpanded={isExpanded}>
            <View style={styles.childrenContainer}>
              {row.children.map(childRow => renderRow(childRow, level + 1, row))}
            </View>
          </AnimatedChildren>
        )}
      </React.Fragment>
    );
  };

  // ============================================
  // Main Render
  // ============================================

  return (
    <GlassView style={[styles.container, style]} intensity="medium">
      {/* Header Row */}
      <View
        style={[
          styles.headerRow,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
      >
        {/* Select All Checkbox */}
        {selectable && (
          <View style={styles.checkboxCell}>
            <GlassCheckbox
              checked={isAllSelected()}
              onChange={handleSelectAll}
            />
          </View>
        )}

        {/* Expand Column Header */}
        {expandable && <View style={styles.expandCell} />}

        {/* Column Headers */}
        {columns.map((column, columnIndex) => {
          const isSortable = column.sortable !== false; // Sortable by default unless explicitly set to false
          const isSorted = sortBy === column.key;
          const isResizable = column.resizable !== false; // Resizable by default
          const isLastColumn = columnIndex === columns.length - 1;
          const columnWidth = getColumnWidth(column);
          const numericWidth = typeof columnWidth === 'number' ? columnWidth : undefined;

          return (
            <View
              key={column.key}
              style={[
                styles.headerCellContainer,
                columnWidth ? { width: columnWidth as any, flex: undefined } : { flex: 1 },
              ]}
            >
              <Pressable
                style={[
                  styles.headerCell,
                  isSortable && styles.headerCellSortable,
                ]}
                onPress={() => isSortable && handleSort(column.key)}
                disabled={!isSortable}
              >
                <View style={[styles.headerContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text
                    style={[
                      styles.headerText,
                      { textAlign: getTextAlign(column) },
                      isSorted && styles.headerTextSorted,
                    ]}
                  >
                    {column.label}
                  </Text>
                  {isSortable && (
                    <View style={styles.sortIcon}>
                      {getSortIcon(column.key)}
                    </View>
                  )}
                </View>
              </Pressable>

              {/* Resize Handle */}
              {isResizable && !isLastColumn && (
                <Pressable
                  style={[
                    styles.resizeHandle,
                    resizingColumn === column.key && styles.resizeHandleActive,
                  ]}
                  onMouseDown={(e: any) => handleResizeStart(e, column.key, numericWidth || 150)}
                  onHoverIn={() => {
                    // Visual feedback on hover
                  }}
                  onHoverOut={() => {
                    // Remove hover feedback
                  }}
                >
                  <View style={[
                    styles.resizeHandleLine,
                    resizingColumn === column.key && styles.resizeHandleLineActive,
                  ]} />
                </Pressable>
              )}
            </View>
          );
        })}
      </View>

      {/* Body */}
      <View style={styles.bodyContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : rows.length === 0 ? (
          <View style={styles.emptyContainer}>
            {emptyIcon && <View style={styles.emptyIcon}>{emptyIcon}</View>}
            <Text style={styles.emptyText}>{emptyMessage}</Text>
          </View>
        ) : (
          rows.map(row => renderRow(row, 0))
        )}
      </View>

      {/* Pagination */}
      {pagination && (
        <View style={[styles.pagination, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={styles.paginationInfo}>
            {(pagination.page - 1) * pagination.pageSize + 1}-
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} / {pagination.total}
          </Text>
          <View style={[styles.paginationButtons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Pressable
              onPress={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              style={[styles.paginationButton, pagination.page <= 1 && styles.paginationButtonDisabled]}
            >
              <Text style={styles.paginationButtonText}>Previous</Text>
            </Pressable>
            <Text style={styles.paginationPageText}>
              Page {pagination.page} of {Math.ceil(pagination.total / pagination.pageSize)}
            </Text>
            <Pressable
              onPress={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
              style={[
                styles.paginationButton,
                pagination.page >= Math.ceil(pagination.total / pagination.pageSize) &&
                  styles.paginationButtonDisabled,
              ]}
            >
              <Text style={styles.paginationButtonText}>Next</Text>
            </Pressable>
          </View>
        </View>
      )}
    </GlassView>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
  },

  // Header
  headerRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: spacing.md,
  },
  headerCellContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  headerCell: {
    flex: 1,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  headerCellSortable: {
    cursor: 'pointer',
    // @ts-ignore - web-only property
    ':hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerTextSorted: {
    color: colors.primary.DEFAULT,
  },
  sortIcon: {
    marginLeft: spacing.xs,
  },
  resizeHandle: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 16,
    cursor: 'col-resize',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    // @ts-ignore - web-only property
    userSelect: 'none',
    // @ts-ignore - web-only property
    ':hover .resizeHandleLine': {
      backgroundColor: colors.primary.DEFAULT,
      opacity: 0.5,
    },
  },
  resizeHandleLine: {
    width: 2,
    height: '70%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 1,
    // @ts-ignore - web-only property
    transition: 'background-color 0.2s, opacity 0.2s',
  },
  resizeHandleLineActive: {
    backgroundColor: colors.primary.DEFAULT,
    opacity: 1,
  },
  resizeHandleActive: {
    // Active state when dragging
  },

  // Body
  bodyContainer: {
    minHeight: 200,
  },
  row: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  parentRow: {
    backgroundColor: 'transparent',
  },
  childRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    marginLeft: spacing['2xl'], // Indent child rows
  },
  rowContent: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  childrenContainer: {
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(126, 34, 206, 0.3)',
    paddingLeft: spacing.md,
  },

  // Cells
  checkboxCell: {
    width: 60,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandCell: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  expandPlaceholder: {
    width: 28,
    height: 28,
  },
  cell: {
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  childCell: {
    // Child cells already indented via row margin
  },
  cellText: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 20,
  },
  childCellText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  // Loading
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['2xl'],
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },

  // Empty State
  emptyContainer: {
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyIcon: {
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },

  // Pagination
  pagination: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  paginationInfo: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  paginationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  paginationButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  paginationPageText: {
    fontSize: fontSize.sm,
    color: colors.text,
    minWidth: 100,
    textAlign: 'center',
  },
});

export default GlassHierarchicalTable;
