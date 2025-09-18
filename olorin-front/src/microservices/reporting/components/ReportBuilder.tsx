import React, { useState, useCallback } from 'react';
import { FileText, Download, Settings, Eye, Save, Trash2, Plus } from 'lucide-react';

interface ReportSection {
  id: string;
  type: 'summary' | 'risk-analysis' | 'timeline' | 'evidence' | 'recommendations' | 'custom';
  title: string;
  content: string;
  order: number;
  enabled: boolean;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  sections: ReportSection[];
  format: 'pdf' | 'docx' | 'html';
  createdAt: string;
  lastModified: string;
}

interface ReportBuilderProps {
  investigationId?: string;
  onSave?: (template: ReportTemplate) => void;
  onExport?: (template: ReportTemplate, format: string) => void;
  className?: string;
}

const ReportBuilder: React.FC<ReportBuilderProps> = ({
  investigationId,
  onSave,
  onExport,
  className = '',
}) => {
  const [template, setTemplate] = useState<ReportTemplate>({
    id: `template-${Date.now()}`,
    name: 'Investigation Report Template',
    description: 'Comprehensive fraud investigation report',
    format: 'pdf',
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    sections: [
      {
        id: '1',
        type: 'summary',
        title: 'Executive Summary',
        content: 'Investigation overview and key findings...',
        order: 1,
        enabled: true,
      },
      {
        id: '2',
        type: 'risk-analysis',
        title: 'Risk Analysis',
        content: 'Detailed risk assessment and scoring...',
        order: 2,
        enabled: true,
      },
      {
        id: '3',
        type: 'timeline',
        title: 'Investigation Timeline',
        content: 'Chronological sequence of investigation steps...',
        order: 3,
        enabled: true,
      },
      {
        id: '4',
        type: 'evidence',
        title: 'Evidence Summary',
        content: 'Key evidence and supporting documentation...',
        order: 4,
        enabled: true,
      },
      {
        id: '5',
        type: 'recommendations',
        title: 'Recommendations',
        content: 'Proposed actions and next steps...',
        order: 5,
        enabled: true,
      },
    ],
  });

  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string>('1');
  const [isGenerating, setIsGenerating] = useState(false);

  const sectionTypeConfig = {
    summary: { icon: FileText, color: 'blue', label: 'Executive Summary' },
    'risk-analysis': { icon: Settings, color: 'red', label: 'Risk Analysis' },
    timeline: { icon: Plus, color: 'green', label: 'Timeline' },
    evidence: { icon: Eye, color: 'purple', label: 'Evidence' },
    recommendations: { icon: Save, color: 'orange', label: 'Recommendations' },
    custom: { icon: FileText, color: 'gray', label: 'Custom Section' },
  };

  const updateSection = useCallback((sectionId: string, updates: Partial<ReportSection>) => {
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      ),
      lastModified: new Date().toISOString(),
    }));
  }, []);

  const addSection = useCallback(() => {
    const newSection: ReportSection = {
      id: `section-${Date.now()}`,
      type: 'custom',
      title: 'New Section',
      content: 'Enter section content here...',
      order: template.sections.length + 1,
      enabled: true,
    };

    setTemplate(prev => ({
      ...prev,
      sections: [...prev.sections, newSection],
      lastModified: new Date().toISOString(),
    }));
  }, [template.sections.length]);

  const removeSection = useCallback((sectionId: string) => {
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.filter(section => section.id !== sectionId),
      lastModified: new Date().toISOString(),
    }));
  }, []);

  const handleExport = async (format: 'pdf' | 'docx' | 'html') => {
    setIsGenerating(true);
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (onExport) {
        onExport({ ...template, format }, format);
      }

      // In production, this would trigger actual file download
      console.log(`Exporting report as ${format.toUpperCase()}...`);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave(template);
    }
    console.log('Template saved:', template);
  };

  const selectedSectionData = template.sections.find(s => s.id === selectedSection);

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Report Builder</h2>
            <p className="text-sm text-gray-600 mt-1">
              {investigationId ? `Investigation ${investigationId}` : 'Create and customize investigation reports'}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-md transition-colors ${
                isPreviewMode
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>{isPreviewMode ? 'Edit' : 'Preview'}</span>
            </button>
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Template</span>
            </button>
          </div>
        </div>

        {/* Template Info */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
            <input
              type="text"
              value={template.name}
              onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={template.description}
              onChange={(e) => setTemplate(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Export Format</label>
            <select
              value={template.format}
              onChange={(e) => setTemplate(prev => ({ ...prev, format: e.target.value as 'pdf' | 'docx' | 'html' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="pdf">PDF Document</option>
              <option value="docx">Word Document</option>
              <option value="html">HTML Report</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex h-96">
        {/* Sections List */}
        <div className="w-1/3 border-r border-gray-200 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Report Sections</h3>
            <button
              onClick={addSection}
              className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </button>
          </div>

          <div className="space-y-2">
            {template.sections
              .sort((a, b) => a.order - b.order)
              .map((section) => {
                const config = sectionTypeConfig[section.type];
                const IconComponent = config.icon;

                return (
                  <div
                    key={section.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedSection === section.id
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedSection(section.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={section.enabled}
                            onChange={(e) => updateSection(section.id, { enabled: e.target.checked })}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <IconComponent className={`w-4 h-4 text-${config.color}-600`} />
                        </div>
                        <div>
                          <div className="font-medium text-sm text-gray-900">
                            {section.title}
                          </div>
                          <div className="text-xs text-gray-500 capitalize">
                            {config.label}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-gray-400">
                          {section.order}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSection(section.id);
                          }}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Section Editor */}
        <div className="flex-1 p-4">
          {selectedSectionData ? (
            <div className="h-full flex flex-col">
              <div className="mb-4">
                <input
                  type="text"
                  value={selectedSectionData.title}
                  onChange={(e) => updateSection(selectedSectionData.id, { title: e.target.value })}
                  className="w-full px-3 py-2 text-lg font-medium border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Section title..."
                />
              </div>

              {isPreviewMode ? (
                <div className="flex-1 p-4 bg-gray-50 rounded-lg overflow-y-auto">
                  <div className="prose prose-sm max-w-none">
                    <h3 className="text-lg font-semibold mb-3">{selectedSectionData.title}</h3>
                    <div className="whitespace-pre-wrap">{selectedSectionData.content}</div>
                  </div>
                </div>
              ) : (
                <textarea
                  value={selectedSectionData.content}
                  onChange={(e) => updateSection(selectedSectionData.id, { content: e.target.value })}
                  className="flex-1 w-full px-3 py-2 border border-gray-300 rounded-md resize-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter section content..."
                />
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-2" />
                <p>Select a section to edit</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {template.sections.filter(s => s.enabled).length} of {template.sections.length} sections enabled
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleExport('html')}
              disabled={isGenerating}
              className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>HTML</span>
            </button>
            <button
              onClick={() => handleExport('docx')}
              disabled={isGenerating}
              className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Word</span>
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={isGenerating}
              className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isGenerating ? 'Generating...' : 'Export PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportBuilder;