# Bayit+ Project Configuration

**Project Type:** Multi-platform Streaming Application
**Version:** 1.0.0
**Last Updated:** 2026-01-12

---

## Project Context

**Bayit+** is a Jewish streaming platform delivering VOD, Live TV, Radio, and Podcasts across Web, Mobile, and TV platforms.

### Tech Stack

**Backend:**
- Python 3.13 with FastAPI
- MongoDB with Beanie ODM
- Poetry for dependency management
- Pydantic for validation and API schemas
- Google Cloud Run for deployment

**Frontend:**
- React Native Web (cross-platform codebase)
- React Native (iOS/Android)
- React Native TV (optimized for TV platforms)
- Shared monorepo with @bayit/shared packages

**Shared Packages:**
- `@bayit/shared/theme` - Glass UI design system
- `@bayit/shared/ui` - Reusable Glass components
- `@bayit/shared/utils` - Shared utilities (contentLocalization, etc.)
- `@bayit/shared/i18n` - Localization resources

### Languages Supported
- **Hebrew** (primary) - he
- **English** - en
- **Spanish** - es

---

## Project-Specific Rules

### 1. UI/UX Standards

**MANDATORY: Glass UI Design System**
- All UI components MUST use the Glass components library (`@bayit/glass`)
- Glassmorphism aesthetic with backdrop blur effects
- Dark mode by default
- All styling via Tailwind CSS only (no custom CSS files)

**Forbidden:**
- React Native Paper, Native Base, Material UI, or any other UI library
- Custom StyleSheet.create() for UI components
- Inline styles (except dynamic values)

**Example:**
```typescript
import { GlassCard, GlassButton } from '@bayit/glass'

<GlassCard className="p-6 bg-black/20 backdrop-blur-xl">
  <GlassButton variant="primary">Action</GlassButton>
</GlassCard>
```

### 2. Backend Development

**MANDATORY: Poetry Only**
- All Python dependencies via Poetry (`poetry add`, `poetry install`)
- NEVER use pip directly except to install Poetry itself
- All dependencies in `pyproject.toml`
- Commit `poetry.lock` to version control

**FastAPI Patterns:**
- Use dependency injection for all services
- Pydantic models for all API request/response schemas
- Beanie ODM for MongoDB operations
- Permission decorators for authorization (`has_permission()`)

**Database:**
- MongoDB with Beanie ODM
- All content localized with `_en` and `_es` fields
- Use `getLocalizedName()` utility for display

### 3. Localization Requirements

**ALL content MUST support 3 languages:**

**Database Schema:**
```python
# Base Hebrew fields (required)
title: str
description: str
category: str

# English translations
title_en: Optional[str]
description_en: Optional[str]
category_en: Optional[str]

# Spanish translations
title_es: Optional[str]
description_es: Optional[str]
category_es: Optional[str]
```

**Frontend Display:**
```typescript
import { getLocalizedName } from '@bayit/shared-utils/contentLocalization'
import { useTranslation } from 'react-i18next'

const { i18n } = useTranslation()
const localizedTitle = getLocalizedName(item, i18n.language)
```

**API Responses:**
- Backend MUST return ALL localized fields (title, title_en, title_es, etc.)
- Frontend selects appropriate field based on current language
- NEVER filter localized fields on backend

### 4. Authentication & Authorization

**JWT-based Authentication:**
- Tokens stored in secure storage
- Refresh token rotation
- Admin endpoints require specific permissions

**Role-Based Permissions:**
```python
Permission.CONTENT_READ
Permission.CONTENT_CREATE
Permission.CONTENT_UPDATE
Permission.CONTENT_DELETE
Permission.ADMIN_ACCESS
```

**Backend Usage:**
```python
@router.get("/content")
async def get_content(
    current_user: User = Depends(has_permission(Permission.CONTENT_READ))
):
    # Implementation
```

### 5. Content Management

**Content Types:**
- **VOD (Content)** - Movies, series, documentaries
- **LiveChannel** - Live TV streams
- **RadioStation** - Audio-only streams
- **Podcast** - Podcast shows
- **PodcastEpisode** - Individual episodes

**Metadata Requirements:**
- All content MUST have: title, thumbnail, category_id
- Movies/Series SHOULD have: tmdb_id, imdb_rating, cast, director
- All content MUST have localized descriptions
- Podcasts MUST have: RSS feed, cover image

**Categorization:**
- Use existing Category collection
- Link via category_id (ObjectId reference)
- Maintain localized category names

---

## Active Features

### 1. VOD Streaming
- DRM support for protected content
- TMDB integration for metadata
- Multi-language subtitles
- Trailer support

### 2. Live TV
- HLS stream support
- EPG (Electronic Program Guide)
- Multi-bitrate streaming
- DVR/catch-up (future)

### 3. Radio Stations
- Audio-only streaming
- Continuous playback
- Station metadata

### 4. Podcasts
- RSS feed synchronization
- Episode management
- Playback progress tracking
- Download for offline (mobile)

### 5. Admin Dashboard
- Content management (CRUD operations)
- User management
- Analytics dashboard
- Librarian AI Agent monitoring

