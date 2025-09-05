import React from 'react';
import AgentLogSidebar from './AgentLogSidebar';
import RAGEnhancementSection from './rag/RAGEnhancementSection';
import { LogEntry } from '../types/RiskAssessment';

interface RAGEnhancedAgentLogSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogEntry[];
  onClearLogs: () => void;
  onCopyLogs?: () => void;
  cancelledRef: React.RefObject<boolean>;
  onLogDisplayed?: (log: LogEntry) => void;
  investigationId: string;
  autonomousMode: boolean;
}

/**
 * RAG-Enhanced Agent Log Sidebar
 * Extends the standard log sidebar with RAG enhancement indicators
 */
const RAGEnhancedAgentLogSidebar: React.FC<RAGEnhancedAgentLogSidebarProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
  onCopyLogs,
  cancelledRef,
  onLogDisplayed,
  investigationId,
  autonomousMode,
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Standard Agent Log Sidebar */}
      <div className="flex-1">
        <AgentLogSidebar
          isOpen={isOpen}
          onClose={onClose}
          logs={logs}
          onClearLogs={onClearLogs}
          onCopyLogs={onCopyLogs}
          cancelledRef={cancelledRef}
          onLogDisplayed={onLogDisplayed}
        />
      </div>

      {/* RAG Enhancement Section - Only show in autonomous mode */}
      {autonomousMode && investigationId && isOpen && (
        <div className="border-t border-gray-200 p-3">
          <RAGEnhancementSection 
            investigationId={investigationId}
            className="max-h-96 overflow-y-auto"
          />
        </div>
      )}
    </div>
  );
};

export default RAGEnhancedAgentLogSidebar;
