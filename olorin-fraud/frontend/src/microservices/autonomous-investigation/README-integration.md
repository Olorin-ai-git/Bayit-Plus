# Autonomous Investigation Microservice

**Version**: 1.0.0
**Author**: Gil Klainert
**Status**: Phase 6 Integration Complete

## Overview

The Autonomous Investigation Microservice is a fully integrated component of the Olorin frontend microservices architecture. It provides AI-powered fraud investigation capabilities with four distinct UI concepts: Power Grid, Command Center, Evidence Trail, and Network Explorer.

## Phase 6 Integration Features

### ✅ Event Bus Integration (T041)
- **Cross-service Communication**: Real-time event-driven communication with other microservices
- **Event Types Supported**:
  - `investigation.concept.switched` - UI concept changes
  - `investigation.graph.node.selected` - Graph node interactions
  - `investigation.data.updated` - Investigation data changes
  - `agent.progress.updated` - AI agent status updates
- **Zod Schema Validation**: All events validated with type-safe schemas
- **Error Handling**: Comprehensive error handling with dead letter queues

### ✅ Authentication & Authorization Integration (T042)
- **JWT Token Management**: Automatic token refresh and validation
- **Role-Based Access Control**:
  - Admin: Full access to all features
  - Investigator: Create, manage, and investigate cases
  - Analyst: Read-only analysis capabilities
  - Viewer: Limited read-only access
- **Concept-Level Permissions**: Fine-grained access to UI concepts
- **Secure WebSocket Authentication**: Authenticated real-time connections

### ✅ Monitoring & Analytics Integration (T043)
- **Performance Metrics**: Automatic collection of performance data
- **User Interaction Analytics**: Track concept usage, graph interactions
- **Investigation Analytics**: Track lifecycle events and outcomes
- **Agent Monitoring**: Monitor AI agent execution and performance
- **Real-time Dashboards**: Integration with monitoring microservice

### ✅ Deployment Configuration (T044)
- **Module Federation**: Webpack 5 configuration for runtime composition
- **Environment Management**: Comprehensive environment variable handling
- **Docker Configuration**: Multi-stage optimized builds
- **Nginx Setup**: Production-ready reverse proxy configuration
- **Health Checks**: Built-in service health monitoring

## Architecture

### Integration Services

```typescript
// Event Bus Integration
import { autonomousInvestigationEventBus } from './services/eventBusIntegration';

// Authentication Integration
import { autonomousInvestigationAuth } from './services/authIntegration';

// Monitoring Integration
import { autonomousInvestigationMonitoring } from './services/monitoringIntegration';

// Unified Integration Manager
import { integrationManager } from './services/integrationManager';
```

### Service Dependencies

- **Event Bus**: `mitt` for in-memory events, Redis for persistence
- **Authentication**: JWT with automatic refresh, localStorage persistence
- **Monitoring**: Performance Observer API, custom metrics collection
- **Module Federation**: Webpack 5 runtime module loading

## Development

### Prerequisites

- Node.js 18+
- npm 8+
- Docker (for deployment)

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Type checking
npm run typecheck

# Lint code
npm run lint
```

### Environment Variables

```bash
# API Configuration
REACT_APP_API_BASE_URL=http://localhost:8090
REACT_APP_WEBSOCKET_URL=ws://localhost:8090/ws

# Authentication
REACT_APP_AUTH_TOKEN_REFRESH_THRESHOLD=300000

# Monitoring
REACT_APP_MONITORING_ENABLED=true
REACT_APP_MONITORING_ENDPOINT=http://localhost:8091/metrics

# Feature Flags
REACT_APP_FEATURE_POWER_GRID_CONCEPT=true
REACT_APP_FEATURE_COMMAND_CENTER_CONCEPT=true
REACT_APP_FEATURE_EVIDENCE_TRAIL_CONCEPT=true
REACT_APP_FEATURE_NETWORK_EXPLORER_CONCEPT=true

# Module Federation URLs
REACT_APP_MF_SHELL_URL=http://localhost:3000/remoteEntry.js
REACT_APP_MF_CORE_UI_URL=http://localhost:3006/remoteEntry.js
REACT_APP_MF_INVESTIGATION_URL=http://localhost:3001/remoteEntry.js
REACT_APP_MF_AGENT_ANALYTICS_URL=http://localhost:3002/remoteEntry.js
REACT_APP_MF_VISUALIZATION_URL=http://localhost:3004/remoteEntry.js
REACT_APP_MF_REPORTING_URL=http://localhost:3005/remoteEntry.js
```

### Integration Manager Usage

```typescript
import { integrationManager } from './services/integrationManager';

// Initialize all integration services
await integrationManager.initialize({
  userId: 'current-user-id',
  investigationId: 'investigation-123',
  enableMonitoring: true,
  enableEventBus: true,
});

// Track investigation events
integrationManager.trackInvestigationAction('started', 'investigation-123');

// Track concept usage
integrationManager.trackConceptUsage('power-grid', 'command-center', {
  viewDurationMs: 30000,
  interactionCount: 15,
  nodesSelected: 5,
});

