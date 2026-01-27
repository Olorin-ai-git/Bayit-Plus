// Timeline tab - displays cost trends over time

import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { GlassCard } from "@olorin/glass-ui";

interface TimelineTabProps {
  dashboard: any;
}

export default function TimelineTab({ dashboard }: TimelineTabProps) {
  // Generate sample timeline data for last 30 days
  const timelineData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (30 - i));
    const revenue = 15000 + Math.random() * 5000;
    const cost = 8000 + Math.random() * 3000;
    return {
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      revenue: Math.round(revenue),
      cost: Math.round(cost),
      profit: Math.round(revenue - cost),
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/80 backdrop-blur-xl border border-purple-500/20 rounded-lg p-3">
          <p className="text-white font-medium text-sm">{payload[0].payload.date}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
              {entry.name}: ${entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <GlassCard className="p-6 backdrop-blur-xl rounded-lg bg-black/30 border border-purple-500/20">
      <h3 className="text-lg font-semibold text-white mb-4">Cost Timeline</h3>
      <div className="space-y-3">
        {dashboard?.loading?.timeline ? (
          <p className="text-gray-400">Loading timeline...</p>
        ) : dashboard?.errors?.timeline ? (
          <p className="text-red-400">Error: {dashboard.errors.timeline}</p>
        ) : (
          <div className="flex justify-center py-4">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart
                data={timelineData}
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(168, 85, 247, 0.1)" />
                <XAxis
                  dataKey="date"
                  stroke="#9ca3af"
                  style={{ fontSize: 12 }}
                  tick={{ fill: "#9ca3af" }}
                />
                <YAxis
                  stroke="#9ca3af"
                  style={{ fontSize: 12 }}
                  tick={{ fill: "#9ca3af" }}
                  label={{ value: "Amount ($)", angle: -90, position: "insideLeft" }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: 20 }}
                  iconType="line"
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="Revenue"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                  name="Total Cost"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={false}
                  name="Net Profit"
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <div className="mt-4 pt-4 border-t border-purple-500/20">
        <p className="text-xs text-gray-500">
          Showing data from {dashboard?.dateRange?.start?.toLocaleDateString?.() || "N/A"} to{" "}
          {dashboard?.dateRange?.end?.toLocaleDateString?.() || "N/A"}
        </p>
      </div>
    </GlassCard>
  );
}
