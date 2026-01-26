# Station-AI 🎙️🤖

**Next-generation AI-powered radio station management**. Harness the power of artificial intelligence to automate your entire broadcasting workflow. Station-AI is a professional management platform for Hebrew-speaking radio stations in the Miami/Boca Raton/Florida Keys area, featuring autonomous AI orchestration, intelligent scheduling, and 24/7 automated operation.

## 🚀 AI-Powered Features

### Intelligent Automation
- **🤖 AI Orchestrator**: Anthropic Claude-powered agent makes real-time broadcasting decisions
- **🎯 Smart Scheduling**: Autonomous content selection based on time, audience, and flow patterns
- **🔄 Adaptive Flows**: Create automated broadcasting sequences with AI-driven content selection
- **📊 Intelligent Librarian**: AI agent automatically audits and fixes content metadata issues

### Professional Broadcasting
- **📚 Content Management**: Organize songs, shows, commercials, jingles, and newsflashes
- **📅 Campaign Scheduler**: Advanced commercial campaign management with grid-based scheduling
- **🎙️ Voice Synthesis**: ElevenLabs TTS integration for automated announcements
- **📞 Notification System**: Multi-channel alerts via Email, Push notifications, and SMS

### Modern User Experience
- **🌐 Dual Language**: Full Hebrew (RTL) and English support with `@olorin/shared-i18n`
- **💬 AI Chat Interface**: Natural language control - chat with your station in Hebrew or English
- **🎨 Glassmorphism UI**: Modern dark-mode interface with purple wizard theme (#9333ea)
- **🔐 Role-Based Access**: Firebase Auth with admin, editor, and viewer roles

### Cloud Integration
- **☁️ Google Cloud Storage**: Reliable GCS-backed audio streaming
- **📧 Gmail Integration**: Auto-import audio attachments directly into your library
- **🔄 Real-time Sync**: WebSocket-powered live updates across all clients
- **📦 Automatic Backups**: Weekly scheduled backups to GCS with 30-day retention

### Operating Modes
- **🚀 Full Automation**: 24/7 autonomous operation - AI makes all decisions
- **👤 Prompt Mode**: Human-in-the-loop - user confirmation for important actions

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Vite + React + TypeScript + Tailwind CSS |
| Backend | Python 3.11+ / FastAPI |
| Database | MongoDB |
| AI Agent | Claude API (Anthropic) |
| Audio Playback | python-vlc |
| Storage | Google Drive API |
| Email | Gmail API |
| Notifications | Twilio (SMS), Web Push |

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- MongoDB
- VLC Media Player (for audio playback)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd station-ai
   ```

2. **Set up the backend**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # or `venv\Scripts\activate` on Windows
   pip install -r requirements.txt
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Set up the frontend**
   ```bash
   cd frontend
   npm install
   ```

4. **Start MongoDB**
   ```bash
   # Using Docker
   docker-compose up -d mongodb

   # Or install locally and run
   mongod
   ```

5. **Run the application**

   Backend:
   ```bash
   cd backend
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

   Frontend:
   ```bash
   cd frontend
   npm run dev
   ```

6. **Access the dashboard**
   Open http://localhost:5173 in your browser

## Configuration

### Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

- `ANTHROPIC_API_KEY`: Your Claude API key
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: Google OAuth credentials
- `GOOGLE_DRIVE_ROOT_FOLDER_ID`: Root folder for radio content
- `TWILIO_*`: SMS notification credentials
- `MONGODB_URI`: MongoDB connection string

### Google Drive Setup

1. Create a Google Cloud project
2. Enable Drive API and Gmail API
3. Create OAuth 2.0 credentials
4. Download `credentials.json` to the backend folder

### Folder Structure in Google Drive

```
Radio Content/
├── Songs/
│   ├── Pop/
│   ├── Rock/
│   ├── Mizrahi/
│   └── ... (other genres)
├── Shows/
│   └── ... (show folders)
└── Commercials/
    ├── Active/
    └── Archive/
```

## Usage

### AI Agent Modes

**Full Automation Mode**
- The agent makes all decisions automatically
- No human intervention required
- Ideal for 24/7 operation

**Prompt Mode**
- Certain actions require user confirmation
- Notifications sent via Push/SMS
- Configurable timeout with default actions

### Chat Interface

Use the expandable chat sidebar to communicate with the AI agent in natural language. Supports both Hebrew and English.

## Adding Your Logo

Replace the placeholder logo at:
- `frontend/public/logo.svg`

## Development

### Project Structure

```
station-ai/
├── backend/          # Python FastAPI backend
│   ├── app/
│   │   ├── agent/    # AI orchestrator
│   │   ├── models/   # Pydantic models
│   │   ├── routers/  # API endpoints
│   │   ├── services/ # Business logic
│   │   └── utils/    # Utilities
│   └── requirements.txt
├── frontend/         # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── i18n/     # Translations
│   │   └── services/
│   └── package.json
├── docs/             # Documentation
└── docker-compose.yml
```

## License

Private - All rights reserved

## Support

For support, contact the development team.
