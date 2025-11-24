<<<<<<< HEAD
import React, { useState, useEffect, useRef } from 'react';
import {
  Report,
  ReportGeneration,
  ReportFormat,
  ReportExportOptions,
  ReportComment,
  ReportShare
} from '../types/reporting';

interface ReportViewerProps {
  report?: Report;
  generation?: ReportGeneration;
  onExport?: (options: ReportExportOptions) => Promise<void>;
  onShare?: (permissions: ReportShare['permissions'], expiresAt?: string) => Promise<string>;
  onComment?: (comment: Omit<ReportComment, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onPrint?: () => void;
  className?: string;
}

const ReportViewer: React.FC<ReportViewerProps> = ({
  report,
  generation,
  onExport,
  onShare,
  onComment,
  onPrint,
  className
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ReportFormat>('pdf');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<ReportComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const viewerRef = useRef<HTMLDivElement>(null);

  const handleExport = async (options: ReportExportOptions) => {
    if (!onExport) return;

    setLoading(true);
    setError(null);

    try {
      await onExport(options);
      setShowExportModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (permissions: ReportShare['permissions'], expiresAt?: string) => {
    if (!onShare) return;

    setLoading(true);
    setError(null);

    try {
      const shareUrl = await onShare(permissions, expiresAt);
      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      setShowShareModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Share failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!onComment || !newComment.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await onComment({
        reportId: report!.id,
        author: 'Current User', // TODO: Get from context
        content: newComment,
        resolved: false
      });
      setNewComment('');
      // TODO: Refresh comments
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Comment failed');
    } finally {
      setLoading(false);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const handleFullscreen = () => {
    if (viewerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        viewerRef.current.requestFullscreen();
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
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

  if (!report) {
    return (
      <div className={`flex items-center justify-center h-64 ${className || ''}`}>
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No report selected</h3>
          <p className="mt-1 text-sm text-gray-500">Select a report to view its contents.</p>
=======
/**
 * ReportViewer Component - Display report with markdown rendering and TOC
 */

import React, { useState } from 'react';
import { Report, ReportStatus } from '../types/reports';
import { ReportContent } from './ReportContent';
import { ReportHeader } from './ReportHeader';
import { ReportTOC } from './ReportTOC';
import { TOCItem } from '../utils/tocGenerator';

interface ReportViewerProps {
  report: Report | null;
  onEdit?: () => void;
  onPublish?: () => void;
  onShare?: () => void;
  onPrint?: () => void;
  onPresent?: () => void;
  onStatusChange?: (status: ReportStatus) => void;
}

export const ReportViewer: React.FC<ReportViewerProps> = ({
  report,
  onEdit,
  onPublish,
  onShare,
  onPrint,
  onPresent,
  onStatusChange,
}) => {
  const [toc, setTOC] = useState<TOCItem[]>([]);

  if (!report) {
    return (
      <div className="bg-black/40 backdrop-blur-md border-2 border-corporate-borderPrimary/40 rounded-xl overflow-hidden shadow-lg">
        <ReportHeader report={null} />
        <div className="p-6">
          <p className="text-corporate-textSecondary text-sm">Select a report from the list to view</p>
>>>>>>> 001-modify-analyzer-method
        </div>
      </div>
    );
  }

<<<<<<< HEAD
  return (
    <div className={`flex flex-col h-full ${className || ''}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-lg font-medium text-gray-900">{report.name}</h1>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>Generated {generation ? formatDate(generation.completedAt || generation.startedAt) : 'Never'}</span>
                {generation?.fileSize && <span>{formatFileSize(generation.fileSize)}</span>}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  generation?.status === 'ready' ? 'bg-green-100 text-green-800' :
                  generation?.status === 'generating' ? 'bg-yellow-100 text-yellow-800' :
                  generation?.status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {generation?.status || 'No generation'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Zoom Controls */}
            <div className="flex items-center space-x-1 border border-gray-300 rounded-md">
              <button
                onClick={handleZoomOut}
                className="p-1 text-gray-600 hover:text-gray-900"
                disabled={zoom <= 50}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="px-2 py-1 text-xs text-gray-600 border-l border-r border-gray-300">
                {zoom}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1 text-gray-600 hover:text-gray-900"
                disabled={zoom >= 200}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {/* Action Buttons */}
            <button
              onClick={handleFullscreen}
              className="p-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md"
              title="Fullscreen"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>

            <button
              onClick={() => setShowComments(!showComments)}
              className="p-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md"
              title="Comments"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>

            <button
              onClick={onPrint}
              className="p-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md"
              title="Print"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </button>

            <button
              onClick={() => setShowShareModal(true)}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Share
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              className="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main Viewer */}
        <div
          ref={viewerRef}
          className="flex-1 overflow-auto bg-gray-100 p-6"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
        >
          {generation?.status === 'ready' && generation.downloadUrl ? (
            <div className="bg-white shadow-lg rounded-lg max-w-4xl mx-auto">
              {/* Report Content */}
              <div className="p-8">
                <div className="border-b border-gray-200 pb-6 mb-6">
                  <h1 className="text-3xl font-bold text-gray-900">{report.name}</h1>
                  {report.description && (
                    <p className="mt-2 text-gray-600">{report.description}</p>
                  )}
                  <div className="mt-4 flex items-center text-sm text-gray-500">
                    <span>Generated on {formatDate(generation.completedAt || generation.startedAt)}</span>
                    <span className="mx-2">•</span>
                    <span>{generation.metadata.recordCount} records</span>
                    <span className="mx-2">•</span>
                    <span>Generation time: {generation.metadata.generationTime}s</span>
                  </div>
                </div>

                {/* Mock Report Content */}
                <div className="space-y-8">
                  <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Executive Summary</h2>
                    <p className="text-gray-700 leading-relaxed">
                      This report provides a comprehensive analysis of fraud patterns detected in the investigation period.
                      Key findings include identification of suspicious activities, risk assessment metrics, and recommended actions.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Metrics</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">1,247</div>
                        <div className="text-sm text-gray-600">Total Cases</div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">156</div>
                        <div className="text-sm text-gray-600">High Risk</div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">342</div>
                        <div className="text-sm text-gray-600">Medium Risk</div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">749</div>
                        <div className="text-sm text-gray-600">Low Risk</div>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Detailed Analysis</h2>
                    <div className="bg-gray-50 h-64 rounded-lg flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <p>Chart would be displayed here</p>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Recommendations</h2>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start">
                        <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></span>
                        <span>Implement additional monitoring for high-risk transactions</span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></span>
                        <span>Review and update fraud detection algorithms</span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></span>
                        <span>Increase frequency of automated risk assessments</span>
                      </li>
                    </ul>
                  </section>
                </div>
              </div>
            </div>
          ) : generation?.status === 'generating' ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <h3 className="text-lg font-medium text-gray-900">Generating Report</h3>
                <p className="text-gray-500">Please wait while your report is being generated...</p>
              </div>
            </div>
          ) : generation?.status === 'failed' ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900">Generation Failed</h3>
                <p className="text-gray-500 mb-4">{generation.error?.message || 'An error occurred while generating the report'}</p>
                <button
                  onClick={() => {
                    // TODO: Retry generation
                    console.log('Retry generation');
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Retry Generation
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900">Report Not Generated</h3>
                <p className="text-gray-500 mb-4">This report hasn't been generated yet.</p>
                <button
                  onClick={() => {
                    // TODO: Generate report
                    console.log('Generate report');
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Generate Report
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Comments Sidebar */}
        {showComments && (
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Comments</h3>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">{comment.author}</span>
                      <span className="text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-700">{comment.content}</p>
                    {comment.resolved && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-2">
                        Resolved
                      </span>
                    )}
                  </div>
                ))}
                {comments.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-8">No comments yet</p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-200">
              <div className="space-y-3">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={3}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || loading}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Add Comment
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowExportModal(false)} />

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Export Report</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Format</label>
                    <select
                      value={selectedFormat}
                      onChange={(e) => setSelectedFormat(e.target.value as ReportFormat)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="pdf">PDF</option>
                      <option value="html">HTML</option>
                      <option value="docx">Word Document</option>
                      <option value="csv">CSV Data</option>
                      <option value="xlsx">Excel Spreadsheet</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Filename</label>
                    <input
                      type="text"
                      defaultValue={`${report.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}`}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="includeCharts"
                      defaultChecked
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="includeCharts" className="ml-2 block text-sm text-gray-900">
                      Include charts and visualizations
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="includeData"
                      defaultChecked
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="includeData" className="ml-2 block text-sm text-gray-900">
                      Include raw data
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => handleExport({
                    format: selectedFormat,
                    includeCharts: true,
                    includeData: true
                  })}
                  disabled={loading}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {loading ? 'Exporting...' : 'Export'}
                </button>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowShareModal(false)} />

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Share Report</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                    <div className="space-y-2">
                      <label className="inline-flex items-center">
                        <input type="checkbox" defaultChecked className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                        <span className="ml-2 text-sm text-gray-700">View</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input type="checkbox" className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                        <span className="ml-2 text-sm text-gray-700">Download</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input type="checkbox" className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                        <span className="ml-2 text-sm text-gray-700">Comment</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Expires</label>
                    <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                      <option value="">Never</option>
                      <option value="1">1 day</option>
                      <option value="7">7 days</option>
                      <option value="30">30 days</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => handleShare(['view'])}
                  disabled={loading}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Share Link'}
                </button>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

export default ReportViewer;
=======
  console.log('[ReportViewer] Report content length:', report.content?.length || 0);
  console.log('[ReportViewer] Report content preview:', JSON.stringify(report.content?.substring(0, 200)));

  return (
    <div className="bg-black/40 backdrop-blur-md border-2 border-corporate-borderPrimary/40 rounded-xl overflow-hidden shadow-lg" data-report-viewer>
      <ReportHeader
        report={report}
        onEdit={onEdit}
        onPublish={onPublish}
        onShare={onShare}
        onPrint={onPrint}
        onPresent={onPresent}
        onStatusChange={onStatusChange}
      />
      <div className="flex gap-6">
        {/* Main content */}
        <div className="flex-1 p-6">
          <ReportContent content={report.content || ''} onTOCGenerated={setTOC} />
        </div>
        {/* TOC sidebar - hidden on mobile */}
        {toc.length > 0 && (
          <div className="hidden lg:block w-48 flex-shrink-0">
            <ReportTOC items={toc} />
          </div>
        )}
      </div>
    </div>
  );
};
>>>>>>> 001-modify-analyzer-method
