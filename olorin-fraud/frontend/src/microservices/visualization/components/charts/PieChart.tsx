import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { ChartContainer } from './ChartContainer';
import { ChartConfig, OLORIN_CHART_THEME } from '../../types/chart.types';

ChartJS.register(ArcElement, Title, Tooltip, Legend);

interface PieChartProps {
  config: ChartConfig;
  className?: string;
}

export function PieChart({ config, className = '' }: PieChartProps) {
  const dataset = config.datasets[0];

  const chartData = {
    labels: dataset?.data.map(d => d.label || d.x) || [],
    datasets: [{
      label: dataset?.label || 'Data',
      data: dataset?.data.map(d => d.y) || [],
      backgroundColor: dataset?.backgroundColor || OLORIN_CHART_THEME.accentColors,
      borderColor: dataset?.borderColor || OLORIN_CHART_THEME.borderColor,
      borderWidth: dataset?.borderWidth || 2
    }]
  };

  const chartOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: config.options?.maintainAspectRatio ?? false,
    animation: {
      duration: config.options?.animationDuration || 750,
      easing: 'easeInOutQuart',
      animateRotate: true,
      animateScale: true
    },
    plugins: {
      legend: {
        display: config.options?.showLegend ?? true,
        position: config.options?.legendPosition || 'right',
        labels: {
          color: OLORIN_CHART_THEME.textColor,
          font: {
            size: config.options?.fontSize || 12,
            family: config.options?.fontFamily || 'monospace'
          },
          padding: 15,
          generateLabels: (chart) => {
            const data = chart.data;
            if (data.labels?.length && data.datasets.length) {
              return data.labels.map((label, i) => {
                const value = data.datasets[0].data[i];
                const total = (data.datasets[0].data as number[]).reduce((a, b) => a + b, 0);
                const percentage = ((value as number / total) * 100).toFixed(1);

                return {
                  text: `${label}: ${percentage}%`,
                  fillStyle: (data.datasets[0].backgroundColor as string[])[i],
                  strokeStyle: OLORIN_CHART_THEME.borderColor,
                  lineWidth: 2,
                  hidden: false,
                  index: i
                };
              });
            }
            return [];
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
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b) => (a as number) + (b as number), 0) as number;
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
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
      <Pie data={chartData} options={chartOptions} />
    </ChartContainer>
  );
}
