import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  PlayIcon,
  PauseIcon,
  StopIcon,
  TrashIcon,
  ArrowLeftIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CogIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { Investigation, AgentProgress, InvestigationEvent } from '../types/investigation';
import { useInvestigationWorkflow } from '../hooks/useInvestigationWorkflow';
import { LoadingSpinner } from '../../core-ui/components/LoadingSpinner';
import { ProgressMonitor } from './ProgressMonitor';
import { ResultsVisualization } from './ResultsVisualization';
import { ExportReporting } from './ExportReporting';
import { useExportReporting } from '../hooks/useExportReporting';

interface InvestigationDetailsProps {
  investigations: Investigation[];
  onStartInvestigation: (id: string) => Promise<void>;
  onPauseInvestigation: (id: string) => Promise<void>;
  onResumeInvestigation: (id: string) => Promise<void>;
  onStopInvestigation: (id: string) => Promise<void>;
  onDeleteInvestigation: (id: string) => Promise<void>;
  onBack: () => void;
}

export const InvestigationDetails: React.FC<InvestigationDetailsProps> = ({
  investigations,
  onStartInvestigation,
  onPauseInvestigation,
  onResumeInvestigation,
  onStopInvestigation,
  onDeleteInvestigation,
  onBack
}) => {
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'agents' | 'timeline' | 'results' | 'export'>('overview');

  const { getInvestigationEvents } = useInvestigationWorkflow();
  const { exportInvestigation } = useExportReporting();

  const investigation = investigations.find(inv => inv.id === id);
  const events = id ? getInvestigationEvents(id) : [];

  if (!investigation) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Investigation Not Found</h3>
          <p className="text-gray-600 mb-4">The investigation you're looking for doesn't exist or has been deleted.</p>
          <button
            onClick={onBack}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleAction = async (action: () => Promise<void>) => {
    setIsLoading(true);
    try {
      await action();
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <PlayIcon className="h-5 w-5 text-blue-500" />;
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'paused':
        return <PauseIcon className="h-5 w-5 text-yellow-500" />;
      case 'stopped':
        return <StopIcon className="h-5 w-5 text-gray-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'stopped': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canStart = investigation.status === 'pending' || investigation.status === 'stopped';
  const canPause = investigation.status === 'running';
  const canResume = investigation.status === 'paused';
  const canStop = investigation.status === 'running' || investigation.status === 'paused';
  const canDelete = investigation.status !== 'running';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (startDate: string, endDate?: string) => {
    const start = new Date(startDate).getTime();
    const end = endDate ? new Date(endDate).getTime() : Date.now();
    const duration = Math.round((end - start) / 1000 / 60); // minutes

    if (duration < 60) return `${duration}m`;
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{investigation.title}</h1>
            <div className="flex items-center space-x-4 mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(investigation.status)}`}>
                {getStatusIcon(investigation.status)}
                <span className="ml-1">{investigation.status.toUpperCase()}</span>
              </span>
              <span className="text-sm text-gray-500">ID: {investigation.id}</span>
              <span className="text-sm text-gray-500">
                Created {formatDate(investigation.createdAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {canStart && (
            <button
              onClick={() => handleAction(() => onStartInvestigation(investigation.id))}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              Start
            </button>
          )}
          {canPause && (
            <button
              onClick={() => handleAction(() => onPauseInvestigation(investigation.id))}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
            >
              <PauseIcon className="h-4 w-4 mr-2" />
              Pause
            </button>
          )}
          {canResume && (
            <button
              onClick={() => handleAction(() => onResumeInvestigation(investigation.id))}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              Resume
            </button>
          )}
          {canStop && (
            <button
              onClick={() => handleAction(() => onStopInvestigation(investigation.id))}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <StopIcon className="h-4 w-4 mr-2" />
              Stop
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => handleAction(() => onDeleteInvestigation(investigation.id))}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {investigation.status === 'running' && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm text-gray-500">{investigation.progress.overall}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${investigation.progress.overall}%` }}
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[{
            key: 'overview',
            label: 'Overview',
            icon: DocumentTextIcon
          }, {
            key: 'progress',
            label: 'Progress',
            icon: ChartBarIcon
          }, {
            key: 'agents',
            label: 'Agents',
            icon: CogIcon
          }, {
            key: 'timeline',
            label: 'Timeline',
            icon: ClockIcon
          }, {
            key: 'results',
            label: 'Results',
            icon: ChartBarIcon
          }, {
            key: 'export',
            label: 'Export',
            icon: ArrowDownTrayIcon
          }].map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Investigation Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Investigation Details</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Description</dt>
                  <dd className="text-sm text-gray-900">{investigation.description}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Priority</dt>
                  <dd className="text-sm text-gray-900 capitalize">{investigation.priority}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created By</dt>
                  <dd className="text-sm text-gray-900">{investigation.createdBy}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Duration</dt>
                  <dd className="text-sm text-gray-900">
                    {investigation.startedAt && formatDuration(investigation.startedAt, investigation.completedAt)}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Configuration */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Assigned Agents</dt>
                  <dd className="text-sm text-gray-900">{investigation.assignedAgents.length} agents</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Parallel Execution</dt>
                  <dd className="text-sm text-gray-900">
                    {investigation.configuration.parameters.parallelAgents ? 'Yes' : 'No'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Time Range</dt>
                  <dd className="text-sm text-gray-900">
                    {investigation.configuration.parameters.timeRange || 'Not specified'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Threshold</dt>
                  <dd className="text-sm text-gray-900">
                    {investigation.configuration.parameters.threshold || 'Not specified'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {activeTab === 'progress' && (
          <ProgressMonitor investigation={investigation} />
        )}

        {activeTab === 'agents' && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Agent Progress</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {investigation.progress.agents.map((agent, index) => (
                  <div key={agent.agentId} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(agent.status)}
                        <span className="font-medium text-gray-900">{agent.agentId}</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(agent.status)}`}>
                          {agent.status.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">{agent.progress}%</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{agent.message}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${agent.progress}%` }}
                      />
                    </div>
                    {agent.error && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                        Error: {agent.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Investigation Timeline</h3>
            </div>
            <div className="p-6">
              {events.length > 0 ? (
                <div className="space-y-4">
                  {events.map((event, index) => (
                    <div key={event.id} className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{event.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(event.timestamp)} • {event.actor}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No timeline events available</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <ResultsVisualization investigation={investigation} />
        )}

        {activeTab === 'export' && (
          <ExportReporting
            investigation={investigation}
            onExport={(options) => exportInvestigation(investigation, options)}
          />
        )}
      </div>

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <LoadingSpinner size="lg" message="Processing..." />
        </div>
      )}
    </div>
  );
};