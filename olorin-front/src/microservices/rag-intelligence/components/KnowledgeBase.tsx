import React, { useState, useMemo } from 'react';
import {
  KnowledgeBase as KnowledgeBaseType,
  Document,
  KnowledgeBaseCategory,
  KnowledgeBasePermission,
  DocumentCategory
} from '../types/ragIntelligence';

interface KnowledgeBaseProps {
  knowledgeBases: KnowledgeBaseType[];
  onCreateKnowledgeBase?: (knowledgeBase: Omit<KnowledgeBaseType, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateKnowledgeBase?: (id: string, updates: Partial<KnowledgeBaseType>) => Promise<void>;
  onDeleteKnowledgeBase?: (id: string) => Promise<void>;
  onAddDocument?: (knowledgeBaseId: string, file: File) => Promise<void>;
  onRemoveDocument?: (knowledgeBaseId: string, documentId: string) => Promise<void>;
  onUpdatePermissions?: (knowledgeBaseId: string, permissions: KnowledgeBasePermission[]) => Promise<void>;
  currentUserId?: string;
  isLoading?: boolean;
  className?: string;
}

interface CreateKnowledgeBaseForm {
  name: string;
  description: string;
  category: KnowledgeBaseCategory;
  chunkSize: number;
  chunkOverlap: number;
  embeddingModel: string;
  autoUpdate: boolean;
  accessLogging: boolean;
  versioning: boolean;
}

export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({
  knowledgeBases,
  onCreateKnowledgeBase,
  onUpdateKnowledgeBase,
  onDeleteKnowledgeBase,
  onAddDocument,
  onRemoveDocument,
  onUpdatePermissions,
  currentUserId = 'current-user',
  isLoading = false,
  className = ''
}) => {
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'settings' | 'permissions' | 'analytics'>('overview');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<KnowledgeBaseCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'updated' | 'size' | 'documents'>('updated');

  const [createForm, setCreateForm] = useState<CreateKnowledgeBaseForm>({
    name: '',
    description: '',
    category: 'fraud_detection',
    chunkSize: 1000,
    chunkOverlap: 200,
    embeddingModel: 'text-embedding-ada-002',
    autoUpdate: true,
    accessLogging: true,
    versioning: true
  });

  // Filter and sort knowledge bases
  const filteredKnowledgeBases = useMemo(() => {
    let filtered = knowledgeBases.filter(kb => {
      const matchesSearch = !searchQuery ||
        kb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kb.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === 'all' || kb.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'size':
          return b.totalSize - a.totalSize;
        case 'documents':
          return b.totalDocuments - a.totalDocuments;
        default:
          return 0;
      }
    });
  }, [knowledgeBases, searchQuery, categoryFilter, sortBy]);

  const selectedKb = useMemo(() => {
    return knowledgeBases.find(kb => kb.id === selectedKnowledgeBase) || null;
  }, [knowledgeBases, selectedKnowledgeBase]);

