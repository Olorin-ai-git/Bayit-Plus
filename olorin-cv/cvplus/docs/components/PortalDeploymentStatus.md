# PortalDeploymentStatus Component

A comprehensive React component for real-time HuggingFace Space deployment tracking with advanced status monitoring, progress visualization, and error recovery features.

## Features

### Core Functionality
- **Real-time Deployment Tracking**: Live updates of deployment status with configurable refresh intervals
- **Phase-based Progress**: Visual progress tracking through all deployment phases
- **Error Handling & Recovery**: Comprehensive error reporting with actionable recovery suggestions
- **Deployment History**: Historical view of previous deployments with status and duration
- **Interactive Controls**: Manual refresh, auto-refresh toggle, and deployment cancellation

### Visual Components
- **Progress Bar**: Animated progress bar with percentage indicators
- **Status Icons**: Phase-specific icons with loading animations
- **Deployment Logs**: Filterable, real-time log display with multiple levels
- **Time Estimates**: Elapsed time tracking and completion estimates
- **URL Display**: Copy-to-clipboard and direct access to deployed spaces

### Advanced Features
- **Firebase Integration**: Direct integration with Firebase Functions for deployment management
- **TypeScript Support**: Full TypeScript coverage with comprehensive type definitions
- **Accessibility**: WCAG 2.1 AA compliant with proper ARIA attributes
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Error Boundaries**: Comprehensive error handling and recovery

## Installation

```bash
npm install lucide-react react-hot-toast
```

## Basic Usage

```tsx
import React from 'react';
import { PortalDeploymentStatus } from './components/features/Portal';
import { DeploymentStatus, PortalConfig } from './types/portal-types';

const MyComponent: React.FC = () => {
  const deploymentStatus: DeploymentStatus = {
    phase: 'building',
    progress: 60,
    currentOperation: 'Building Space application',
    startedAt: new Date(Date.now() - 300000),
    logs: [
      {
        timestamp: new Date(),
        level: 'info',
        message: 'Starting deployment process'
      }
    ]
  };

  const portalConfig: PortalConfig = {
    id: 'my-portal',
    name: 'My Professional Portal',
    visibility: 'public',
    // ... other config
  };

  return (
    <PortalDeploymentStatus
      status={deploymentStatus}
      portalConfig={portalConfig}
      jobId="job-123"
      profileId="profile-456"
      onDeploymentComplete={(result) => {
        console.log('Deployment completed:', result);
      }}
      onDeploymentError={(error) => {
        console.error('Deployment failed:', error);
      }}
    />
  );
};
```

## Configuration Options

### Display Configuration

```tsx
const displayConfig = {
  showProgress: true,        // Show progress bar
  showLogs: true,           // Show deployment logs
  showTimeEstimate: true,   // Show time estimates
  showUrl: true,            // Show deployment URL when ready
  compact: false,           // Compact layout mode
  refreshInterval: 5        // Auto-refresh interval in seconds
};
```

### Action Configuration

```tsx
const actions = {
  allowRefresh: true,       // Allow manual refresh
  allowCancel: true,        // Allow deployment cancellation
  allowRetry: true,         // Allow retry on failure
  showHistory: true         // Show deployment history
};
```

### Styling Configuration

```tsx
const styling = {
  progressColor: '#3B82F6',     // Custom progress bar color
  successColor: '#10B981',      // Success state color
  errorColor: '#EF4444',        // Error state color
  warningColor: '#F59E0B',      // Warning state color
  backgroundColor: '#FFFFFF',   // Background color
  customClasses: {              // Custom CSS classes
    container: 'custom-container',
    progressBar: 'custom-progress'
  }
};
```

## Event Handlers

### Status Change Handler
```tsx
const handleStatusChange = (newStatus: DeploymentStatus) => {
  console.log('Status updated:', newStatus.phase);
  // Update your application state
};
```

### Completion Handler
```tsx
const handleDeploymentComplete = (result: PortalOperationResult) => {
  console.log('Deployment completed successfully');
  console.log('Deployed URL:', result.data?.url);
  // Navigate to the deployed portal or show success message
};
```

