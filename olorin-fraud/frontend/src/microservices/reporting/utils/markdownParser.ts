/**
 * Markdown Parser Utility - Widget placeholder detection and parsing
 */

export interface WidgetPlaceholder {
  type: 'KPI' | 'CHART' | 'TABLE' | 'HEATMAP';
  subtype: string;
  fullMatch: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Detect widget placeholders in markdown content
 * Format: {{WIDGET_TYPE subtype}} or {{HEATMAP}} (no subtype)
 */
export function detectWidgetPlaceholders(content: string): WidgetPlaceholder[] {
  const placeholders: WidgetPlaceholder[] = [];
  
  // First, match HEATMAP without subtype: {{HEATMAP}}
  const heatmapRegex = /\{\{HEATMAP\}\}/g;
  let match;
  while ((match = heatmapRegex.exec(content)) !== null) {
    placeholders.push({
      type: 'HEATMAP',
      subtype: '',
      fullMatch: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }
  
  // Then match other widgets with subtype: {{TYPE subtype}}
  const widgetRegex = /\{\{(\w+)\s+(\w+)\}\}/g;
  while ((match = widgetRegex.exec(content)) !== null) {
    const [fullMatch, type, subtype] = match;
    const startIndex = match.index;
    const endIndex = startIndex + fullMatch.length;

    // Skip HEATMAP here since we already handled it
    if (type === 'HEATMAP') {
      continue;
    }

    // Normalize type
    let normalizedType: WidgetPlaceholder['type'];
    if (type === 'KPI') {
      normalizedType = 'KPI';
    } else if (type === 'CHART') {
      normalizedType = 'CHART';
    } else if (type === 'TABLE') {
      normalizedType = 'TABLE';
    } else {
      continue; // Skip unknown types
    }

    placeholders.push({
      type: normalizedType,
      subtype,
      fullMatch,
      startIndex,
      endIndex,
    });
  }

  // Sort by startIndex to maintain order
  return placeholders.sort((a, b) => a.startIndex - b.startIndex);
}

/**
 * Replace widget placeholders with React component placeholders
 * This is used during markdown rendering to inject widget components
 */
export function replaceWidgetPlaceholders(
  content: string,
  replacer: (placeholder: WidgetPlaceholder) => string
): string {
  const placeholders = detectWidgetPlaceholders(content);
  let result = content;
  
  // Process in reverse order to maintain indices
  for (let i = placeholders.length - 1; i >= 0; i--) {
    const placeholder = placeholders[i];
    const replacement = replacer(placeholder);
    result =
      result.slice(0, placeholder.startIndex) +
      replacement +
      result.slice(placeholder.endIndex);
  }

  return result;
}

/**
 * Validate widget placeholder syntax
 */
export function validateWidgetPlaceholder(placeholder: string): boolean {
  const regex = /\{\{(\w+)\s+(\w+)\}\}/;
  return regex.test(placeholder);
}

