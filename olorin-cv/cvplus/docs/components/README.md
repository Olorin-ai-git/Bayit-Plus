# Portal Chat Interface

A comprehensive RAG-based AI chat component for CVPlus portals that provides intelligent, context-aware responses about CV content using vector embeddings and retrieval-augmented generation.

## Features

### Core Functionality
- **RAG-based AI responses** using vector embeddings from CV content
- **Real-time chat** with typing indicators and message status
- **Chat history persistence** across sessions
- **Context-aware responses** with source document references
- **Message reactions and feedback** system
- **Rate limiting** and usage tracking

### Advanced Features
- **Voice input support** with speech-to-text
- **Text-to-speech** for AI responses
- **Message search and filtering**
- **Conversation export** (JSON, TXT, PDF)
- **Multi-language support**
- **Mobile-responsive design** with touch-friendly interactions
- **Accessibility compliance** (WCAG 2.1 AA)
- **Real-time conversation analytics**

### UI/UX Features
- **Professional conversation templates**
- **Suggested questions** based on CV content
- **Smooth animations** with Framer Motion
- **Customizable themes** and styling
- **Fullscreen mode** support
- **Error boundaries** and graceful error handling

## Installation

```bash
npm install framer-motion lucide-react react-hot-toast
```

## Basic Usage

```tsx
import { PortalChatInterface } from '@/components/features/Portal';
import type { PortalConfig, ChatConfig } from '@/types/portal-types';

const MyComponent = () => {
  const portalConfig: PortalConfig = {
    id: 'my-portal-123',
    name: 'John Doe - Senior Developer',
    visibility: 'public',
    theme: {
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF',
      backgroundColor: '#FFFFFF',
      textColor: '#111827',
      fontFamily: 'Inter',
      layout: 'modern',
      animations: true,
      darkMode: false
    },
    features: {
      aiChat: true,
      qrCode: true,
      contactForm: true,
      calendar: true,
      portfolio: true,
      socialLinks: true,
      testimonials: true,
      analytics: true
    },
    metadata: {
      title: 'John Doe - Senior Developer',
      description: 'Interactive AI-powered CV with chat assistant',
      keywords: ['developer', 'react', 'typescript']
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const chatConfig: ChatConfig = {
    enableRAG: true,
    model: {
      modelName: 'claude-3-sonnet-20240229',
      parameters: {
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        frequencyPenalty: 0,
        presencePenalty: 0
      },
      systemPrompt: 'You are an AI assistant helping visitors learn about this professional.',
      contextWindowSize: 4096
    },
    vectorSearch: {
      topK: 5,
      threshold: 0.7,
      algorithm: 'cosine',
      hybridSearch: true
    },
    behavior: {
      welcomeMessage: 'Hi! I can answer questions about this CV. What would you like to know?',
      suggestedQuestions: [
        'What are the key skills?',
        'Tell me about the work experience',
        'What achievements are highlighted?'
      ],
      showTyping: true,
      messageTimeout: 30000,
      autoScroll: true,
      enableReactions: true
    },
    rateLimiting: {
      messagesPerMinute: 10,
      messagesPerHour: 100,
      enabled: true,
      rateLimitMessage: 'Rate limit exceeded. Please wait.'
    }
  };

  return (
    <PortalChatInterface
      portalConfig={portalConfig}
      chatConfig={chatConfig}
      jobId="your-job-id"
      profileId="your-profile-id"
      onMessageSent={(message) => console.log('Sent:', message)}
      onMessageReceived={(message) => console.log('Received:', message)}
      onError={(error) => console.error('Error:', error)}
    />
  );
};
```

## Advanced Configuration

### Enhanced Features

