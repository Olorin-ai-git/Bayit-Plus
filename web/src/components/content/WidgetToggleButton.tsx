/**
 * WidgetToggleButton - One-click add/remove widget button for content cards.
 *
 * Shows an "add to widgets" or "remove from widgets" icon depending on state.
 * Consumes WidgetToggleContext for state management.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, Check } from 'lucide-react';
import { colors, spacing } from '@olorin/design-tokens';
import { useWidgetToggleContext } from '@/contexts/WidgetToggleContext';
import { useResponsive } from '@/hooks/useResponsive';

interface WidgetToggleButtonProps {
  contentType: string;
  contentId: string;
  title: string;
  description?: string;
  icon?: string;
  coverUrl?: string;
}

export default function WidgetToggleButton({
  contentType,
  contentId,
  title,
  description,
  icon,
  coverUrl,
}: WidgetToggleButtonProps) {
  const { t } = useTranslation();
  const responsive = useResponsive();
  const { isMobile } = responsive;
  const ctx = useWidgetToggleContext();
  const [isHovered, setIsHovered] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  // If no context provider, don't render
  if (!ctx) return null;

  const isActive = ctx.isWidget(contentType, contentId);
  const tooltip = isActive
    ? t('widgets.removeFromMyWidgets')
    : t('widgets.addToMyWidgets');

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isToggling) return;
    setIsToggling(true);

    try {
      await ctx.toggleWidget({
        content_type: contentType,
        content_id: contentId,
        title,
        description,
        icon,
        cover_url: coverUrl,
      });
    } finally {
      setIsToggling(false);
    }
  };

  const size = isMobile ? 56 : 32;
  const iconSize = isMobile ? 24 : 16;
  const radius = size / 2;

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isToggling}
      title={tooltip}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: isActive
          ? 'rgba(16, 185, 129, 0.25)'
          : isHovered
          ? 'rgba(255, 255, 255, 0.25)'
          : 'rgba(0, 0, 0, 0.6)',
        border: 'none',
        cursor: isToggling ? 'wait' : 'pointer',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backdropFilter: 'blur(8px)',
        transition: 'all 0.2s ease',
        transform: isHovered ? 'scale(1.1)' : 'scale(1)',
        opacity: isToggling ? 0.6 : 1,
      }}
    >
      {isActive ? (
        <Check size={iconSize} color="#10b981" />
      ) : (
        <LayoutGrid size={iconSize} color={colors.text} />
      )}
    </button>
  );
}
