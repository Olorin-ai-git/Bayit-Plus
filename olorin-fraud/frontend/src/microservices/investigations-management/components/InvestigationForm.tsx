/**
 * Investigation Form Component
 * Form for creating and editing investigations
 */

import React from 'react';
import { Investigation, InvestigationFormData, InvestigationStatus } from '../types/investigations';

interface InvestigationFormProps {
  investigation?: Investigation | null;
  onSubmit: (data: InvestigationFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const DEFAULT_SOURCES = ['SIEM', 'EDR', 'Cloud', 'Identity', 'Payments'];
const DEFAULT_TOOLS = ['YARA', 'Sandbox', 'Graph', 'LLM', 'Risk'];
const RISK_MODELS = ['v3.2', 'v3.1', 'v2.9'];
const STATUS_OPTIONS: InvestigationStatus[] = ['pending', 'in-progress', 'completed', 'failed', 'archived'];

export const InvestigationForm: React.FC<InvestigationFormProps> = ({
  investigation,
  onSubmit,
  onCancel,
  isSubmitting = false
}) => {
  const isEditMode = !!investigation;

  const [formData, setFormData] = React.useState<InvestigationFormData>({
    name: investigation?.name || '',
    owner: investigation?.owner || '',
    description: investigation?.description || '',
    riskModel: investigation?.riskModel || 'v3.2',
    sources: investigation?.sources || [],
    tools: investigation?.tools || [],
    from: investigation?.from ? new Date(investigation.from).toISOString().slice(0, 16) : '',
    to: investigation?.to ? new Date(investigation.to).toISOString().slice(0, 16) : '',
    status: investigation?.status || 'pending',
    autoRun: false
  });

  const [selectedSources, setSelectedSources] = React.useState<Set<string>>(
    new Set(investigation?.sources || [])
  );
  const [selectedTools, setSelectedTools] = React.useState<Set<string>>(
    new Set(investigation?.tools || [])
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.owner.trim()) {
      return;
    }

    onSubmit({
      ...formData,
      sources: Array.from(selectedSources),
      tools: Array.from(selectedTools)
    });
  };

  const toggleSource = (source: string) => {
    const newSet = new Set(selectedSources);
    if (newSet.has(source)) {
      newSet.delete(source);
    } else {
      newSet.add(source);
    }
    setSelectedSources(newSet);
  };

  const toggleTool = (tool: string) => {
    const newSet = new Set(selectedTools);
    if (newSet.has(tool)) {
      newSet.delete(tool);
    } else {
      newSet.add(tool);
    }
    setSelectedTools(newSet);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Name */}
        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-corporate-textSecondary mb-2">
            Name <span className="text-corporate-error">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            maxLength={80}
            className="w-full px-4 py-2 bg-corporate-bgSecondary border border-corporate-borderPrimary/40 rounded-lg text-corporate-textPrimary focus:border-corporate-accentPrimary focus:outline-none focus:ring-2 focus:ring-corporate-accentPrimary/20"
            placeholder="Investigation name"
          />
        </div>

        {/* Owner */}
        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-corporate-textSecondary mb-2">
            Owner <span className="text-corporate-error">*</span>
          </label>
          <input
            type="text"
            value={formData.owner}
            onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
            required
            maxLength={50}
            className="w-full px-4 py-2 bg-corporate-bgSecondary border border-corporate-borderPrimary/40 rounded-lg text-corporate-textPrimary focus:border-corporate-accentPrimary focus:outline-none focus:ring-2 focus:ring-corporate-accentPrimary/20"
            placeholder="e.g. gil_klainert"
          />
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-corporate-textSecondary mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            maxLength={240}
            rows={3}
            className="w-full px-4 py-2 bg-corporate-bgSecondary border border-corporate-borderPrimary/40 rounded-lg text-corporate-textPrimary focus:border-corporate-accentPrimary focus:outline-none focus:ring-2 focus:ring-corporate-accentPrimary/20 resize-vertical"
            placeholder="Investigation description"
          />
        </div>

        {/* Sources */}
        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-corporate-textSecondary mb-2">
            Sources
          </label>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_SOURCES.map(source => (
              <button
                key={source}
                type="button"
                onClick={() => toggleSource(source)}
                className={`px-3 py-1 rounded-full text-xs border transition-all ${
                  selectedSources.has(source)
                    ? 'bg-corporate-accentPrimary/20 border-corporate-accentPrimary text-corporate-accentPrimary shadow-lg shadow-corporate-accentPrimary/20'
                    : 'bg-corporate-bgSecondary border-corporate-borderPrimary/40 text-corporate-textSecondary hover:border-corporate-accentPrimary/60'
                }`}
              >
                {source}
              </button>
            ))}
          </div>
        </div>

