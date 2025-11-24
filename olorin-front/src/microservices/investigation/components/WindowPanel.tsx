/**
 * Window Panel Component
 *
 * Displays metrics, charts, and confusion matrix for a single window.
 *
 * Constitutional Compliance:
 * - All data from API response
 * - Conditional rendering based on options
 */

import React from 'react';
import { Card } from '@shared/components/ui/Card';
import { Button } from '@shared/components/ui/Button';
import { KpiCards } from './KpiCards';
import { RiskHistogram } from './RiskHistogram';
import { DailyTimeseries } from './DailyTimeseries';
import { ConfusionMatrixTile } from './ConfusionMatrixTile';
import type { WindowMetrics, WindowInfo, Entity } from '../types/comparison';

interface WindowPanelProps {
  windowInfo: WindowInfo;
  metrics: WindowMetrics;
  entity?: Entity;
  onRunInvestigation?: (windowStart: string, windowEnd: string) => void;
}

export const WindowPanel: React.FC<WindowPanelProps> = ({ 
  windowInfo, 
  metrics, 
  entity,
  onRunInvestigation 
}) => {
  const hasInvestigation = metrics.source && metrics.source !== 'fallback';
  const needsInvestigation = !hasInvestigation && entity;
  const powerStatus = metrics.power?.status || 'stable';
  const isStable = powerStatus === 'stable';
  
  // Detect if this is a historical window (retro/older window)
  const isHistoricalWindow = windowInfo.label.toLowerCase().includes('retro') || 
                             windowInfo.label.toLowerCase().includes('6mo') ||
                             windowInfo.label.toLowerCase().includes('earlier') ||
                             windowInfo.label.toLowerCase().includes('historical');
  
  // Check if window start date is more than 30 days ago
  const isOldWindow = (() => {
    try {
      const windowStart = new Date(windowInfo.start);
      const now = new Date();
      const daysDiff = (now.getTime() - windowStart.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff > 30;
    } catch {
      return false;
    }
  })();
  
  return (
    <Card variant="elevated" padding="lg">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-corporate-textPrimary">
            {windowInfo.label}
          </h2>
          {metrics.power && (
            <span
              className={`px-2 py-1 text-xs rounded ${
                isStable
                  ? 'bg-green-900/30 text-green-400 border border-green-700'
                  : 'bg-yellow-900/30 text-yellow-400 border border-yellow-700'
              }`}
              title={metrics.power.reasons.length > 0 ? metrics.power.reasons.join(', ') : ''}
            >
              {isStable ? '✓ Stable' : '⚠ Low Power'}
            </span>
          )}
        </div>
        {hasInvestigation && (
          <div className="text-xs text-corporate-textSecondary">
            Source: {metrics.source}
          </div>
        )}
      </div>
      
      {windowInfo.auto_expand_meta?.expanded && (
        <div className="mb-3 p-2 bg-blue-900/20 border border-blue-700 rounded text-xs text-blue-300">
          Expanded from {windowInfo.auto_expand_meta.attempts[0]}d → {windowInfo.auto_expand_meta.attempts[1]}d to reach minimum support
        </div>
      )}
      
      {needsInvestigation && (
        <div className={`mb-4 p-4 rounded-lg border-2 ${
          isHistoricalWindow || isOldWindow
            ? 'bg-amber-900/30 border-amber-500/50 dark:bg-amber-900/30 dark:border-amber-500/50'
            : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
        }`}>
          <div className={`text-sm mb-3 ${
            isHistoricalWindow || isOldWindow
              ? 'text-amber-200 dark:text-amber-200 font-semibold'
              : 'text-yellow-800 dark:text-yellow-200'
          }`}>
            {(isHistoricalWindow || isOldWindow) ? (
              <>
                <div className="flex items-start gap-2">
                  <span className="text-lg">⚠️</span>
                  <div>
                    <div className="font-bold mb-1">No Risk Score Available for Historical Window</div>
                    <div className="text-xs font-normal opacity-90">
                      This historical window ({windowInfo.label}) does not have an investigation risk score. 
                      To enable accurate comparison, run an investigation for this time period.
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                ⚠️ No investigation found for this window. Risk scores are unavailable.
              </>
            )}
          </div>
          {onRunInvestigation && (
            <Button
              variant={isHistoricalWindow || isOldWindow ? "primary" : "outline"}
              size={isHistoricalWindow || isOldWindow ? "md" : "sm"}
              onClick={() => onRunInvestigation(windowInfo.start, windowInfo.end)}
              className={isHistoricalWindow || isOldWindow ? "bg-amber-600 hover:bg-amber-700 text-white font-medium" : "text-xs"}
            >
              {isHistoricalWindow || isOldWindow ? (
                <>Run Investigation for Historical Window</>
              ) : (
                <>Run Investigation for This Window</>
              )}
            </Button>
          )}
        </div>
      )}
      
      <KpiCards metrics={metrics} windowLabel={windowInfo.label} />
      
      <div className="mt-4 space-y-2">
        <div className="text-sm">
          <span className="text-corporate-textSecondary">Precision: </span>
          <span className="text-corporate-textPrimary">{(metrics.precision * 100).toFixed(1)}%</span>
          {metrics.ci?.precision && (
            <span className="text-xs text-corporate-textSecondary ml-2">
              (95% CI {(metrics.ci.precision[0] * 100).toFixed(1)}–{(metrics.ci.precision[1] * 100).toFixed(1)}%)
            </span>
          )}
        </div>
        <div className="text-sm">
          <span className="text-corporate-textSecondary">Recall: </span>
          <span className="text-corporate-textPrimary">{(metrics.recall * 100).toFixed(1)}%</span>
          {metrics.ci?.recall && (
            <span className="text-xs text-corporate-textSecondary ml-2">
              (95% CI {(metrics.ci.recall[0] * 100).toFixed(1)}–{(metrics.ci.recall[1] * 100).toFixed(1)}%)
            </span>
          )}
        </div>
        <div className="text-sm">
          <span className="text-corporate-textSecondary">F1: </span>
          <span className="text-corporate-textPrimary">{(metrics.f1 * 100).toFixed(1)}%</span>
        </div>
        <div className="text-sm">
          <span className="text-corporate-textSecondary">Accuracy: </span>
          <span className="text-corporate-textPrimary">{(metrics.accuracy * 100).toFixed(1)}%</span>
          {metrics.ci?.accuracy && (
            <span className="text-xs text-corporate-textSecondary ml-2">
              (95% CI {(metrics.ci.accuracy[0] * 100).toFixed(1)}–{(metrics.ci.accuracy[1] * 100).toFixed(1)}%)
            </span>
          )}
        </div>
        <div className="text-sm">
          <span className="text-corporate-textSecondary">Fraud Rate: </span>
          <span className="text-corporate-textPrimary">{(metrics.fraud_rate * 100).toFixed(1)}%</span>
        </div>
        
        {metrics.support && (
          <div className="text-xs text-corporate-textSecondary mt-2 pt-2 border-t border-gray-700">
            Support: {metrics.support.known_transactions} known transactions, {metrics.support.actual_frauds} frauds, {metrics.support.predicted_positives} predicted positives
          </div>
        )}
        
        {metrics.brier !== undefined && metrics.brier !== null && (
          <div className="text-sm">
            <span className="text-corporate-textSecondary">Brier Score: </span>
            <span className="text-corporate-textPrimary">{metrics.brier.toFixed(4)}</span>
            <span className="text-xs text-corporate-textSecondary ml-1">(lower is better)</span>
          </div>
        )}
        
        {metrics.log_loss !== undefined && metrics.log_loss !== null && (
          <div className="text-sm">
            <span className="text-corporate-textSecondary">Log Loss: </span>
            <span className="text-corporate-textPrimary">{metrics.log_loss.toFixed(4)}</span>
            <span className="text-xs text-corporate-textSecondary ml-1">(lower is better)</span>
          </div>
        )}
      </div>
      {metrics.risk_histogram && (
        <div className="mt-4">
          <RiskHistogram data={metrics.risk_histogram} title={`${windowInfo.label} Risk Distribution`} />
        </div>
      )}
      {metrics.timeseries_daily && (
        <div className="mt-4">
          <DailyTimeseries data={metrics.timeseries_daily} title={`${windowInfo.label} Daily Trends`} />
        </div>
      )}
      <div className="mt-4">
        <ConfusionMatrixTile
          TP={metrics.TP}
          FP={metrics.FP}
          TN={metrics.TN}
          FN={metrics.FN}
          title={`${windowInfo.label} Confusion Matrix`}
        />
      </div>
    </Card>
  );
};

