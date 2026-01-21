export interface AnalysisResult {
  id: string;
  type: string;
  data: unknown;
}

export interface AnalysisMetrics {
  accuracy: number;
  confidence: number;
  processingTime: number;
}
