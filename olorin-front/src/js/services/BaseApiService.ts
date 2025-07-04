/**
 * Base API Service for making HTTP requests
 * Common base class for all API services
 */
export class BaseApiService {
  private baseUrl: string;

  constructor(sandbox?: any) {
    // Use the same base URL pattern as other services
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8090';
  }

  /**
   * Make a GET request
   */
  protected async makeGet(endpoint: string, options?: RequestInit): Promise<any> {
    const url = `${this.baseUrl}/${endpoint}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        ...options?.headers,
      },
      mode: 'cors',
      credentials: 'include',
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Make a POST request
   */
  protected async makePost(endpoint: string, data?: any, options?: RequestInit): Promise<any> {
    const url = `${this.baseUrl}/${endpoint}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        ...options?.headers,
      },
      mode: 'cors',
      credentials: 'include',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Make a PUT request
   */
  protected async makePut(endpoint: string, data?: any, options?: RequestInit): Promise<any> {
    const url = `${this.baseUrl}/${endpoint}`;
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        ...options?.headers,
      },
      mode: 'cors',
      credentials: 'include',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Make a DELETE request
   */
  protected async makeDelete(endpoint: string, options?: RequestInit): Promise<any> {
    const url = `${this.baseUrl}/${endpoint}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        ...options?.headers,
      },
      mode: 'cors',
      credentials: 'include',
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
} 