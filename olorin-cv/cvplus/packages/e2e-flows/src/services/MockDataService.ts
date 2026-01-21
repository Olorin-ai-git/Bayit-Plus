/**
 * MockDataService - Realistic test data generation and management
 * Handles creation, caching, and lifecycle management of mock data for testing
  */

import { MockDataSetModel, MockDataSet, MockDataType, MockDataMetadata, JSONSchema } from '../models';
import * as crypto from 'crypto';

export interface DataGenerationOptions {
  type: MockDataType;
  category?: string;
  count?: number;
  locale?: string;
  seed?: string;
  template?: string;
  customFields?: Record<string, any>;
}

export interface DataCacheOptions {
  maxSize?: number; // in bytes
  maxAge?: number;  // in milliseconds
  compression?: boolean;
  encryption?: boolean;
}

export interface DataExportOptions {
  format: 'json' | 'csv' | 'yaml' | 'xml';
  includeMetadata?: boolean;
  compression?: 'gzip' | 'zip';
  filename?: string;
}

export interface DataTemplate {
  id: string;
  name: string;
  type: MockDataType;
  category: string;
  schema: JSONSchema;
  generator: (options: DataGenerationOptions) => Promise<Record<string, any>>;
  examples: Record<string, any>[];
}

export class MockDataService {
  private dataSets: Map<string, MockDataSetModel> = new Map();
  private templates: Map<string, DataTemplate> = new Map();
  private cache: Map<string, { data: MockDataSetModel; timestamp: number }> = new Map();
  private readonly cacheOptions: DataCacheOptions;

  constructor(cacheOptions: DataCacheOptions = {}) {
    this.cacheOptions = {
      maxSize: cacheOptions.maxSize || 100 * 1024 * 1024, // 100MB default
      maxAge: cacheOptions.maxAge || 24 * 60 * 60 * 1000,  // 24 hours default
      compression: cacheOptions.compression || false,
      encryption: cacheOptions.encryption || false
    };

    this.initializeDefaultTemplates();
  }

  // Data Set Management
  public async createDataSet(
    name: string,
    type: MockDataType,
    data: Record<string, any>,
    options: Partial<MockDataSet> = {}
  ): Promise<MockDataSetModel> {
    const id = options.id || this.generateId();

    const metadata: MockDataMetadata = options.metadata || {
      generatedBy: 'MockDataService',
      generatedAt: new Date(),
      usageCount: 0,
      source: 'generated',
      tags: []
    };

    const schema = options.schema || this.inferSchema(data);

    const dataSet = new MockDataSetModel({
      id,
      name,
      description: options.description || `Generated ${type} data`,
      type,
      category: options.category || 'default',
      data,
      schema,
      expiresAt: options.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000), // Default 24 hours
      metadata
    });

