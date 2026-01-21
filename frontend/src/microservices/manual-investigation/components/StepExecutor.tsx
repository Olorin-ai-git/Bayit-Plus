import React, { useState, useEffect } from 'react';
import { Step, Agent, ExecuteStepRequest } from '../types';
import { useServices } from '../services';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import ErrorAlert from '../../../shared/components/ErrorAlert';
import { StepStatusBadge } from './StepStatusBadge';

interface StepExecutorProps {
  step: Step;
  onStepUpdate?: (step: Step) => void;
  onExecutionComplete?: (step: Step) => void;
  className?: string;
}

export const StepExecutor: React.FC<StepExecutorProps> = ({
  step,
  onStepUpdate,
  onExecutionComplete,
  className = ''
}) => {
  const { websocket: webSocketService } = useServices();
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [currentProgress, setCurrentProgress] = useState(step.progress_percentage || 0);

  useEffect(() => {
    // Subscribe to step execution updates via WebSocket
    const subscriptionId = webSocketService.subscribe(
      'step.progress',
      (event) => {
        if (event.data.step_id === step.id) {
          setCurrentProgress(event.data.progress_percentage);
          if (event.data.log_message) {
            setExecutionLog(prev => [...prev, event.data.log_message]);
          }
        }
      },
      {
        filter: (event) => event.data.step_id === step.id,
        investigation_id: step.investigation_id
      }
    );

    const completionSubscriptionId = webSocketService.subscribe(
      'step.completed',
      (event) => {
        if (event.data.step_id === step.id) {
          setExecuting(false);
          setCurrentProgress(100);
          onExecutionComplete?.(event.data.step);
        }
      },
      {
        filter: (event) => event.data.step_id === step.id,
        investigation_id: step.investigation_id
      }
    );

    const errorSubscriptionId = webSocketService.subscribe(
      'step.failed',
      (event) => {
        if (event.data.step_id === step.id) {
          setExecuting(false);
          setError(event.data.error_message);
        }
      },
      {
        filter: (event) => event.data.step_id === step.id,
        investigation_id: step.investigation_id
      }
    );

    return () => {
      webSocketService.unsubscribe(subscriptionId);
      webSocketService.unsubscribe(completionSubscriptionId);
      webSocketService.unsubscribe(errorSubscriptionId);
    };
  }, [step.id, step.investigation_id, webSocketService, onExecutionComplete]);

  const handleExecute = async (overrideInputs?: Record<string, any>) => {
    try {
      setExecuting(true);
      setError(null);
      setExecutionLog([]);
      setCurrentProgress(0);

      const executeRequest: ExecuteStepRequest = {
        override_inputs: overrideInputs,
        priority: 'normal'
      };

      // Execute step via API
      const response = await fetch(`/api/steps/${step.id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(executeRequest)
      });

      if (!response.ok) {
        throw new Error(`Failed to execute step: ${response.statusText}`);
      }

      const updatedStep = await response.json();
      onStepUpdate?.(updatedStep);

    } catch (err) {
      setExecuting(false);
      setError(err instanceof Error ? err.message : 'Failed to execute step');
    }
  };

  const handleRetry = () => {
    handleExecute();
  };

  const canExecute = () => {
    return step.status === 'ready' || step.status === 'failed';
  };

  const getStatusIcon = () => {
    switch (step.status) {
      case 'completed':
        return (
          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'running':
        return <LoadingSpinner size="sm" />;
      default:
        return (
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Step Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <h3 className="text-lg font-medium text-gray-900">{step.name}</h3>
              <p className="text-sm text-gray-500">{step.description}</p>
            </div>
            <StepStatusBadge status={step.status} />
          </div>

          {canExecute() && !executing && (
            <button
              onClick={() => handleExecute()}
              className="inline-flex items-center px-4 py-2 border border-transparent
                       text-sm font-medium rounded-md text-white bg-blue-600
                       hover:bg-blue-700 focus:outline-none focus:ring-2
                       focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="-ml-1 mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
              {step.status === 'failed' ? 'Retry' : 'Execute'}
            </button>
          )}

          {step.status === 'failed' && (
            <button
              onClick={handleRetry}
              className="inline-flex items-center px-4 py-2 border border-gray-300
                       text-sm font-medium rounded-md text-gray-700 bg-white
                       hover:bg-gray-50 focus:outline-none focus:ring-2
                       focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="-ml-1 mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                  clipRule="evenodd"
                />
              </svg>
              Retry
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {(executing || step.status === 'running') && (
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700">Execution Progress</span>
            <span className="text-gray-900 font-medium">{currentProgress}%</span>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${currentProgress}%` }}
            />
          </div>
          {step.current_operation && (
            <p className="mt-2 text-sm text-gray-600">{step.current_operation}</p>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="px-6 py-3 border-b border-gray-200">
          <ErrorAlert message={error} />
        </div>
      )}

      {/* Step Details */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Agent Information */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Agent Information</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Agent:</span>
                <span className="text-gray-900">{step.agent.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Type:</span>
                <span className="text-gray-900">{step.agent.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  step.agent.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {step.agent.status}
                </span>
              </div>
            </div>
          </div>

          {/* Execution Details */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Execution Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Order:</span>
                <span className="text-gray-900">#{step.order_index + 1}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Retry Count:</span>
                <span className="text-gray-900">{step.retry_count}/{step.max_retries}</span>
              </div>
              {step.execution_time && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Duration:</span>
                  <span className="text-gray-900">{Math.round(step.execution_time / 1000)}s</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Execution Log */}
      {executionLog.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Execution Log</h4>
          <div className="max-h-40 overflow-y-auto">
            <div className="space-y-1">
              {executionLog.map((logEntry, index) => (
                <div key={index} className="text-sm font-mono text-gray-700 bg-white px-3 py-1 rounded border">
                  {logEntry}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step Outputs (if completed) */}
      {step.status === 'completed' && Object.keys(step.outputs).length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Outputs</h4>
          <div className="bg-gray-50 rounded-md p-3">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap">
              {JSON.stringify(step.outputs, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};