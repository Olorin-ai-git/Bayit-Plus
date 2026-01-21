# Role Profile System Components

Comprehensive React frontend components for the CVPlus role profile system, providing intelligent role detection and personalized CV enhancement capabilities.

## Overview

The role profile system enhances CVPlus with AI-powered role detection and personalized recommendations. It analyzes CV content to identify the most suitable professional roles and generates tailored enhancement suggestions.

## Components

### 1. RoleProfileSelector

Main role selection interface with intelligent detection and manual selection options.

**Features:**
- Automatic role detection with confidence scoring
- One-click magic button for applying recommended roles
- Alternative role suggestions dropdown
- Manual role selection fallback
- Loading states and comprehensive error handling
- Real-time confidence indicators

**Usage:**
```tsx
import { RoleProfileSelector } from '@/components/role-profiles';

<RoleProfileSelector
  jobId="job-123"
  onRoleSelected={(role, isDetected) => {
    console.log('Selected role:', role?.name, 'Auto-detected:', isDetected);
  }}
  onAnalysisUpdate={(analysis) => {
    console.log('Analysis updated:', analysis);
  }}
  initialRole={detectedRole}
  className="my-4"
/>
```

### 2. RoleDetectionCard

Displays detection results with detailed role information and actions.

**Features:**
- Visual confidence indicators with color-coded system
- Role profile information and metadata
- Key matching factors display
- Enhancement potential preview
- Sample recommendations preview
- Apply and alternative actions

**Usage:**
```tsx
import { RoleDetectionCard } from '@/components/role-profiles';

<RoleDetectionCard
  detectedRole={detectedRole}
  roleProfile={selectedProfile}
  analysis={analysisData}
  onApply={handleApplyRole}
  onShowAlternatives={showAlternatives}
  isApplying={isApplying}
/>
```

### 3. RoleProfileDropdown

Manual role selection interface with search and filtering capabilities.

**Features:**
- Search functionality across role names, skills, and industries
- Category-based filtering
- Role preview with detailed information
- Skill tags and experience level indicators
- Responsive design for mobile and desktop

**Usage:**
```tsx
import { RoleProfileDropdown } from '@/components/role-profiles';

<RoleProfileDropdown
  availableRoles={roleProfiles}
  selectedRole={currentRole}
  onRoleSelect={handleRoleSelection}
  onClose={handleClose}
/>
```

### 4. RoleBasedRecommendations

Enhanced recommendations display with role-specific context.

**Features:**
- Role-prioritized recommendations list
- Section-based organization (Summary, Skills, Experience, etc.)
- Priority-based color coding and grouping
- Bulk selection and filtering options
- Role-specific metrics and improvements
- Integration with existing recommendation UI

**Usage:**
```tsx
import { RoleBasedRecommendations } from '@/components/role-profiles';

<RoleBasedRecommendations
  jobId="job-123"
  roleProfile={selectedRole}
  detectedRole={detectedRole}
  onRecommendationsUpdate={handleRecsUpdate}
  onContinueToPreview={handleContinue}
/>
```

### 5. RoleProfileIntegration

Complete integration component combining all role profile functionality.

**Features:**
- Tabbed interface for role detection and recommendations
- Progress tracking and step indicators
- Seamless workflow from detection to preview
- Role context summary and statistics
- Integration with existing CVAnalysisPage flow

**Usage:**
```tsx
import { RoleProfileIntegration } from '@/components/role-profiles';

<RoleProfileIntegration
  job={jobData}
  onContinue={(recommendations, roleContext) => {
    // Navigate to preview with role context
  }}
  onBack={handleBack}
/>
```

## Integration with Existing CVPlus

### CVAnalysisPage Integration

To integrate role profiles into the existing CV analysis flow:

