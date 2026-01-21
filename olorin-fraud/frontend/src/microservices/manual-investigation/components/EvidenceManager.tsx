import React, { useState, useRef } from 'react';
import {
  Evidence,
  EvidenceType,
  ChainOfCustodyEntry
} from '../types/manualInvestigation';

interface EvidenceManagerProps {
  evidence: Evidence[];
  investigationId: string;
  currentUserId: string;
  currentUserName: string;
  onAddEvidence: (evidence: Omit<Evidence, 'id'>) => void;
  onUpdateEvidence: (evidenceId: string, updates: Partial<Evidence>) => void;
  onVerifyEvidence: (evidenceId: string) => void;
  onDownloadEvidence: (evidenceId: string) => void;
  canAddEvidence: boolean;
  canVerifyEvidence: boolean;
  isLoading?: boolean;
}

interface EvidenceFormData {
  type: EvidenceType;
  title: string;
  description: string;
  file?: File;
  tags: string[];
  relatedStepId?: string;
  metadata: Record<string, any>;
}

const EVIDENCE_TYPES: { value: EvidenceType; label: string; icon: string }[] = [
  { value: 'document', label: 'Document', icon: '📄' },
  { value: 'screenshot', label: 'Screenshot', icon: '📸' },
  { value: 'log_entry', label: 'Log Entry', icon: '📝' },
  { value: 'transaction', label: 'Transaction', icon: '💳' },
  { value: 'communication', label: 'Communication', icon: '💬' },
  { value: 'system_data', label: 'System Data', icon: '🗃️' },
  { value: 'witness_statement', label: 'Witness Statement', icon: '👤' },
  { value: 'external_report', label: 'External Report', icon: '📊' }
];

