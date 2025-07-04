import { BaseApiService } from './BaseApiService';

/**
 * Service for RAG (Retrieval-Augmented Generation) API operations
 * Handles natural language queries, field mappings, and pattern management
 */
export class RAGApiService extends BaseApiService {
  constructor(sandbox?: any) {
    super(sandbox);
  }

  /**
   * Send a natural language query to the RAG system
   */
  async sendNaturalQuery(params: {
    natural_query: string;
    user_id: string;
    auto_index?: boolean;
  }): Promise<any> {
    return this.makePost('api/rag/natural-query', params);
  }

  /**
   * Step 1: Execute and index live query data
   * This is the first step of the proven working flow
   */
  async indexData(params: {
    user_id: string;
    splunk_query?: string;
    natural_query?: string;
    max_documents?: number;
  }): Promise<any> {
    return this.makePost('api/rag/index', {
      user_id: params.user_id,
      splunk_query: params.splunk_query,
      natural_query: params.natural_query,
      max_documents: params.max_documents || 100,
    });
  }

  /**
   * Execute and index a live Splunk query
   * Use this to fetch fresh data from Splunk and index it for querying
   */
  async indexQuery(params: {
    user_id: string;
    splunk_query?: string;
    natural_query?: string;
    max_documents?: number;
    investigation_id?: string;
  }): Promise<any> {
    return this.makePost('api/rag/index', {
      user_id: params.user_id,
      splunk_query: params.splunk_query,
      natural_query: params.natural_query,
      max_documents: params.max_documents || 100,
      investigation_id: params.investigation_id,
    });
  }

  /**
   * Send a translated query directly to the RAG system
   * Use this for already translated Splunk queries
   */
  async sendTranslatedQuery(params: {
    query: string;
    user_id: string;
    investigation_id?: string;
    max_results?: number;
    include_sources?: boolean;
  }): Promise<any> {
    return this.makePost('api/rag/query', {
      query: params.query,
      user_id: params.user_id,
      investigation_id: params.investigation_id,
      max_results: params.max_results || 10,
      include_sources: params.include_sources !== false, // default to true
    });
  }

  /**
   * Load field mappings for RAG configuration
   */
  async getFieldMappings(): Promise<any> {
    return this.makeGet('api/rag/mappings');
  }

  /**
   * Add a new field mapping
   */
  async addFieldMapping(params: {
    category: string;
    fields: string[];
    user_id: string;
    overwrite: boolean;
  }): Promise<any> {
    return this.makePost('api/rag/mappings/fields', params);
  }

  /**
   * Add a new rex pattern
   */
  async addRexPattern(params: {
    field_name: string;
    pattern: string;
    user_id: string;
    overwrite: boolean;
  }): Promise<any> {
    return this.makePost('api/rag/mappings/rex', params);
  }

  /**
   * Add a new eval command
   */
  async addEvalCommand(params: {
    command: string;
    user_id: string;
  }): Promise<any> {
    return this.makePost('api/rag/mappings/eval', params);
  }

  /**
   * Get prepared prompts for RAG system
   */
  async getPreparedPrompts(): Promise<any> {
    return this.makeGet('api/rag/prompts');
  }

  /**
   * Get a specific prompt by ID
   */
  async getPromptById(promptId: string): Promise<any> {
    return this.makeGet(`api/rag/prompts/${promptId}`);
  }

  /**
   * Create a new prompt
   */
  async createPrompt(params: {
    title: string;
    description: string;
    template: string;
    category: string;
    variables?: string[];
  }): Promise<any> {
    return this.makePost('api/rag/prompts', params);
  }

  /**
   * Update an existing prompt
   */
  async updatePrompt(
    promptId: string,
    params: {
      title?: string;
      description?: string;
      template?: string;
      category?: string;
      variables?: string[];
    },
  ): Promise<any> {
    return this.makePut(`api/rag/prompts/${promptId}`, params);
  }

  /**
   * Delete a prompt
   */
  async deletePrompt(promptId: string): Promise<any> {
    return this.makeDelete(`api/rag/prompts/${promptId}`);
  }

  /**
   * Delete a field mapping
   */
  async deleteFieldMapping(
    category: string,
    userId: string = 'demo-user',
  ): Promise<any> {
    return this.makeDelete(
      `api/rag/mappings/fields/${category}?user_id=${userId}`,
    );
  }

  /**
   * Delete a rex pattern
   */
  async deleteRexPattern(
    fieldName: string,
    userId: string = 'demo-user',
  ): Promise<any> {
    return this.makeDelete(
      `api/rag/mappings/rex/${fieldName}?user_id=${userId}`,
    );
  }

  /**
   * Delete an eval command
   */
  async deleteEvalCommand(
    commandId: string,
    userId: string = 'demo-user',
  ): Promise<any> {
    return this.makeDelete(
      `api/rag/mappings/eval/${commandId}?user_id=${userId}`,
    );
  }
}
