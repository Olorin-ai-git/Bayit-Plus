import React, { useState, useEffect } from 'react';
import { FileText, Download, Search, Filter, Calendar, MoreVertical, Eye, Edit, Trash2 } from 'lucide-react';

interface Report {
  id: string;
  name: string;
  type: 'investigation' | 'risk-assessment' | 'compliance' | 'audit';
  format: 'pdf' | 'docx' | 'html';
  status: 'draft' | 'published' | 'archived';
  investigationId?: string;
  createdAt: string;
  lastModified: string;
  author: string;
  size: string;
  downloadCount: number;
}

interface ReportDashboardProps {
  className?: string;
  onCreateReport?: () => void;
  onEditReport?: (reportId: string) => void;
  onViewReport?: (reportId: string) => void;
  onDeleteReport?: (reportId: string) => void;
}

const ReportDashboard: React.FC<ReportDashboardProps> = ({
  className = '',
  onCreateReport,
  onEditReport,
  onViewReport,
  onDeleteReport,
}) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(true);

  // Mock data for demonstration
  useEffect(() => {
    const loadReports = async () => {
      setIsLoading(true);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockReports: Report[] = [
        {
          id: '1',
          name: 'Account Takeover Investigation Report',
          type: 'investigation',
          format: 'pdf',
          status: 'published',
          investigationId: 'INV-2024-001',
          createdAt: '2024-01-15T10:30:00Z',
          lastModified: '2024-01-15T14:45:00Z',
          author: 'Sarah Johnson',
          size: '2.1 MB',
          downloadCount: 23,
        },
        {
          id: '2',
          name: 'Risk Assessment Summary Q1 2024',
          type: 'risk-assessment',
          format: 'pdf',
          status: 'published',
          createdAt: '2024-01-10T09:15:00Z',
          lastModified: '2024-01-12T16:20:00Z',
          author: 'Mike Chen',
          size: '1.8 MB',
          downloadCount: 45,
        },
        {
          id: '3',
          name: 'Device Spoofing Analysis Draft',
          type: 'investigation',
          format: 'docx',
          status: 'draft',
          investigationId: 'INV-2024-002',
          createdAt: '2024-01-08T13:20:00Z',
          lastModified: '2024-01-08T15:30:00Z',
          author: 'Alex Rodriguez',
          size: '945 KB',
          downloadCount: 0,
        },
        {
          id: '4',
          name: 'Compliance Audit Report 2023',
          type: 'compliance',
          format: 'pdf',
          status: 'archived',
          createdAt: '2023-12-20T08:45:00Z',
          lastModified: '2023-12-22T11:15:00Z',
          author: 'Jennifer Lee',
          size: '3.2 MB',
          downloadCount: 67,
        },
      ];

      setReports(mockReports);
      setFilteredReports(mockReports);
      setIsLoading(false);
    };

    loadReports();
  }, []);

  // Filter and sort reports
  useEffect(() => {
    let filtered = [...reports];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(report =>
        report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.investigationId?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(report => report.type === selectedType);
    }

    // Apply status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(report => report.status === selectedStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'date':
          aValue = new Date(a.lastModified).getTime();
          bValue = new Date(b.lastModified).getTime();
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredReports(filtered);
  }, [reports, searchTerm, selectedType, selectedStatus, sortBy, sortOrder]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'investigation':
        return '🔍';
      case 'risk-assessment':
        return '⚠️';
      case 'compliance':
        return '✅';
      case 'audit':
        return '📊';
      default:
        return '📄';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleExport = (report: Report) => {
    // In production, this would trigger actual file download
    console.log(`Downloading report: ${report.name} (${report.format.toUpperCase()})`);

    // Update download count
    setReports(prev => prev.map(r =>
      r.id === report.id ? { ...r, downloadCount: r.downloadCount + 1 } : r
    ));
  };

  const reportTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'investigation', label: 'Investigation' },
    { value: 'risk-assessment', label: 'Risk Assessment' },
    { value: 'compliance', label: 'Compliance' },
    { value: 'audit', label: 'Audit' },
  ];

  const reportStatuses = [
    { value: 'all', label: 'All Status' },
    { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Draft' },
    { value: 'archived', label: 'Archived' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Reports Dashboard</h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage and export investigation reports
            </p>
          </div>
          <button
            onClick={onCreateReport}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Create Report</span>
          </button>
        </div>

        {/* Filters and Search */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            {reportTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            {reportStatuses.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>

          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [newSortBy, newSortOrder] = e.target.value.split('-');
              setSortBy(newSortBy as 'name' | 'date' | 'type');
              setSortOrder(newSortOrder as 'asc' | 'desc');
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="type-asc">Type A-Z</option>
          </select>
        </div>
      </div>

      {/* Reports List */}
      <div className="divide-y divide-gray-200">
        {filteredReports.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedType !== 'all' || selectedStatus !== 'all'
                ? 'Try adjusting your filters or search terms.'
                : 'Create your first report to get started.'}
            </p>
            {onCreateReport && (
              <button
                onClick={onCreateReport}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Create Report
              </button>
            )}
          </div>
        ) : (
          filteredReports.map((report) => (
            <div key={report.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="text-2xl">{getTypeIcon(report.type)}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {report.name}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full uppercase">
                        {report.format}
                      </span>
                    </div>

                    <div className="flex items-center space-x-6 text-sm text-gray-600">
                      <span>Author: {report.author}</span>
                      <span>Size: {report.size}</span>
                      <span>Downloads: {report.downloadCount}</span>
                      {report.investigationId && (
                        <span>Investigation: {report.investigationId}</span>
                      )}
                    </div>

                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>Created: {formatDate(report.createdAt)}</span>
                      <span>Modified: {formatDate(report.lastModified)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => onViewReport?.(report.id)}
                    className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View</span>
                  </button>

                  {report.status === 'draft' && (
                    <button
                      onClick={() => onEditReport?.(report.id)}
                      className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleExport(report)}
                    className="flex items-center space-x-1 px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>

                  <div className="relative">
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Showing {filteredReports.length} of {reports.length} reports
          </span>
          <span>
            Total downloads: {reports.reduce((sum, report) => sum + report.downloadCount, 0)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ReportDashboard;