/**
 * Power Grid Concept View
 *
 * Energy/power metaphor interface designed for security analysts and investigators.
 * Features dense grid layout with energy flow visualization and real-time status monitoring.
 *
 * Target Users: Security analysts, investigators
 * Visual Metaphor: Power plant control room
 *
 * @author Gil Klainert
 * @created 2025-01-22
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Zap,
  Battery,
  Power,
  Search,
  Settings,
  User,
  BarChart3,
  AlertTriangle,
  Activity,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

// Shared components
import { GraphVisualization } from '../../shared/GraphVisualization';
import { Timeline } from '../../shared/Timeline';
import { DomainCard } from '../../shared/DomainCard';
import { EvidencePanel } from '../../shared/EvidencePanel';
import { StatusBadge } from '../../shared/StatusBadge';
import { LoadingSpinner } from '../../shared/LoadingSpinner';
import { ErrorAlert } from '../../shared/ErrorAlert';

// Hooks and stores
import { useInvestigationQueries } from '../../../hooks/useInvestigationQueries';
import { useConceptStore } from '../../../stores/conceptStore';
import { useGraphStore } from '../../../stores/graphStore';
import { useWebSocket } from '../../../hooks/useWebSocket';

// Types
import type { Investigation, Domain, Evidence } from '../../../types';

interface PowerGridMetrics {
  primaryNodes: number;
  secondaryNodes: number;
  gridStability: number;
  activeConnections: number;
  flowRate: number;
  peakLoad: number;
  energyLevels: {
    high: number;
    medium: number;
    low: number;
  };
}

export const PowerGridView: React.FC = () => {
  // Store hooks
  const { getActiveConfiguration } = useConceptStore();
  const { nodes, edges, selectedNodes } = useGraphStore();

  // Data hooks
  const {
    investigation,
    domains,
    evidence,
    isLoading,
    error
  } = useInvestigationQueries();

  // WebSocket for real-time updates
  const { isConnected, lastMessage } = useWebSocket({
    url: 'ws://localhost:8090/ws/investigation',
    enabled: true
  });

  // Local state
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [gridMetrics, setGridMetrics] = useState<PowerGridMetrics>({
    primaryNodes: 85,
    secondaryNodes: 67,
    gridStability: 92,
    activeConnections: 12,
    flowRate: 2.4,
    peakLoad: 78,
    energyLevels: { high: 5, medium: 8, low: 3 }
  });
  const [isGridActive, setIsGridActive] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Get concept configuration
  const config = getActiveConfiguration();

  // Update metrics based on investigation data
  useEffect(() => {
    if (domains && domains.length > 0) {
      const highRiskDomains = domains.filter(d => d.risk_score > 0.7).length;
      const mediumRiskDomains = domains.filter(d => d.risk_score >= 0.4 && d.risk_score <= 0.7).length;
      const lowRiskDomains = domains.filter(d => d.risk_score < 0.4).length;

      setGridMetrics(prev => ({
        ...prev,
        primaryNodes: Math.round(domains.reduce((sum, d) => sum + d.risk_score, 0) / domains.length * 100),
        activeConnections: edges?.length || 0,
        energyLevels: {
          high: highRiskDomains,
          medium: mediumRiskDomains,
          low: lowRiskDomains
        }
      }));
    }
  }, [domains, edges]);

  // Handle grid initialization
  const handleInitializeGrid = useCallback(() => {
    setIsGridActive(true);
    // Trigger grid analysis or refresh
  }, []);

  // Handle domain selection
  const handleDomainSelect = useCallback((domainId: string) => {
    setSelectedDomain(domainId);
  }, []);

  // Handle energy optimization
  const handleOptimizeFlow = useCallback(() => {
    // Implement flow optimization logic
    console.log('Optimizing energy flow...');
  }, []);

  // Render error state
  if (error) {
    return (
      <div className="p-6">
        <ErrorAlert
          title="Power Grid Error"
          message={error.message}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Power Grid Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Zap className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Power Grid Investigation
              </h1>
              <p className="text-gray-600">
                {investigation?.entity?.value || 'No entity selected'} • Grid Status: {isGridActive ? 'Active' : 'Standby'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-gray-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {/* Action Buttons */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md flex items-center space-x-2"
            >
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </button>

            <button className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>

            <button
              onClick={handleInitializeGrid}
              disabled={!investigation}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md flex items-center space-x-2"
            >
              <Power className="h-4 w-4" />
              <span>{isGridActive ? 'Reinitialize' : 'Initialize'} Grid</span>
            </button>
          </div>
        </div>

        {/* Investigation KPIs */}
        {investigation && (
          <div className="mt-4 flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">Risk:</span>
              <StatusBadge
                status={investigation.current_risk_score > 0.7 ? 'high' : investigation.current_risk_score > 0.4 ? 'medium' : 'low'}
                text={investigation.current_risk_score?.toFixed(2) || '0.00'}
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">Confidence:</span>
              <span className="font-medium">{investigation.confidence?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">Phase:</span>
              <span className="font-medium capitalize">{investigation.current_phase || 'Unknown'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">Duration:</span>
              <span className="font-medium">2h 15m</span>
            </div>
            {/* Energy Level Indicators */}
            <div className="flex space-x-2">
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                🔴 {gridMetrics.energyLevels.high}
              </span>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                🟡 {gridMetrics.energyLevels.medium}
              </span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                🟢 {gridMetrics.energyLevels.low}
              </span>
            </div>
          </div>
        )}
      </header>

      {/* Main Grid Layout */}
      <div className="flex-1 flex">
        {/* Domain Energy Panel */}
        <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Battery className="h-5 w-5 mr-2 text-blue-600" />
              ENERGY DOMAINS
            </h3>

            {isLoading ? (
              <LoadingSpinner size="sm" text="Loading domains..." />
            ) : (
              <div className="space-y-2">
                {domains?.map((domain) => (
                  <DomainCard
                    key={domain.name}
                    domain={domain}
                    selected={selectedDomain === domain.name}
                    onClick={() => handleDomainSelect(domain.name)}
                    energyMetrics={{
                      level: Math.round(domain.risk_score * 100),
                      flow: domain.evidence_count || 0,
                      stability: 85 + Math.random() * 15
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Grid Metrics */}
          <div className="p-4 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">Grid Metrics</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Grid Stability:</span>
                <span className={`font-medium ${gridMetrics.gridStability > 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {gridMetrics.gridStability}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Active Connections:</span>
                <span className="font-medium">{gridMetrics.activeConnections}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Flow Rate:</span>
                <span className="font-medium">{gridMetrics.flowRate} units/sec</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Peak Load:</span>
                <span className={`font-medium ${gridMetrics.peakLoad > 80 ? 'text-red-600' : 'text-green-600'}`}>
                  {gridMetrics.peakLoad}%
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Central Grid Visualization */}
        <main className="flex-1 flex flex-col">
          {/* Graph Controls */}
          <div className="p-4 bg-white border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700">Layout:</span>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded">Force</button>
                  <button className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">Radial</button>
                  <button className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">Grid</button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleOptimizeFlow}
                  className="px-3 py-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 rounded flex items-center space-x-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Optimize Flow</span>
                </button>
                <button className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded">
                  Balance Load
                </button>
                <button className="px-3 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 rounded">
                  Emergency Stop
                </button>
              </div>
            </div>
          </div>

          {/* Energy Flow Graph */}
          <div className="flex-1 relative">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <LoadingSpinner text="Initializing power grid..." />
              </div>
            ) : (
              <GraphVisualization
                engine="d3"
                mode="force"
                interactive={true}
                enableZoom={true}
                enablePan={true}
                showMinimap={true}
                className="h-full"
                onNodeClick={(nodeId, event) => {
                  console.log('Node clicked:', nodeId);
                  handleDomainSelect(nodeId);
                }}
              />
            )}
          </div>
        </main>

        {/* Evidence Energy Panel */}
        <aside className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
          <EvidencePanel
            selectedEvidence={selectedDomain ? evidence?.filter(e => e.domain === selectedDomain) : []}
            onEvidenceSelect={(evidenceId) => console.log('Evidence selected:', evidenceId)}
            energyMode={true}
          />
        </aside>
      </div>

      {/* Power Grid Timeline */}
      <footer className="h-32 bg-white border-t border-gray-200">
        <Timeline
          compact={true}
          showFilters={true}
          energyFlowMode={true}
          onEventSelect={(eventId) => console.log('Timeline event selected:', eventId)}
        />
      </footer>
    </div>
  );
};
