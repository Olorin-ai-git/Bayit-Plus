// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Embedding Service for CV Content Processing
 *
 * Handles CV content chunking and OpenAI embedding generation
 * for RAG-powered AI chat functionality in One Click Portal
 *
 * @author CVPlus Team
 * @version 1.0.0
 */

import OpenAI from 'openai';

export interface CVEmbeddingDocument {
  id: string;
  processedCvId: string;
  content: string;
  embedding: number[];
  metadata: {
    section: string;
    type: 'experience' | 'education' | 'skills' | 'summary' | 'projects' | 'certifications' | 'other';
    chunkIndex: number;
    tokenCount: number;
    embeddingModel: string;
    createdAt: Date;
  };
}

export interface CVChunk {
  id: string;
  content: string;
  section: string;
  type: 'experience' | 'education' | 'skills' | 'summary' | 'projects' | 'certifications' | 'other';
  tokenCount: number;
}

export class EmbeddingService {
  private openai: OpenAI;
  private readonly EMBEDDING_MODEL = 'text-embedding-3-small';
  private readonly MAX_CHUNK_TOKENS = 500;
  private readonly OVERLAP_TOKENS = 50;

  constructor(apiKey?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY
    });
  }

  /**
   * Generate embeddings for processed CV data
   */
  async generateCVEmbeddings(processedCV: any): Promise<CVEmbeddingDocument[]> {
    try {
      console.log(`Generating embeddings for CV: ${processedCV.id}`);

      // Step 1: Chunk CV content into optimal sizes
      const chunks = await this.chunkCVContent(processedCV);

      if (chunks.length === 0) {
        console.warn('No content chunks generated for CV:', processedCV.id);
        return [];
      }

      console.log(`Generated ${chunks.length} content chunks`);

      // Step 2: Generate embeddings for each chunk
      const embeddings: CVEmbeddingDocument[] = [];

      for (const chunk of chunks) {
        try {
          const response = await this.openai.embeddings.create({
            model: this.EMBEDDING_MODEL,
            input: chunk.content,
            encoding_format: 'float'
          });

          embeddings.push({
            id: chunk.id,
            processedCvId: processedCV.id,
            content: chunk.content,
            embedding: response.data[0].embedding,
            metadata: {
              section: chunk.section,
              type: chunk.type,
              chunkIndex: embeddings.length,
              tokenCount: chunk.tokenCount,
              embeddingModel: this.EMBEDDING_MODEL,
              createdAt: new Date()
            }
          });

          // Small delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`Failed to generate embedding for chunk ${chunk.id}:`, error);
          // Continue with other chunks
        }
      }

      console.log(`Successfully generated ${embeddings.length} embeddings`);
      return embeddings;

    } catch (error) {
      console.error('Error generating CV embeddings:', error);
      throw new Error(`Failed to generate CV embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Chunk CV content into optimal sizes for embeddings
   */
  private async chunkCVContent(processedCV: any): Promise<CVChunk[]> {
    const chunks: CVChunk[] = [];

    // Process different sections of the CV
    const sections = [
      { key: 'summary', type: 'summary' as const },
      { key: 'personalInfo', type: 'summary' as const },
      { key: 'experience', type: 'experience' as const },
      { key: 'education', type: 'education' as const },
      { key: 'skills', type: 'skills' as const },
      { key: 'projects', type: 'projects' as const },
      { key: 'certifications', type: 'certifications' as const }
    ];

    for (const section of sections) {
      const sectionData = processedCV[section.key];

      if (!sectionData) continue;

      if (Array.isArray(sectionData)) {
        // Handle array sections (experience, education, projects, etc.)
        for (let i = 0; i < sectionData.length; i++) {
          const item = sectionData[i];
          const content = this.extractTextFromObject(item);

          if (content.trim().length > 0) {
            const itemChunks = this.splitTextIntoChunks(
              content,
              `${section.key}_${i}`,
              section.key,
              section.type
            );
            chunks.push(...itemChunks);
          }
        }
      } else if (typeof sectionData === 'object') {
        // Handle object sections (summary, personalInfo)
        const content = this.extractTextFromObject(sectionData);

        if (content.trim().length > 0) {
          const sectionChunks = this.splitTextIntoChunks(
            content,
            section.key,
            section.key,
            section.type
          );
          chunks.push(...sectionChunks);
        }
      } else if (typeof sectionData === 'string') {
        // Handle string sections
        if (sectionData.trim().length > 0) {
          const sectionChunks = this.splitTextIntoChunks(
            sectionData,
            section.key,
            section.key,
            section.type
          );
          chunks.push(...sectionChunks);
        }
      }
    }

    return chunks;
  }

  /**
   * Extract text content from CV objects
   */
  private extractTextFromObject(obj: any): string {
    if (typeof obj === 'string') return obj;
    if (!obj || typeof obj !== 'object') return '';

    const textParts: string[] = [];

    // Common CV fields to extract
    const textFields = [
      'title', 'name', 'summary', 'description', 'content',
      'company', 'position', 'role', 'institution', 'degree',
      'field', 'skill', 'technology', 'achievement', 'responsibility',
      'location', 'duration', 'startDate', 'endDate', 'email',
      'phone', 'website', 'linkedin', 'github'
    ];

    for (const field of textFields) {
      if (obj[field] && typeof obj[field] === 'string') {
        textParts.push(obj[field]);
      }
    }

    // Handle arrays of strings
    for (const key in obj) {
      if (Array.isArray(obj[key])) {
        for (const item of obj[key]) {
          if (typeof item === 'string') {
            textParts.push(item);
          } else if (item && typeof item === 'object') {
            textParts.push(this.extractTextFromObject(item));
          }
        }
      }
    }

    return textParts.filter(text => text && text.trim().length > 0).join(' ');
  }

  /**
   * Split text into chunks of optimal size
   */
  private splitTextIntoChunks(
    text: string,
    baseId: string,
    section: string,
    type: CVChunk['type']
  ): CVChunk[] {
    const words = text.split(/\s+/);
    const chunks: CVChunk[] = [];

    // Rough token estimation (1 token ≈ 0.75 words)
    const estimatedTokens = Math.ceil(words.length / 0.75);

    if (estimatedTokens <= this.MAX_CHUNK_TOKENS) {
      // Text fits in one chunk
      chunks.push({
        id: `${baseId}_chunk_0`,
        content: text.trim(),
        section,
        type,
        tokenCount: estimatedTokens
      });
    } else {
      // Split into multiple chunks with overlap
      const wordsPerChunk = Math.floor(this.MAX_CHUNK_TOKENS * 0.75);
      const overlapWords = Math.floor(this.OVERLAP_TOKENS * 0.75);

      let startIndex = 0;
      let chunkIndex = 0;

      while (startIndex < words.length) {
        const endIndex = Math.min(startIndex + wordsPerChunk, words.length);
        const chunkWords = words.slice(startIndex, endIndex);
        const chunkText = chunkWords.join(' ');

        if (chunkText.trim().length > 0) {
          chunks.push({
            id: `${baseId}_chunk_${chunkIndex}`,
            content: chunkText.trim(),
            section,
            type,
            tokenCount: Math.ceil(chunkWords.length / 0.75)
          });
        }

        startIndex = endIndex - overlapWords;
        chunkIndex++;

        // Safety check to prevent infinite loops
        if (chunkIndex > 100) {
          console.warn(`Too many chunks generated for section ${section}, stopping at 100`);
          break;
        }
      }
    }

    return chunks;
  }

  /**
   * Generate embedding for a single query string
   */
  async generateQueryEmbedding(query: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.EMBEDDING_MODEL,
        input: query.trim(),
        encoding_format: 'float'
      });

      return response.data[0].embedding;

    } catch (error) {
      console.error('Error generating query embedding:', error);
      throw new Error(`Failed to generate query embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate OpenAI API connection
   */
  async validateConnection(): Promise<boolean> {
    try {
      const testResponse = await this.openai.embeddings.create({
        model: this.EMBEDDING_MODEL,
        input: 'test connection',
        encoding_format: 'float'
      });

      return testResponse.data.length > 0 && testResponse.data[0].embedding.length === 1536;

    } catch (error) {
      console.error('OpenAI connection validation failed:', error);
      return false;
    }
  }
}