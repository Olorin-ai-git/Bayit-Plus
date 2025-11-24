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
        </div>
      </div>
    );
  }

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
