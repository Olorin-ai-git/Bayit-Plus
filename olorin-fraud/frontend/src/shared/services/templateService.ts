/**
 * TemplateService - Template Management Client.
 * Feature: 005-polling-and-persistence
 *
 * SYSTEM MANDATE: Configuration-driven, no hardcoded values, complete error handling.
 */
import axios, { AxiosInstance } from 'axios';
import { getConfig } from '../config/env.config';
import { WizardState, InvestigationSettings } from '../types/wizardState';

// Load validated configuration
const envConfig = getConfig();
const config = {
  apiBaseUrl: envConfig.api.baseUrl,
  requestTimeoutMs: envConfig.api.requestTimeoutMs,
  // Note: AUTH_TOKEN not in schema - using process.env directly with validation
  authToken: process.env.REACT_APP_AUTH_TOKEN || ''
};

// Validate required configuration at module load
if (!config.authToken) {
  console.error('REACT_APP_AUTH_TOKEN not configured - template service authentication will fail');
}

interface Template {
  template_id: string;
  user_id: string;
  template_name: string;
  description: string | null;
  template_json: InvestigationSettings;
  tags: string[];
  usage_count: number;
  last_used: string | null;
  created_at: string;
  updated_at: string;
}

interface TemplateListResponse {
  templates: Template[];
  total: number;
  limit: number;
  offset: number;
}

interface ApplyTemplateRequest {
  entity_values: Array<{ entity_type: string; entity_value: string }>;
  overrides?: Partial<InvestigationSettings>;
}

class TemplateService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${config.apiBaseUrl}/api/v1/templates`,
      timeout: config.requestTimeoutMs,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.authToken}`
      }
    });
  }

  async listTemplates(tags?: string[], limit: number = 20, offset: number = 0): Promise<TemplateListResponse> {
    try {
      const params: Record<string, any> = { limit, offset };
      if (tags && tags.length > 0) params.tags = tags.join(',');

      const response = await this.client.get<TemplateListResponse>('/', { params });
      return response.data;
    } catch (error) {
      this.handleError(error, 'listTemplates');
      throw error;
    }
  }

  async createTemplate(name: string, description: string | null, templateJson: InvestigationSettings, tags: string[] = []): Promise<Template> {
    try {
      const response = await this.client.post<Template>('/', {
        template_name: name,
        description,
        template_json: templateJson,
        tags
      });
      return response.data;
    } catch (error) {
      this.handleError(error, 'createTemplate');
      throw error;
    }
  }

  async getTemplate(templateId: string): Promise<Template | null> {
    try {
      const response = await this.client.get<Template>(`/${templateId}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;
      this.handleError(error, 'getTemplate');
      throw error;
    }
  }

  async updateTemplate(templateId: string, updates: Partial<Omit<Template, 'template_id' | 'user_id' | 'usage_count' | 'created_at' | 'updated_at'>>): Promise<Template> {
    try {
      const response = await this.client.put<Template>(`/${templateId}`, updates);
      return response.data;
    } catch (error) {
      this.handleError(error, 'updateTemplate');
      throw error;
    }
  }

  async deleteTemplate(templateId: string): Promise<void> {
    try {
      await this.client.delete(`/${templateId}`);
    } catch (error) {
      this.handleError(error, 'deleteTemplate');
      throw error;
    }
  }

  async applyTemplate(templateId: string, request: ApplyTemplateRequest): Promise<WizardState> {
    try {
      const response = await this.client.post<WizardState>(`/${templateId}/apply`, request);
      return response.data;
    } catch (error) {
      this.handleError(error, 'applyTemplate');
      throw error;
    }
  }

  private handleError(error: unknown, operation: string): void {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 404) {
        console.error(`[TemplateService] ${operation}: Not found`);
      } else if (status === 422) {
        console.error(`[TemplateService] ${operation}: Validation error`);
      } else {
        console.error(`[TemplateService] ${operation}: ${error.message}`);
      }
    } else {
      console.error(`[TemplateService] ${operation}:`, error);
    }
  }
}

export const templateService = new TemplateService();
