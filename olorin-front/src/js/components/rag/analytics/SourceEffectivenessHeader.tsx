import React from 'react';

interface SourceEffectivenessHeaderProps {
  sourceCount: number;
  isConnected: boolean;
}

const SourceEffectivenessHeader: React.FC<SourceEffectivenessHeaderProps> = ({
  sourceCount,
  isConnected,
}) => {
  return (
    <div className="px-6 py-4 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Source Effectiveness</h3>
          <p className="text-sm text-gray-500">
            {sourceCount} sources • Performance analysis and optimization
          </p>
        </div>
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
          isConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-gray-400'
          }`} />
          <span>{isConnected ? 'Live' : 'Static'}</span>
        </div>
      </div>
    </div>
  );
};

export default SourceEffectivenessHeader;