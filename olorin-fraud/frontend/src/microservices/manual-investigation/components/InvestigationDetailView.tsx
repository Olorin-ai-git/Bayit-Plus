import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SimpleStepTracker } from './SimpleStepTracker';
import { SimpleAgentResultsViewer } from './SimpleAgentResultsViewer';

interface Investigation {
  id: string;
  title: string;
  status: 'active' | 'completed' | 'paused';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  description: string;
  evidence: string[];
  timeline: Array<{
    timestamp: string;
    action: string;
    details: string;
  }>;
  steps: Array<{
    id: string;
    name: string;
    description?: string;
    status: 'pending' | 'ready' | 'running' | 'completed' | 'failed' | 'skipped';
    order_index: number;
    execution_time?: number;
    retry_count?: number;
    max_retries?: number;
    current_operation?: string;
  }>;
  agentResults: Array<{
    id: string;
    agent_id: string;
    step_id: string;
    data: Record<string, any>;
    findings: string[];
    risk_score: number;
    confidence: number;
    execution_time: number;
    created_at: string;
  }>;
  agents: Array<{
    id: string;
    name: string;
    type: string;
    status: 'active' | 'inactive';
    version: string;
    description?: string;
  }>;
}

export const InvestigationDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Mock investigation data (in real app, this would come from API)
  const investigation: Investigation | null = React.useMemo(() => {
    const investigations = {
      '1': {
        id: '1',
        title: 'Suspicious Transaction Pattern',
        status: 'active' as const,
        priority: 'high' as const,
        created_at: '2024-01-22T10:30:00Z',
        description: 'Multiple high-value transactions from unusual locations detected across several accounts.',
        evidence: [
          'Transaction logs showing $50,000+ transfers',
          'IP geolocation data showing access from 3 different countries',
          'Device fingerprinting showing inconsistent browser patterns',
          'Account creation dates clustered within 48-hour window'
        ],
        timeline: [
          {
            timestamp: '2024-01-22T10:30:00Z',
            action: 'Investigation Created',
            details: 'Automated alert triggered by transaction monitoring system'
          },
          {
            timestamp: '2024-01-22T11:15:00Z',
            action: 'Evidence Collected',
            details: 'Transaction logs and IP data gathered from security systems'
          },
          {
            timestamp: '2024-01-22T12:00:00Z',
            action: 'Pattern Analysis',
            details: 'ML model identified 87% similarity to known fraud patterns'
          }
        ],
        steps: [
          {
            id: 'step-1',
            name: 'Data Collection',
            description: 'Gathering transaction logs and user data',
            status: 'completed',
            order_index: 0,
            execution_time: 2500
          },
          {
            id: 'step-2',
            name: 'IP Analysis',
            description: 'Analyzing geolocation and IP patterns',
            status: 'completed',
            order_index: 1,
            execution_time: 4200
          },
          {
            id: 'step-3',
            name: 'Pattern Recognition',
            description: 'Running ML algorithms for fraud detection',
            status: 'running',
            order_index: 2,
            current_operation: 'Processing transaction patterns...'
          },
          {
            id: 'step-4',
            name: 'Risk Assessment',
            description: 'Calculating final risk score and recommendations',
            status: 'pending',
            order_index: 3
          },
          {
            id: 'step-5',
            name: 'Report Generation',
            description: 'Generating final investigation report',
            status: 'pending',
            order_index: 4
          }
        ],
        agentResults: [
          {
            id: 'result-1',
            agent_id: 'agent-device',
            step_id: 'step-1',
            data: {
              device_fingerprint: 'def789abc123',
              browser: 'Chrome 122.0',
              os: 'Windows 10',
              screen_resolution: '1920x1080',
              timezone: 'UTC+3'
            },
            findings: [
              'Device fingerprint indicates potential bot activity',
              'Browser version inconsistent with reported user location',
              'Multiple device IDs linked to same user account'
            ],
            risk_score: 85,
            confidence: 92,
            execution_time: 2100,
            created_at: '2024-01-22T11:20:00Z'
          },
          {
            id: 'result-2',
            agent_id: 'agent-location',
            step_id: 'step-2',
            data: {
              ip_address: '192.168.1.100',
              country: 'Romania',
              city: 'Bucharest',
              vpn_detected: true,
              risk_level: 'high'
            },
            findings: [
              'VPN usage detected from high-risk location',
              'IP address previously associated with fraudulent activity',
              'Geolocation inconsistent with user profile'
            ],
            risk_score: 78,
            confidence: 88,
            execution_time: 1800,
            created_at: '2024-01-22T11:25:00Z'
          }
        ],
        agents: [
          {
            id: 'agent-device',
            name: 'Device Analysis Agent',
            type: 'Security',
            status: 'active',
            version: '2.1.4',
            description: 'Analyzes device fingerprints and browser patterns for fraud detection'
          },
          {
            id: 'agent-location',
            name: 'Geolocation Agent',
            type: 'Location Intelligence',
            status: 'active',
            version: '1.8.2',
            description: 'Performs IP geolocation analysis and VPN detection'
          },
          {
            id: 'agent-pattern',
            name: 'Pattern Recognition Agent',
            type: 'ML Analytics',
            status: 'active',
            version: '3.0.1',
            description: 'Uses machine learning to identify fraud patterns and anomalies'
          }
        ]
      },
      '2': {
        id: '2',
        title: 'Account Takeover Attempt',
        status: 'active' as const,
        priority: 'medium' as const,
        created_at: '2024-01-22T09:15:00Z',
        description: 'Multiple failed login attempts followed by password reset requests from suspicious IPs.',
        evidence: [
          'Failed login attempts from 15 different IP addresses',
          'Password reset requests from unrecognized locations',
          'User behavior anomalies detected in recent sessions'
        ],
        timeline: [
          {
            timestamp: '2024-01-22T09:15:00Z',
            action: 'Investigation Created',
            details: 'Account security monitoring detected suspicious activity'
          },
          {
            timestamp: '2024-01-22T09:45:00Z',
            action: 'Security Review',
            details: 'Login patterns analyzed and flagged for manual review'
          }
        ],
        steps: [
          {
            id: 'step-1',
            name: 'Login Analysis',
            description: 'Analyzing failed login attempts and patterns',
            status: 'completed',
            order_index: 0,
            execution_time: 1800
          },
          {
            id: 'step-2',
            name: 'IP Geolocation',
            description: 'Mapping IP addresses to geographic locations',
            status: 'completed',
            order_index: 1,
            execution_time: 3200
          },
          {
            id: 'step-3',
            name: 'Account Security Check',
            description: 'Verifying account security and password integrity',
            status: 'failed',
            order_index: 2,
            retry_count: 1,
            max_retries: 3,
            execution_time: 900
          },
          {
            id: 'step-4',
            name: 'User Notification',
            description: 'Notifying user of suspicious activity',
            status: 'ready',
            order_index: 3
          }
        ],
        agentResults: [
          {
            id: 'result-3',
            agent_id: 'agent-login',
            step_id: 'step-1',
            data: {
              failed_attempts: 15,
              attempt_pattern: 'brute_force',
              time_span: '2 hours',
              success_rate: 0
            },
            findings: [
              'Systematic brute force attack detected',
              'Login attempts originated from botnet',
              'Password dictionary attack patterns identified'
            ],
            risk_score: 73,
            confidence: 95,
            execution_time: 1200,
            created_at: '2024-01-22T09:20:00Z'
          }
        ],
        agents: [
          {
            id: 'agent-login',
            name: 'Login Security Agent',
            type: 'Authentication',
            status: 'active',
            version: '1.5.3',
            description: 'Monitors and analyzes login patterns for security threats'
          },
          {
            id: 'agent-account',
            name: 'Account Security Agent',
            type: 'Account Protection',
            status: 'inactive',
            version: '2.0.0',
            description: 'Provides comprehensive account security analysis and recommendations'
          }
        ]
      },
      '3': {
        id: '3',
        title: 'Identity Verification Fraud',
        status: 'completed' as const,
        priority: 'low' as const,
        created_at: '2024-01-21T14:45:00Z',
        description: 'Fraudulent documents submitted during KYC process detected by AI verification system.',
        evidence: [
          'Document authenticity scan showing 95% forgery probability',
          'Cross-reference check failed against government databases',
          'Image metadata analysis revealing digital manipulation'
        ],
        timeline: [
          {
            timestamp: '2024-01-21T14:45:00Z',
            action: 'Investigation Created',
            details: 'KYC verification system flagged submitted documents'
          },
          {
            timestamp: '2024-01-21T15:30:00Z',
            action: 'Document Analysis',
            details: 'AI verification confirmed document forgery with high confidence'
          },
          {
            timestamp: '2024-01-21T16:00:00Z',
            action: 'Investigation Closed',
            details: 'Account suspended and case referred to legal team'
          }
        ],
        steps: [
          {
            id: 'step-1',
            name: 'Document Upload',
            description: 'Processing uploaded identity documents',
            status: 'completed',
            order_index: 0,
            execution_time: 500
          },
          {
            id: 'step-2',
            name: 'AI Document Verification',
            description: 'Running AI models to detect document authenticity',
            status: 'completed',
            order_index: 1,
            execution_time: 2800
          },
          {
            id: 'step-3',
            name: 'Database Cross-Check',
            description: 'Verifying against government databases',
            status: 'completed',
            order_index: 2,
            execution_time: 5400
          },
          {
            id: 'step-4',
            name: 'Metadata Analysis',
            description: 'Analyzing image metadata for manipulation signs',
            status: 'completed',
            order_index: 3,
            execution_time: 1200
          },
          {
            id: 'step-5',
            name: 'Case Resolution',
            description: 'Account suspension and legal referral',
            status: 'completed',
            order_index: 4,
            execution_time: 300
          }
        ],
        agentResults: [
          {
            id: 'result-4',
            agent_id: 'agent-document',
            step_id: 'step-2',
            data: {
              forgery_probability: 0.95,
              document_type: 'passport',
              inconsistencies: ['font_mismatch', 'seal_anomaly', 'paper_texture'],
              government_db_match: false
            },
            findings: [
              'Document shows clear signs of digital manipulation',
              'Passport number not found in government database',
              'Security features do not match authentic documents'
            ],
            risk_score: 96,
            confidence: 98,
            execution_time: 3400,
            created_at: '2024-01-21T15:35:00Z'
          },
          {
            id: 'result-5',
            agent_id: 'agent-metadata',
            step_id: 'step-4',
            data: {
              creation_software: 'Photoshop CS6',
              edit_count: 23,
              compression_artifacts: true,
              timestamp_modified: true
            },
            findings: [
              'Multiple editing sessions detected in image metadata',
              'Professional photo editing software used',
              'Original timestamp has been altered'
            ],
            risk_score: 89,
            confidence: 91,
            execution_time: 800,
            created_at: '2024-01-21T15:50:00Z'
          }
        ],
        agents: [
          {
            id: 'agent-document',
            name: 'Document Verification Agent',
            type: 'Identity Verification',
            status: 'active',
            version: '4.2.1',
            description: 'AI-powered document authenticity verification and fraud detection'
          },
          {
            id: 'agent-metadata',
            name: 'Metadata Analysis Agent',
            type: 'Digital Forensics',
            status: 'active',
            version: '2.3.0',
            description: 'Analyzes image and document metadata for manipulation detection'
          }
        ]
      }
    };
    return id ? investigations[id as keyof typeof investigations] : null;
  }, [id]);

  if (!investigation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Investigation Not Found</h2>
          <p className="text-gray-600 mb-4">The investigation with ID "{id}" could not be found.</p>
          <button
            onClick={() => navigate('/investigations')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: Investigation['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: Investigation['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/investigations')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="text-xl">←</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{investigation.title}</h1>
              <p className="text-gray-600">Investigation #{investigation.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(investigation.status)}`}>
              {investigation.status}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(investigation.priority)}`}>
              {investigation.priority} priority
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
              <p className="text-gray-700">{investigation.description}</p>
            </div>

            {/* Investigation Steps */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Investigation Steps</h2>
              <SimpleStepTracker
                steps={investigation.steps}
                currentStepId={investigation.steps.find(s => s.status === 'running')?.id}
                layout="vertical"
                showProgress={true}
              />
            </div>

            {/* Evidence */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Evidence</h2>
              <div className="space-y-3">
                {investigation.evidence.map((item, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-sm font-medium">{index + 1}</span>
                    </div>
                    <p className="text-gray-700">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Agent Results */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Agent Analysis Results</h2>
              <SimpleAgentResultsViewer
                agentResults={investigation.agentResults}
                agents={investigation.agents}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Investigation Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Investigation Info</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <p className="text-gray-900">{new Date(investigation.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="text-gray-900 capitalize">{investigation.status}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Priority</label>
                  <p className="text-gray-900 capitalize">{investigation.priority}</p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
              <div className="space-y-4">
                {investigation.timeline.map((event, index) => (
                  <div key={index} className="relative">
                    <div className="flex items-start gap-3">
                      <div className="w-3 h-3 bg-blue-600 rounded-full flex-shrink-0 mt-2"></div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{event.action}</p>
                        <p className="text-sm text-gray-600 mt-1">{event.details}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(event.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {index < investigation.timeline.length - 1 && (
                      <div className="absolute left-1.5 top-6 w-0.5 h-8 bg-gray-200"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
              <div className="space-y-2">
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Update Status
                </button>
                <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  Add Evidence
                </button>
                <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  Generate Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestigationDetailView;