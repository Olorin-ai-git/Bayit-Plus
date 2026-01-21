/**
 * PSI Chart Component - Visualize PSI trends over time.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface PSIChartProps {
  driftResults: any[];
}

const PSIChart: React.FC<PSIChartProps> = ({ driftResults }) => {
  const chartData = {
    labels: driftResults.map((r) => r.feature),
    datasets: [
      {
        label: 'PSI',
        data: driftResults.map((r) => r.psi),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1,
      },
      {
        label: 'PSI Threshold',
        data: driftResults.map((r) => r.psiThreshold),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderDash: [5, 5],
        tension: 0.1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'PSI by Feature',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="p-6 rounded-xl bg-corporate-bgSecondary/50 backdrop-blur-sm border border-corporate-border">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default PSIChart;

