/**
 * Portal Types for Backend
 * 
 * Portal integration and embedding types.
  */

export interface PortalConfig {
  domain: string;
  theme: any;
  features: string[];
  settings: Record<string, any>;
}

export interface EmbeddingOptions {
  size: 'small' | 'medium' | 'large';
  theme: 'light' | 'dark' | 'auto';
  features: string[];
}

export interface PortalWidget {
  id: string;
  type: string;
  config: any;
  data: any;
}

export interface ChunkingStrategy {
  method: 'semantic' | 'size' | 'content';
  maxChunkSize: number;
  overlap: number;
}

export interface EmbeddingVector {
  id: string;
  vector: number[];
  metadata: any;
}

export interface EmbeddingModel {
  name: string;
  dimensions: number;
  provider: string;
}