/**
 * NLP Client - Backend API client for natural language processing
 *
 * Communicates with Bayit+ backend NLP API for:
 * - Intent parsing
 * - Agent execution with session support
 * - Semantic search
 * - Voice commands
 * - Session management
 */

import { logger } from '../utils/logger.js';
import {
  ParsedIntent,
  AgentExecutionResult,
  SearchResults,
  VoiceCommandResult,
  NlpClientConfig,
  CreateSessionOptions,
  SessionInfo,
  SessionSummary,
  ConfirmActionResult,
  ExecuteAgentOptions,
  HealthStatus,
} from './nlp-types.js';

/**
 * NLP Client for backend communication
 */
export class NlpClient {
  private baseUrl: string;
  private timeout: number;
  private headers: Record<string, string>;

  constructor(config: NlpClientConfig = {}) {
    this.baseUrl = config.backendUrl
      || process.env.OLORIN_BACKEND_URL
      || process.env.BACKEND_URL
      || 'http://localhost:8090';

    this.timeout = config.timeout || 180000; // 180 seconds (3 minutes for agent workflows)

    this.headers = {
      'Content-Type': 'application/json',
    };

    if (config.apiKey) {
      this.headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    logger.debug('NLP Client initialized', { baseUrl: this.baseUrl });
  }

  // Session Management

  /**
   * Create a new conversation session
   */
  async createSession(options: CreateSessionOptions = {}): Promise<SessionInfo> {
    logger.debug('Creating session', { platform: options.platform || 'bayit' });

    const response = await this.fetch('/api/v1/nlp/sessions', {
      method: 'POST',
      body: JSON.stringify({
        platform: options.platform || 'bayit',
        user_id: options.userId,
        action_mode: options.actionMode || 'smart',
        metadata: options.metadata,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create session: ${response.status} - ${error}`);
    }

    const session = await response.json();
    logger.debug('Session created', { sessionId: session.session_id });

    return session;
  }

  /**
   * Get session details
   */
  async getSession(sessionId: string): Promise<SessionSummary> {
    logger.debug('Getting session', { sessionId });

    const response = await this.fetch(`/api/v1/nlp/sessions/${sessionId}`);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get session: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  /**
   * End a session and get final summary
   */
  async endSession(sessionId: string): Promise<SessionSummary> {
    logger.debug('Ending session', { sessionId });

    const response = await this.fetch(`/api/v1/nlp/sessions/${sessionId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to end session: ${response.status} - ${error}`);
    }

    const summary = await response.json();
    logger.info('Session ended', { sessionId, totalCost: summary.total_cost });

    return summary;
  }

  /**
   * Confirm and execute a pending action
   */
  async confirmAction(sessionId: string, actionId: string): Promise<ConfirmActionResult> {
    logger.info('Confirming action', { sessionId, actionId });

    const response = await this.fetch('/api/v1/nlp/confirm-action', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        action_id: actionId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to confirm action: ${response.status} - ${error}`);
    }

    const result = await response.json();
    logger.info('Action confirmed', { actionId, success: result.success });

    return result;
  }

  // Agent Execution

  /**
   * Parse natural language command into structured intent
   */
  async parseCommand(
    query: string,
    context?: Record<string, any>
  ): Promise<ParsedIntent> {
    logger.debug('Parsing command', { query });

    const response = await this.fetch('/api/v1/nlp/parse-command', {
      method: 'POST',
      body: JSON.stringify({ query, context }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Parse command failed: ${response.status} - ${error}`);
    }

    const result = await response.json();
    logger.debug('Command parsed', { intent: result.intent, confidence: result.confidence });

    return result;
  }

  /**
   * Execute multi-step agent workflow with optional session support
   */
  async executeAgent(options: ExecuteAgentOptions): Promise<AgentExecutionResult> {
    logger.info('Executing agent workflow', {
      query: options.query,
      platform: options.platform || 'bayit',
      dryRun: options.dryRun || false,
      sessionId: options.sessionId,
    });

    const response = await this.fetch('/api/v1/nlp/execute-agent', {
      method: 'POST',
      body: JSON.stringify({
        query: options.query,
        platform: options.platform || 'bayit',
        dry_run: options.dryRun || false,
        max_iterations: options.maxIterations,
        budget_limit: options.budgetLimit,
        session_id: options.sessionId,
        action_mode: options.actionMode || 'smart',
        auto_confirm: options.autoConfirm || false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Agent execution failed: ${response.status} - ${error}`);
    }

    const result = await response.json();
    logger.info('Agent execution complete', {
      success: result.success,
      iterations: result.iterations,
      cost: result.total_cost,
      pendingConfirmations: result.pending_confirmations?.length || 0,
    });

    return result;
  }

  /**
   * Search content library with natural language
   */
  async searchContent(
    query: string,
    options: {
      contentType?: string;
      limit?: number;
      rerank?: boolean;
    } = {}
  ): Promise<SearchResults> {
    logger.debug('Searching content', { query, options });

    const response = await this.fetch('/api/v1/nlp/search-content', {
      method: 'POST',
      body: JSON.stringify({
        query,
        content_type: options.contentType || 'all',
        limit: options.limit || 20,
        rerank: options.rerank ?? true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Search failed: ${response.status} - ${error}`);
    }

    const result = await response.json();
    logger.debug('Search complete', { found: result.total_found });

    return result;
  }

  /**
   * Process voice command
   */
  async processVoiceCommand(request: {
    audioData: Uint8Array;
    platform?: string;
    language?: string;
    dryRun?: boolean;
  }): Promise<VoiceCommandResult> {
    logger.info('Processing voice command');

    const response = await this.fetch('/api/v1/nlp/voice-command', {
      method: 'POST',
      body: JSON.stringify({
        audio_data: Array.from(request.audioData),
        platform: request.platform || 'bayit',
        language: request.language || 'en',
        dry_run: request.dryRun || false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Voice command failed: ${response.status} - ${error}`);
    }

    const result = await response.json();

    // Convert voice_response back to Uint8Array if present
    if (result.voice_response) {
      result.voice_response = new Uint8Array(result.voice_response);
    }

    logger.info('Voice command complete', { transcript: result.transcript });

    return result;
  }

  /**
   * Check NLP service health
   */
  async healthCheck(): Promise<HealthStatus> {
    const response = await this.fetch('/api/v1/nlp/health');

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Internal fetch wrapper with timeout and error handling
   */
  private async fetch(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${path}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }

      throw error;
    }
  }
}
