// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable require-jsdoc */
import React, { useState } from 'react';
import { FaExternalLinkAlt } from 'react-icons/fa';
import {
  InvestigationStep,
  StepStatus,
  InvestigationStepId,
} from '../types/RiskAssessment';
import { formatTimestamp } from '../utils/investigation';
import LocationMap from './LocationMap';
import AgentDetailsTable from './AgentDetailsTable';
import Stopwatch from './Stopwatch';

interface Props {
  step: InvestigationStep;
  isActive: boolean;
  startTime?: Date | null;
  endTime?: Date | null;
  onShowDetailsModal?: (step: InvestigationStep) => void;
}

// Helper to safely encode Unicode strings for btoa
function btoaUnicode(str: string) {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16)),
    ),
  );
}

const InvestigationStepComponent: React.FC<Props> = ({
  step,
  isActive,
  startTime = null,
  endTime = null,
  onShowDetailsModal = undefined,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const canShowDetails =
    step.details &&
    Object.keys(step.details).length > 0 &&
    (step.status === StepStatus.COMPLETED ||
      step.status === StepStatus.IN_PROGRESS);

  const handleToggle = () => {
    if (canShowDetails) {
      setShowDetails(!showDetails);
    }
  };

  const renderNestedObject = (data: any, level = 0) => {
    if (typeof data !== 'object' || data === null) {
      return <span>{String(data)}</span>;
    }

    if (Array.isArray(data)) {
      return (
        <ul className="list-disc pl-4">
          {data.map((item, index) => {
            // Create a more reliable key using the item's content and index
            const itemKey =
              typeof item === 'object'
                ? JSON.stringify(Object.values(item)).slice(0, 100)
                : String(item);
            const hash = btoaUnicode(itemKey).slice(0, 8);
            return (
              <li
                key={`${step.id}-item-${hash}-${JSON.stringify(item)}-${index}`}
              >
                {renderNestedObject(item)}
              </li>
            );
          })}
        </ul>
      );
    }

    // For Location step, exclude mapData from the nested object view
    let displayData = data;
    if (step.id === InvestigationStepId.LOCATION && level === 0) {
      const { mapData, ...rest } = data;
      displayData = rest;
    }

    return (
      <div className={`pl-${level * 4}`}>
        {Object.entries(displayData).map(([key, value], index) => (
          <div key={`${step.id}-${key}-${index}`} className="mb-2">
            <span className="font-semibold">{key}: </span>
            {renderNestedObject(value, level + 1)}
          </div>
        ))}
      </div>
    );
  };

  const renderDetails = () => {
    if (!step.details) return null;

    // Special handling for Location step with map
    if (step.id === InvestigationStepId.LOCATION && step.details.mapData) {
      return (
        <div
          className={`mt-4 overflow-hidden transition-[max-height] duration-300 ease-in-out ${
            showDetails ? 'max-h-[1000px]' : 'max-h-0'
          }`}
        >
          <div
            className={`transform transition-all duration-300 ease-in-out ${
              showDetails
                ? 'translate-y-0 opacity-100'
                : 'translate-y-[-20px] opacity-0'
            }`}
          >
            <div className="p-4 bg-gray-50 rounded-lg">
              <LocationMap locations={step.details.mapData} />
              <div className="mt-4 max-h-[300px] overflow-auto">
                {renderNestedObject(step.details)}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className={`mt-4 overflow-hidden transition-[max-height] duration-300 ease-in-out ${
          showDetails ? 'max-h-[1000px]' : 'max-h-0'
        }`}
      >
        <div
          className={`transform transition-all duration-300 ease-in-out ${
            showDetails
              ? 'translate-y-0 opacity-100'
              : 'translate-y-[-20px] opacity-0'
          }`}
        >
          <div className="p-4 bg-gray-50 rounded-lg max-h-[300px] overflow-auto">
            {/* Show the table first */}
            <div className="mb-4">
              <AgentDetailsTable
                details={step.details}
                agentType={step.agent}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Returns the appropriate color class based on step status
   * @param {StepStatus} status - The step status
   * @returns {string} The color class
   */
  const getStatusColor = (status: StepStatus): string => {
    switch (status) {
      case StepStatus.COMPLETED:
        return 'bg-green-500';
      case StepStatus.FAILED:
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div
      className={`p-4 m-2 rounded-lg border-2 transition-all duration-[2000ms] ease-in-out ${
        isActive
          ? 'border-blue-500 bg-blue-50 shadow-lg'
          : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div
            className={`w-3 h-3 rounded-full ${
              isActive
                ? 'animate-pulse bg-yellow-500'
                : getStatusColor(step.status)
            }`}
          />
          <div>
            <h3 className="text-lg font-semibold">{step.title}</h3>
            <p className="text-sm text-gray-500">
              {step.details?.risk_assessment?.timestamp
                ? formatTimestamp(step.details.risk_assessment.timestamp)
                : step.timestamp
                ? formatTimestamp(step.timestamp)
                : 'No timestamp available'}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggle}
              className={`text-sm ${
                canShowDetails
                  ? 'text-blue-600 hover:text-blue-800'
                  : 'text-gray-400 cursor-not-allowed'
              }`}
              disabled={!canShowDetails}
              title={showDetails ? 'Hide details' : 'Show details'}
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
            {canShowDetails && onShowDetailsModal && (
              <button
                type="button"
                className="p-1 text-gray-500 hover:text-blue-600 focus:outline-none"
                title="Show complete agent details in modal"
                onClick={() => onShowDetailsModal(step)}
              >
                {React.createElement(
                  FaExternalLinkAlt as unknown as React.ElementType,
                  { size: 16 },
                )}
              </button>
            )}
          </div>
          {startTime && (
            <Stopwatch
              startTime={startTime}
              endTime={endTime}
              label={`${step.title} Time`}
            />
          )}
        </div>
      </div>
      {/* Only render details if allowed */}
      {canShowDetails && renderDetails()}
    </div>
  );
};

export default InvestigationStepComponent;
