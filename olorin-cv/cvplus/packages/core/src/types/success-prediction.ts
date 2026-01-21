export interface SuccessPrediction {
  score: number;
  confidence: number;
  factors: SuccessFactor[];
  recommendations: string[];
  timeline: PredictionTimeline;
}

export interface SuccessFactor {
  name: string;
  weight: number;
  score: number;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface PredictionTimeline {
  shortTerm: {
    period: string;
    probability: number;
    outcomes: string[];
  };
  mediumTerm: {
    period: string;
    probability: number;
    outcomes: string[];
  };
  longTerm: {
    period: string;
    probability: number;
    outcomes: string[];
  };
}

export interface PredictionModel {
  version: string;
  accuracy: number;
  trainingData: {
    size: number;
    lastUpdated: Date;
  };
  features: string[];
}

export interface SalaryPrediction {
  estimatedSalary: {
    min: number;
    max: number;
    currency: string;
  };
  confidence: number;
  factors: string[];
}

export interface TimeToHirePrediction {
  estimatedDays: number;
  confidence: number;
  factors: string[];
}

export interface PredictiveRecommendation {
  type: string;
  description: string;
  impact: number;
  priority: 'high' | 'medium' | 'low';
}

export type PredictionTypes = 'success' | 'salary' | 'time_to_hire' | 'recommendation';