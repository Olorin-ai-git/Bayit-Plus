# Bayit+ (בית+)

Hebrew streaming platform for Israeli expats in the USA.

## Features

- **VOD** - Israeli movies and TV series
- **Live TV** - Israeli news channels with EPG
- **Radio** - Israeli radio stations
- **Podcasts** - Hebrew podcasts
- **AI Assistant** - Claude-powered content discovery (Hebrew)

## Tech Stack

- **Frontend**: React + Vite + TailwindCSS (RTL support)
- **Backend**: Python FastAPI
- **Database**: MongoDB Atlas
- **AI**: Claude API (Anthropic)
- **Payments**: Stripe
- **Hosting**: Google Cloud Run

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- MongoDB (local or Atlas)
- Docker (optional)

### 1. Clone and Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd bayit-plus

# Copy environment files
cp backend/.env.example backend/.env
cp web/.env.example web/.env
```

### 2. Configure Environment

Edit `backend/.env`:
```env
MONGODB_URL=mongodb://localhost:27017  # or your Atlas URL
MONGODB_DB_NAME=bayit_plus
SECRET_KEY=your-secret-key-here
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_test_...
```

Edit `web/.env`:
```env
VITE_API_URL=http://localhost:8000/api/v1
```

### 3. Run with Docker (Recommended)

```bash
docker-compose up
```

This starts:
- MongoDB on port 27017
- Backend API on port 8000
- Frontend on port 3000

### 4. Or Run Manually

**Backend (Quick Start):**
```bash
# Using convenience script (recommended)
./run-backend.sh

# Or from backend directory
cd backend
./run-local.sh
```

**Backend (Manual setup):**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd web
npm install
npm run dev
```

### 5. Seed Sample Data

```bash
cd backend
python -m scripts.seed_data
```

This creates:
- Sample content (movies, series)
- Live TV channels with EPG
- Radio stations
- Podcasts with episodes
- Test user: `test@example.com` / `password123`

## Project Structure

```
bayit-plus/
├── web/                  # React frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Route pages
│   │   ├── stores/       # State management
│   │   └── services/     # API client
│   └── package.json
│
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── api/routes/   # API endpoints
│   │   ├── models/       # MongoDB models
│   │   ├── services/     # Business logic
│   │   └── core/         # Config, security
│   ├── scripts/          # Seed scripts
│   └── requirements.txt
│
└── docker-compose.yml
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/auth/register` | Register new user |
| `POST /api/v1/auth/login` | Login |
| `GET /api/v1/content/featured` | Homepage content |
| `GET /api/v1/live/channels` | Live TV channels |
| `GET /api/v1/radio/stations` | Radio stations |
| `GET /api/v1/podcasts` | Podcast directory |
| `POST /api/v1/chat` | AI chatbot |
| `POST /api/v1/subscriptions/checkout` | Stripe checkout |

## Subscription Tiers

| Plan | Price | Features |
|------|-------|----------|
| Basic | $9.99/mo | VOD, Radio, Podcasts |
| Premium | $14.99/mo | + Live TV, AI Assistant |
| Family | $19.99/mo | + 4 streams, 4K, Downloads |

## Development

### Running Tests
```bash
cd backend
pytest
```

### API Documentation
When running locally: http://localhost:8000/docs

## Deployment

### Google Cloud Run

1. Build and push Docker images
2. Deploy backend and frontend to Cloud Run
3. Configure environment variables
4. Set up MongoDB Atlas
5. Configure Stripe webhooks

## License

Proprietary - All Rights Reserved
