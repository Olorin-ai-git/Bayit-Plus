import React from 'react';

/**
 * Component to display the overall risk score
 * @param {Object} props - Component props
 * @param {number} props.score - The overall risk score
 * @returns {JSX.Element} The rendered overall risk score component
 */
const OverallRiskScore: React.FC<{
  score: number;
}> = ({ score }) => (
  <div className="bg-white rounded-lg shadow-md p-6 mb-8 relative">
    <h3 className="text-lg font-semibold text-gray-700 mb-2">
      Overall Risk Score
    </h3>
    <div className="flex items-center gap-4">
      <div
        className="text-4xl font-bold text-blue-600"
        style={{ margin: 'auto' }}
      >
        {score.toFixed(2)}
      </div>
    </div>
  </div>
);

export default OverallRiskScore;
