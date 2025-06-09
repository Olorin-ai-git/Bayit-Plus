import React from 'react';

interface ProgressBarProps {
  currentStep: number;
  steps: { title: string }[];
}

/**
 * A progress bar component that displays the current step in a multi-step process.
 * @param {number} currentStep - The current step (0-based index)
 * @param {number} totalSteps - The total number of steps
 * @returns {JSX.Element} A progress bar with step labels
 */
const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep, steps }) => {
  // Calculate progress percentage based on current step
  const progressPercentage = Math.min(
    ((currentStep + 1) / steps.length) * 100,
    100,
  );

  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-8">
      <div
        className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
        style={{ width: `${progressPercentage}%` }}
      />
      <div className="flex justify-between" style={{ margin: '5px' }}>
        {steps.map((step, idx) => (
          <span key={idx}>{step.title}</span>
        ))}
      </div>
    </div>
  );
};

export default ProgressBar;
