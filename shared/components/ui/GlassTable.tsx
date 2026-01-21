/**
 * GlassTable - A consistent, glassmorphic table component for admin interfaces
 */

import React, { ReactNode, CSSProperties } from 'react';
import { View, Text, Pressable, ActivityIndicator, Platform } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { GlassView } from './GlassView';
import { colors } from '../theme';

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
    <GlassView className="overflow-hidden rounded-lg" style={style} intensity="medium">
      {/* Table */}
      <View className="min-h-[200px]">
        {/* Header */}
        <View
          className={`bg-white/[0.03] border-b border-white/[0.08] ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
          style={stickyHeader ? { position: 'sticky' as any, top: 0, zIndex: 10 } : undefined}
        >
          {columns.map((column) => (
            <View
              key={column.key}
              className="px-4 py-4"
              style={column.width ? { width: column.width as any, flex: undefined } : { flex: 1 }}
            >
              <Text
                className="text-[13px] font-semibold text-gray-400 uppercase tracking-wide"
                style={{ textAlign: getTextAlign(column) }}
              >
                {column.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Body */}
        {loading ? (
          <View className="flex-row items-center justify-center py-16 gap-2">
            <ActivityIndicator size="small" color={colors.primary} />
            <Text className="text-sm text-gray-500">Loading...</Text>
          </View>
        ) : data.length === 0 ? (
          <View className="py-16 items-center gap-2">
            {emptyIcon}
            <Text className="text-sm text-gray-500">{emptyMessage}</Text>
          </View>
        ) : (
          data.map((row, rowIndex) => {
            const rowKey = getRowKey(row, rowIndex);
            const rowContent = (
            <Pressable
              onPress={onRowPress ? () => onRowPress(row, rowIndex) : undefined}
              className={`bg-transparent ${rowIndex < data.length - 1 ? 'border-b border-white/5' : ''}`}
            >
              <View className="flex-1" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                {columns.map((column) => (
                  <View
                    key={column.key}
                    className="px-4 py-4 justify-center min-h-[56px]"
                    style={column.width ? { width: column.width as any, flex: undefined } : { flex: 1 }}
                  >
                    {column.render ? (
                      column.render(row[column.key], row, rowIndex)
                    ) : (
                      <Text
                        className="text-sm text-white leading-5"
                        style={{ textAlign: getTextAlign(column) }}
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
        <View className={`flex-row items-center justify-between px-4 py-4 border-t border-white/5 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Text className="text-[13px] text-gray-500">
            {(pagination.page - 1) * pagination.pageSize + 1}-
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} / {pagination.total}
          </Text>
          <View className={`flex-row items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Pressable
              onPress={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className={`p-1 rounded bg-white/5 ${pagination.page <= 1 ? 'opacity-50' : ''}`}
            >
              {isRTL ? (
                <ChevronRight size={18} color={pagination.page <= 1 ? colors.textMuted : colors.text} />
              ) : (
                <ChevronLeft size={18} color={pagination.page <= 1 ? colors.textMuted : colors.text} />
              )}
            </Pressable>
            <Text className="text-[13px] text-white min-w-[50px] text-center">{pagination.page} / {totalPages}</Text>
            <Pressable
              onPress={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= totalPages}
              className={`p-1 rounded bg-white/5 ${pagination.page >= totalPages ? 'opacity-50' : ''}`}
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
    <Text className={`text-sm leading-5 ${muted ? 'text-gray-500' : 'text-white'}`} numberOfLines={1}>
      {children}
    </Text>
  ),

  TwoLine: ({ primary, secondary, align = 'right' }: { primary: string; secondary?: string; align?: 'left' | 'right' }) => (
    <View style={{ alignItems: align === 'right' ? 'flex-end' : 'flex-start' }}>
      <Text className="text-sm text-white leading-5" numberOfLines={1}>{primary}</Text>
      {secondary && <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>{secondary}</Text>}
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
      <View className="px-2 py-1 rounded-full self-start" style={{ backgroundColor: style.bg }}>
        <Text className="text-xs font-semibold" style={{ color: style.text }}>{children}</Text>
      </View>
    );
  },

  Actions: ({ children, isRTL = false }: { children: ReactNode; isRTL?: boolean }) => (
    <View className={`flex-row items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
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
        className={`p-2 rounded-lg justify-center items-center ${disabled ? 'opacity-50' : ''}`}
        style={{ backgroundColor: `${color}20` }}
      >
        {icon}
      </Pressable>
    );
  },
};

export default GlassTable;