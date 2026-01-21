# PremiumGate Component

A comprehensive React component system for controlling access to premium features in CVPlus. The PremiumGate component provides a consistent, accessible, and user-friendly way to gate premium content while encouraging upgrades through well-designed prompts and preview modes.

## Overview

The PremiumGate component integrates with CVPlus's existing premium infrastructure (`usePremiumStatus`, `useFeatureAccess`) to provide:

- **Access Control**: Automatically shows/hides premium content based on user subscription
- **Upgrade Prompts**: Beautiful, consistent upgrade prompts with customization options
- **Preview Mode**: Allow users to see premium features with overlay prompts
- **Analytics Integration**: Track user interactions with premium features
- **Error Handling**: Robust error boundary for premium status failures
- **Accessibility**: Full keyboard navigation and screen reader support

## Basic Usage

### Simple Premium Gate

```tsx
import { PremiumGate } from './components/premium/PremiumGate';
import { ExternalDataSources } from './components/ExternalDataSources';

function CVAnalysisPage({ jobId }) {
  return (
    <PremiumGate
      feature="externalDataSources"
      title="External Data Sources"
      description="Import data from LinkedIn, GitHub, and other platforms"
    >
      <ExternalDataSources jobId={jobId} />
    </PremiumGate>
  );
}
```

### Preview Mode

```tsx
<PremiumGate
  feature="advancedAnalytics"
  title="Advanced Analytics"
  description="Get detailed insights about your CV performance"
  showPreview={true}
  previewOpacity={0.3}
>
  <AdvancedAnalytics />
</PremiumGate>
```

### With Analytics Tracking

```tsx
function handleAnalyticsEvent(event, data) {
  // Send to your analytics service
  analytics.track('premium_gate_interaction', {
    event,
    ...data,
    timestamp: Date.now()
  });
}

<PremiumGate
  feature="aiInsights"
  title="AI-Powered Insights"
  description="Get personalized recommendations"
  onAnalyticsEvent={handleAnalyticsEvent}
  onAccessDenied={() => {
    toast.error('This feature requires a premium subscription');
  }}
>
  <AIInsights />
</PremiumGate>
```

## Pre-configured Components

For common features, use pre-configured gates that include optimal settings:

```tsx
import { 
  ExternalDataSourcesGate,
  AdvancedAnalyticsGate,
  AIInsightsGate,
  MultimediaFeaturesGate
} from './components/premium/PremiumGate';

// External Data Sources with preview
<ExternalDataSourcesGate>
  <ExternalDataSources jobId={jobId} />
</ExternalDataSourcesGate>

// Advanced Analytics with preview
<AdvancedAnalyticsGate>
  <AnalyticsDashboard />
</AdvancedAnalyticsGate>

// AI Insights without preview
<AIInsightsGate>
  <PersonalizedRecommendations />
</AIInsightsGate>
```

## API Reference

### PremiumGate Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `feature` | `string` | ✅ | - | The premium feature name to check |
| `title` | `string` | ✅ | - | Title for upgrade prompt |
| `description` | `string` | ✅ | - | Description of the premium feature |
| `children` | `React.ReactNode` | ✅ | - | Premium content to show/hide |
| `fallback` | `React.ReactNode` | ❌ | - | Custom upgrade prompt component |
| `showPreview` | `boolean` | ❌ | `false` | Show preview with overlay |
| `previewOpacity` | `number` | ❌ | `0.3` | Opacity for preview mode (0-1) |
| `className` | `string` | ❌ | `''` | Additional CSS classes |
| `onAnalyticsEvent` | `function` | ❌ | - | Analytics tracking callback |
| `onAccessDenied` | `function` | ❌ | - | Called when user tries to access locked feature |

### Analytics Events

The component tracks these events:

- `upgrade_prompt_shown`: When upgrade prompt is displayed
- `upgrade_prompt_clicked`: When user clicks upgrade button
- `feature_access_denied`: When user tries to interact with locked feature

### Analytics Event Data

```tsx
interface AnalyticsEventData {
  feature: string;
  title?: string;
  component?: string;
  context?: string;
  error?: string;
  errorType?: string;
  [key: string]: any;
}
```

## Custom Upgrade Prompts

Create custom upgrade prompts for specific use cases:

```tsx
const CustomUpgradePrompt = (
  <div className="bg-gradient-to-r from-blue-900 to-purple-900 p-8 rounded-xl text-center">
    <h3 className="text-2xl font-bold text-white mb-4">
      Unlock Professional Features
    </h3>
    <p className="text-blue-100 mb-6">
      Get access to external data sources, advanced analytics, and AI insights.
    </p>
    <button className="bg-blue-500 text-white px-6 py-3 rounded-lg">
      Upgrade for $49 Lifetime
    </button>
  </div>
);

<PremiumGate
  feature="externalDataSources"
  title="External Data Sources"
  description="Premium feature"
  fallback={CustomUpgradePrompt}
>
  <ExternalDataSources />
</PremiumGate>
```

