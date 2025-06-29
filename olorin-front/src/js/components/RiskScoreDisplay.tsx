import React, { useState } from 'react';
import {
  InvestigationStep,
  InvestigationStepId,
  StepStatus,
} from '../types/RiskAssessment';
import OverallRiskScore from './OverallRiskScore';
import { AGENT_COLORS, DEFAULT_AGENT_COLOR } from '../constants/definitions';

/**
 * Component to display individual agent risk scores and overall risk score in an org chart layout
 * @param {Object} props - Component props
 * @param {InvestigationStep[]} props.steps - Array of steps with their status and risk scores
 * @param {boolean} props.useMock - Whether to use mock data
 * @returns {JSX.Element} The rendered risk score display component
 */
const RiskScoreDisplay: React.FC<{
  steps: InvestigationStep[];
  useMock?: boolean;
}> = ({ steps, useMock = false }) => {
  // Modal state for agent/overall thoughts
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<{
    agent: string;
    thoughts: string;
  } | null>(null);

  // Calculate individual agent scores only in demo mode
  const agentScores = steps
    .filter(
      (step) =>
        step.id !== InvestigationStepId.INIT &&
        step.id !== InvestigationStepId.RISK,
    )
    .filter(
      (step) =>
        step.status === StepStatus.COMPLETED &&
        step.details?.risk_assessment?.risk_level !== undefined,
    )
    .map((step) => ({
      agent: step.agent,
      score: step.details?.risk_assessment?.risk_level || 0,
      color: AGENT_COLORS[step.agent] || DEFAULT_AGENT_COLOR,
      thoughts:
        step.details?.risk_assessment?.thoughts || step.details?.thoughts || '',
    }));
  /**
   * Calculates the average risk score from all agent scores.
   * @returns {number} The average agent risk score, or 0 if no agents.
   */
  const getAverageAgentScore = () =>
    agentScores.length > 0
      ? agentScores.reduce((sum, agent) => sum + agent.score, 0) /
        agentScores.length
      : 0;

  let overallScore = getAverageAgentScore();
  const riskStep = steps.find(
    (step) =>
      step.id === InvestigationStepId.RISK &&
      step.status === StepStatus.COMPLETED,
  );

  if (
    !useMock &&
    riskStep?.details?.overallRiskScore !== undefined &&
    riskStep?.details?.overallRiskScore !== null
  ) {
    overallScore = riskStep.details.overallRiskScore;
  }

  // Find the RISK step for overall thoughts
  const riskThoughts = useMock
    ? riskStep?.details?.thoughts || ''
    : riskStep?.details?.accumulatedLLMThoughts || '';

  /**
   * Handles clicking on an agent card to show thoughts modal.
   * @param {string} agent - The agent name
   * @param {string} thoughts - The agent's thoughts
   */
  const handleCardClick = (agent: string, thoughts: string) => {
    setModalContent({ agent, thoughts });
    setModalOpen(true);
  };
  /**
   * Handles clicking on the overall card to show risk thoughts modal.
   */
  const handleOverallCardClick = () => {
    if (riskThoughts) {
      setModalContent({
        agent: 'Risk Assessment Agent',
        thoughts: riskThoughts,
      });
      setModalOpen(true);
    }
  };
  /**
   * Closes the modal dialog.
   */
  const closeModal = () => {
    setModalOpen(false);
    setModalContent(null);
  };

  /**
   * Parses and formats agent thoughts for display in the modal.
   * @param {string} thoughts The raw thoughts string
   * @returns {React.ReactNode} JSX with formatted thoughts
   */
  function parseThoughts(thoughts: string): React.ReactNode {
    if (!thoughts) return <span>No thoughts available.</span>;

    // Split into lines and process
    const lines = thoughts.split(/\r?\n/).filter((line) => line.trim() !== '');
    const elements: React.ReactNode[] = [];
    let currentList: string[] = [];
    let currentLabel: string | null = null;

    /**
     * Flushes the current list of items as a <ul>.
     * @returns {void}
     */
    const flushList = (): void => {
      if (currentList.length > 0) {
        elements.push(
          <ul className="list-disc pl-6" key={`list-${elements.length}`}>
            {currentList.map((item) => (
              <li
                key={btoa(
                  encodeURIComponent((currentLabel || '') + item),
                ).slice(0, 12)}
                className="mb-1"
              >
                {highlightTimestamps(item)}
              </li>
            ))}
          </ul>,
        );
        currentList = [];
      }
    };

    /**
     * Highlights ISO timestamps in the text.
     * @param {string} text The text to highlight
     * @returns {string} HTML string with highlighted timestamps
     */
    function highlightTimestamps(text: string): string {
      // Match ISO timestamps and wrap in <span>
      return text.replace(
        /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)/g,
        (match) => `<span class='font-bold text-blue-700'>${match}</span>`,
      );
    }

    lines.forEach((line) => {
      // Label: value
      const labelMatch = line.match(/^(.*?):\s*(.*)$/);
      if (labelMatch) {
        flushList();
        const label = labelMatch[1].trim();
        const value = labelMatch[2].trim();
        currentLabel = label;
        // If value is empty, next lines are list items
        if (value === '') {
          elements.push(
            <div key={`label-${label}`} className="mt-2 mb-1">
              <span className="font-bold">{label}:</span>
            </div>,
          );
        } else if (value.includes('\n')) {
          // If value looks like a list, split
          const items = value
            .split(/\n/)
            .map((v) => v.trim())
            .filter(Boolean);
          elements.push(
            <div key={`label-list-${label}`} className="mt-2 mb-1">
              <span className="font-bold">{label}:</span>
            </div>,
          );
          currentList = [...items];
          flushList();
        } else {
          // Single value
          elements.push(
            <div
              key={`label-value-${label}-${btoa(
                encodeURIComponent(value),
              ).slice(0, 12)}`}
              className="mb-1"
            >
              <span className="font-bold">{label}:</span>{' '}
              <span
                dangerouslySetInnerHTML={{ __html: highlightTimestamps(value) }}
              />
            </div>,
          );
        }
      } else if (
        currentLabel &&
        (line.startsWith('- ') || line.match(/^\s{2,}/))
      ) {
        // List item (starts with dash or is indented)
        currentList.push(line.replace(/^[-\s]+/, ''));
      } else {
        // Paragraph or summary
        flushList();
        elements.push(
          <div
            key={`summary-${btoa(encodeURIComponent(line)).slice(0, 12)}`}
            className="mb-1"
          >
            <span
              dangerouslySetInnerHTML={{ __html: highlightTimestamps(line) }}
            />
          </div>,
        );
      }
    });
    flushList();
    return <div>{elements}</div>;
  }

  return (
    <div className="flex flex-col items-center mb-8 mx-auto">
      {/* Modal for agent/overall thoughts - move to top for proper overlay */}
      {modalOpen && modalContent && (
        <>
          <style>{`
                        .modal-overlay {
                            position: fixed;
                            top: 0; left: 0; right: 0; bottom: 0;
                            background: rgba(0,0,0,0.4);
                            z-index: 1000;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        }
                        .modal-content {
                            background: #fff;
                            border-radius: 8px;
                            padding: 2rem;
                            width: 600px;
                            height: 500px;
                            max-width: 95vw;
                            max-height: 95vh;
                            overflow-y: auto;
                            box-shadow: 0 2px 24px rgba(0,0,0,0.2);
                        }
                    `}</style>
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-2">
                {modalContent.agent} Thoughts
              </h3>
              <div className="text-gray-800 whitespace-pre-line">
                {parseThoughts(modalContent.thoughts)}
              </div>
              <div className="flex justify-center mt-8">
                <button
                  type="button"
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={closeModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      <style>
        {`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .fade-in-card {
                    opacity: 0;
                    animation: fadeIn 0.7s forwards;
                }
                `}
      </style>
      {/* Modal for agent/overall thoughts */}
      {modalOpen && modalContent && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">
              {modalContent.agent} Thoughts
            </h3>
            <div className="text-gray-800 whitespace-pre-line">
              {parseThoughts(modalContent.thoughts)}
            </div>
            <div className="flex justify-center mt-8">
              <button
                type="button"
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={closeModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Overall Risk Score (Top of org chart) */}
      <div className="flex justify-center">
        <div
          className="transition-shadow fade-in-card"
          style={{ display: 'inline-block' }}
        >
          <div
            className={`hover:shadow-lg ${
              riskThoughts ? 'cursor-pointer' : ''
            }`}
            style={{ borderRadius: '0.5rem' }}
            onClick={riskThoughts ? handleOverallCardClick : undefined}
            title={
              riskThoughts ? 'Click to view Risk Assessment Agent thoughts' : ''
            }
          >
            <OverallRiskScore score={overallScore} />
          </div>
        </div>
      </div>

      {/* Agent Scores (Bottom of org chart) */}
      <div className="flex justify-center gap-8 relative">
        {/* Agent score cards */}
        {agentScores.map(({ agent, score, color, thoughts }, idx) => (
          <div key={agent} className="relative">
            {/* Vertical connector line */}
            <div
              className={`bg-white rounded-lg shadow-md p-4 w-48 fade-in-card ${
                thoughts ? 'cursor-pointer hover:shadow-lg' : ''
              }`}
              style={{ animationDelay: `${idx * 0.15}s` }}
              onClick={
                thoughts ? () => handleCardClick(agent, thoughts) : undefined
              }
              title={thoughts ? 'Click to view agent thoughts' : ''}
            >
              <div className="flex flex-col items-center">
                <span className={`font-medium text-sm mb-2 ${color}`}>
                  {agent}
                </span>
                <span className={`text-2xl font-semibold ${color}`}>
                  {score.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

RiskScoreDisplay.defaultProps = {
  useMock: false,
};

export default RiskScoreDisplay;
