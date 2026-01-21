/**
 * Template Selector Component
 * Feature: 004-new-olorin-frontend
 *
 * Dropdown for selecting investigation templates with Olorin purple styling.
 * Integrates with wizardStore to load/save investigation settings.
 */

import React, { useState, useEffect } from 'react';
import { useWizardStore } from '@shared/store/wizardStore';
import { InvestigationSettings } from '@shared/types/wizard.types';
import { ChevronDownIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

export interface TemplateOption {
  id: string;
  name: string;
  description: string;
  settings: InvestigationSettings;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateSelectorProps {
  onTemplateSelect?: (template: TemplateOption | null) => void;
  onTemplateCreate?: () => void;
  onTemplateDelete?: (templateId: string) => void;
  className?: string;
}

/**
 * Template selector with create/delete capabilities
 */
export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  onTemplateSelect,
  onTemplateCreate,
  onTemplateDelete,
  className = ''
}) => {
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const updateSettings = useWizardStore((state) => state.updateSettings);

  // Load templates from storage on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    try {
      const stored = localStorage.getItem('olorin-templates');
      if (stored) {
        const parsed = JSON.parse(stored);
        setTemplates(parsed);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleTemplateSelect = (template: TemplateOption | null) => {
    setSelectedTemplateId(template?.id || null);
    setIsDropdownOpen(false);

    if (template) {
      updateSettings(template.settings);
    }

    if (onTemplateSelect) {
      onTemplateSelect(template);
    }
  };

  const handleTemplateCreate = () => {
    setIsDropdownOpen(false);
    if (onTemplateCreate) {
      onTemplateCreate();
    }
  };

  const handleTemplateDelete = (templateId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    const updatedTemplates = templates.filter(t => t.id !== templateId);
    setTemplates(updatedTemplates);

    try {
      localStorage.setItem('olorin-templates', JSON.stringify(updatedTemplates));
    } catch (error) {
      console.error('Error saving templates:', error);
    }

    if (selectedTemplateId === templateId) {
      setSelectedTemplateId(null);
      handleTemplateSelect(null);
    }

    if (onTemplateDelete) {
      onTemplateDelete(templateId);
    }
  };

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className={`relative ${className}`}>
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40 rounded-lg hover:bg-black/50 transition-colors text-left"
        disabled={isLoading}
      >
        <div className="flex-1">
          <span className="text-sm font-medium text-corporate-textPrimary">
            {selectedTemplate ? selectedTemplate.name : 'Select Template'}
          </span>
          {selectedTemplate && (
            <p className="text-xs text-corporate-textTertiary mt-1">
              {selectedTemplate.description}
            </p>
          )}
        </div>
        <ChevronDownIcon
          className={`w-5 h-5 text-corporate-textSecondary transition-transform ${
            isDropdownOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div className="absolute z-50 w-full mt-2 bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {/* Create New Template */}
          <button
            type="button"
            onClick={handleTemplateCreate}
            className="w-full flex items-center px-4 py-3 hover:bg-black/50 transition-colors border-b border-corporate-borderPrimary"
          >
            <PlusIcon className="w-5 h-5 text-corporate-accentPrimary mr-3" />
            <span className="text-sm font-medium text-corporate-accentPrimary">
              Create New Template
            </span>
          </button>

          {/* Template List */}
          {templates.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-corporate-textTertiary">
                No templates available
              </p>
            </div>
          ) : (
            templates.map((template) => (
              <div
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className={`flex items-center justify-between px-4 py-3 hover:bg-black/50 transition-colors cursor-pointer ${
                  selectedTemplateId === template.id ? 'bg-black/50' : ''
                }`}
              >
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-corporate-textPrimary">
                    {template.name}
                  </h4>
                  <p className="text-xs text-corporate-textTertiary mt-1">
                    {template.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleTemplateDelete(template.id, e)}
                  className="ml-3 p-2 hover:bg-corporate-error/20 rounded transition-colors"
                  title="Delete template"
                >
                  <TrashIcon className="w-4 h-4 text-corporate-error" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default TemplateSelector;
