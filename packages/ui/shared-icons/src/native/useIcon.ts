import { useMemo } from 'react';
import { ICON_REGISTRY, ICON_SIZES, IconSize } from '../registry/iconRegistry';

export interface UseIconProps {
  name: string;
  size?: IconSize;
  context?: string;
  color?: string;
}

/**
 * React Native icon hook for mobile and TV platforms
 * Returns lucide icon name and size information for integration with
 * platform-specific icon libraries (e.g., Expo Vector Icons, react-native-svg-transformer)
 */
export function useIcon(props: UseIconProps) {
  const { name, size = 'md', context = 'default', color = '#FFFFFF' } = props;

  const iconData = useMemo(() => {
    const iconDef = ICON_REGISTRY[name];
    if (!iconDef) {
      console.warn(`Icon "${name}" not found in registry`);
      return null;
    }

    const iconSize = ICON_SIZES[context]?.[size] || ICON_SIZES.default[size];

    return {
      name: iconDef.lucideName,
      iconName: iconDef.name,
      size: iconSize,
      color,
      category: iconDef.category,
      description: iconDef.description,
    };
  }, [name, size, context, color]);

  return iconData;
}

/**
 * Get icon information for React Native usage
 * Useful for component libraries that handle icon rendering differently
 */
export function getIconData(
  name: string,
  size: IconSize = 'md',
  context: string = 'default',
  color: string = '#FFFFFF'
) {
  const iconDef = ICON_REGISTRY[name];
  if (!iconDef) {
    console.warn(`Icon "${name}" not found in registry`);
    return null;
  }

  const iconSize = ICON_SIZES[context]?.[size] || ICON_SIZES.default[size];

  return {
    lucideName: iconDef.lucideName,
    iconName: iconDef.name,
    size: iconSize,
    color,
    category: iconDef.category,
    description: iconDef.description,
  };
}

export default useIcon;
