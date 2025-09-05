import { BaseApiService } from './BaseApiService';
import { isDemoModeActive } from '../hooks/useDemoMode';

/**
 * Service for RAG (Retrieval-Augmented Generation) API operations
 * Handles natural language queries, field mappings, and pattern management
 */
export class RAGApiService extends BaseApiService {

  /**
   * Send a natural language query to the RAG system
   */
  async sendNaturalQuery(params: {
    natural_query: string;
    user_id: string;
    auto_index?: boolean;
  }): Promise<any> {
    if (isDemoModeActive()) {
      // Simulate network delay
      await new Promise((resolve) =>
        setTimeout(resolve, 800 + Math.random() * 400),
      );

      // Demo mode - return simulated response
      return {
        response: 'Demo mode: RAG query processed successfully',
        translated_query: `search index=main ${params.natural_query}`,
        execution_time: 0.8 + Math.random() * 0.4,
        result_count: Math.floor(Math.random() * 50) + 10,
        sources: ['demo_index', 'system_logs'],
        confidence: 0.85 + Math.random() * 0.1,
        additional_data: {
          sources: ['demo_index', 'system_logs'],
          structured_data: { demo: true },
        },
      };
    }

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
    if (isDemoModeActive()) {
      // Simulate network delay
      await new Promise((resolve) =>
        setTimeout(resolve, 600 + Math.random() * 400),
      );

      return {
        status: 'success',
        indexed_documents: params.max_documents || 100,
        execution_time: 0.8 + Math.random() * 0.4,
        message: 'Data successfully indexed for querying',
      };
    }

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
    if (isDemoModeActive()) {
      // Simulate network delay
      await new Promise((resolve) =>
        setTimeout(resolve, 700 + Math.random() * 300),
      );

      return {
        status: 'success',
        indexed_documents: params.max_documents || 100,
        execution_time: 1.2 + Math.random() * 0.8,
        investigation_id:
          params.investigation_id || `demo-investigation-${Date.now()}`,
        message: 'Query executed and data indexed successfully',
      };
    }

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
    if (isDemoModeActive()) {
      // Simulate network delay
      await new Promise((resolve) =>
        setTimeout(resolve, 900 + Math.random() * 600),
      );

      // Demo mode - return simulated response
      return {
        response: 'Demo mode: Translated query executed successfully',
        execution_time: 0.9 + Math.random() * 0.6,
        result_count: Math.floor(Math.random() * 100) + 20,
        sources: ['demo_index', 'translated_logs'],
        confidence: 0.82 + Math.random() * 0.15,
        additional_data: {
          sources: ['demo_index', 'translated_logs'],
          structured_data: { demo: true },
        },
      };
    }

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
    if (isDemoModeActive()) {
      // Simulate network delay
      await new Promise((resolve) =>
        setTimeout(resolve, 200 + Math.random() * 300),
      );

      // Demo mode - return empty mappings
      return {
        field_mappings: [],
        rex_patterns: [],
        eval_commands: [],
      };
    }

    // Note: /api/rag/mappings endpoint doesn't exist, using empty response
    // TODO: Replace with actual mappings endpoint when available
    return { field_mappings: [], rex_patterns: [], eval_commands: [] };
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
    if (isDemoModeActive()) {
      // Simulate network delay
      await new Promise((resolve) =>
        setTimeout(resolve, 300 + Math.random() * 200),
      );

      return {
        status: 'success',
        message: `Field mapping for category '${params.category}' added successfully`,
        category: params.category,
        fields: params.fields,
      };
    }

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
    if (isDemoModeActive()) {
      // Simulate network delay
      await new Promise((resolve) =>
        setTimeout(resolve, 250 + Math.random() * 200),
      );

      return {
        status: 'success',
        message: `Rex pattern for field '${params.field_name}' added successfully`,
        field_name: params.field_name,
        pattern: params.pattern,
      };
    }

    return this.makePost('api/rag/mappings/rex', params);
  }

