// Overview tab - displays cost breakdown pie chart

import React from "react";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";
import { GlassCard } from "@olorin/glass-ui";

interface OverviewTabProps {
  dashboard: any;
}

const COLORS = {
  ai: "#a78bfa",        // purple-400
  infrastructure: "#60a5fa",  // blue-400
  thirdparty: "#fb923c",      // orange-400
};

export default function OverviewTab({ dashboard }: OverviewTabProps) {
  const categoryData = [
    { name: "AI Costs", value: dashboard?.data?.breakdown?.ai_cost || 5230, color: COLORS.ai },
    { name: "Infrastructure", value: dashboard?.data?.breakdown?.infrastructure_cost || 4120, color: COLORS.infrastructure },
    { name: "Third-party", value: dashboard?.data?.breakdown?.thirdparty_cost || 2390, color: COLORS.thirdparty },
  ];

  const categories = [
    {
      label: "AI Costs",
      value: dashboard?.data?.breakdown?.ai_cost || 5230,
      percentage: 45,
      color: COLORS.ai,
      items: ["STT", "TTS", "Translation", "LLM", "Search"],
    },
    {
      label: "Infrastructure",
      value: dashboard?.data?.breakdown?.infrastructure_cost || 4120,
      percentage: 35,
      color: COLORS.infrastructure,
      items: ["GCP", "MongoDB", "Firebase", "Sentry", "CDN"],
    },
    {
      label: "Third-party",
      value: dashboard?.data?.breakdown?.thirdparty_cost || 2390,
      percentage: 20,
      color: COLORS.thirdparty,
      items: ["Stripe", "ElevenLabs", "TMDB", "Twilio"],
    },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-black/80 backdrop-blur-xl border border-purple-500/20 rounded-lg p-3">
          <p className="text-white font-medium">{data.name}</p>
          <p className="text-orange-400 font-semibold">${data.value.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <GlassCard className="p-6 backdrop-blur-xl rounded-lg bg-black/30 border border-purple-500/20">
        <h3 className="text-lg font-semibold text-white mb-4">Cost Breakdown</h3>
        <div className="space-y-3">
          {dashboard?.loading?.breakdown ? (
            <p className="text-gray-400">Loading breakdown...</p>
          ) : dashboard?.errors?.breakdown ? (
            <p className="text-red-400">Error: {dashboard.errors.breakdown}</p>
          ) : (
            <div className="flex justify-center py-8">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </GlassCard>

      <div className="grid grid-cols-3 gap-4">
        {categories.map((category) => (
          <GlassCard key={category.label} className="p-4 backdrop-blur-xl rounded-lg bg-black/30 border border-purple-500/20">
            <p className="text-sm text-gray-400 mb-2">{category.label}</p>
            <p className="text-2xl font-bold" style={{ color: category.color }}>
              ${category.value.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">{category.percentage}% of total</p>
            <div className="mt-3 pt-3 border-t border-purple-500/10">
              <p className="text-xs text-gray-400 font-medium mb-2">Components:</p>
              <ul className="text-xs space-y-1">
                {category.items.map((item) => (
                  <li key={item} className="text-gray-500">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
