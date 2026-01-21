/**
 * Page Toolbar Component
 *
 * Provides export and external link actions for investigation comparison results.
 * Includes JSON/CSV export and links to Splunk/Jira.
 *
 * Constitutional Compliance:
 * - External URLs from environment variables (no hardcoded values)
 * - Export functions generate files from API response data
 */

import React, { useState } from 'react';
import { Button } from '@shared/components/ui/Button';
import type { ComparisonResponse, ComparisonRequest } from '../types/comparison';
import { exportToJSON, exportToCSV, exportToHTML, buildSplunkUrl, buildJiraUrl } from '../utils/exportUtils';

interface PageToolbarProps {
  data: ComparisonResponse | null;
  entity?: { type: string; value: string } | null;
  request?: ComparisonRequest | null;
}

export const PageToolbar: React.FC<PageToolbarProps> = ({ data, entity, request }) => {
  const [isExportingHTML, setIsExportingHTML] = useState(false);

  const handleExportJSON = () => {
    if (!data) return;
    exportToJSON(data, entity);
  };

  const handleExportCSV = () => {
    if (!data) return;
    exportToCSV(data, entity);
  };

  const handleExportHTML = async () => {
    if (!data || !request) return;
    
    setIsExportingHTML(true);
    try {
      await exportToHTML(request, entity);
    } catch (error) {
      console.error('Failed to export HTML:', error);
      alert('Failed to export HTML report. Please try again.');
    } finally {
      setIsExportingHTML(false);
    }
  };

  const handleOpenSplunk = () => {
    const url = buildSplunkUrl(entity, data);
    if (url) {
      window.open(url, '_blank');
    } else {
      console.warn('REACT_APP_SPLUNK_CASE_URL not configured');
    }
  };

  const handleCreateJira = () => {
    const url = buildJiraUrl(entity, data);
    if (url) {
      window.open(url, '_blank');
    } else {
      console.warn('REACT_APP_JIRA_CREATE_TICKET_URL not configured');
    }
  };

  if (!data) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 items-center justify-end">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportJSON}
        disabled={!data}
        aria-label="Export results as JSON"
      >
        Export JSON
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportCSV}
        disabled={!data}
        aria-label="Export results as CSV"
      >
        Export CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportHTML}
        disabled={!data || !request || isExportingHTML}
        loading={isExportingHTML}
        aria-label="Export comprehensive HTML report"
      >
        Export HTML Report
      </Button>
      {process.env.REACT_APP_SPLUNK_CASE_URL && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpenSplunk}
          disabled={!data}
          aria-label="Open in Splunk case"
        >
          Open in Splunk
        </Button>
      )}
      {process.env.REACT_APP_JIRA_CREATE_TICKET_URL && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCreateJira}
          disabled={!data}
          aria-label="Create Jira ticket"
        >
          Create Jira Ticket
        </Button>
      )}
    </div>
  );
};