  /**
   * Add a new eval command
   */
  async addEvalCommand(params: {
    command: string;
    user_id: string;
  }): Promise<any> {
    if (isDemoModeActive()) {
      // Simulate network delay
      await new Promise((resolve) =>
        setTimeout(resolve, 200 + Math.random() * 150),
      );

      return {
        status: 'success',
        message: 'Eval command added successfully',
        command: params.command,
      };
    }

    return this.makePost('api/rag/mappings/eval', params);
  }

  /**
   * Get prepared prompts for RAG system
   */
  async getPreparedPrompts(): Promise<any> {
    if (isDemoModeActive()) {
      // Simulate network delay
      await new Promise((resolve) =>
        setTimeout(resolve, 300 + Math.random() * 200),
      );

      // Demo mode - return empty prompts
      return {
        prompts: [],
      };
    }

    const prompts = await this.makeGet('api/mcp/prompts');
    // Transform the response to match expected format
    return { prompts };
  }

  /**
   * Get a specific prompt by ID
   */
  async getPromptById(promptId: string): Promise<any> {
    if (isDemoModeActive()) {
      // Simulate network delay
      await new Promise((resolve) =>
        setTimeout(resolve, 150 + Math.random() * 100),
      );

      // Demo mode - return demo prompt
      return {
        id: promptId,
        title: 'Demo Prompt',
        description: 'Demo prompt for testing',
        template: 'Demo template',
        category: 'demo',
        variables: [],
        created_at: new Date().toISOString(),
      };
    }

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
    if (isDemoModeActive()) {
      // Simulate network delay
      await new Promise((resolve) =>
        setTimeout(resolve, 400 + Math.random() * 300),
      );

      const newPrompt = {
        id: `demo-prompt-${Date.now()}`,
        ...params,
        variables: params.variables || [],
        created_at: new Date().toISOString(),
      };

      return {
        status: 'success',
        message: 'Prompt created successfully',
        prompt: newPrompt,
      };
    }

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
    if (isDemoModeActive()) {
      // Simulate network delay
      await new Promise((resolve) =>
        setTimeout(resolve, 350 + Math.random() * 250),
      );

      return {
        status: 'success',
        message: 'Prompt updated successfully',
        prompt_id: promptId,
        updated_fields: Object.keys(params),
      };
    }

    return this.makePut(`api/rag/prompts/${promptId}`, params);
  }

  /**
   * Delete a prompt
   */
  async deletePrompt(promptId: string): Promise<any> {
    if (isDemoModeActive()) {
      // Simulate network delay
      await new Promise((resolve) =>
        setTimeout(resolve, 200 + Math.random() * 150),
      );

      return {
        status: 'success',
        message: 'Prompt deleted successfully',
        prompt_id: promptId,
      };
    }

    return this.makeDelete(`api/rag/prompts/${promptId}`);
  }

  /**
   * Delete a field mapping
   */
  async deleteFieldMapping(
    category: string,
    userId: string = 'demo-user',
  ): Promise<any> {
    if (isDemoModeActive()) {
      // Simulate network delay
      await new Promise((resolve) =>
        setTimeout(resolve, 250 + Math.random() * 150),
      );

      return {
        status: 'success',
        message: `Field mapping for category '${category}' deleted successfully`,
        category: category,
      };
    }

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
    if (isDemoModeActive()) {
      // Simulate network delay
      await new Promise((resolve) =>
        setTimeout(resolve, 200 + Math.random() * 150),
      );

      return {
        status: 'success',
        message: `Rex pattern for field '${fieldName}' deleted successfully`,
        field_name: fieldName,
      };
    }

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
    if (isDemoModeActive()) {
      // Simulate network delay
      await new Promise((resolve) =>
        setTimeout(resolve, 180 + Math.random() * 120),
      );

      return {
        status: 'success',
        message: 'Eval command deleted successfully',
        command_id: commandId,
      };
    }

    return this.makeDelete(
      `api/rag/mappings/eval/${commandId}?user_id=${userId}`,
    );
  }
}
