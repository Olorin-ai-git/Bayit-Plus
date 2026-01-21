/**
 * SDK Configuration Component
 * 
 * Allows tenants to configure their preferred device fingerprint SDK.
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getConfig } from '../../shared/config/env.config';

type SDKProvider = 'fingerprint_pro' | 'seon' | 'ipqs';

interface SDKConfig {
  sdk_provider: SDKProvider;
}

export const SDKConfiguration: React.FC = () => {
  const [sdkProvider, setSdkProvider] = useState<SDKProvider>('fingerprint_pro');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const config = getConfig();
      const token = localStorage.getItem('auth_token');
      
      // Extract tenant_id from token or use default
      // In production, this would come from user context
      const tenantId = 'default'; // TODO: Get from auth context
      
      const response = await axios.get<SDKConfig>(
        `${config.api.baseUrl}/api/tenants/${tenantId}/device-sdk-config`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (response.data.sdk_provider) {
        setSdkProvider(response.data.sdk_provider);
      }
    } catch (err: any) {
      // Config might not exist yet, that's okay
      if (err.response?.status !== 404) {
        setError(`Failed to load configuration: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      
      const config = getConfig();
      const token = localStorage.getItem('auth_token');
      const tenantId = 'default'; // TODO: Get from auth context
      
      await axios.post(
        `${config.api.baseUrl}/api/tenants/${tenantId}/device-sdk-config`,
        { sdk_provider: sdkProvider },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(`Failed to save configuration: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Loading configuration...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h2 className="text-xl font-semibold mb-4">Device Fingerprint SDK Configuration</h2>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="sdk-provider" className="block text-sm font-medium text-gray-700 mb-2">
            Select SDK Provider
          </label>
          <select
            id="sdk-provider"
            value={sdkProvider}
            onChange={(e) => setSdkProvider(e.target.value as SDKProvider)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="fingerprint_pro">Fingerprint Pro</option>
            <option value="seon">SEON</option>
            <option value="ipqs">IPQualityScore (IPQS)</option>
          </select>
          <p className="mt-2 text-sm text-gray-500">
            This SDK will be used for all device fingerprinting operations for your tenant.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">Configuration saved successfully!</p>
          </div>
        )}

        <button
          onClick={saveConfig}
          disabled={saving}
          className={`w-full px-4 py-2 rounded-md font-medium transition-colors ${
            saving
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
};

export default SDKConfiguration;

