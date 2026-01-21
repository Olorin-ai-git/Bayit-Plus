export type ReportStatus = 'draft' | 'generating' | 'ready' | 'failed' | 'archived';

export type ReportFormat = 'pdf' | 'html' | 'docx' | 'csv' | 'xlsx' | 'json';

export type ReportType =
  | 'investigation_summary'
  | 'fraud_analysis'
  | 'risk_assessment'
  | 'compliance_audit'
  | 'performance_dashboard'
  | 'custom';

export type ReportSchedule =
  | 'once'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export type DataAggregation = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'distinct';

export interface ReportDataSource {
  id: string;
  name: string;
  type: 'investigation' | 'user_activity' | 'system_metrics' | 'fraud_scores' | 'custom';
  connection: {
    endpoint?: string;
    query?: string;
    filters?: Record<string, any>;
  };
  fields: ReportField[];
}

export interface ReportField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'object';
  description?: string;
  required?: boolean;
  aggregation?: DataAggregation;
}

export interface ReportFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'regex';
  value: any;
  label?: string;
}

export interface ReportSection {
  id: string;
  type: 'text' | 'chart' | 'table' | 'metrics' | 'image' | 'page_break';
  title?: string;
  content?: any;
  chartConfig?: {
    type: string;
    dataSource: string;
    xAxis?: string;
    yAxis?: string[];
    aggregation?: Record<string, DataAggregation>;
  };
  tableConfig?: {
    dataSource: string;
    columns: string[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    maxRows?: number;
  };
  metricsConfig?: {
    metrics: {
      label: string;
      dataSource: string;
      field: string;
      aggregation: DataAggregation;
      format?: string;
    }[];
  };
  styling?: {
    fontSize?: number;
    fontWeight?: 'normal' | 'bold';
    textAlign?: 'left' | 'center' | 'right';
    backgroundColor?: string;
    textColor?: string;
    margin?: {
      top?: number;
      bottom?: number;
      left?: number;
      right?: number;
    };
  };
}

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  type: ReportType;
  category?: string;
  sections: ReportSection[];
  dataSources: string[];
  parameters: ReportParameter[];
  styling: ReportStyling;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isPublic: boolean;
  tags: string[];
}

export interface ReportParameter {
  id: string;
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'daterange' | 'select' | 'multiselect' | 'boolean';
  required: boolean;
  defaultValue?: any;
  options?: { label: string; value: any }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface ReportStyling {
  pageSize: 'a4' | 'letter' | 'legal' | 'a3';
  pageOrientation: 'portrait' | 'landscape';
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  fonts: {
    title: {
      family: string;
      size: number;
      weight: 'normal' | 'bold';
    };
    heading: {
      family: string;
      size: number;
      weight: 'normal' | 'bold';
    };
    body: {
      family: string;
      size: number;
      weight: 'normal' | 'bold';
    };
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
  };
  branding: {
    logo?: string;
    companyName?: string;
    watermark?: string;
    footer?: string;
  };
}

export interface ReportConfig {
  id?: string;
  name: string;
  description?: string;
  templateId: string;
  parameters: Record<string, any>;
  filters: ReportFilter[];
  schedule?: {
    type: ReportSchedule;
    startDate: string;
    endDate?: string;
    timezone: string;
    recipients: string[];
  };
  format: ReportFormat[];
  outputLocation?: {
    type: 'download' | 'email' | 'storage' | 'webhook';
    config: any;
  };
}

export interface ReportGeneration {
  id: string;
  reportId: string;
  templateId: string;
  status: ReportStatus;
  startedAt: string;
  completedAt?: string;
  format: ReportFormat;
  fileSize?: number;
  downloadUrl?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    recordCount: number;
    dataRange: {
      start: string;
      end: string;
    };
    generationTime: number;
  };
}

export interface Report {
  id: string;
  name: string;
  description?: string;
  templateId: string;
  template?: ReportTemplate;
  config: ReportConfig;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastGeneration?: ReportGeneration;
  generations: ReportGeneration[];
  tags: string[];
  isScheduled: boolean;
  nextRunAt?: string;
}

export interface ReportAnalytics {
  totalReports: number;
  generationsToday: number;
  generationsThisWeek: number;
  generationsThisMonth: number;
  averageGenerationTime: number;
  successRate: number;
  popularTemplates: {
    templateId: string;
    templateName: string;
    usageCount: number;
  }[];
  formatDistribution: {
    format: ReportFormat;
    count: number;
    percentage: number;
  }[];
  statusDistribution: {
    status: ReportStatus;
    count: number;
    percentage: number;
  }[];
}

export interface ReportScheduler {
  id: string;
  reportId: string;
  schedule: ReportSchedule;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  lastRun?: string;
  nextRun: string;
  recipients: string[];
  failureCount: number;
  maxRetries: number;
}

export interface ReportExportOptions {
  format: ReportFormat;
  filename?: string;
  includeCharts: boolean;
  includeData: boolean;
  compression?: 'none' | 'zip' | 'gzip';
  watermark?: string;
  security?: {
    password?: string;
    permissions?: ('print' | 'edit' | 'copy')[];
  };
}

export interface ReportBuilderStep {
  id: string;
  title: string;
  description?: string;
  component: 'template' | 'datasource' | 'parameters' | 'filters' | 'sections' | 'styling' | 'preview' | 'schedule';
  completed: boolean;
  validation?: {
    required: string[];
    custom?: (data: any) => string | null;
  };
}

export interface ReportPreview {
  html: string;
  sections: {
    id: string;
    rendered: boolean;
    data?: any[];
    error?: string;
  }[];
  metadata: {
    pageCount: number;
    estimatedFileSize: number;
    dataPoints: number;
  };
}

export interface ReportShare {
  id: string;
  reportId: string;
  token: string;
  expiresAt?: string;
  permissions: ('view' | 'download' | 'comment')[];
  passwordProtected: boolean;
  accessCount: number;
  lastAccessedAt?: string;
  createdBy: string;
  createdAt: string;
}

export interface ReportComment {
  id: string;
  reportId: string;
  sectionId?: string;
  author: string;
  content: string;
  resolved: boolean;
  createdAt: string;
  updatedAt?: string;
  replies?: ReportComment[];
}

export interface ReportVersion {
  id: string;
  reportId: string;
  version: number;
  config: ReportConfig;
  createdAt: string;
  createdBy: string;
  changeLog?: string;
  isActive: boolean;
}

export interface ReportNotification {
  id: string;
  type: 'generation_complete' | 'generation_failed' | 'schedule_reminder' | 'share_access';
  reportId: string;
  recipient: string;
  message: string;
  data?: any;
  sent: boolean;
  sentAt?: string;
  createdAt: string;
}

export interface ReportAuditLog {
  id: string;
  reportId: string;
  action: 'created' | 'updated' | 'deleted' | 'generated' | 'shared' | 'accessed';
  userId: string;
  userEmail: string;
  timestamp: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
}