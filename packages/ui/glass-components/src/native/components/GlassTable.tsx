/**
 * GlassTable Component
 *
 * A consistent, glassmorphic table component for admin interfaces.
 * Supports pagination, custom renderers, and RTL layout.
 */

import React, { ReactNode } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Platform,
  ViewStyle,
  StyleProp,
  I18nManager,
} from 'react-native';
import { GlassView } from './GlassView';
import { colors, spacing } from '../../theme';

export interface GlassTableColumn<T = Record<string, unknown>> {
  /** Column key matching data property */
  key: string;
  /** Column header label */
  label: string;
  /** Column width */
  width?: number | string;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Custom cell renderer */
  render?: (value: unknown, row: T, index: number) => ReactNode;
}

export interface GlassTablePagination {
  /** Current page number (1-indexed) */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Total item count */
  total: number;
}

export interface GlassTableProps<T = Record<string, unknown>> {
  /** Column definitions */
  columns: GlassTableColumn<T>[];
  /** Table data rows */
  data: T[];
  /** Loading state */
  loading?: boolean;
  /** Pagination configuration */
  pagination?: GlassTablePagination;
  /** Page change callback */
  onPageChange?: (page: number) => void;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state icon */
  emptyIcon?: ReactNode;
  /** Force RTL layout */
  isRTL?: boolean;
  /** Row key extractor */
  rowKey?: string | ((row: T, index: number) => string);
  /** Row press callback */
  onRowPress?: (row: T, index: number) => void;
  /** Sticky header (web only) */
  stickyHeader?: boolean;
  /** Enable row animations */
  animateRows?: boolean;
  /** Custom previous page icon */
  prevIcon?: ReactNode;
  /** Custom next page icon */
  nextIcon?: ReactNode;
  /** Additional styles */
  style?: StyleProp<ViewStyle>;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Glassmorphic table component
 */
export function GlassTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  pagination,
  onPageChange,
  emptyMessage = 'No data available',
  emptyIcon,
  isRTL: forceRTL,
  rowKey = 'id',
  onRowPress,
  stickyHeader = false,
  animateRows = true,
  prevIcon,
  nextIcon,
  style,
  testID,
}: GlassTableProps<T>) {
  const isRTL = forceRTL ?? I18nManager.isRTL;
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 0;

  // Generate row animation styles (web only)
  const getRowAnimationStyle = (index: number): React.CSSProperties => {
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
    return (row[rowKey] as string)?.toString() || index.toString();
  };

  const getTextAlign = (column: GlassTableColumn<T>): 'left' | 'center' | 'right' => {
    if (column.align) return column.align;
    return isRTL ? 'right' : 'left';
  };

  // Default navigation icons
  const renderPrevIcon = () => {
    if (prevIcon) return prevIcon;
    return <Text className="text-sm" style={{ color: colors.text }}>{isRTL ? '▶' : '◀'}</Text>;
  };

  const renderNextIcon = () => {
    if (nextIcon) return nextIcon;
    return <Text className="text-sm" style={{ color: colors.text }}>{isRTL ? '◀' : '▶'}</Text>;
  };

  return (
    <GlassView className="overflow-hidden rounded-lg" style={style} intensity="medium" testID={testID}>
      {/* Table */}
      <View className="min-h-[200px]">
        {/* Header */}
        <View
          className={`bg-white/[0.03] border-b border-white/[0.08] ${isRTL ? 'flex-row-reverse' : 'flex-row'} ${stickyHeader ? 'sticky top-0 z-10' : ''}`}
        >
          {columns.map((column) => (
            <View
              key={column.key}
              className="px-4 py-4"
              style={[column.width ? { width: column.width as number, flex: undefined } : { flex: 1 }]}
            >
              <Text
                className="text-[13px] font-semibold uppercase tracking-wider"
                style={{ color: colors.textSecondary, textAlign: getTextAlign(column) }}
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
            <Text className="text-sm" style={{ color: colors.textMuted }}>Loading...</Text>
          </View>
        ) : data.length === 0 ? (
          <View className="py-16 items-center gap-2">
            {emptyIcon}
            <Text className="text-sm" style={{ color: colors.textMuted }}>{emptyMessage}</Text>
          </View>
        ) : (
          data.map((row, rowIndex) => {
            const key = getRowKey(row, rowIndex);
            const rowContent = (
              <Pressable
                onPress={onRowPress ? () => onRowPress(row, rowIndex) : undefined}
                className={`bg-transparent ${rowIndex < data.length - 1 ? 'border-b border-white/[0.05]' : ''}`}
              >
                <View className={`flex-1 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  {columns.map((column) => (
                    <View
                      key={column.key}
                      className="px-4 py-4 justify-center min-h-[56px]"
                      style={[column.width ? { width: column.width as number, flex: undefined } : { flex: 1 }]}
                    >
                      {column.render ? (
                        column.render(row[column.key], row, rowIndex)
                      ) : (
                        <Text
                          className="text-sm leading-5"
                          style={{ color: colors.text, textAlign: getTextAlign(column) }}
                          numberOfLines={1}
                        >
                          {(row[column.key] as string)?.toString() || '-'}
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
                <div key={key} style={getRowAnimationStyle(rowIndex)}>
                  {rowContent}
                </div>
              );
            }

            return <React.Fragment key={key}>{rowContent}</React.Fragment>;
          })
        )}
      </View>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <View className={`flex-row items-center justify-between px-4 py-4 border-t border-white/[0.05] ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          <Text className="text-[13px]" style={{ color: colors.textMuted }}>
            {(pagination.page - 1) * pagination.pageSize + 1}-
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} / {pagination.total}
          </Text>
          <View className={`flex-row items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            <Pressable
              onPress={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className={`p-1 rounded bg-white/[0.05] ${pagination.page <= 1 ? 'opacity-50' : ''}`}
            >
              {renderPrevIcon()}
            </Pressable>
            <Text className="text-[13px] min-w-[50px] text-center" style={{ color: colors.text }}>
              {pagination.page} / {totalPages}
            </Text>
            <Pressable
              onPress={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= totalPages}
              className={`p-1 rounded bg-white/[0.05] ${pagination.page >= totalPages ? 'opacity-50' : ''}`}
            >
              {renderNextIcon()}
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
    <Text className="text-sm" style={{ color: muted ? colors.textMuted : colors.text }} numberOfLines={1}>
      {children}
    </Text>
  ),

  TwoLine: ({
    primary,
    secondary,
    align = 'right',
  }: {
    primary: string;
    secondary?: string;
    align?: 'left' | 'right';
  }) => (
    <View className={align === 'right' ? 'items-end' : 'items-start'}>
      <Text className="text-sm" style={{ color: colors.text }} numberOfLines={1}>
        {primary}
      </Text>
      {secondary && (
        <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }} numberOfLines={1}>
          {secondary}
        </Text>
      )}
    </View>
  ),

  Badge: ({
    children,
    variant = 'default',
  }: {
    children: string;
    variant?: 'success' | 'warning' | 'error' | 'default';
  }) => {
    const variantStyles = {
      success: { bg: '#10b98120', text: '#10b981' },
      warning: { bg: '#f59e0b20', text: '#f59e0b' },
      error: { bg: '#ef444420', text: '#ef4444' },
      default: { bg: '#6b728020', text: '#6b7280' },
    };
    const variantStyle = variantStyles[variant];
    return (
      <View className="px-2 py-1 rounded-full self-start" style={{ backgroundColor: variantStyle.bg }}>
        <Text className="text-xs font-semibold" style={{ color: variantStyle.text }}>{children}</Text>
      </View>
    );
  },

  Actions: ({
    children,
    isRTL = false,
  }: {
    children: ReactNode;
    isRTL?: boolean;
  }) => (
    <View className={`flex-row items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
      {children}
    </View>
  ),

  ActionButton: ({
    onPress,
    icon,
    variant = 'default',
    disabled = false,
  }: {
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
        className="p-2 rounded-lg justify-center items-center"
        style={[{ backgroundColor: `${color}20` }, disabled && { opacity: 0.5 }]}
      >
        {icon}
      </Pressable>
    );
  },
};

export default GlassTable;