// Monitor integration health
const status = integrationManager.getStatus();
console.log('Integration health:', status.overall);
```

## Deployment

### Docker Build

```bash
# Build production image
docker build -t olorin/autonomous-investigation:latest .

# Run container
docker run -p 3007:80 \
  -e REACT_APP_API_BASE_URL=https://api.olorin.com \
  -e REACT_APP_MONITORING_ENDPOINT=https://metrics.olorin.com \
  olorin/autonomous-investigation:latest
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: autonomous-investigation
spec:
  replicas: 3
  selector:
    matchLabels:
      app: autonomous-investigation
  template:
    metadata:
      labels:
        app: autonomous-investigation
    spec:
      containers:
      - name: autonomous-investigation
        image: olorin/autonomous-investigation:latest
        ports:
        - containerPort: 80
        env:
        - name: REACT_APP_API_BASE_URL
          value: "https://api.olorin.com"
        - name: REACT_APP_MONITORING_ENABLED
          value: "true"
        healthCheck:
          httpGet:
            path: /autonomous-investigation/health
            port: 80
          initialDelaySeconds: 10
          periodSeconds: 30
```

## Integration Testing

### Event Bus Testing

```typescript
import { autonomousInvestigationEventBus } from './services/eventBusIntegration';

// Test event emission
autonomousInvestigationEventBus.emitInvestigationConceptSwitched(
  'power-grid',
  'command-center',
  30000,
  15
);

// Test event handling
const unsubscribe = autonomousInvestigationEventBus.registerHandlers({
  onInvestigationStarted: (data) => console.log('Investigation started:', data),
  onEvidenceFound: (data) => console.log('Evidence found:', data),
});
```

### Authentication Testing

```typescript
import { autonomousInvestigationAuth } from './services/authIntegration';

// Test authentication
const isAuthenticated = autonomousInvestigationAuth.isAuthenticated();
const hasPermission = autonomousInvestigationAuth.hasPermission('investigation:create');
const canAccess = autonomousInvestigationAuth.hasConceptAccess('power-grid');
```

### Monitoring Testing

```typescript
import { autonomousInvestigationMonitoring } from './services/monitoringIntegration';

// Test monitoring
autonomousInvestigationMonitoring.trackConceptUsage('evidence-trail');
autonomousInvestigationMonitoring.trackGraphInteraction(
  'inv-123',
  'click',
  250,
  'evidence'
);

const summary = autonomousInvestigationMonitoring.getAnalyticsSummary();
```

## Security Considerations

### Authentication Security
- JWT tokens auto-refresh before expiration
- Secure token storage in localStorage with validation
- Permission-based UI component rendering
- WebSocket authentication with token validation

### Event Bus Security
- Event payload validation with Zod schemas
- Source verification for inter-service events
- Rate limiting on event emission
- Dead letter queue for failed events

### Data Security
- No sensitive data in monitoring metrics
- Encrypted API communication
- CSP headers for XSS protection
- CORS configuration for Module Federation

## Performance Optimizations

### Bundle Optimization
- Module Federation for code sharing
- Tree shaking for unused code elimination
- Dynamic imports for route-based code splitting
- Webpack optimization for production builds

### Runtime Performance
- React.memo for component optimization
- useMemo/useCallback for expensive operations
- Virtual scrolling for large datasets
- Debounced event handlers for user interactions

### Monitoring Performance
- Batched metrics collection (10 items or 30 seconds)
- Lightweight performance observers
- Efficient memory usage tracking
- Configurable monitoring levels

## Troubleshooting

### Common Issues

**Integration Services Not Initializing**
```
Solution: Check environment variables and network connectivity
Debug: Enable DEBUG_MODE=true for detailed logging
```

**Event Bus Connection Errors**
```
Solution: Verify WebSocket URL and authentication
Debug: Check browser console for connection errors
```

**Module Federation Loading Failures**
```
Solution: Verify remote service URLs are accessible
Debug: Check network tab for failed remote entry loads
```

**Authentication Token Expiry**
```
Solution: Implement proper token refresh handling
Debug: Check token expiration time and refresh threshold
```

### Debug Mode

Enable comprehensive debugging:

```bash
REACT_APP_DEBUG_MODE=true
REACT_APP_LOG_LEVEL=debug
REACT_APP_EVENT_BUS_DEBUG=true
```

## Contributing

### Code Standards
- TypeScript strict mode enabled
- ESLint configuration enforced
- Prettier formatting required
- Jest unit tests with 70% coverage threshold

### File Structure
- Keep all files under 200 lines
- Use proper TypeScript interfaces
- Implement comprehensive error handling
- Include JSDoc comments for public APIs

### Testing Requirements
- Unit tests for all services
- Integration tests for event bus
- E2E tests for critical user flows
- Performance tests for monitoring

## License

MIT License - See LICENSE file for details.

---

**Status**: ✅ Phase 6 Integration Complete
**Next Phase**: Production deployment and monitoring setup