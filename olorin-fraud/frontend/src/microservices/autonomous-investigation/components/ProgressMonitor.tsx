import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  ClockIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlayIcon,
  PauseIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { Investigation, InvestigationEvent } from '../types/investigation';
import { useInvestigationWorkflow } from '../hooks/useInvestigationWorkflow';
import { useEventBus } from '../../shared/services/EventBus';

interface ProgressMonitorProps {
  investigation: Investigation;
  onRefresh?: () => void;
}

interface AgentMetrics {
  agentId: string;
  progress: number;
  status: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  errorCount: number;
  retryCount: number;
  throughput?: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

interface SystemMetrics {
  totalAgents: number;
  activeAgents: number;
  completedAgents: number;
  failedAgents: number;
  averageProgress: number;
  estimatedTimeRemaining?: number;
  systemLoad: number;
  resourceUtilization: {
    cpu: number;
    memory: number;
    network: number;
  };
}

export const ProgressMonitor: React.FC<ProgressMonitorProps> = ({
  investigation,
  onRefresh
}) => {
  const [agentMetrics, setAgentMetrics] = useState<AgentMetrics[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [recentEvents, setRecentEvents] = useState<InvestigationEvent[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const { getInvestigationEvents, getAgentProgress } = useInvestigationWorkflow();
  const eventBus = useEventBus();

  useEffect(() => {
    updateMetrics();
    const interval = setInterval(updateMetrics, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [investigation.id, updateMetrics]);

  useEffect(() => {
    if (!eventBus) return;

    const handleAgentProgress = (event: any) => {
      if (event.investigationId === investigation.id) {
        updateMetrics();
        setLastUpdate(new Date());
      }
    };

    const handleAgentEvent = (event: any) => {
      if (event.investigationId === investigation.id) {
        updateMetrics();
        setLastUpdate(new Date());
      }
    };

    const handleInvestigationProgress = (event: any) => {
      if (event.id === investigation.id) {
        updateMetrics();
        setLastUpdate(new Date());
      }
    };

    eventBus.on('agent:progress', handleAgentProgress);
    eventBus.on('agent:started', handleAgentEvent);
    eventBus.on('agent:completed', handleAgentEvent);
    eventBus.on('agent:failed', handleAgentEvent);
    eventBus.on('investigation:progress', handleInvestigationProgress);

    return () => {
      eventBus.off('agent:progress', handleAgentProgress);
      eventBus.off('agent:started', handleAgentEvent);
      eventBus.off('agent:completed', handleAgentEvent);
      eventBus.off('agent:failed', handleAgentEvent);
      eventBus.off('investigation:progress', handleInvestigationProgress);
    };
  }, [eventBus, investigation.id, updateMetrics]);

  const updateMetrics = () => {
    // Update agent metrics
    const metrics: AgentMetrics[] = investigation.assignedAgents.map(agentId => {
      const progress = getAgentProgress(investigation.id, agentId);

      return {
        agentId,
        progress: progress?.progress || 0,
        status: progress?.status || 'pending',
        startTime: progress?.startedAt,
        endTime: progress?.completedAt,
        duration: progress?.startedAt && progress?.completedAt
          ? new Date(progress.completedAt).getTime() - new Date(progress.startedAt).getTime()
          : undefined,
        errorCount: progress?.error ? 1 : 0,
        retryCount: 0, // Would need to track this in the workflow engine
        throughput: Math.random() * 100, // Mock data - would come from backend
        memoryUsage: Math.random() * 512, // Mock data
        cpuUsage: Math.random() * 100 // Mock data
      };
    });

    setAgentMetrics(metrics);

    // Update system metrics
    const totalAgents = investigation.assignedAgents.length;
    const activeAgents = metrics.filter(m => m.status === 'running').length;
    const completedAgents = metrics.filter(m => m.status === 'completed').length;
    const failedAgents = metrics.filter(m => m.status === 'failed').length;
    const averageProgress = metrics.reduce((sum, m) => sum + m.progress, 0) / totalAgents;

    // Estimate time remaining based on current progress rate
    let estimatedTimeRemaining: number | undefined;
    if (investigation.startedAt && averageProgress > 0 && averageProgress < 100) {
      const elapsed = Date.now() - new Date(investigation.startedAt).getTime();
      const progressRate = averageProgress / elapsed; // progress per ms
      const remainingProgress = 100 - averageProgress;
      estimatedTimeRemaining = remainingProgress / progressRate;
    }

    const systemMetrics: SystemMetrics = {
      totalAgents,
      activeAgents,
      completedAgents,
      failedAgents,
      averageProgress,
      estimatedTimeRemaining,
      systemLoad: (activeAgents / totalAgents) * 100,
      resourceUtilization: {
        cpu: metrics.reduce((sum, m) => sum + (m.cpuUsage || 0), 0) / totalAgents,
        memory: metrics.reduce((sum, m) => sum + (m.memoryUsage || 0), 0) / totalAgents,
        network: Math.random() * 100 // Mock data
      }
    };

    setSystemMetrics(systemMetrics);

    // Update recent events
    const events = getInvestigationEvents(investigation.id);
    setRecentEvents(events.slice(-10).reverse()); // Last 10 events, newest first
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <PlayIcon className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />;
      case 'paused':
        return <PauseIcon className="h-4 w-4 text-yellow-500" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatTimeRemaining = (ms: number) => {
    const minutes = Math.floor(ms / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  if (!systemMetrics) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Loading progress data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Live Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-medium text-gray-900">Real-time Progress Monitor</h3>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-sm text-gray-600">
              {isLive ? 'Live' : 'Paused'} • Updated {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              isLive
                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            {isLive ? 'Pause' : 'Resume'}
          </button>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overall Progress</p>
              <p className="text-2xl font-semibold text-gray-900">{Math.round(systemMetrics.averageProgress)}%</p>
            </div>
            <ChartBarIcon className="h-8 w-8 text-blue-500" />
          </div>
          <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${systemMetrics.averageProgress}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Agents</p>
              <p className="text-2xl font-semibold text-gray-900">{systemMetrics.activeAgents}/{systemMetrics.totalAgents}</p>
            </div>
            <CpuChipIcon className="h-8 w-8 text-green-500" />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {systemMetrics.completedAgents} completed, {systemMetrics.failedAgents} failed
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Time Remaining</p>
              <p className="text-2xl font-semibold text-gray-900">
                {systemMetrics.estimatedTimeRemaining
                  ? formatTimeRemaining(systemMetrics.estimatedTimeRemaining)
                  : '—'
                }
              </p>
            </div>
            <ClockIcon className="h-8 w-8 text-orange-500" />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Estimated completion
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">System Load</p>
              <p className="text-2xl font-semibold text-gray-900">{Math.round(systemMetrics.systemLoad)}%</p>
            </div>
            <div className={`p-2 rounded-full ${
              systemMetrics.systemLoad > 80 ? 'bg-red-100' :
              systemMetrics.systemLoad > 60 ? 'bg-yellow-100' : 'bg-green-100'
            }`}>
              <div className={`w-4 h-4 rounded-full ${
                systemMetrics.systemLoad > 80 ? 'bg-red-500' :
                systemMetrics.systemLoad > 60 ? 'bg-yellow-500' : 'bg-green-500'
              }`}></div>
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Resource utilization
          </p>
        </div>
      </div>

      {/* Agent Progress Details */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-medium text-gray-900">Agent Progress Details</h4>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {agentMetrics.map(agent => (
              <div key={agent.agentId} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(agent.status)}
                    <span className="font-medium text-gray-900">{agent.agentId}</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(agent.status)}`}>
                      {agent.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>{agent.progress}%</span>
                    {agent.duration && (
                      <span>Duration: {formatDuration(agent.duration)}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium">{agent.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${agent.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">CPU Usage</span>
                      <span className="font-medium">{Math.round(agent.cpuUsage || 0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${agent.cpuUsage || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Memory</span>
                      <span className="font-medium">{Math.round(agent.memoryUsage || 0)} MB</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min((agent.memoryUsage || 0) / 512 * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-4">
                    {agent.startTime && (
                      <span>Started: {new Date(agent.startTime).toLocaleTimeString()}</span>
                    )}
                    {agent.throughput && (
                      <span>Throughput: {Math.round(agent.throughput)}/sec</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4">
                    {agent.errorCount > 0 && (
                      <span className="text-red-600">Errors: {agent.errorCount}</span>
                    )}
                    {agent.retryCount > 0 && (
                      <span className="text-yellow-600">Retries: {agent.retryCount}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resource Utilization */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-medium text-gray-900">System Resource Utilization</h4>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">CPU Usage</span>
                <span className="font-medium">{Math.round(systemMetrics.resourceUtilization.cpu)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${systemMetrics.resourceUtilization.cpu}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Memory Usage</span>
                <span className="font-medium">{Math.round(systemMetrics.resourceUtilization.memory)} MB</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(systemMetrics.resourceUtilization.memory / 10, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Network I/O</span>
                <span className="font-medium">{Math.round(systemMetrics.resourceUtilization.network)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-purple-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${systemMetrics.resourceUtilization.network}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-medium text-gray-900">Recent Activity</h4>
        </div>
        <div className="p-6">
          {recentEvents.length > 0 ? (
            <div className="space-y-3">
              {recentEvents.map((event, index) => (
                <div key={event.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{event.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(event.timestamp).toLocaleTimeString()} • {event.actor}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
};