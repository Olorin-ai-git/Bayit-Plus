/**
 * GlassHierarchicalTable Helper Components
 *
 * Pre-built cell renderers for common use cases
 */

import React, { ReactNode } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Film, Tv, Star, Eye, Edit2, Trash2 } from 'lucide-react';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';

// ============================================
// Thumbnail Cell
// ============================================

interface ThumbnailCellProps {
  uri?: string;
  type?: 'movie' | 'series' | 'episode';
  size?: 'small' | 'medium' | 'large';
  onPress?: () => void;
}

export const ThumbnailCell: React.FC<ThumbnailCellProps> = ({
  uri,
  type = 'movie',
  size = 'medium',
  onPress,
}) => {
  const sizeStyles = {
    small: { width: 40, height: 24 },
    medium: { width: 60, height: 36 },
    large: { width: 80, height: 48 },
  };

  const containerSize = sizeStyles[size];

  const content = uri ? (
    // Use native img tag for web compatibility
    <img
      src={uri}
      alt={type}
      style={{
        width: containerSize.width,
        height: containerSize.height,
        borderRadius: borderRadius.sm,
        objectFit: 'cover',
      }}
    />
  ) : (
    <View style={[styles.thumbnailPlaceholder, containerSize]}>
      {type === 'series' || type === 'episode' ? (
        <Tv size={size === 'small' ? 12 : 16} color={colors.textMuted} />
      ) : (
        <Film size={size === 'small' ? 12 : 16} color={colors.textMuted} />
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={styles.thumbnailContainer}>
        {content}
      </Pressable>
    );
  }

  return <View style={styles.thumbnailContainer}>{content}</View>;
};

// ============================================
// Title Cell
// ============================================

interface TitleCellProps {
  title: string;
  subtitle?: string;
  badge?: string | number;
  badgeColor?: string;
  align?: 'left' | 'center' | 'right';
}

export const TitleCell: React.FC<TitleCellProps> = ({
  title,
  subtitle,
  badge,
  badgeColor = colors.primary.DEFAULT,
  align = 'left',
}) => {
  return (
    <View style={[styles.titleContainer, align === 'right' && styles.alignRight]}>
      <View style={styles.titleRow}>
        <Text style={[styles.titleText, align === 'right' && styles.textRight]} numberOfLines={1}>
          {title}
        </Text>
        {badge && (
          <View style={[styles.badge, { backgroundColor: `${badgeColor}26` }]}>
            <Text style={[styles.badgeText, { color: badgeColor }]}>{badge}</Text>
          </View>
        )}
      </View>
      {subtitle && (
        <Text style={[styles.subtitleText, align === 'right' && styles.textRight]} numberOfLines={1}>
          {subtitle}
        </Text>
      )}
    </View>
  );
};

// ============================================
// Badge Cell
// ============================================

interface BadgeCellProps {
  label: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  icon?: ReactNode;
}

export const BadgeCell: React.FC<BadgeCellProps> = ({
  label,
  variant = 'default',
  icon,
}) => {
  const variantStyles = {
    success: { bg: 'rgba(16, 185, 129, 0.15)', text: colors.success.DEFAULT },
    warning: { bg: 'rgba(245, 158, 11, 0.15)', text: colors.warning.DEFAULT },
    error: { bg: 'rgba(239, 68, 68, 0.15)', text: colors.error.DEFAULT },
    info: { bg: 'rgba(59, 130, 246, 0.15)', text: colors.info.DEFAULT },
    default: { bg: 'rgba(107, 114, 128, 0.15)', text: colors.textMuted },
  };

  const style = variantStyles[variant];

  return (
    <View style={[styles.badgeContainer, { backgroundColor: style.bg }]}>
      {icon && <View style={styles.badgeIcon}>{icon}</View>}
      <Text style={[styles.badgeLabel, { color: style.text }]}>{label}</Text>
    </View>
  );
};

// ============================================
// Actions Cell
// ============================================

interface ActionButton {
  icon: ReactNode;
  onPress: () => void;
  variant?: 'view' | 'edit' | 'delete' | 'star' | 'default';
  disabled?: boolean;
  tooltip?: string;
}

interface ActionsCellProps {
  actions: ActionButton[];
  align?: 'left' | 'center' | 'right';
}

export const ActionsCell: React.FC<ActionsCellProps> = ({
  actions,
  align = 'right',
}) => {
  const variantColors = {
    view: 'rgba(16, 185, 129, 0.15)',
    edit: 'rgba(168, 85, 247, 0.15)',
    delete: 'rgba(239, 68, 68, 0.15)',
    star: 'rgba(245, 158, 11, 0.15)',
    default: 'rgba(255, 255, 255, 0.05)',
  };

  return (
    <View
      style={[
        styles.actionsContainer,
        align === 'center' && styles.justifyCenter,
        align === 'right' && styles.justifyEnd,
      ]}
    >
      {actions.map((action, index) => (
        <Pressable
          key={index}
          onPress={action.onPress}
          disabled={action.disabled}
          style={[
            styles.actionButton,
            {
              backgroundColor: variantColors[action.variant || 'default'],
            },
            action.disabled && styles.actionButtonDisabled,
          ]}
        >
          {action.icon}
        </Pressable>
      ))}
    </View>
  );
};

// ============================================
// Text Cell
// ============================================

interface TextCellProps {
  text: string | number;
  muted?: boolean;
  align?: 'left' | 'center' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

export const TextCell: React.FC<TextCellProps> = ({
  text,
  muted = false,
  align = 'left',
  size = 'md',
}) => {
  const sizeStyles = {
    sm: fontSize.sm,
    md: fontSize.md,
    lg: fontSize.lg,
  };

  return (
    <Text
      style={[
        styles.textCell,
        { fontSize: sizeStyles[size] },
        muted && styles.textMuted,
        { textAlign: align },
      ]}
      numberOfLines={1}
    >
      {text}
    </Text>
  );
};

// ============================================
// Pre-built Action Buttons
// ============================================

export const createViewAction = (onPress: () => void): ActionButton => ({
  icon: <Eye size={18} color={colors.success.DEFAULT} />,
  onPress,
  variant: 'view',
  tooltip: 'View',
});

export const createEditAction = (onPress: () => void): ActionButton => ({
  icon: <Edit2 size={18} color={colors.primary.DEFAULT} />,
  onPress,
  variant: 'edit',
  tooltip: 'Edit',
});

export const createDeleteAction = (onPress: () => void): ActionButton => ({
  icon: <Trash2 size={18} color={colors.error.DEFAULT} />,
  onPress,
  variant: 'delete',
  tooltip: 'Delete',
});

export const createStarAction = (onPress: () => void, filled: boolean = false): ActionButton => ({
  icon: <Star size={18} color={colors.warning.DEFAULT} fill={filled ? colors.warning.DEFAULT : 'none'} />,
  onPress,
  variant: 'star',
  tooltip: filled ? 'Unfavorite' : 'Favorite',
});

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  // Thumbnail
  thumbnailContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailImage: {
    borderRadius: borderRadius.sm,
  },
  thumbnailPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Title
  titleContainer: {
    gap: spacing.xs,
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titleText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
  },
  subtitleText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  textRight: {
    textAlign: 'right',
  },

  // Badge
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    gap: spacing.xs,
  },
  badgeIcon: {
    marginRight: spacing.xs,
  },
  badgeLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },

  // Actions
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  justifyCenter: {
    justifyContent: 'center',
  },
  justifyEnd: {
    justifyContent: 'flex-end',
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

  // Text
  textCell: {
    color: colors.text,
    lineHeight: 20,
  },
  textMuted: {
    color: colors.textMuted,
  },
});
