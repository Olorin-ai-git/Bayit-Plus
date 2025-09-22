/**
 * Evidence Trail Concept View
 *
 * Timeline-first interface designed for compliance officers and auditors.
 * Features chronological evidence progression with audit trail functionality.
 *
 * Target Users: Compliance officers, auditors
 * Visual Metaphor: Legal case file timeline
 *
 * @author Gil Klainert
 * @created 2025-01-22
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Route,
  Clock,
  FileText,
  ArrowRight,
  Scale,
  CheckCircle,
  AlertCircle,
  Archive,
  Download,
  Filter,
  Search,
  Calendar,
  BookOpen,
  Gavel,
  Shield,
  Eye,
  Link,
  Plus,
  Edit3,
  Bookmark,
  Camera,
  FileCheck,
  AlertTriangle
} from 'lucide-react';

// Shared components
import { Timeline } from '../../shared/Timeline';
import { EvidencePanel } from '../../shared/EvidencePanel';
import { StatusBadge } from '../../shared/StatusBadge';
import { LoadingSpinner } from '../../shared/LoadingSpinner';
import { ErrorAlert } from '../../shared/ErrorAlert';

// Hooks and stores
import { useInvestigationQueries } from '../../../hooks/useInvestigationQueries';
import { useConceptStore } from '../../../stores/conceptStore';
import { useWebSocket } from '../../../hooks/useWebSocket';

// Types
import type { Investigation, Evidence } from '../../../types';

interface EvidenceStep {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  type: 'collection' | 'analysis' | 'verification' | 'linking' | 'documentation' | 'approval';
  confidence: number;
  evidenceIds: string[];
  sourceAgent?: string;
  auditStatus: 'pending' | 'verified' | 'flagged' | 'approved';
  custodyChain: string[];
  legalImplications?: string;
  complianceNotes?: string;
  reviewedBy?: string;
  attachments?: string[];
}

interface AuditMetrics {
  totalSteps: number;
  verifiedSteps: number;
  flaggedSteps: number;
  custodyBreaks: number;
  complianceScore: number;
  lastAuditDate: string;
  nextReviewDue: string;
}

export const EvidenceTrailView: React.FC = () => {
  // Store hooks
  const { getActiveConfiguration } = useConceptStore();

  // Data hooks
  const {
    investigation,
    evidence,
    isLoading,
    error
  } = useInvestigationQueries();

  // WebSocket for real-time updates
  const { isConnected, lastMessage } = useWebSocket({
    url: 'ws://localhost:8090/ws/evidence-trail',
    enabled: true
  });

  // Local state
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('all');
  const [auditMode, setAuditMode] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Mock evidence steps data
  const [evidenceSteps] = useState<EvidenceStep[]>([
    {
      id: 'step-001',
      timestamp: '2025-01-22T09:15:00Z',
      title: 'Initial Evidence Collection',
      description: 'Suspicious IP activity detected through network monitoring system. Automated collection of network logs and connection metadata.',
      type: 'collection',
      confidence: 95,
      evidenceIds: ['ev-001', 'ev-002'],
      sourceAgent: 'Network Monitor Agent',
      auditStatus: 'verified',
      custodyChain: ['system', 'network-agent', 'evidence-store'],
      legalImplications: 'Admissible - automated collection with proper chain of custody'
    },
    {
      id: 'step-002',
      timestamp: '2025-01-22T09:22:00Z',
      title: 'Device Fingerprinting Analysis',
      description: 'Cross-referenced device signatures with known threat database. Identified potential browser manipulation and fingerprint spoofing attempts.',
      type: 'analysis',
      confidence: 87,
      evidenceIds: ['ev-003', 'ev-004'],
      sourceAgent: 'Device Analysis Agent',
      auditStatus: 'verified',
      custodyChain: ['evidence-store', 'device-agent', 'analysis-engine'],
      complianceNotes: 'GDPR considerations: device fingerprinting within legal bounds'
    },
    {
      id: 'step-003',
      timestamp: '2025-01-22T09:28:00Z',
      title: 'User Behavior Correlation',
      description: 'Analyzed transaction patterns and user behavior metrics. Detected anomalous activity consistent with account takeover patterns.',
      type: 'analysis',
      confidence: 92,
      evidenceIds: ['ev-005', 'ev-006', 'ev-007'],
      sourceAgent: 'Behavior Analysis Agent',
      auditStatus: 'verified',
      custodyChain: ['analysis-engine', 'behavior-agent', 'correlation-service'],
      legalImplications: 'Requires user consent review for behavioral analysis'
    },
    {
      id: 'step-004',
      timestamp: '2025-01-22T09:35:00Z',
      title: 'Cross-Platform Evidence Linking',
      description: 'Established connections between network evidence and user behavior data. Created evidence graph showing relationship patterns.',
      type: 'linking',
      confidence: 89,
      evidenceIds: ['ev-001', 'ev-003', 'ev-005'],
      sourceAgent: 'Correlation Engine',
      auditStatus: 'pending',
      custodyChain: ['correlation-service', 'linking-engine'],
      reviewedBy: 'pending-review'
    },
    {
      id: 'step-005',
      timestamp: '2025-01-22T09:42:00Z',
      title: 'Compliance Documentation',
      description: 'Generated compliance report documenting evidence collection methodology and legal basis for investigation.',
      type: 'documentation',
      confidence: 98,
      evidenceIds: ['ev-008'],
      sourceAgent: 'Compliance Agent',
      auditStatus: 'approved',
      custodyChain: ['linking-engine', 'compliance-agent', 'audit-store'],
      complianceNotes: 'Full compliance with investigation protocols and data protection requirements',
      reviewedBy: 'compliance-officer'
    }
  ]);

  // Calculate audit metrics
  const auditMetrics: AuditMetrics = {
    totalSteps: evidenceSteps.length,
    verifiedSteps: evidenceSteps.filter(s => s.auditStatus === 'verified' || s.auditStatus === 'approved').length,
    flaggedSteps: evidenceSteps.filter(s => s.auditStatus === 'flagged').length,
    custodyBreaks: 0, // Would be calculated based on custody chain analysis
    complianceScore: 94,
    lastAuditDate: '2025-01-22T08:00:00Z',
    nextReviewDue: '2025-01-23T17:00:00Z'
  };

  // Get concept configuration
  const config = getActiveConfiguration();

  // Filter evidence steps based on search and filters
  const filteredSteps = evidenceSteps.filter(step => {
    const matchesSearch = searchTerm === '' ||
      step.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      step.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTimeRange = selectedTimeRange === 'all' ||
      (selectedTimeRange === 'today' && new Date(step.timestamp).toDateString() === new Date().toDateString());

    return matchesSearch && matchesTimeRange;
  });

  // Handle step selection
  const handleStepSelect = useCallback((stepId: string) => {
    setSelectedStep(stepId);
  }, []);

  // Handle audit mode toggle
  const handleAuditModeToggle = useCallback(() => {
    setAuditMode(prev => !prev);
  }, []);

  // Render error state
  if (error) {
    return (
      <div className="p-6">
        <ErrorAlert
          title="Evidence Trail Error"
          message={error.message}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Evidence Trail Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Scale className="h-8 w-8 text-red-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Evidence Chain of Custody
              </h1>
              <p className="text-gray-600">
                {investigation?.entity?.value || 'No investigation selected'} •
                Audit Trail: {isConnected ? 'Tracking' : 'Disconnected'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Compliance Status */}
            <div className="flex items-center space-x-2 text-sm">
              <Shield className={`h-4 w-4 ${auditMetrics.complianceScore >= 90 ? 'text-green-600' : 'text-yellow-600'}`} />
              <span className="text-gray-600">
                Compliance: {auditMetrics.complianceScore}%
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

            <button
              onClick={handleAuditModeToggle}
              className={`px-3 py-2 text-sm rounded-md flex items-center space-x-2 ${
                auditMode ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <Gavel className="h-4 w-4" />
              <span>{auditMode ? 'Exit Audit' : 'Audit Mode'}</span>
            </button>

            <button className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Export Chain</span>
            </button>

            <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center space-x-2">
              <FileCheck className="h-4 w-4" />
              <span>Certify Chain</span>
            </button>
          </div>
        </div>

        {/* Investigation & Audit KPIs */}
        {investigation && (
          <div className="mt-4 grid grid-cols-5 gap-6 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">Investigation:</span>
              <StatusBadge
                status={investigation.current_risk_score > 0.7 ? 'high' : investigation.current_risk_score > 0.4 ? 'medium' : 'low'}
                text={investigation.current_risk_score?.toFixed(2) || '0.00'}
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">Evidence Steps:</span>
              <span className="font-medium">{auditMetrics.totalSteps}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">Verified:</span>
              <span className="font-medium text-green-600">{auditMetrics.verifiedSteps}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">Custody Score:</span>
              <span className={`font-medium ${auditMetrics.custodyBreaks === 0 ? 'text-green-600' : 'text-red-600'}`}>
                {auditMetrics.custodyBreaks === 0 ? 'Intact' : `${auditMetrics.custodyBreaks} breaks`}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">Next Review:</span>
              <span className="font-medium">{new Date(auditMetrics.nextReviewDue).toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Timeline Navigation */}
        <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            {/* Search and Filters */}
            <div className="space-y-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search evidence..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                />
              </div>

              {showFilters && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Time Range</label>
                    <select
                      value={selectedTimeRange}
                      onChange={(e) => setSelectedTimeRange(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Evidence Steps List */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Route className="h-5 w-5 mr-2 text-red-600" />
                EVIDENCE CHAIN
              </h3>

              {isLoading ? (
                <LoadingSpinner size="sm" text="Loading steps..." />
              ) : (
                <div className="space-y-2">
                  {filteredSteps.map((step, index) => (
                    <EvidenceStepCard
                      key={step.id}
                      step={step}
                      index={index}
                      selected={selectedStep === step.id}
                      auditMode={auditMode}
                      onClick={() => handleStepSelect(step.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Audit Metrics */}
          <div className="p-4 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">Audit Status</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Compliance Score:</span>
                <span className={`font-medium ${auditMetrics.complianceScore >= 90 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {auditMetrics.complianceScore}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Verified Steps:</span>
                <span className="font-medium">{auditMetrics.verifiedSteps}/{auditMetrics.totalSteps}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Custody Status:</span>
                <span className={`font-medium ${auditMetrics.custodyBreaks === 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {auditMetrics.custodyBreaks === 0 ? 'Intact' : 'Broken'}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Central Evidence Timeline */}
        <main className="flex-1 flex flex-col">
          {/* Timeline Header */}
          <div className="p-4 bg-white border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700">Timeline View:</span>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded">Chronological</button>
                  <button className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">Evidence Type</button>
                  <button className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">Confidence</button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button className="px-3 py-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 rounded flex items-center space-x-1">
                  <Plus className="h-3 w-3" />
                  <span>Add Evidence</span>
                </button>
                <button className="px-3 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded">
                  Verify Chain
                </button>
                <button className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded">
                  Flag Issues
                </button>
              </div>
            </div>
          </div>

          {/* Evidence Timeline */}
          <div className="flex-1 p-6 overflow-y-auto">
            {selectedStep ? (
              <EvidenceStepDetail
                step={evidenceSteps.find(s => s.id === selectedStep)!}
                auditMode={auditMode}
                onClose={() => setSelectedStep(null)}
              />
            ) : (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Evidence Chain Timeline</h3>
                  <p className="text-gray-600">Select an evidence step from the sidebar to view detailed chain of custody information</p>
                </div>

                {/* Visual Timeline Overview */}
                <div className="bg-white rounded-lg p-6 border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-4">Chain Overview</h4>
                  <div className="flex items-center space-x-4 overflow-x-auto pb-4">
                    {filteredSteps.map((step, index) => (
                      <div key={step.id} className="flex items-center space-x-2 flex-shrink-0">
                        <button
                          onClick={() => handleStepSelect(step.id)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                            step.auditStatus === 'approved' ? 'bg-green-100 text-green-700' :
                            step.auditStatus === 'verified' ? 'bg-blue-100 text-blue-700' :
                            step.auditStatus === 'flagged' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {index + 1}
                        </button>
                        {index < filteredSteps.length - 1 && (
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Evidence Details Panel */}
        <aside className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
          <EvidencePanel
            selectedEvidence={evidence || []}
            height={400}
            onEvidenceSelect={(ev) => console.log('Evidence selected:', ev)}
            className="h-full border-0 rounded-none"
          />
        </aside>
      </div>
    </div>
  );
};

// Evidence Step Card Component
interface EvidenceStepCardProps {
  step: EvidenceStep;
  index: number;
  selected: boolean;
  auditMode: boolean;
  onClick: () => void;
}

const EvidenceStepCard: React.FC<EvidenceStepCardProps> = ({
  step,
  index,
  selected,
  auditMode,
  onClick
}) => {
  const getStepIcon = (type: string) => {
    switch (type) {
      case 'collection': return <Camera className="h-4 w-4" />;
      case 'analysis': return <Search className="h-4 w-4" />;
      case 'verification': return <CheckCircle className="h-4 w-4" />;
      case 'linking': return <Link className="h-4 w-4" />;
      case 'documentation': return <FileText className="h-4 w-4" />;
      case 'approval': return <Gavel className="h-4 w-4" />;
      default: return <FileCheck className="h-4 w-4" />;
    }
  };

  const getAuditStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-50 border-green-200';
      case 'verified': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'flagged': return 'text-red-600 bg-red-50 border-red-200';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all ${
        selected
          ? 'border-red-300 bg-red-50 shadow-sm'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <div className={`p-1 rounded ${
              step.type === 'collection' ? 'text-blue-600 bg-blue-100' :
              step.type === 'analysis' ? 'text-purple-600 bg-purple-100' :
              step.type === 'verification' ? 'text-green-600 bg-green-100' :
              step.type === 'linking' ? 'text-orange-600 bg-orange-100' :
              step.type === 'documentation' ? 'text-gray-600 bg-gray-100' :
              'text-red-600 bg-red-100'
            }`}>
              {getStepIcon(step.type)}
            </div>
            <span className="text-xs text-gray-500">#{index + 1}</span>
          </div>
          {auditMode && (
            <span className={`px-2 py-1 text-xs rounded-full border ${getAuditStatusColor(step.auditStatus)}`}>
              {step.auditStatus}
            </span>
          )}
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 line-clamp-1">{step.title}</h4>
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{step.description}</p>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">
            {new Date(step.timestamp).toLocaleTimeString()}
          </span>
          <span className={`font-medium ${
            step.confidence >= 90 ? 'text-green-600' :
            step.confidence >= 70 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {step.confidence}%
          </span>
        </div>
      </div>
    </button>
  );
};

// Evidence Step Detail Component
interface EvidenceStepDetailProps {
  step: EvidenceStep;
  auditMode: boolean;
  onClose: () => void;
}

const EvidenceStepDetail: React.FC<EvidenceStepDetailProps> = ({
  step,
  auditMode,
  onClose
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
          <p className="text-sm text-gray-600 mt-1">
            {new Date(step.timestamp).toLocaleString()} • Agent: {step.sourceAgent}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      <div className="space-y-6">
        {/* Description */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Description</h4>
          <p className="text-gray-700">{step.description}</p>
        </div>

        {/* Audit Information */}
        {auditMode && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Audit Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Status:</span>
                <span className="ml-2 font-medium capitalize">{step.auditStatus}</span>
              </div>
              <div>
                <span className="text-gray-600">Confidence:</span>
                <span className="ml-2 font-medium">{step.confidence}%</span>
              </div>
              {step.reviewedBy && (
                <div>
                  <span className="text-gray-600">Reviewed By:</span>
                  <span className="ml-2 font-medium">{step.reviewedBy}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chain of Custody */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Chain of Custody</h4>
          <div className="space-y-2">
            {step.custodyChain.map((entity, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-700">
                  {index + 1}
                </div>
                <span className="text-sm text-gray-700">{entity}</span>
                {index < step.custodyChain.length - 1 && (
                  <ArrowRight className="h-3 w-3 text-gray-400" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Legal Implications */}
        {step.legalImplications && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Legal Implications</h4>
            <p className="text-sm text-gray-700 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              {step.legalImplications}
            </p>
          </div>
        )}

        {/* Compliance Notes */}
        {step.complianceNotes && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Compliance Notes</h4>
            <p className="text-sm text-gray-700 bg-green-50 p-3 rounded-lg border border-green-200">
              {step.complianceNotes}
            </p>
          </div>
        )}

        {/* Evidence IDs */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Associated Evidence</h4>
          <div className="flex flex-wrap gap-2">
            {step.evidenceIds.map((evidenceId) => (
              <span
                key={evidenceId}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded border border-blue-200"
              >
                {evidenceId}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default EvidenceTrailView;