```tsx
<PortalChatInterface
  portalConfig={portalConfig}
  chatConfig={chatConfig}
  jobId="job-123"
  profileId="profile-123"
  
  // Enhanced features
  features={{
    typingIndicators: true,
    reactions: true,
    timestamps: true,
    search: true,
    export: true,
    voiceInput: true,
    fileUploads: false,
    maxFileSize: 5, // MB
    allowedFileTypes: ['pdf', 'doc', 'docx']
  }}
  
  // RAG configuration
  ragConfig={{
    enabled: true,
    showSources: true,
    maxSources: 5,
    similarityThreshold: 0.7,
    contextPrompt: 'Based on the CV content:'
  }}
  
  // UI customization
  uiCustomization={{
    position: 'embedded', // 'bottom-right' | 'bottom-left' | 'embedded' | 'fullscreen'
    size: 'large', // 'small' | 'medium' | 'large' | 'custom'
    theme: 'light', // 'light' | 'dark' | 'auto' | 'custom'
    colors: {
      primary: '#3B82F6',
      secondary: '#1E40AF',
      background: '#FFFFFF',
      text: '#111827',
      userMessage: '#3B82F6',
      botMessage: '#F3F4F6',
      border: '#E5E7EB'
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '14px',
      lineHeight: '1.5'
    }
  }}
  
  // Rate limiting
  rateLimiting={{
    enabled: true,
    messagesPerMinute: 10,
    warningMessage: 'Please slow down',
    blockedMessage: 'Rate limit exceeded'
  }}
  
  // Event handlers
  onMessageSent={(message) => {
    console.log('Message sent:', message);
    // Track analytics
  }}
  onMessageReceived={(message) => {
    console.log('Message received:', message);
    // Process response
  }}
  onChatOpen={() => {
    console.log('Chat opened');
    // Track engagement
  }}
  onChatClose={() => {
    console.log('Chat closed');
    // Save session
  }}
  onError={(error) => {
    console.error('Chat error:', error);
    // Error reporting
  }}
  onReactionAdd={(messageId, reaction) => {
    console.log('Reaction added:', messageId, reaction);
    // Track feedback
  }}
/>
```

### Custom Message Renderer

```tsx
const customMessageRenderer = ({ message, isUser, showTimestamp, onReaction }) => (
  <div className={`custom-message ${isUser ? 'user' : 'bot'}`}>
    <div className="message-content">{message.content}</div>
    {showTimestamp && (
      <div className="timestamp">{message.timestamp.toLocaleTimeString()}</div>
    )}
    {!isUser && (
      <div className="reactions">
        <button onClick={() => onReaction('👍')}>👍</button>
        <button onClick={() => onReaction('👎')}>👎</button>
      </div>
    )}
  </div>
);

<PortalChatInterface
  // ... other props
  advanced={{
    messageRenderer: customMessageRenderer,
    inputComponent: CustomInputComponent,
    welcomeComponent: CustomWelcomeComponent,
    errorHandler: (error) => <CustomErrorDisplay error={error} />,
    loadingIndicator: <CustomLoadingSpinner />
  }}
/>
```

## Firebase Functions Integration

The component automatically integrates with these Firebase Functions:

- `startChatSession` - Initialize a new chat session
- `sendChatMessage` - Send messages and get AI responses
- `addMessageReaction` - Add reactions to messages
- `endChatSession` - End session and collect feedback
- `exportChatToPDF` - Export conversations to PDF

### Function Payloads

```typescript
// Start Chat Session
const sessionPayload = {
  portalId: string,
  ragConfig: {
    enabled: boolean,
    maxSources: number,
    similarityThreshold: number
  }
};

// Send Message
const messagePayload = {
  sessionId: string,
  message: string,
  options: {
    enableRAG: boolean,
    maxSources: number,
    similarityThreshold: number,
    includeSourceDocuments: boolean
  }
};

// Add Reaction
const reactionPayload = {
  sessionId: string,
  messageId: string,
  reaction: string
};
```

## Types and Interfaces

### Core Types

```typescript
interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant' | 'system';
  timestamp: Date;
  type: 'text' | 'image' | 'file' | 'system';
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
  metadata?: ChatMessageMetadata;
  sourceDocuments?: RAGSourceDocument[];
}

interface RAGSourceDocument {
  id: string;
  content: string;
  section: string;
  score: number;
  metadata: Record<string, any>;
}

interface ChatError {
  code: string;
  message: string;
  chatOperation: 'send_message' | 'load_history' | 'vector_search' | 'model_inference';
  messageId?: string;
  component?: string;
  timestamp: Date;
}
```

### Configuration Types

```typescript
interface PortalConfig {
  id: string;
  name: string;
  description?: string;
  visibility: 'public' | 'private' | 'unlisted';
  customDomain?: string;
  theme: PortalTheme;
  features: PortalFeatures;
  metadata: PortalMetadata;
  createdAt: Date;
  updatedAt: Date;
}

interface ChatConfig {
  enableRAG: boolean;
  model: ChatModelConfig;
  vectorSearch: VectorSearchConfig;
  behavior: ChatBehaviorConfig;
  rateLimiting: ChatRateLimitConfig;
}
```

