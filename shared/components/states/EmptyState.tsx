/**
 * EmptyState - DEPRECATED - Use GlassEmptyState from @olorin/glass-ui instead
 *
 * This component is deprecated and will be removed in the next major version.
 * It now wraps GlassEmptyState for backward compatibility.
 *
 * Migration:
 * <EmptyState icon={icon} title={title} description={description} />
 * →
 * <GlassEmptyState icon={icon} title={title} description={description} />
 */

import { ReactNode } from 'react';
import { GlassEmptyState } from '@olorin/glass-ui';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  backgroundColor?: string;
  titleColor?: string;
  testID?: string;
}

/**
 * @deprecated Use GlassEmptyState from @olorin/glass-ui instead.
 */
export function EmptyState({
  icon,
  title,
  description,
  backgroundColor,
  titleColor,
  testID = 'empty-state',
}: EmptyStateProps) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '[DEPRECATED] EmptyState is deprecated. Use GlassEmptyState from @olorin/glass-ui instead.'
    );
  }

  return (
    <GlassEmptyState
      icon={icon}
      title={title}
      description={description}
      backgroundColor={backgroundColor}
      titleColor={titleColor}
      testID={testID}
      size="full"
    />
  );
}
