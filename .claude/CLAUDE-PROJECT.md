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

### MANDATORY: Frontend Development Requirements

**ALL frontend development across ALL platforms (Web, Mobile, TV) MUST adhere to these requirements:**

#### 1. Shared-First Development

**ALWAYS use `/shared` resources FIRST. Only create additional components if absolutely necessary.**

```
Priority Order:
1. shared/components/      → Reusable Glass UI components
2. shared/ui/              → Glass design system components
3. shared/theme/           → Theme configuration and tokens
4. shared/assets/          → Images, icons, fonts
5. shared/utils/           → Utility functions
6. shared/services/        → API and service abstractions
7. shared/i18n/            → Localization resources
8. shared/hooks/           → Reusable React hooks

ONLY THEN → Create platform-specific components if shared cannot fulfill the need
```

**Forbidden:**
- Creating new components that duplicate `/shared` functionality
- Creating platform-specific versions of existing shared components
- Copying shared component code instead of importing
- Ignoring shared assets and creating duplicates

**Example - Correct:**
```typescript
// Import from shared - ALWAYS FIRST
import { GlassCard, GlassButton } from '@bayit/shared/ui'
import { useLocalizedContent } from '@bayit/shared/hooks'
import { formatDate } from '@bayit/shared/utils'
```

**Example - Incorrect:**
```typescript
// ❌ WRONG - Creating local component when shared exists
import { MyLocalCard } from './components/MyLocalCard'

// ❌ WRONG - Duplicating shared utility
const formatDate = (date) => { ... }
```

#### 2. Glass Design System Compliance

**NO DEVIATION from Glass components and glassmorphic styling is permitted.**

**Mandatory Style Characteristics:**
- Dark mode backgrounds (`bg-black/20`, `bg-gray-900`)
- Backdrop blur effects (`backdrop-blur-xl`, `backdrop-blur-2xl`)
- Semi-transparent layers with proper opacity
- Glass component library for ALL UI elements
- Tailwind CSS ONLY for styling

**Forbidden:**
- Custom CSS files
- StyleSheet.create() for UI styling
- Non-Glass component libraries
- Light mode themes (unless specifically configured)
- Any styling that breaks glassmorphic consistency

**Design Tokens (from shared/theme):**
```typescript
// Use theme tokens - NEVER hardcode values
import { colors, spacing, blur } from '@bayit/shared/theme'
```

#### 3. Full Localization - Paved Road (MANDATORY)

**ALL text, content, and UI elements MUST use the localization paved road.**

**i18n Requirements:**
```typescript
// ALWAYS use translation hooks
import { useTranslation } from 'react-i18next'
import { getLocalizedName } from '@bayit/shared/utils/contentLocalization'

const { t, i18n } = useTranslation()

// Static text
<Text>{t('common.submit')}</Text>

// Dynamic content from database
const title = getLocalizedName(item, i18n.language)
```

**RTL/LTR Support (MANDATORY):**
```typescript
// Use RTL-aware utilities from shared
import { useDirection, DirectionProvider } from '@bayit/shared/i18n'

// Apply direction-aware classes
<View className={isRTL ? 'flex-row-reverse' : 'flex-row'}>

// Use Tailwind RTL utilities
<View className="ltr:ml-4 rtl:mr-4">
```

**Forbidden:**
- Hardcoded strings in UI
- Left/right directional assumptions without RTL consideration
- Skipping translation keys for "temporary" text
- Using margin-left/right without RTL alternatives

**Language Support:**
- Hebrew (he) - Primary, RTL
- English (en) - LTR
- Spanish (es) - LTR

#### 4. MANDATORY: Localization UI Auditor Approval

**Before declaring any UI change or addition ready for production, it MUST pass the `localization-ui-auditor` agent approval.**

This agent verifies:
- All user-facing text uses i18n translation keys (no hardcoded strings)
- RTL/LTR layout support is properly implemented
- All supported languages (he, en, es) have corresponding translations
- Direction-aware styling is applied (ltr:/rtl: Tailwind prefixes)
- Dynamic content uses `getLocalizedName()` utility
- No left/right assumptions without RTL consideration
- Hebrew translations are complete and accurate

**Workflow:**
1. Complete UI implementation
2. Invoke `localization-ui-auditor` agent via Task tool
3. Agent audits all changed/added UI components
4. Fix any issues identified by the auditor
5. Re-run auditor until approval is granted
6. **Only then** declare feature production-ready

**Refusal Requirement:** UI changes cannot be marked as complete or production-ready without explicit approval from the localization-ui-auditor agent.

#### 5. MANDATORY: Code Reviewer Agent Approval

**Before declaring ANY feature ready for production, it MUST pass the `code-reviewer` agent approval.**

This agent verifies:
- No mocks, stubs, TODOs, or placeholder code
- No hardcoded values (all config from environment/settings)
- No duplicate code or functionality
- Proper error handling (no silent failures)
- Security best practices (no vulnerabilities)
- Code follows Bayit+ patterns and conventions
- All imports resolve correctly (shared packages, Glass components)
- Type safety maintained (TypeScript strict mode)
- Tests exist and pass for new functionality
- Poetry dependencies properly declared (backend)
- Glass component library used correctly (frontend)

