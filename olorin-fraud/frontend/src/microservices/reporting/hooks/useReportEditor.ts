/**
 * useReportEditor hook - Editor state management for report editing
 */

import { useState, useCallback, useEffect } from 'react';
import { Report, ReportUpdate } from '../types/reports';
import { ReportService } from '../services/reportService';
import { useToast } from '@shared/components/ui/ToastProvider';

interface UseReportEditorOptions {
  report: Report | null;
  onSave?: (report: Report) => void;
  onCancel?: () => void;
}

export function useReportEditor({ report, onSave, onCancel }: UseReportEditorOptions) {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize editor with report data
  useEffect(() => {
    if (report) {
      console.log('[useReportEditor] Initializing editor with report:', {
        id: report.id,
        title: report.title,
        contentLength: report.content?.length || 0,
        contentPreview: report.content?.substring(0, 100) || '',
      });
      setTitle(report.title);
      setContent(report.content || '');
      setTags(report.tags || []);
      setHasChanges(false);
    } else {
      setTitle('');
      setContent('');
      setTags([]);
      setHasChanges(false);
    }
  }, [report]);

  // Track changes
  useEffect(() => {
    if (!report) {
      setHasChanges(title !== '' || content !== '');
      return;
    }
    setHasChanges(
      title !== report.title ||
        content !== report.content ||
        JSON.stringify(tags) !== JSON.stringify(report.tags || [])
    );
  }, [title, content, tags, report]);

  const save = useCallback(async () => {
    if (!report) {
      showToast('error', 'Error', 'No report to save');
      return;
    }

    if (!title.trim()) {
      showToast('error', 'Error', 'Title is required');
      return;
    }

    setIsSaving(true);
    try {
      const updateData: ReportUpdate = {
        title: title.trim(),
        content,
        tags,
      };

      console.log('[useReportEditor] Saving report:', {
        id: report.id,
        title: updateData.title,
        contentLength: content.length,
        contentPreview: JSON.stringify(content.substring(0, 200)),
        tags: tags.length,
        updateDataContentLength: updateData.content?.length || 0,
      });

      const updatedReport = await ReportService.updateReport(report.id, updateData);
      console.log('[useReportEditor] Report saved successfully:', {
        id: updatedReport.id,
        contentLength: updatedReport.content?.length || 0,
        contentPreview: JSON.stringify(updatedReport.content?.substring(0, 200) || ''),
        hasContent: !!updatedReport.content,
      });

      setHasChanges(false);
      showToast('success', 'Success', 'Report saved');
      onSave?.(updatedReport);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save report';
      showToast('error', 'Error', message);
    } finally{
      setIsSaving(false);
    }
  }, [report, title, content, tags, onSave]);

  const insertWidget = useCallback((widgetTemplate: string) => {
    const textarea = document.activeElement as HTMLTextAreaElement;
    if (textarea && textarea.tagName === 'TEXTAREA') {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent =
        content.substring(0, start) + widgetTemplate + content.substring(end);
      setContent(newContent);
      
      // Restore cursor position after widget
      setTimeout(() => {
        textarea.focus();
        const newPosition = start + widgetTemplate.length;
        textarea.setSelectionRange(newPosition, newPosition);
      }, 0);
    } else {
      // Append to end if no textarea focused
      setContent((prev) => prev + '\n' + widgetTemplate);
    }
  }, [content]);

  return {
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
    cancel: onCancel,
  };
}

