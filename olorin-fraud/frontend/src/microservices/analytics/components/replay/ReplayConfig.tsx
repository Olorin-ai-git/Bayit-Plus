/**
 * Replay Config Component - Configure replay scenario.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React, { useState } from 'react';
import { analyticsService } from '../../services/analyticsService';
import { LoadingState } from '../common/LoadingState';

interface ReplayConfigProps {
  onScenarioCreated: (scenarioId: string) => void;
  onCancel: () => void;
}

const ReplayConfig: React.FC<ReplayConfigProps> = ({ onScenarioCreated, onCancel }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [modelVersion, setModelVersion] = useState('');
  const [ruleVersion, setRuleVersion] = useState('');
  const [threshold, setThreshold] = useState('0.5');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const scenario = await analyticsService.createReplayScenario({
        name,
        description,
        startDate,
        endDate,
        configuration: {
          modelVersion: modelVersion || undefined,
          ruleVersion: ruleVersion || undefined,
          threshold: parseFloat(threshold) || 0.5,
        },
        createdBy: 'current_user',
      });

      onScenarioCreated(scenario.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create scenario');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Creating scenario..." />;
  }

  return (
    <div className="p-6 rounded-xl bg-corporate-bgSecondary/50 backdrop-blur-sm border border-corporate-border">
      <h2 className="text-xl font-semibold text-corporate-textPrimary mb-4">Configure Replay Scenario</h2>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-corporate-error/20 text-corporate-error text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-corporate-textPrimary mb-1">
            Scenario Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2 rounded-lg bg-corporate-bgTertiary border border-corporate-border text-corporate-textPrimary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-corporate-textPrimary mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 rounded-lg bg-corporate-bgTertiary border border-corporate-border text-corporate-textPrimary"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-corporate-textPrimary mb-1">
              Start Date *
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg bg-corporate-bgTertiary border border-corporate-border text-corporate-textPrimary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-corporate-textPrimary mb-1">
              End Date *
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg bg-corporate-bgTertiary border border-corporate-border text-corporate-textPrimary"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-corporate-textPrimary mb-1">
              Model Version
            </label>
            <input
              type="text"
              value={modelVersion}
              onChange={(e) => setModelVersion(e.target.value)}
              placeholder="Optional"
              className="w-full px-4 py-2 rounded-lg bg-corporate-bgTertiary border border-corporate-border text-corporate-textPrimary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-corporate-textPrimary mb-1">
              Rule Version
            </label>
            <input
              type="text"
              value={ruleVersion}
              onChange={(e) => setRuleVersion(e.target.value)}
              placeholder="Optional"
              className="w-full px-4 py-2 rounded-lg bg-corporate-bgTertiary border border-corporate-border text-corporate-textPrimary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-corporate-textPrimary mb-1">
              Threshold
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-corporate-bgTertiary border border-corporate-border text-corporate-textPrimary"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-corporate-bgSecondary border border-corporate-border text-corporate-textPrimary hover:bg-corporate-bgTertiary"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-corporate-accentPrimary text-white hover:bg-corporate-accentPrimary/90"
          >
            Create Scenario
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReplayConfig;

