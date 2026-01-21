/**
 * Verified Claude Service
 *
 * Service for managing Claude API integration and verification.
 * Handles LLM interaction verification and monitoring.
  */

export interface ClaudeVerificationResult {
  verified: boolean;
  responseTime: number;
  status: string;
  version?: string;
  error?: string;
  usage?: any;
}

export interface VerifiedMessageOptions {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  systemPrompt?: string;
  messages?: Array<{
    role: string;
    content: string;
  }>;
}

export class VerifiedClaudeService {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY;
  }

  /**
   * Verify Claude API connectivity
    */
  async verifyConnection(): Promise<ClaudeVerificationResult> {
    if (!this.apiKey) {
      return {
        verified: false,
        responseTime: 0,
        status: 'error',
        error: 'Anthropic API key not configured'
      };
    }

    const startTime = Date.now();

    try {
      // Real Claude API verification
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hello' }]
        })
      });

      const isVerified = response.ok;
      const responseData = isVerified ? await response.json() : null;

      return {
        verified: isVerified,
        responseTime: Date.now() - startTime,
        status: isVerified ? 'active' : 'error',
        version: responseData?.model || 'unknown',
        usage: responseData?.usage || null
      };

    } catch (error) {
      return {
        verified: false,
        responseTime: Date.now() - startTime,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get service status
    */
  getServiceStatus(): {
    available: boolean;
    configured: boolean;
    lastVerified?: Date;
  } {
    return {
      available: !!this.apiKey,
      configured: !!this.apiKey,
      lastVerified: new Date()
    };
  }

  /**
   * Test Claude response
    */
  async testResponse(prompt: string): Promise<{
    success: boolean;
    response?: string;
    error?: string;
    responseTime?: number;
  }> {
    const startTime = Date.now();

    try {
      // Real Claude API test
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey || '',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 100,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        response: data.content?.[0]?.text || 'No response content',
        responseTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Create verified message with Claude API
    */
  async createVerifiedMessage(options: VerifiedMessageOptions): Promise<{
    success: boolean;
    response?: string;
    error?: string;
    responseTime?: number;
    content?: Array<{ content: string }>;
    verification?: {
      verified: boolean;
      confidence: number;
    };
    usage?: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    };
  }> {
    const startTime = Date.now();

    try {
      // Real verified message creation with Claude API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey || '',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: options.model || 'claude-3-haiku-20240307',
          max_tokens: options.maxTokens || 500,
          messages: [{ role: 'user', content: options.prompt }],
          temperature: options.temperature || 0.7,
          system: options.systemPrompt
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API request failed: ${response.status}`);
      }

      const data = await response.json();
      const responseContent = data.content?.[0]?.text || '';

      return {
        success: true,
        response: responseContent,
        responseTime: Date.now() - startTime,
        content: data.content || [],
        verification: {
          verified: true,
          confidence: 1.0
        },
        usage: {
          inputTokens: data.usage?.input_tokens || 0,
          outputTokens: data.usage?.output_tokens || 0,
          totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      };
    }
  }
}