/**
 * useMarkdownRenderer hook - Markdown rendering with widget support
 */

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { detectWidgetPlaceholders } from '../utils/markdownParser';

interface UseMarkdownRendererOptions {
  content: string;
  renderWidget?: (type: string, subtype: string) => React.ReactNode;
}

export function useMarkdownRenderer({ content, renderWidget }: UseMarkdownRendererOptions) {
  const processedContent = useMemo(() => {
    if (!renderWidget) {
      return content;
    }

    // For now, return content as-is
    // Widget replacement will be handled in ReportContent component
    return content;
  }, [content, renderWidget]);

  const components = {
    h1: ({ children, ...props }: any) => (
      <h1 className="text-2xl font-bold text-[#e9e7ff] mt-4 mb-2" {...props}>
        {children}
      </h1>
    ),
    h2: ({ children, ...props }: any) => (
      <h2 className="text-xl font-semibold text-[#e9e7ff] mt-3 mb-2" {...props}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }: any) => (
      <h3 className="text-lg font-medium text-[#e9e7ff] mt-2 mb-1" {...props}>
        {children}
      </h3>
    ),
    p: ({ children, ...props }: any) => (
      <p className="text-[#e9e7ff] mb-2 leading-relaxed" {...props}>
        {children}
      </p>
    ),
    code: ({ children, className, ...props }: any) => {
      const isInline = !className;
      return isInline ? (
        <code
          className="bg-[#10101a] px-1 py-0.5 rounded border border-white/12 text-[#e9e7ff] text-sm"
          {...props}
        >
          {children}
        </code>
      ) : (
        <code
          className="block bg-[#10101a] border border-white/12 p-3 rounded-xl overflow-auto text-sm text-[#e9e7ff]"
          {...props}
        >
          {children}
        </code>
      );
    },
    pre: ({ children, ...props }: any) => (
      <pre className="bg-[#10101a] border border-white/12 p-3 rounded-xl overflow-auto mb-2" {...props}>
        {children}
      </pre>
    ),
    table: ({ children, ...props }: any) => (
      <table className="w-full border-collapse my-2" {...props}>
        {children}
      </table>
    ),
    th: ({ children, ...props }: any) => (
      <th className="px-2 py-2 border-b border-white/8 text-left text-sm text-[#e9e7ff]" {...props}>
        {children}
      </th>
    ),
    td: ({ children, ...props }: any) => (
      <td className="px-2 py-2 border-b border-white/8 text-sm text-[#a5a1c2]" {...props}>
        {children}
      </td>
    ),
  };

  return {
    processedContent,
    renderMarkdown: () => (
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {processedContent}
      </ReactMarkdown>
    ),
  };
}

