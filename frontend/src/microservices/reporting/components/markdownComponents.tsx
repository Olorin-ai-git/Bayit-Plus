/**
 * Markdown Components - Custom renderers for react-markdown
 */

import React from 'react';
import { TOCItem } from '../utils/tocGenerator';

interface MarkdownComponentsProps {
  toc: TOCItem[];
}

export const createMarkdownComponents = (toc: TOCItem[]) => ({
  h1: ({ children, id, ...props }: any) => {
    const headingId = id || toc.find((item) => item.text === children)?.id || '';
    return (
      <h1 id={headingId} className="text-2xl font-bold text-gray-100 mt-6 mb-3" {...props}>
        {children}
      </h1>
    );
  },
  h2: ({ children, id, ...props }: any) => {
    const headingId = id || toc.find((item) => item.text === children)?.id || '';
    return (
      <h2 id={headingId} className="text-xl font-semibold text-gray-100 mt-5 mb-2" {...props}>
        {children}
      </h2>
    );
  },
  h3: ({ children, id, ...props }: any) => {
    const headingId = id || toc.find((item) => item.text === children)?.id || '';
    return (
      <h3 id={headingId} className="text-lg font-medium text-gray-100 mt-4 mb-2" {...props}>
        {children}
      </h3>
    );
  },
  p: ({ children, ...props }: any) => (
    <p className="text-gray-300 mb-3 leading-relaxed" {...props}>
      {children}
    </p>
  ),
  code: ({ children, className, ...props }: any) => {
    const isInline = !className;
    return isInline ? (
      <code
        className="bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700 text-gray-100 text-sm font-mono"
        {...props}
      >
        {children}
      </code>
    ) : (
      <code
        className="block bg-gray-800 border border-gray-700 p-3 rounded-lg overflow-auto text-sm text-gray-100 font-mono mb-3"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }: any) => (
    <pre className="bg-gray-800 border border-gray-700 p-3 rounded-lg overflow-auto mb-3" {...props}>
      {children}
    </pre>
  ),
  table: ({ children, ...props }: any) => (
    <table className="w-full border-collapse my-3" {...props}>
      {children}
    </table>
  ),
  th: ({ children, ...props }: any) => (
    <th className="px-3 py-2 border-b border-gray-700 text-left text-sm font-semibold text-gray-100 bg-gray-800" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }: any) => (
    <td className="px-3 py-2 border-b border-gray-700 text-sm text-gray-300" {...props}>
      {children}
    </td>
  ),
});