## Styling and Theming

### CSS Custom Properties

The component uses CSS custom properties for theming:

```css
.portal-chat-interface {
  --chat-primary-color: #3B82F6;
  --chat-secondary-color: #1E40AF;
  --chat-background-color: #FFFFFF;
  --chat-text-color: #111827;
  --chat-border-color: #E5E7EB;
  --chat-user-message-color: #3B82F6;
  --chat-bot-message-color: #F3F4F6;
  --chat-font-family: 'Inter', system-ui, sans-serif;
  --chat-font-size: 14px;
  --chat-line-height: 1.5;
  --chat-border-radius: 12px;
  --chat-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
```

### Tailwind CSS Classes

Key CSS classes used:

- `.portal-chat-interface` - Root container
- `.chat-message-bubble` - Individual message styling
- `.chat-input-area` - Input section
- `.chat-header` - Header section
- `.typing-indicator` - Typing animation
- `.suggested-questions` - Question suggestions
- `.source-documents` - RAG source display

## Accessibility

### WCAG 2.1 AA Compliance

- ✅ **Keyboard Navigation**: Full keyboard support for all interactions
- ✅ **Screen Reader Support**: Proper ARIA labels and announcements
- ✅ **Color Contrast**: Minimum 4.5:1 contrast ratio
- ✅ **Focus Management**: Visible focus indicators and logical tab order
- ✅ **Alternative Text**: Descriptive labels for all interactive elements
- ✅ **Skip Links**: Skip to main content and message input

### ARIA Implementation

```tsx
// Example ARIA attributes used
<div
  role="main"
  aria-label="Chat conversation"
  aria-live="polite"
  aria-atomic="false"
>
  <div
    role="log"
    aria-label="Message history"
    aria-describedby="chat-instructions"
  >
    {/* Messages */}
  </div>
  
  <form
    role="form"
    aria-label="Send message"
  >
    <textarea
      aria-label="Type your message"
      aria-describedby="character-count"
      aria-invalid={!inputState.isValid}
    />
  </form>
</div>
```

## Performance Optimization

### Code Splitting

```tsx
// Lazy load the component
const PortalChatInterface = lazy(() => 
  import('@/components/features/Portal/PortalChatInterface')
);

// Use with Suspense
<Suspense fallback={<ChatLoadingSkeleton />}>
  <PortalChatInterface {...props} />
</Suspense>
```

### Memoization

The component uses React.memo and useMemo for performance:

```tsx
// Message list is memoized
const messageList = useMemo(() => 
  messages.map(message => (
    <MessageBubble key={message.id} message={message} />
  )), 
  [messages]
);

// Expensive computations are memoized
const suggestedQuestions = useMemo(() => {
  if (messages.length > 0) return [];
  return generateSuggestedQuestions(cvData);
}, [messages.length, cvData]);
```

### Virtual Scrolling

For large chat histories, implement virtual scrolling:

```tsx
import { FixedSizeList as List } from 'react-window';

const VirtualizedMessageList = ({ messages }) => (
  <List
    height={400}
    itemCount={messages.length}
    itemSize={80}
    itemData={messages}
  >
    {({ index, style, data }) => (
      <div style={style}>
        <MessageBubble message={data[index]} />
      </div>
    )}
  </List>
);
```

## Testing

### Unit Tests

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PortalChatInterface } from './PortalChatInterface';

