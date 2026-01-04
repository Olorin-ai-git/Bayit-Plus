/**
 * Integrations Page
 * 
 * Main page for managing Composio integrations and connections.
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import composioService, { ComposioConnection } from '../services/composioService';
import ComposioConnectionManager from '../components/integrations/ComposioConnectionManager';
import IntegrationCard from '../components/integrations/IntegrationCard';

export const IntegrationsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [connections, setConnections] = useState<ComposioConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterToolkit, setFilterToolkit] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  useEffect(() => {
    // Check if this is an OAuth callback
    const code = searchParams.get('code');
    const toolkit = searchParams.get('toolkit');
    const state = searchParams.get('state');

    if (code && toolkit) {
      handleOAuthCallback(code, toolkit, state || undefined);
    } else {
      loadConnections();
    }
  }, [searchParams]);

  const handleOAuthCallback = async (
    code: string,
    toolkit: string,
    state?: string
  ) => {
    try {
      setLoading(true);
      const redirectUri = `${window.location.origin}/integrations/callback`;
      
      await composioService.processCallback(toolkit, code, redirectUri, state);
      
      // Remove query params and reload connections
      window.history.replaceState({}, '', '/integrations');
      await loadConnections();
    } catch (err: any) {
      setError(`Failed to complete connection: ${err.message}`);
      setLoading(false);
    }
  };

  const loadConnections = async () => {
    try {
      setLoading(true);
      setError(null);
      const connectionList = await composioService.listConnections(
        filterToolkit || undefined,
        filterStatus || undefined
      );
      setConnections(connectionList);
    } catch (err: any) {
      setError(`Failed to load connections: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (connectionId: string) => {
    setConnections(connections.filter((c) => c.connection_id !== connectionId));
  };

  const handleTest = (connectionId: string) => {
    // Test result will be shown in the card component
    loadConnections();
  };

  useEffect(() => {
    loadConnections();
  }, [filterToolkit, filterStatus]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Integrations</h1>
        <p className="text-gray-600">
          Manage your Composio integrations and connections to external services.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connection Manager */}
        <div className="lg:col-span-1">
          <ComposioConnectionManager onConnectionComplete={loadConnections} />
        </div>

        {/* Connections List */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex gap-4">
            <select
              value={filterToolkit}
              onChange={(e) => setFilterToolkit(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All Toolkits</option>
              <option value="stripe">Stripe</option>
              <option value="shopify">Shopify</option>
              <option value="okta">Okta</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
            </select>

            <button
              onClick={loadConnections}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading connections...</p>
            </div>
          ) : connections.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-600">No connections found.</p>
              <p className="text-sm text-gray-500 mt-2">
                Connect a new integration to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {connections.map((connection) => (
                <IntegrationCard
                  key={connection.id}
                  connection={connection}
                  onDelete={handleDelete}
                  onTest={handleTest}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IntegrationsPage;

