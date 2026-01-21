/**
 * ConceptSwitchingDemo Component
 *
 * A demonstration component showcasing the concept switching functionality
 * and transition management system for the Hybrid Investigation UI.
 *
 * @author Gil Klainert
 * @created 2025-01-22
 */

import React from 'react';
import { HybridInvestigationApp } from '../components';

interface ConceptSwitchingDemoProps {
  /** Show debug information */
  debug?: boolean;
  /** Enable concept preview mode */
  enablePreview?: boolean;
  /** Custom styling classes */
  className?: string;
}

export const ConceptSwitchingDemo: React.FC<ConceptSwitchingDemoProps> = ({
  debug = false,
  enablePreview = true,
  className = '',
}) => {
  return (
    <div className={`concept-switching-demo ${className}`}>
      {/* Demo Header */}
      {debug && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-100 border-b border-yellow-300 px-4 py-2 z-50">
          <div className="text-center text-sm text-yellow-800">
            <strong>Demo Mode:</strong> Hybrid Graph Investigation UI Concept Switching
          </div>
        </div>
      )}

      {/* Main Application */}
      <div className={debug ? 'pt-12' : ''}>
        <HybridInvestigationApp
          investigationId="demo-investigation-001"
          enablePreview={enablePreview}
          showConceptSwitcher={true}
          switcherLayout="floating"
          className="w-full h-screen"
        />
      </div>

      {/* Demo Instructions */}
      {debug && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white px-4 py-3 z-50">
          <div className="max-w-6xl mx-auto text-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <strong className="text-yellow-400">Power Grid (⌘1):</strong>
                <br />Energy flow metaphor for security analysts
              </div>
              <div>
                <strong className="text-green-400">Command Center (⌘2):</strong>
                <br />Mission control for investigation managers
              </div>
              <div>
                <strong className="text-red-400">Evidence Trail (⌘3):</strong>
                <br />Timeline-first for compliance officers
              </div>
              <div>
                <strong className="text-purple-400">Network Explorer (⌘4):</strong>
                <br />Graph-first for SRE teams
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConceptSwitchingDemo;