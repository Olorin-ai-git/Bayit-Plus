/**
 * KPI Dashboard Component
 * Feature: KPI Dashboard Microservice
 * 
 * Real KPI dashboard for investigation portal (app.olorin.ai)
 * Displays fraud detection KPIs with tenant-scoped data
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { createApiClient } from '@api/client';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import type { KPIDashboardResponse } from './types/kpi.types';
import KPIDashboardTiles from './KPIDashboardTiles';
import KPIDashboardCharts from './KPIDashboardCharts';
import KPIDashboardBreakdowns from './KPIDashboardBreakdowns';

interface KPIDashboardProps {
  pilotId?: string;
}

const KPIDashboard: React.FC<KPIDashboardProps> = ({ pilotId: propPilotId }) => {
  const { pilotId: routePilotId } = useParams<{ pilotId: string }>();
  const pilotId = propPilotId || routePilotId;
  
  if (!pilotId) {
    return (
      <div className="p-6">
        <div className="bg-black/40 backdrop-blur border border-corporate-error rounded-lg p-4">
          <h3 className="text-lg font-medium text-corporate-error mb-2">
            Missing Pilot ID
          </h3>
          <p className="text-corporate-textSecondary">
            Pilot ID is required to load KPI dashboard. Please navigate to a valid pilot overview page.
          </p>
        </div>
      </div>
    );
  }
  
  const [dashboardData, setDashboardData] = useState<KPIDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const apiClient = createApiClient();
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get<KPIDashboardResponse>(
        `/api/v1/kpi/dashboard/${pilotId}`
      );
      
      if (response.success && response.data) {
        setDashboardData(response.data);
      } else {
        // No fallback error message - use actual error or empty string
        const errorMessage = response.success === false && response.error?.message
          ? response.error.message
          : 'Failed to load KPI dashboard data';
        setError(errorMessage);
      }
      
      setLoading(false);
    };
    
    fetchDashboardData();
  }, [pilotId]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <LoadingSpinner size="md" />
          <p className="mt-2 text-sm text-corporate-textSecondary">
            Loading KPI Dashboard...
          </p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-black/40 backdrop-blur border border-corporate-error rounded-lg p-4">
          <h3 className="text-lg font-medium text-corporate-error mb-2">
            Error Loading KPI Dashboard
          </h3>
          <p className="text-corporate-textSecondary">
            {error}
          </p>
        </div>
      </div>
    );
  }
  
  if (!dashboardData) {
    return (
      <div className="p-6">
        <div className="bg-black/40 backdrop-blur border border-corporate-warning rounded-lg p-4">
          <h3 className="text-lg font-medium text-corporate-warning mb-2">
            No Data Available
          </h3>
          <p className="text-corporate-textSecondary">
            KPI dashboard data is not available for this pilot. Metrics will appear once the nightly aggregation job populates the data.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="kpi-dashboard min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-corporate-accentPrimary mb-2">
            POC Overview - KPI Dashboard
          </h1>
          <p className="text-corporate-textSecondary">
            Pilot ID: {pilotId} | Tenant: {dashboardData.tenant_id}
          </p>
        </div>
        
        {/* Top Tiles */}
        <KPIDashboardTiles data={dashboardData} />
        
        {/* Charts */}
        <KPIDashboardCharts data={dashboardData} />
        
        {/* Breakdowns */}
        <KPIDashboardBreakdowns data={dashboardData} />
      </div>
    </div>
  );
};

export default KPIDashboard;