```tsx
// In CVAnalysisPage.tsx
import { RoleProfileIntegration } from '../components/role-profiles';

const CVAnalysisPage = () => {
  const [showRoleProfiles, setShowRoleProfiles] = useState(false);
  
  const handleEnhancedAnalysis = () => {
    setShowRoleProfiles(true);
  };
  
  const handleContinueWithRole = (recommendations, roleContext) => {
    // Store role context
    sessionStorage.setItem(`role-context-${jobId}`, JSON.stringify(roleContext));
    
    // Continue to preview with enhanced recommendations
    navigate(`/preview/${jobId}`);
  };
  
  return (
    <div>
      {showRoleProfiles ? (
        <RoleProfileIntegration
          job={job}
          onContinue={handleContinueWithRole}
          onBack={() => setShowRoleProfiles(false)}
        />
      ) : (
        <CVAnalysisResults
          job={job}
          onContinue={handleStandardFlow}
          onEnhancedAnalysis={handleEnhancedAnalysis} // New prop
        />
      )}
    </div>
  );
};
```

### CVAnalysisResults Enhancement

Add a role profile option to the existing analysis results:

```tsx
// Add to CVAnalysisResults.tsx
const CVAnalysisResults = ({ job, onContinue, onEnhancedAnalysis }) => {
  return (
    <div>
      {/* Existing magic transform and recommendations */}
      
      {/* New role-enhanced option */}
      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg p-6">
        <h3>🎯 Role-Enhanced Analysis</h3>
        <p>Get personalized recommendations based on your career role</p>
        <button onClick={onEnhancedAnalysis}>
          Try Role Enhancement
        </button>
      </div>
    </div>
  );
};
```

## Firebase Functions Integration

The components integrate with these Firebase functions:

- `detectRoleProfile`: Analyzes CV and detects suitable roles
- `getRoleProfiles`: Retrieves available role profiles
- `applyRoleProfile`: Applies selected role to CV
- `getRoleBasedRecommendations`: Generates role-specific recommendations

### Service Layer

Use the provided service for all Firebase interactions:

```tsx
import { roleProfileService } from '@/services/roleProfileService';

// Detect role
const detection = await roleProfileService.detectRole(jobId);

// Get recommendations
const recommendations = await roleProfileService.getRoleRecommendations(
  jobId, 
  roleProfile.id
);

// Apply role
const result = await roleProfileService.applyRole(
  jobId, 
  roleProfile.id, 
  customizationOptions
);
```

## TypeScript Types

All components use comprehensive TypeScript types from `@/types/role-profiles`:

```tsx
import type {
  RoleProfile,
  DetectedRole,
  RoleProfileAnalysis,
  RoleBasedRecommendation,
  RoleCategory,
  ExperienceLevel
} from '@/types/role-profiles';
```

## Styling and Design

### Design System Integration

All components follow the CVPlus design system:

- Uses `designSystem` from `@/config/designSystem`
- Consistent color schemes and typography
- Responsive Tailwind CSS classes
- Dark theme optimized
- Accessibility compliant (WCAG 2.1 AA)

### Theme Colors

- **Primary**: Cyan-blue gradient (`from-primary-400 to-secondary-500`)
- **Success**: Green variants for positive actions
- **Warning**: Orange variants for medium confidence
- **Error**: Red variants for low confidence/errors
- **Info**: Blue variants for informational elements

### Responsive Design

- Mobile-first approach
- Breakpoints: `sm`, `md`, `lg`, `xl`
- Touch-friendly interfaces on mobile
- Optimized layouts for different screen sizes

## Accessibility Features

### WCAG 2.1 AA Compliance

- Proper ARIA labels and descriptions
- Keyboard navigation support
- Screen reader compatibility
- Color contrast ratios > 4.5:1
- Focus management and indicators

### Keyboard Navigation

- Tab order follows logical flow
- Enter/Space for button activation
- Escape to close modals/dropdowns
- Arrow keys for list navigation

### Screen Reader Support

- Semantic HTML structure
- ARIA live regions for dynamic content
- Descriptive labels and instructions
- Status announcements for async actions

## Performance Considerations

### Optimization Strategies

- **Code Splitting**: Components loaded on demand
- **Memoization**: Expensive calculations cached
- **Debouncing**: Search queries debounced
- **Virtual Scrolling**: Large lists virtualized
- **Image Optimization**: Role icons optimized

### Loading States

- Skeleton loaders for better UX
- Progressive loading of content
- Error boundaries for resilience
- Retry mechanisms for failed requests

### Caching

- Role profiles cached locally
- Recent detections cached (10 minutes)
- Service worker for offline support
- SessionStorage for form data

## Error Handling

### Graceful Degradation

