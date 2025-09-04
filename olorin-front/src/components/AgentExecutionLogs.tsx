import React, { memo } from 'react';
import { InvestigationResult, AgentResult } from '../types/Investigation';

interface AgentExecutionLogsProps {
  investigation: InvestigationResult;
}

const AgentExecutionLogs: React.FC<AgentExecutionLogsProps> = memo(({ investigation }) => {
  return (
    <div className="agent-execution-logs p-4 border rounded-lg">
      <h2 className="text-lg font-semibold mb-4">Agent Execution Logs</h2>
      <div className="space-y-4">
        {investigation.agentResults.map((result: AgentResult, index: number) => (
          <div key={index} className="p-4 bg-gray-50 rounded">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">{result.agentName}</h3>
              <span className={`text-sm px-2 py-1 rounded ${
                result.status === 'completed' 
                  ? 'bg-green-100 text-green-800'
                  : result.status === 'running'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {result.status}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              Execution Time: {result.executionTime}ms
            </div>
            <pre className="mt-2 p-2 bg-gray-100 rounded text-sm overflow-x-auto">
              {JSON.stringify(result.result, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
});

AgentExecutionLogs.displayName = 'AgentExecutionLogs';

export default AgentExecutionLogs;
