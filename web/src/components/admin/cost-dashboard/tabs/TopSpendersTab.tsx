// Top Spenders tab - displays user cost ranking (PII redacted)

import React from "react";
import { GlassCard } from "@olorin/glass-ui";

interface TopSpendersTabProps {
  dashboard: any;
}

export default function TopSpendersTab({ dashboard }: TopSpendersTabProps) {
  const mockSpenders = [
    { rank: 1, userHash: "a3f2b1...", range: "100-500 USD", percentage: 5.2 },
    { rank: 2, userHash: "c7d4e2...", range: "50-100 USD", percentage: 4.1 },
    { rank: 3, userHash: "f1b9a3...", range: "20-50 USD", percentage: 3.8 },
  ];

  return (
    <GlassCard className="p-6 backdrop-blur-xl rounded-lg bg-black/30 border border-purple-500/20">
      <h3 className="text-lg font-semibold text-white mb-4">Top 20 Spenders (Monthly)</h3>

      {dashboard.loading.topSpenders ? (
        <p className="text-gray-400">Loading top spenders...</p>
      ) : dashboard.errors.topSpenders ? (
        <p className="text-red-400">Error: {dashboard.errors.topSpenders}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-purple-500/20">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Rank</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">User ID</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Cost Range</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {mockSpenders.map((spender) => (
                <tr key={spender.rank} className="border-b border-purple-500/10 hover:bg-black/30">
                  <td className="py-3 px-4 text-white font-medium">#{spender.rank}</td>
                  <td className="py-3 px-4 text-purple-300 font-mono text-xs">{spender.userHash}</td>
                  <td className="py-3 px-4 text-gray-300">{spender.range}</td>
                  <td className="py-3 px-4 text-right text-orange-400 font-semibold">
                    {spender.percentage}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-500 mt-4">
            User IDs are hashed and costs are aggregated into ranges for privacy protection.
          </p>
        </div>
      )}
    </GlassCard>
  );
}
