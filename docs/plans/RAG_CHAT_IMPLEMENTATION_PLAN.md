# RAG-Based Personal Chat Implementation Plan

## Overview
Implement a Retrieval-Augmented Generation (RAG) chat system that allows users to interact with an AI assistant that has deep knowledge about Gil Klainert's professional background, skills, and experience based on CV content.

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   React Chat    │────▶│  Backend API     │────▶│  Claude API     │
│   Interface     │     │  (Node/Express)  │     │  (Anthropic)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │                           │
                               ▼                           │
                        ┌──────────────────┐              │
                        │  Vector Database  │◀─────────────┘
                        │   (Pinecone/     │
                        │    Chroma/etc)    │
                        └──────────────────┘
```

## Phase 1: Backend Infrastructure

### 1.1 Technology Stack
- **Backend Framework**: Node.js with Express/Fastify
- **Vector Database Options**:
  - **Pinecone**: Cloud-based, easy to use, good for production
  - **Chroma**: Open-source, can be self-hosted
  - **Weaviate**: Open-source with good JavaScript support
  - **Qdrant**: High-performance, self-hostable
- **Embeddings**: OpenAI text-embedding-ada-002 or Claude embeddings
- **LLM**: Claude API (using your API key)
- **Database**: PostgreSQL/MongoDB for chat history and metadata

### 1.2 Project Structure
```
klainert-web-portal/
├── server/                    # New backend directory
│   ├── src/
│   │   ├── api/
│   │   │   ├── chat.routes.ts
│   │   │   └── embeddings.routes.ts
│   │   ├── services/
│   │   │   ├── claude.service.ts
│   │   │   ├── embeddings.service.ts
│   │   │   ├── vectordb.service.ts
│   │   │   └── rag.service.ts
│   │   ├── utils/
│   │   │   ├── cv-parser.ts
│   │   │   └── text-splitter.ts
│   │   ├── config/
│   │   │   └── database.config.ts
│   │   └── index.ts
│   ├── data/
│   │   └── cv-content/        # Processed CV data
│   └── package.json
```

## Phase 2: Data Preparation & Embedding

### 2.1 CV Content Extraction
```typescript
// Extract structured data from CV
interface CVData {
  personalInfo: {
    name: string;
    title: string;
    location: string;
    email: string;
    linkedin: string;
  };
  summary: string;
  experience: WorkExperience[];
  education: Education[];
  skills: {
    category: string;
    items: string[];
  }[];
  achievements: string[];
  publications: Publication[];
}
```

### 2.2 Text Chunking Strategy
- Chunk CV content into semantic segments:
  - Each job experience as a chunk
  - Skills grouped by category
  - Education entries
  - Project descriptions
  - Blog post summaries
- Chunk size: 500-1000 tokens with 100-token overlap
- Include metadata: section type, date range, relevance score

### 2.3 Embedding Pipeline
```typescript
// Embedding service example
class EmbeddingService {
  async embedText(text: string): Promise<number[]> {
    // Use OpenAI or custom embeddings
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
    });
    return response.data[0].embedding;
  }

  async embedCVChunks(chunks: CVChunk[]): Promise<void> {
    for (const chunk of chunks) {
      const embedding = await this.embedText(chunk.text);
      await vectorDB.upsert({
        id: chunk.id,
        values: embedding,
        metadata: chunk.metadata
      });
    }
  }
}
```

## Phase 3: RAG Implementation

### 3.1 Retrieval Strategy
```typescript
interface RAGConfig {
  topK: number;              // Number of relevant chunks to retrieve
  similarityThreshold: 0.7;  // Minimum similarity score
  hybridSearch: boolean;     // Combine vector + keyword search
  reranking: boolean;        // Use cross-encoder for reranking
}
```

### 3.2 Context Building
```typescript
class RAGService {
  async buildContext(query: string): Promise<string> {
    // 1. Get query embedding
    const queryEmbedding = await embeddingService.embedText(query);
    
    // 2. Search vector database
    const relevantChunks = await vectorDB.search({
      vector: queryEmbedding,
      topK: 5,
      includeMetadata: true
    });
    
    // 3. Build context from chunks
    const context = relevantChunks
      .map(chunk => chunk.text)
      .join('\n\n');
    
    return context;
  }
}
```

### 3.3 Prompt Engineering
```typescript
const buildPrompt = (context: string, query: string): string => {
  return `You are an AI assistant representing Gil Klainert. Use the following information about Gil to answer questions accurately and in first person when appropriate.

Context from Gil's CV and background:
${context}

User Question: ${query}

Instructions:
- Answer based on the provided context
- Speak in first person when discussing Gil's experiences
- If information isn't in the context, politely indicate that
- Be professional but conversational
- Highlight relevant skills and experiences when appropriate

Response:`;
};
```

## Phase 4: Claude API Integration

### 4.1 API Service
```typescript
class ClaudeService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });
  }

  async generateResponse(prompt: string): Promise<string> {
    const message = await this.anthropic.messages.create({
      model: "claude-3-opus-20240229",
      max_tokens: 1000,
      temperature: 0.7,
      messages: [{
        role: "user",
        content: prompt
      }]
    });

    return message.content[0].text;
  }
}
```

### 4.2 Conversation Management
```typescript
interface ChatSession {
  id: string;
  userId: string;
  messages: Message[];
  context: string[];
  createdAt: Date;
}