        {/* Tools */}
        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-corporate-textSecondary mb-2">
            Tools
          </label>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_TOOLS.map(tool => (
              <button
                key={tool}
                type="button"
                onClick={() => toggleTool(tool)}
                className={`px-3 py-1 rounded-full text-xs border transition-all ${
                  selectedTools.has(tool)
                    ? 'bg-corporate-accentPrimary/20 border-corporate-accentPrimary text-corporate-accentPrimary shadow-lg shadow-corporate-accentPrimary/20'
                    : 'bg-corporate-bgSecondary border-corporate-borderPrimary/40 text-corporate-textSecondary hover:border-corporate-accentPrimary/60'
                }`}
              >
                {tool}
              </button>
            ))}
          </div>
        </div>

        {/* Risk Model */}
        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-corporate-textSecondary mb-2">
            Risk Model
          </label>
          <select
            value={formData.riskModel}
            onChange={(e) => setFormData({ ...formData, riskModel: e.target.value })}
            className="w-full px-4 py-2 bg-corporate-bgSecondary border border-corporate-borderPrimary/40 rounded-lg text-corporate-textPrimary focus:border-corporate-accentPrimary focus:outline-none focus:ring-2 focus:ring-corporate-accentPrimary/20"
          >
            {RISK_MODELS.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-corporate-textSecondary mb-2">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as InvestigationStatus })}
            className="w-full px-4 py-2 bg-corporate-bgSecondary border border-corporate-borderPrimary/40 rounded-lg text-corporate-textPrimary focus:border-corporate-accentPrimary focus:outline-none focus:ring-2 focus:ring-corporate-accentPrimary/20"
          >
            {STATUS_OPTIONS.map(status => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
              </option>
            ))}
          </select>
        </div>

        {/* Time Range */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-corporate-textSecondary mb-2">
            Time Range
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-corporate-textTertiary mb-1">From</label>
              <input
                type="datetime-local"
                value={formData.from}
                onChange={(e) => setFormData({ ...formData, from: e.target.value })}
                className="w-full px-4 py-2 bg-corporate-bgSecondary border border-corporate-borderPrimary/40 rounded-lg text-corporate-textPrimary focus:border-corporate-accentPrimary focus:outline-none focus:ring-2 focus:ring-corporate-accentPrimary/20"
              />
            </div>
            <div>
              <label className="block text-xs text-corporate-textTertiary mb-1">To</label>
              <input
                type="datetime-local"
                value={formData.to}
                onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                className="w-full px-4 py-2 bg-corporate-bgSecondary border border-corporate-borderPrimary/40 rounded-lg text-corporate-textPrimary focus:border-corporate-accentPrimary focus:outline-none focus:ring-2 focus:ring-corporate-accentPrimary/20"
              />
            </div>
          </div>
        </div>

        {/* Auto-run Toggle */}
        <div className="md:col-span-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={formData.autoRun}
                onChange={(e) => setFormData({ ...formData, autoRun: e.target.checked })}
                className="sr-only"
              />
              <div className={`w-11 h-6 rounded-full transition-all ${
                formData.autoRun
                  ? 'bg-gradient-to-r from-corporate-accentPrimary to-corporate-accentSecondary'
                  : 'bg-corporate-bgSecondary border border-corporate-borderPrimary/40'
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full transition-transform mt-0.5 ${
                  formData.autoRun ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </div>
            </div>
            <span className="text-sm text-corporate-textSecondary">
              Auto-run after create
            </span>
          </label>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-corporate-borderPrimary/40">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-corporate-bgSecondary border border-corporate-borderPrimary/40 rounded-lg text-corporate-textSecondary hover:border-corporate-accentPrimary transition-colors"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !formData.name.trim() || !formData.owner.trim()}
          className="px-4 py-2 bg-gradient-to-r from-corporate-accentPrimary to-corporate-accentSecondary text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-corporate-accentPrimary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
};

