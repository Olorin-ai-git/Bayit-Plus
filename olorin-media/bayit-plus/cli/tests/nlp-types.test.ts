/**
 * Tests for NLP Type Definitions
 *
 * Validates type structure and interfaces.
 */

import type {
  ParsedIntent,
  AgentExecutionResult,
  SearchResults,
  VoiceCommandResult,
  NlpClientConfig
} from '../src/services/nlp-types.js';

describe('NLP Types', () => {
  test('ParsedIntent type structure', () => {
    const intent: ParsedIntent = {
      intent: 'upload_series',
      confidence: 0.95,
      params: { series: 'family ties' },
      requires_confirmation: true,
      suggested_command: 'olorin upload-series --series "family ties"'
    };

    expect(intent.intent).toBe('upload_series');
    expect(intent.confidence).toBeGreaterThan(0.7);
    expect(intent.params).toHaveProperty('series');
    expect(intent.requires_confirmation).toBe(true);
  });

  test('AgentExecutionResult type structure', () => {
    const result: AgentExecutionResult = {
      success: true,
      summary: 'Task completed successfully',
      tool_calls: [
        {
          tool: 'web_search',
          input: { query: 'test' },
          output: 'results',
          timestamp: new Date().toISOString()
        }
      ],
      total_cost: 0.05,
      iterations: 3
    };

    expect(result.success).toBe(true);
    expect(result.tool_calls).toHaveLength(1);
    expect(result.total_cost).toBeGreaterThan(0);
  });

  test('SearchResults type structure', () => {
    const results: SearchResults = {
      query: 'test search',
      total_found: 2,
      results: [
        {
          content_id: 'content1',
          title: 'Test Content',
          content_type: 'series',
          description: 'Test description',
          relevance_score: 0.95,
          match_reason: 'High relevance'
        }
      ],
      filter_used: { topic_tags: ['test'] }
    };

    expect(results.total_found).toBe(2);
    expect(results.results).toHaveLength(1);
    expect(results.results[0].relevance_score).toBeGreaterThan(0.9);
  });

  test('VoiceCommandResult type structure', () => {
    const result: VoiceCommandResult = {
      transcript: 'upload family ties',
      execution_result: {
        success: true,
        summary: 'Completed',
        tool_calls: [],
        total_cost: 0.02,
        iterations: 1
      },
      voice_response: new Uint8Array([1, 2, 3])
    };

    expect(result.transcript).toBe('upload family ties');
    expect(result.execution_result.success).toBe(true);
    expect(result.voice_response).toBeInstanceOf(Uint8Array);
  });

  test('NlpClientConfig type structure', () => {
    const config: NlpClientConfig = {
      backendUrl: 'http://localhost:8090',
      timeout: 60000,
      apiKey: 'test-key'
    };

    expect(config.backendUrl).toContain('localhost');
    expect(config.timeout).toBe(60000);
    expect(config.apiKey).toBeDefined();
  });
});
