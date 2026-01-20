# B2B Partner Portal

A production-ready B2B Partner Dashboard for Bayit-Plus API management.

## Overview

The Partner Portal provides B2B partners with a comprehensive dashboard to:

- Monitor API usage and analytics
- Manage subscription and billing
- Create and manage API keys
- Invite and manage team members
- Configure webhooks and settings
- Test APIs in the playground environment

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6
- **State Management**: Zustand with persistence
- **Styling**: Tailwind CSS (glassmorphism dark theme)
- **Charts**: Recharts
- **i18n**: react-i18next (Hebrew, English, Spanish)
- **Build**: Webpack 5
- **Validation**: Zod

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd partner-portal

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env
```

## Environment Configuration

Copy `.env.example` to `.env` and configure the required variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_B2B_API_BASE_URL` | Yes | Backend API base URL |
| `VITE_B2B_DOCS_URL` | Yes | Documentation URL |
| `VITE_B2B_REQUEST_TIMEOUT_MS` | Yes | Request timeout in milliseconds |
| `VITE_B2B_DEFAULT_LANGUAGE` | Yes | Default language (he, en, es) |
| `VITE_B2B_FEATURE_ENABLE_PLAYGROUND` | No | Enable API playground (default: true) |
| `VITE_B2B_FEATURE_ENABLE_BILLING` | No | Enable billing features (default: true) |
| `VITE_B2B_FEATURE_ENABLE_TEAM` | No | Enable team management (default: true) |
| `VITE_B2B_FEATURE_ENABLE_WEBHOOKS` | No | Enable webhooks (default: true) |

## Development

```bash
# Start development server
npm run dev

# The app will be available at http://localhost:3011
```

## Building for Production

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── common/          # Shared components (LoadingSpinner, etc.)
│   └── layout/          # Layout components (Sidebar, TopBar)
├── config/
│   └── env.ts           # Environment configuration with Zod validation
├── hooks/
│   └── useDirection.ts  # RTL/LTR direction hook
├── i18n/
│   ├── index.ts         # i18n initialization
│   └── locales/         # Translation files (en, he, es)
├── pages/               # Page components
├── services/
│   └── api.ts           # API client with auth interceptors
├── stores/              # Zustand state stores
├── styles/
│   └── index.css        # Tailwind CSS imports
├── types/
│   └── index.ts         # TypeScript type definitions
├── App.tsx              # Main app with routes
└── main.tsx             # Entry point
```

## Available Pages

| Route | Page | Description |
|-------|------|-------------|
| `/login` | LoginPage | User authentication |
| `/register` | RegisterPage | Organization registration |
| `/` | DashboardPage | Overview with KPIs and charts |
| `/usage` | UsagePage | Usage analytics with filters |
| `/billing` | BillingPage | Plans and invoices |
| `/api-keys` | ApiKeysPage | API key management |
| `/team` | TeamPage | Team member management |
| `/settings` | SettingsPage | Organization settings |
| `/playground` | PlaygroundPage | API testing environment |

## Internationalization (i18n)

The portal supports three languages with full RTL support:

- **Hebrew (he)** - RTL layout
- **English (en)** - LTR layout
- **Spanish (es)** - LTR layout

Language can be changed via the language selector in the sidebar.

## Authentication

The portal uses JWT-based authentication with automatic token refresh:

1. Login with email/password
2. Access token stored in Zustand with persistence
3. Automatic refresh on 401 responses
4. Protected routes redirect to login when unauthenticated

## API Integration

All API calls go through the B2B API client at `/api/v1/b2b`. The client includes:

- Authorization header injection
- Automatic token refresh on 401
- Request timeout handling
- Error normalization

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## License

Proprietary - Bayit-Plus