  const handleCreateKnowledgeBase = async () => {
    if (!onCreateKnowledgeBase || !createForm.name.trim()) return;

    try {
      const newKnowledgeBase = {
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        category: createForm.category,
        documents: [],
        totalDocuments: 0,
        totalChunks: 0,
        totalSize: 0,
        status: 'active' as const,
        settings: {
          chunkSize: createForm.chunkSize,
          chunkOverlap: createForm.chunkOverlap,
          embeddingModel: createForm.embeddingModel,
          indexingStrategy: 'immediate' as const,
          autoUpdate: createForm.autoUpdate,
          retentionPolicy: {
            enabled: false,
            maxAge: 365,
            maxDocuments: 10000
          },
          accessLogging: createForm.accessLogging,
          versioning: createForm.versioning
        },
        statistics: {
          documentsAdded: 0,
          documentsRemoved: 0,
          totalQueries: 0,
          averageQueryTime: 0,
          popularDocuments: [],
          popularQueries: [],
          lastIndexed: new Date().toISOString(),
          indexSize: 0,
          errorRate: 0
        },
        createdBy: currentUserId,
        permissions: [{
          userId: currentUserId,
          role: 'admin' as const,
          permissions: ['read', 'write', 'delete', 'manage'],
          grantedAt: new Date().toISOString(),
          grantedBy: currentUserId
        }]
      };

      await onCreateKnowledgeBase(newKnowledgeBase);
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        description: '',
        category: 'fraud_detection',
        chunkSize: 1000,
        chunkOverlap: 200,
        embeddingModel: 'text-embedding-ada-002',
        autoUpdate: true,
        accessLogging: true,
        versioning: true
      });
    } catch (error) {
      console.error('Error creating knowledge base:', error);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !selectedKnowledgeBase || !onAddDocument) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        await onAddDocument(selectedKnowledgeBase, file);
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
      }
    }

    setShowUploadModal(false);
  };

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'updating': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderKnowledgeBaseGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredKnowledgeBases.map((kb) => (
        <div
          key={kb.id}
          onClick={() => setSelectedKnowledgeBase(kb.id)}
          className={`bg-white rounded-lg border p-6 cursor-pointer transition-all hover:shadow-md ${
            selectedKnowledgeBase === kb.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{kb.name}</h3>
              <p className="text-sm text-gray-600 line-clamp-2">{kb.description}</p>
            </div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(kb.status)}`}>
              {kb.status}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Documents:</span>
              <span className="font-medium">{kb.totalDocuments.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Size:</span>
              <span className="font-medium">{formatFileSize(kb.totalSize)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Category:</span>
              <span className="font-medium capitalize">{kb.category.replace('_', ' ')}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Last Updated:</span>
              <span className="font-medium">{new Date(kb.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {kb.statistics.totalQueries} queries
              </div>
              <div className="text-xs text-gray-500">
                {kb.statistics.averageQueryTime.toFixed(0)}ms avg
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderKnowledgeBaseDetails = () => {
    if (!selectedKb) return null;

    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{selectedKb.name}</h2>
              <p className="text-sm text-gray-600 mt-1">{selectedKb.description}</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedKb.status)}`}>
                {selectedKb.status}
              </span>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Add Documents
              </button>
            </div>
          </div>

          <div className="flex space-x-6 mt-4">
            {(['overview', 'documents', 'settings', 'permissions', 'analytics'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 px-1 text-sm font-medium capitalize border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'documents' && renderDocuments()}
          {activeTab === 'settings' && renderSettings()}
          {activeTab === 'permissions' && renderPermissions()}
          {activeTab === 'analytics' && renderAnalytics()}
        </div>
      </div>
    );
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{selectedKb!.totalDocuments}</div>
          <div className="text-sm text-gray-600">Total Documents</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{selectedKb!.totalChunks.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Total Chunks</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{formatFileSize(selectedKb!.totalSize)}</div>
          <div className="text-sm text-gray-600">Total Size</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Documents added</span>
              <span className="text-sm font-medium">{selectedKb!.statistics.documentsAdded}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Total queries</span>
              <span className="text-sm font-medium">{selectedKb!.statistics.totalQueries}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Average query time</span>
              <span className="text-sm font-medium">{selectedKb!.statistics.averageQueryTime.toFixed(0)}ms</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Popular Documents</h3>
          <div className="space-y-2">
            {selectedKb!.statistics.popularDocuments.slice(0, 5).map((docId, index) => {
              const doc = selectedKb!.documents.find(d => d.id === docId);
              return (
                <div key={docId} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <span className="text-sm text-gray-900 truncate">
                    {doc?.title || `Document ${index + 1}`}
                  </span>
                  <span className="text-xs text-gray-500">{doc?.accessCount || 0} views</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  const renderDocuments = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Documents ({selectedKb!.documents.length})</h3>
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Upload Documents
        </button>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Document
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Added
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {selectedKb!.documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{doc.title}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">{doc.summary}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 uppercase">
                    {doc.metadata.fileType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatFileSize(doc.metadata.fileSize)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      doc.status === 'indexed' ? 'bg-green-100 text-green-800' :
                      doc.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                      doc.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => onRemoveDocument?.(selectedKb!.id, doc.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Knowledge Base Settings</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Chunk Size</label>
            <input
              type="number"
              value={selectedKb!.settings.chunkSize}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Chunk Overlap</label>
            <input
              type="number"
              value={selectedKb!.settings.chunkOverlap}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Embedding Model</label>
            <input
              type="text"
              value={selectedKb!.settings.embeddingModel}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              readOnly
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={selectedKb!.settings.autoUpdate}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              readOnly
            />
            <label className="ml-2 block text-sm text-gray-900">Auto Update</label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={selectedKb!.settings.accessLogging}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              readOnly
            />
            <label className="ml-2 block text-sm text-gray-900">Access Logging</label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={selectedKb!.settings.versioning}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              readOnly
            />
            <label className="ml-2 block text-sm text-gray-900">Versioning</label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPermissions = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Permissions</h3>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
          Add User
        </button>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Permissions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Granted
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {selectedKb!.permissions.map((permission, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {permission.userId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                  {permission.role}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {permission.permissions.join(', ')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(permission.grantedAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button className="text-blue-600 hover:text-blue-900 mr-2">Edit</button>
                  <button className="text-red-600 hover:text-red-900">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Analytics</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{selectedKb!.statistics.totalQueries}</div>
          <div className="text-sm text-gray-600">Total Queries</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{selectedKb!.statistics.averageQueryTime.toFixed(0)}ms</div>
          <div className="text-sm text-gray-600">Avg Query Time</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{selectedKb!.statistics.errorRate.toFixed(1)}%</div>
          <div className="text-sm text-gray-600">Error Rate</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{formatFileSize(selectedKb!.statistics.indexSize)}</div>
          <div className="text-sm text-gray-600">Index Size</div>
        </div>
      </div>

      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">Popular Queries</h4>
        <div className="space-y-2">
          {selectedKb!.statistics.popularQueries.slice(0, 10).map((query, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-900">{query}</span>
              <span className="text-xs text-gray-500">#{index + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className={`animate-pulse space-y-6 ${className}`}>
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="grid grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-48"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Bases</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your document collections and RAG knowledge bases
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Create Knowledge Base
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search knowledge bases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as any)}
          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="all">All Categories</option>
          <option value="fraud_detection">Fraud Detection</option>
          <option value="investigation_procedures">Investigation Procedures</option>
          <option value="compliance">Compliance</option>
          <option value="training">Training</option>
          <option value="reference">Reference</option>
          <option value="external">External</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="updated">Last Updated</option>
          <option value="name">Name</option>
          <option value="size">Size</option>
          <option value="documents">Documents</option>
        </select>
      </div>

      {/* Knowledge Base Grid */}
      {!selectedKnowledgeBase && renderKnowledgeBaseGrid()}

      {/* Knowledge Base Details */}
      {selectedKnowledgeBase && (
        <div className="space-y-6">
          <button
            onClick={() => setSelectedKnowledgeBase(null)}
            className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
          >
            ← Back to Knowledge Bases
          </button>
          {renderKnowledgeBaseDetails()}
        </div>
      )}

      {/* Create Knowledge Base Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create Knowledge Base</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={createForm.category}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, category: e.target.value as KnowledgeBaseCategory }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="fraud_detection">Fraud Detection</option>
                  <option value="investigation_procedures">Investigation Procedures</option>
                  <option value="compliance">Compliance</option>
                  <option value="training">Training</option>
                  <option value="reference">Reference</option>
                  <option value="external">External</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateKnowledgeBase}
                disabled={!createForm.name.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Documents</h3>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.txt,.md,.json,.csv"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="text-gray-600">
                  <p className="text-sm">Click to upload or drag and drop</p>
                  <p className="text-xs mt-1">PDF, DOCX, TXT, MD, JSON, CSV</p>
                </div>
              </label>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;