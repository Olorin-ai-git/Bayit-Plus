/**
 * GlassChevron - Web-specific implementation
 *
 * Uses lucide-react ChevronRight icon with CSS transforms for proper web rendering
 */

import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { colors, borderRadius } from '@olorin/design-tokens';

type ChevronSize = 'sm' | 'md' | 'lg';

interface GlassChevronProps {
  /** Whether the chevron is in expanded state */
  expanded?: boolean;
  /** Callback when chevron is pressed */
  onPress?: () => void;
  /** Size variant */
  size?: ChevronSize;
  /** Custom color for the chevron */
  color?: string;
  /** Whether the chevron is disabled */
  disabled?: boolean;
  /** Accessibility label */
  accessibilityLabel?: string;
}

const SIZE_CONFIG: Record<ChevronSize, { container: number; icon: number }> = {
  sm: { container: 28, icon: 14 },
  md: { container: 36, icon: 18 },
  lg: { container: 44, icon: 22 },
};

export const GlassChevron: React.FC<GlassChevronProps> = ({
  expanded = false,
  onPress,
  size = 'md',
  color = colors.primary.DEFAULT,
  disabled = false,
  accessibilityLabel,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const config = SIZE_CONFIG[size];

  const handleClick = () => {
    if (!disabled && onPress) {
      onPress();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      disabled={disabled}
      aria-label={accessibilityLabel || (expanded ? 'Collapse' : 'Expand')}
      aria-expanded={expanded}
      style={{
        width: config.container,
        height: config.container,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: borderRadius.sm,
        backgroundColor: isHovered ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.1)',
        border: '2px solid rgba(255, 255, 255, 0.2)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        padding: 0,
        transition: 'all 0.2s ease',
        transform: isPressed ? 'scale(0.95)' : 'scale(1)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
        }}
      >
        <ChevronRight
          size={config.icon}
          color={disabled ? colors.textMuted : color}
          strokeWidth={2.5}
        />
      </div>
    </button>
  );
};

export default GlassChevron;
