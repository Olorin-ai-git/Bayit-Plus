export interface ATSCompatibilityScore {
  overall: number;
  formatting: number;
  keywords: number;
  structure: number;
  recommendations: string[];
}

export interface ATSOptimization {
  suggestions: string[];
  keywordDensity: Record<string, number>;
  formatIssues: string[];
  structureIssues: string[];
}

export interface ATSAnalysisResult {
  score: ATSCompatibilityScore;
  optimization: ATSOptimization;
  isCompatible: boolean;
}