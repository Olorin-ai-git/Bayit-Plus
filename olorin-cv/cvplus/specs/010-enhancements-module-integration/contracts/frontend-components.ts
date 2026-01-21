// Frontend Enhancement Components API Contract
// These interfaces must be preserved during migration to enhancements module

export interface EnhancementComponentContract {
  // Component contracts that external consumers depend on
  // Must be maintained during migration for backward compatibility
}

// CSS Optimizer Service Contract
export interface CSSOptimizerService {
  optimizeStyles(cssInput: string, options?: OptimizationOptions): Promise<OptimizedCSS>;
  validateCSS(cssInput: string): ValidationResult;
  generatePerformanceReport(cssInput: string): PerformanceReport;
}

export interface OptimizationOptions {
  minify?: boolean;
  removeUnusedRules?: boolean;
  optimizeSelectors?: boolean;
  compressColors?: boolean;
}

export interface OptimizedCSS {
  optimizedCSS: string;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  optimizations: string[];
}

// Error Recovery Service Contract
export interface ErrorRecoveryService {
  recoverFromError(error: ProcessingError, context: RecoveryContext): Promise<RecoveryResult>;
  registerErrorHandler(errorType: string, handler: ErrorHandler): void;
  getRecoveryStrategies(error: ProcessingError): RecoveryStrategy[];
}

export interface ProcessingError {
  type: string;
  message: string;
  stack?: string;
  context: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RecoveryResult {
  success: boolean;
  strategy: string;
  fallbackData?: any;
  warnings?: string[];
}

// Feature Priority Service Contract
export interface FeaturePriorityService {
  prioritizeFeatures(features: FeatureRequest[], context: PriorityContext): PrioritizedFeature[];
  updatePriority(featureId: string, priority: number): void;
  getFeatureMetrics(featureId: string): FeatureMetrics;
}

export interface FeatureRequest {
  id: string;
  name: string;
  type: 'enhancement' | 'optimization' | 'analysis';
  estimatedTime: number;
  dependencies: string[];
  userImportance: number;
}

export interface PrioritizedFeature extends FeatureRequest {
  priority: number;
  executionOrder: number;
  rationale: string;
}

// HTML Validator Service Contract
export interface HTMLValidatorService {
  validateHTML(htmlContent: string, options?: ValidationOptions): ValidationResult;
  validateAccessibility(htmlContent: string): AccessibilityResult;
  generateValidationReport(htmlContent: string): ValidationReport;
}

export interface ValidationOptions {
  strict?: boolean;
  htmlVersion?: '4.01' | '5' | 'xhtml';
  validateSemantics?: boolean;
  checkAccessibility?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
}

// Performance Monitor Service Contract
export interface PerformanceMonitorService {
  startMonitoring(operation: string, context?: MonitoringContext): MonitoringSession;
  endMonitoring(sessionId: string): PerformanceMetrics;
  getPerformanceReport(timeRange: TimeRange): PerformanceReport;
  setPerformanceThreshold(metric: string, threshold: number): void;
}

export interface MonitoringSession {
  sessionId: string;
  operation: string;
  startTime: number;
  context: Record<string, any>;
}

export interface PerformanceMetrics {
  duration: number;
  memoryUsage: MemoryMetrics;
  cpuUsage?: number;
  customMetrics: Record<string, number>;
}

// Preview Service Contract
export interface PreviewService {
  generatePreview(content: PreviewContent, options?: PreviewOptions): Promise<PreviewResult>;
  updatePreview(previewId: string, updates: Partial<PreviewContent>): Promise<PreviewResult>;
  getPreviewHistory(contentId: string): PreviewHistory[];
}

export interface PreviewContent {
  type: 'cv' | 'enhancement' | 'template';
  data: Record<string, any>;
  template?: string;
  styling?: StyleConfiguration;
}

export interface PreviewResult {
  previewId: string;
  htmlContent: string;
  cssStyles: string;
  metadata: PreviewMetadata;
  renderingTime: number;
}

// Progressive Enhancement Utility Contract
export interface ProgressiveEnhancementUtility {
  mergeHTMLContent(baseContent: string, enhancements: Enhancement[]): MergedContent;
  applyProgressiveEnhancements(content: string, capabilities: BrowserCapabilities): string;
  generateFallbacks(content: string): FallbackContent;
}

export interface Enhancement {
  id: string;
  type: 'script' | 'style' | 'markup' | 'attribute';
  content: string;
  conditions: EnhancementCondition[];
  fallback?: string;
}

export interface MergedContent {
  content: string;
  appliedEnhancements: string[];
  warnings: string[];
  metadata: MergeMetadata;
}

// Supporting Types and Interfaces

export interface ValidationError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
  ruleId?: string;
}

export interface ValidationWarning extends ValidationError {
  severity: 'warning';
}

export interface ValidationSuggestion {
  message: string;
  suggestedFix?: string;
  category: string;
}

export interface AccessibilityResult {
  score: number;
  violations: AccessibilityViolation[];
  recommendations: AccessibilityRecommendation[];
}

export interface AccessibilityViolation {
  ruleId: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  helpUrl?: string;
  nodes: ViolationNode[];
}

