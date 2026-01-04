import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { ChartContainer } from './ChartContainer';
import { ChartConfig, OLORIN_CHART_THEME } from '../../types/chart.types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface BarChartProps {
  config: ChartConfig;
  className?: string;
}

export function BarChart({ config, className = '' }: BarChartProps) {
  const chartData = {
    labels: config.datasets[0]?.data.map(d => d.x) || [],
    datasets: config.datasets.map((dataset, index) => ({
      label: dataset.label,
      data: dataset.data.map(d => d.y),
      backgroundColor: dataset.backgroundColor || OLORIN_CHART_THEME.accentColors[index % OLORIN_CHART_THEME.accentColors.length],
      borderColor: dataset.borderColor || OLORIN_CHART_THEME.borderColor,
      borderWidth: dataset.borderWidth || 1
    }))
  };

  const chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: config.options?.maintainAspectRatio ?? false,
    animation: {
      duration: config.options?.animationDuration || 750,
      easing: 'easeInOutQuart'
    },
    scales: {
      x: {
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
        beginAtZero: true,
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
        padding: 12
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
      <Bar data={chartData} options={chartOptions} />
    </ChartContainer>
  );
}
