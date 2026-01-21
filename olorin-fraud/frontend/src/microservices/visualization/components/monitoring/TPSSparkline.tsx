import React, { useRef, useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useEventBus } from '../../hooks/useEventBus';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
);

interface TPSSparklineProps {
  investigationId: string;
  maxSamples?: number;
  width?: number;
  height?: number;
  className?: string;
}

interface TPSDataPoint {
  timestamp: number;
  tps: number;
}

export function TPSSparkline({
  investigationId,
  maxSamples = 30,
  width = 400,
  height = 100,
  className = ''
}: TPSSparklineProps) {
  const [tpsData, setTpsData] = useState<TPSDataPoint[]>([]);
  const [currentTPS, setCurrentTPS] = useState<number>(0);
  const [peakTPS, setPeakTPS] = useState<number>(0);

  useEventBus<{ data: { investigationId: string; tps: number; timestamp: string } }>(
    'agent:tps-updated',
    (event) => {
      if (event.data.investigationId === investigationId) {
        const now = Date.now();
        const tpsValue = event.data.tps;

        setTpsData(prev => {
          const newData = [...prev, { timestamp: now, tps: tpsValue }];
          return newData.slice(-maxSamples);
        });

        setCurrentTPS(tpsValue);
        setPeakTPS(prev => Math.max(prev, tpsValue));
      }
    }
  );

  const chartData = {
    labels: tpsData.map((_, index) => `${index + 1}`),
    datasets: [
      {
        label: 'TPS',
        data: tpsData.map(d => d.tps),
        borderColor: '#F97316',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointBackgroundColor: '#F97316',
        pointBorderColor: '#FFF',
        pointBorderWidth: 2
      }
    ]
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 300,
      easing: 'easeInOutQuart'
    },
    scales: {
      x: {
        display: false,
        grid: {
          display: false
        }
      },
      y: {
        display: true,
        beginAtZero: true,
        grid: {
          color: '#1A2332',
          lineWidth: 1
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 10,
            family: 'monospace'
          },
          maxTicksLimit: 5
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        backgroundColor: '#0B1221',
        borderColor: '#F97316',
        borderWidth: 1,
        titleColor: '#F9FAFB',
        bodyColor: '#F9FAFB',
        padding: 8,
        displayColors: false,
        callbacks: {
          title: () => 'TPS',
          label: (context) => `${context.parsed.y.toFixed(2)} tx/sec`
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  const avgTPS = tpsData.length > 0
    ? tpsData.reduce((sum, d) => sum + d.tps, 0) / tpsData.length
    : 0;

  return (
    <div className={`tps-sparkline ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 font-mono">TPS Monitor</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">Current:</span>
            <span className="text-sm font-mono text-orange-400">{currentTPS.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">Avg:</span>
            <span className="text-sm font-mono text-blue-400">{avgTPS.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">Peak:</span>
            <span className="text-sm font-mono text-green-400">{peakTPS.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div
        style={{ width: `${width}px`, height: `${height}px` }}
        className="bg-gray-900/50 rounded-lg border border-gray-700 p-2"
      >
        {tpsData.length > 0 ? (
          <Line data={chartData} options={chartOptions} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-gray-500">Waiting for TPS data...</span>
          </div>
        )}
      </div>
    </div>
  );
}
