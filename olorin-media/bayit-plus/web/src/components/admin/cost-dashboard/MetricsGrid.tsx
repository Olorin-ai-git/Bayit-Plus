// Key metrics grid component

import React from "react";
import { GlassCard } from "@olorin/glass-ui";

interface MetricsGridProps {
  data: {
    cost_per_minute?: number;
    profit_loss: number;
    revenue: number;
  };
}

export default function MetricsGrid({ data }: MetricsGridProps) {
  const metrics = [
    {
      label: "Cost/Min",
      value: `$${(data.cost_per_minute || 0).toFixed(3)}`,
      trend: "-5%",
      color: "text-blue-400",
    },
    {
      label: "Monthly Rate",
      value: `$${(data.revenue * 30).toLocaleString()}`,
      trend: "+12%",
      color: "text-green-400",
    },
    {
      label: "Costs YTD",
      value: "$45,230",
      trend: "+3%",
      color: "text-orange-400",
    },
    {
      label: "Revenue YTD",
      value: "$128,450",
      trend: "+28%",
      color: "text-emerald-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {metrics.map((metric) => (
        <GlassCard
          key={metric.label}
          className="p-4 backdrop-blur-xl rounded-lg bg-black/30 border border-purple-500/20"
        >
          <p className="text-gray-400 text-xs font-medium mb-1">{metric.label}</p>
          <p className={`text-2xl font-bold ${metric.color}`}>{metric.value}</p>
          <p className="text-xs text-gray-500 mt-2">{metric.trend}</p>
        </GlassCard>
      ))}
    </div>
  );
}
