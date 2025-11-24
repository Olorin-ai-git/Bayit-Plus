import React, { useState, useMemo } from 'react';
import {
  AgentMetrics,
  UsagePattern,
  RealtimeMetrics,
  AnalyticsFilter
} from '../types/agentAnalytics';

interface UsageTrackingProps {
  agents: AgentMetrics[];
  usagePatterns: UsagePattern[];
  realtimeMetrics: RealtimeMetrics;
  onFilterChange?: (filter: Partial<AnalyticsFilter>) => void;
  onAgentSelect?: (agentId: string) => void;
  isLoading?: boolean;
  className?: string;
}

interface UsageHeatmapData {
  hour: number;
  day: number;
  intensity: number;
  callCount: number;
}

interface PeakUsageInfo {
  time: string;
  agent: string;
  calls: number;
  type: 'daily' | 'weekly' | 'monthly';
}

export const UsageTracking: React.FC<UsageTrackingProps> = ({
  agents,
  usagePatterns,
  realtimeMetrics,
  onFilterChange,
  onAgentSelect,
  isLoading = false,
  className = ''
}) => {
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'heatmap' | 'timeline' | 'patterns'>('heatmap');
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  // Calculate usage heatmap data
  const heatmapData = useMemo((): UsageHeatmapData[] => {
    const data: UsageHeatmapData[] = [];
    const maxCalls = Math.max(...usagePatterns.map(p => p.callCount));

    // Generate heatmap for 24 hours x 7 days
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const pattern = usagePatterns.find(p => p.dayOfWeek === day && p.timeOfDay === hour);
        data.push({
          hour,
          day,
          callCount: pattern?.callCount || 0,
          intensity: pattern ? (pattern.callCount / maxCalls) * 100 : 0
        });
      }
    }

    return data;
  }, [usagePatterns]);

  // Calculate peak usage times
  const peakUsage = useMemo((): PeakUsageInfo[] => {
    const dailyPeaks = new Map<number, { hour: number; calls: number }>();
    const weeklyPeak = { day: 0, hour: 0, calls: 0 };
    let monthlyPeak = { day: 0, hour: 0, calls: 0, agent: '' };

    // Find daily peaks
    for (let day = 0; day < 7; day++) {
      let maxCalls = 0;
      let peakHour = 0;

      usagePatterns
        .filter(p => p.dayOfWeek === day)
        .forEach(pattern => {
          if (pattern.callCount > maxCalls) {
            maxCalls = pattern.callCount;
            peakHour = pattern.timeOfDay;
          }
        });

      dailyPeaks.set(day, { hour: peakHour, calls: maxCalls });

      // Check for weekly peak
      if (maxCalls > weeklyPeak.calls) {
        weeklyPeak.day = day;
        weeklyPeak.hour = peakHour;
        weeklyPeak.calls = maxCalls;
      }
    }

    // Find monthly peak (agent with highest usage)
    agents.forEach(agent => {
      const totalCalls = agent.usage.callsThisMonth;
      if (totalCalls > monthlyPeak.calls) {
        monthlyPeak.calls = totalCalls;
        monthlyPeak.agent = agent.agentName;
        monthlyPeak.day = agent.usage.peakUsageDay ? parseInt(agent.usage.peakUsageDay) : 0;
        monthlyPeak.hour = agent.usage.peakUsageHour;
      }
    });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return [
      {
        time: `${weeklyPeak.hour}:00 on ${dayNames[weeklyPeak.day]}`,
        agent: 'All Agents',
        calls: weeklyPeak.calls,
        type: 'weekly'
      },
      {
        time: `${monthlyPeak.hour}:00 on ${dayNames[monthlyPeak.day]}`,
        agent: monthlyPeak.agent,
        calls: monthlyPeak.calls,
        type: 'monthly'
      }
    ];
  }, [usagePatterns, agents]);

  // Filter agents based on selection
  const filteredAgents = useMemo(() => {
    return selectedAgent === 'all' ? agents : agents.filter(a => a.id === selectedAgent);
  }, [agents, selectedAgent]);

  // Calculate usage statistics
  const usageStats = useMemo(() => {
    const totalCalls = filteredAgents.reduce((sum, agent) => sum + agent.usage.totalCalls, 0);
    const averageCallsPerDay = filteredAgents.reduce((sum, agent) => sum + agent.usage.averageCallsPerDay, 0) / filteredAgents.length;
<<<<<<< HEAD
    const peakHour = usagePatterns.reduce((max, pattern) =>
      pattern.callCount > max.callCount ? pattern : max, usagePatterns[0])?.timeOfDay || 0;
=======
    const firstPattern = usagePatterns[0];
    const peakHour = firstPattern ? usagePatterns.reduce((max, pattern) =>
      pattern.callCount > max.callCount ? pattern : max, firstPattern)?.timeOfDay || 0 : 0;
>>>>>>> 001-modify-analyzer-method

    return {
      totalCalls,
      averageCallsPerDay: averageCallsPerDay || 0,
      peakHour,
      activeAgents: filteredAgents.filter(a => a.status === 'active').length,
      currentLoad: realtimeMetrics.systemLoad
    };
  }, [filteredAgents, usagePatterns, realtimeMetrics]);

  const handleAgentChange = (agentId: string) => {
    setSelectedAgent(agentId);
    if (agentId !== 'all') {
      onAgentSelect?.(agentId);
    }
  };

  const handleTimeRangeChange = (range: '24h' | '7d' | '30d') => {
    setTimeRange(range);
    const now = new Date();
    const start = new Date(now);

    switch (range) {
      case '24h':
        start.setHours(now.getHours() - 24);
        break;
      case '7d':
        start.setDate(now.getDate() - 7);
        break;
      case '30d':
        start.setDate(now.getDate() - 30);
        break;
    }

    onFilterChange?.({
      dateRange: {
        start: start.toISOString(),
        end: now.toISOString()
      }
    });
  };

  const getIntensityColor = (intensity: number) => {
    if (intensity === 0) return 'bg-gray-100';
    if (intensity < 25) return 'bg-blue-200';
    if (intensity < 50) return 'bg-blue-400';
    if (intensity < 75) return 'bg-blue-600';
    return 'bg-blue-800';
  };

  const renderUsageStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-sm">📊</span>
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">Total Calls</p>
            <p className="text-lg font-semibold text-gray-700">
              {usageStats.totalCalls.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-sm">📈</span>
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">Avg/Day</p>
            <p className="text-lg font-semibold text-gray-700">
              {usageStats.averageCallsPerDay.toFixed(0)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
              <span className="text-yellow-600 text-sm">⏰</span>
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">Peak Hour</p>
            <p className="text-lg font-semibold text-gray-700">
              {usageStats.peakHour}:00
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 text-sm">🤖</span>
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">Active Agents</p>
            <p className="text-lg font-semibold text-gray-700">
              {usageStats.activeAgents}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              usageStats.currentLoad < 50 ? 'bg-green-100' :
              usageStats.currentLoad < 80 ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              <span className={`text-sm ${
                usageStats.currentLoad < 50 ? 'text-green-600' :
                usageStats.currentLoad < 80 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                ⚡
              </span>
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">System Load</p>
            <p className="text-lg font-semibold text-gray-700">
              {usageStats.currentLoad.toFixed(0)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderHeatmap = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Usage Heatmap</h3>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <span>Low</span>
          <div className="flex space-x-1">
            <div className="w-3 h-3 bg-gray-100 rounded"></div>
            <div className="w-3 h-3 bg-blue-200 rounded"></div>
            <div className="w-3 h-3 bg-blue-400 rounded"></div>
            <div className="w-3 h-3 bg-blue-600 rounded"></div>
            <div className="w-3 h-3 bg-blue-800 rounded"></div>
          </div>
          <span>High</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="grid grid-cols-25 gap-1 min-w-max">
          {/* Hour headers */}
          <div></div>
          {Array.from({ length: 24 }, (_, i) => (
            <div key={i} className="text-xs text-gray-500 text-center p-1">
              {i}
            </div>
          ))}

          {/* Heatmap rows */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, dayIndex) => (
            <React.Fragment key={day}>
              <div className="text-xs text-gray-500 text-right p-1 min-w-8">
                {day}
              </div>
              {Array.from({ length: 24 }, (_, hourIndex) => {
                const data = heatmapData.find(d => d.day === dayIndex && d.hour === hourIndex);
                return (
                  <div
                    key={`${dayIndex}-${hourIndex}`}
                    className={`w-4 h-4 rounded ${getIntensityColor(data?.intensity || 0)} cursor-pointer`}
                    title={`${day} ${hourIndex}:00 - ${data?.callCount || 0} calls`}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );

  const renderUsagePatterns = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Patterns</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Peak Usage Times</h4>
          <div className="space-y-2">
            {peakUsage.map((peak, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{peak.time}</p>
                  <p className="text-xs text-gray-500">{peak.agent}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{peak.calls.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 capitalize">{peak.type} peak</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Agent Activity</h4>
          <div className="space-y-2">
            {filteredAgents.slice(0, 5).map((agent) => (
              <div key={agent.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${
                    agent.status === 'active' ? 'bg-green-500' :
                    agent.status === 'inactive' ? 'bg-gray-400' :
                    agent.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{agent.agentName}</p>
                    <p className="text-xs text-gray-500">{agent.agentType}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {agent.usage.callsToday.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">calls today</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTimeline = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Timeline</h3>

      <div className="space-y-4">
        {filteredAgents.map((agent) => (
          <div key={agent.id} className="border-l-4 border-blue-500 pl-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">{agent.agentName}</h4>
              <span className="text-xs text-gray-500">
                Last active: {new Date(agent.performance.lastActivity).toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Today</p>
                <p className="font-medium">{agent.usage.callsToday}</p>
              </div>
              <div>
                <p className="text-gray-600">This Week</p>
                <p className="font-medium">{agent.usage.callsThisWeek}</p>
              </div>
              <div>
                <p className="text-gray-600">This Month</p>
                <p className="font-medium">{agent.usage.callsThisMonth}</p>
              </div>
              <div>
                <p className="text-gray-600">Avg/Day</p>
                <p className="font-medium">{agent.usage.averageCallsPerDay.toFixed(0)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className={`animate-pulse space-y-6 ${className}`}>
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-20" />
          ))}
        </div>
        <div className="bg-gray-200 rounded-lg h-64" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Usage Tracking</h2>
        <div className="flex items-center space-x-4">
          <select
            value={selectedAgent}
            onChange={(e) => handleAgentChange(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Agents</option>
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>
                {agent.agentName}
              </option>
            ))}
          </select>

          <div className="flex space-x-2">
            {(['24h', '7d', '30d'] as const).map(range => (
              <button
                key={range}
                onClick={() => handleTimeRangeChange(range)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <div className="flex space-x-2">
            {(['heatmap', 'timeline', 'patterns'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors capitalize ${
                  viewMode === mode
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Usage Statistics */}
      {renderUsageStats()}

      {/* View Mode Content */}
      {viewMode === 'heatmap' && renderHeatmap()}
      {viewMode === 'timeline' && renderTimeline()}
      {viewMode === 'patterns' && renderUsagePatterns()}
    </div>
  );
};

export default UsageTracking;