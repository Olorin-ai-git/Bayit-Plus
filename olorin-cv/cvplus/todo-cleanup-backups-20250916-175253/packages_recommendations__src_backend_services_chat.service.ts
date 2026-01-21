/**
 * Chat service for RAG-based conversations
  */

import OpenAI from 'openai';
import { config } from '../../config/environment';
import { enhancedDbService } from '../../services/enhanced-db.service';
import { ChatMessage, UserRAGProfile } from '../../types/enhanced-models';
// TODO: Import embedding service once it's moved to recommendations module
const embeddingService = {
  generateEmbedding: async (_text: string): Promise<number[]> => {
    // Stub implementation - will be replaced with actual embedding service
    return [];
  },
  searchSimilar: async (_embedding: number[], _topK?: number): Promise<any[]> => {
    // Stub implementation
    return [];
  },
  querySimilarChunks: async (_query: string, _jobId?: string, _topK?: number): Promise<any[]> => {
    // Stub implementation
    return [];
  }
};
import { nanoid } from 'nanoid';

export class ChatService {
  private openai: OpenAI | null = null;
  
  constructor() {
    // Initialize OpenAI lazily when needed
  }

  private getOpenAI(): OpenAI {
    if (!this.openai) {
      this.openai = new OpenAI({
        apiKey: config.rag?.openaiApiKey || process.env.OPENAI_API_KEY || '',
      });
    }
    return this.openai;
  }
  
  /**
   * Process a chat message and generate response
    */
  async processMessage(
    sessionId: string,
    message: string,
    vectorNamespace: string,
    ragProfile: UserRAGProfile
  ): Promise<ChatMessage> {
    try {
      // 1. Retrieve relevant context from vector DB
      const relevantChunks = await embeddingService.querySimilarChunks(
        message,
        vectorNamespace,
        5 // Top 5 most relevant chunks
      );
      
      // 2. Build context from retrieved chunks
      const context = this.buildContext(relevantChunks);
      
      // 3. Generate system prompt with context
      const systemPrompt = this.buildSystemPrompt(ragProfile, context);
      
      // 4. Call OpenAI to generate response
      const response = await this.generateResponse(
        message,
        systemPrompt,
        ragProfile.settings
      );
      
      // 5. Create chat message
      const userMessage: ChatMessage = {
        id: nanoid(),
        sessionId,
        role: 'user',
        content: message,
        timestamp: new Date()
      };
      
      const assistantMessage: ChatMessage = {
        id: nanoid(),
        sessionId,
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        metadata: {
          intent: 'response',
          entities: [],
          sentiment: 'neutral'
        }
      };
      
      // 6. Store messages in session
      await enhancedDbService.addChatMessage(sessionId, userMessage);
      await enhancedDbService.addChatMessage(sessionId, assistantMessage);
      
      return assistantMessage;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Initialize a new chat session
    */
  async initializeSession(
    jobId: string,
    _userId?: string,
    visitorId?: string,
    metadata?: any
  ): Promise<string> {
    const sessionId = nanoid();
    await enhancedDbService.createChatSession({
      id: sessionId,
      jobId,
      visitorId,
      startedAt: new Date(),
      messages: [],
      topics: [],
      leadGenerated: false,
      contactInfoShared: false,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      referrer: metadata?.referrer
    });
    
    // Send initial greeting
    const greeting = this.generateGreeting();
    const greetingMessage: ChatMessage = {
      id: nanoid(),
      sessionId,
      role: 'assistant',
      content: greeting,
      timestamp: new Date()
    };
    
    await enhancedDbService.addChatMessage(sessionId, greetingMessage);
    
    return sessionId;
  }
  
  /**
   * Build context from retrieved chunks
    */
  private buildContext(chunks: any[]): string {
    if (chunks.length === 0) {
      return 'No specific context found.';
    }
    
    const contextParts = chunks.map((chunk, index) => {
      const score = chunk.score?.toFixed(3) || 'N/A';
      return `[Context ${index + 1} (Score: ${score})]\n${chunk.metadata?.content || chunk.text}`;
    });
    
    return contextParts.join('\n\n');
  }
  
  /**
   * Build system prompt with context
    */
  private buildSystemPrompt(profile: UserRAGProfile, context: string): string {
    const basePrompt = profile.settings?.systemPrompt || this.getDefaultSystemPrompt();
    
    const fullPrompt = `${basePrompt}

Based on the following CV information, answer questions professionally and accurately:

${context}

Important guidelines:
- Only answer based on the information provided in the CV
- If asked about something not in the CV, politely say it's not included in the available information
- Maintain a ${profile.settings?.personality || 'professional'} tone
- Keep responses concise and relevant
- If discussing experience or skills, reference specific examples from the CV when possible
- Respect privacy and don't make assumptions beyond what's explicitly stated`;

    return fullPrompt;
  }
  
  /**
   * Generate response using OpenAI
    */
  private async generateResponse(
    userMessage: string,
    systemPrompt: string,
    settings: UserRAGProfile['settings']
  ): Promise<{ content: string; tokens: number }> {
    const completion = await this.getOpenAI().chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: settings?.temperature || 0.7,
      max_tokens: settings?.maxTokens || 500,
      top_p: 0.9,
      frequency_penalty: 0.5,
      presence_penalty: 0.5
    });
    
    const response = completion.choices?.[0]?.message;
    const tokens = completion.usage?.total_tokens || 0;
    
    return {
      content: response?.content || 'I apologize, but I was unable to generate a response.',
      tokens
    };
  }
  
