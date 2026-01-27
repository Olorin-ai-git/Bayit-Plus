/**
 * Icon Container Component
 * Reusable wrapper for glassmorphic icon display on web
 * Provides circular/rounded glass background with optional border and effects
 */

import React from 'react';
import { GlassLevel } from '../registry/iconRegistry';
import { GLASS_EFFECTS, ICON_CONTAINER_SIZES, ICON_ANIMATIONS } from '../registry/iconStyling';

export type IconContainerSize = 'sm' | 'md' | 'lg' | 'xl';

export interface IconContainerProps {
  children: React.ReactNode;
  size?: IconContainerSize;
  glassLevel?: GlassLevel;
  rounded?: boolean;
  hoverEffect?: boolean;
  focusable?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  testId?: string;
}

/**
 * Icon Container for web
 * Wraps icons with glassmorphic background and optional interactive states
 */
export const IconContainer = React.forwardRef<HTMLDivElement, IconContainerProps>(
  (
    {
      children,
      size = 'md',
      glassLevel = 'medium',
      rounded = true,
      hoverEffect = false,
      focusable = false,
      className = '',
      style = {},
      onClick,
      onFocus,
      onBlur,
      testId,
    },
    ref
  ) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);

    const glassEffect = GLASS_EFFECTS[glassLevel];
    const containerSize = ICON_CONTAINER_SIZES[size];
    const borderRadius = rounded ? '50%' : containerSize.borderRadius;

    const baseStyles: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: containerSize.maxWidth,
      height: containerSize.maxHeight,
      padding: containerSize.padding,
      borderRadius,
      backgroundColor: glassEffect.backgroundColor,
      backdropFilter: glassEffect.backdropFilter,
      border: `${glassEffect.borderWidth} solid ${glassEffect.borderColor}`,
      boxShadow: glassEffect.shadow,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.2s ease-in-out',
      ...style,
    };

    // Apply hover effect if enabled
    if (hoverEffect && isHovered) {
      baseStyles.opacity = 0.8;
      baseStyles.transform = 'scale(1.05)';
      baseStyles.boxShadow = glassEffect.glow;
    }

    // Apply focus effect if focusable
    if (focusable && isFocused) {
      baseStyles.outline = `2px solid ${glassEffect.borderColor}`;
      baseStyles.boxShadow = glassEffect.glow;
      baseStyles.transform = 'scale(1.1)';
    }

    return (
      <div
        ref={ref}
        data-testid={testId || 'icon-container'}
        style={baseStyles}
        className={className}
        onClick={onClick}
        onMouseEnter={() => hoverEffect && setIsHovered(true)}
        onMouseLeave={() => hoverEffect && setIsHovered(false)}
        onFocus={() => {
          focusable && setIsFocused(true);
          onFocus?.();
        }}
        onBlur={() => {
          focusable && setIsFocused(false);
          onBlur?.();
        }}
        tabIndex={focusable ? 0 : -1}
        role={onClick ? 'button' : undefined}
        aria-pressed={isFocused}
      >
        {children}
      </div>
    );
  }
);

IconContainer.displayName = 'IconContainer';

export default IconContainer;
