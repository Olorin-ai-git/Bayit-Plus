// Hero P&L Summary card for dashboard

import React from "react";
import { useTranslation } from "react-i18next";
import { TrendingUp, TrendingDown } from "lucide-react";
import { GlassCard } from "@olorin/glass-ui";

import type { CostOverview } from '@/services/adminApi/costData';

interface PLSummaryProps { data: Pick<CostOverview, 'profit_loss' | 'revenue' | 'total_costs' | 'profit_margin'> | null; }

export default function PLSummary({ data }: PLSummaryProps) {
  const { t, i18n } = useTranslation();
  const money = (value: number | null | undefined) => value == null ? t("common.unknown") : `$${value.toLocaleString(i18n.language)}`;
  const knownProfit = data?.profit_loss != null;
  const isProfit = data?.profit_loss != null && data.profit_loss >= 0;
  const Icon = isProfit ? TrendingUp : TrendingDown;
  const bgColor = !knownProfit ? "from-gray-500/20 to-transparent" : isProfit ? "from-green-500/20 to-transparent" : "from-red-500/20 to-transparent";
  const textColor = !knownProfit ? "text-gray-400" : isProfit ? "text-green-400" : "text-red-400";
  const borderColor = !knownProfit ? "border-gray-500/50" : isProfit ? "border-green-500/50" : "border-red-500/50";

  return (
    <GlassCard
      className={`mb-6 p-8 border-2 ${borderColor} bg-gradient-to-br ${bgColor} backdrop-blur-xl rounded-2xl`}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Hero Metric - Profit/Loss */}
        <div className="md:col-span-2 flex items-center gap-4">
          <div className={`p-4 rounded-xl bg-${isProfit ? "green" : "red"}-500/20`}>
            {knownProfit && <Icon size={32} className={textColor} />}
          </div>
          <div>
            <p className="text-gray-400 text-sm font-medium">{t('admin.costDashboard.plSummary.netProfitLoss')}</p>
            <p className={`text-4xl font-bold ${textColor}`}>
              {money(data?.profit_loss)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {data?.profit_margin == null ? t("common.unknown") : `${data.profit_margin.toFixed(2)}%`} {t('admin.costDashboard.plSummary.margin')}
            </p>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div>
          <p className="text-gray-500 text-xs font-medium mb-1">{t('admin.costDashboard.plSummary.revenue')}</p>
          <p className="text-xl font-bold text-green-400">
            {money(data?.revenue)}
          </p>
        </div>

        <div>
          <p className="text-gray-500 text-xs font-medium mb-1">{t('admin.costDashboard.plSummary.totalCosts')}</p>
          <p className="text-xl font-bold text-red-400">
            {money(data?.total_costs)}
          </p>
        </div>
      </div>
    </GlassCard>
  );
}
