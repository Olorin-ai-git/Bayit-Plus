/**
 * Parallel Investigations Page
 * Feature: 001-startup-analysis-flow
 *
 * Dashboard for tracking parallel automated investigations triggered by startup analysis.
 * Displays real-time status, risk scores, and details for each entity being investigated.
 *
 * SYSTEM MANDATE Compliant:
 * - Uses shared components (Table, LoadingSpinner, etc.)
 * - No hardcoded values (uses environment/config)
 * - Real-time updates via polling
 * - Corporate styling
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Column } from '@shared/components/Table';
import SectionSkeleton from '@shared/components/SectionSkeleton';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { WizardButton } from '@shared/components/WizardButton';
import { Modal } from '@shared/components/Modal';
import { investigationService } from '../services/investigationService';

// Interface for table row data
interface ParallelInvestigation {
  id: string;
  entityValue: string;
  merchantName: string;
  status: 'CREATED' | 'SETTINGS' | 'IN_PROGRESS' | 'COMPLETED' | 'ERROR' | 'CANCELLED';
  riskScore: number;
  progressPercent: number;
  fraudTxCount: number;
  fraudPercent: number | null;
  startTime: string;
  endTime?: string;
}

// Helper component for dynamic duration display
const DurationDisplay: React.FC<{ startTime: string; endTime?: string; status: string }> = ({ startTime, endTime, status }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    // Only update if no end time and status is active
    if (!endTime && ['CREATED', 'SETTINGS', 'IN_PROGRESS'].includes(status)) {
      const interval = setInterval(() => setNow(new Date()), 1000);
      return () => clearInterval(interval);
    }
  }, [endTime, status]);

  if (!startTime) return <span className="font-mono text-corporate-textTertiary">--:--:--</span>;

  // Handle potential timezone parsing issues
  const parseDate = (dateStr: string) => {
    const d = new Date(dateStr);
    // If invalid, return null
    if (isNaN(d.getTime())) return null;
    return d;
  };

  const startDate = parseDate(startTime);
  if (!startDate) return <span className="font-mono text-corporate-textTertiary">Invalid Date</span>;

  // Check if date is suspiciously old (e.g., 1970 epoch from null)
  if (startDate.getFullYear() < 2020) return <span className="font-mono text-corporate-textTertiary">--:--:--</span>;

  const start = startDate.getTime();
  let end = now.getTime();

  if (endTime) {
    const endDate = parseDate(endTime);
    if (endDate) {
      end = endDate.getTime();
    }
  }

  // Prevent negative duration
  const durationMs = Math.max(0, end - start);
  
  const seconds = Math.floor((durationMs / 1000) % 60);
  const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
  const hours = Math.floor(durationMs / (1000 * 60 * 60));

  const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <span 
      className="font-mono" 
      title={`Start: ${startDate.toLocaleString()} ${endTime ? `\nEnd: ${new Date(endTime).toLocaleString()}` : ''}`}
    >
      {formatted}
    </span>
  );
};

export const ParallelInvestigationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [investigations, setInvestigations] = useState<ParallelInvestigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  
  // Filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [investigationToCancel, setInvestigationToCancel] = useState<string | null>(null);

  const triggerAnalysis = async () => {
    try {
      setTriggering(true);
      await investigationService.triggerStartupAnalysis(3, true);
      // Wait a bit for backend to initialize
      setTimeout(() => {
        fetchInvestigations();
        setTriggering(false);
      }, 1000);
    } catch (err) {
      console.error('Failed to trigger analysis:', err);
      setError('Failed to trigger analysis. Please check logs.');
      setTriggering(false);
    }
  };

  const fetchInvestigations = useCallback(async () => {
    try {
      // Don't set loading to true on background refreshes to avoid flickering
      // Only set on initial load if data is empty
      if (investigations.length === 0) {
        setLoading(true);
      }
      
      // Fetch all investigations to display parallel/automated ones
      const response = await investigationService.getInvestigations({}, 1, 50); // Fetch up to 50 items

      const mappedData: ParallelInvestigation[] = response.investigations.map((inv: any) => {
        // Extract metadata from settings (injected by executor)
        // Check both camelCase (frontend service) and potential snake_case leftovers
        const settings = inv.settings || {};
        const metadata = settings.metadata || {};
        const merchantName = metadata.merchantName || metadata.merchant_name || 'N/A';
        const fraudTxCount = metadata.fraudTxCount || metadata.fraud_tx_count || 0;
        const totalTxCount = metadata.totalTxCount || metadata.total_tx_count || 0;
        // If total is 0 but fraud > 0, total is unknown/missing
        const fraudPercent = totalTxCount > 0 ? (fraudTxCount / totalTxCount) * 100 : null;
        
        // Extract entity value
        const entities = settings.entities || [];
        const entityValue = entities.length > 0 ? (entities[0].entityValue || entities[0].entity_value || 'Unknown') : 'Unknown';
        
        // Extract risk score from progress
        const progress = inv.progress || {};
        const riskScore = progress.riskScore || progress.risk_score || 0.0;
        // Check standard schema fields (camelCase from Pydantic) and fallbacks
        const progressPercent = 
          progress.progressPercentage || 
          progress.percentComplete || 
          progress.percentage || 
          (progress.progress ? progress.progress * 100 : 0) || 
          0;

        const isTerminal = ['COMPLETED', 'ERROR', 'FAILED', 'CANCELLED'].includes(inv.status);

        return {
          id: inv.investigationId || inv.id, // Handle potential ID field variations
          entityValue: entityValue,
          merchantName: merchantName,
          status: inv.status,
          riskScore: typeof riskScore === 'number' ? riskScore : 0,
          progressPercent: Math.round(typeof progressPercent === 'number' ? progressPercent : 0),
          fraudTxCount: typeof fraudTxCount === 'number' ? fraudTxCount : 0,
          fraudPercent: typeof fraudPercent === 'number' ? fraudPercent : null,
          startTime: inv.createdAt || inv.created_at,
          endTime: isTerminal ? (inv.updatedAt || inv.updated_at) : undefined
        };
      });

      setInvestigations(mappedData);
      setLastRefreshed(new Date());
      setError(null);
    } catch (err) {
      console.error('Failed to fetch parallel investigations:', err);
      setError('Failed to load investigation data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [investigations.length]);

  // Initial fetch
  useEffect(() => {
    fetchInvestigations();
  }, [fetchInvestigations]);

  // Auto-refresh interval (10 seconds)
  useEffect(() => {
    const intervalId = setInterval(fetchInvestigations, 10000);
    return () => clearInterval(intervalId);
  }, [fetchInvestigations]);

  // Filtered investigations
  const filteredInvestigations = React.useMemo(() => {
    return investigations.filter(inv => {
      // Status filter
      if (statusFilter !== 'ALL' && inv.status !== statusFilter) {
        return false;
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          inv.id.toLowerCase().includes(query) ||
          inv.entityValue.toLowerCase().includes(query) ||
          inv.merchantName.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }, [investigations, statusFilter, searchQuery]);

  const handleCancelInvestigation = (id: string) => {
    setInvestigationToCancel(id);
    setIsCancelModalOpen(true);
  };

  const confirmCancelInvestigation = async () => {
    if (!investigationToCancel) return;

    try {
      await investigationService.cancelInvestigation(investigationToCancel, 'Cancelled by user from dashboard');
      // Refresh list to show updated status
      fetchInvestigations();
      setIsCancelModalOpen(false);
      setInvestigationToCancel(null);
    } catch (err) {
      console.error('Failed to cancel investigation:', err);
      setError('Failed to cancel investigation. Please try again.');
      setIsCancelModalOpen(false);
    }
  };

  const columns: Column<ParallelInvestigation>[] = [
    {
      header: 'Investigation ID',
      accessor: (row) => row.id,
      id: 'id',
      sortable: true,
      className: 'font-mono text-xs text-corporate-accentPrimary cursor-pointer hover:underline',
      cell: (value) => (
        <span onClick={(e) => {
          e.stopPropagation();
          // Navigate to progress page
          // Handle both standalone and shell routing contexts
          const targetPath = `/investigation/progress?id=${value}`;
          navigate(targetPath);
        }}>
          {value}
        </span>
      )
    },
    {
      header: 'Entity',
      accessor: (row) => row.entityValue,
      id: 'entityValue',
      sortable: true,
      className: 'font-medium text-white'
    },
    {
      header: 'Merchant',
      accessor: (row) => row.merchantName,
      id: 'merchantName',
      sortable: true,
      className: 'text-corporate-textSecondary'
    },
    {
      header: 'Status',
      accessor: (row) => row.status,
      id: 'status',
      sortable: true,
      cell: (value) => {
        let colorClass = 'text-corporate-textSecondary';
        let animate = false;
        
        switch (value) {
          case 'COMPLETED':
            colorClass = 'text-corporate-success';
            break;
          case 'IN_PROGRESS':
            colorClass = 'text-corporate-info';
            animate = true;
            break;
          case 'ERROR':
          case 'FAILED':
            colorClass = 'text-corporate-error';
            break;
          case 'CANCELLED':
            colorClass = 'text-corporate-warning';
            break;
        }
        
        return (
          <span className={`font-semibold ${colorClass} ${animate ? 'animate-pulse' : ''}`}>
            {value}
          </span>
        );
      }
    },
    {
      header: 'Progress',
      accessor: (row) => row.progressPercent,
      id: 'progress',
      sortable: true,
      width: '180px',
      cell: (value) => (
        <div className="w-full max-w-[180px]">
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-white/70 font-mono">{value}%</span>
          </div>
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden backdrop-blur-md border border-white/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]">
            <div 
              className="h-full bg-gradient-to-r from-corporate-accentPrimary/80 to-blue-400/80 rounded-full transition-all duration-700 ease-out relative shadow-[0_0_10px_rgba(59,130,246,0.5)]"
              style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAAXNSR0IArs4c6QAAADVJREFUKFNjZGBg+M+AAxIS4hgdI1QxTA5ck5KSEsY0EinGwEA0wCXHwMhIJBrZOMYZiW4AABt2B33X3Q8AAAAASUVORK5CYII=')] opacity-20 animate-slide-bg"></div>
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'Risk Score',
      accessor: (row) => row.riskScore,
      id: 'riskScore',
      sortable: true,
      cell: (value) => {
        if (value === 0) {
          return <span className="font-bold text-corporate-textSecondary">{value.toFixed(2)}</span>;
        }
        
        // Calculate lightness from 85% (light pink) down to 50% (bright red) based on risk score
        // Higher risk = darker/more intense red
        const lightness = 85 - (Math.min(1, Math.max(0, value)) * 35);
        
        return (
          <span 
            className="font-bold" 
            style={{ color: `hsl(0, 100%, ${lightness}%)` }}
          >
            {value.toFixed(2)}
          </span>
        );
      }
    },
    {
      header: 'Fraud Tx',
      accessor: (row) => row.fraudTxCount,
      id: 'fraudTxCount',
      sortable: true,
      className: 'text-right',
      cell: (value, row) => (
        <div className="flex flex-col items-end">
          <span className="font-medium">{value}</span>
          <span className="text-[10px] text-corporate-textTertiary">
            {row.fraudPercent !== null ? `${row.fraudPercent.toFixed(1)}%` : 'N/A'}
          </span>
        </div>
      )
    },
    {
      header: 'Duration',
      accessor: (row) => row.startTime,
      id: 'duration',
      sortable: true,
      cell: (value, row) => (
        <DurationDisplay 
          startTime={row.startTime} 
          endTime={row.endTime} 
          status={row.status} 
        />
      )
    },
    {
      header: '',
      id: 'actions',
      width: '40px',
      accessor: () => '',
      cell: (value, row) => {
        const canCancel = ['CREATED', 'SETTINGS', 'IN_PROGRESS'].includes(row.status);
        if (!canCancel) return null;
        
        return (
          <div className="invisible group-hover:visible flex justify-end">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCancelInvestigation(row.id);
              }}
              className="p-1 rounded-full text-corporate-textTertiary hover:text-corporate-error hover:bg-corporate-error/10 transition-colors"
              title="Cancel Investigation"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="min-h-screen bg-black text-corporate-textPrimary px-6 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-corporate-borderPrimary pb-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Parallel Investigations</h1>
            <p className="text-corporate-textSecondary">
              Active Batches: <span className="text-corporate-accentPrimary font-mono">{investigations.length}</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-corporate-textTertiary">
              Last updated: {lastRefreshed.toLocaleTimeString()}
            </span>
            <WizardButton 
              variant="primary" 
              onClick={triggerAnalysis}
              disabled={loading || triggering}
              icon={triggering ? <LoadingSpinner size="sm" /> : undefined}
            >
              Trigger Analysis
            </WizardButton>
            <WizardButton 
              variant="secondary" 
              onClick={fetchInvestigations}
              disabled={loading}
              icon={loading ? <LoadingSpinner size="sm" /> : undefined}
            >
              Refresh
            </WizardButton>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center bg-corporate-bgSecondary/30 p-4 rounded-lg border border-corporate-borderPrimary/50">
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-corporate-textTertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by ID, Entity, or Merchant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 block w-full bg-black/50 border border-corporate-borderPrimary rounded-md py-2 text-corporate-textPrimary placeholder-corporate-textTertiary focus:ring-corporate-accentPrimary focus:border-corporate-accentPrimary sm:text-sm"
            />
          </div>
          <div className="w-full md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full bg-black/50 border border-corporate-borderPrimary rounded-md py-2 pl-3 pr-10 text-corporate-textPrimary focus:ring-corporate-accentPrimary focus:border-corporate-accentPrimary sm:text-sm"
            >
              <option value="ALL">All Statuses</option>
              <option value="CREATED">Created</option>
              <option value="SETTINGS">Settings</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="ERROR">Error</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {loading && investigations.length === 0 ? (
          <SectionSkeleton rows={5} height="lg" className="mt-8" />
        ) : error ? (
          <div className="bg-corporate-bgSecondary/50 border border-corporate-error/50 rounded-lg p-8 text-center text-corporate-error">
            <p className="text-lg font-semibold">Error Loading Data</p>
            <p className="mt-2 text-sm">{error}</p>
            <WizardButton 
              variant="secondary" 
              className="mt-4"
              onClick={fetchInvestigations}
            >
              Retry
            </WizardButton>
          </div>
        ) : investigations.length === 0 ? (
          <div className="bg-corporate-bgSecondary/30 border border-corporate-borderPrimary rounded-lg p-12 text-center">
            <p className="text-corporate-textSecondary text-lg">No parallel investigations found.</p>
            <p className="text-corporate-textTertiary text-sm mt-2">
              Wait for the startup analysis to trigger new batches or check the logs.
            </p>
          </div>
        ) : (
          <div className="bg-black/40 backdrop-blur border border-corporate-borderPrimary rounded-lg overflow-hidden shadow-xl">
            <Table
              data={filteredInvestigations}
              config={{
                columns,
                onRowClick: (row) => navigate(`/investigation/progress?id=${row.id}`),
                getRowKey: (row) => row.id,
                sortable: true,
                paginated: true,
                pageSize: 50,
                emptyMessage: "No parallel investigations found matching your filters."
              }}
            />
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Investigation"
        size="sm"
      >
        <div className="space-y-6">
          <p className="text-corporate-textSecondary">
            Are you sure you want to cancel investigation <span className="font-mono text-corporate-textPrimary font-semibold">{investigationToCancel}</span>? 
            <br className="mb-2" />
            <span className="text-xs text-corporate-textTertiary">This action cannot be undone.</span>
          </p>
          <div className="flex justify-end gap-3">
            <WizardButton
              variant="secondary"
              onClick={() => setIsCancelModalOpen(false)}
            >
              Keep Investigation
            </WizardButton>
            <button
              onClick={confirmCancelInvestigation}
              className="px-4 py-2 rounded bg-corporate-error hover:bg-corporate-error/80 text-white font-medium transition-colors duration-200 text-sm"
            >
              Yes, Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ParallelInvestigationsPage;
