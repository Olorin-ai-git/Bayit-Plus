/**
 * Integration Card Component
 * 
 * Displays a single Composio connection with status, actions, and metadata.
 */

import React, { useState } from 'react';
import { ComposioConnection } from '../../services/composioService';
import composioService from '../../services/composioService';

interface IntegrationCardProps {
  connection: ComposioConnection;
  onDelete: (connectionId: string) => void;
  onTest: (connectionId: string) => void;
}

export const IntegrationCard: React.FC<IntegrationCardProps> = ({
  connection,
  onDelete,
  onTest,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to disconnect ${connection.toolkit_name}?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await composioService.deleteConnection(connection.connection_id);
      onDelete(connection.connection_id);
    } catch (error: any) {
      alert(`Failed to delete connection: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    setTestError(null);

    try {
      // Use appropriate test action based on toolkit
      const testActions: Record<string, { action: string; parameters: Record<string, any> }> = {
        stripe: { action: 'get_account', parameters: {} },
        shopify: { action: 'get_shop_info', parameters: {} },
        okta: { action: 'list_users', parameters: { limit: 1 } },
      };

      const testConfig = testActions[connection.toolkit_name] || {
        action: 'get_info',
        parameters: {},
      };

      const result = await composioService.testConnection(connection.connection_id, {
        toolkit: connection.toolkit_name,
        action: testConfig.action,
        parameters: testConfig.parameters,
      });

      setTestResult(result);
    } catch (error: any) {
      setTestError(error.message || 'Test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-yellow-100 text-yellow-800';
      case 'revoked':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isExpired = connection.expires_at
    ? new Date(connection.expires_at) < new Date()
    : false;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 capitalize">
            {connection.toolkit_name}
          </h3>
          <p className="text-sm text-gray-500">Connection ID: {connection.connection_id.slice(0, 8)}...</p>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(connection.status)}`}
        >
          {connection.status}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="text-sm text-gray-600">
          <strong>Created:</strong> {new Date(connection.created_at).toLocaleDateString()}
        </div>
        {connection.expires_at && (
          <div className={`text-sm ${isExpired ? 'text-red-600' : 'text-gray-600'}`}>
            <strong>Expires:</strong> {new Date(connection.expires_at).toLocaleDateString()}
            {isExpired && ' (Expired)'}
          </div>
        )}
        {connection.last_used_at && (
          <div className="text-sm text-gray-600">
            <strong>Last Used:</strong> {new Date(connection.last_used_at).toLocaleDateString()}
          </div>
        )}
      </div>

      {testResult && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800 font-medium">Test Successful</p>
          <pre className="text-xs text-green-700 mt-1 overflow-auto">
            {JSON.stringify(testResult.result, null, 2)}
          </pre>
        </div>
      )}

      {testError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800 font-medium">Test Failed</p>
          <p className="text-xs text-red-700 mt-1">{testError}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleTest}
          disabled={isTesting || connection.status !== 'active'}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            isTesting || connection.status !== 'active'
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isTesting ? 'Testing...' : 'Test Connection'}
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            isDeleting
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-red-500 text-white hover:bg-red-600'
          }`}
        >
          {isDeleting ? 'Deleting...' : 'Disconnect'}
        </button>
      </div>
    </div>
  );
};

export default IntegrationCard;

