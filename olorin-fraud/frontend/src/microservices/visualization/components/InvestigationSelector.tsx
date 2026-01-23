/**
 * Investigation Selector Component
 * Feature: 002-visualization-microservice
 *
 * Dropdown selector for choosing which investigation to visualize.
 * Fetches available investigations from backend API.
 *
 * @module visualization/components/InvestigationSelector
 */

import React, { useState, useEffect } from 'react';

// Environment configuration (NO FALLBACKS - fail-fast for security)
const API_BASE_URL = (() => {
  const url = process.env.REACT_APP_API_BASE_URL;
  if (!url) {
    throw new Error(
      'CRITICAL: REACT_APP_API_BASE_URL is not set. ' +
      'Configure it in your .env file.'
    );
  }
  return url;
})();
const REQUEST_TIMEOUT_MS = parseInt(process.env.REACT_APP_REQUEST_TIMEOUT_MS || '30000', 10);

// Module-level flag to prevent duplicate calls across component remounts (e.g., React StrictMode)
let isFetchInProgress = false;
let fetchPromise: Promise<Investigation[]> | null = null;

interface Investigation {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

interface InvestigationSelectorProps {
  selectedId?: string;
  onSelect: (investigationId: string) => void;
  className?: string;
}

export function InvestigationSelector({
  selectedId,
  onSelect,
  className = ''
}: InvestigationSelectorProps) {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Prevent duplicate calls - if a fetch is already in progress, reuse the promise
    if (isFetchInProgress && fetchPromise) {
      console.log('[InvestigationSelector] ⏸️ Fetch already in progress, reusing existing promise');
      fetchPromise.then((data) => {
        setInvestigations(data);
        setLoading(false);
      }).catch((err) => {
        console.error('[InvestigationSelector] Error from shared fetch:', err);
        setError(err instanceof Error ? err.message : 'Failed to load investigations');
        setLoading(false);
      });
      return;
    }

    // Mark fetch as in progress
    isFetchInProgress = true;

    const fetchInvestigations = async (): Promise<Investigation[]> => {
      try {
        setLoading(true);
        setError(null);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        const response = await fetch(`${API_BASE_URL}/api/v1/investigations`, {
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Failed to fetch investigations: ${response.statusText}`);
        }

        const data = await response.json();
        setInvestigations(data);
        setLoading(false);
        return data;
      } catch (err) {
        console.error('[InvestigationSelector] Fetch error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load investigations';
        setError(errorMessage);
        setLoading(false);
        throw err; // Re-throw so shared promise can handle it
      } finally {
        // Always clear the in-progress flag when done
        isFetchInProgress = false;
        fetchPromise = null;
      }
    };

    // Store promise so other instances can reuse it
    fetchPromise = fetchInvestigations();
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500" />
        <span className="text-sm text-gray-400">Loading investigations...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`px-3 py-2 bg-red-900/20 border border-red-500 rounded ${className}`}>
        <span className="text-sm text-red-400">{error}</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <select
        value={selectedId || ''}
        onChange={(e) => onSelect(e.target.value)}
        className="block w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors cursor-pointer"
        aria-label="Select investigation"
      >
        <option value="" disabled>
          Select an investigation
        </option>
        {investigations.map((inv) => (
          <option key={inv.id} value={inv.id}>
            {inv.name} ({inv.status})
          </option>
        ))}
      </select>

      {/* Dropdown icon */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
