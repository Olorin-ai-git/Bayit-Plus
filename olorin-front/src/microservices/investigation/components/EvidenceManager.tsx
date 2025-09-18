import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  DocumentIcon,
  PhotoIcon,
  VideoCameraIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  EyeIcon,
  PencilIcon,
  TagIcon,
  CalendarIcon,
  UserIcon,
  FolderOpenIcon,
} from '@heroicons/react/24/outline';

interface Evidence {
  id: string;
  name: string;
  type: 'document' | 'image' | 'video' | 'log' | 'screenshot' | 'other';
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  description?: string;
  tags: string[];
  category: string;
  fileUrl?: string;
  metadata?: {
    originalName?: string;
    mimeType?: string;
    checksum?: string;
  };
}

interface EvidenceManagerProps {
  investigationId?: string;
  className?: string;
  onEvidenceUpdate?: (evidence: Evidence[]) => void;
}

const EvidenceManager: React.FC<EvidenceManagerProps> = ({
  investigationId = 'inv-001',
  className = "",
  onEvidenceUpdate
}) => {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);

  // Mock data for demonstration
  useEffect(() => {
    const mockEvidence: Evidence[] = [
      {
        id: 'ev-001',
        name: 'suspicious_transaction_log.csv',
        type: 'document',
        size: 1024000,
        uploadedAt: new Date(Date.now() - 3600000).toISOString(),
        uploadedBy: 'analyst@company.com',
        description: 'Transaction logs showing unusual payment patterns',
        tags: ['suspicious', 'transactions', 'high-priority'],
        category: 'Financial Records',
        metadata: {
          originalName: 'suspicious_transaction_log.csv',
          mimeType: 'text/csv',
          checksum: 'sha256:abc123...'
        }
      },
      {
        id: 'ev-002',
        name: 'device_fingerprint_screenshot.png',
        type: 'screenshot',
        size: 512000,
        uploadedAt: new Date(Date.now() - 7200000).toISOString(),
        uploadedBy: 'security@company.com',
        description: 'Screenshot of device fingerprint analysis results',
        tags: ['device', 'fingerprint', 'analysis'],
        category: 'Technical Evidence',
        metadata: {
          originalName: 'device_fingerprint_screenshot.png',
          mimeType: 'image/png',
          checksum: 'sha256:def456...'
        }
      },
      {
        id: 'ev-003',
        name: 'user_activity_video.mp4',
        type: 'video',
        size: 25600000,
        uploadedAt: new Date(Date.now() - 10800000).toISOString(),
        uploadedBy: 'investigator@company.com',
        description: 'Screen recording of suspicious user activity',
        tags: ['user-activity', 'screen-recording'],
        category: 'Behavioral Evidence',
        metadata: {
          originalName: 'user_activity_video.mp4',
          mimeType: 'video/mp4',
          checksum: 'sha256:ghi789...'
        }
      }
    ];

    setEvidence(mockEvidence);
    if (onEvidenceUpdate) {
      onEvidenceUpdate(mockEvidence);
    }
  }, [onEvidenceUpdate]);

  const getTypeIcon = (type: Evidence['type']) => {
    switch (type) {
      case 'document':
        return <DocumentIcon className="h-5 w-5 text-blue-500" />;
      case 'image':
      case 'screenshot':
        return <PhotoIcon className="h-5 w-5 text-green-500" />;
      case 'video':
        return <VideoCameraIcon className="h-5 w-5 text-purple-500" />;
      case 'log':
        return <FolderOpenIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <DocumentIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const filteredEvidence = evidence.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesType = selectedType === 'all' || item.type === selectedType;

    return matchesSearch && matchesCategory && matchesType;
  });

  const categories = Array.from(new Set(evidence.map(item => item.category)));
  const types = Array.from(new Set(evidence.map(item => item.type)));

  const handleDownload = (evidenceItem: Evidence) => {
    console.log('Download evidence:', evidenceItem.id);
    // Implementation would handle actual file download
  };

  const handleDelete = (evidenceId: string) => {
    setEvidence(prev => prev.filter(item => item.id !== evidenceId));
  };

  const handleView = (evidenceItem: Evidence) => {
    setSelectedEvidence(evidenceItem);
  };

  const handleUpload = () => {
    setShowUploadModal(true);
  };

  return (
    <div className={`evidence-manager p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Evidence Manager</h2>
          <p className="text-sm text-gray-600">Manage investigation evidence and artifacts</p>
        </div>
        <button
          onClick={handleUpload}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Upload Evidence
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search evidence..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Types</option>
            {types.map(type => (
              <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Evidence List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Evidence ({filteredEvidence.length})
          </h3>
        </div>

        {filteredEvidence.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {filteredEvidence.map(item => (
              <div key={item.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      {getTypeIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {item.name}
                      </h4>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center">
                          <TagIcon className="h-3 w-3 mr-1" />
                          {item.category}
                        </span>
                        <span className="flex items-center">
                          <UserIcon className="h-3 w-3 mr-1" />
                          {item.uploadedBy}
                        </span>
                        <span className="flex items-center">
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          {formatDate(item.uploadedAt)}
                        </span>
                        <span>{formatFileSize(item.size)}</span>
                      </div>
                      {item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.tags.map(tag => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleView(item)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="View"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDownload(item)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                      title="Download"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                    </button>
                    <button
                      className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded"
                      title="Edit"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center">
            <DocumentIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No evidence found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedCategory !== 'all' || selectedType !== 'all'
                ? 'Try adjusting your search criteria or filters.'
                : 'Upload evidence files to get started with your investigation.'}
            </p>
            <button
              onClick={handleUpload}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Upload First Evidence
            </button>
          </div>
        )}
      </div>

      {/* Evidence Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-center">
            <p className="text-sm font-medium text-blue-700">Total Files</p>
            <p className="text-2xl font-semibold text-gray-900">{evidence.length}</p>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-center">
            <p className="text-sm font-medium text-green-700">Total Size</p>
            <p className="text-2xl font-semibold text-gray-900">
              {formatFileSize(evidence.reduce((acc, item) => acc + item.size, 0))}
            </p>
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-center">
            <p className="text-sm font-medium text-purple-700">Categories</p>
            <p className="text-2xl font-semibold text-gray-900">{categories.length}</p>
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-center">
            <p className="text-sm font-medium text-yellow-700">File Types</p>
            <p className="text-2xl font-semibold text-gray-900">{types.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvidenceManager;