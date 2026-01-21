/**
 * Variant Comparison Component - Compare experiment variants side by side.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React from 'react';
import { formatPercentage, formatCurrency } from '../../utils/formatters';
import type { ExperimentVariant } from '../../types/experiments';

interface VariantComparisonProps {
  variants: ExperimentVariant[];
  onPromote?: (variantId: string) => void;
  experimentId: string;
}

const VariantComparison: React.FC<VariantComparisonProps> = ({
  variants,
  onPromote,
  experimentId,
}) => {
  if (variants.length === 0) {
    return null;
  }

  return (
    <div className="p-6 rounded-xl bg-corporate-bgSecondary/50 backdrop-blur-sm border border-corporate-border">
      <h3 className="text-lg font-semibold text-corporate-textPrimary mb-4">
        Variant Comparison
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {variants.map((variant) => (
          <div
            key={variant.id}
            className="p-4 rounded-lg bg-corporate-bgTertiary border border-corporate-border"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-corporate-textPrimary">{variant.name}</h4>
              {variant.lift !== undefined && variant.lift !== null && (
                <span
                  className={`text-sm font-medium ${
                    variant.lift > 0 ? 'text-corporate-success' : 'text-corporate-error'
                  }`}
                >
                  {variant.lift > 0 ? '+' : ''}
                  {formatPercentage(variant.lift / 100)}
                </span>
              )}
            </div>
            {variant.description && (
              <p className="text-xs text-corporate-textSecondary mb-3">{variant.description}</p>
            )}
            {variant.metrics && (
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-corporate-textSecondary">Precision:</span>{' '}
                  <span className="text-corporate-textPrimary font-medium">
                    {formatPercentage(variant.metrics.precision)}
                  </span>
                </div>
                <div>
                  <span className="text-corporate-textSecondary">Recall:</span>{' '}
                  <span className="text-corporate-textPrimary font-medium">
                    {formatPercentage(variant.metrics.recall)}
                  </span>
                </div>
                <div>
                  <span className="text-corporate-textSecondary">F1 Score:</span>{' '}
                  <span className="text-corporate-textPrimary font-medium">
                    {formatPercentage(variant.metrics.f1Score)}
                  </span>
                </div>
                <div>
                  <span className="text-corporate-textSecondary">False Positive Cost:</span>{' '}
                  <span className="text-corporate-textPrimary font-medium">
                    {formatCurrency(variant.metrics.falsePositiveCost)}
                  </span>
                </div>
              </div>
            )}
            {variant.statisticalSignificance && (
              <div className="mt-3 pt-3 border-t border-corporate-border">
                <div className="text-xs text-corporate-textSecondary">
                  <div>
                    P-value: {variant.statisticalSignificance.pValue?.toFixed(4) || 'N/A'}
                  </div>
                  <div>
                    Significant:{' '}
                    {variant.statisticalSignificance.isSignificant ? (
                      <span className="text-corporate-success">Yes</span>
                    ) : (
                      <span className="text-corporate-error">No</span>
                    )}
                  </div>
                </div>
              </div>
            )}
            {onPromote && variant.lift !== undefined && variant.lift > 0 && (
              <button
                onClick={() => onPromote(variant.id)}
                className="mt-3 w-full px-4 py-2 rounded-lg bg-corporate-accentPrimary text-white hover:bg-corporate-accentPrimary/90 transition-colors"
              >
                Promote to Production
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VariantComparison;

