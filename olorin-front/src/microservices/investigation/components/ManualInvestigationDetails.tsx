import React, { useState } from 'react';
import {
  DocumentTextIcon,
  UserIcon,
  CalendarIcon,
  TagIcon,
  ClockIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

interface Evidence {
  id: string;
  type: 'document' | 'screenshot' | 'log' | 'note' | 'attachment';
  title: string;
  description: string;
  addedBy: string;
  addedAt: string;
  size?: string;
  tags: string[];
}

interface InvestigationNote {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  updatedAt?: string;
}

interface ManualInvestigationDetailsProps {
  investigationId?: string;
  className?: string;
}

const ManualInvestigationDetails: React.FC<ManualInvestigationDetailsProps> = ({
  investigationId = 'manual-001',
  className = ""
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'notes' | 'timeline'>('overview');
  const [evidence] = useState<Evidence[]>([
    {
      id: 'ev-001',
      type: 'document',
      title: 'Transaction Log Export',
      description: 'Suspicious transaction patterns from user account',
      addedBy: 'John Investigator',
      addedAt: new Date(Date.now() - 3600000).toISOString(),
      size: '2.4 MB',
      tags: ['transactions', 'suspicious', 'export']
    },
    {
      id: 'ev-002',
      type: 'screenshot',
      title: 'Login Attempt Screenshot',
      description: 'Screenshot of failed login attempts from unusual location',
      addedBy: 'Sarah Analyst',
      addedAt: new Date(Date.now() - 7200000).toISOString(),
      size: '1.1 MB',
      tags: ['login', 'geolocation', 'security']
    },
    {
      id: 'ev-003',
      type: 'note',
      title: 'Initial Assessment',
      description: 'Preliminary findings and recommendations for further investigation',
      addedBy: 'Mike Senior',
      addedAt: new Date(Date.now() - 10800000).toISOString(),
      tags: ['assessment', 'preliminary']
    }
  ]);

  const [notes] = useState<InvestigationNote[]>([
    {
      id: 'note-001',
      content: 'Initial investigation reveals multiple failed login attempts from IP addresses in different countries. Recommend immediate account lockdown and further analysis of transaction patterns.',
      author: 'John Investigator',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'note-002',
      content: 'Device fingerprinting shows inconsistencies with user\'s typical devices. Browser characteristics suggest potential device spoofing or account takeover attempt.',
      author: 'Sarah Analyst',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date(Date.now() - 5400000).toISOString(),
    }
  ]);

  const investigation = {
    id: investigationId,
    title: 'Account Takeover Investigation',
    description: 'Manual investigation of suspected account takeover attempt on user account #12345',
    status: 'in-progress',
    priority: 'high',
    assignedTo: 'John Investigator',
    createdBy: 'Security Team',
    createdAt: new Date(Date.now() - 14400000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    dueDate: new Date(Date.now() + 172800000).toISOString(), // 2 days from now
    tags: ['account-takeover', 'high-risk', 'urgent']
  };

  const getEvidenceIcon = (type: Evidence['type']) => {
    switch (type) {
      case 'document':
        return <DocumentTextIcon className="h-5 w-5 text-blue-500" />;
      case 'screenshot':
        return <EyeIcon className="h-5 w-5 text-green-500" />;
      case 'log':
        return <ClockIcon className="h-5 w-5 text-purple-500" />;
      case 'note':
        return <PencilIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <DocumentTextIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'in-progress': { bg: 'bg-blue-100', text: 'text-blue-800' },
      'completed': { bg: 'bg-green-100', text: 'text-green-800' },
      'on-hold': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      'cancelled': { bg: 'bg-gray-100', text: 'text-gray-800' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['in-progress'];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {status.replace('-', ' ').toUpperCase()}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      critical: { bg: 'bg-red-100', text: 'text-red-800' },
      high: { bg: 'bg-orange-100', text: 'text-orange-800' },
      medium: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      low: { bg: 'bg-green-100', text: 'text-green-800' },
    };

    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  return (
    <div className={`manual-investigation-details p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{investigation.title}</h1>
            <p className="text-gray-600 mb-4">{investigation.description}</p>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {getStatusBadge(investigation.status)}
              {getPriorityBadge(investigation.priority)}
              {investigation.tags.map(tag => (
                <span key={tag} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  <TagIcon className="h-3 w-3 mr-1" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex space-x-2">
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit
            </button>
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <UserIcon className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Assigned to:</span>
            <span className="font-medium">{investigation.assignedTo}</span>
          </div>
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Created:</span>
            <span className="font-medium">{new Date(investigation.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center space-x-2">
            <ClockIcon className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Updated:</span>
            <span className="font-medium">{new Date(investigation.updatedAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-4 w-4 text-corporate-error" />
            <span className="text-gray-600">Due:</span>
            <span className="font-medium text-red-600">{new Date(investigation.dueDate).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'evidence', label: `Evidence (${evidence.length})` },
              { id: 'notes', label: `Notes (${notes.length})` },
              { id: 'timeline', label: 'Timeline' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Investigation Summary</h3>
                <div className="prose max-w-none text-gray-600">
                  <p>
                    This investigation was initiated following automated alerts indicating suspicious login activity
                    on user account #12345. The investigation focuses on determining if an account takeover attempt
                    has occurred and assessing the scope of any potential compromise.
                  </p>
                  <p className="mt-4">
                    Key areas of investigation include login patterns, device fingerprinting, transaction analysis,
                    and geolocation verification.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Evidence Collected</h4>
                  <p className="text-2xl font-semibold text-blue-600">{evidence.length}</p>
                  <p className="text-sm text-gray-600">pieces of evidence</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Investigation Notes</h4>
                  <p className="text-2xl font-semibold text-green-600">{notes.length}</p>
                  <p className="text-sm text-gray-600">investigator notes</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Days Active</h4>
                  <p className="text-2xl font-semibold text-purple-600">
                    {Math.floor((Date.now() - new Date(investigation.createdAt).getTime()) / (1000 * 60 * 60 * 24))}
                  </p>
                  <p className="text-sm text-gray-600">days since creation</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'evidence' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Evidence & Attachments</h3>
                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Evidence
                </button>
              </div>

              <div className="space-y-3">
                {evidence.map(item => (
                  <div key={item.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        {getEvidenceIcon(item.type)}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900">{item.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>Added by {item.addedBy}</span>
                            <span>{formatDate(item.addedAt)}</span>
                            {item.size && <span>{item.size}</span>}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.tags.map(tag => (
                              <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button className="text-gray-400 hover:text-gray-600">
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600">
                          <ArrowDownTrayIcon className="h-4 w-4" />
                        </button>
                        <button className="text-corporate-error hover:text-red-600">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Investigation Notes</h3>
                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Note
                </button>
              </div>

              <div className="space-y-4">
                {notes.map(note => (
                  <div key={note.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <UserIcon className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{note.author}</span>
                        <span className="text-sm text-gray-500">{formatDate(note.createdAt)}</span>
                        {note.updatedAt && (
                          <span className="text-xs text-gray-400">(edited {formatDate(note.updatedAt)})</span>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button className="text-gray-400 hover:text-gray-600">
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button className="text-corporate-error hover:text-red-600">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-700">{note.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Investigation Timeline</h3>
              <div className="flow-root">
                <ul className="-mb-8">
                  <li>
                    <div className="relative pb-8">
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="bg-blue-500 h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white">
                            <DocumentTextIcon className="h-4 w-4 text-white" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-500">Investigation created by <span className="font-medium text-gray-900">{investigation.createdBy}</span></p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            {formatDate(investigation.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                  {evidence.map((item, index) => (
                    <li key={item.id}>
                      <div className="relative pb-8">
                        {index < evidence.length - 1 && (
                          <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                        )}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="bg-green-500 h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white">
                              {getEvidenceIcon(item.type)}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-gray-500">
                                Evidence added: <span className="font-medium text-gray-900">{item.title}</span> by {item.addedBy}
                              </p>
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                              {formatDate(item.addedAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManualInvestigationDetails;