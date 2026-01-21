# Gil Klainert Portfolio - RAG Chat Backend

This is the backend server for the RAG-based chat system that powers the AI assistant on Gil Klainert's portfolio website.

## Features

- **RAG (Retrieval-Augmented Generation)**: Uses vector search to find relevant CV content before generating responses
- **Claude Integration**: Powered by Anthropic's Claude API for intelligent responses
- **Local Vector Database**: Simple file-based vector storage (no external dependencies)
- **Session Management**: Maintains conversation history for context-aware responses
- **CORS Support**: Configured for frontend integration

## Prerequisites

- Node.js 18+ and npm
- Anthropic API key

## Setup

1. Install dependencies:
```bash
cd server
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Add your Anthropic API key to `.env`:
```
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

## Running the Server

### Development mode:
```bash
npm run dev
```

### Initialize CV data (first time):
```bash
npm run init-cv
```

### Production mode:
```bash
npm run build
npm start
```

## API Endpoints

- `POST /api/chat/sessions` - Create a new chat session
- `POST /api/chat/messages` - Send a message and get AI response
- `GET /api/chat/sessions/:sessionId/history` - Get chat history
- `GET /api/chat/suggestions` - Get suggested questions
- `DELETE /api/chat/sessions/:sessionId` - Clear a session
- `GET /health` - Health check endpoint

## How It Works

1. **CV Data Processing**: The system parses Gil's CV data and creates semantic chunks
2. **Embeddings**: Each chunk is converted to a vector representation for similarity search
3. **Query Processing**: When a user asks a question:
   - The question is embedded into a vector
   - Similar CV chunks are retrieved from the vector database
   - Context is built from the most relevant chunks
4. **Response Generation**: Claude uses the retrieved context to generate accurate, personalized responses

## Configuration

Key configuration options in `src/config/config.ts`:
- `retrieval.topK`: Number of relevant chunks to retrieve (default: 5)
- `retrieval.similarityThreshold`: Minimum similarity score (default: 0.7)
- `claude.temperature`: Response creativity (default: 0.7)
- `claude.maxTokens`: Maximum response length (default: 1000)

## Data Privacy

- All CV data is stored locally in the vector database
- No data is sent to external services except the Anthropic API
- Sessions are automatically cleaned up after 24 hours

## Troubleshooting

### "Failed to initialize vector database"
- Ensure the `data/vectordb` directory has write permissions
- Run `npm run init-cv` to populate the database

### "Missing required environment variables"
- Check that your `.env` file contains `ANTHROPIC_API_KEY`

### CORS errors
- Update `ALLOWED_ORIGINS` in `.env` to include your frontend URL

## Development

### Project Structure
```
server/
├── src/
│   ├── api/          # API routes
│   ├── services/     # Business logic
│   ├── utils/        # Utilities
│   ├── config/       # Configuration
│   └── types/        # TypeScript types
├── data/
│   └── vectordb/     # Local vector database
└── dist/             # Compiled JavaScript
```

### Adding New CV Content

To update Gil's CV information:
1. Edit `src/utils/cv-parser.ts`
2. Run `npm run init-cv` to re-index the data
3. Restart the server

## License

This project is part of Gil Klainert's portfolio and is not intended for redistribution.