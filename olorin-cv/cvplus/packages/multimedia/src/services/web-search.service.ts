/**
 * Web Search Service using Serper API
 * Provides web search capabilities for CV enhancement
  */

import axios from 'axios';
import { environment as config } from '../config/environment';

interface SerperSearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

interface SerperResponse {
  organic: SerperSearchResult[];
  searchParameters: {
    q: string;
    gl: string;
    hl: string;
  };
}

export class WebSearchService {
  private serperApiKey: string;
  private baseUrl = 'https://google.serper.dev/search';

  constructor() {
    this.serperApiKey = config.search?.serperApiKey || process.env.SERPER_API_KEY || '';
    
    if (!this.serperApiKey) {
    }
  }

  /**
   * Search the web for information about a company or technology
    */
  async searchCompanyInfo(companyName: string): Promise<SerperSearchResult[]> {
    if (!this.serperApiKey) {
      return [];
    }

    try {
      const query = `${companyName} company information recent news`;
      const response = await axios.post<SerperResponse>(
        this.baseUrl,
        {
          q: query,
          gl: 'us',
          hl: 'en',
          num: 5
        },
        {
          headers: {
            'X-API-KEY': this.serperApiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.organic || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Search for technology or skill information
    */
  async searchTechnologyInfo(technology: string): Promise<SerperSearchResult[]> {
    if (!this.serperApiKey) {
      return [];
    }

    try {
      const query = `${technology} technology trends jobs market demand 2024`;
      const response = await axios.post<SerperResponse>(
        this.baseUrl,
        {
          q: query,
          gl: 'us',
          hl: 'en',
          num: 3
        },
        {
          headers: {
            'X-API-KEY': this.serperApiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.organic || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Search for industry trends and insights
    */
  async searchIndustryTrends(industry: string): Promise<SerperSearchResult[]> {
    if (!this.serperApiKey) {
      return [];
    }

    try {
      const query = `${industry} industry trends 2024 market insights jobs`;
      const response = await axios.post<SerperResponse>(
        this.baseUrl,
        {
          q: query,
          gl: 'us',
          hl: 'en',
          num: 4
        },
        {
          headers: {
            'X-API-KEY': this.serperApiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.organic || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Generic web search
    */
  async search(query: string, numResults: number = 5): Promise<SerperSearchResult[]> {
    if (!this.serperApiKey) {
      return [];
    }

    try {
      const response = await axios.post<SerperResponse>(
        this.baseUrl,
        {
          q: query,
          gl: 'us',
          hl: 'en',
          num: numResults
        },
        {
          headers: {
            'X-API-KEY': this.serperApiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.organic || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Check if web search is available
    */
  isAvailable(): boolean {
    return !!this.serperApiKey;
  }
}