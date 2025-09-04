import React, { memo } from 'react';
import { InvestigationResult, AgentResult } from '../types/Investigation';

interface RiskAnalysisPanelProps {
  investigation: InvestigationResult;
}

const RiskAnalysisPanel: React.FC<RiskAnalysisPanelProps> = memo(({ investigation }) => {
  return (
    <div className="risk-analysis-panel p-4 border rounded-lg mb-6">
      <h2 className="text-lg font-semibold mb-4">Risk Analysis</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 rounded">
          <h3 className="font-medium mb-2">Risk Score</h3>
          <div className={`text-2xl font-bold ${
            investigation.riskScore >= 80 ? 'text-red-600' :
            investigation.riskScore >= 60 ? 'text-orange-600' :
            investigation.riskScore >= 40 ? 'text-yellow-600' :
            'text-green-600'
          }`}>
            {investigation.riskScore}%
          </div>
        </div>
        <div className="p-4 bg-gray-50 rounded">
          <h3 className="font-medium mb-2">Risk Factors</h3>
          <div className="space-y-1">
            {investigation.agentResults
              .flatMap((result: AgentResult) => result.riskFactors)
              .map((factor: string, index: number) => (
                <div key={index} className="text-sm text-gray-600">
                  • {factor}
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
});

RiskAnalysisPanel.displayName = 'RiskAnalysisPanel';

export default RiskAnalysisPanel;
