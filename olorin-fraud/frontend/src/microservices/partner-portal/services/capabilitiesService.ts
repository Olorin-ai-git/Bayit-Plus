/**
 * B2B Capabilities Service
 *
 * Handles API playground capabilities (Fraud Detection, Content AI).
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import { b2bPost, b2bGet } from './b2bApiClient';
import {
  FraudRiskRequest,
  FraudRiskResponse,
  AnomalyDetectionRequest,
  AnomalyDetectionResponse,
  InvestigationRequest,
  InvestigationResponse,
  SemanticSearchRequest,
  SemanticSearchResponse,
  CulturalContextRequest,
  CulturalContextResponse,
  RecapSessionRequest,
  RecapSessionResponse,
  RecapMessageRequest,
  RecapMessageResponse,
} from '../types';

const CAPABILITIES_ENDPOINTS = {
  FRAUD: {
    RISK: '/capabilities/fraud/risk-assessment',
    ANOMALY: '/capabilities/fraud/anomaly-detection',
    INVESTIGATION: '/capabilities/fraud/investigation',
  },
  CONTENT: {
    SEMANTIC_SEARCH: '/capabilities/content/semantic-search',
    CULTURAL_CONTEXT: '/capabilities/content/cultural-context',
    RECAP_SESSION: '/capabilities/content/recap/session',
    RECAP_MESSAGE: '/capabilities/content/recap/message',
  },
} as const;

export async function assessFraudRisk(
  request: FraudRiskRequest
): Promise<FraudRiskResponse> {
  const response = await b2bPost<FraudRiskResponse>(
    CAPABILITIES_ENDPOINTS.FRAUD.RISK,
    request
  );
  return response.data;
}

export async function detectAnomalies(
  request: AnomalyDetectionRequest
): Promise<AnomalyDetectionResponse> {
  const response = await b2bPost<AnomalyDetectionResponse>(
    CAPABILITIES_ENDPOINTS.FRAUD.ANOMALY,
    request
  );
  return response.data;
}

export async function startInvestigation(
  request: InvestigationRequest
): Promise<InvestigationResponse> {
  const response = await b2bPost<InvestigationResponse>(
    CAPABILITIES_ENDPOINTS.FRAUD.INVESTIGATION,
    request
  );
  return response.data;
}

export async function getInvestigationStatus(
  investigationId: string
): Promise<InvestigationResponse> {
  const response = await b2bGet<InvestigationResponse>(
    `${CAPABILITIES_ENDPOINTS.FRAUD.INVESTIGATION}/${investigationId}`
  );
  return response.data;
}

export async function semanticSearch(
  request: SemanticSearchRequest
): Promise<SemanticSearchResponse> {
  const response = await b2bPost<SemanticSearchResponse>(
    CAPABILITIES_ENDPOINTS.CONTENT.SEMANTIC_SEARCH,
    request
  );
  return response.data;
}

export async function analyzeCulturalContext(
  request: CulturalContextRequest
): Promise<CulturalContextResponse> {
  const response = await b2bPost<CulturalContextResponse>(
    CAPABILITIES_ENDPOINTS.CONTENT.CULTURAL_CONTEXT,
    request
  );
  return response.data;
}

export async function createRecapSession(
  request: RecapSessionRequest
): Promise<RecapSessionResponse> {
  const response = await b2bPost<RecapSessionResponse>(
    CAPABILITIES_ENDPOINTS.CONTENT.RECAP_SESSION,
    request
  );
  return response.data;
}

export async function sendRecapMessage(
  request: RecapMessageRequest
): Promise<RecapMessageResponse> {
  const response = await b2bPost<RecapMessageResponse>(
    CAPABILITIES_ENDPOINTS.CONTENT.RECAP_MESSAGE,
    request
  );
  return response.data;
}
