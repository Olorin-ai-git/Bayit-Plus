/**
 * TagChip Component - Display report tags
 */

import React from 'react';

interface TagChipProps {
  tag: string;
  className?: string;
  onClick?: () => void;
}

export const TagChip: React.FC<TagChipProps> = ({ tag, className = '', onClick }) => {
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs border-2 border-corporate-borderPrimary/40 bg-black/30 backdrop-blur text-corporate-textSecondary ${className} ${onClick ? 'cursor-pointer hover:border-corporate-accentPrimary/60 hover:bg-black/40' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {tag}
    </span>
  );
};

