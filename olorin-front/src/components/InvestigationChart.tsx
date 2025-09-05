import React, { memo } from 'react';
import { InvestigationResult } from '../types/investigation';

interface InvestigationChartProps {
  investigation: InvestigationResult;
}

const InvestigationChart: React.FC<InvestigationChartProps> = memo(({ investigation }) => {
  return (
    <div className="investigation-chart p-4 border rounded-lg mb-6">
      <h2 className="text-lg font-semibold mb-4">Investigation Timeline</h2>
      {/* Chart implementation goes here */}
      <div className="text-gray-500 text-center py-8">
        Chart visualization will be implemented here
      </div>
    </div>
  );
});

InvestigationChart.displayName = 'InvestigationChart';

export default InvestigationChart;
