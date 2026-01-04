/**
 * Composio Connection Manager Component
 * 
 * Manages OAuth flows for connecting Composio toolkits.
 */

import React, { useState, useEffect } from 'react';
import composioService, { Toolkit } from '../../services/composioService';

interface ComposioConnectionManagerProps {
  onConnectionComplete?: () => void;
}

export const ComposioConnectionManager: React.FC<ComposioConnectionManagerProps> = ({
  onConnectionComplete,
}) => {
  const [toolkits, setToolkits] = useState<Toolkit[]>([]);
  const [selectedToolkit, setSelectedToolkit] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadToolkits();
  }, []);

  const loadToolkits = async () => {
    try {
      setLoading(true);
      const toolkitList = await composioService.listToolkits();
      setToolkits(toolkitList);
    } catch (err: any) {
      setError(`Failed to load toolkits: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!selectedToolkit) {
      setError('Please select a toolkit');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Get current origin for redirect URI
      const redirectUri = `${window.location.origin}/integrations/callback`;
      
      // Initiate OAuth flow
      const response = await composioService.initiateOAuth(
        selectedToolkit,
        redirectUri
      );

      // Redirect to OAuth URL
      window.location.href = response.oauth_url;
    } catch (err: any) {
      setError(`Failed to initiate connection: ${err.message}`);
      setIsConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Loading toolkits...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h2 className="text-xl font-semibold mb-4">Connect New Integration</h2>

      <div className="space-y-4">
        <div>
          <label htmlFor="toolkit" className="block text-sm font-medium text-gray-700 mb-2">
            Select Integration
          </label>
          <select
            id="toolkit"
            value={selectedToolkit}
            onChange={(e) => setSelectedToolkit(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Select a toolkit --</option>
            {toolkits.map((toolkit) => (
              <option key={toolkit.name} value={toolkit.name}>
                {toolkit.name} {toolkit.description ? `- ${toolkit.description}` : ''}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <button
          onClick={handleConnect}
          disabled={!selectedToolkit || isConnecting}
          className={`w-full px-4 py-2 rounded-md font-medium transition-colors ${
            !selectedToolkit || isConnecting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isConnecting ? 'Connecting...' : 'Connect'}
        </button>

        <p className="text-xs text-gray-500">
          You will be redirected to authorize the connection. After authorization, you'll be
          redirected back to this page.
        </p>
      </div>
    </div>
  );
};

export default ComposioConnectionManager;

