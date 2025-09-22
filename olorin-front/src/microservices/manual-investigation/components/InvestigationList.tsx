import React, { useState } from 'react';
import { Investigation } from '../types';
import { useServices } from '../services';
import { InvestigationStatusBadge } from './InvestigationStatusBadge';
import { InvestigationPriorityBadge } from './InvestigationPriorityBadge';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';

interface InvestigationListProps {
  investigations: Investigation[];
  onInvestigationUpdate?: (investigation: Investigation) => void;
  onInvestigationSelect?: (investigation: Investigation) => void;
  compact?: boolean;
  showActions?: boolean;
  className?: string;
}

export const InvestigationList: React.FC<InvestigationListProps> = ({
  investigations,
  onInvestigationUpdate,
  onInvestigationSelect,
  compact = false,
  showActions = true,
  className = ''
}) => {
  const { investigation: investigationService } = useServices();
  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set());

  const handleAction = async (investigationId: string, action: string) => {
    try {
      setLoadingActions(prev => new Set(prev).add(investigationId));

      let updatedInvestigation: Investigation;

      switch (action) {
        case 'start':
          updatedInvestigation = await investigationService.start(investigationId);
          break;
        case 'pause':
          updatedInvestigation = await investigationService.pause(investigationId);
          break;
        case 'resume':
          updatedInvestigation = await investigationService.resume(investigationId);
          break;
        case 'cancel':
          updatedInvestigation = await investigationService.cancel(investigationId);
          break;
        default:
          return;
      }

      onInvestigationUpdate?.(updatedInvestigation);
    } catch (error) {
      console.error(`Failed to ${action} investigation:`, error);
    } finally {
      setLoadingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(investigationId);
        return newSet;
      });
    }
  };

  const getActionButtons = (investigation: Investigation) => {
    const isLoading = loadingActions.has(investigation.id);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center w-20">
          <LoadingSpinner size="sm" />
        </div>
      );
    }

    switch (investigation.status) {
      case 'draft':
        return (
          <button
            onClick={() => handleAction(investigation.id, 'start')}
            className="inline-flex items-center px-2.5 py-1.5 border border-transparent
                     text-xs font-medium rounded text-white bg-green-600
                     hover:bg-green-700 focus:outline-none focus:ring-2
                     focus:ring-offset-2 focus:ring-green-500 transition-colors"
          >
            Start
          </button>
        );

      case 'running':
        return (
          <div className="flex space-x-1">
            <button
              onClick={() => handleAction(investigation.id, 'pause')}
              className="inline-flex items-center px-2.5 py-1.5 border border-transparent
                       text-xs font-medium rounded text-white bg-yellow-600
                       hover:bg-yellow-700 focus:outline-none focus:ring-2
                       focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
            >
              Pause
            </button>
            <button
              onClick={() => handleAction(investigation.id, 'cancel')}
              className="inline-flex items-center px-2.5 py-1.5 border border-transparent
                       text-xs font-medium rounded text-white bg-red-600
                       hover:bg-red-700 focus:outline-none focus:ring-2
                       focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        );

      case 'paused':
        return (
          <div className="flex space-x-1">
            <button
              onClick={() => handleAction(investigation.id, 'resume')}
              className="inline-flex items-center px-2.5 py-1.5 border border-transparent
                       text-xs font-medium rounded text-white bg-blue-600
                       hover:bg-blue-700 focus:outline-none focus:ring-2
                       focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Resume
            </button>
            <button
              onClick={() => handleAction(investigation.id, 'cancel')}
              className="inline-flex items-center px-2.5 py-1.5 border border-transparent
                       text-xs font-medium rounded text-white bg-red-600
                       hover:bg-red-700 focus:outline-none focus:ring-2
                       focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getProgressPercentage = (investigation: Investigation) => {
    if (investigation.steps.length === 0) return 0;
    const completedSteps = investigation.steps.filter(step => step.status === 'completed').length;
    return Math.round((completedSteps / investigation.steps.length) * 100);
  };

  if (investigations.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No investigations</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating a new investigation.
        </p>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="divide-y divide-gray-200">
        {investigations.map((investigation) => (
          <div
            key={investigation.id}
            className={`p-6 hover:bg-gray-50 transition-colors ${
              onInvestigationSelect ? 'cursor-pointer' : ''
            }`}
            onClick={() => onInvestigationSelect?.(investigation)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {investigation.name}
                  </h3>
                  <InvestigationStatusBadge status={investigation.status} />
                  <InvestigationPriorityBadge priority={investigation.priority} />
                </div>

                {!compact && (
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                    {investigation.description}
                  </p>
                )}

                <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <svg className="mr-1.5 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Entity: {investigation.entity_type} • {investigation.entity_id}
                  </div>

                  <div className="flex items-center">
                    <svg className="mr-1.5 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {formatDate(investigation.updated_at)}
                  </div>

                  {investigation.steps.length > 0 && (
                    <div className="flex items-center">
                      <svg className="mr-1.5 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {investigation.steps.length} steps • {getProgressPercentage(investigation)}% complete
                    </div>
                  )}
                </div>

                {!compact && investigation.steps.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Progress</span>
                      <span className="text-gray-900 font-medium">
                        {getProgressPercentage(investigation)}%
                      </span>
                    </div>
                    <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getProgressPercentage(investigation)}%` }}
                      />
                    </div>
                  </div>
                )}

                {investigation.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {investigation.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs
                                 font-medium bg-gray-100 text-gray-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {showActions && (
                <div className="flex-shrink-0 ml-4">
                  {getActionButtons(investigation)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};