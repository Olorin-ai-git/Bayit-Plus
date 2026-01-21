import React, { useState, useEffect } from 'react';
import {
  PlayIcon,
  PauseIcon,
  StopIcon,
  CogIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface InvestigationStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  agent: string;
  startTime?: string;
  endTime?: string;
  progress: number;
  output?: string;
}

interface StructuredInvestigationProps {
  investigationId?: string;
  className?: string;
}

const StructuredInvestigation: React.FC<StructuredInvestigationProps> = ({
  investigationId = 'auto-001',
  className = ""
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<InvestigationStep[]>([
    {
      id: 'step-1',
      name: 'Data Collection',
      description: 'Gathering user activity data and transaction history',
      status: 'completed',
      agent: 'Data Collector Agent',
      startTime: new Date(Date.now() - 300000).toISOString(),
      endTime: new Date(Date.now() - 240000).toISOString(),
      progress: 100,
      output: 'Collected 1,247 transactions and 856 user activities'
    },
    {
      id: 'step-2',
      name: 'Pattern Analysis',
      description: 'Analyzing patterns for anomalies and suspicious behavior',
      status: 'running',
      agent: 'Pattern Analysis Agent',
      startTime: new Date(Date.now() - 240000).toISOString(),
      progress: 65,
    },
    {
      id: 'step-3',
      name: 'Risk Assessment',
      description: 'Evaluating risk levels and threat indicators',
      status: 'pending',
      agent: 'Risk Assessment Agent',
      progress: 0,
    },
    {
      id: 'step-4',
      name: 'Report Generation',
      description: 'Generating comprehensive investigation report',
      status: 'pending',
      agent: 'Report Generator Agent',
      progress: 0,
    }
  ]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isRunning && !isPaused) {
      interval = setInterval(() => {
        setSteps(prevSteps => {
          const updatedSteps = [...prevSteps];
          const runningStepIndex = updatedSteps.findIndex(step => step.status === 'running');

          if (runningStepIndex !== -1) {
            const step = updatedSteps[runningStepIndex];
            if (step.progress < 100) {
              step.progress = Math.min(100, step.progress + Math.random() * 5);
            } else {
              step.status = 'completed';
              step.endTime = new Date().toISOString();

              // Start next step
              const nextStepIndex = runningStepIndex + 1;
              if (nextStepIndex < updatedSteps.length) {
                updatedSteps[nextStepIndex].status = 'running';
                updatedSteps[nextStepIndex].startTime = new Date().toISOString();
                setCurrentStep(nextStepIndex);
              } else {
                setIsRunning(false);
              }
            }
          }

          return updatedSteps;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, isPaused]);

  const handleStart = () => {
    setIsRunning(true);
    setIsPaused(false);

    // If no step is running, start the first pending step
    const firstPendingIndex = steps.findIndex(step => step.status === 'pending');
    if (firstPendingIndex !== -1) {
      setSteps(prevSteps => {
        const updatedSteps = [...prevSteps];
        updatedSteps[firstPendingIndex].status = 'running';
        updatedSteps[firstPendingIndex].startTime = new Date().toISOString();
        return updatedSteps;
      });
      setCurrentStep(firstPendingIndex);
    }
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleStop = () => {
    setIsRunning(false);
    setIsPaused(false);

    setSteps(prevSteps => {
      const updatedSteps = [...prevSteps];
      const runningStepIndex = updatedSteps.findIndex(step => step.status === 'running');
      if (runningStepIndex !== -1) {
        updatedSteps[runningStepIndex].status = 'pending';
        updatedSteps[runningStepIndex].progress = 0;
        delete updatedSteps[runningStepIndex].startTime;
      }
      return updatedSteps;
    });
  };

  const getStatusIcon = (status: InvestigationStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'running':
        return <ArrowPathIcon className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
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
      case 'pending':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const overallProgress = Math.round(
    steps.reduce((acc, step) => acc + step.progress, 0) / steps.length
  );

  const completedSteps = steps.filter(step => step.status === 'completed').length;

  return (
    <div className={`structured-investigation p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Structured Investigation</h1>
          <p className="text-gray-600">AI-powered fraud detection investigation #{investigationId}</p>
        </div>
        <div className="flex items-center space-x-3">
          {!isRunning ? (
            <button
              onClick={handleStart}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              Start Investigation
            </button>
          ) : (
            <>
              {isPaused ? (
                <button
                  onClick={handleResume}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlayIcon className="h-4 w-4 mr-2" />
                  Resume
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  <PauseIcon className="h-4 w-4 mr-2" />
                  Pause
                </button>
              )}
              <button
                onClick={handleStop}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <StopIcon className="h-4 w-4 mr-2" />
                Stop
              </button>
            </>
          )}
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <CogIcon className="h-4 w-4 mr-2" />
            Configure
          </button>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Investigation Progress</h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {completedSteps} of {steps.length} steps completed
            </span>
            <span className="text-lg font-semibold text-blue-600">{overallProgress}%</span>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-semibold text-gray-900">{steps.length}</p>
            <p className="text-sm text-gray-600">Total Steps</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-green-600">{completedSteps}</p>
            <p className="text-sm text-gray-600">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-blue-600">
              {steps.filter(step => step.status === 'running').length}
            </p>
            <p className="text-sm text-gray-600">Running</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-gray-600">
              {steps.filter(step => step.status === 'pending').length}
            </p>
            <p className="text-sm text-gray-600">Pending</p>
          </div>
        </div>
      </div>

      {/* Investigation Steps */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Investigation Steps</h2>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`border rounded-lg p-4 ${getStatusColor(step.status)}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(step.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900">{step.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                    <p className="text-xs text-gray-500 mt-1">Agent: {step.agent}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-900">{step.progress}%</span>
                </div>
              </div>

              {step.status === 'running' && (
                <div className="mb-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${step.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {step.output && (
                <div className="mt-3 p-3 bg-gray-100 rounded text-sm text-gray-700">
                  <strong>Output:</strong> {step.output}
                </div>
              )}

              {step.startTime && (
                <div className="mt-2 text-xs text-gray-500">
                  Started: {new Date(step.startTime).toLocaleString()}
                  {step.endTime && (
                    <span className="ml-4">
                      Completed: {new Date(step.endTime).toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Investigation Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Investigation Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Current Activity</h3>
            {isRunning ? (
              <div className="flex items-center space-x-2">
                <ArrowPathIcon className="h-4 w-4 text-blue-500 animate-spin" />
                <span className="text-sm text-gray-600">
                  {isPaused ? 'Investigation paused' : 'Investigation running...'}
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <ClockIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Investigation not started</span>
              </div>
            )}
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Next Step</h3>
            {currentStep < steps.length - 1 ? (
              <p className="text-sm text-gray-600">{steps[currentStep + 1]?.name || 'All steps completed'}</p>
            ) : (
              <p className="text-sm text-gray-600">All steps completed</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StructuredInvestigation;
