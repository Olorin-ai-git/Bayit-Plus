export interface MLPipeline {
  id: string;
  name: string;
  version: string;
  stages: MLPipelineStage[];
  configuration: MLPipelineConfig;
  metrics: MLPipelineMetrics;
}

export interface MLPipelineStage {
  id: string;
  name: string;
  type: 'preprocessing' | 'feature_extraction' | 'model_training' | 'prediction' | 'post_processing';
  config: Record<string, any>;
  dependencies: string[];
}

export interface MLPipelineConfig {
  batchSize: number;
  maxExecutionTime: number;
  retryAttempts: number;
  parallelization: {
    enabled: boolean;
    maxWorkers: number;
  };
}

export interface MLPipelineMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  executionTime: number;
  lastTraining: Date;
}

export interface MLModelArtifact {
  id: string;
  version: string;
  format: string;
  size: number;
  createdAt: Date;
  metadata: Record<string, any>;
}

export interface MLModelMetadata {
  modelId: string;
  version: string;
  trainedAt: Date;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
}

export interface FeatureVector {
  id: string;
  features: number[];
  labels: string[];
  metadata: Record<string, any>;
}

export interface Phase2APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

export interface PredictionResponse {
  predictionId: string;
  confidence: number;
  result: any;
  modelVersion: string;
}

export interface AnalyticsResponse {
  eventId: string;
  processed: boolean;
  insights: Record<string, any>;
}

export interface IndustryOptimizationResponse {
  optimizationId: string;
  industry: string;
  suggestions: string[];
  score: number;
}

export interface RegionalOptimizationResponse {
  optimizationId: string;
  region: string;
  adaptations: string[];
  score: number;
}

export interface MLTrainingConfig {
  modelType: string;
  hyperparameters: Record<string, any>;
  trainingData: {
    source: string;
    size: number;
  };
  validationSplit: number;
}