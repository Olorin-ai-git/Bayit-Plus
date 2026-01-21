# RAG Chat System Setup Guide

This guide will help you set up the complete RAG-based chat system for Gil Klainert's portfolio website.

## Overview

The chat system consists of two parts:
1. **Backend API** (Node.js/Express) - Handles RAG processing and Claude integration
2. **Frontend React App** - The chat interface

## Prerequisites

- Node.js 18+ and npm
- Anthropic API key (you already have this)
- Two terminal windows (one for backend, one for frontend)

## Quick Start

### Step 1: Backend Setup

1. Open a terminal and navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. The `.env` file is already configured with your Anthropic API key.

4. Initialize the CV data (first time only):
```bash
npm run init-cv
```

5. Start the backend server:
```bash
npm run dev
```

The backend will start on `http://localhost:3001`

### Step 2: Frontend Setup

1. Open a new terminal in the root project directory:
```bash
cd /Users/gklainert/Documents/Klainert/klainert-web-portal
```

2. Create a `.env` file for the frontend (if not exists):
```bash
cat > .env << EOF
# Chat Backend API
REACT_APP_API_URL=http://localhost:3001/api/chat
EOF
```

3. Start the frontend:
```bash
npm start
```

The frontend will start on `http://localhost:3000`

### Step 3: Test the Chat

1. Navigate to `http://localhost:3000/chat`
2. You should see the AI assistant interface
3. Try asking questions like:
   - "Tell me about your experience at Intuit"
   - "What fraud prevention systems have you built?"
   - "What are your main technical skills?"
   - "Tell me about your GenAI expertise"

## How the RAG System Works

1. **User asks a question** → Frontend sends to backend API
2. **Backend processes query**:
   - Converts question to vector embedding
   - Searches vector database for relevant CV chunks
   - Retrieves top 5 most relevant pieces of information
3. **Context building**:
   - Combines relevant CV chunks into context
   - Includes section headers and relevance scores
4. **Claude generates response**:
   - Uses retrieved context to answer accurately
   - Speaks in first person as Gil
   - Provides specific details from the CV
5. **Response sent back** → Displayed in chat interface

## Features

### Intelligent Responses
- Answers are based on Gil's actual CV data
- Context-aware responses using RAG
- First-person perspective ("I" instead of "Gil")

### Session Management
- Conversation history is maintained
- Each session has a unique ID
- Sessions auto-expire after 24 hours

### Fallback Support
- If backend is offline, frontend provides basic responses
- Ensures chat always works for visitors

### Voice Support (Frontend)
- Voice input using Web Speech API
- Text-to-speech for responses
- Works best in Chrome/Edge

## Customization

### Update CV Information

To update Gil's information:

1. Edit `server/src/utils/cv-parser.ts`
2. Re-run the initialization:
```bash
cd server
npm run init-cv
```
3. Restart the backend server

### Adjust Response Style

Edit `server/src/services/rag.service.ts`:
- Modify the `systemPrompt` for different tones
- Adjust `temperature` for creativity (0.0-1.0)
- Change `maxTokens` for response length

### Change Retrieval Settings

Edit `server/src/config/config.ts`:
```javascript
retrieval: {
  topK: 5,                    // Number of chunks to retrieve
  similarityThreshold: 0.7,   // Minimum relevance score
}
```

## Troubleshooting

### "Failed to create session"
- Ensure backend is running on port 3001
- Check CORS settings in backend

### "No relevant information found"
- Run `npm run init-cv` in server directory
- Check if vector database exists in `server/data/vectordb/`

### Slow responses
- First query may be slower (embedding generation)
- Subsequent queries should be faster

### CORS errors
- Update `ALLOWED_ORIGINS` in `server/.env`
- Restart backend server

## Production Deployment

For production deployment:

1. **Backend**:
   - Build: `npm run build`
   - Start: `npm start`
   - Use PM2 or similar for process management
   - Set `NODE_ENV=production`

2. **Frontend**:
   - Build: `npm run build`
   - Deploy `build/` folder to hosting service
   - Update `REACT_APP_API_URL` to production backend URL

3. **Security**:
   - Use HTTPS for both frontend and backend
   - Implement proper rate limiting
   - Keep API keys secure

## Architecture Details

### Backend Components
- **Vector Database**: Local file-based storage
- **Embeddings**: Simple hash-based vectors (can be upgraded)
- **RAG Pipeline**: Retrieval → Context Building → Generation
- **Claude Integration**: Using Anthropic SDK

### Data Flow
```
User Question → Embedding → Vector Search → Context Building → Claude API → Response
```

### CV Data Structure
- Personal Information
- Work Experience (Intuit, Microsoft, Intel)
- Education (MBA, B.Sc.)
- Skills (by category)
- Achievements
- Publications (including blog posts and books)

## Next Steps

1. **Test thoroughly** with various questions
2. **Monitor performance** and adjust retrieval settings
3. **Collect feedback** to improve responses
4. **Consider upgrading** embeddings to a proper model
5. **Add analytics** to track popular questions

## Support

If you encounter any issues:
1. Check the server logs for errors
2. Verify API key is correct
3. Ensure all dependencies are installed
4. Try the fallback responses to isolate issues

The system is designed to be robust and provide a great experience for visitors wanting to learn about Gil's background and expertise!