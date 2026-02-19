import React from 'react';
import { GlassButton } from '@bayit/glass';

interface QuestionChipProps {
  question: string;
  onClick: () => void;
  disabled?: boolean;
}

export function QuestionChip({ question, onClick, disabled = false }: QuestionChipProps) {
  return (
    <GlassButton
      variant="secondary"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="text-left h-auto py-2 px-3 rounded-full whitespace-normal leading-snug"
    >
      {question}
    </GlassButton>
  );
}
