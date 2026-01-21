import React from 'react';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';
import { ChartContainer } from './ChartContainer';
import { ChartConfig, OLORIN_CHART_THEME } from '../../types/chart.types';

ChartJS.register(LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface ScatterChartProps {
  config: ChartConfig;
  className?: string;
}

export function ScatterChart({ config, className = '' }: ScatterChartProps) {
  const chartData = {
    datasets: config.datasets.map((dataset, index) => ({
      label: dataset.label,
      data: dataset.data.map(d => ({ x: Number(d.x), y: d.y })),
      backgroundColor: dataset.backgroundColor || OLORIN_CHART_THEME.accentColors[index % OLORIN_CHART_THEME.accentColors.length],
      borderColor: dataset.borderColor || OLORIN_CHART_THEME.accentColors[index % OLORIN_CHART_THEME.accentColors.length],
      borderWidth: dataset.borderWidth || 2,
      pointRadius: dataset.pointRadius ?? 6,
      pointHoverRadius: dataset.pointHoverRadius ?? 8,
      pointBorderColor: '#FFF',
      pointBorderWidth: 2
    }))
  };

  const chartOptions: ChartOptions<'scatter'> = {
    responsive: true,
    maintainAspectRatio: config.options?.maintainAspectRatio ?? false,
    animation: {
      duration: config.options?.animationDuration || 750,
      easing: 'easeInOutQuart'
    },
    scales: {
      x: {
        type: 'linear',
        position: 'bottom',
        grid: {
          display: config.options?.showGrid ?? true,
          color: config.options?.gridColor || OLORIN_CHART_THEME.gridColor
        },
        ticks: {
          color: config.options?.textColor || OLORIN_CHART_THEME.textColor,
          font: {
            size: config.options?.fontSize || 12,
            family: config.options?.fontFamily || 'monospace'
          }
        }
      },
      y: {
        type: 'linear',
        grid: {
          display: config.options?.showGrid ?? true,
          color: config.options?.gridColor || OLORIN_CHART_THEME.gridColor
        },
        ticks: {
          color: config.options?.textColor || OLORIN_CHART_THEME.textColor,
          font: {
            size: config.options?.fontSize || 12,
            family: config.options?.fontFamily || 'monospace'
          }
        }
      }
    },
    plugins: {
      legend: {
        display: config.options?.showLegend ?? true,
        position: config.options?.legendPosition || 'top',
        labels: {
          color: OLORIN_CHART_THEME.textColor,
          font: {
            size: config.options?.fontSize || 12,
            family: config.options?.fontFamily || 'monospace'
          }
        }
      },
      tooltip: {
        enabled: config.options?.showTooltip ?? true,
        backgroundColor: OLORIN_CHART_THEME.backgroundColor,
        borderColor: OLORIN_CHART_THEME.accentColors[0],
        borderWidth: 1,
        titleColor: OLORIN_CHART_THEME.textColor,
        bodyColor: OLORIN_CHART_THEME.textColor,
        padding: 12,
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const point = context.parsed;
            return `${label}: (${point.x.toFixed(2)}, ${point.y.toFixed(2)})`;
          }
        }
      }
    }
  };

  return (
    <ChartContainer
      title={config.title}
      description={config.description}
      size={config.size}
      className={className}
    >
      <Scatter data={chartData} options={chartOptions} />
    </ChartContainer>
  );
}
