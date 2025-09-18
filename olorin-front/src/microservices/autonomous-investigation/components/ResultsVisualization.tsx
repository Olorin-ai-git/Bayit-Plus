import React, { useState, useMemo } from 'react';
import {
  ChartBarIcon,
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  EyeIcon,
  DocumentTextIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { Evidence, Investigation } from '../types/investigation';
import { InvestigationCharts } from './VisualizationCharts';

interface ResultsVisualizationProps {
  investigation: Investigation;
}

interface RiskAnalysis {
  overallRisk: number;
  riskCategories: {
    name: string;
    score: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    findings: string[];
  }[];
  timeline: {
    timestamp: string;
    riskScore: number;
    event: string;
  }[];
}

export const ResultsVisualization: React.FC<ResultsVisualizationProps> = ({
  investigation
}) => {
  const results = investigation.results;
  const [activeView, setActiveView] = useState<'overview' | 'risk' | 'evidence' | 'agents' | 'timeline'>('overview');
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);

  const riskAnalysis: RiskAnalysis = useMemo(() => {
    // Analyze results to create risk categories
    const categories = [
      {
        name: 'Device Anomalies',
        score: Math.random() * 100,
        severity: 'high' as const,
        findings: results?.findings?.filter(f => f.toLowerCase().includes('device')) || []
      },
      {
        name: 'Location Irregularities',
        score: Math.random() * 100,
        severity: 'medium' as const,
        findings: results?.findings?.filter(f => f.toLowerCase().includes('location')) || []
      },
      {
        name: 'Behavioral Patterns',
        score: Math.random() * 100,
        severity: 'low' as const,
        findings: results?.findings?.filter(f => f.toLowerCase().includes('behavior')) || []
      },
      {
        name: 'Network Security',
        score: Math.random() * 100,
        severity: 'critical' as const,
        findings: results?.findings?.filter(f => f.toLowerCase().includes('network')) || []
      }
    ];

    // Generate mock timeline data
    const timeline = Array.from({ length: 10 }, (_, i) => ({
      timestamp: new Date(Date.now() - (9 - i) * 60000).toISOString(),
      riskScore: Math.random() * 100,
      event: `Risk assessment point ${i + 1}`
    }));

    return {
      overallRisk: (results?.riskScore || 0) * 100,
      riskCategories: categories,
      timeline
    };
  }, [results]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <ShieldExclamationIcon className="h-5 w-5 text-red-500" />;
      case 'high': return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />;
      case 'medium': return <InformationCircleIcon className="h-5 w-5 text-yellow-500" />;
      case 'low': return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      default: return <InformationCircleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const RiskScoreVisualization: React.FC<{ score: number; size?: 'sm' | 'md' | 'lg' }> = ({
    score,
    size = 'md'
  }) => {
    const radius = size === 'lg' ? 80 : size === 'md' ? 60 : 40;
    const strokeWidth = size === 'lg' ? 8 : size === 'md' ? 6 : 4;
    const normalizedRadius = radius - strokeWidth * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDasharray = `${circumference} ${circumference}`;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    const getScoreColor = (score: number) => {
      if (score >= 80) return '#ef4444'; // red
      if (score >= 60) return '#f59e0b'; // amber
      if (score >= 40) return '#eab308'; // yellow
      return '#10b981'; // green
    };

    return (
      <div className="relative">
        <svg
          className={`transform -rotate-90 ${
            size === 'lg' ? 'w-40 h-40' : size === 'md' ? 'w-32 h-32' : 'w-24 h-24'
          }`}
        >
          <circle
            stroke="#e5e7eb"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke={getScoreColor(score)}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className={`font-bold ${
              size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-2xl' : 'text-lg'
            }`} style={{ color: getScoreColor(score) }}>
              {Math.round(score)}
            </div>
            <div className={`text-gray-500 ${
              size === 'lg' ? 'text-sm' : 'text-xs'
            }`}>
              Risk Score
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: 'Overview', icon: ChartBarIcon },
            { key: 'risk', label: 'Risk Analysis', icon: ShieldExclamationIcon },
            { key: 'evidence', label: 'Evidence', icon: DocumentTextIcon },
            { key: 'agents', label: 'Agent Results', icon: EyeIcon },
            { key: 'timeline', label: 'Timeline', icon: ClockIcon }
          ].map(tab => {
            const isActive = activeView === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveView(tab.key as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content Areas */}
      {!results ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Available</h3>
          <p className="text-gray-600">
            {investigation.status === 'completed' ? 'No results were generated for this investigation.' : 'Results will appear when the investigation is complete.'}
          </p>
        </div>
      ) : (
        <>
          {activeView === 'overview' && (
            <div className="space-y-6">
              {/* Charts Section */}
              <InvestigationCharts investigation={investigation} />

              {/* Overview Content */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Risk Score */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Assessment</h3>
                  <div className="flex items-center justify-center mb-4">
                    <RiskScoreVisualization score={riskAnalysis.overallRisk} size="lg" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-2">
                      Overall Risk Level: <span className="font-medium">{
                        riskAnalysis.overallRisk >= 80 ? 'Critical' :
                        riskAnalysis.overallRisk >= 60 ? 'High' :
                        riskAnalysis.overallRisk >= 40 ? 'Medium' : 'Low'
                      }</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Confidence: <span className={`font-medium ${getConfidenceColor((results?.confidence || 0) * 100)}`}>
                        {Math.round((results?.confidence || 0) * 100)}%
                      </span>
                    </p>
                  </div>
                </div>

                {/* Summary */}
                <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Investigation Summary</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Analysis Summary</h4>
                      <p className="text-sm text-gray-600">{results?.summary || 'No summary available'}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Key Findings ({results?.findings?.length || 0})</h4>
                        <ul className="space-y-1">
                          {(results?.findings || []).slice(0, 3).map((finding, index) => (
                            <li key={index} className="text-sm text-gray-600 flex items-start">
                              <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                              <span className="line-clamp-2">{finding}</span>
                            </li>
                          ))}
                          {(results?.findings?.length || 0) > 3 && (
                            <li className="text-sm text-blue-600">
                              +{(results?.findings?.length || 0) - 3} more findings
                            </li>
                          )}
                        </ul>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendations ({results?.recommendations?.length || 0})</h4>
                        <ul className="space-y-1">
                          {(results?.recommendations || []).slice(0, 3).map((rec, index) => (
                            <li key={index} className="text-sm text-gray-600 flex items-start">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                              <span className="line-clamp-2">{rec}</span>
                            </li>
                          ))}
                          {(results?.recommendations?.length || 0) > 3 && (
                            <li className="text-sm text-blue-600">
                              +{(results?.recommendations?.length || 0) - 3} more recommendations
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === 'risk' && (
            <div className="space-y-6">
              {/* Risk Categories */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {riskAnalysis.riskCategories.map((category, index) => (
                  <div key={index} className={`border rounded-lg p-4 ${getSeverityColor(category.severity)}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getSeverityIcon(category.severity)}
                        <span className="font-medium text-sm">{category.name}</span>
                      </div>
                      <span className="text-lg font-bold">{Math.round(category.score)}</span>
                    </div>
                    <div className="w-full bg-white bg-opacity-50 rounded-full h-2 mb-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-1000 ${
                          category.severity === 'critical' ? 'bg-red-600' :
                          category.severity === 'high' ? 'bg-orange-600' :
                          category.severity === 'medium' ? 'bg-yellow-600' : 'bg-green-600'
                        }`}
                        style={{ width: `${category.score}%` }}
                      />
                    </div>
                    <p className="text-xs opacity-90">
                      {category.findings.length} finding{category.findings.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                ))}
              </div>

              {/* Risk Timeline */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Evolution Timeline</h3>
                <div className="relative">
                  <div className="flex items-end space-x-2 h-32">
                    {riskAnalysis.timeline.map((point, index) => (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-blue-500 rounded-t transition-all duration-500 hover:bg-blue-600"
                          style={{ height: `${point.riskScore}%` }}
                          title={`${point.event}: ${Math.round(point.riskScore)}%`}
                        />
                        <span className="text-xs text-gray-500 mt-1 rotate-45 origin-left">
                          {new Date(point.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === 'evidence' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Evidence List */}
              <div className="lg:col-span-2 space-y-4">
                {results?.artifacts?.map((artifact, index) => (
                  <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                       onClick={() => setSelectedEvidence({
                         id: artifact.id,
                         type: 'pattern',
                         title: artifact.title,
                         description: artifact.description || 'No description available',
                         severity: 'medium',
                         confidence: Math.random() * 100,
                         source: 'Investigation Agent',
                         timestamp: artifact.createdAt,
                         data: artifact.data
                       })}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {artifact.type.toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatTimestamp(artifact.createdAt)}
                          </span>
                        </div>
                        <h4 className="font-medium text-gray-900 mb-1">{artifact.title}</h4>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {artifact.description || 'Evidence artifact from investigation'}
                        </p>
                      </div>
                      <EyeIcon className="h-5 w-5 text-gray-400 ml-4" />
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8">
                    <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Evidence Available</h3>
                    <p className="text-gray-600">Evidence artifacts will appear here when available.</p>
                  </div>
                )}
              </div>

              {/* Evidence Detail */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                {selectedEvidence ? (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">Evidence Details</h3>
                        <button
                          onClick={() => setSelectedEvidence(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          ×
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Type</dt>
                          <dd className="text-sm text-gray-900">{selectedEvidence.type}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Severity</dt>
                          <dd className="text-sm text-gray-900 capitalize">{selectedEvidence.severity}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Confidence</dt>
                          <dd className={`text-sm font-medium ${getConfidenceColor(selectedEvidence.confidence)}`}>
                            {Math.round(selectedEvidence.confidence)}%
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Source</dt>
                          <dd className="text-sm text-gray-900">{selectedEvidence.source}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Timestamp</dt>
                          <dd className="text-sm text-gray-900">{formatTimestamp(selectedEvidence.timestamp)}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Description</dt>
                          <dd className="text-sm text-gray-900">{selectedEvidence.description}</dd>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <EyeIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Select evidence to view details</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === 'agents' && (
            <div className="space-y-4">
              {results?.agentResults?.map((agentResult, index) => (
                <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">{agentResult.agentId}</h3>
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        agentResult.status === 'completed' ? 'bg-green-100 text-green-800' :
                        agentResult.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {agentResult.status.toUpperCase()}
                      </span>
                      <RiskScoreVisualization score={agentResult.score} size="sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Performance Metrics</h4>
                      <dl className="space-y-1">
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-600">Confidence:</dt>
                          <dd className={`text-sm font-medium ${getConfidenceColor(agentResult.confidence)}`}>
                            {Math.round(agentResult.confidence)}%
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-600">Execution Time:</dt>
                          <dd className="text-sm text-gray-900">{agentResult.executionTime}ms</dd>
                        </div>
                        {agentResult.resourceUsage && (
                          <>
                            <div className="flex justify-between">
                              <dt className="text-sm text-gray-600">CPU Usage:</dt>
                              <dd className="text-sm text-gray-900">{agentResult.resourceUsage.cpu}%</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-sm text-gray-600">Memory:</dt>
                              <dd className="text-sm text-gray-900">{agentResult.resourceUsage.memory}MB</dd>
                            </div>
                          </>
                        )}
                      </dl>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Findings ({agentResult.findings.length})</h4>
                      <ul className="space-y-1">
                        {agentResult.findings.slice(0, 3).map((finding, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                            <span className="line-clamp-2">{finding}</span>
                          </li>
                        ))}
                        {agentResult.findings.length > 3 && (
                          <li className="text-sm text-blue-600">+{agentResult.findings.length - 3} more</li>
                        )}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Evidence ({agentResult.evidence?.length || 0})</h4>
                      {agentResult.evidence && agentResult.evidence.length > 0 ? (
                        <ul className="space-y-1">
                          {agentResult.evidence.slice(0, 3).map((evidence, i) => (
                            <li key={i} className="text-sm text-gray-600">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium mr-2 ${getSeverityColor(evidence.severity)}`}>
                                {evidence.severity}
                              </span>
                              <span className="line-clamp-1">{evidence.title}</span>
                            </li>
                          ))}
                          {agentResult.evidence.length > 3 && (
                            <li className="text-sm text-blue-600">+{agentResult.evidence.length - 3} more</li>
                          )}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">No evidence collected</p>
                      )}
                    </div>
                  </div>
                </div>
              )) || (
                <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                  <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Agent Results</h3>
                  <p className="text-gray-600">Agent results will appear here when the investigation is complete.</p>
                </div>
              )}
            </div>
          )}

          {activeView === 'timeline' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Investigation Timeline</h3>
              {results?.timeline && results.timeline.length > 0 ? (
                <div className="space-y-4">
                  {results.timeline.map((event, index) => (
                    <div key={index} className="flex items-start space-x-4">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">{event.description}</p>
                          <span className="text-xs text-gray-500">{formatTimestamp(event.timestamp)}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {event.type.charAt(0).toUpperCase() + event.type.slice(1)} • {event.actor}
                        </p>
                        {event.metadata && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                            <pre className="whitespace-pre-wrap">{JSON.stringify(event.metadata, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Timeline Data</h3>
                  <p className="text-gray-600">Timeline events will appear here when available.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};