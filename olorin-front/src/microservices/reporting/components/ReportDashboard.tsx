import React, { useState, useEffect, useCallback } from 'react';
import {
  Report,
  ReportAnalytics,
  ReportStatus,
  ReportTemplate,
  ReportGeneration
} from '../types/reporting';

interface ReportDashboardProps {
  reports?: Report[];
  analytics?: ReportAnalytics;
  templates?: ReportTemplate[];
  onCreateReport?: () => void;
  onEditReport?: (report: Report) => void;
  onDeleteReport?: (reportId: string) => void;
  onGenerateReport?: (reportId: string) => void;
  onViewReport?: (report: Report) => void;
  onDuplicateReport?: (report: Report) => void;
  className?: string;
}

const ReportDashboard: React.FC<ReportDashboardProps> = ({
  reports = [],
  analytics,
  templates = [],
  onCreateReport,
  onEditReport,
  onDeleteReport,
  onGenerateReport,
  onViewReport,
  onDuplicateReport,
  className
}) => {
  const [selectedTab, setSelectedTab] = useState<'reports' | 'analytics' | 'templates'>('reports');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'updated' | 'status'>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedReports, setSelectedReports] = useState<string[]>([]);

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'created':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'updated':
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const getStatusColor = (status: ReportStatus) => {
    switch (status) {
      case 'ready': return 'bg-green-100 text-green-800';
      case 'generating': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'archived': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: ReportStatus) => {
    switch (status) {
      case 'ready':
        return (
          <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'generating':
        return (
          <svg className="h-4 w-4 text-yellow-600 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  const handleSelectReport = (reportId: string, selected: boolean) => {
    setSelectedReports(prev =>
      selected
        ? [...prev, reportId]
        : prev.filter(id => id !== reportId)
    );
  };

  const handleSelectAllReports = (selected: boolean) => {
    setSelectedReports(selected ? filteredReports.map(r => r.id) : []);
  };

  const handleBulkAction = (action: 'delete' | 'archive' | 'generate') => {
    // TODO: Implement bulk actions
    console.log(`Bulk ${action} for reports:`, selectedReports);
    setSelectedReports([]);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderReportsTab = () => (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ReportStatus | 'all')}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="ready">Ready</option>
            <option value="generating">Generating</option>
            <option value="failed">Failed</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={`${sortBy}_${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('_');
              setSortBy(field as any);
              setSortOrder(order as any);
            }}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="updated_desc">Recently Updated</option>
            <option value="updated_asc">Least Recently Updated</option>
            <option value="created_desc">Recently Created</option>
            <option value="created_asc">Oldest First</option>
            <option value="name_asc">Name A-Z</option>
            <option value="name_desc">Name Z-A</option>
          </select>
          <button
            onClick={onCreateReport}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Report
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedReports.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedReports.length} report{selectedReports.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction('generate')}
                className="inline-flex items-center px-3 py-1 border border-blue-300 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50"
              >
                Generate
              </button>
              <button
                onClick={() => handleBulkAction('archive')}
                className="inline-flex items-center px-3 py-1 border border-blue-300 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50"
              >
                Archive
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="inline-flex items-center px-3 py-1 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reports List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={selectedReports.length === filteredReports.length && filteredReports.length > 0}
              onChange={(e) => handleSelectAllReports(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-3 text-sm font-medium text-gray-900">
              {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <ul className="divide-y divide-gray-200">
          {filteredReports.map((report) => (
            <li key={report.id} className="px-4 py-4 hover:bg-gray-50">
              <div className="flex items-center space-x-4">
                <input
                  type="checkbox"
                  checked={selectedReports.includes(report.id)}
                  onChange={(e) => handleSelectReport(report.id, e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(report.status)}
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {report.name}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {report.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                      {report.isScheduled && (
                        <span className="inline-flex items-center text-xs text-green-600">
                          <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Scheduled
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-4">
                      <span>Updated {formatDate(report.updatedAt)}</span>
                      <span>by {report.createdBy}</span>
                      {report.lastGeneration && (
                        <span>
                          Last generated {formatDate(report.lastGeneration.completedAt || report.lastGeneration.startedAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onViewReport?.(report)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </button>
                      <button
                        onClick={() => onEditReport?.(report)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDuplicateReport?.(report)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => onGenerateReport?.(report.id)}
                        disabled={report.status === 'generating'}
                        className="text-green-600 hover:text-green-900 disabled:opacity-50"
                      >
                        Generate
                      </button>
                      <button
                        onClick={() => onDeleteReport?.(report.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {filteredReports.length === 0 && (
          <div className="px-4 py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No reports found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'Get started by creating a new report.'
              }
            </p>
            {(!searchTerm && statusFilter === 'all') && (
              <div className="mt-6">
                <button
                  onClick={onCreateReport}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Report
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      {analytics ? (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Reports</dt>
                      <dd className="text-lg font-medium text-gray-900">{analytics.totalReports}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Generations Today</dt>
                      <dd className="text-lg font-medium text-gray-900">{analytics.generationsToday}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Avg Generation Time</dt>
                      <dd className="text-lg font-medium text-gray-900">{analytics.averageGenerationTime}s</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Success Rate</dt>
                      <dd className="text-lg font-medium text-gray-900">{(analytics.successRate * 100).toFixed(1)}%</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Popular Templates</h3>
              <div className="space-y-3">
                {analytics.popularTemplates.slice(0, 5).map((template, index) => (
                  <div key={template.templateId} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900 w-4">{index + 1}.</span>
                      <span className="text-sm text-gray-700 ml-2">{template.templateName}</span>
                    </div>
                    <span className="text-sm text-gray-500">{template.usageCount} uses</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Format Distribution</h3>
              <div className="space-y-3">
                {analytics.formatDistribution.map((format) => (
                  <div key={format.format} className="flex items-center">
                    <span className="text-sm font-medium text-gray-900 w-12 uppercase">{format.format}</span>
                    <div className="flex-1 mx-3">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${format.percentage}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">{format.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No analytics available</h3>
          <p className="mt-1 text-sm text-gray-500">Analytics data will appear here once reports are generated.</p>
        </div>
      )}
    </div>
  );

  const renderTemplatesTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div key={template.id} className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${template.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {template.isPublic ? 'Public' : 'Private'}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-4">{template.description}</p>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{template.sections.length} sections</span>
              <span>{template.dataSources.length} data sources</span>
            </div>
            <div className="mt-4 flex justify-between">
              <span className="text-xs text-gray-500">
                Updated {formatDate(template.updatedAt)}
              </span>
              <button
                onClick={() => {
                  // TODO: Create report from template
                  console.log('Create from template:', template.id);
                }}
                className="text-sm text-blue-600 hover:text-blue-900 font-medium"
              >
                Use Template
              </button>
            </div>
          </div>
        ))}
      </div>
      {templates.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No templates available</h3>
          <p className="mt-1 text-sm text-gray-500">Report templates will appear here.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className={`${className || ''}`}>
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
              <p className="mt-1 text-sm text-gray-500">
                Create, manage, and schedule reports for fraud investigations
              </p>
            </div>
            <button
              onClick={onCreateReport}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Report
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'reports', label: 'Reports', count: reports.length },
              { id: 'analytics', label: 'Analytics' },
              { id: 'templates', label: 'Templates', count: templates.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  selectedTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                    selectedTab === tab.id
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {selectedTab === 'reports' && renderReportsTab()}
        {selectedTab === 'analytics' && renderAnalyticsTab()}
        {selectedTab === 'templates' && renderTemplatesTab()}
      </div>
    </div>
  );
};

export default ReportDashboard;