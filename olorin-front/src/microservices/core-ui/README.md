# Core UI Microservice

The Core UI microservice serves as the shell application for the Olorin investigation platform. It provides the main layout, navigation, authentication, and orchestrates the loading of other microservices through Module Federation.

## Overview

The Core UI acts as the entry point and orchestrator for all other microservices in the Olorin platform:

- **Shell Application**: Provides the main application shell and layout
- **Authentication**: Handles user authentication and authorization
- **Navigation**: Main navigation and routing between microservices
- **Module Federation Host**: Loads and manages remote microservices
- **Shared Services**: Provides common services like event bus and WebSocket connection

## Architecture

### Module Federation Setup

The Core UI is configured as a Module Federation host that consumes remote modules:

```javascript
// Exposed modules
exposes: {
  './App': './CoreUIApp.tsx',
  './Layout': './components/MainLayout.tsx',
  './Auth': './components/AuthProvider.tsx',
}

// Remote modules consumed
remotes: {
  'structured-investigation': 'structured_investigation@http://localhost:3001/remoteEntry.js',
  'manual-investigation': 'manual_investigation@http://localhost:3002/remoteEntry.js',
  'agent-analytics': 'agent_analytics@http://localhost:3003/remoteEntry.js',
  'rag-intelligence': 'rag_intelligence@http://localhost:3004/remoteEntry.js',
  'visualization': 'visualization@http://localhost:3005/remoteEntry.js',
  'reporting': 'reporting@http://localhost:3006/remoteEntry.js',
  'design-system': 'design_system@http://localhost:3007/remoteEntry.js',
}
```

### Key Components

#### CoreUIApp.tsx
Main application component that sets up:
- Router configuration with protected routes
- Lazy loading of microservices with error boundaries
- Context providers (Auth, EventBus, WebSocket)
- Dashboard with service navigation

#### MainLayout.tsx
Responsive layout component providing:
- Sidebar navigation with service links
- Top navigation bar with user controls
- Real-time status indicators
- Mobile-responsive design

#### AuthProvider.tsx
Authentication context provider managing:
- User authentication state
- JWT token management
- Login/logout functionality
- Automatic token refresh
- Backend availability detection

### Services

#### AuthService.ts
Handles all authentication operations:
- Login/logout API calls
- Token validation and refresh
- Profile management
- Smart backend detection (mock vs real)
- Automatic fallback to mock authentication in development

### Styling

The Core UI uses Tailwind CSS 3.3.0 with:
- Custom component classes for consistency
- Responsive design utilities
- Dark/light theme support (planned)
- Custom animations and transitions

## Development

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Type checking
npm run type-check

# Lint code
npm run lint
```

### Environment Variables

```env
REACT_APP_BACKEND_URL=http://localhost:8090
REACT_APP_WS_URL=ws://localhost:8090/ws
```

### Development Mode Features

- **Mock Authentication**: Automatically falls back to mock auth when backend is unavailable
- **Hot Module Replacement**: Live reload during development
- **Error Boundaries**: Graceful error handling with retry options
- **Development Tools**: Enhanced error reporting and debugging

## Integration with Other Microservices

### Service Communication

All microservices communicate through:

1. **Event Bus**: Shared event system using mitt
2. **WebSocket**: Real-time updates from backend
3. **Shared State**: Authentication and user context
4. **Module Federation**: Code sharing and lazy loading

### Service Registration

New microservices are registered in:

1. **webpack.config.js**: Add remote entry point
2. **CoreUIApp.tsx**: Add lazy loading and routing
3. **MainLayout.tsx**: Add navigation menu item

## Authentication Flow

1. **Initial Load**: Check for existing token in localStorage
2. **Token Validation**: Validate token with backend
3. **Backend Detection**: Auto-detect backend availability
4. **Mock Fallback**: Use mock authentication if backend unavailable
5. **Route Protection**: Redirect unauthenticated users to login
6. **Token Refresh**: Automatic token refresh before expiration

## Error Handling

### Error Boundaries
- **Global Error Boundary**: Catches and displays application errors
- **Service Error Boundaries**: Isolate microservice failures
- **Network Error Handling**: Graceful degradation for network issues

### Development vs Production
- **Development**: Detailed error information and stack traces
- **Production**: User-friendly error messages with retry options

## Performance Optimizations

- **Lazy Loading**: Microservices loaded on demand
- **Code Splitting**: Vendor and shared chunks optimization
- **Bundle Analysis**: Webpack bundle optimization
- **Caching**: Intelligent caching strategies
- **Tree Shaking**: Unused code elimination

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Route Protection**: Protected routes require authentication
- **CORS Configuration**: Proper cross-origin request handling
- **Token Management**: Secure token storage and refresh
- **Permission-Based Access**: Role-based access control

## Testing

### Test Structure
```
__tests__/
├── components/
│   ├── MainLayout.test.tsx
│   ├── AuthProvider.test.tsx
│   └── LoadingSpinner.test.tsx
├── services/
│   └── AuthService.test.ts
└── CoreUIApp.test.tsx
```

### Test Coverage
- Component rendering and interactions
- Authentication flows and error handling
- Service communication and error scenarios
- Route protection and navigation

## Deployment

### Production Build
```bash
npm run build
```

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Configuration
- **Development**: Hot reload, mock authentication
- **Staging**: Production build, real backend
- **Production**: Optimized build, monitoring, analytics

## Monitoring and Analytics

- **Error Tracking**: Integrated error reporting
- **Performance Monitoring**: Core Web Vitals tracking
- **User Analytics**: User interaction tracking
- **Service Health**: Microservice availability monitoring

## Related Documentation

- [Module Federation Guide](../../docs/module-federation.md)
- [Authentication System](../../docs/authentication.md)
- [Microservices Architecture](../../docs/microservices.md)
- [Development Workflow](../../docs/development.md)