**Workflow:**
1. Complete feature implementation
2. Run all tests (`poetry run pytest` / `npm test`)
3. Run quality checks (`poetry run tox` / `npm run lint`)
4. Invoke `code-reviewer` agent via Task tool
5. Agent performs comprehensive code review
6. Fix any issues identified by the reviewer
7. Re-run reviewer until approval is granted
8. **Only then** declare feature production-ready

**Refusal Requirement:** No feature can be marked as complete or production-ready without explicit approval from the code-reviewer agent.

#### 6. MANDATORY: Backend Python Agent Approval (Server Tasks)

**Before declaring any backend/server feature ready for production, it MUST pass the `fastapi-expert` or `backend-architect` agent approval.**

This agent verifies:
- Poetry used for all dependency management (no pip)
- FastAPI dependency injection patterns followed
- Pydantic models for all API request/response schemas
- Beanie ODM used correctly for MongoDB operations
- Proper async/await patterns (no blocking calls)
- API endpoints follow RESTful conventions
- Permission decorators used (`has_permission()`)
- Error handling returns appropriate HTTP status codes
- All config from `app.core.config.settings`
- No secrets or credentials in code
- Proper logging with `logger` utility
- Type hints on all functions and methods
- Localized fields returned from API (title, title_en, title_es)

**Workflow:**
1. Complete backend implementation
2. Run tests (`poetry run pytest`) - minimum 87% coverage
3. Run quality checks (`poetry run tox`)
4. Verify server starts (`poetry run uvicorn app.main:app --reload`)
5. Invoke `fastapi-expert` or `backend-architect` agent via Task tool
6. Agent performs backend-specific code review
7. Fix any issues identified
8. Re-run agent until approval is granted
9. **Only then** declare backend feature production-ready

**Refusal Requirement:** No backend/server feature can be marked as complete or production-ready without explicit approval from the fastapi-expert or backend-architect agent.

#### 7. MANDATORY: Database Agent Approval (MongoDB/Atlas Changes)

**Before declaring any database-related change ready for production, it MUST pass the `database-architect` agent approval.**

This agent verifies:
- Beanie ODM models follow best practices
- MongoDB schema design optimized for query patterns
- Indexes exist for frequently queried fields (category_id, tmdb_id, etc.)
- No N+1 query patterns in Beanie operations
- Proper use of aggregation pipelines
- Localized fields structured correctly (_en, _es suffixes)
- MongoDB Atlas configuration appropriate
- Connection pooling configured in `app.core.database`
- No hardcoded connection strings (use `settings.mongodb_url`)
- Proper error handling for database operations
- Data validation in Pydantic/Beanie models
- References between collections handled correctly

**Applies to:**
- New Beanie Document models
- Schema modifications (adding/removing fields)
- Index creation (`class Settings: indexes = [...]`)
- Query optimization changes
- Aggregation pipeline changes
- MongoDB Atlas configuration
- Collection relationships

**Workflow:**
1. Complete database changes
2. Test with local MongoDB or Atlas dev cluster
3. Verify query performance
4. Invoke `database-architect` agent via Task tool
5. Agent reviews Beanie models, indexes, queries
6. Fix any issues identified
7. Re-run agent until approval is granted
8. **Only then** declare database changes production-ready

**Refusal Requirement:** No database-related change can be marked as complete or production-ready without explicit approval from the database-architect agent.

#### 8. MANDATORY: Voice Technician Agent Approval (Audio/Voice Changes)

**Before declaring any voice, audio, or sound-related change ready for production, it MUST pass the `voice-technician` agent approval.**

This agent verifies:
- TTS provider integration (ElevenLabs, OpenAI TTS, etc.)
- STT implementation for Hebrew, English, Spanish
- Real-time audio latency meets targets (<1500ms round-trip)
- Microphone permissions handled correctly:
  - **Web**: MediaDevices API, HTTPS required
  - **iOS**: expo-av, AVAudioSession configuration
  - **tvOS**: Siri Remote mic, focus-based controls
- Audio streams properly managed (no leaks)
- Picovoice wake word detection configured
- AI voice agent integration with chat system
- Audio quality standards (16kHz+ for speech)
- Echo cancellation and noise suppression
- Error handling for device unavailability
- Fallback when audio features unavailable

**Applies to:**
- Text-to-Speech (TTS) for content narration
- Speech-to-Text (STT) for voice search
- Microphone access and recording
- Voice-controlled navigation
- AI voice assistant features
- Wake word detection (Picovoice)
- Audio streaming for radio/podcasts
- Sound effects and notifications

**Workflow:**
1. Complete audio/voice implementation
2. Test on all platforms (Web, iOS, tvOS)
3. Verify latency and audio quality
4. Test permission flows
5. Invoke `voice-technician` agent via Task tool
6. Agent reviews implementation across platforms
7. Fix any issues identified
8. Re-run agent until approval is granted
9. **Only then** declare audio/voice feature production-ready

**Refusal Requirement:** No voice, audio, or sound-related change can be marked as complete or production-ready without explicit approval from the voice-technician agent.

---

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