describe('PortalChatInterface', () => {
  const mockProps = {
    portalConfig: mockPortalConfig,
    chatConfig: mockChatConfig,
    jobId: 'test-job',
    profileId: 'test-profile'
  };

  it('renders chat interface', () => {
    render(<PortalChatInterface {...mockProps} />);
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByLabelText('Type your message')).toBeInTheDocument();
  });

  it('sends messages', async () => {
    const onMessageSent = jest.fn();
    render(
      <PortalChatInterface 
        {...mockProps} 
        onMessageSent={onMessageSent}
      />
    );
    
    const input = screen.getByLabelText('Type your message');
    const sendButton = screen.getByRole('button', { name: 'Send message' });
    
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(onMessageSent).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'Hello' })
      );
    });
  });

  it('displays suggested questions', () => {
    render(<PortalChatInterface {...mockProps} />);
    expect(screen.getByText('What are the key skills?')).toBeInTheDocument();
  });

  it('handles voice input', async () => {
    const mockRecognition = {
      start: jest.fn(),
      stop: jest.fn(),
      addEventListener: jest.fn()
    };
    
    global.SpeechRecognition = jest.fn(() => mockRecognition);
    
    render(
      <PortalChatInterface 
        {...mockProps} 
        features={{ voiceInput: true }}
      />
    );
    
    const voiceButton = screen.getByTitle('Start voice input');
    fireEvent.click(voiceButton);
    
    expect(mockRecognition.start).toHaveBeenCalled();
  });
});
```

### Integration Tests

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { FirebaseProvider } from '@/contexts/FirebaseProvider';

describe('PortalChatInterface Integration', () => {
  it('integrates with Firebase Functions', async () => {
    const mockCallFunction = jest.fn().mockResolvedValue({
      sessionId: 'test-session',
      suggestedQuestions: ['Question 1']
    });
    
    jest.mock('@/hooks/useFeatureData', () => ({
      useFirebaseFunction: () => ({
        callFunction: mockCallFunction,
        loading: false,
        error: null
      })
    }));
    
    render(
      <FirebaseProvider>
        <PortalChatInterface {...mockProps} />
      </FirebaseProvider>
    );
    
    await waitFor(() => {
      expect(mockCallFunction).toHaveBeenCalledWith(
        'startChatSession',
        expect.objectContaining({ portalId: mockProps.portalConfig.id })
      );
    });
  });
});
```

## Error Handling

### Error Boundaries

The component includes comprehensive error handling:

```tsx
const ChatErrorBoundary = ({ children, onError }) => {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const handleError = (error, errorInfo) => {
      setHasError(true);
      setError(error);
      onError?.(error);
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [onError]);
  
  if (hasError) {
    return (
      <div className="chat-error-state">
        <h3>Something went wrong</h3>
        <p>{error?.message}</p>
        <button onClick={() => setHasError(false)}>Try Again</button>
      </div>
    );
  }
  
  return children;
};
```

### Error Recovery

```tsx
// Automatic retry logic
const sendMessageWithRetry = async (message, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await callFunction('sendChatMessage', { message });
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      // Exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }
};
```

## Migration Guide

### From Basic ChatInterface

If you're migrating from the basic ChatInterface component:

```tsx
// Old ChatInterface
<ChatInterface
  sessionId={sessionId}
  onSendMessage={handleSendMessage}
  suggestedQuestions={questions}
/>

// New PortalChatInterface
<PortalChatInterface
  portalConfig={portalConfig}
  chatConfig={{
    enableRAG: true,
    behavior: {
      suggestedQuestions: questions
    }
  }}
  jobId={jobId}
  profileId={profileId}
  onMessageSent={handleMessageSent}
  onMessageReceived={handleMessageReceived}
/>
```

### Configuration Mapping

| Old Prop | New Prop Path | Notes |
|----------|---------------|-------|
| `sessionId` | Handled automatically | Session management is internal |
| `suggestedQuestions` | `chatConfig.behavior.suggestedQuestions` | Enhanced with RAG-based suggestions |
| `onSendMessage` | `onMessageSent` | Renamed for clarity |
| `onStartSession` | `onChatOpen` | Triggered automatically |
| `onEndSession` | `onChatClose` | Enhanced with feedback collection |

## Contributing

### Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd cvplus/frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test

# Type checking
npm run type-check

# Linting
npm run lint
```

### Code Style

- Use TypeScript for all new code
- Follow the existing component patterns
- Add JSDoc comments for all public interfaces
- Write comprehensive tests for new features
- Use semantic commit messages

### Pull Request Process

1. Create a feature branch from `main`
2. Implement your changes with tests
3. Update documentation if needed
4. Ensure all tests pass
5. Submit a pull request with detailed description

## License

This component is part of the CVPlus project and is subject to the project's license terms.

## Support

For questions or issues:

1. Check the existing documentation
2. Search existing GitHub issues
3. Create a new issue with detailed reproduction steps
4. Contact the development team

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Author**: Gil Klainert
