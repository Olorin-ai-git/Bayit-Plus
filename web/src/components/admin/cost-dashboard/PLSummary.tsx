// Hero P&L Summary card for dashboard

import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { GlassCard } from "@olorin/glass-ui";

interface PLSummaryProps {
  data: {
    profit_loss: number;
    revenue: number;
    total_costs: number;
    profit_margin: number;
  };
}

export default function PLSummary({ data }: PLSummaryProps) {
  const isProfit = data.profit_loss >= 0;
  const Icon = isProfit ? TrendingUp : TrendingDown;
  const bgColor = isProfit ? "from-green-500/20 to-transparent" : "from-red-500/20 to-transparent";
  const textColor = isProfit ? "text-green-400" : "text-red-400";
  const borderColor = isProfit ? "border-green-500/50" : "border-red-500/50";

  return (
    <GlassCard
      className={`mb-6 p-8 border-2 ${borderColor} bg-gradient-to-br ${bgColor} backdrop-blur-xl rounded-2xl`}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Hero Metric - Profit/Loss */}
        <div className="md:col-span-2 flex items-center gap-4">
          <div className={`p-4 rounded-xl bg-${isProfit ? "green" : "red"}-500/20`}>
            <Icon size={32} className={textColor} />
          </div>
          <div>
            <p className="text-gray-400 text-sm font-medium">Net Profit/Loss</p>
            <p className={`text-4xl font-bold ${textColor}`}>
              ${Math.abs(data.profit_loss).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {data.profit_margin.toFixed(2)}% margin
            </p>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div>
          <p className="text-gray-500 text-xs font-medium mb-1">REVENUE</p>
          <p className="text-xl font-bold text-green-400">
            ${data.revenue.toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </p>
        </div>

        <div>
          <p className="text-gray-500 text-xs font-medium mb-1">TOTAL COSTS</p>
          <p className="text-xl font-bold text-red-400">
            ${data.total_costs.toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </p>
        </div>
      </div>
    </GlassCard>
  );
}
