import React, { useState, useRef } from 'react';
import {
  XMarkIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  ShareIcon,
  MagnifyingGlassIcon,
  ZoomInIcon,
  ZoomOutIcon,
  DocumentTextIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { Investigation } from '../types/investigation';

interface ReportViewerProps {
  investigation: Investigation;
  reportType: 'pdf' | 'html' | 'preview';
  reportContent?: string;
  onClose: () => void;
  onDownload: () => void;
  onPrint: () => void;
  onShare: () => void;
}

export const ReportViewer: React.FC<ReportViewerProps> = ({
  investigation,
  reportType,
  reportContent,
  onClose,
  onDownload,
  onPrint,
  onShare
}) => {
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const totalPages = 5; // Mock total pages

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const generateReportHTML = () => {
    if (!investigation.results) return '<p>No results available</p>';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Investigation Report - ${investigation.title}</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px 20px;
              background: white;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #3B82F6;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #1F2937;
              margin: 0;
              font-size: 2.5em;
            }
            .header .subtitle {
              color: #6B7280;
              font-size: 1.1em;
              margin-top: 10px;
            }
            .meta-info {
              background: #F9FAFB;
              border: 1px solid #E5E7EB;
              border-radius: 8px;
              padding: 20px;
              margin-bottom: 30px;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 15px;
            }
            .meta-item {
              display: flex;
              justify-content: space-between;
            }
            .meta-label {
              font-weight: 600;
              color: #4B5563;
            }
            .meta-value {
              color: #1F2937;
            }
            .section {
              margin-bottom: 40px;
            }
            .section h2 {
              color: #1F2937;
              border-bottom: 2px solid #E5E7EB;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .risk-score {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 120px;
              height: 120px;
              border-radius: 50%;
              background: linear-gradient(135deg, #EF4444, #DC2626);
              color: white;
              font-size: 2em;
              font-weight: bold;
              margin: 20px auto;
              box-shadow: 0 10px 25px rgba(239, 68, 68, 0.3);
            }
            .confidence {
              text-align: center;
              color: #10B981;
              font-size: 1.5em;
              font-weight: 600;
              margin-bottom: 20px;
            }
            .findings-list, .recommendations-list {
              list-style: none;
              padding: 0;
            }
            .findings-list li, .recommendations-list li {
              background: #F3F4F6;
              margin-bottom: 10px;
              padding: 15px;
              border-radius: 6px;
              border-left: 4px solid #EF4444;
            }
            .recommendations-list li {
              border-left-color: #10B981;
            }
            .agent-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
              gap: 20px;
            }
            .agent-card {
              border: 1px solid #E5E7EB;
              border-radius: 8px;
              padding: 20px;
              background: white;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }
            .agent-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 15px;
            }
            .agent-name {
              font-weight: 600;
              color: #1F2937;
            }
            .agent-status {
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 0.8em;
              font-weight: 600;
              text-transform: uppercase;
            }
            .status-completed {
              background: #D1FAE5;
              color: #065F46;
            }
            .footer {
              margin-top: 60px;
              text-align: center;
              color: #6B7280;
              border-top: 1px solid #E5E7EB;
              padding-top: 20px;
            }
            @media print {
              body { margin: 0; padding: 20px; }
              .header { page-break-inside: avoid; }
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Investigation Report</h1>
            <div class="subtitle">${investigation.title}</div>
          </div>

          <div class="meta-info">
            <div class="meta-grid">
              <div class="meta-item">
                <span class="meta-label">Investigation ID:</span>
                <span class="meta-value">${investigation.id}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Status:</span>
                <span class="meta-value">${investigation.status.toUpperCase()}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Priority:</span>
                <span class="meta-value">${investigation.priority.toUpperCase()}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Created:</span>
                <span class="meta-value">${new Date(investigation.createdAt).toLocaleString()}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Generated:</span>
                <span class="meta-value">${new Date().toLocaleString()}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Created By:</span>
                <span class="meta-value">${investigation.createdBy}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>Executive Summary</h2>
            <div class="risk-score">${Math.round(investigation.results.riskScore * 100)}%</div>
            <div class="confidence">Confidence: ${Math.round(investigation.results.confidence * 100)}%</div>
            <p>${investigation.results.summary}</p>
          </div>

          <div class="section">
            <h2>Key Findings (${investigation.results.findings.length})</h2>
            <ul class="findings-list">
              ${investigation.results.findings.map(finding => `<li>${finding}</li>`).join('')}
            </ul>
          </div>

          <div class="section">
            <h2>Recommendations (${investigation.results.recommendations.length})</h2>
            <ul class="recommendations-list">
              ${investigation.results.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
          </div>

          ${investigation.results.agentResults ? `
          <div class="section">
            <h2>Agent Analysis</h2>
            <div class="agent-grid">
              ${investigation.results.agentResults.map(agent => `
                <div class="agent-card">
                  <div class="agent-header">
                    <span class="agent-name">${agent.agentId}</span>
                    <span class="agent-status status-${agent.status}">${agent.status}</span>
                  </div>
                  <div>
                    <strong>Score:</strong> ${agent.score}% |
                    <strong>Confidence:</strong> ${agent.confidence}% |
                    <strong>Time:</strong> ${agent.executionTime}ms
                  </div>
                  <div style="margin-top: 10px;">
                    <strong>Findings:</strong> ${agent.findings.length} identified
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}

          <div class="footer">
            <p>This report was generated automatically by the Olorin Investigation Platform.</p>
            <p>Report ID: RPT-${Date.now()}</p>
          </div>
        </body>
      </html>
    `;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <DocumentTextIcon className="h-6 w-6 text-gray-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Investigation Report: {investigation.title}
              </h2>
              <p className="text-sm text-gray-600">
                Generated {new Date().toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search report..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center space-x-1 border border-gray-300 rounded-md">
              <button
                onClick={handleZoomOut}
                className="p-2 hover:bg-gray-100"
                disabled={zoom <= 50}
              >
                <ZoomOutIcon className="h-4 w-4" />
              </button>
              <span className="px-3 py-2 text-sm border-x border-gray-300 min-w-[60px] text-center">
                {zoom}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-2 hover:bg-gray-100"
                disabled={zoom >= 200}
              >
                <ZoomInIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Page Navigation */}
            <div className="flex items-center space-x-1 border border-gray-300 rounded-md">
              <button
                onClick={handlePreviousPage}
                className="p-2 hover:bg-gray-100"
                disabled={currentPage <= 1}
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <span className="px-3 py-2 text-sm border-x border-gray-300 min-w-[80px] text-center">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                className="p-2 hover:bg-gray-100"
                disabled={currentPage >= totalPages}
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Actions */}
            <button
              onClick={onDownload}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Download
            </button>

            <button
              onClick={onPrint}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <PrinterIcon className="h-4 w-4 mr-2" />
              Print
            </button>

            <button
              onClick={onShare}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <ShareIcon className="h-4 w-4 mr-2" />
              Share
            </button>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {reportType === 'html' || reportType === 'preview' ? (
            <div className="h-full overflow-auto bg-gray-100 p-4">
              <div
                className="bg-white shadow-lg mx-auto"
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top center',
                  minHeight: '100%'
                }}
              >
                <iframe
                  ref={iframeRef}
                  srcDoc={generateReportHTML()}
                  className="w-full h-full border-0"
                  style={{ minHeight: '800px' }}
                  title="Investigation Report"
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">PDF Viewer</h3>
                <p className="text-gray-600 mb-4">
                  PDF viewing functionality would be implemented here using a library like PDF.js
                </p>
                <button
                  onClick={onDownload}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  Download PDF
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};