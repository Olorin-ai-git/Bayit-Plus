import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Play, Pause, Square, Settings, AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { Investigation, InvestigationStep, StepStatus, LogLevel } from '../../types/investigation';
import { OlorinService } from '@shared/services/OlorinService';
import { toast } from 'react-hot-toast';

interface InvestigationRunnerProps {
  investigation: Investigation;
  steps: InvestigationStep[];
  isLoading: boolean;
  onStepsUpdate: (steps: InvestigationStep[]) => void;
  onInvestigationUpdate: (investigation: Partial<Investigation>) => void;
  onLogAdd: (message: string, type: LogLevel) => void;
  className?: string;
}

const InvestigationRunner: React.FC<InvestigationRunnerProps> = ({
  investigation,
  steps,
  isLoading,
  onStepsUpdate,
  onInvestigationUpdate,
  onLogAdd,
  className = ""
}) => {
  // State management
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [stepStartTimes, setStepStartTimes] = useState<Record<string, Date>>({});
  const [stepEndTimes, setStepEndTimes] = useState<Record<string, Date>>({});

  // Initialize API service
  const olorinService = useMemo(() => new OlorinService(), []);

  // Get current step
  const currentStep = steps[currentStepIndex];

  // Calculate progress
  const completedSteps = steps.filter(step => step.status === StepStatus.COMPLETED).length;
  const totalSteps = steps.length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  // Check if investigation can be started
  const canStart = !isRunning && !isLoading && steps.length > 0 &&
                  investigation.status !== 'completed';

  // Check if investigation can be paused
  const canPause = isRunning && !isPaused && !isLoading;

  // Check if investigation can be resumed
  const canResume = isPaused && !isLoading;

  // Check if investigation can be stopped
  const canStop = (isRunning || isPaused) && !isLoading;

  // Start investigation
  const startInvestigation = useCallback(async () => {
    if (!canStart) return;

    try {
      setIsRunning(true);
      setIsPaused(false);
      setCurrentStepIndex(0);

      const startTime = new Date();
      onInvestigationUpdate({
        status: 'running',
        startedAt: startTime.toISOString(),
        progress: 0
      });

      onLogAdd('Investigation started', LogLevel.INFO);
      toast.success('Investigation started');

      // Find first non-completed step
      const firstPendingIndex = steps.findIndex(step => step.status !== StepStatus.COMPLETED);
      if (firstPendingIndex >= 0) {
        setCurrentStepIndex(firstPendingIndex);
        await executeStep(firstPendingIndex);
      }
    } catch (error) {
      console.error('Failed to start investigation:', error);
      setIsRunning(false);
      onLogAdd(`Failed to start investigation: ${error}`, LogLevel.ERROR);
      toast.error('Failed to start investigation');
    }
  }, [canStart, steps, onInvestigationUpdate, onLogAdd]);

  // Pause investigation
  const pauseInvestigation = useCallback(() => {
    if (!canPause) return;

    setIsPaused(true);
    onInvestigationUpdate({ status: 'paused' });
    onLogAdd('Investigation paused', LogLevel.INFO);
    toast.info('Investigation paused');
  }, [canPause, onInvestigationUpdate, onLogAdd]);

  // Resume investigation
  const resumeInvestigation = useCallback(async () => {
    if (!canResume) return;

    setIsPaused(false);
    onInvestigationUpdate({ status: 'running' });
    onLogAdd('Investigation resumed', LogLevel.INFO);
    toast.info('Investigation resumed');

    // Continue with current step
    if (currentStep && currentStep.status === StepStatus.IN_PROGRESS) {
      await executeStep(currentStepIndex);
    }
  }, [canResume, currentStep, currentStepIndex, onInvestigationUpdate, onLogAdd]);

  // Stop investigation
  const stopInvestigation = useCallback(() => {
    if (!canStop) return;

    setIsRunning(false);
    setIsPaused(false);

    const endTime = new Date();
    onInvestigationUpdate({
      status: 'stopped',
      completedAt: endTime.toISOString()
    });

    // Mark current step as cancelled if in progress
    if (currentStep && currentStep.status === StepStatus.IN_PROGRESS) {
      const updatedSteps = steps.map((step, index) =>
        index === currentStepIndex
          ? { ...step, status: StepStatus.FAILED, error: 'Investigation stopped by user' }
          : step
      );
      onStepsUpdate(updatedSteps);
    }

    onLogAdd('Investigation stopped', LogLevel.WARNING);
    toast.warning('Investigation stopped');
  }, [canStop, currentStep, currentStepIndex, steps, onInvestigationUpdate, onStepsUpdate, onLogAdd]);

  // Execute a specific step
  const executeStep = useCallback(async (stepIndex: number) => {
    const step = steps[stepIndex];
    if (!step || isPaused) return;

    try {
      // Mark step as in progress
      const startTime = new Date();
      setStepStartTimes(prev => ({ ...prev, [step.id]: startTime }));

      const updatedSteps = steps.map((s, index) =>
        index === stepIndex
          ? { ...s, status: StepStatus.IN_PROGRESS, startedAt: startTime.toISOString() }
          : s
      );
      onStepsUpdate(updatedSteps);

      onLogAdd(`Starting ${step.title}...`, LogLevel.INFO);

      // Execute step based on type
      let result;
      switch (step.agent) {
        case 'Device Analysis Agent':
          result = await executeDeviceAnalysis(step);
          break;
        case 'Location Analysis Agent':
          result = await executeLocationAnalysis(step);
          break;
        case 'Network Analysis Agent':
          result = await executeNetworkAnalysis(step);
          break;
        case 'Logs Analysis Agent':
          result = await executeLogsAnalysis(step);
          break;
        case 'Risk Assessment Agent':
          result = await executeRiskAssessment(step);
          break;
        default:
          throw new Error(`Unknown agent type: ${step.agent}`);
      }

      if (isPaused) return; // Exit if paused during execution

      // Mark step as completed
      const endTime = new Date();
      setStepEndTimes(prev => ({ ...prev, [step.id]: endTime }));

      const completedSteps = steps.map((s, index) =>
        index === stepIndex
          ? {
              ...s,
              status: StepStatus.COMPLETED,
              completedAt: endTime.toISOString(),
              details: result,
              duration: startTime ? endTime.getTime() - startTime.getTime() : 0
            }
          : s
      );
      onStepsUpdate(completedSteps);

      onLogAdd(`${step.title} completed successfully`, LogLevel.SUCCESS);

      // Move to next step
      const nextStepIndex = stepIndex + 1;
      if (nextStepIndex < steps.length && !isPaused) {
        setCurrentStepIndex(nextStepIndex);
        // Small delay before next step
        setTimeout(() => {
          if (!isPaused) {
            executeStep(nextStepIndex);
          }
        }, 1000);
      } else if (nextStepIndex >= steps.length) {
        // Investigation completed
        completeInvestigation();
      }

    } catch (error) {
      if (isPaused) return;

      console.error(`Step ${step.title} failed:`, error);

      // Mark step as failed
      const failedSteps = steps.map((s, index) =>
        index === stepIndex
          ? {
              ...s,
              status: StepStatus.FAILED,
              error: error instanceof Error ? error.message : 'Unknown error',
              completedAt: new Date().toISOString()
            }
          : s
      );
      onStepsUpdate(failedSteps);

      onLogAdd(`${step.title} failed: ${error}`, LogLevel.ERROR);
      setIsRunning(false);
      toast.error(`Step failed: ${step.title}`);
    }
  }, [steps, isPaused, onStepsUpdate, onLogAdd]);

  // Step execution methods
  const executeDeviceAnalysis = async (step: InvestigationStep) => {
    const result = await olorinService.analyzeDevice({
      device_id: investigation.entityId,
      time_range: investigation.timeRange || '24h'
    });
    return result;
  };

  const executeLocationAnalysis = async (step: InvestigationStep) => {
    const result = await olorinService.analyzeLocation({
      user_id: investigation.entityId,
      time_range: investigation.timeRange || '24h'
    });
    return result;
  };

  const executeNetworkAnalysis = async (step: InvestigationStep) => {
    const result = await olorinService.analyzeNetwork({
      entity_id: investigation.entityId,
      entity_type: investigation.entityType,
      time_range: investigation.timeRange || '24h'
    });
    return result;
  };

  const executeLogsAnalysis = async (step: InvestigationStep) => {
    const result = await olorinService.analyzeLogs({
      entity_id: investigation.entityId,
      entity_type: investigation.entityType,
      time_range: investigation.timeRange || '24h'
    });
    return result;
  };

  const executeRiskAssessment = async (step: InvestigationStep) => {
    const result = await olorinService.assessRisk({
      entity_id: investigation.entityId,
      entity_type: investigation.entityType,
      time_range: investigation.timeRange || '24h'
    });
    return result;
  };

  // Complete investigation
  const completeInvestigation = useCallback(() => {
    const endTime = new Date();
    setIsRunning(false);
    setIsPaused(false);

    onInvestigationUpdate({
      status: 'completed',
      completedAt: endTime.toISOString(),
      progress: 100
    });

    onLogAdd('Investigation completed successfully', LogLevel.SUCCESS);
    toast.success('Investigation completed!');
  }, [onInvestigationUpdate, onLogAdd]);

  // Update progress when steps change
  useEffect(() => {
    const newProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
    onInvestigationUpdate({ progress: newProgress });
  }, [completedSteps, totalSteps, onInvestigationUpdate]);

  const getStepIcon = (step: InvestigationStep, index: number) => {
    if (step.status === StepStatus.COMPLETED) {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    } else if (step.status === StepStatus.IN_PROGRESS) {
      return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
    } else if (step.status === StepStatus.FAILED) {
      return <AlertTriangle className="w-5 h-5 text-red-600" />;
    } else if (index === currentStepIndex && isRunning && !isPaused) {
      return <Clock className="w-5 h-5 text-yellow-600" />;
    } else {
      return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStepStatusColor = (step: InvestigationStep, index: number) => {
    if (step.status === StepStatus.COMPLETED) return 'border-green-500 bg-green-50';
    if (step.status === StepStatus.IN_PROGRESS) return 'border-blue-500 bg-blue-50';
    if (step.status === StepStatus.FAILED) return 'border-red-500 bg-red-50';
    if (index === currentStepIndex && isRunning) return 'border-yellow-500 bg-yellow-50';
    return 'border-gray-200 bg-gray-50';
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Investigation Workflow
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Execute investigation steps sequentially
            </p>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center space-x-2">
            {canStart && (
              <button
                onClick={startInvestigation}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <Play className="w-4 h-4" />
                <span>Start</span>
              </button>
            )}

            {canPause && (
              <button
                onClick={pauseInvestigation}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center space-x-2"
              >
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </button>
            )}

            {canResume && (
              <button
                onClick={resumeInvestigation}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Play className="w-4 h-4" />
                <span>Resume</span>
              </button>
            )}

            {canStop && (
              <button
                onClick={stopInvestigation}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
              >
                <Square className="w-4 h-4" />
                <span>Stop</span>
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
            <span>Progress: {completedSteps} of {totalSteps} steps</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Steps List */}
      <div className="p-6">
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`
                p-4 rounded-lg border-2 transition-all duration-200
                ${getStepStatusColor(step, index)}
                ${index === currentStepIndex && isRunning ? 'ring-2 ring-blue-500/20' : ''}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStepIcon(step, index)}
                  <div>
                    <h4 className="font-medium text-gray-900">{step.title}</h4>
                    <p className="text-sm text-gray-600">{step.description}</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900 capitalize">
                    {step.status.replace('_', ' ')}
                  </div>
                  {step.duration && (
                    <div className="text-xs text-gray-500">
                      {(step.duration / 1000).toFixed(1)}s
                    </div>
                  )}
                </div>
              </div>

              {/* Error Display */}
              {step.status === StepStatus.FAILED && step.error && (
                <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-700">
                  <strong>Error:</strong> {step.error}
                </div>
              )}

              {/* Step Details */}
              {step.details && step.status === StepStatus.COMPLETED && (
                <div className="mt-2 p-2 bg-gray-100 border border-gray-200 rounded text-sm text-gray-700">
                  <strong>Results:</strong> {JSON.stringify(step.details, null, 2)}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {steps.length === 0 && (
          <div className="text-center py-12">
            <Settings className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No steps configured</h3>
            <p className="text-gray-500">
              Configure investigation steps to begin the workflow.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvestigationRunner;