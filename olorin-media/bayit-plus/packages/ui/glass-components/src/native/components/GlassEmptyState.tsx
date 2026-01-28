/**
 * GlassEmptyState Component
 *
 * Unified empty state component with glassmorphism styling.
 * Supports multiple variants, sizes, icons, actions, and full accessibility.
 *
 * Features:
 * - 10 pre-configured variants (no-content, no-results, error, etc.)
 * - 3 size variants (compact, standard, full)
 * - Icon system (Lucide icons, emoji, content type icons, loading spinner)
 * - Action patterns (0-2 buttons)
 * - Full accessibility (ARIA labels, RTL support, TV focus)
 * - i18n integration
 * - Platform-aware (web, mobile, TV)
 */

import React, { ReactNode } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Platform,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { GlassCard } from './GlassCard';
import { GlassButton, type ButtonVariant } from './GlassButton';
import { colors, spacing, fontSize, fontSizeTV, borderRadius } from '../../theme';

// Variant types
export type EmptyStateVariant =
  | 'no-content'
  | 'no-results'
  | 'no-query'
  | 'error'
  | 'loading'
  | 'no-favorites'
  | 'no-downloads'
  | 'section-empty'
  | 'no-data'
  | 'permission-denied';

// Size types
export type EmptyStateSize = 'compact' | 'standard' | 'full';

// Content type icons
export type ContentType = 'movie' | 'series' | 'podcast' | 'live' | 'radio' | 'vod' | 'audiobook';

// Action button configuration
export interface EmptyStateAction {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: ReactNode;
  accessibilityLabel?: string;
  testID?: string;
}

export interface GlassEmptyStateProps {
  // Variant & Configuration
  variant?: EmptyStateVariant;
  size?: EmptyStateSize;

  // Icon Configuration (priority: loading > icon > contentType > iconEmoji > variant default)
  icon?: ReactNode;
  iconEmoji?: string;
  contentType?: ContentType;
  iconColor?: string;

  // Content
  title: string;
  description?: string;
  secondaryDescription?: string;
  suggestions?: string[];
  suggestionsTitle?: string;

  // Actions (0-2 buttons)
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;

  // Legacy support
  actionLabel?: string;
  onAction?: () => void;

  // Loading State
  loading?: boolean;
  loadingText?: string;

  // Styling
  style?: ViewStyle;
  backgroundColor?: string;
  titleColor?: string;
  descriptionColor?: string;
  noCard?: boolean;
  cardIntensity?: 'subtle' | 'low' | 'medium' | 'high';

  // Accessibility
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'text' | 'alert';

  // TV & Focus
  hasTVPreferredFocus?: boolean;
  focusable?: boolean;

  // i18n
  titleKey?: string;
  descriptionKey?: string;
  i18nValues?: Record<string, string | number>;

  // Custom Content
  children?: ReactNode;

  // Testing
  testID?: string;
}

// Variant configuration with defaults
const EMPTY_STATE_VARIANTS: Record<
  EmptyStateVariant,
  {
    iconEmoji: string;
    iconColor: string;
    size: EmptyStateSize;
  }
> = {
  'no-content': {
    iconEmoji: '📭',
    iconColor: colors.textMuted || '#9ca3af',
    size: 'standard',
  },
  'no-results': {
    iconEmoji: '🔍',
    iconColor: colors.textMuted || '#9ca3af',
    size: 'standard',
  },
  'no-query': {
    iconEmoji: '🎬',
    iconColor: colors.primary || '#a855f7',
    size: 'standard',
  },
  error: {
    iconEmoji: '⚠️',
    iconColor: colors.error || '#ef4444',
    size: 'standard',
  },
  loading: {
    iconEmoji: '⏳',
    iconColor: colors.primary || '#a855f7',
    size: 'standard',
  },
  'no-favorites': {
    iconEmoji: '❤️',
    iconColor: colors.textMuted || '#9ca3af',
    size: 'full',
  },
  'no-downloads': {
    iconEmoji: '⬇️',
    iconColor: colors.textMuted || '#9ca3af',
    size: 'full',
  },
  'section-empty': {
    iconEmoji: '📂',
    iconColor: colors.textMuted || '#9ca3af',
    size: 'compact',
  },
  'no-data': {
    iconEmoji: '📊',
    iconColor: colors.textMuted || '#9ca3af',
    size: 'standard',
  },
  'permission-denied': {
    iconEmoji: '🔒',
    iconColor: colors.warning || '#f59e0b',
    size: 'standard',
  },
};

