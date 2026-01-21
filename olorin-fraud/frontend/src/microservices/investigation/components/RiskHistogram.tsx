/**
 * Risk Histogram Component
 *
 * Displays risk score distribution as a bar chart using Recharts.
 * Shows 10-bin histogram of predicted_risk values.
 *
 * Constitutional Compliance:
 * - All data from API response
 * - "Show table data" toggle for accessibility
 * - No hardcoded bin counts
 */

import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@shared/components/ui/Card';
import type { HistogramBin } from '../types/comparison';

interface RiskHistogramProps {
  data: HistogramBin[];
  title?: string;
}

export const RiskHistogram: React.FC<RiskHistogramProps> = ({ data, title = 'Risk Distribution' }) => {
  const [showTable, setShowTable] = useState(false);

  const chartData = data.map(bin => ({
    bin: bin.bin,
    count: bin.n
  }));

  return (
    <Card variant="default" padding="md">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-corporate-textPrimary">{title}</h4>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showTable}
            onChange={(e) => setShowTable(e.target.checked)}
            className="w-4 h-4 rounded border-corporate-accentPrimary/40 bg-black/30 text-corporate-accentPrimary focus:ring-corporate-accentPrimary"
          />
          <span className="text-xs text-corporate-textSecondary">Show table data</span>
        </label>
      </div>

      {showTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-corporate-borderPrimary">
                <th className="px-2 py-1 text-left text-corporate-textSecondary">Bin</th>
                <th className="px-2 py-1 text-right text-corporate-textSecondary">Count</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((item, idx) => (
                <tr key={idx} className="border-b border-corporate-borderPrimary/50">
                  <td className="px-2 py-1 text-corporate-textPrimary">{item.bin}</td>
                  <td className="px-2 py-1 text-right text-corporate-textPrimary">{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="bin"
              tick={{ fill: '#9CA3AF', fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid #4B5563',
                borderRadius: '4px',
                color: '#F3F4F6'
              }}
            />
            <Bar dataKey="count" fill="#8B5CF6" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

