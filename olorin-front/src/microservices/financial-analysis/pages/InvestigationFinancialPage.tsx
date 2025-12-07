/**
 * Investigation Financial Page
 * Feature: 025-financial-analysis-frontend
 *
 * Detailed financial breakdown for a single investigation.
 */

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WizardButton } from '@shared/components/WizardButton';
import SectionSkeleton from '@shared/components/SectionSkeleton';
import { Card } from '@shared/components/ui/Card';
import { useInvestigationFinancials } from '../hooks/useInvestigationFinancials';
import { CurrencyDisplay } from '../../investigation/components/financial/CurrencyDisplay';
import { getNetValueColorClass } from '../../investigation/utils/currencyFormatter';
import { ConfusionMatrixTooltip } from '../../investigation/components/financial/ConfusionMatrixTooltip';

export const InvestigationFinancialPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useInvestigationFinancials(id || '');

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6">
        <SectionSkeleton rows={6} height="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="bg-corporate-bgSecondary/50 border border-corporate-error/50 rounded-lg p-8 text-center">
          <p className="text-lg font-semibold text-corporate-error">Error Loading Financial Data</p>
          <p className="mt-2 text-sm text-corporate-textSecondary">{error || 'No data available'}</p>
          <div className="flex justify-center gap-4 mt-4">
            <WizardButton variant="secondary" onClick={() => navigate('/financial-analysis')}>Back to Dashboard</WizardButton>
            <WizardButton variant="primary" onClick={refetch}>Retry</WizardButton>
          </div>
        </div>
      </div>
    );
  }

  const { revenueMetrics, confusionMetrics } = data;

  return (
    <div className="min-h-screen bg-black text-white px-6 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center border-b border-corporate-borderPrimary pb-4">
          <div>
            <button onClick={() => navigate('/financial-analysis')} className="text-corporate-accentPrimary hover:underline text-sm mb-2">&larr; Back to Dashboard</button>
            <h1 className="text-2xl font-bold">Investigation Financial Detail</h1>
            <p className="text-corporate-textSecondary font-mono">{data.investigationId}</p>
          </div>
          <WizardButton variant="secondary" onClick={refetch}>Refresh</WizardButton>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-lg font-semibold text-white mb-4">Investigation Info</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-corporate-textTertiary">Entity Type</dt><dd className="text-white">{data.entityType}</dd></div>
              <div className="flex justify-between"><dt className="text-corporate-textTertiary">Entity Value</dt><dd className="text-white font-mono">{data.entityValue}</dd></div>
              <div className="flex justify-between"><dt className="text-corporate-textTertiary">Merchant</dt><dd className="text-white">{data.merchantName || 'N/A'}</dd></div>
              <div className="flex justify-between"><dt className="text-corporate-textTertiary">Calculated At</dt><dd className="text-white">{new Date(data.calculatedAt).toLocaleString()}</dd></div>
            </dl>
          </Card>
          <Card>
            <h3 className="text-lg font-semibold text-white mb-4">Revenue Impact</h3>
            {revenueMetrics ? (
              <dl className="space-y-3">
                <div className="flex justify-between items-center"><dt className="text-corporate-textTertiary">Saved Fraud GMV</dt><dd className="text-2xl font-bold text-green-400"><CurrencyDisplay value={revenueMetrics.savedFraudGmv} /></dd></div>
                <div className="flex justify-between items-center"><dt className="text-corporate-textTertiary">Lost Revenues</dt><dd className="text-2xl font-bold text-red-400"><CurrencyDisplay value={revenueMetrics.lostRevenues} /></dd></div>
                <div className="flex justify-between items-center border-t border-corporate-borderPrimary pt-3"><dt className="text-corporate-textTertiary">Net Value</dt><dd className={`text-2xl font-bold ${getNetValueColorClass(revenueMetrics.netValue)}`}><CurrencyDisplay value={revenueMetrics.netValue} /></dd></div>
                <div className="flex justify-between text-xs"><dt className="text-corporate-textTertiary">Confidence</dt><dd className="text-white uppercase">{revenueMetrics.confidenceLevel}</dd></div>
                <div className="flex justify-between text-xs"><dt className="text-corporate-textTertiary">Total Transactions</dt><dd className="text-white">{revenueMetrics.totalTxCount.toLocaleString()}</dd></div>
              </dl>
            ) : (
              <div className="text-center text-corporate-textTertiary py-4">No revenue data</div>
            )}
          </Card>
        </div>
        {confusionMetrics && (
          <Card>
            <h3 className="text-lg font-semibold text-white mb-4">Confusion Matrix</h3>
            <ConfusionMatrixTooltip metrics={confusionMetrics}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 cursor-help">
                <div className="text-center p-4 bg-green-900/20 rounded"><div className="text-2xl font-bold text-green-400">{confusionMetrics.truePositives}</div><div className="text-xs text-corporate-textTertiary">True Positives</div></div>
                <div className="text-center p-4 bg-red-900/20 rounded"><div className="text-2xl font-bold text-red-400">{confusionMetrics.falsePositives}</div><div className="text-xs text-corporate-textTertiary">False Positives</div></div>
                <div className="text-center p-4 bg-green-900/20 rounded"><div className="text-2xl font-bold text-green-400">{confusionMetrics.trueNegatives}</div><div className="text-xs text-corporate-textTertiary">True Negatives</div></div>
                <div className="text-center p-4 bg-red-900/20 rounded"><div className="text-2xl font-bold text-red-400">{confusionMetrics.falseNegatives}</div><div className="text-xs text-corporate-textTertiary">False Negatives</div></div>
              </div>
            </ConfusionMatrixTooltip>
            <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-corporate-borderPrimary">
              <div className="text-center"><div className="text-lg font-bold text-white">{(confusionMetrics.precision * 100).toFixed(1)}%</div><div className="text-xs text-corporate-textTertiary">Precision</div></div>
              <div className="text-center"><div className="text-lg font-bold text-white">{(confusionMetrics.recall * 100).toFixed(1)}%</div><div className="text-xs text-corporate-textTertiary">Recall</div></div>
              <div className="text-center"><div className="text-lg font-bold text-white">{(confusionMetrics.f1Score * 100).toFixed(1)}%</div><div className="text-xs text-corporate-textTertiary">F1 Score</div></div>
              <div className="text-center"><div className="text-lg font-bold text-white">{(confusionMetrics.accuracy * 100).toFixed(1)}%</div><div className="text-xs text-corporate-textTertiary">Accuracy</div></div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default InvestigationFinancialPage;
