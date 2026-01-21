/**
 * MockDataSet entity model
 * Contains realistic test data including CV documents, user profiles, and expected AI responses.
  */

import * as crypto from 'crypto';

export interface MockDataMetadata {
  generatedBy: string;
  generatedAt: Date;
  usageCount: number;
  lastUsedAt?: Date | undefined;
  source: 'generated' | 'imported' | 'template';
  tags: string[];
}

export interface JSONSchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  additionalProperties?: boolean;
  [key: string]: any;
}

export type MockDataType = 'cv' | 'user-profile' | 'job-description' | 'ai-response' | 'multimedia';

export interface MockDataSet {
  id: string;
  name: string;
  description: string;
  type: MockDataType;
  category: string;
  data: Record<string, any>;
  schema: JSONSchema;
  size: number;
  checksum: string;
  expiresAt?: Date | undefined;
  metadata: MockDataMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export class MockDataSetModel implements MockDataSet {
  public readonly id: string;
  public name: string;
  public description: string;
  public type: MockDataType;
  public category: string;
  public data: Record<string, any>;
  public schema: JSONSchema;
  public size: number;
  public checksum: string;
  public expiresAt?: Date | undefined;
  public metadata: MockDataMetadata;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(data: Omit<MockDataSet, 'createdAt' | 'updatedAt' | 'size' | 'checksum'>) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.type = data.type;
    this.category = data.category;
    this.data = data.data;
    this.schema = data.schema;
    this.expiresAt = data.expiresAt;
    this.metadata = data.metadata;
    this.createdAt = new Date();
    this.updatedAt = new Date();

    // Calculate size and checksum
    this.size = this.calculateSize();
    this.checksum = this.calculateChecksum();

    this.validate();
  }

  public validate(): void {
    if (!this.name?.trim()) {
      throw new Error('MockDataSet name is required');
    }

    if (this.size > 104857600) { // 100MB limit
      throw new Error('Data size must not exceed 100MB limit');
    }

    if (!this.validateDataAgainstSchema()) {
      throw new Error('Data must conform to defined schema');
    }

    if (this.checksum !== this.calculateChecksum()) {
      throw new Error('Checksum must match data content');
    }

    // Validate expiration date for temporary data
    if (this.metadata.source === 'generated' && !this.expiresAt) {
      throw new Error('Expiration date must be set for generated temporary data');
    }

    if (this.expiresAt && this.expiresAt <= new Date()) {
      throw new Error('Expiration date must be in the future');
    }
  }

  private calculateSize(): number {
    return Buffer.byteLength(JSON.stringify(this.data), 'utf8');
  }

  private calculateChecksum(): string {
    const dataString = JSON.stringify(this.data, Object.keys(this.data).sort());
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  private validateDataAgainstSchema(): boolean {
    // Basic schema validation - in production, use a proper JSON schema validator
    if (!this.schema || !this.schema.type) {
      return true; // No schema to validate against
    }

    if (this.schema.type === 'object' && typeof this.data !== 'object') {
      return false;
    }

    if (this.schema.required && Array.isArray(this.schema.required)) {
      for (const requiredField of this.schema.required) {
        if (!(requiredField in this.data)) {
          return false;
        }
      }
    }

    return true;
  }

  public updateData(newData: Record<string, any>): void {
    this.data = newData;
    this.size = this.calculateSize();
    this.checksum = this.calculateChecksum();
    this.updatedAt = new Date();
    this.validate();
  }

  public incrementUsage(): void {
    this.metadata.usageCount++;
    this.metadata.lastUsedAt = new Date();
    this.updatedAt = new Date();
  }

  public isExpired(): boolean {
    return this.expiresAt ? this.expiresAt <= new Date() : false;
  }

  public addTag(tag: string): void {
    if (!this.metadata.tags.includes(tag)) {
      this.metadata.tags.push(tag);
      this.updatedAt = new Date();
    }
  }

  public removeTag(tag: string): void {
    const index = this.metadata.tags.indexOf(tag);
    if (index > -1) {
      this.metadata.tags.splice(index, 1);
      this.updatedAt = new Date();
    }
  }

  public clone(newId: string, newName?: string): MockDataSetModel {
    const clonedData = JSON.parse(JSON.stringify(this.data));
    return new MockDataSetModel({
      id: newId,
      name: newName || `${this.name} (Copy)`,
      description: this.description,
      type: this.type,
      category: this.category,
      data: clonedData,
      schema: this.schema,
      expiresAt: this.expiresAt,
      metadata: {
        ...this.metadata,
        generatedBy: 'clone',
        generatedAt: new Date(),
        usageCount: 0,
        source: 'template'
      }
    });
  }

  public toJSON(): MockDataSet {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      type: this.type,
      category: this.category,
      data: this.data,
      schema: this.schema,
      size: this.size,
      checksum: this.checksum,
      expiresAt: this.expiresAt,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  public static fromJSON(data: any): MockDataSetModel {
    const mockDataSet = new MockDataSetModel({
      id: data.id,
      name: data.name,
      description: data.description,
      type: data.type,
      category: data.category,
      data: data.data,
      schema: data.schema,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      metadata: {
        ...data.metadata,
        generatedAt: new Date(data.metadata.generatedAt),
        lastUsedAt: data.metadata.lastUsedAt ? new Date(data.metadata.lastUsedAt) : undefined
      }
    });

    if (data.createdAt) {
      (mockDataSet as any).createdAt = new Date(data.createdAt);
    }
    if (data.updatedAt) {
      mockDataSet.updatedAt = new Date(data.updatedAt);
    }

    return mockDataSet;
  }
}

export default MockDataSetModel;