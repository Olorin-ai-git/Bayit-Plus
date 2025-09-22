import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PowerGridView } from '../components/concepts/power-grid/PowerGridView';
import { CommandCenterView } from '../components/concepts/command-center/CommandCenterView';
import { EvidenceTrailView } from '../components/concepts/evidence-trail/EvidenceTrailView';
import { NetworkExplorerView } from '../components/concepts/network-explorer/NetworkExplorerView';
import ConceptSelector from '../components/ui/ConceptSelector';
import { ErrorBoundary } from '../components/shared/ErrorBoundary';

export interface AutonomousInvestigationRoutesProps {
  basePath?: string;
}

export const AutonomousInvestigationRoutes: React.FC<AutonomousInvestigationRoutesProps> = ({ 
  basePath = '/autonomous-investigation' 
}) => {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<ConceptSelector />} />
        <Route path="/power-grid" element={<PowerGridView />} />
        <Route path="/command-center" element={<CommandCenterView />} />
        <Route path="/evidence-trail" element={<EvidenceTrailView />} />
        <Route path="/network-explorer" element={<NetworkExplorerView />} />
        <Route path="*" element={<Navigate to={`${basePath}/`} replace />} />
      </Routes>
    </ErrorBoundary>
  );
};

export default AutonomousInvestigationRoutes;
