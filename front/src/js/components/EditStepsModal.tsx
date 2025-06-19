import React, { useState } from 'react';
import {
  InvestigationStep,
  InvestigationStepId,
} from '../types/RiskAssessment';
// Tools available per agent
const TOOLS = ['Splunk', 'OII', 'CHRONOS', 'NELI', 'DI BB', 'DATA LAKE'];

// eslint-disable-next-line no-unused-vars
interface EditStepsModalProps {
  isOpen: boolean;
  onClose: () => void;
  allSteps: InvestigationStep[];
  selectedSteps: InvestigationStep[];
  // eslint-disable-next-line no-unused-vars
  /** Callback invoked on OK; returns selected steps and per-agent tools mapping */
  onSave: (
    selected: InvestigationStep[],
    toolsMapping: Record<string, string[]>,
  ) => void;
}

/**
 * Modal component for editing and reordering investigation steps
 * @param {EditStepsModalProps} props - The component props
 * @returns {JSX.Element} The edit steps modal component
 */
const EditStepsModal: React.FC<EditStepsModalProps> = ({
  isOpen,
  onClose,
  allSteps,
  selectedSteps,
  onSave,
}) => {
  const initialSelected = selectedSteps.length > 0 ? selectedSteps : allSteps;
  const initialAvailable = allSteps.filter(
    (s) => !initialSelected.some((sel) => sel.id === s.id),
  );
  const [available, setAvailable] =
    useState<InvestigationStep[]>(initialAvailable);
  const [selected, setSelected] =
    useState<InvestigationStep[]>(initialSelected);
  const [toolsByAgent, setToolsByAgent] = useState<Record<string, string[]>>(
    () =>
      initialSelected.reduce(
        (acc, step) => ({ ...acc, [step.agent]: step.tools || [] }),
        {} as Record<string, string[]>,
      ),
  );
  const [focusedAgent, setFocusedAgent] = useState<string | null>(null);

  /**
   * Moves a step from available to selected list
   * @param {InvestigationStep} step - The step to move
   */
  const moveToSelected = (step: InvestigationStep) => {
    setAvailable((avail) => avail.filter((s) => s.id !== step.id));
    setSelected((prev) => [...prev, step]);
    setToolsByAgent((prev) => ({ ...prev, [step.agent]: step.tools || [] }));
  };

  /**
   * Moves a step from selected to available list
   * @param {InvestigationStep} step - The step to move
   */
  const moveToAvailable = (step: InvestigationStep) => {
    setAvailable((avail) => [...avail, step]);
    setSelected((prev) => prev.filter((s) => s.id !== step.id));
    setToolsByAgent((prev) => {
      const next = { ...prev };
      delete next[step.agent];
      return next;
    });
    if (focusedAgent === step.agent) setFocusedAgent(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-3xl relative">
        <button
          type="button"
          className="absolute top-2 right-2 text-gray-500"
          onClick={onClose}
        >
          ✕
        </button>
        <h2 className="text-xl font-bold mb-4">Edit Investigation Steps</h2>
        <div className="flex gap-6">
          {/* Available Steps */}
          <div className="flex-1">
            <h3 className="font-semibold mb-2">Available Steps</h3>
            <ul className="border rounded min-h-[200px] p-2 bg-gray-50">
              {available.length === 0 && (
                <li className="text-gray-400">No steps available</li>
              )}
              {available.map((step) => (
                <li
                  key={step.id}
                  className="flex items-center justify-between mb-2 p-2 bg-white rounded shadow-sm"
                >
                  <span>{step.title}</span>
                  <button
                    type="button"
                    className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    onClick={() => moveToSelected(step)}
                    title="Add"
                  >
                    →
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {/* Selected Steps without drag-and-drop */}
          <div className="flex-1">
            <h3 className="font-semibold mb-2">Selected Steps</h3>
            <ul className="border rounded min-h-[200px] p-2 bg-gray-50">
              {selected.length === 0 && (
                <li className="text-gray-400">No steps selected</li>
              )}
              {selected.map((step) => (
                <li
                  key={step.id}
                  onClick={() => {
                    if (
                      step.id !== InvestigationStepId.RISK &&
                      step.id !== InvestigationStepId.INIT
                    ) {
                      setFocusedAgent(step.agent);
                    }
                  }}
                  className={`flex items-center justify-between mb-2 p-2 bg-white rounded shadow-sm ${
                    step.id === InvestigationStepId.RISK ||
                    step.id === InvestigationStepId.INIT
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  } ${
                    focusedAgent === step.agent ? 'bg-blue-50' : ''
                  } cursor-pointer`}
                >
                  <span>{step.title}</span>
                  <button
                    type="button"
                    className="ml-2 px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveToAvailable(step);
                    }}
                    title="Remove"
                    disabled={
                      selected.length === 3 ||
                      step.id === InvestigationStepId.RISK ||
                      step.id === InvestigationStepId.INIT
                    }
                  >
                    ←
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {/* Tools column */}
          <div className="flex-1">
            <h3 className="font-semibold mb-2">Tools</h3>
            <div className="border rounded min-h-[200px] p-2 bg-gray-50">
              {focusedAgent ? (
                <fieldset>
                  <legend className="font-medium mb-2">{focusedAgent}</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {TOOLS.map((tool) => (
                      <label key={tool} className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={
                            toolsByAgent[focusedAgent]?.includes(tool) || false
                          }
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setToolsByAgent((prev) => {
                              const prevTools = prev[focusedAgent] || [];
                              const newTools = checked
                                ? [...prevTools, tool]
                                : prevTools.filter((t) => t !== tool);
                              return { ...prev, [focusedAgent]: newTools };
                            });
                          }}
                        />
                        {tool}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : (
                <div className="text-gray-400">
                  Select an agent to edit tools
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-6 gap-2">
          <button
            type="button"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            onClick={onClose}
            title="Cancel editing steps"
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => onSave(selected, toolsByAgent)}
            disabled={selected.length === 0}
            title="Save selected steps"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditStepsModal;