    this.dataSets.set(id, dataSet);
    return dataSet;
  }

  public async getDataSet(id: string): Promise<MockDataSetModel | null> {
    // Check cache first
    const cached = this.cache.get(id);
    if (cached && !this.isCacheExpired(cached.timestamp)) {
      cached.data.incrementUsage();
      return cached.data;
    }

    // Check main storage
    const dataSet = this.dataSets.get(id);
    if (dataSet) {
      if (dataSet.isExpired()) {
        await this.deleteDataSet(id);
        return null;
      }

      dataSet.incrementUsage();
      this.cacheDataSet(dataSet);
      return dataSet;
    }

    return null;
  }

  public async listDataSets(filter: {
    type?: MockDataType;
    category?: string;
    tags?: string[];
    expired?: boolean;
  } = {}): Promise<MockDataSetModel[]> {
    let dataSets = Array.from(this.dataSets.values());

    // Filter by type
    if (filter.type) {
      dataSets = dataSets.filter(ds => ds.type === filter.type);
    }

    // Filter by category
    if (filter.category) {
      dataSets = dataSets.filter(ds => ds.category === filter.category);
    }

    // Filter by tags
    if (filter.tags && filter.tags.length > 0) {
      dataSets = dataSets.filter(ds =>
        filter.tags!.some(tag => ds.metadata.tags.includes(tag))
      );
    }

    // Filter by expiration
    if (filter.expired !== undefined) {
      dataSets = dataSets.filter(ds => ds.isExpired() === filter.expired);
    }

    return dataSets.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  public async updateDataSet(id: string, updates: Partial<MockDataSet>): Promise<MockDataSetModel | null> {
    const dataSet = this.dataSets.get(id);
    if (!dataSet) {
      return null;
    }

    // Update data if provided
    if (updates.data) {
      dataSet.updateData(updates.data);
    }

    // Update other fields
    if (updates.name) dataSet.name = updates.name;
    if (updates.description) dataSet.description = updates.description;
    if (updates.category) dataSet.category = updates.category;
    if (updates.expiresAt) dataSet.expiresAt = updates.expiresAt;

    // Update metadata
    if (updates.metadata) {
      Object.assign(dataSet.metadata, updates.metadata);
    }

    dataSet.updatedAt = new Date();
    this.invalidateCache(id);

    return dataSet;
  }

  public async deleteDataSet(id: string): Promise<boolean> {
    this.invalidateCache(id);
    return this.dataSets.delete(id);
  }

  // Data Generation
  public async generateData(options: DataGenerationOptions): Promise<MockDataSetModel> {
    const template = this.getTemplateForType(options.type, options.category);
    if (!template) {
      throw new Error(`No template found for type ${options.type}, category ${options.category}`);
    }

    const count = options.count || 1;
    const generatedData: Record<string, any>[] = [];

    for (let i = 0; i < count; i++) {
      const itemData = await template.generator(options);
      generatedData.push(itemData);
    }

    const finalData = count === 1 ? generatedData[0] : generatedData;
    const finalSchema = count === 1 ? template.schema : {
      type: 'array',
      items: template.schema,
      minItems: count,
      maxItems: count
    };

    const dataSet = await this.createDataSet(
      `Generated ${options.type} data`,
      options.type,
      finalData,
      {
        category: options.category || template.category,
        schema: finalSchema,
        metadata: {
          generatedBy: 'MockDataService',
          generatedAt: new Date(),
          usageCount: 0,
          source: 'generated',
          tags: [`generated`, `type:${options.type}`, `count:${count}`]
        }
      }
    );

    return dataSet;
  }

  public async generateFromTemplate(templateId: string, options: Partial<DataGenerationOptions> = {}): Promise<MockDataSetModel> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    return this.generateData({
      ...options,
      type: template.type,
      category: template.category
    });
  }

  // Template Management
  public registerTemplate(template: DataTemplate): void {
    this.templates.set(template.id, template);
  }

  public getTemplate(id: string): DataTemplate | null {
    return this.templates.get(id) || null;
  }

  public listTemplates(type?: MockDataType): DataTemplate[] {
    const templates = Array.from(this.templates.values());
    return type ? templates.filter(t => t.type === type) : templates;
  }

  // Data Export/Import
  public async exportDataSet(id: string, options: DataExportOptions): Promise<string> {
    const dataSet = await this.getDataSet(id);
    if (!dataSet) {
      throw new Error(`Data set ${id} not found`);
    }

    const exportData = options.includeMetadata ? dataSet.toJSON() : dataSet.data;

    switch (options.format) {
      case 'json':
        return JSON.stringify(exportData, null, 2);

      case 'csv':
        return this.toCsv(exportData);

      case 'yaml':
        return this.toYaml(exportData);

      case 'xml':
        return this.toXml(exportData);

      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  public async importDataSet(data: string, format: 'json' | 'csv' | 'yaml', metadata: Partial<MockDataSet>): Promise<MockDataSetModel> {
    let parsedData: any;

    switch (format) {
      case 'json':
        parsedData = JSON.parse(data);
        break;

      case 'csv':
        parsedData = this.fromCsv(data);
        break;

      case 'yaml':
        parsedData = this.fromYaml(data);
        break;

      default:
        throw new Error(`Unsupported import format: ${format}`);
    }

    return this.createDataSet(
      metadata.name || 'Imported data',
      metadata.type || 'cv',
      parsedData,
      {
        ...metadata,
        metadata: {
          generatedBy: 'import',
          generatedAt: new Date(),
          usageCount: 0,
          source: 'imported',
          tags: metadata.metadata?.tags || ['imported']
        }
      }
    );
  }

  // Cache Management
  public clearCache(): void {
    this.cache.clear();
  }

  public async cleanupExpired(): Promise<number> {
    const expired: string[] = [];

    for (const [id, dataSet] of this.dataSets) {
      if (dataSet.isExpired()) {
        expired.push(id);
      }
    }

    for (const id of expired) {
      await this.deleteDataSet(id);
    }

    return expired.length;
  }

  public getCacheStats(): { size: number; count: number; hitRate: number } {
    const totalSize = Array.from(this.cache.values())
      .reduce((sum, cached) => sum + cached.data.size, 0);

    return {
      size: totalSize,
      count: this.cache.size,
      hitRate: 0 // Would need hit tracking
    };
  }

  // Private Methods
  private generateId(): string {
    return `mock-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  }

  private inferSchema(data: Record<string, any>): JSONSchema {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined) {
        required.push(key);
      }

      if (typeof value === 'string') {
        properties[key] = { type: 'string' };
      } else if (typeof value === 'number') {
        properties[key] = { type: 'number' };
      } else if (typeof value === 'boolean') {
        properties[key] = { type: 'boolean' };
      } else if (Array.isArray(value)) {
        properties[key] = { type: 'array', items: { type: 'string' } };
      } else if (typeof value === 'object') {
        properties[key] = { type: 'object' };
      }
    }

    return {
      type: 'object',
      properties,
      required,
      additionalProperties: false
    };
  }

  private getTemplateForType(type: MockDataType, category?: string): DataTemplate | null {
    const templates = Array.from(this.templates.values())
      .filter(t => t.type === type && (!category || t.category === category));

    return templates.length > 0 ? templates[0] : null;
  }

  private cacheDataSet(dataSet: MockDataSetModel): void {
    // Check cache size limit
    const totalSize = this.getCacheStats().size + dataSet.size;
    if (totalSize > this.cacheOptions.maxSize!) {
      this.evictOldestCache();
    }

    this.cache.set(dataSet.id, {
      data: dataSet,
      timestamp: Date.now()
    });
  }

  private invalidateCache(id: string): void {
    this.cache.delete(id);
  }

  private isCacheExpired(timestamp: number): boolean {
    return (Date.now() - timestamp) > this.cacheOptions.maxAge!;
  }

  private evictOldestCache(): void {
    let oldestId = '';
    let oldestTimestamp = Date.now();

    for (const [id, cached] of this.cache) {
      if (cached.timestamp < oldestTimestamp) {
        oldestTimestamp = cached.timestamp;
        oldestId = id;
      }
    }

    if (oldestId) {
      this.cache.delete(oldestId);
    }
  }

  private toCsv(data: any): string {
    if (Array.isArray(data)) {
      if (data.length === 0) return '';

      const headers = Object.keys(data[0]);
      const csvLines = [headers.join(',')];

      for (const item of data) {
        const values = headers.map(header => {
          const value = item[header];
          return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : String(value);
        });
        csvLines.push(values.join(','));
      }

      return csvLines.join('\n');
    } else {
      // Single object to CSV
      const headers = Object.keys(data);
      const values = headers.map(key => {
        const value = data[key];
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : String(value);
      });

      return `${headers.join(',')}\n${values.join(',')}`;
    }
  }

  private toYaml(data: any): string {
    // Basic YAML serialization (would use a proper YAML library in production)
    return JSON.stringify(data, null, 2)
      .replace(/"/g, '')
      .replace(/:/g, ': ')
      .replace(/,$/gm, '');
  }

  private toXml(data: any): string {
    // Basic XML serialization
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<data>\n';

    const toXmlRecursive = (obj: any, indent = '  '): string => {
      let result = '';
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && !Array.isArray(value)) {
          result += `${indent}<${key}>\n${toXmlRecursive(value, indent + '  ')}${indent}</${key}>\n`;
        } else {
          result += `${indent}<${key}>${String(value)}</${key}>\n`;
        }
      }
      return result;
    };

    xml += toXmlRecursive(data);
    xml += '</data>';

    return xml;
  }

  private fromCsv(csv: string): any[] {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',');
    const result: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const obj: any = {};

      headers.forEach((header, index) => {
        obj[header.trim()] = values[index]?.trim().replace(/^"|"$/g, '') || '';
      });

      result.push(obj);
    }

    return result;
  }

  private fromYaml(yaml: string): any {
    // Basic YAML parsing (would use a proper YAML library in production)
    try {
      return JSON.parse(yaml);
    } catch {
      // Fallback to simple key-value parsing
      const result: any = {};
      const lines = yaml.split('\n');

      for (const line of lines) {
        const match = line.match(/^([^:]+):\s*(.*)$/);
        if (match) {
          result[match[1].trim()] = match[2].trim();
        }
      }

      return result;
    }
  }

  private initializeDefaultTemplates(): void {
    // CV Template
    this.registerTemplate({
      id: 'cv-template',
      name: 'CV Data Template',
      type: 'cv',
      category: 'technology',
      schema: {
        type: 'object',
        properties: {
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          title: { type: 'string' },
          summary: { type: 'string' },
          experience: { type: 'array' },
          skills: { type: 'array' },
          education: { type: 'array' }
        },
        required: ['firstName', 'lastName', 'email']
      },
      generator: async (_options) => {
        const firstNames = ['John', 'Jane', 'Alex', 'Sarah', 'Michael', 'Emily'];
        const lastNames = ['Smith', 'Johnson', 'Brown', 'Davis', 'Wilson', 'Moore'];
        const titles = ['Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'DevOps Engineer'];

        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

        return {
          firstName,
          lastName,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
          phone: '+1-555-' + Math.floor(Math.random() * 9000 + 1000),
          title: titles[Math.floor(Math.random() * titles.length)],
          summary: 'Experienced software developer with a passion for creating innovative solutions.',
          experience: [
            {
              company: 'Tech Corp',
              role: titles[Math.floor(Math.random() * titles.length)],
              duration: '2020-2023',
              description: 'Developed and maintained web applications using modern technologies.'
            }
          ],
          skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python'],
          education: [
            {
              degree: 'Bachelor of Computer Science',
              school: 'Tech University',
              year: '2020'
            }
          ]
        };
      },
      examples: [
        {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          title: 'Software Engineer'
        }
      ]
    });

    // User Profile Template
    this.registerTemplate({
      id: 'user-profile-template',
      name: 'User Profile Template',
      type: 'user-profile',
      category: 'general',
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          username: { type: 'string' },
          email: { type: 'string' },
          avatar: { type: 'string' },
          preferences: { type: 'object' }
        },
        required: ['id', 'username', 'email']
      },
      generator: async (_options) => {
        const usernames = ['techguru', 'codemaster', 'devexpert', 'webwizard'];
        const username = usernames[Math.floor(Math.random() * usernames.length)];

        return {
          id: crypto.randomUUID(),
          username: username + Math.floor(Math.random() * 1000),
          email: `${username}@example.com`,
          avatar: `https://avatar.example.com/${username}.jpg`,
          preferences: {
            theme: 'dark',
            notifications: true,
            language: 'en'
          }
        };
      },
      examples: [
        {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com'
        }
      ]
    });
  }
}

export default MockDataService;