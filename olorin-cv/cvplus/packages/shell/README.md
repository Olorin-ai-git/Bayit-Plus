# CVPlus Shell Application

The CVPlus Shell is the main orchestrator application that coordinates and hosts components from all CVPlus submodules. It provides the unified user interface, routing, authentication context, and shared layout for the entire CVPlus platform.

## Architecture

The Shell follows the CVPlus distributed architecture where each feature area is implemented as a self-contained submodule:

- **Authentication**: `@cvplus/auth` - User authentication and authorization
- **CV Processing**: `@cvplus/cv-processing` - CV upload, analysis, and enhancement
- **Multimedia**: `@cvplus/multimedia` - Podcast and video generation
- **Public Profiles**: `@cvplus/public-profiles` - Shareable professional profiles
- **Analytics**: `@cvplus/analytics` - Engagement metrics and insights
- **Core**: `@cvplus/core` - Shared types, utilities, and constants

## Key Features

### T061 - Layout Component
- Consistent layout structure across all pages
- Responsive design with mobile support
- Header, navigation, main content area, and footer
- Integration points for submodule components

### T062 - Navigation Component
- Main navigation between feature areas
- User context display (subscription tier, profile info)
- Authentication-aware navigation
- Clean routing to submodule pages

### T075 - Firebase Configuration
- Centralized Firebase service initialization
- Environment-based configuration
- Emulator support for development
- Shared across all submodules

## Development

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Type checking
npm run type-check
```

### Environment Variables

Create a `.env.local` file:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
VITE_USE_FIREBASE_EMULATORS=true # for development
```

## Submodule Integration

The Shell imports components from submodules using path aliases:

```typescript
import { AuthProvider } from '@cvplus/auth';
import { CVUpload } from '@cvplus/cv-processing';
import { MultimediaPlayer } from '@cvplus/multimedia';
```

Each submodule exports its frontend components through a standardized `src/frontend/index.ts` file.

## Routing Structure

- `/` - Home dashboard
- `/cv-processing/*` - CV processing features
- `/multimedia/*` - Multimedia generation and playback
- `/profiles/*` - Public profile management
- `/analytics/*` - Analytics and insights

## Component Migration

Components are migrated from the monolithic frontend to appropriate submodules:

- `T060 AuthContext` → `packages/auth/src/frontend/contexts/`
- `T063-T067 CV components` → `packages/cv-processing/src/frontend/components/`
- `T068 MultimediaPlayer` → `packages/multimedia/src/frontend/components/`
- `T069 PublicProfileCreator` → `packages/public-profiles/src/frontend/components/`
- `T070 AnalyticsDashboard` → `packages/analytics/src/frontend/components/`

## Build & Deploy

The Shell application is built as a standard React application and can be deployed to any static hosting service. It coordinates with Firebase Functions deployed from the various backend submodules.

## Contributing

When adding new features:

1. Determine which submodule the feature belongs to
2. Implement backend functions in that submodule's `src/backend/` directory
3. Implement frontend components in that submodule's `src/frontend/` directory
4. Export components through the submodule's frontend index file
5. Import and use in the Shell application's appropriate page component

This maintains clean separation of concerns while providing a unified user experience.