### 6. Librarian AI Agent
- Autonomous content auditing
- Classification verification with Claude AI
- Stream health monitoring
- Auto-fix with rollback capability
- Daily/weekly scheduled audits

---

## Critical Files

### Backend
- `backend/app/main.py` - FastAPI application entry point
- `backend/app/core/config.py` - Configuration with Pydantic Settings
- `backend/app/core/database.py` - MongoDB connection and model registration
- `backend/app/models/` - Beanie ODM models
  - `content.py` - Content, LiveChannel, Podcast, etc.
  - `user.py` - User and authentication
  - `admin.py` - Admin permissions and audit logs
  - `librarian.py` - Librarian agent models
- `backend/app/api/routes/` - API endpoints
  - `admin_*.py` - Admin-only endpoints
  - `content.py` - Public content API
  - `auth.py` - Authentication endpoints
  - `librarian.py` - Librarian agent API
- `backend/app/services/` - Business logic
  - `librarian_service.py` - Librarian orchestrator
  - `ai_agent_service.py` - Autonomous AI agent with tools
  - `content_auditor.py` - Classification verification
  - `auto_fixer.py` - Safe issue resolution

### Shared
- `shared/theme/` - Glass UI theme configuration
- `shared/ui/` - Reusable Glass components
- `shared/utils/contentLocalization.ts` - `getLocalizedName()` utility
- `shared/i18n/locales/` - Translation files (he.json, en.json, es.json)

### Web
- `web/src/pages/` - Page components
  - `admin/` - Admin dashboard pages
  - `VODPage.tsx`, `LiveTVPage.tsx`, etc.
- `web/src/components/` - Reusable components
  - `admin/` - Admin-specific components
  - `Glass*.tsx` - Glass UI components
- `web/src/services/` - API client services
- `web/src/App.tsx` - App entry point with routing

### Mobile (Future)
- `mobile/` - React Native mobile app
- Shares `shared/` packages with web

---

## Development Workflows

### Starting the Backend

```bash
cd backend
poetry install
poetry run uvicorn app.main:app --reload
```

Backend runs at: `http://localhost:8000`

### Starting the Frontend

```bash
cd web
npm install
npm start
```

Web runs at: `http://localhost:3000`

### Running Tests

```bash
# Backend
cd backend
poetry run pytest

# Frontend
cd web
npm test
```

### Code Quality

```bash
# Backend
poetry run black .
poetry run isort .
poetry run mypy .

# Frontend
npm run lint
npm run format
```

---

## Librarian AI Agent Integration

The Librarian is a fully autonomous AI agent that maintains content quality.

**Audit Types:**
- `daily_incremental` - Check recent changes + 10% sample
- `weekly_full` - Check all content
- `manual` - On-demand full audit

**Capabilities:**
- Content classification verification
- Metadata completeness checks
- Stream health validation
- Database integrity checks
- Auto-fix safe issues

**API Endpoints:**
```bash
POST /api/v1/admin/librarian/run-audit
GET /api/v1/admin/librarian/status
GET /api/v1/admin/librarian/reports
POST /api/v1/admin/librarian/actions/{action_id}/rollback
```

**Custom Agent:**
See `.claude/agents/librarian-agent.md` for detailed prompts and tool usage.

---

## Testing Requirements

### Backend
- Minimum 87% test coverage
- Integration tests preferred (use real MongoDB with test containers)
- Pytest fixtures for dependency injection
- Test all API endpoints
- Test Librarian agent workflows

### Frontend
- Component tests with React Testing Library
- E2E tests with Playwright (critical flows)
- Test localization switching
- Test Glass UI components

---

## Deployment

### Backend (Google Cloud Run)
```bash
gcloud run deploy bayit-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

### Frontend (Netlify/Vercel)
```bash
npm run build
# Deploy dist/ folder
```

### Environment Variables

**Backend `.env`:**
```bash
MONGODB_URL=mongodb+srv://...
MONGODB_DB_NAME=bayit_plus
JWT_SECRET_KEY=...
ANTHROPIC_API_KEY=... # For Librarian
TMDB_API_KEY=...
SENDGRID_API_KEY=... # For email notifications
```

**Frontend `.env`:**
```bash
REACT_APP_API_URL=https://api.bayitplus.com
```

---

## Common Pitfalls

### ❌ Don't:
- Use inline styles instead of Tailwind
- Use non-Glass UI components
- Use pip instead of Poetry
- Hardcode values (use config)
- Create mocks/stubs in production code
- Duplicate code across files
- Filter localized fields on backend
- Mix UI libraries
- Ignore TypeScript errors

### ✅ Do:
- Use Glass components for all UI
- Use Tailwind classes for styling
- Use Poetry for Python dependencies
- Use environment variables for config
- Use existing utilities (getLocalizedName, etc.)
- Return all localized fields from API
- Test with multiple languages
- Follow FastAPI dependency injection patterns
- Use Beanie ODM for MongoDB

---

## Version History

- **1.0.0** (2026-01-12) - Initial project configuration
  - Defined tech stack and architecture
  - Established Glass UI and localization standards
  - Documented Librarian AI Agent integration
  - Created custom agent definitions

---

**Status:** ✅ Active Development
**Maintainer:** Bayit+ Development Team