- Fallback to manual selection if detection fails
- Default recommendations if role-specific ones fail
- Generic error messages with retry options
- Offline support with cached data

### Error Boundaries

```tsx
const RoleProfileErrorBoundary = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={<div>Role profiles temporarily unavailable</div>}
      onError={logError}
    >
      {children}
    </ErrorBoundary>
  );
};
```

## Testing

### Unit Tests

```tsx
// RoleProfileSelector.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { RoleProfileSelector } from './RoleProfileSelector';

test('detects role automatically on mount', async () => {
  render(<RoleProfileSelector jobId="test-job" />);
  
  expect(screen.getByText('Analyzing your CV...')).toBeInTheDocument();
  
  await waitFor(() => {
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
  });
});
```

### Integration Tests

```tsx
// RoleProfileIntegration.test.tsx
test('complete role profile workflow', async () => {
  const mockJob = createMockJob();
  const handleContinue = jest.fn();
  
  render(
    <RoleProfileIntegration 
      job={mockJob} 
      onContinue={handleContinue} 
    />
  );
  
  // Wait for role detection
  await waitFor(() => {
    expect(screen.getByText(/detected:/i)).toBeInTheDocument();
  });
  
  // Apply role
  fireEvent.click(screen.getByText(/apply.*role/i));
  
  // Check recommendations tab
  await waitFor(() => {
    expect(screen.getByText(/recommendations/i)).toBeInTheDocument();
  });
  
  // Continue to preview
  fireEvent.click(screen.getByText(/apply.*preview/i));
  
  expect(handleContinue).toHaveBeenCalledWith(
    expect.any(Array),
    expect.objectContaining({
      selectedRole: expect.any(Object),
      detectedRole: expect.any(Object)
    })
  );
});
```

## Demo and Examples

### RoleProfileDemo Component

The `RoleProfileDemo` component provides a complete example of how to integrate the role profile system:

```tsx
import { RoleProfileDemo } from '@/components/role-profiles/RoleProfileDemo';

// Use as a standalone demo page
<Route path="/demo/role-profiles" component={RoleProfileDemo} />
```

### Usage Examples

See the `examples/` directory for additional usage patterns:

- Basic integration with existing components
- Custom styling and theming
- Advanced error handling
- Performance optimization techniques

## Migration Guide

### From Standard to Role-Enhanced Analysis

1. **Add role profile imports**:
   ```tsx
   import { RoleProfileIntegration } from '@/components/role-profiles';
   ```

2. **Update state management**:
   ```tsx
   const [analysisMode, setAnalysisMode] = useState<'standard' | 'enhanced'>('standard');
   ```

3. **Add role context to navigation**:
   ```tsx
   const handleContinue = (recommendations, roleContext) => {
     if (roleContext) {
       sessionStorage.setItem(`role-context-${jobId}`, JSON.stringify(roleContext));
     }
     navigate(`/preview/${jobId}`);
   };
   ```

4. **Update preview page to use role context**:
   ```tsx
   useEffect(() => {
     const roleContext = sessionStorage.getItem(`role-context-${jobId}`);
     if (roleContext) {
       setRoleData(JSON.parse(roleContext));
     }
   }, [jobId]);
   ```

## Troubleshooting

### Common Issues

1. **Role detection fails**:
   - Check Firebase function logs
   - Verify CV data format
   - Ensure user authentication

2. **Components not rendering**:
   - Check TypeScript types import
   - Verify design system configuration
   - Check console for errors

3. **Styling issues**:
   - Ensure Tailwind CSS is properly configured
   - Check for conflicting CSS classes
   - Verify design system imports

### Debug Mode

Enable debug mode for verbose logging:

```tsx
// Add to environment variables
REACT_APP_ROLE_PROFILE_DEBUG=true

// Components will log detailed information
```

## Contributing

### Development Setup

1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Run tests: `npm test`
4. Run type checking: `npm run type-check`

### Code Style

- Use TypeScript strictly
- Follow existing naming conventions
- Add comprehensive JSDoc comments
- Ensure accessibility compliance
- Write tests for new features

### Pull Request Process

1. Create feature branch from `main`
2. Implement changes with tests
3. Update documentation
4. Submit PR with detailed description
5. Address review feedback

For questions or support, please refer to the CVPlus documentation or contact the development team.