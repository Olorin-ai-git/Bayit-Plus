# Firebase Integration for Olorin Frontend

This document explains the Firebase integration implemented in the Olorin frontend application.

## Overview

Firebase Analytics has been integrated into the Olorin frontend to track user interactions, investigation workflows, and application performance. This provides valuable insights into how users interact with the fraud investigation platform.

## Configuration

The Firebase configuration is located in `src/firebase.ts` and includes:

- **Project ID**: `olorin-ai`
- **Authentication Domain**: `olorin-ai.firebaseapp.com`
- **Analytics**: Google Analytics with measurement ID `G-HM69PZF9QE`

## Analytics Hook

The `useFirebaseAnalytics` hook (`src/js/hooks/useFirebaseAnalytics.ts`) provides convenient methods for tracking events:

### Available Methods

- `trackPageView(pageName, pageTitle)` - Track page visits
- `trackInvestigationEvent(eventName, investigationId, additionalData)` - Track investigation-specific events
- `trackUserInteraction(action, category, label)` - Track user interactions
- `trackAgentActivity(agentName, action, additionalData)` - Track AI agent activities
- `trackSearchEvent(searchTerm, searchType, resultsCount)` - Track search and filter events
- `trackFeatureUsage(featureName, additionalData)` - Track feature usage
- `trackError(error, errorInfo)` - Track application errors
- `setUserAnalyticsProperties(properties)` - Set user properties
- `setAnalyticsUserId(userId)` - Set user ID for analytics

## Events Being Tracked

### Page Views
- **Investigation Page**: Tracked when users visit the investigation dashboard

### Investigation Events
- **investigation_started**: When a new investigation is initiated
- **investigation_completed**: When a manual investigation is completed
- **autonomous_investigation_completed**: When an autonomous investigation is completed

### Agent Activities
- **analysis_started**: When an AI agent begins analysis
- **analysis_completed**: When an AI agent completes analysis
- **analysis_failed**: When an AI agent analysis fails

### Error Tracking
- Application errors are automatically tracked with context information

## Usage Examples

### Basic Page View Tracking
```typescript
const analytics = useFirebaseAnalytics();

useEffect(() => {
  analytics.trackPageView('Settings Page', 'Application Settings');
}, []);
```

### Investigation Event Tracking
```typescript
// Track investigation start
analytics.trackInvestigationEvent('investigation_started', investigationId, {
  user_id: userId,
  input_type: 'userId',
  time_range: '30d',
  selected_steps: ['network', 'location', 'device']
});
```

### User Interaction Tracking
```typescript
// Track button clicks
analytics.trackUserInteraction('click', 'investigation', 'start_button');

// Track form submissions
analytics.trackUserInteraction('submit', 'investigation_form', 'new_investigation');
```

### Agent Activity Tracking
```typescript
// Track agent completion
analytics.trackAgentActivity('Device Analysis Agent', 'analysis_completed', {
  investigation_id: investigationId,
  step_id: 'device',
  processing_time: 1500
});
```

### Error Tracking
```typescript
// Track errors with context
analytics.trackError(error, {
  investigation_id: investigationId,
  user_id: userId,
  context: 'api_call'
});
```

## Data Privacy

All analytics data is collected in compliance with privacy regulations:
- User data is anonymized
- No personally identifiable information (PII) is sent to analytics
- Users can opt-out of analytics tracking if required

## Implementation Details

### Integration Points
- **App.tsx**: Firebase initialization and analytics setup
- **InvestigationPage.tsx**: Comprehensive investigation workflow tracking
- **useFirebaseAnalytics.ts**: Custom hook for analytics functions

### Key Features
- Automatic error tracking
- Real-time event logging
- User session tracking
- Performance monitoring
- Custom event parameters

## Troubleshooting

### Common Issues

1. **Analytics not loading**: Check console for Firebase initialization errors
2. **Events not firing**: Ensure analytics object is properly initialized
3. **Configuration errors**: Verify Firebase config values in `firebase.ts`

### Debug Mode
To enable debug mode for Firebase Analytics:
```typescript
// Add to firebase.ts
import { getAnalytics, isSupported } from 'firebase/analytics';

const analytics = isSupported().then(yes => yes ? getAnalytics(app) : null);
```

### Testing
Firebase Analytics events can be tested using the Firebase Console's DebugView:
1. Enable debug mode in development
2. View real-time events in Firebase Console
3. Verify event parameters and user properties

## Next Steps

Future enhancements could include:
- A/B testing with Firebase Remote Config
- Push notifications for investigation updates
- Advanced user segmentation
- Performance monitoring with Firebase Performance
- Crash reporting with Firebase Crashlytics

## Support

For issues with Firebase integration, check:
- Firebase Console for project configuration
- Browser console for client-side errors
- Network tab for failed requests
- Firebase documentation for API changes 