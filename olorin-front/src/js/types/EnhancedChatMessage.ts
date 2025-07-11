/**
 * Enhanced Chat Message types for RAG functionality
 */

export type ViewMode = 'chat' | 'table' | 'json' | 'raw';

export interface ColumnDefinition {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  sortable?: boolean;
  filterable?: boolean;
  width?: number;
}

export interface StructuredData {
  data: Record<string, any>[];
  columns: ColumnDefinition[];
  metadata?: {
    total_records?: number;
    query_time?: number;
    source?: string;
    [key: string]: any;
  };
}

export interface FilterCriteria {
  column: string;
  operator:
    | 'equals'
    | 'contains'
    | 'startsWith'
    | 'endsWith'
    | 'greaterThan'
    | 'lessThan';
  value: any;
}

export interface SortCriteria {
  column: string;
  direction: 'asc' | 'desc';
}

export interface PaginationConfig {
  page: number;
  page_size: number;
  total_records: number;
}

export interface EnhancedChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant' | 'system';
  timestamp: Date;
  isLoading?: boolean;
  hasError?: boolean;
  errorMessage?: string;

  // RAG-specific properties
  natural_query?: string;
  translated_query?: string;
  query_metadata?: {
    execution_time?: number;
    result_count?: number;
    sources?: string[];
    confidence?: number;
  };

  // Structured data support
  structured_data?: StructuredData;

  // View configuration
  available_views?: ViewMode[];
  default_view?: ViewMode;

  // Export capabilities
  exportable?: boolean;
  export_formats?: ('csv' | 'json' | 'xlsx')[];
}
