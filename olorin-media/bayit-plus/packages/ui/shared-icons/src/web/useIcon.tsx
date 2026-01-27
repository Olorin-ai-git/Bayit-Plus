import React, { useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { ICON_REGISTRY, ICON_SIZES, IconSize, GlassLevel } from '../registry/iconRegistry';
import { getIconStyling, getIconColor, getIconGlassLevel } from '../registry/iconColorTheme';
import { GLASS_EFFECTS } from '../registry/iconStyling';

export type IconVariant = 'monochrome' | 'colored' | 'gradient';

export interface UseIconProps {
  name: string;
  size?: IconSize;
  context?: string;
  className?: string;
  style?: React.CSSProperties;
  variant?: IconVariant;
  withBackground?: boolean;
  glassEffect?: GlassLevel | false;
  color?: string;
}

/**
 * React hook to get a lucide icon component for web platforms
 * Provides type-safe icon rendering with size management, coloring, and glass effects
 */
export function useIcon(props: UseIconProps) {
  const {
    name,
    size = 'md',
    context = 'default',
    className = '',
    style = {},
    variant = 'monochrome',
    withBackground = false,
    glassEffect = false,
    color,
  } = props;

  const icon = useMemo(() => {
    const iconDef = ICON_REGISTRY[name];
    if (!iconDef) {
      console.warn(`Icon "${name}" not found in registry`);
      return null;
    }

    const IconComponent = (LucideIcons as any)[iconDef.lucideName];
    if (!IconComponent) {
      console.warn(`Lucide icon "${iconDef.lucideName}" not found`);
      return null;
    }

    const iconSize = ICON_SIZES[context]?.[size] || ICON_SIZES.default[size];

    // Determine icon color based on variant and props
    let iconColor = color || '#FFFFFF'; // Default to white
    if (variant === 'colored' || variant === 'gradient') {
      iconColor = color || getIconColor(name);
    }

    // Determine glass level
    const effectLevel = glassEffect === false ? undefined : (glassEffect || getIconGlassLevel(name));
    const glassStyle = effectLevel && withBackground ? getGlassBackgroundStyle(effectLevel) : {};

    return (
      <IconComponent
        size={iconSize}
        className={className}
        color={iconColor}
        strokeWidth={2}
        style={{
          ...style,
          ...glassStyle,
        }}
      />
    );
  }, [name, size, context, className, style, variant, color, withBackground, glassEffect]);

  return icon;
}

/**
 * Get glass background styling for web
 */
function getGlassBackgroundStyle(level: GlassLevel) {
  const effect = GLASS_EFFECTS[level];
  return {
    backgroundColor: effect.backgroundColor,
    borderColor: effect.borderColor,
    borderWidth: parseInt(effect.borderWidth),
  };
}

/**
 * Render lucide icon directly by name with optional styling
 * Simpler alternative to useIcon for functional components
 */
export function renderIcon(
  name: string,
  size: IconSize = 'md',
  context: string = 'default',
  className: string = '',
  options?: {
    variant?: IconVariant;
    withBackground?: boolean;
    glassEffect?: GlassLevel | false;
    color?: string;
  }
): React.ReactNode {
  const iconDef = ICON_REGISTRY[name];
  if (!iconDef) {
    console.warn(`Icon "${name}" not found in registry`);
    return null;
  }

  const IconComponent = (LucideIcons as any)[iconDef.lucideName];
  if (!IconComponent) {
    console.warn(`Lucide icon "${iconDef.lucideName}" not found`);
    return null;
  }

  const {
    variant = 'monochrome',
    withBackground = false,
    glassEffect = false,
    color,
  } = options || {};

  const iconSize = ICON_SIZES[context]?.[size] || ICON_SIZES.default[size];

  // Determine icon color
  let iconColor = color || '#FFFFFF';
  if (variant === 'colored' || variant === 'gradient') {
    iconColor = color || getIconColor(name);
  }

  // Determine glass level
  const effectLevel = glassEffect === false ? undefined : (glassEffect || getIconGlassLevel(name));
  const glassStyle = effectLevel && withBackground ? getGlassBackgroundStyle(effectLevel) : {};

  return (
    <IconComponent
      key={name}
      size={iconSize}
      className={className}
      color={iconColor}
      strokeWidth={2}
      style={glassStyle}
    />
  );
}

/**
 * Icon component for web platforms
 * Provides a simple wrapper around lucide icons with registry support, coloring, and glass effects
 */
export interface IconProps extends UseIconProps {
  testId?: string;
}

export const Icon = React.forwardRef<HTMLDivElement, IconProps>(
  (
    {
      name,
      size = 'md',
      context = 'default',
      className = '',
      style = {},
      variant = 'monochrome',
      withBackground = false,
      glassEffect = false,
      color,
      testId,
    },
    ref
  ) => {
    const icon = useIcon({
      name,
      size,
      context,
      className,
      style,
      variant,
      withBackground,
      glassEffect,
      color,
    });

    return (
      <div
        ref={ref}
        data-testid={testId || `icon-${name}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style,
        }}
      >
        {icon}
      </div>
    );
  }
);

Icon.displayName = 'Icon';

export default Icon;
