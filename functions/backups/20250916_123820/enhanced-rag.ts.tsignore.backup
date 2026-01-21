// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Enhanced RAG and Chat Types
 * 
 * RAG system and chat functionality types for enhanced CV features.
 * Extracted from enhanced-models.ts to maintain <200 line compliance.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

/**
 * User RAG profile for AI chat
 */
export interface UserRAGProfile {
  userId: string;
  jobId: string;
  vectorStoreId?: string;
  embeddingsGenerated: boolean;
  lastEmbeddingUpdate: Date;
  chunks: CVChunk[];
  chatHistory: ChatSession[];
  personalityContext: string;
  expertiseAreas: string[];
  conversationalTone: 'professional' | 'casual' | 'friendly' | 'technical';
  availableTopics: string[];
  restrictedTopics?: string[];
  customPrompts?: Record<string, string>;
  settings?: {
    maxTokens?: number;
    temperature?: number;
    responseFormat?: 'concise' | 'detailed' | 'conversational';
    language?: string;
    enablePersonalization?: boolean;
    personality?: string;
    systemPrompt?: string;
    allowedTopics?: string[];
  };
}

/**
 * CV content chunk for RAG
 */
export interface CVChunk {
  id: string;
  jobId: string;
  content: string;
  chunkType: 'personal' | 'experience' | 'skills' | 'education' | 'projects' | 'achievements';
  embedding?: number[];
  metadata: {
    section: string;
    importance: number;
    keywords: string[];
    entities: string[];
  };
  createdAt: Date;
}

/**
 * Chat session data
 */
export interface ChatSession {
  id: string;
  jobId: string;
  visitorId?: string;
  startedAt: Date;
  endedAt?: Date;
  messages: ChatMessage[];
  sessionDuration?: number;
  satisfaction?: 'positive' | 'neutral' | 'negative';
  topics: string[];
  leadGenerated: boolean;
  contactInfoShared: boolean;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  // Additional properties for service compatibility
  sessionId?: string; // For backward compatibility
  userId?: string; // CV owner
  createdAt?: Date; // For backward compatibility
  lastActivity?: Date; // For backward compatibility
  metadata?: {
    source?: 'public' | 'private' | 'shared';
    referrer?: string;
  };
}

/**
 * Individual chat message
 */
export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  responseTime?: number;
  confidence?: number;
  sourceChunks?: string[];
  metadata?: {
    intent?: string;
    entities?: string[];
    sentiment?: 'positive' | 'neutral' | 'negative';
  };
}