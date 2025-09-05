import React, { useState, useEffect } from 'react';
import RAGChartVisualization from './RAGChartVisualization';
import { 
  metricOptions, 
  timeRangeOptions, 
  generatePerformanceData, 
  PerformanceDataPoint 
} from './RAGPerformanceChartConfig';
import { RAGMetrics } from '../../../types/RAGTypes';

interface RAGPerformanceChartsProps {
  metrics: RAGMetrics;
  investigationId: string;
  realTime?: boolean;
}

/**
 * RAG Performance Charts Component
 * Time-series performance visualization and interactive controls
 */
const RAGPerformanceCharts: React.FC<RAGPerformanceChartsProps> = ({
  metrics,
  investigationId,
  realTime = false,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<'retrieval_time' | 'hit_rate' | 'success_rate'>('retrieval_time');
  const [timeRange, setTimeRange] = useState<'5m' | '15m' | '1h' | '24h'>('15m');
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceDataPoint[]>([]);

  // Generate performance data for visualization
  useEffect(() => {
    const data = generatePerformanceData(timeRange, selectedMetric, metrics);
    setPerformanceHistory(data);
    
    if (realTime) {
      const interval = setInterval(() => {
        const newData = generatePerformanceData(timeRange, selectedMetric, metrics);
        setPerformanceHistory(newData);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [selectedMetric, timeRange, metrics, realTime]);

  const currentMetric = metricOptions.find(m => m.id === selectedMetric);
  const currentValue = {
    retrieval_time: metrics.avg_retrieval_time,
    hit_rate: metrics.knowledge_hit_rate * 100,
    success_rate: metrics.enhancement_success_rate * 100,
  }[selectedMetric] || 0;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Metric</label>
          <div className="flex space-x-2">
            {metricOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setSelectedMetric(option.id as any)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedMetric === option.id
                    ? `${option.bgColor} ${option.color} border-2 border-current`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.name}
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          >
            {timeRangeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Current Value Display */}
      {currentMetric && (
        <div className={`${currentMetric.bgColor} rounded-lg p-4`}>
          <div className="flex items-center justify-between">
            <div>
              <h4 className={`text-lg font-semibold ${currentMetric.color}`}>
                {currentMetric.name}
              </h4>
              <p className="text-sm text-gray-600">Current value for {investigationId}</p>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${currentMetric.color}`}>
                {currentValue.toFixed(selectedMetric === 'retrieval_time' ? 0 : 1)}
                {currentMetric.unit}
              </div>
              {realTime && (
                <div className="flex items-center text-sm text-gray-500">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  Live
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chart Visualization */}
      {currentMetric && (
        <RAGChartVisualization
          data={performanceHistory}
          metricName={currentMetric.name}
          metricUnit={currentMetric.unit}
          metricColor={currentMetric.color}
          timeRange={timeRange}
        />
      )}

      {/* Performance Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {metricOptions.map((metric) => {
          const value = {
            retrieval_time: metrics.avg_retrieval_time,
            hit_rate: metrics.knowledge_hit_rate * 100,
            success_rate: metrics.enhancement_success_rate * 100,
          }[metric.id as keyof typeof currentValue] || 0;
          
          return (
            <div key={metric.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${metric.bgColor.replace('bg-', 'bg-').replace('-50', '-500')}`}></div>
                <span className="text-sm font-medium text-gray-900">{metric.name}</span>
              </div>
              <div className={`text-2xl font-bold ${metric.color} mt-2`}>
                {value.toFixed(metric.id === 'retrieval_time' ? 0 : 1)}{metric.unit}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RAGPerformanceCharts;