### Error Handler
```tsx
const handleDeploymentError = (error: PortalError) => {
  console.error('Deployment failed:', error.message);
  // Show error message to user
  // Offer retry options based on error type
};
```

## Deployment Phases

The component tracks the following deployment phases:

1. **Initializing** (5%): Setting up deployment environment
2. **Validating** (15%): Checking configuration and requirements
3. **Preparing** (25%): Preparing files and assets
4. **Uploading** (40%): Uploading to HuggingFace Spaces
5. **Building** (60%): Building the Space application
6. **Deploying** (80%): Deploying to production environment
7. **Testing** (90%): Running health checks and validation
8. **Completed** (100%): Deployment successful and ready
9. **Failed** (0%): Deployment encountered an error

## Log Filtering

The component supports filtering deployment logs by level:
- **All**: Show all log entries
- **Info**: Informational messages
- **Warning**: Warning messages
- **Error**: Error messages
- **Success**: Success confirmations

## Firebase Functions Integration

The component integrates with the following Firebase Functions:

### getDeploymentStatus
```typescript
// Function to retrieve current deployment status
const statusResult = await callFunction('getDeploymentStatus', {
  jobId: 'job-123',
  profileId: 'profile-456',
  deploymentId: 'deployment-789'
});
```

### cancelDeployment
```typescript
// Function to cancel an ongoing deployment
const cancelResult = await callFunction('cancelDeployment', {
  jobId: 'job-123',
  profileId: 'profile-456',
  deploymentId: 'deployment-789'
});
```

### retryDeployment
```typescript
// Function to retry a failed deployment
const retryResult = await callFunction('retryDeployment', {
  jobId: 'job-123',
  profileId: 'profile-456',
  deploymentId: 'deployment-789'
});
```

## Error Types

The component handles various deployment error types:

- `DEPLOYMENT_FAILED`: General deployment failure
- `HUGGINGFACE_API_ERROR`: HuggingFace API issues
- `NETWORK_ERROR`: Network connectivity problems
- `VALIDATION_ERROR`: Configuration validation failures
- `RESOURCE_NOT_FOUND`: Missing resources or permissions
- `SERVICE_UNAVAILABLE`: Service temporarily unavailable

## Accessibility Features

- **ARIA Labels**: Comprehensive ARIA labeling for screen readers
- **Keyboard Navigation**: Full keyboard navigation support
- **Focus Management**: Proper focus management for interactive elements
- **Screen Reader Support**: Optimized for screen reader compatibility
- **Color Contrast**: WCAG AA compliant color combinations

## Performance Considerations

- **Auto-refresh Optimization**: Intelligent refresh scheduling based on deployment phase
- **Memory Management**: Proper cleanup of timers and event listeners
- **Lazy Loading**: Optional lazy loading for logs and history
- **Debounced Updates**: Debounced status updates to prevent excessive re-renders

## Testing

The component includes comprehensive test coverage:

```bash
# Run tests
npm test -- PortalDeploymentStatus

# Run tests with coverage
npm test -- --coverage PortalDeploymentStatus
```

Test coverage includes:
- All deployment phases
- Error states and recovery
- User interactions
- Configuration options
- Accessibility compliance
- Performance scenarios

## Troubleshooting

### Common Issues

1. **Auto-refresh not working**
   - Check that `refreshInterval` is set to a positive number
   - Ensure the component is not in a completed/failed state

2. **Firebase function calls failing**
   - Verify Firebase configuration
   - Check authentication and permissions
   - Ensure functions are deployed and accessible

3. **Progress not updating**
   - Verify `onStatusChange` handler is properly connected
   - Check that the deployment status is being updated correctly

4. **Styling issues**
   - Ensure Tailwind CSS is properly configured
   - Check for CSS conflicts with custom styles

### Debug Mode

Enable debug mode for additional logging:

```tsx
<PortalDeploymentStatus
  // ... other props
  debug={true}
/>
```

## Contributing

When contributing to this component:

1. Maintain TypeScript strict mode compliance
2. Add comprehensive test coverage for new features
3. Follow the existing code style and patterns
4. Update documentation for any API changes
5. Ensure accessibility compliance

## License

This component is part of the CVPlus project and follows the project's licensing terms.