/**
 * MerchantBreakdown Component
 * Feature: 025-financial-analysis-frontend
 *
 * Displays financial metrics breakdown by merchant.
 */

import React, { useMemo } from 'react';
import { Card } from '@shared/components/ui/Card';
import { CurrencyDisplay } from '../../../investigation/components/financial/CurrencyDisplay';
import { getNetValueColorClass } from '../../../investigation/utils/currencyFormatter';
import type { InvestigationListItem } from '../../services/financialAnalysisService';

interface MerchantBreakdownProps {
  investigations: InvestigationListItem[];
  className?: string;
}

interface MerchantSummary {
  name: string;
  savedGmv: number;
  lostRevenue: number;
  netValue: number;
  count: number;
}

export const MerchantBreakdown: React.FC<MerchantBreakdownProps> = ({ investigations, className = '' }) => {
  const merchantSummaries = useMemo(() => {
    const map = new Map<string, MerchantSummary>();
    for (const inv of investigations) {
      const name = inv.merchantName || 'Unknown';
      const existing = map.get(name) || { name, savedGmv: 0, lostRevenue: 0, netValue: 0, count: 0 };
      existing.savedGmv += inv.savedFraudGmv;
      existing.lostRevenue += inv.lostRevenues;
      existing.netValue += inv.netValue;
      existing.count += 1;
      map.set(name, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.netValue - a.netValue);
  }, [investigations]);

  if (merchantSummaries.length === 0) {
    return (
      <Card className={className}>
        <h3 className="text-lg font-semibold text-white mb-4">Merchant Breakdown</h3>
        <div className="text-center text-corporate-textTertiary py-8">No merchant data</div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <h3 className="text-lg font-semibold text-white mb-4">Merchant Breakdown</h3>
      <div className="space-y-3">
        {merchantSummaries.slice(0, 5).map((merchant) => (
          <div key={merchant.name} className="flex items-center justify-between py-2 border-b border-corporate-borderPrimary last:border-0">
            <div>
              <div className="font-medium text-white">{merchant.name}</div>
              <div className="text-xs text-corporate-textTertiary">{merchant.count} investigations</div>
            </div>
            <div className="text-right">
              <div className={`font-bold ${getNetValueColorClass(merchant.netValue)}`}>
                <CurrencyDisplay value={merchant.netValue} format="compact" />
              </div>
              <div className="text-xs text-corporate-textTertiary">Net Value</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
