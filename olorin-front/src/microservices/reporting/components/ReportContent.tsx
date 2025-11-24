/**
 * ReportContent Component - Renders markdown content with widgets
 */

import React, { useMemo, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { detectWidgetPlaceholders } from '../utils/markdownParser';
import { generateTOC, TOCItem } from '../utils/tocGenerator';
import { KPIWidget } from './widgets/KPIWidget';
import { ChartWidget } from './widgets/ChartWidget';
import { TableWidget } from './widgets/TableWidget';
import { useWidgetData } from '../hooks/useWidgetData';
import { createMarkdownComponents } from './markdownComponents';

interface ReportContentProps {
  content: string;
  onTOCGenerated?: (toc: TOCItem[]) => void;
}

export const ReportContent: React.FC<ReportContentProps> = ({ content, onTOCGenerated }) => {
  const { data: widgetData, loading: widgetLoading, error: widgetError } = useWidgetData();
  const placeholders = useMemo(() => {
    console.log('[ReportContent] Full content length:', content?.length || 0);
    console.log('[ReportContent] Content preview:', JSON.stringify(content?.substring(0, 200)));
    const detected = detectWidgetPlaceholders(content || '');
    console.log('[ReportContent] Detected placeholders:', detected);
    return detected;
  }, [content]);
  const [toc, setTOC] = useState<TOCItem[]>([]);

  // Generate TOC from markdown content
  useEffect(() => {
    const generateTOCFromContent = async () => {
      try {
        const tocItems = await generateTOC(content);
        setTOC(tocItems);
        onTOCGenerated?.(tocItems);
      } catch (error) {
        console.error('Failed to generate TOC:', error);
      }
    };

    generateTOCFromContent();
  }, [content, onTOCGenerated]);

  // Split content by widget placeholders and render widgets between markdown segments
  const segments = useMemo(() => {
    if (placeholders.length === 0) {
      return [{ type: 'markdown' as const, content }];
    }

    const result: Array<{ type: 'markdown' | 'widget'; content?: string; widget?: any }> = [];
    let lastIndex = 0;

    placeholders.forEach((placeholder) => {
      if (placeholder.startIndex > lastIndex) {
        result.push({
          type: 'markdown',
          content: content.substring(lastIndex, placeholder.startIndex),
        });
      }
      result.push({ type: 'widget', widget: placeholder });
      lastIndex = placeholder.endIndex;
    });

    if (lastIndex < content.length) {
      result.push({ type: 'markdown', content: content.substring(lastIndex) });
    }

    return result;
  }, [content, placeholders]);

  const renderWidget = (placeholder: typeof placeholders[0]) => {
    console.log('[ReportContent] Rendering widget:', placeholder.type, placeholder.subtype, 'data:', !!widgetData, 'loading:', widgetLoading);
    if (placeholder.type === 'KPI') {
      const kpiType = placeholder.subtype as 'total' | 'completed' | 'success';
      if (!['total', 'completed', 'success'].includes(kpiType)) {
        return (
          <div className="widget my-4 p-4 rounded-lg border border-red-700 bg-gray-800">
            <div className="text-sm text-red-400">Invalid KPI type: {kpiType}</div>
          </div>
        );
      }
      return (
        <KPIWidget
          key={placeholder.fullMatch}
          type={kpiType}
          data={widgetData}
          loading={widgetLoading}
        />
      );
    }
    if (placeholder.type === 'CHART') {
      const chartType =
        placeholder.subtype === 'timeseries'
          ? 'timeseries'
          : placeholder.subtype === 'success'
          ? 'success'
          : placeholder.subtype === 'hbar'
          ? 'hbar'
          : 'heat';
      return (
        <ChartWidget
          key={placeholder.fullMatch}
          type={chartType}
          data={widgetData}
          loading={widgetLoading}
        />
      );
    }
    if (placeholder.type === 'HEATMAP') {
      return (
        <ChartWidget
          key={placeholder.fullMatch}
          type="heat"
          data={widgetData}
          loading={widgetLoading}
        />
      );
    }
    if (placeholder.type === 'TABLE') {
      return (
        <TableWidget
          key={placeholder.fullMatch}
          type="recent"
          data={widgetData}
          loading={widgetLoading}
        />
      );
    }
    
    return (
      <div className="widget my-4 p-4 rounded-lg border border-yellow-700 bg-gray-800">
        <div className="text-sm text-yellow-400">Unknown widget type: {placeholder.type}</div>
      </div>
    );
  };

  const markdownComponents = useMemo(() => createMarkdownComponents(toc), [toc]);

  console.log('[ReportContent] Segments:', segments.length, segments.map(s => ({ type: s.type, widget: s.widget?.type })));
  console.log('[ReportContent] Widget data:', { hasData: !!widgetData, loading: widgetLoading, error: widgetError, total: widgetData?.total });
  
  // Debug: Show if widgets are detected
  const widgetCount = segments.filter(s => s.type === 'widget').length;
  
  // Show helpful message if content is empty
  if (!content || content.trim().length === 0) {
    return (
      <div className="doc leading-relaxed">
        <div className="p-6 border border-gray-700 rounded-lg bg-gray-800/50 text-center">
          <p className="text-gray-400 mb-2">This report is empty.</p>
          <p className="text-sm text-gray-500">Click "Edit" to add content and widgets.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="doc leading-relaxed prose prose-invert max-w-none">
      {widgetCount > 0 && process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-2 bg-purple-500/10 border border-purple-500/30 rounded text-xs text-purple-300">
          Debug: {widgetCount} widget(s) detected in content
        </div>
      )}
      {segments.map((segment, index) => {
        if (segment.type === 'widget') {
          console.log('[ReportContent] Rendering segment widget:', segment.widget);
          const widget = renderWidget(segment.widget);
          if (!widget) {
            console.error('[ReportContent] Widget returned null for:', segment.widget);
            return (
              <div key={`widget-error-${index}`} className="widget my-4 p-4 rounded-lg border border-red-700 bg-gray-800">
                <div className="text-sm text-red-400">Failed to render widget: {segment.widget.type} {segment.widget.subtype}</div>
              </div>
            );
          }
          console.log('[ReportContent] Widget rendered successfully:', segment.widget.type);
          return <React.Fragment key={`widget-${index}`}>{widget}</React.Fragment>;
        }
        const markdownContent = segment.content || '';
        // Render markdown even if it's just whitespace/newlines (but skip empty strings)
        if (markdownContent.length > 0) {
          return (
            <ReactMarkdown
              key={`markdown-${index}`}
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {markdownContent}
            </ReactMarkdown>
          );
        }
        return null;
      })}
    </div>
  );
};
