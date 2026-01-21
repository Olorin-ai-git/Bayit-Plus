/**
 * Daily Timeseries Component
 *
 * Displays daily transaction counts and confusion matrix values over time.
 * Uses Recharts LineChart for visualization.
 *
 * Constitutional Compliance:
 * - All data from API response
 * - "Show table data" toggle for accessibility
 * - Handles missing data gracefully
 */

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from '@shared/components/ui/Card';
import type { TimeseriesDaily } from '../types/comparison';

interface DailyTimeseriesProps {
  data: TimeseriesDaily[];
  title?: string;
}

export const DailyTimeseries: React.FC<DailyTimeseriesProps> = ({ data, title = 'Daily Trends' }) => {
  const [showTable, setShowTable] = useState(false);

  const chartData = data.map(item => ({
    date: item.date,
    count: item.count,
    TP: item.TP || 0,
    FP: item.FP || 0,
    TN: item.TN || 0,
    FN: item.FN || 0
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
                <th className="px-2 py-1 text-left text-corporate-textSecondary">Date</th>
                <th className="px-2 py-1 text-right text-corporate-textSecondary">Count</th>
                <th className="px-2 py-1 text-right text-corporate-textSecondary">TP</th>
                <th className="px-2 py-1 text-right text-corporate-textSecondary">FP</th>
                <th className="px-2 py-1 text-right text-corporate-textSecondary">TN</th>
                <th className="px-2 py-1 text-right text-corporate-textSecondary">FN</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((item, idx) => (
                <tr key={idx} className="border-b border-corporate-borderPrimary/50">
                  <td className="px-2 py-1 text-corporate-textPrimary">{item.date}</td>
                  <td className="px-2 py-1 text-right text-corporate-textPrimary">{item.count}</td>
                  <td className="px-2 py-1 text-right text-corporate-textPrimary">{item.TP}</td>
                  <td className="px-2 py-1 text-right text-corporate-textPrimary">{item.FP}</td>
                  <td className="px-2 py-1 text-right text-corporate-textPrimary">{item.TN}</td>
                  <td className="px-2 py-1 text-right text-corporate-textPrimary">{item.FN}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
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
            <Legend wrapperStyle={{ color: '#9CA3AF', fontSize: '12px' }} />
            <Line type="monotone" dataKey="count" stroke="#8B5CF6" strokeWidth={2} name="Transactions" />
            <Line type="monotone" dataKey="TP" stroke="#10B981" strokeWidth={1} name="TP" />
            <Line type="monotone" dataKey="FP" stroke="#EF4444" strokeWidth={1} name="FP" />
            <Line type="monotone" dataKey="TN" stroke="#3B82F6" strokeWidth={1} name="TN" />
            <Line type="monotone" dataKey="FN" stroke="#F59E0B" strokeWidth={1} name="FN" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

