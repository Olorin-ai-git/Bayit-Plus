import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  ArrowPathIcon,
  EyeIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  UserIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

interface StepLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  agent?: string;
}

interface InvestigationStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'paused';
  agent: string;
  startTime?: string;
  endTime?: string;
  progress: number;
  duration?: number;
  dependencies: string[];
  outputs?: string[];
  logs: StepLog[];
  metadata?: {
    retryCount?: number;
    priority?: number;
    estimatedDuration?: number;
  };
}

interface InvestigationStepTrackerProps {
  investigationId?: string;
  className?: string;
  onStepUpdate?: (steps: InvestigationStep[]) => void;
}

const InvestigationStepTracker: React.FC<InvestigationStepTrackerProps> = ({
  investigationId = 'inv-001',
  className = "",
  onStepUpdate
}) => {
  const [steps, setSteps] = useState<InvestigationStep[]>([]);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Mock data for demonstration
  useEffect(() => {
    const mockSteps: InvestigationStep[] = [
      {
        id: 'step-1',
        name: 'Initialize Investigation',
        description: 'Set up investigation parameters and validate configuration',
        status: 'completed',
        agent: 'System Agent',
        startTime: new Date(Date.now() - 300000).toISOString(),
        endTime: new Date(Date.now() - 270000).toISOString(),
        progress: 100,
        duration: 30,
        dependencies: [],
        outputs: ['investigation_config.json', 'validation_report.txt'],
        logs: [
          {
            id: 'log-1-1',
            timestamp: new Date(Date.now() - 295000).toISOString(),
            level: 'info',
            message: 'Investigation parameters validated successfully',
            agent: 'System Agent'
          },
          {
            id: 'log-1-2',
            timestamp: new Date(Date.now() - 280000).toISOString(),
            level: 'success',
            message: 'Configuration file created',
            agent: 'System Agent'
          }
        ],
        metadata: {
          retryCount: 0,
          priority: 1,
          estimatedDuration: 30
        }
      },
      {
        id: 'step-2',
        name: 'Data Collection',
        description: 'Gather user activity data, transaction history, and system logs',
        status: 'completed',
        agent: 'Data Collector Agent',
        startTime: new Date(Date.now() - 270000).toISOString(),
        endTime: new Date(Date.now() - 180000).toISOString(),
        progress: 100,
        duration: 90,
        dependencies: ['step-1'],
        outputs: ['user_data.csv', 'transaction_logs.json', 'system_events.log'],
        logs: [
          {
            id: 'log-2-1',
            timestamp: new Date(Date.now() - 265000).toISOString(),
            level: 'info',
            message: 'Starting data collection from multiple sources',
            agent: 'Data Collector Agent'
          },
          {
            id: 'log-2-2',
            timestamp: new Date(Date.now() - 220000).toISOString(),
            level: 'info',
            message: 'Collected 1,247 transaction records',
            agent: 'Data Collector Agent'
          },
          {
            id: 'log-2-3',
            timestamp: new Date(Date.now() - 190000).toISOString(),
            level: 'success',
            message: 'Data collection completed successfully',
            agent: 'Data Collector Agent'
          }
        ],
        metadata: {
          retryCount: 0,
          priority: 2,
          estimatedDuration: 120
        }
      },
      {
        id: 'step-3',
        name: 'Pattern Analysis',
        description: 'Analyze collected data for suspicious patterns and anomalies',
        status: 'running',
        agent: 'Pattern Analysis Agent',
        startTime: new Date(Date.now() - 180000).toISOString(),
        progress: 65,
        dependencies: ['step-2'],
        outputs: [],
        logs: [
          {
            id: 'log-3-1',
            timestamp: new Date(Date.now() - 175000).toISOString(),
            level: 'info',
            message: 'Initializing pattern analysis algorithms',
            agent: 'Pattern Analysis Agent'
          },
          {
            id: 'log-3-2',
            timestamp: new Date(Date.now() - 120000).toISOString(),
            level: 'info',
            message: 'Detected 23 potential anomalies in transaction patterns',
            agent: 'Pattern Analysis Agent'
          },
          {
            id: 'log-3-3',
            timestamp: new Date(Date.now() - 60000).toISOString(),
            level: 'warning',
            message: 'High-risk pattern identified in recent transactions',
            agent: 'Pattern Analysis Agent'
          }
        ],
        metadata: {
          retryCount: 0,
          priority: 3,
          estimatedDuration: 180
        }
      },
      {
        id: 'step-4',
        name: 'Risk Assessment',
        description: 'Evaluate risk levels and calculate threat scores',
        status: 'pending',
        agent: 'Risk Assessment Agent',
        progress: 0,
        dependencies: ['step-3'],
        outputs: [],
        logs: [],
        metadata: {
          retryCount: 0,
          priority: 4,
          estimatedDuration: 90
        }
      },
      {
        id: 'step-5',
        name: 'Report Generation',
        description: 'Generate comprehensive investigation report',
        status: 'pending',
        agent: 'Report Generator Agent',
        progress: 0,
        dependencies: ['step-4'],
        outputs: [],
        logs: [],
        metadata: {
          retryCount: 0,
          priority: 5,
          estimatedDuration: 60
        }
      }
    ];

    setSteps(mockSteps);
    setCurrentStepIndex(2); // Currently on step 3 (0-indexed)
    setIsRunning(true);

    if (onStepUpdate) {
      onStepUpdate(mockSteps);
    }
  }, [onStepUpdate]);

  const getStatusIcon = (status: InvestigationStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'running':
        return <ArrowPathIcon className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'paused':
        return <PauseIcon className="h-5 w-5 text-yellow-500" />;
      case 'skipped':
        return <ExclamationTriangleIcon className="h-5 w-5 text-gray-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: InvestigationStep['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'running':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'paused':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'skipped':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getLogLevelColor = (level: StepLog['level']) => {
    switch (level) {
      case 'success':
        return 'text-green-600 bg-green-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  const toggleStepExpansion = (stepId: string) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString();
  };

  const overallProgress = Math.round(
    steps.reduce((acc, step) => acc + step.progress, 0) / steps.length
  );

  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const runningSteps = steps.filter(step => step.status === 'running').length;
  const failedSteps = steps.filter(step => step.status === 'failed').length;

  return (
    <div className={`investigation-step-tracker p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Investigation Steps</h2>
          <p className="text-sm text-gray-600">Track investigation progress and step execution</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            Step {currentStepIndex + 1} of {steps.length}
          </span>
          <div className="text-lg font-semibold text-blue-600">{overallProgress}%</div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Overall Progress</h3>
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-green-600">{completedSteps} completed</span>
            <span className="text-blue-600">{runningSteps} running</span>
            <span className="text-red-600">{failedSteps} failed</span>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`bg-white rounded-lg border ${getStatusColor(step.status)} transition-all duration-200`}
          >
            <div
              className="p-4 cursor-pointer"
              onClick={() => toggleStepExpansion(step.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(step.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900">
                        {index + 1}. {step.name}
                      </h4>
                      {step.status === 'running' && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                          {step.progress}%
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center">
                        <UserIcon className="h-3 w-3 mr-1" />
                        {step.agent}
                      </span>
                      {step.startTime && (
                        <span className="flex items-center">
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          Started: {formatDate(step.startTime)}
                        </span>
                      )}
                      {step.duration && (
                        <span>Duration: {formatDuration(step.duration)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {step.outputs && step.outputs.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {step.outputs.length} outputs
                    </span>
                  )}
                  {expandedSteps.has(step.id) ? (
                    <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </div>

              {step.status === 'running' && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${step.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Expanded Content */}
            {expandedSteps.has(step.id) && (
              <div className="border-t border-gray-200 p-4 space-y-4">
                {/* Dependencies */}
                {step.dependencies.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Dependencies</h5>
                    <div className="flex flex-wrap gap-2">
                      {step.dependencies.map(depId => {
                        const depStep = steps.find(s => s.id === depId);
                        return (
                          <span
                            key={depId}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                          >
                            {depStep?.name || depId}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Outputs */}
                {step.outputs && step.outputs.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Outputs</h5>
                    <div className="space-y-1">
                      {step.outputs.map(output => (
                        <div key={output} className="flex items-center space-x-2 text-sm">
                          <DocumentTextIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-700">{output}</span>
                          <button className="text-blue-600 hover:text-blue-800">
                            <EyeIcon className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Logs */}
                {step.logs.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Logs</h5>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {step.logs.map(log => (
                        <div
                          key={log.id}
                          className={`p-2 rounded text-xs ${getLogLevelColor(log.level)}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {log.level.toUpperCase()}
                            </span>
                            <span className="text-gray-500">
                              {formatDate(log.timestamp)}
                            </span>
                          </div>
                          <p className="mt-1">{log.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default InvestigationStepTracker;