## Integration with Existing Components

### ExternalDataSources Integration

```tsx
// Before: Direct usage
<ExternalDataSources jobId={jobId} onDataEnriched={handleData} />

// After: With premium gating
<ExternalDataSourcesGate
  onAnalyticsEvent={(event, data) => {
    analytics.track('external_data_interaction', { event, ...data });
  }}
>
  <ExternalDataSources jobId={jobId} onDataEnriched={handleData} />
</ExternalDataSourcesGate>
```

### Multi-step Process Integration

```tsx
function CVEnhancementWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  
  return (
    <div className="space-y-6">
      {currentStep === 1 && (
        <BasicCVUpload onNext={() => setCurrentStep(2)} />
      )}
      
      {currentStep === 2 && (
        <ExternalDataSourcesGate>
          <ExternalDataSources 
            onComplete={() => setCurrentStep(3)}
            onSkip={() => setCurrentStep(3)}
          />
        </ExternalDataSourcesGate>
      )}
      
      {currentStep === 3 && (
        <AdvancedAnalyticsGate>
          <CVAnalysisResults />
        </AdvancedAnalyticsGate>
      )}
    </div>
  );
}
```

## Styling and Theming

The component uses CVPlus's design system for consistent styling:

```tsx
// Uses designSystem.components.button, .card, .status, etc.
// Supports dark theme with neutral-900 backgrounds
// Includes premium-specific styling (yellow crown icons, gradients)
```

### Custom Styling

```tsx
<PremiumGate
  className="max-w-4xl mx-auto my-8"
  feature="customFeature"
  title="Custom Feature"
  description="Description"
>
  <CustomComponent />
</PremiumGate>
```

## Accessibility Features

- **Keyboard Navigation**: Full keyboard support for all interactive elements
- **Screen Reader Support**: Proper ARIA labels and descriptions
- **Focus Management**: Logical tab order and focus indicators
- **Color Contrast**: WCAG 2.1 AA compliant color combinations
- **Error States**: Clear error messages with recovery options

## Error Handling

The component includes a built-in error boundary:

```tsx
// Automatically handles:
// - Premium status check failures
// - Network errors
// - Component rendering errors
// - Provides user-friendly error messages
// - Includes retry functionality
```

## Performance Considerations

- **Caching**: Uses premium status caching (5-minute cache)
- **Lazy Loading**: Components only render when needed
- **Memoization**: Prevents unnecessary re-renders
- **Bundle Size**: Minimal impact on bundle size

## Testing

Comprehensive test suite included:

```bash
# Run tests
npm test components/premium/PremiumGate.test.tsx

# Test coverage includes:
# - Loading states
# - Premium access scenarios
# - Upgrade prompt rendering
# - Preview mode functionality
# - Analytics event tracking
# - Error boundary handling
# - Accessibility compliance
```

## Migration Guide

### From Manual Premium Checks

```tsx
// Before: Manual premium checking
function MyComponent() {
  const { isPremium } = usePremiumStatus();
  const { hasAccess } = useFeatureAccess('myFeature');
  
  if (!hasAccess) {
    return <div>Please upgrade to premium</div>;
  }
  
  return <PremiumContent />;
}

// After: Using PremiumGate
function MyComponent() {
  return (
    <PremiumGate
      feature="myFeature"
      title="My Feature"
      description="Premium feature description"
    >
      <PremiumContent />
    </PremiumGate>
  );
}
```

## Best Practices

1. **Feature Naming**: Use consistent feature names across frontend and backend
2. **Preview Mode**: Enable preview for visual features, disable for data-sensitive features
3. **Analytics**: Always implement analytics tracking for premium features
4. **Error Handling**: Provide meaningful error messages and recovery options
5. **Accessibility**: Test with keyboard navigation and screen readers
6. **Performance**: Use pre-configured gates when possible to reduce bundle size

## Troubleshooting

### Common Issues

1. **Feature Not Recognized**: Ensure feature name matches backend configuration
2. **Premium Status Loading**: Check network connectivity and Firebase configuration
3. **Analytics Not Firing**: Verify onAnalyticsEvent callback is properly bound
4. **Styling Issues**: Ensure Tailwind CSS classes are available

### Debug Mode

```tsx
// Enable debug logging in development
process.env.NODE_ENV === 'development' && console.log('PremiumGate Debug:', {
  feature,
  hasAccess,
  isPremium,
  isLoading
});
```

## Examples

See `PremiumGateExample.tsx` for comprehensive usage examples including:

- Basic integration
- Pre-configured gates
- Custom fallback components
- Multi-step process integration
- Analytics implementation

## Contributing

When extending the PremiumGate component:

1. Add new feature configurations to `types/premium.ts`
2. Create pre-configured gates for common use cases
3. Include comprehensive tests for new functionality
4. Update documentation with usage examples
5. Ensure accessibility compliance

---

**Note**: This component is part of CVPlus's premium feature system and requires proper backend configuration for premium feature flags and subscription management.