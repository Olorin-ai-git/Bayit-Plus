import React, { useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { ICON_REGISTRY, ICON_SIZES, IconSize } from '../registry/iconRegistry';

export interface UseIconProps {
  name: string;
  size?: IconSize;
  context?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * React hook to get a lucide icon component for web platforms
 * Provides type-safe icon rendering with size management
 */
export function useIcon(props: UseIconProps) {
  const { name, size = 'md', context = 'default', className = '', style = {} } = props;

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

    return (
      <IconComponent
        size={iconSize}
        className={className}
        style={style}
        strokeWidth={2}
      />
    );
  }, [name, size, context, className, style]);

  return icon;
}

/**
 * Render lucide icon directly by name
 * Simpler alternative to useIcon for functional components
 */
export function renderIcon(
  name: string,
  size: IconSize = 'md',
  context: string = 'default',
  className: string = ''
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

  const iconSize = ICON_SIZES[context]?.[size] || ICON_SIZES.default[size];

  return (
    <IconComponent
      key={name}
      size={iconSize}
      className={className}
      strokeWidth={2}
    />
  );
}

/**
 * Icon component for web platforms
 * Provides a simple wrapper around lucide icons with registry support
 */
export interface IconProps extends UseIconProps {
  testId?: string;
}

export const Icon = React.forwardRef<HTMLDivElement, IconProps>(
  ({ name, size = 'md', context = 'default', className = '', style = {}, testId }, ref) => {
    const icon = useIcon({ name, size, context, className, style });

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
