// Categories tab - displays permanent vs transient cost breakdown

import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { GlassCard } from "@olorin/glass-ui";

interface CategoriesTabProps {
  dashboard: any;
}

export default function CategoriesTab({ dashboard }: CategoriesTabProps) {
  const comparisonData = [
    {
      category: "Permanent",
      fixed: 8120,
      color: "#60a5fa",
      description: "Infrastructure costs (fixed monthly)",
    },
    {
      category: "Transient",
      variable: 6620,
      color: "#fb923c",
      description: "Variable API and usage costs",
    },
  ];

  const detailedBreakdown = [
    { label: "GCP Infrastructure", type: "Permanent", amount: 2000 },
    { label: "MongoDB Atlas", type: "Permanent", amount: 500 },
    { label: "Firebase", type: "Permanent", amount: 300 },
    { label: "Sentry", type: "Permanent", amount: 100 },
    { label: "CDN", type: "Permanent", amount: 200 },
    { label: "AI Costs (STT/TTS)", type: "Transient", amount: 3200 },
    { label: "Search & LLM", type: "Transient", amount: 1850 },
    { label: "Third-party APIs", type: "Transient", amount: 1570 },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-black/80 backdrop-blur-xl border border-purple-500/20 rounded-lg p-3">
          <p className="text-white font-medium">{data.category}</p>
          <p className="text-sm text-gray-400">{data.description}</p>
          <p className="text-orange-400 font-semibold mt-1">
            ${(data.fixed || data.variable).toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <GlassCard className="p-6 backdrop-blur-xl rounded-lg bg-black/30 border border-purple-500/20">
        <h3 className="text-lg font-semibold text-white mb-4">Permanent vs Transient</h3>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-black/50 rounded-lg border border-blue-500/20">
            <p className="text-sm text-gray-400 mb-2">Permanent (Fixed)</p>
            <p className="text-3xl font-bold text-blue-400">$8,120</p>
            <p className="text-xs text-gray-500 mt-2">55% of total</p>
            <p className="text-xs text-gray-600 mt-3">
              Infrastructure costs that occur monthly regardless of usage
            </p>
          </div>
          <div className="p-4 bg-black/50 rounded-lg border border-orange-500/20">
            <p className="text-sm text-gray-400 mb-2">Transient (Variable)</p>
            <p className="text-3xl font-bold text-orange-400">$6,620</p>
            <p className="text-xs text-gray-500 mt-2">45% of total</p>
            <p className="text-xs text-gray-600 mt-3">
              Usage-based costs that fluctuate with platform activity
            </p>
          </div>
        </div>

        <div className="flex justify-center py-4">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(168, 85, 247, 0.1)" />
              <XAxis dataKey="category" stroke="#9ca3af" tick={{ fill: "#9ca3af" }} />
              <YAxis stroke="#9ca3af" tick={{ fill: "#9ca3af" }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="fixed" fill="#60a5fa" radius={[8, 8, 0, 0]}>
                {comparisonData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
              <Bar dataKey="variable" fill="#fb923c" radius={[8, 8, 0, 0]}>
                {comparisonData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      <GlassCard className="p-6 backdrop-blur-xl rounded-lg bg-black/30 border border-purple-500/20">
        <h3 className="text-lg font-semibold text-white mb-4">Detailed Breakdown</h3>
        <div className="space-y-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-purple-500/20">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Cost Item</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Category</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {detailedBreakdown.map((item, idx) => (
                <tr key={idx} className="border-b border-purple-500/10 hover:bg-black/30">
                  <td className="py-3 px-4 text-white">{item.label}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        item.type === "Permanent"
                          ? "bg-blue-500/20 text-blue-300"
                          : "bg-orange-500/20 text-orange-300"
                      }`}
                    >
                      {item.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-orange-400">
                    ${item.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
