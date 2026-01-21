/**
 * ReportingApp - Main application component for Reports Microservice
 * Matches reference design from olorin-reports.html
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ReportList } from './components/ReportList';
import { ReportViewer } from './components/ReportViewer';
import { ReportEditor } from './components/ReportEditor';
import { ToastProvider, useToast } from './components/common/Toast';
import { ReportService } from './services/reportService';
import { Report } from './types/reports';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import './styles/print.css';

interface ReportingAppProps {
  className?: string;
}

const ReportingApp: React.FC<ReportingAppProps> = ({ className = '' }) => {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Handle deep linking using React Router URL parameters (?reportId=xxx)
  useEffect(() => {
    const reportId = searchParams.get('reportId');
    if (reportId && reportId !== selectedReportId) {
      setSelectedReportId(reportId);
      loadReport(reportId);
    }
  }, [searchParams]);

  const loadReport = async (reportId: string) => {
    setIsLoadingReport(true);
    try {
      const report = await ReportService.getReport(reportId);
      console.log('[ReportingApp] Loaded report:', {
        id: report.id,
        title: report.title,
        contentLength: report.content?.length || 0,
        contentPreview: report.content?.substring(0, 100) || '',
      });
      setSelectedReport(report);
      setSelectedReportId(reportId);
      // Update URL using React Router
      setSearchParams({ reportId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load report';
      showToast('error', 'Error', message);
      setSelectedReport(null);
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleSelectReport = (reportId: string) => {
    if (reportId !== selectedReportId) {
      setIsEditing(false); // Exit edit mode when selecting different report
      loadReport(reportId);
    }
  };

  const handleCreateReport = async () => {
    try {
      const newReport = await ReportService.createReport({
        title: 'Untitled Report',
        content: '',
        tags: [],
      });
      setSelectedReport(newReport);
      setSelectedReportId(newReport.id);
      setIsEditing(true);
      setSearchParams({ reportId: newReport.id });
      showToast('success', 'Success', 'Report created');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create report';
      showToast('error', 'Error', message);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async (updatedReport: Report) => {
    console.log('[ReportingApp] handleSave called with report:', {
      id: updatedReport.id,
      title: updatedReport.title,
      contentLength: updatedReport.content?.length || 0,
      contentPreview: JSON.stringify(updatedReport.content?.substring(0, 200) || ''),
    });
    setSelectedReport(updatedReport);
    setIsEditing(false);
    // Reload the report to ensure we have the latest from the server
    if (updatedReport.id) {
      console.log('[ReportingApp] Reloading report after save...');
      await loadReport(updatedReport.id);
    }
    // Refresh the report list to show updated data
    window.dispatchEvent(new Event('report-updated'));
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reload the report to discard changes
    if (selectedReportId) {
      loadReport(selectedReportId);
    }
  };

  const handlePublish = async () => {
    if (!selectedReport) return;
    try {
      const newStatus = selectedReport.status === 'Published' ? 'Draft' : 'Published';
      const updatedReport = await ReportService.publishReport(selectedReport.id, {
        status: newStatus,
      });
      setSelectedReport(updatedReport);
      showToast('success', 'Success', newStatus === 'Published' ? 'Report published' : 'Report unpublished');
      window.dispatchEvent(new Event('report-updated'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update status';
      showToast('error', 'Error', message);
    }
  };

  const handleStatusChange = async (status: Report['status']) => {
    if (!selectedReport) return;
    try {
      const updatedReport = await ReportService.updateReport(selectedReport.id, {
        status,
      });
      setSelectedReport(updatedReport);
      showToast('success', 'Success', `Report status changed to ${status}`);
      window.dispatchEvent(new Event('report-updated'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update status';
      showToast('error', 'Error', message);
    }
  };

  const handleShare = async () => {
    if (!selectedReport) return;
    try {
      const shareResponse = await ReportService.shareReport(selectedReport.id);
      await navigator.clipboard.writeText(shareResponse.share_url);
      showToast('success', 'Success', 'Shareable URL copied to clipboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate share URL';
      showToast('error', 'Error', message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePresent = () => {
    // Fullscreen presentation mode
    const viewerElement = document.querySelector('[data-report-viewer]');
    if (viewerElement && viewerElement.requestFullscreen) {
      viewerElement.requestFullscreen();
    } else {
      showToast('info', 'Info', 'Fullscreen mode not available in this browser');
    }
  };

  const handleExportJSON = async () => {
    try {
      const response = await ReportService.listReports({ limit: 1000 });
      const jsonStr = JSON.stringify(response.reports, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reports-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('success', 'Success', 'Reports exported to JSON');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export reports';
      showToast('error', 'Error', message);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      await ReportService.deleteReport(reportId);
      if (selectedReportId === reportId) {
        setSelectedReport(null);
        setSelectedReportId(null);
        setIsEditing(false);
        setSearchParams({});
      }
      showToast('success', 'Success', 'Report deleted');
      window.dispatchEvent(new Event('report-updated'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete report';
      showToast('error', 'Error', message);
    }
  };

  return (
    <ErrorBoundary serviceName="reporting">
      <ToastProvider />
      <div className={`reporting-service min-h-screen bg-black ${className}`}>
        {/* Header */}
        <div className="border-b border-corporate-borderPrimary/40 bg-black/40 backdrop-blur-md px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-black/50 backdrop-blur border-2 border-corporate-borderPrimary/40 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-corporate-textTertiary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-corporate-textPrimary">Reporting Service</h1>
                <p className="text-sm text-corporate-textSecondary mt-1">
                  Author, publish, and view investigation reports
                </p>
              </div>
            </div>
            <div className="flex gap-3 items-center">
              <button
                onClick={handleExportJSON}
                className="px-3 py-2 bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40 hover:border-corporate-accentPrimary/60 text-corporate-textSecondary rounded transition-colors text-sm"
                aria-label="Export all reports as JSON"
              >
                Export JSON
              </button>
              <button
                onClick={handleCreateReport}
                className="px-4 py-2 bg-corporate-accentPrimary hover:bg-corporate-accentPrimaryHover text-white rounded transition-colors text-sm font-medium"
                aria-label="Create new report"
              >
                New Report
              </button>
            </div>
          </div>
        </div>

        {/* Main Container */}
        <div className="grid grid-cols-[340px_1fr] gap-6 max-w-[1400px] mx-auto px-6 py-6">
          {/* Left: Report List */}
          <section className="order-2 md:order-1">
            <ReportList
              selectedReportId={selectedReportId || undefined}
              onSelectReport={handleSelectReport}
              onCreateReport={handleCreateReport}
              onExportJSON={handleExportJSON}
              onDeleteReport={handleDeleteReport}
            />
          </section>

          {/* Right: Report Viewer/Editor */}
          <section className="order-1 md:order-2">
            {isLoadingReport ? (
              <div className="bg-black/40 backdrop-blur-md border-2 border-corporate-borderPrimary/40 rounded-xl p-6 shadow-lg">
                <div className="text-center py-8 text-corporate-textSecondary text-sm">Loading report...</div>
              </div>
            ) : isEditing ? (
              <ReportEditor
                report={selectedReport}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            ) : (
              <ReportViewer
                report={selectedReport}
                onEdit={handleEdit}
                onPublish={handlePublish}
                onShare={handleShare}
                onPrint={handlePrint}
                onPresent={handlePresent}
                onStatusChange={handleStatusChange}
              />
            )}
          </section>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default ReportingApp;
