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
    <div
      role="button"
      tabIndex={0}
      aria-label={tooltip}
      title={tooltip}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(e as any); }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="rounded-full backdrop-blur-lg flex justify-center items-center transition-all duration-200 cursor-pointer hover:scale-110 border border-white/10"
      style={{
        width: size,
        height: size,
        backgroundColor: isActive
          ? 'rgba(16, 185, 129, 0.25)'
          : isHovered
          ? 'rgba(255, 255, 255, 0.25)'
          : 'rgba(0, 0, 0, 0.6)',
        cursor: isToggling ? 'wait' : 'pointer',
        opacity: isToggling ? 0.6 : 1,
        pointerEvents: isToggling ? 'none' : 'auto',
      }}
    >
      {isActive ? (
        <Check size={iconSize} color="#10b981" />
      ) : (
        <LayoutGrid size={iconSize} color={colors.text} />
      )}
    </div>
  );
}