// Content type icon mapping
const CONTENT_TYPE_ICONS: Record<ContentType, string> = {
  movie: '🎬',
  series: '📺',
  podcast: '🎙️',
  live: '📡',
  radio: '📻',
  vod: '🎥',
  audiobook: '📖',
};

// Size configuration
const SIZE_CONFIG = {
  compact: {
    padding: spacing[4],
    iconSize: Platform.select({ web: 32, ios: 32, android: 32, default: 48 })!,
    iconSizeTV: 48,
    titleSize: Platform.select({ web: fontSize.lg, ios: fontSize.lg, android: fontSize.lg, default: fontSizeTV.lg })!,
    titleSizeTV: fontSizeTV.lg,
    descriptionSize: Platform.select({ web: fontSize.base, ios: fontSize.base, android: fontSize.base, default: fontSizeTV.base })!,
    descriptionSizeTV: fontSizeTV.base,
    gap: spacing[2],
    maxWidth: 400,
    minHeight: 200,
  },
  standard: {
    padding: spacing[6],
    iconSize: Platform.select({ web: 48, ios: 48, android: 48, default: 96 })!,
    iconSizeTV: 96,
    titleSize: Platform.select({ web: fontSize['2xl'], ios: fontSize['2xl'], android: fontSize['2xl'], default: fontSizeTV['2xl'] })!,
    titleSizeTV: fontSizeTV['2xl'],
    descriptionSize: Platform.select({ web: fontSize.lg, ios: fontSize.lg, android: fontSize.lg, default: fontSizeTV.lg })!,
    descriptionSizeTV: fontSizeTV.lg,
    gap: spacing[4],
    maxWidth: 500,
    minHeight: 400,
  },
  full: {
    padding: spacing[8],
    iconSize: Platform.select({ web: 64, ios: 64, android: 64, default: 128 })!,
    iconSizeTV: 128,
    titleSize: Platform.select({ web: fontSize['3xl'], ios: fontSize['3xl'], android: fontSize['3xl'], default: fontSizeTV['3xl'] })!,
    titleSizeTV: fontSizeTV['3xl'],
    descriptionSize: Platform.select({ web: fontSize.xl, ios: fontSize.xl, android: fontSize.xl, default: fontSizeTV.xl })!,
    descriptionSizeTV: fontSizeTV.xl,
    gap: spacing[6],
    maxWidth: 600,
    minHeight: 500,
  },
};

/**
 * Glassmorphic empty state component
 */
