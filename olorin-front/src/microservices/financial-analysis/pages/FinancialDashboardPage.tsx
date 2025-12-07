/**
 * Financial Dashboard Page
 * Feature: 025-financial-analysis-frontend
 *
 * Main dashboard for financial analysis at /financial-analysis.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { WizardButton } from '@shared/components/WizardButton';
import SectionSkeleton from '@shared/components/SectionSkeleton';
import { Table } from '@shared/components/Table';
import type { Column } from '@shared/components/Table';
import { useFinancialDashboard } from '../hooks/useFinancialDashboard';
import { FinancialOverview } from '../components/dashboard/FinancialOverview';
import { ConfusionMatrixDisplay } from '../components/dashboard/ConfusionMatrixDisplay';
import { MerchantBreakdown } from '../components/dashboard/MerchantBreakdown';
import { RevenueImpactChart } from '../components/dashboard/RevenueImpactChart';
import { CurrencyDisplay } from '../../investigation/components/financial/CurrencyDisplay';
import { getNetValueColorClass } from '../../investigation/utils/currencyFormatter';
import type { InvestigationListItem } from '../services/financialAnalysisService';

const createColumns = (onNavigate: (id: string) => void): Column<InvestigationListItem>[] => [
  {
    header: 'Investigation',
    id: 'id',
    accessor: (row) => row.id,
    cell: (value) => (
      <span className="font-mono text-xs text-corporate-accentPrimary cursor-pointer hover:underline" onClick={() => onNavigate(value)}>
        {value}
      </span>
    ),
  },
  { header: 'Entity', id: 'entity', accessor: (row) => row.entityValue },
  { header: 'Merchant', id: 'merchant', accessor: (row) => row.merchantName },
  {
    header: 'Saved GMV',
    id: 'savedGmv',
    accessor: (row) => row.savedFraudGmv,
    cell: (value) => <span className="text-green-400"><CurrencyDisplay value={value} format="compact" /></span>,
  },
  {
    header: 'Lost Rev',
    id: 'lostRev',
    accessor: (row) => row.lostRevenues,
    cell: (value) => <span className="text-red-400"><CurrencyDisplay value={value} format="compact" /></span>,
  },
  {
    header: 'Net Value',
    id: 'netValue',
    accessor: (row) => row.netValue,
    cell: (value) => <span className={getNetValueColorClass(value)}><CurrencyDisplay value={value} format="compact" /></span>,
  },
  {
    header: 'Precision',
    id: 'precision',
    accessor: (row) => row.precision,
    cell: (value) => value !== null ? `${(value * 100).toFixed(1)}%` : '--',
  },
];

export const FinancialDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useFinancialDashboard();
  const handleNavigate = (id: string) => navigate(`/financial-analysis/investigation/${id}`);
  const columns = React.useMemo(() => createColumns(handleNavigate), []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6">
        <SectionSkeleton rows={8} height="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="bg-corporate-bgSecondary/50 border border-corporate-error/50 rounded-lg p-8 text-center">
          <p className="text-lg font-semibold text-corporate-error">Error Loading Dashboard</p>
          <p className="mt-2 text-sm text-corporate-textSecondary">{error}</p>
          <WizardButton variant="secondary" className="mt-4" onClick={refetch}>Retry</WizardButton>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-black text-white px-6 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center border-b border-corporate-borderPrimary pb-4">
          <div>
            <h1 className="text-2xl font-bold">Financial Analysis Dashboard</h1>
            <p className="text-corporate-textSecondary mt-1">{data.summary.investigationCount} investigations analyzed</p>
          </div>
          <WizardButton variant="secondary" onClick={refetch} loading={loading}>Refresh</WizardButton>
        </div>
        <FinancialOverview summary={data.summary} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RevenueImpactChart investigations={data.investigations} />
          <ConfusionMatrixDisplay matrix={data.summary.aggregateConfusionMatrix} />
        </div>
        <MerchantBreakdown investigations={data.investigations} />
        <div className="bg-black/40 backdrop-blur border border-corporate-borderPrimary rounded-lg overflow-hidden">
          <Table data={data.investigations} config={{ columns, sortable: true, paginated: true, pageSize: 20, onRowClick: (row) => handleNavigate(row.id), getRowKey: (row) => row.id, emptyMessage: 'No investigations found' }} />
        </div>
      </div>
    </div>
  );
};

export default FinancialDashboardPage;
