export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  status: string;
  timestamp: string;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: Record<string, any>;
}

export class BaseApiService {
  protected baseUrl: string;
  protected defaultHeaders: Record<string, string>;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  protected getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (token) {
      return {
        'Authorization': `Bearer ${token}`,
      };
    }
    return {};
  }

  protected async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;

    const config: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(fullUrl, config);

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      return response;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  protected async handleErrorResponse(response: Response): Promise<never> {
    let errorData: any = {};

    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json();
      } else {
        errorData = { message: await response.text() };
      }
    } catch (parseError) {
      errorData = { message: response.statusText };
    }

    const apiError: ApiError = {
      message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
      status: response.status,
      code: errorData.code,
      details: errorData.details,
    };

    throw apiError;
  }

  protected async get<T>(url: string): Promise<T> {
    const response = await this.fetch(url, { method: 'GET' });
    const data = await response.json();
    return data.data || data;
  }

  protected async post<T>(url: string, body?: any): Promise<T> {
    const response = await this.fetch(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    return data.data || data;
  }

  protected async put<T>(url: string, body?: any): Promise<T> {
    const response = await this.fetch(url, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    return data.data || data;
  }

  protected async patch<T>(url: string, body?: any): Promise<T> {
    const response = await this.fetch(url, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    return data.data || data;
  }

  protected async delete(url: string): Promise<void> {
    await this.fetch(url, { method: 'DELETE' });
  }

  protected buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(`${key}[]`, v.toString()));
        } else {
          searchParams.append(key, value.toString());
        }
      }
    });

    return searchParams.toString();
  }

  public setAuthToken(token: string): void {
    localStorage.setItem('authToken', token);
  }

  public clearAuthToken(): void {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.get<{ status: string; timestamp: string }>('/health');
  }
}