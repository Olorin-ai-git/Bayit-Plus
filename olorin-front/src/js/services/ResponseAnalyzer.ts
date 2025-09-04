/**
 * Lightweight Response Analyzer for RAG Page
 * Detects structured data in LLM responses to enable table view
 */

import {
  EnhancedChatMessage,
  ColumnDefinition,
} from '../types/EnhancedChatMessage';

export interface DataDetectionResult {
  hasStructuredData: boolean;
  dataType: 'json' | 'table' | 'list' | 'unstructured';
  confidence: number;
  parsedData?: Record<string, any>[];
  columns?: ColumnDefinition[];
}

export class ResponseAnalyzer {
  /**
   * Analyze LLM response content to detect structured data
   */
  static analyzeResponse(content: string): DataDetectionResult {
    // Clean the content
    const cleanContent = content.trim();

    // Check for JSON array format
    const jsonResult = this.detectJSONData(cleanContent);
    if (jsonResult.hasStructuredData) {
      return jsonResult;
    }

    // Check for table format (pipe-separated or tab-separated)
    const tableResult = this.detectTableData(cleanContent);
    if (tableResult.hasStructuredData) {
      return tableResult;
    }

    // Check for list format
    const listResult = this.detectListData(cleanContent);
    if (listResult.hasStructuredData) {
      return listResult;
    }

    // Default to unstructured
    return {
      hasStructuredData: false,
      dataType: 'unstructured',
      confidence: 0,
    };
  }

  /**
   * Detect JSON array data in response
   */
  private static detectJSONData(content: string): DataDetectionResult {
    try {
      // Look for JSON array patterns
      const jsonMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (!jsonMatch) {
        return {
          hasStructuredData: false,
          dataType: 'unstructured',
          confidence: 0,
        };
      }

      const jsonString = jsonMatch[0];
      const parsedData = JSON.parse(jsonString);

      if (
        Array.isArray(parsedData) &&
        parsedData.length > 0 &&
        typeof parsedData[0] === 'object'
      ) {
        const columns = this.generateColumnsFromData(parsedData);

        return {
          hasStructuredData: true,
          dataType: 'json',
          confidence: 0.9,
          parsedData,
          columns,
        };
      }
    } catch (error) {
      // JSON parsing failed, continue to other detection methods
    }

    return {
      hasStructuredData: false,
      dataType: 'unstructured',
      confidence: 0,
    };
  }

  /**
   * Detect table format data (pipe or tab separated)
   */
  private static detectTableData(content: string): DataDetectionResult {
    const lines = content.split('\n').filter((line) => line.trim());

    // Look for pipe-separated tables
    const pipeLines = lines.filter(
      (line) => line.includes('|') && line.split('|').length > 2,
    );
    if (pipeLines.length >= 2) {
      return this.parseTableFormat(pipeLines, '|');
    }

    // Look for tab-separated data
    const tabLines = lines.filter(
      (line) => line.includes('\t') && line.split('\t').length > 1,
    );
    if (tabLines.length >= 2) {
      return this.parseTableFormat(tabLines, '\t');
    }

    return {
      hasStructuredData: false,
      dataType: 'unstructured',
      confidence: 0,
    };
  }

  /**
   * Parse table format data
   */
  private static parseTableFormat(
    lines: string[],
    separator: string,
  ): DataDetectionResult {
    try {
      // Skip separator lines (like |---|---|)
      const dataLines = lines.filter((line) => !line.match(/^[\s|:-]+$/));

      if (dataLines.length < 2) {
        return {
          hasStructuredData: false,
          dataType: 'unstructured',
          confidence: 0,
        };
      }

      // First line as headers
      const headers = dataLines[0]
        .split(separator)
        .map((h) => h.trim())
        .filter((h) => h && h !== '')
        .map((h) => h.replace(/^\||\|$/g, '').trim());

      if (headers.length < 2) {
        return {
          hasStructuredData: false,
          dataType: 'unstructured',
          confidence: 0,
        };
      }

      // Parse data rows
      const parsedData: Record<string, any>[] = [];

      for (let i = 1; i < dataLines.length; i++) {
        const values = dataLines[i]
          .split(separator)
          .map((v) => v.trim())
          .filter((_, index) => index < headers.length)
          .map((v) => v.replace(/^\||\|$/g, '').trim());

        if (values.length >= headers.length) {
          const row: Record<string, any> = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          parsedData.push(row);
        }
      }

      if (parsedData.length > 0) {
        const columns = this.generateColumnsFromHeaders(headers);

        return {
          hasStructuredData: true,
          dataType: 'table',
          confidence: 0.8,
          parsedData,
          columns,
        };
      }
    } catch (error) {
      // Table parsing failed
    }

    return {
      hasStructuredData: false,
      dataType: 'unstructured',
      confidence: 0,
    };
  }