export const GlassEmptyState: React.FC<GlassEmptyStateProps> = ({
  variant = 'no-content',
  size,
  icon,
  iconEmoji,
  contentType,
  iconColor,
  title,
  description,
  secondaryDescription,
  suggestions,
  suggestionsTitle,
  primaryAction,
  secondaryAction,
  actionLabel,
  onAction,
  loading = false,
  loadingText,
  style,
  backgroundColor,
  titleColor,
  descriptionColor,
  noCard = false,
  cardIntensity = 'medium',
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'text',
  hasTVPreferredFocus = false,
  focusable = false,
  titleKey,
  descriptionKey,
  i18nValues,
  children,
  testID = 'glass-empty-state',
}) => {
  // Get variant config
  const variantConfig = EMPTY_STATE_VARIANTS[variant];
  const sizeVariant = size || variantConfig.size;
  const sizeConfig = SIZE_CONFIG[sizeVariant];

  // Determine icon to display (priority: loading > icon > contentType > iconEmoji > variant default)
  const displayIcon = loading ? (
    <ActivityIndicator size="large" color={iconColor || variantConfig.iconColor} />
  ) : icon ? (
    icon
  ) : contentType ? (
    <Text style={{ fontSize: sizeConfig.iconSize }}>{CONTENT_TYPE_ICONS[contentType]}</Text>
  ) : iconEmoji ? (
    <Text style={{ fontSize: sizeConfig.iconSize }}>{iconEmoji}</Text>
  ) : (
    <Text style={{ fontSize: sizeConfig.iconSize }}>{variantConfig.iconEmoji}</Text>
  );

  // Legacy action support
  const effectivePrimaryAction = primaryAction || (actionLabel && onAction ? { label: actionLabel, onPress: onAction } : undefined);

  // Container styles
  const containerStyle: ViewStyle = {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: sizeConfig.minHeight,
    paddingVertical: sizeConfig.padding,
    paddingHorizontal: spacing[4],
    ...(backgroundColor && { backgroundColor }),
  };

  // Card content styles
  const cardContentStyle: ViewStyle = {
    padding: sizeConfig.padding,
    alignItems: 'center',
    gap: sizeConfig.gap,
    maxWidth: sizeConfig.maxWidth,
    width: '100%',
  };

  // Title styles
  const titleStyle: TextStyle = {
    fontSize: sizeConfig.titleSize,
    fontWeight: '700',
    color: titleColor || colors.text,
    textAlign: 'center',
  };

  // Description styles
  const descriptionStyle: TextStyle = {
    fontSize: sizeConfig.descriptionSize,
    fontWeight: '400',
    color: descriptionColor || colors.textSecondary,
    textAlign: 'center',
    lineHeight: sizeConfig.descriptionSize * 1.5,
  };

  // Suggestions styles
  const suggestionsStyle: TextStyle = {
    fontSize: sizeConfig.descriptionSize * 0.875,
    color: colors.text,
    textAlign: 'left',
  };

  // Accessibility props
  const a11yProps = {
    accessible: true,
    accessibilityRole,
    accessibilityLabel: accessibilityLabel || title,
    accessibilityHint: accessibilityHint || description,
    testID,
  };

  // Content wrapper
  const contentWrapper = (
    <View style={cardContentStyle}>
      {/* Icon */}
      <View accessible={false}>{displayIcon}</View>

      {/* Title */}
      <Text style={titleStyle} numberOfLines={2} allowFontScaling>
        {loading && loadingText ? loadingText : title}
      </Text>

      {/* Description */}
      {description && (
        <Text style={descriptionStyle} numberOfLines={3} allowFontScaling>
          {description}
        </Text>
      )}

      {/* Secondary Description */}
      {secondaryDescription && (
        <Text style={descriptionStyle} numberOfLines={2} allowFontScaling>
          {secondaryDescription}
        </Text>
      )}

      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <View style={{ marginTop: spacing[4], alignItems: 'flex-start' }}>
          {suggestionsTitle && (
            <Text style={[suggestionsStyle, { fontWeight: '600', marginBottom: spacing[2] }]} allowFontScaling>
              {suggestionsTitle}
            </Text>
          )}
          {suggestions.map((suggestion, index) => (
            <Text key={index} style={suggestionsStyle} allowFontScaling>
              • {suggestion}
            </Text>
          ))}
        </View>
      )}

      {/* Action Buttons */}
      {(effectivePrimaryAction || secondaryAction) && (
        <View style={{ marginTop: spacing[4], flexDirection: 'row', gap: spacing[2], width: '100%', justifyContent: 'center' }}>
          {effectivePrimaryAction && (
            <GlassButton
              title={effectivePrimaryAction.label}
              onPress={effectivePrimaryAction.onPress}
              variant={effectivePrimaryAction.variant || 'primary'}
              icon={effectivePrimaryAction.icon}
              accessibilityLabel={effectivePrimaryAction.accessibilityLabel}
              testID={effectivePrimaryAction.testID || `${testID}-primary-action`}
              hasTVPreferredFocus={hasTVPreferredFocus}
            />
          )}
          {secondaryAction && (
            <GlassButton
              title={secondaryAction.label}
              onPress={secondaryAction.onPress}
              variant={secondaryAction.variant || 'secondary'}
              icon={secondaryAction.icon}
              accessibilityLabel={secondaryAction.accessibilityLabel}
              testID={secondaryAction.testID || `${testID}-secondary-action`}
            />
          )}
        </View>
      )}

      {/* Custom Children */}
      {children}
    </View>
  );

  // Render without card wrapper if noCard is true (for section-empty variant)
  if (noCard) {
    return (
      <View style={[containerStyle, style]} {...a11yProps}>
        {contentWrapper}
      </View>
    );
  }

  // Render with GlassCard wrapper
  return (
    <View style={[containerStyle, style]} {...a11yProps}>
      <GlassCard autoSize style={{ width: '100%', maxWidth: sizeConfig.maxWidth }}>
        {contentWrapper}
      </GlassCard>
    </View>
  );
};

export default GlassEmptyState;
