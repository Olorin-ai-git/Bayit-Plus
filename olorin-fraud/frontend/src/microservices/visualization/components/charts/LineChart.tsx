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
  ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { ChartContainer } from './ChartContainer';
import { ChartConfig, OLORIN_CHART_THEME } from '../../types/chart.types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface LineChartProps {
  config: ChartConfig;
  className?: string;
}

export function LineChart({ config, className = '' }: LineChartProps) {
  const chartData = {
    labels: config.datasets[0]?.data.map(d => d.x) || [],
    datasets: config.datasets.map((dataset, index) => ({
      label: dataset.label,
      data: dataset.data.map(d => d.y),
      borderColor: dataset.borderColor || OLORIN_CHART_THEME.accentColors[index % OLORIN_CHART_THEME.accentColors.length],
      backgroundColor: dataset.backgroundColor || `${OLORIN_CHART_THEME.accentColors[index % OLORIN_CHART_THEME.accentColors.length]}33`,
      borderWidth: dataset.borderWidth || 2,
      fill: dataset.fill ?? false,
      tension: dataset.tension ?? 0.4,
      pointRadius: dataset.pointRadius ?? 3,
      pointHoverRadius: dataset.pointHoverRadius ?? 6,
      pointBackgroundColor: OLORIN_CHART_THEME.accentColors[index % OLORIN_CHART_THEME.accentColors.length],
      pointBorderColor: '#FFF',
      pointBorderWidth: 2
    }))
  };

  const chartOptions: ChartOptions<'line'> = {
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
    },
    interaction: {
      mode: 'index',
      intersect: false
    }
  };

  return (
    <ChartContainer
      title={config.title}
      description={config.description}
      size={config.size}
      className={className}
    >
      <Line data={chartData} options={chartOptions} />
    </ChartContainer>
  );
}