export const EvidenceManager: React.FC<EvidenceManagerProps> = ({
  evidence,
  investigationId,
  currentUserId,
  currentUserName,
  onAddEvidence,
  onUpdateEvidence,
  onVerifyEvidence,
  onDownloadEvidence,
  canAddEvidence,
  canVerifyEvidence,
  isLoading = false
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filterType, setFilterType] = useState<EvidenceType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'type'>('date');
  const [formData, setFormData] = useState<EvidenceFormData>({
    type: 'document',
    title: '',
    description: '',
    tags: [],
    metadata: {}
  });
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredEvidence = evidence
    .filter(item => {
      const matchesType = filterType === 'all' || item.type === filterType;
      const matchesSearch = searchQuery === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesType && matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'type':
          return a.type.localeCompare(b.type);
        case 'date':
        default:
          return new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime();
      }
    });

  const getEvidenceTypeInfo = (type: EvidenceType) => {
    return EVIDENCE_TYPES.find(t => t.value === type) || EVIDENCE_TYPES[0];
  };

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return '📎';
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📄';
    if (mimeType.includes('sheet') || mimeType.includes('csv')) return '📊';
    return '📎';
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleAddEvidence = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const newEvidence: Omit<Evidence, 'id'> = {
        type: formData.type,
        title: formData.title,
        description: formData.description,
        fileUrl: formData.file ? URL.createObjectURL(formData.file) : undefined,
        fileName: formData.file?.name,
        fileSize: formData.file?.size,
        mimeType: formData.file?.type,
        tags: formData.tags,
        collectedBy: currentUserName,
        collectedAt: new Date().toISOString(),
        isVerified: false,
        metadata: {
          ...formData.metadata,
          investigationId,
          uploadedFrom: 'manual_investigation',
          ...(formData.file && {
            originalFileName: formData.file.name,
            fileLastModified: new Date(formData.file.lastModified).toISOString()
          })
        },
        relatedStepId: formData.relatedStepId,
        chainOfCustody: [
          {
            id: `custody-${Date.now()}`,
            action: 'collected',
            performedBy: currentUserName,
            performedAt: new Date().toISOString(),
            location: 'Manual Investigation Interface',
            notes: 'Evidence collected through manual investigation workflow'
          }
        ]
      };

      await onAddEvidence(newEvidence);

      // Reset form
      setFormData({
        type: 'document',
        title: '',
        description: '',
        tags: [],
        metadata: {}
      });
      setTagInput('');
      setShowAddModal(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error adding evidence:', error);
      alert('Error adding evidence. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        alert('File size must be less than 50MB');
        event.target.value = '';
        return;
      }

      setFormData(prev => ({
        ...prev,
        file,
        metadata: {
          ...prev.metadata,
          fileType: file.type,
          fileSize: file.size,
          fileName: file.name
        }
      }));
    }
  };

  const handleVerifyEvidence = (evidenceId: string) => {
    if (window.confirm('Are you sure you want to verify this evidence? This action cannot be undone.')) {
      onVerifyEvidence(evidenceId);
    }
  };

  const showEvidenceDetails = (evidenceItem: Evidence) => {
    setSelectedEvidence(evidenceItem);
    setShowDetailsModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Evidence Manager</h2>
          <p className="text-gray-600">Collect, verify, and manage investigation evidence</p>
        </div>

        {canAddEvidence && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Add Evidence
          </button>
        )}
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search evidence..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as EvidenceType | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              {EVIDENCE_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'title' | 'type')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">Date Collected</option>
              <option value="title">Title</option>
              <option value="type">Type</option>
            </select>
          </div>

          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              {filteredEvidence.length} of {evidence.length} items
            </div>
          </div>
        </div>
      </div>

      {/* Evidence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvidence.map((item) => {
          const typeInfo = getEvidenceTypeInfo(item.type);
          return (
            <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{typeInfo.icon}</span>
                  <div>
                    <h3 className="font-medium text-gray-900 line-clamp-1">{item.title}</h3>
                    <p className="text-sm text-gray-500">{typeInfo.label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {item.isVerified ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Pending
                    </span>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>

              {item.fileName && (
                <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 rounded">
                  <span className="text-lg">{getFileIcon(item.mimeType)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.fileName}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(item.fileSize)}</p>
                  </div>
                </div>
              )}

              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {item.tags.slice(0, 3).map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      {tag}
                    </span>
                  ))}
                  {item.tags.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                      +{item.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              <div className="text-xs text-gray-500 mb-3">
                <div>Collected by: {item.collectedBy}</div>
                <div>Date: {new Date(item.collectedAt).toLocaleString()}</div>
                {item.verifiedBy && (
                  <div>Verified by: {item.verifiedBy} on {new Date(item.verifiedAt!).toLocaleString()}</div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => showEvidenceDetails(item)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View Details
                </button>

                <div className="flex gap-2">
                  {item.fileUrl && (
                    <button
                      onClick={() => onDownloadEvidence(item.id)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Download"
                    >
                      ⬇️
                    </button>
                  )}
                  {!item.isVerified && canVerifyEvidence && (
                    <button
                      onClick={() => handleVerifyEvidence(item.id)}
                      className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Verify
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredEvidence.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No evidence found</h3>
          <p className="text-gray-600 mb-4">
            {evidence.length === 0
              ? 'Start by adding your first piece of evidence.'
              : 'Try adjusting your search criteria or filters.'
            }
          </p>
          {canAddEvidence && evidence.length === 0 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add First Evidence
            </button>
          )}
        </div>
      )}

      {/* Add Evidence Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Add Evidence</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Evidence Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as EvidenceType }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {EVIDENCE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.icon} {type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter evidence title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the evidence and its relevance"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">File Attachment</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.mp4,.mp3,.zip,.txt"
                />
                <p className="text-xs text-gray-500 mt-1">Maximum file size: 50MB</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add tag"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEvidence}
                disabled={isSubmitting || !formData.title.trim() || !formData.description.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Adding...' : 'Add Evidence'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Details Modal */}
      {showDetailsModal && selectedEvidence && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Evidence Details</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Title:</span> {selectedEvidence.title}</div>
                      <div><span className="font-medium">Type:</span> {getEvidenceTypeInfo(selectedEvidence.type).label}</div>
                      <div><span className="font-medium">Status:</span>
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                          selectedEvidence.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {selectedEvidence.isVerified ? 'Verified' : 'Pending Verification'}
                        </span>
                      </div>
                      <div><span className="font-medium">Description:</span></div>
                      <p className="text-gray-600 pl-4">{selectedEvidence.description}</p>
                    </div>
                  </div>

                  {selectedEvidence.fileName && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">File Information</h4>
                      <div className="space-y-2 text-sm">
                        <div><span className="font-medium">File:</span> {selectedEvidence.fileName}</div>
                        <div><span className="font-medium">Size:</span> {formatFileSize(selectedEvidence.fileSize)}</div>
                        <div><span className="font-medium">Type:</span> {selectedEvidence.mimeType}</div>
                      </div>
                    </div>
                  )}

                  {selectedEvidence.tags.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedEvidence.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Chain of Custody</h4>
                    <div className="space-y-3">
                      {selectedEvidence.chainOfCustody.map((entry, index) => (
                        <div key={entry.id} className="border-l-2 border-blue-200 pl-4 pb-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm capitalize">{entry.action}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(entry.performedAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <div>By: {entry.performedBy}</div>
                            <div>Location: {entry.location}</div>
                            {entry.notes && <div>Notes: {entry.notes}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {Object.keys(selectedEvidence.metadata).length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Metadata</h4>
                      <div className="bg-gray-50 rounded p-3 text-sm space-y-1">
                        {Object.entries(selectedEvidence.metadata).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium">{key}:</span> {String(value)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Collected on {new Date(selectedEvidence.collectedAt).toLocaleString()}
                {selectedEvidence.verifiedAt && (
                  <span className="ml-4">
                    Verified on {new Date(selectedEvidence.verifiedAt).toLocaleString()}
                  </span>
                )}
              </div>

              <div className="flex gap-3">
                {selectedEvidence.fileUrl && (
                  <button
                    onClick={() => onDownloadEvidence(selectedEvidence.id)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Download File
                  </button>
                )}
                {!selectedEvidence.isVerified && canVerifyEvidence && (
                  <button
                    onClick={() => {
                      handleVerifyEvidence(selectedEvidence.id);
                      setShowDetailsModal(false);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Verify Evidence
                  </button>
                )}
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};