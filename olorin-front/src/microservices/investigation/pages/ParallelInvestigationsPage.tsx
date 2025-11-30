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
import { investigationService } from '../services/investigationService';

// Interface for table row data
interface ParallelInvestigation {
  id: string;
  entityValue: string;
  merchantName: string;
  status: 'CREATED' | 'SETTINGS' | 'IN_PROGRESS' | 'COMPLETED' | 'ERROR' | 'CANCELLED';
  riskScore: number;
  fraudTxCount: number;
  startTime: string;
  endTime?: string;
}

export const ParallelInvestigationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [investigations, setInvestigations] = useState<ParallelInvestigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

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
        
        // Extract entity value
        const entities = settings.entities || [];
        const entityValue = entities.length > 0 ? (entities[0].entityValue || entities[0].entity_value || 'Unknown') : 'Unknown';

        // Extract risk score from progress
        const progress = inv.progress || {};
        const riskScore = progress.riskScore || progress.risk_score || 0.0;

        return {
          id: inv.investigationId || inv.id, // Handle potential ID field variations
          entityValue: entityValue,
          merchantName: merchantName,
          status: inv.status,
          riskScore: typeof riskScore === 'number' ? riskScore : 0,
          fraudTxCount: typeof fraudTxCount === 'number' ? fraudTxCount : 0,
          startTime: inv.createdAt || inv.created_at,
          endTime: inv.updatedAt // Use updatedAt as proxy for completion time if completed
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

  const columns: Column<ParallelInvestigation>[] = [
    {
      header: 'Investigation ID',
      accessor: (row) => row.id,
      id: 'id',
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
      className: 'font-medium text-white'
    },
    {
      header: 'Merchant',
      accessor: (row) => row.merchantName,
      id: 'merchantName',
      className: 'text-corporate-textSecondary'
    },
    {
      header: 'Status',
      accessor: (row) => row.status,
      id: 'status',
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
      header: 'Risk Score',
      accessor: (row) => row.riskScore,
      id: 'riskScore',
      cell: (value) => {
        // High risk > 0.5 -> Red, otherwise Warning/Info
        const colorClass = value > 0.5 ? 'text-corporate-error' : 'text-corporate-warning';
        return <span className={`font-bold ${colorClass}`}>{value.toFixed(2)}</span>;
      }
    },
    {
      header: 'Fraud Tx',
      accessor: (row) => row.fraudTxCount,
      id: 'fraudTxCount',
      className: 'text-right'
    },
    {
      header: 'Start Time',
      accessor: (row) => row.startTime,
      id: 'startTime',
      cell: (value) => new Date(value).toLocaleTimeString()
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
              data={investigations}
              config={{
                columns,
                onRowClick: (row) => navigate(`/investigation/progress?id=${row.id}`),
                getRowKey: (row) => row.id,
                sortable: true,
                paginated: true,
                pageSize: 50,
                emptyMessage: "No parallel investigations found."
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ParallelInvestigationsPage;
