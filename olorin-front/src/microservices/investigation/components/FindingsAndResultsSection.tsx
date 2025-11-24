import React from 'react';
import { FindingsList, ResultCard } from '../../../shared/components';
import type { Finding, Result } from '../../../shared/components';

interface FindingsAndResultsSectionProps {
  findings: Finding[];
  results: Result[];
}

export const FindingsAndResultsSection: React.FC<FindingsAndResultsSectionProps> = ({
  findings,
  results
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-corporate-textPrimary mb-4">
            Key Findings
          </h2>
          <FindingsList findings={findings} maxHeight="max-h-96" showFilters={false} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-corporate-textPrimary mb-4">
            Detailed Results
          </h2>
          <div className="space-y-4">
            {results.map((result) => (
              <ResultCard key={result.id} result={result} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FindingsAndResultsSection;
