/**
 * ReportEditor Component - Markdown editor with widget insertion
 */

import React, { useEffect, useRef, useState } from 'react';
import { useReportEditor } from '../hooks/useReportEditor';
import { Report } from '../types/reports';
import { keyboardShortcuts } from '../utils/keyboardShortcuts';
import { TagChip } from './common/TagChip';

interface ReportEditorProps {
  report: Report | null;
  onSave: (report: Report) => void;
  onCancel: () => void;
}

const WIDGET_TEMPLATES = [
  { label: 'KPI Total', template: '{{KPI total}}' },
  { label: 'KPI Completed', template: '{{KPI completed}}' },
  { label: 'KPI Success', template: '{{KPI success}}' },
  { label: 'Chart Timeseries', template: '{{CHART timeseries}}' },
  { label: 'Chart Success', template: '{{CHART success}}' },
  { label: 'Chart Bar', template: '{{CHART hbar}}' },
  { label: 'Heatmap', template: '{{HEATMAP}}' },
  { label: 'Table Recent', template: '{{TABLE recent}}' },
];

export const ReportEditor: React.FC<ReportEditorProps> = ({ report, onSave, onCancel }) => {
  const {
    title,
    setTitle,
    content,
    setContent,
    tags,
    setTags,
    isSaving,
    hasChanges,
    save,
    insertWidget,
  } = useReportEditor({ report, onSave, onCancel });

  const [tagInput, setTagInput] = useState('');

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Keyboard shortcut: Ctrl/Cmd+S to save
  useEffect(() => {
    const unregister = keyboardShortcuts.register({
      key: 's',
      ctrl: true,
      meta: true,
      handler: (e) => {
        e.preventDefault();
        save();
      },
    });
    return unregister;
  }, [save]);

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  if (!report) {
    return (
      <div className="bg-black/40 backdrop-blur-md border-2 border-corporate-borderPrimary/40 rounded-xl overflow-hidden shadow-lg">
        <div className="p-6">
          <p className="text-corporate-textSecondary text-sm">No report selected for editing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black/40 backdrop-blur-md border-2 border-corporate-borderPrimary/40 rounded-xl overflow-hidden shadow-lg">
      <header className="flex items-center justify-between p-4 border-b border-corporate-borderPrimary/40 bg-black/30 backdrop-blur">
        <div className="flex-1">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Report title"
            className="w-full bg-transparent border-none text-corporate-textPrimary font-bold text-lg outline-none placeholder:text-corporate-textSecondary"
            aria-label="Report title"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-2 rounded border-2 border-corporate-borderPrimary/40 bg-black/30 backdrop-blur text-corporate-textSecondary text-sm hover:border-corporate-accentPrimary/60 transition-colors"
            aria-label="Cancel editing"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={isSaving || !hasChanges || !title.trim()}
            className="px-3 py-2 rounded bg-corporate-accentPrimary hover:bg-corporate-accentPrimaryHover text-white text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            aria-label="Save report"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      <div className="p-6">
        {/* Widget Insertion Buttons */}
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-black/30 backdrop-blur rounded-lg border-2 border-corporate-borderPrimary/40">
          <span className="text-xs text-corporate-textSecondary self-center mr-2">Insert:</span>
          {WIDGET_TEMPLATES.map((widget) => (
            <button
              key={widget.label}
              onClick={() => insertWidget(widget.template)}
              className="px-2 py-1 rounded border-2 border-corporate-borderPrimary/40 bg-black/40 backdrop-blur text-corporate-textSecondary text-xs hover:border-corporate-accentPrimary/60 transition-colors"
              aria-label={`Insert ${widget.label} widget`}
            >
              {widget.label}
            </button>
          ))}
        </div>

        {/* Markdown Editor */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your report in Markdown...&#10;&#10;You can use:&#10;- Headings: # H1, ## H2, ### H3&#10;- Lists: - item or 1. item&#10;- Code: `inline` or ```block```&#10;- Widgets: {{KPI total}}, {{CHART timeseries}}, etc."
          className="w-full min-h-[400px] bg-black/30 backdrop-blur text-corporate-textPrimary rounded-lg border-2 border-corporate-borderPrimary/40 p-3 font-mono text-sm leading-relaxed resize-y outline-none focus:border-corporate-accentPrimary/60 transition-colors placeholder:text-corporate-textSecondary"
          style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}
        />

        {/* Tag Management */}
        <div className="mt-4 p-3 bg-black/30 backdrop-blur rounded-lg border-2 border-corporate-borderPrimary/40">
          <div className="text-xs text-corporate-textSecondary mb-2">Tags</div>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag) => (
              <TagChip key={tag} tag={tag} onClick={() => removeTag(tag)} />
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Add tag..."
              className="flex-1 bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40 rounded px-2 py-1 text-sm text-corporate-textPrimary outline-none focus:border-corporate-accentPrimary/60 placeholder:text-corporate-textSecondary"
              aria-label="Add tag"
            />
            <button
              onClick={addTag}
              className="px-2 py-1 rounded border-2 border-corporate-borderPrimary/40 bg-black/40 backdrop-blur text-corporate-textSecondary text-xs hover:border-corporate-accentPrimary/60 transition-colors"
              aria-label="Add tag"
            >
              Add
            </button>
          </div>
        </div>

        {hasChanges && (
          <div className="mt-2 text-xs text-corporate-textSecondary">
            You have unsaved changes
          </div>
        )}
      </div>
    </div>
  );
};

