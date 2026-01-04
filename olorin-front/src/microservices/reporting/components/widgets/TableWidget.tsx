/**
 * TableWidget Component - Display recent investigations table
 */

import React from 'react';
import { InvestigationStatistics } from '../../types/reports';

interface TableWidgetProps {
  type: 'recent';
  data: InvestigationStatistics | null;
  loading?: boolean;
}

export const TableWidget: React.FC<TableWidgetProps> = ({ data, loading = false }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="widget my-6 p-6 rounded-xl border-2 border-corporate-borderPrimary/40 bg-black/40 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2.5 h-2.5 rounded-full bg-corporate-accentPrimary animate-pulse"></div>
          <div className="text-sm font-semibold text-corporate-textSecondary uppercase tracking-wide">Recent Investigations</div>
        </div>
        <div className="text-sm text-corporate-textSecondary text-center py-8">
          <div className="w-10 h-10 border-[3px] border-corporate-accentPrimary/40 border-t-corporate-accentPrimary rounded-full animate-spin mx-auto mb-4"></div>
          Loading table data...
        </div>
      </div>
    );
  }

  // Always render table - show empty state if no data (not a placeholder)
  const investigations = data?.investigations || [];
  
  if (investigations.length === 0) {
    return (
      <div className="widget my-6 p-6 rounded-xl border-2 border-corporate-borderPrimary/40 bg-black/40 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2.5 h-2.5 rounded-full bg-corporate-borderPrimary/50"></div>
          <div className="text-sm font-semibold text-corporate-textSecondary uppercase tracking-wide">Recent Investigations</div>
        </div>
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur border-2 border-corporate-borderPrimary/40 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-corporate-textTertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="text-sm text-corporate-textPrimary mb-1">No investigations found</div>
          <div className="text-xs text-corporate-textSecondary">Investigations will appear here once created</div>
        </div>
      </div>
    );
  }

  const recentInvestigations = investigations
    .slice()
    .filter((inv) => inv.updated !== null && inv.updated !== undefined) // Filter out investigations without updated timestamp
    .sort((a, b) => {
      const dateA = a.updated ? new Date(a.updated).getTime() : 0;
      const dateB = b.updated ? new Date(b.updated).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 10);

  return (
    <div className="widget my-6 p-6 rounded-xl border-2 border-corporate-borderPrimary/40 bg-black/40 backdrop-blur-md shadow-lg hover:border-corporate-accentPrimary/60 transition-all">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2.5 h-2.5 rounded-full bg-corporate-accentPrimary"></div>
        <div className="text-sm font-semibold text-corporate-textSecondary uppercase tracking-wide">Recent Investigations</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="px-3 py-2.5 border-b border-corporate-borderPrimary/40 text-left text-corporate-textPrimary font-semibold bg-black/30 backdrop-blur">Name</th>
            <th className="px-3 py-2.5 border-b border-corporate-borderPrimary/40 text-left text-corporate-textPrimary font-semibold bg-black/30 backdrop-blur">Owner</th>
            <th className="px-3 py-2.5 border-b border-corporate-borderPrimary/40 text-left text-corporate-textPrimary font-semibold bg-black/30 backdrop-blur">Status</th>
            <th className="px-3 py-2.5 border-b border-corporate-borderPrimary/40 text-left text-corporate-textPrimary font-semibold bg-black/30 backdrop-blur">Updated</th>
          </tr>
        </thead>
        <tbody>
          {recentInvestigations.map((inv, index) => (
            <tr key={inv.id} className="hover:bg-black/30 backdrop-blur transition-colors">
              <td className="px-3 py-2.5 border-b border-corporate-borderPrimary/20 text-corporate-textPrimary">{inv.name}</td>
              <td className="px-3 py-2.5 border-b border-corporate-borderPrimary/20 text-corporate-textSecondary">{inv.owner || '—'}</td>
              <td className="px-3 py-2.5 border-b border-corporate-borderPrimary/20">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                  inv.status === 'completed' || inv.status === 'COMPLETED' 
                    ? 'bg-corporate-success/20 text-corporate-success border-corporate-success/30'
                    : inv.status === 'in_progress' || inv.status === 'IN_PROGRESS'
                    ? 'bg-corporate-info/20 text-corporate-info border-corporate-info/30'
                    : 'bg-black/30 text-corporate-textTertiary border-corporate-borderPrimary/30'
                }`}>
                  {inv.status}
                </span>
              </td>
              <td className="px-3 py-2.5 border-b border-corporate-borderPrimary/20 text-corporate-textSecondary">
                {inv.updated ? formatDate(inv.updated) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
};

