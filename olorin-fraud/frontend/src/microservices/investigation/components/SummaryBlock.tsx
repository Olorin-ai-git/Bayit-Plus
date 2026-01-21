/**
 * Summary Block Component
 *
 * Displays investigation summary with copy functionality.
 * 3-6 sentence prose highlighting key findings.
 *
 * Constitutional Compliance:
 * - Summary from API response (no hardcoded text)
 * - Copy to clipboard functionality
 */

import React, { useState } from 'react';
import { Card } from '@shared/components/ui/Card';
import { Button } from '@shared/components/ui/Button';

interface SummaryBlockProps {
  summary: string;
}

export const SummaryBlock: React.FC<SummaryBlockProps> = ({ summary }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy summary:', err);
    }
  };

  return (
    <Card variant="elevated" padding="md">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-corporate-textPrimary">
          Investigation Summary
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          aria-label="Copy summary to clipboard"
        >
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
      <p className="text-sm text-corporate-textSecondary leading-relaxed whitespace-pre-wrap">
        {summary}
      </p>
    </Card>
  );
};