class ChatService {
  async processMessage(
    sessionId: string, 
    message: string
  ): Promise<string> {
    // 1. Get relevant context
    const context = await ragService.buildContext(message);
    
    // 2. Get conversation history
    const history = await this.getSessionHistory(sessionId);
    
    // 3. Build prompt with context + history
    const prompt = this.buildConversationalPrompt(
      context, 
      history, 
      message
    );
    
    // 4. Generate response
    const response = await claudeService.generateResponse(prompt);
    
    // 5. Store in history
    await this.saveMessage(sessionId, message, response);
    
    return response;
  }
}
```

## Phase 5: Frontend Integration

### 5.1 Update Chat Page Component
```typescript
// src/pages/ChatPage.tsx
interface ChatPageProps {}

const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const sendMessage = async (text: string) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: text,
          sessionId: getSessionId() 
        })
      });
      
      const data = await response.json();
      setMessages(prev => [...prev, 
        { role: 'user', content: text },
        { role: 'assistant', content: data.response }
      ]);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <ChatInterface 
      messages={messages}
      onSendMessage={sendMessage}
      isLoading={isLoading}
      suggestions={[
        "Tell me about your experience with AI and GenAI",
        "What projects have you led at Intuit?",
        "What are your main technical skills?",
        "Tell me about your leadership experience"
      ]}
    />
  );
};
```

### 5.2 API Routes
```typescript
// server/src/api/chat.routes.ts
router.post('/api/chat', async (req, res) => {
  const { message, sessionId } = req.body;
  
  try {
    const response = await chatService.processMessage(
      sessionId, 
      message
    );
    
    res.json({ response });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to process message' 
    });
  }
});

router.get('/api/chat/history/:sessionId', async (req, res) => {
  const history = await chatService.getSessionHistory(
    req.params.sessionId
  );
  res.json({ history });
});
```

## Phase 6: Advanced Features

### 6.1 Conversation Memory
- Implement conversation summarization
- Store key facts extracted from conversations
- Update user preferences and context

### 6.2 Multi-modal Support
- Handle resume/CV file uploads
- Process and embed PDF content
- Support image-based questions about projects

### 6.3 Analytics & Monitoring
- Track query types and frequencies
- Monitor response quality
- Log retrieval accuracy
- User satisfaction metrics

## Phase 7: Security & Performance

### 7.1 Security Measures
```typescript
// Rate limiting
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// API key validation
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || !isValidApiKey(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
};

// Input sanitization
const sanitizeInput = (text: string): string => {
  return text.trim().slice(0, 1000); // Max 1000 chars
};
```

### 7.2 Performance Optimization
- Cache frequent queries
- Implement response streaming
- Use connection pooling for vector DB
- Optimize embedding batch processing

## Implementation Timeline

### Week 1-2: Backend Setup
- Set up Node.js server
- Configure vector database
- Implement CV parsing and chunking
- Create embedding pipeline

### Week 3-4: RAG Implementation
- Build retrieval system
- Implement context building
- Integrate Claude API
- Create chat service

### Week 5: Frontend Integration
- Update Chat UI components
- Implement API integration
- Add loading states and error handling
- Create conversation history

### Week 6: Testing & Optimization
- End-to-end testing
- Performance optimization
- Security hardening
- Documentation

## Environment Variables
```env
# Backend
PORT=3001
NODE_ENV=production

# APIs
CLAUDE_API_KEY=your_claude_api_key
OPENAI_API_KEY=your_openai_api_key

# Vector Database
VECTOR_DB_URL=your_vector_db_url
VECTOR_DB_API_KEY=your_vector_db_key

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/chat_db

# Security
JWT_SECRET=your_jwt_secret
API_RATE_LIMIT=100
```

## Testing Strategy

### Unit Tests
- Embedding service
- Text chunking logic
- Context building
- API endpoints

### Integration Tests
- Vector database operations
- Claude API integration
- End-to-end chat flow

### Performance Tests
- Response time under load
- Concurrent user handling
- Vector search performance

## Deployment Considerations

### Option 1: Vercel/Netlify + Serverless
- Frontend on Vercel/Netlify
- Backend API on Vercel Functions
- Vector DB on Pinecone Cloud
- Good for getting started quickly

### Option 2: Traditional VPS
- Full control over infrastructure
- Self-hosted vector database
- Better for cost optimization
- Requires more setup

### Option 3: Container-based
- Docker containers for all services
- Kubernetes for orchestration
- Scalable and maintainable
- Best for production

## Success Metrics
- Response accuracy: >90% relevant answers
- Response time: <2 seconds
- User satisfaction: >4.5/5 rating
- System uptime: >99.9%
- Cost per query: <$0.05

## Next Steps
1. Choose vector database solution
2. Set up development environment
3. Begin implementing Phase 1
4. Create sample CV chunks for testing
5. Prototype basic RAG flow