export interface ViolationNode {
  target: string;
  html: string;
  failureSummary: string;
}

export interface AccessibilityRecommendation {
  category: string;
  description: string;
  priority: number;
  implementation: string;
}

export interface ValidationReport {
  overall: ValidationResult;
  accessibility: AccessibilityResult;
  performance: PerformanceAnalysis;
  seo: SEOAnalysis;
  bestPractices: BestPracticeAnalysis;
}

export interface PerformanceAnalysis {
  loadTime: number;
  renderTime: number;
  resourceCount: number;
  optimizationSuggestions: OptimizationSuggestion[];
}

export interface SEOAnalysis {
  score: number;
  metaTags: MetaTagAnalysis;
  headingStructure: HeadingAnalysis;
  contentAnalysis: ContentAnalysis;
}

export interface BestPracticeAnalysis {
  score: number;
  violations: BestPracticeViolation[];
  recommendations: BestPracticeRecommendation[];
}

export interface RecoveryContext {
  operationId: string;
  userContext: UserContext;
  systemState: SystemState;
  previousAttempts: number;
}

export interface RecoveryStrategy {
  name: string;
  description: string;
  applicability: number;
  estimatedTime: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export type ErrorHandler = (error: ProcessingError, context: RecoveryContext) => Promise<RecoveryResult>;

export interface PriorityContext {
  userPreferences: UserPreferences;
  systemLoad: number;
  timeConstraints: TimeConstraints;
  resourceAvailability: ResourceAvailability;
}

export interface FeatureMetrics {
  executionCount: number;
  averageExecutionTime: number;
  successRate: number;
  userSatisfaction: number;
  lastExecuted: Date;
}

export interface MonitoringContext {
  userId?: string;
  sessionId?: string;
  feature?: string;
  environment: 'development' | 'staging' | 'production';
}

export interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface PerformanceReport {
  summary: PerformanceMetrics;
  trends: PerformanceTrend[];
  bottlenecks: PerformanceBottleneck[];
  recommendations: PerformanceRecommendation[];
}

export interface PerformanceTrend {
  metric: string;
  values: TimestampedValue[];
  trend: 'improving' | 'degrading' | 'stable';
}

export interface TimestampedValue {
  timestamp: Date;
  value: number;
}

export interface PerformanceBottleneck {
  operation: string;
  severity: number;
  impact: string;
  suggestedFix: string;
}

export interface PerformanceRecommendation {
  category: string;
  description: string;
  expectedImprovement: string;
  effort: 'low' | 'medium' | 'high';
}

export interface PreviewOptions {
  format?: 'html' | 'pdf' | 'image';
  quality?: 'draft' | 'standard' | 'high';
  responsive?: boolean;
  includeStyles?: boolean;
}

export interface StyleConfiguration {
  theme: string;
  colors: Record<string, string>;
  fonts: FontConfiguration;
  layout: LayoutConfiguration;
}

export interface FontConfiguration {
  primary: string;
  secondary: string;
  sizes: Record<string, string>;
}

export interface LayoutConfiguration {
  width: string;
  spacing: string;
  breakpoints: Record<string, string>;
}

export interface PreviewMetadata {
  generatedAt: Date;
  version: string;
  templateUsed?: string;
  optimizations: string[];
}

export interface PreviewHistory {
  previewId: string;
  timestamp: Date;
  changes: string[];
  version: number;
}

export interface BrowserCapabilities {
  supportsES6: boolean;
  supportsCSS3: boolean;
  supportsWebGL: boolean;
  supportsServiceWorker: boolean;
  customProperties: Record<string, boolean>;
}

export interface EnhancementCondition {
  type: 'feature' | 'browser' | 'viewport' | 'network';
  condition: string;
  value?: any;
}

export interface FallbackContent {
  content: string;
  appliedFallbacks: string[];
  compatibilityLevel: string;
}

export interface MergeMetadata {
  totalEnhancements: number;
  appliedEnhancements: number;
  processingTime: number;
  warnings: number;
}

// Migration preservation contract
// These exports must be maintained during migration for backward compatibility
export const COMPONENT_CONTRACTS = {
  CSSOptimizerService: 'css-optimizer.service',
  ErrorRecoveryService: 'error-recovery.service',
  FeaturePriorityService: 'feature-priority.service',
  HTMLValidatorService: 'html-validator.service',
  PerformanceMonitorService: 'performance-monitor.service',
  PreviewService: 'preview.service',
  ProgressiveEnhancementUtility: 'progressive-enhancement/HTMLContentMerger'
} as const;

// Component export patterns that must be preserved
export type ComponentExportPattern = keyof typeof COMPONENT_CONTRACTS;

// Migration validation interface
export interface MigrationValidation {
  validateContractPreservation(contracts: ComponentExportPattern[]): ValidationResult;
  verifyBackwardCompatibility(oldExports: string[], newExports: string[]): boolean;
  generateMigrationReport(): MigrationReport;
}

export interface MigrationReport {
  contractsPreserved: number;
  contractsBroken: number;
  deprecationWarnings: string[];
  migrationSuccess: boolean;
}