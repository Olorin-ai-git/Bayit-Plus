import React, { useState, useMemo } from 'react';
import {
  AgentMetrics,
  CostBreakdown,
  ModelUsageData,
  AnalyticsFilter
} from '../types/agentAnalytics';

interface CostAnalyticsProps {
  agents: AgentMetrics[];
  costBreakdown: CostBreakdown[];
  models: ModelUsageData[];
  totalBudget?: number;
  onFilterChange?: (filter: Partial<AnalyticsFilter>) => void;
  onBudgetAlert?: (alert: BudgetAlert) => void;
  isLoading?: boolean;
  className?: string;
}

interface BudgetAlert {
  type: 'warning' | 'critical';
  message: string;
  currentSpend: number;
  budget: number;
  percentage: number;
}

interface CostTrend {
  period: string;
  cost: number;
  change: number;
  agents: number;
}

interface CostOptimization {
  category: string;
  currentCost: number;
  optimizedCost: number;
  savings: number;
  recommendation: string;
}

export const CostAnalytics: React.FC<CostAnalyticsProps> = ({
  agents,
  costBreakdown,
  models,
  totalBudget = 10000,
  onFilterChange,
  onBudgetAlert,
  isLoading = false,
  className = ''
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'quarter'>('month');
  const [viewMode, setViewMode] = useState<'overview' | 'breakdown' | 'trends' | 'optimization'>('overview');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');

  // Calculate total costs
  const totalCosts = useMemo(() => {
    const total = agents.reduce((sum, agent) => sum + agent.cost.totalCost, 0);
    const today = agents.reduce((sum, agent) => sum + agent.cost.costToday, 0);
    const thisWeek = agents.reduce((sum, agent) => sum + agent.cost.costThisWeek, 0);
    const thisMonth = agents.reduce((sum, agent) => sum + agent.cost.costThisMonth, 0);

    return { total, today, thisWeek, thisMonth };
  }, [agents]);

  // Calculate budget usage
  const budgetUsage = useMemo(() => {
    const spent = totalCosts.thisMonth;
    const percentage = (spent / totalBudget) * 100;
    const remaining = totalBudget - spent;
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const dayOfMonth = new Date().getDate();
    const projectedSpend = (spent / dayOfMonth) * daysInMonth;

    // Generate budget alert if needed
    if (percentage >= 90 && onBudgetAlert) {
      onBudgetAlert({
        type: 'critical',
        message: 'Budget usage is at 90% or higher',
        currentSpend: spent,
        budget: totalBudget,
        percentage
      });
    } else if (percentage >= 75 && onBudgetAlert) {
      onBudgetAlert({
        type: 'warning',
        message: 'Budget usage has reached 75%',
        currentSpend: spent,
        budget: totalBudget,
        percentage
      });
    }

    return {
      spent,
      percentage,
      remaining,
      projectedSpend,
      onTrack: projectedSpend <= totalBudget
    };
  }, [totalCosts.thisMonth, totalBudget, onBudgetAlert]);

  // Calculate cost trends
  const costTrends = useMemo((): CostTrend[] => {
    const trends: CostTrend[] = [];
    const now = new Date();

    // Generate trend data for the last few periods
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      let periodCost = 0;
      let periodLabel = '';

      switch (selectedPeriod) {
        case 'day':
          date.setDate(date.getDate() - i);
          periodLabel = date.toLocaleDateString();
          periodCost = i === 0 ? totalCosts.today : totalCosts.today * (0.8 + Math.random() * 0.4);
          break;
        case 'week':
          date.setDate(date.getDate() - (i * 7));
          periodLabel = `Week ${date.getDate()}`;
          periodCost = i === 0 ? totalCosts.thisWeek : totalCosts.thisWeek * (0.8 + Math.random() * 0.4);
          break;
        case 'month':
          date.setMonth(date.getMonth() - i);
          periodLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          periodCost = i === 0 ? totalCosts.thisMonth : totalCosts.thisMonth * (0.8 + Math.random() * 0.4);
          break;
        case 'quarter':
          date.setMonth(date.getMonth() - (i * 3));
          periodLabel = `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
          periodCost = totalCosts.thisMonth * 3 * (0.8 + Math.random() * 0.4);
          break;
      }

      const previousCost = trends[trends.length - 1]?.cost || periodCost;
      const change = trends.length > 0 ? ((periodCost - previousCost) / previousCost) * 100 : 0;

      trends.push({
        period: periodLabel,
        cost: periodCost,
        change,
        agents: agents.filter(a => a.status === 'active').length
      });
    }

    return trends;
  }, [selectedPeriod, totalCosts, agents]);

  // Calculate cost optimization recommendations
  const optimizations = useMemo((): CostOptimization[] => {
    const recommendations: CostOptimization[] = [];

<<<<<<< HEAD
    // Analyze model costs for optimization
    const modelCosts = models.reduce((acc, model) => {
      acc[model.modelName] = model.totalCost;
      return acc;
    }, {} as Record<string, number>);

=======
>>>>>>> 001-modify-analyzer-method
    // Find expensive models with low usage
    const expensiveModels = models.filter(model =>
      model.totalCost > 100 && model.totalCalls < 1000
    );

    if (expensiveModels.length > 0) {
      const totalExpensive = expensiveModels.reduce((sum, m) => sum + m.totalCost, 0);
      recommendations.push({
        category: 'Model Selection',
        currentCost: totalExpensive,
        optimizedCost: totalExpensive * 0.6,
        savings: totalExpensive * 0.4,
        recommendation: 'Switch to more cost-effective models for low-usage scenarios'
      });
    }

    // Analyze error rates for cost optimization
    const highErrorAgents = agents.filter(agent => agent.performance.errorRate > 10);
    if (highErrorAgents.length > 0) {
      const errorCost = highErrorAgents.reduce((sum, agent) => sum + agent.cost.totalCost, 0);
      recommendations.push({
        category: 'Error Reduction',
        currentCost: errorCost,
        optimizedCost: errorCost * 0.8,
        savings: errorCost * 0.2,
        recommendation: 'Improve agent configurations to reduce retry costs'
      });
    }

    // Analyze usage patterns for optimization
    const offPeakSavings = totalCosts.thisMonth * 0.15;
    recommendations.push({
      category: 'Usage Scheduling',
      currentCost: totalCosts.thisMonth,
      optimizedCost: totalCosts.thisMonth - offPeakSavings,
      savings: offPeakSavings,
      recommendation: 'Schedule non-urgent tasks during off-peak hours'
    });

    return recommendations.sort((a, b) => b.savings - a.savings);
  }, [agents, models, totalCosts.thisMonth]);

  // Filter agents based on selection
  const filteredAgents = useMemo(() => {
    return selectedAgent === 'all' ? agents : agents.filter(a => a.id === selectedAgent);
  }, [agents, selectedAgent]);

  const handlePeriodChange = (period: 'day' | 'week' | 'month' | 'quarter') => {
    setSelectedPeriod(period);
    onFilterChange?.({ granularity: period === 'quarter' ? 'month' : period });
  };

  const renderBudgetOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Monthly Budget</p>
            <p className="text-2xl font-bold text-gray-900">${totalBudget.toLocaleString()}</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-blue-600 text-xl">💰</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Spent This Month</p>
            <p className="text-2xl font-bold text-gray-900">${budgetUsage.spent.toFixed(2)}</p>
            <p className={`text-sm ${budgetUsage.percentage > 75 ? 'text-red-600' : 'text-green-600'}`}>
              {budgetUsage.percentage.toFixed(1)}% of budget
            </p>
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            budgetUsage.percentage > 90 ? 'bg-red-100' :
            budgetUsage.percentage > 75 ? 'bg-yellow-100' : 'bg-green-100'
          }`}>
            <span className={`text-xl ${
              budgetUsage.percentage > 90 ? 'text-red-600' :
              budgetUsage.percentage > 75 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              📊
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Remaining Budget</p>
            <p className="text-2xl font-bold text-gray-900">${budgetUsage.remaining.toFixed(2)}</p>
            <p className={`text-sm ${budgetUsage.onTrack ? 'text-green-600' : 'text-red-600'}`}>
              {budgetUsage.onTrack ? 'On track' : 'Over projected'}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            budgetUsage.onTrack ? 'bg-green-100' : 'bg-red-100'
          }`}>
            <span className={`text-xl ${budgetUsage.onTrack ? 'text-green-600' : 'text-red-600'}`}>
              {budgetUsage.onTrack ? '✅' : '⚠️'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Projected Spend</p>
            <p className="text-2xl font-bold text-gray-900">${budgetUsage.projectedSpend.toFixed(2)}</p>
            <p className={`text-sm ${
              budgetUsage.projectedSpend <= totalBudget ? 'text-green-600' : 'text-red-600'
            }`}>
              {((budgetUsage.projectedSpend / totalBudget) * 100).toFixed(1)}% of budget
            </p>
          </div>
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <span className="text-purple-600 text-xl">📈</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCostBreakdown = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown</h3>
      <div className="space-y-4">
        {costBreakdown.map((item, index) => (
          <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900 capitalize">
                  {item.category.replace('_', ' ')}
                </span>
                <span className="text-sm text-gray-500">{item.percentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
            <div className="ml-4 text-right">
              <p className="text-lg font-semibold text-gray-900">${item.cost.toFixed(2)}</p>
              <p className={`text-sm ${item.trend > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {item.trend > 0 ? '↗' : '↘'} {Math.abs(item.trend).toFixed(1)}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCostTrends = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Cost Trends</h3>
        <div className="flex space-x-2">
          {(['day', 'week', 'month', 'quarter'] as const).map(period => (
            <button
              key={period}
              onClick={() => handlePeriodChange(period)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors capitalize ${
                selectedPeriod === period
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {costTrends.map((trend, index) => (
          <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">{trend.period}</span>
                <span className="text-xs text-gray-500">{trend.agents} active agents</span>
              </div>
              <div className="mt-1">
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-semibold text-gray-900">
                    ${trend.cost.toFixed(2)}
                  </span>
                  {index > 0 && (
                    <span className={`text-sm flex items-center ${
                      trend.change > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {trend.change > 0 ? '↗' : '↘'} {Math.abs(trend.change).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderOptimizations = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Optimization Opportunities</h3>
      <div className="space-y-4">
        {optimizations.map((opt, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">{opt.category}</h4>
              <span className="text-sm font-semibold text-green-600">
                Save ${opt.savings.toFixed(2)}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-3">{opt.recommendation}</p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Current Cost</p>
                <p className="font-medium">${opt.currentCost.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-500">Optimized Cost</p>
                <p className="font-medium">${opt.optimizedCost.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-500">Potential Savings</p>
                <p className="font-medium text-green-600">
                  ${opt.savings.toFixed(2)} ({((opt.savings / opt.currentCost) * 100).toFixed(1)}%)
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAgentCosts = () => (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Agent Costs</h3>
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Agents</option>
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>
                {agent.agentName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Agent
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Cost
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cost/Call
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                This Month
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trend
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAgents.map((agent) => (
              <tr key={agent.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${
                      agent.status === 'active' ? 'bg-green-500' :
                      agent.status === 'inactive' ? 'bg-gray-400' :
                      agent.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{agent.agentName}</div>
                      <div className="text-sm text-gray-500">{agent.agentType}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${agent.cost.totalCost.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${agent.cost.averageCostPerCall.toFixed(4)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${agent.cost.costThisMonth.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center text-sm ${
                    agent.trends.costTrend > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {agent.trends.costTrend > 0 ? '↗' : '↘'} {Math.abs(agent.trends.costTrend).toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className={`animate-pulse space-y-6 ${className}`}>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-24" />
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
        <h2 className="text-xl font-bold text-gray-900">Cost Analytics</h2>
        <div className="flex space-x-2">
          {(['overview', 'breakdown', 'trends', 'optimization'] as const).map(mode => (
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

      {/* Budget Overview */}
      {renderBudgetOverview()}

      {/* View Mode Content */}
      {viewMode === 'overview' && renderAgentCosts()}
      {viewMode === 'breakdown' && renderCostBreakdown()}
      {viewMode === 'trends' && renderCostTrends()}
      {viewMode === 'optimization' && renderOptimizations()}
    </div>
  );
};

export default CostAnalytics;