  /**
   * Detect list format data
   */
  private static detectListData(content: string): DataDetectionResult {
    const lines = content.split('\n').filter((line) => line.trim());

    // Look for numbered or bulleted lists with key-value pairs
    const listLines = lines.filter(
      (line) =>
        line.match(/^\s*[\d-*•]\s*\w+:/) || line.match(/^\s*\w+:\s*\w+/),
    );

    if (listLines.length >= 3) {
      try {
        const parsedData: Record<string, any>[] = [];
        let currentItem: Record<string, any> = {};

        for (const line of listLines) {
          const match = line.match(/^\s*(?:[\d-*•]\s*)?(\w+):\s*(.+)$/);
          if (match) {
            const [, key, value] = match;

            // If we have a complete item, add it to parsedData
            if (
              Object.keys(currentItem).length > 0 &&
              key.toLowerCase() === 'name'
            ) {
              parsedData.push(currentItem);
              currentItem = {};
            }

            currentItem[key] = value.trim();
          }
        }

        // Add the last item
        if (Object.keys(currentItem).length > 0) {
          parsedData.push(currentItem);
        }

        if (parsedData.length > 0) {
          const columns = this.generateColumnsFromData(parsedData);

          return {
            hasStructuredData: true,
            dataType: 'list',
            confidence: 0.6,
            parsedData,
            columns,
          };
        }
      } catch (error) {
        // List parsing failed
      }
    }

    return {
      hasStructuredData: false,
      dataType: 'unstructured',
      confidence: 0,
    };
  }

  /**
   * Generate column definitions from parsed data
   */
  private static generateColumnsFromData(
    data: Record<string, any>[],
  ): ColumnDefinition[] {
    if (data.length === 0) return [];

    const firstItem = data[0];
    const columns: ColumnDefinition[] = [];

    Object.keys(firstItem).forEach((key) => {
      // Determine column type based on data
      let type: 'string' | 'number' | 'date' | 'boolean' = 'string';

      const sampleValue = firstItem[key];
      if (typeof sampleValue === 'number' || !isNaN(Number(sampleValue))) {
        type = 'number';
      } else if (
        typeof sampleValue === 'boolean' ||
        sampleValue === 'true' ||
        sampleValue === 'false'
      ) {
        type = 'boolean';
      } else if (
        sampleValue &&
        new Date(sampleValue).toString() !== 'Invalid Date'
      ) {
        type = 'date';
      }

      columns.push({
        key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        type,
        sortable: true,
        filterable: true,
      });
    });

    return columns;
  }

  /**
   * Generate column definitions from headers
   */
  private static generateColumnsFromHeaders(
    headers: string[],
  ): ColumnDefinition[] {
    return headers.map((header) => ({
      key: header,
      label: header.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      type: 'string' as const,
      sortable: true,
      filterable: true,
    }));
  }

  /**
   * Convert analyzed response to EnhancedChatMessage
   */
  static enhanceMessage(
    originalMessage: any,
    analysisResult: DataDetectionResult,
  ): EnhancedChatMessage {
    const enhanced: EnhancedChatMessage = {
      ...originalMessage,
    };

    if (analysisResult.hasStructuredData && analysisResult.parsedData) {
      enhanced.structured_data = {
        data: analysisResult.parsedData,
        columns: analysisResult.columns || [],
        metadata: {
          confidence: analysisResult.confidence,
          total_records: analysisResult.parsedData.length,
          source: 'llm_response',
        },
      };
      enhanced.available_views = ['chat', 'table', 'json'];
      enhanced.default_view = 'table';
      enhanced.exportable = true;
      enhanced.export_formats = ['csv', 'json'];
    }

    return enhanced;
  }
}
