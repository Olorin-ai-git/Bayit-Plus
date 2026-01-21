/**
 * Trend Graphs Component - Display time series trends.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { TrendSeries } from '../../types/analytics';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TrendGraphsProps {
  trends: TrendSeries[];
}

const TrendGraphs: React.FC<TrendGraphsProps> = ({ trends }) => {
  if (!trends || trends.length === 0) {
    return (
      <div className="bg-corporate-bgSecondary/50 backdrop-blur-md border border-corporate-borderPrimary/30 rounded-lg p-6">
        <p className="text-corporate-textSecondary text-center">
          No trend data available
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {trends.map((trend, index) => {
        const labels = trend.dataPoints.map(dp => {
          const date = new Date(dp.timestamp);
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        const data = trend.dataPoints.map(dp => dp.value);

        const chartData = {
          labels,
          datasets: [
            {
              label: trend.metric,
              data,
              borderColor: 'rgb(139, 92, 246)',
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              fill: true,
              tension: 0.4,
            },
          ],
        };

        const options = {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
            title: {
              display: true,
              text: trend.metric,
              color: '#F9FAFB',
            },
          },
          scales: {
            x: {
              ticks: { color: '#A5A1C2' },
              grid: { color: 'rgba(255, 255, 255, 0.1)' },
            },
            y: {
              ticks: { color: '#A5A1C2' },
              grid: { color: 'rgba(255, 255, 255, 0.1)' },
            },
          },
        };

        return (
          <div
            key={index}
            className="bg-corporate-bgSecondary/50 backdrop-blur-md border border-corporate-borderPrimary/30 rounded-lg p-6"
          >
            <div style={{ height: '300px' }}>
              <Line data={chartData} options={options} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TrendGraphs;