  /**
  
  /**
   * Get default system prompt
    */
  private getDefaultSystemPrompt(): string {
    return `You are an AI assistant representing a professional's CV. You have access to their complete professional background, experience, skills, and achievements. Your role is to answer questions about their qualifications, experience, and professional background in a helpful and accurate manner.`;
  }
  
  /**
   * Generate initial greeting
    */
  private generateGreeting(): string {
    const greetings = [
      "Hello! I'm here to answer any questions you might have about this professional's background and experience.",
      "Welcome! Feel free to ask me anything about the qualifications and experience detailed in this CV.",
      "Hi there! I can help you learn more about this professional's skills, experience, and achievements. What would you like to know?",
      "Hello! I'm an AI assistant with access to this CV. I'm here to answer your questions about their professional background."
    ];
    
    return greetings[Math.floor(Math.random() * greetings.length)] || "Hello! I'm here to help you learn about this professional's background.";
  }
  
  /**
   * Validate chat message
    */
  validateMessage(message: string): { valid: boolean; error?: string } {
    if (!message || message.trim().length === 0) {
      return { valid: false, error: 'Message cannot be empty' };
    }
    
    if (message.length > 1000) {
      return { valid: false, error: 'Message is too long (max 1000 characters)' };
    }
    
    // Check for potential prompt injection attempts
    const suspiciousPatterns = [
      /ignore previous instructions/i,
      /system:/i,
      /\\n\\nsystem:/i,
      /forget everything/i
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(message)) {
        return { valid: false, error: 'Invalid message format' };
      }
    }
    
    return { valid: true };
  }
  
  /**
   * Get suggested questions based on CV content
    */
  async getSuggestedQuestions(vectorNamespace: string, _jobId: string): Promise<string[]> {
    // Query for diverse chunks to understand CV content
    const chunks = await embeddingService.querySimilarChunks(
      'experience skills projects achievements',
      vectorNamespace,
      10
    );
    
    const suggestions: string[] = [];
    
    // Analyze chunks to generate relevant questions
    const hasExperience = chunks.some(c => c.metadata?.section === 'experience');
    const hasProjects = chunks.some(c => c.metadata?.section === 'projects');
    const hasSkills = chunks.some(c => c.metadata?.section === 'skills');
    const hasEducation = chunks.some(c => c.metadata?.section === 'education');
    
    if (hasExperience) {
      suggestions.push('What is your most recent work experience?');
      suggestions.push('Can you describe your key achievements in your previous roles?');
    }
    
    if (hasProjects) {
      suggestions.push('What are some notable projects you have worked on?');
    }
    
    if (hasSkills) {
      suggestions.push('What are your main technical skills?');
      suggestions.push('What programming languages are you proficient in?');
    }
    
    if (hasEducation) {
      suggestions.push('What is your educational background?');
    }
    
    // Always include these general questions
    suggestions.push('What type of role are you looking for?');
    suggestions.push('What makes you a good fit for our team?');
    
    // Return random 5 questions
    return suggestions
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);
  }
}

export const chatService = new ChatService();