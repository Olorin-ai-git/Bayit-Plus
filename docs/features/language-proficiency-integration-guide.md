# Language Proficiency Visuals - Integration Guide

## Overview

The Language Proficiency Visuals feature provides a comprehensive, interactive visualization of language skills with proficiency levels, certifications, and AI-powered insights. This guide covers the complete integration process for the CVPlus platform.

## Features

### Visual Components
- **Circular Progress Indicators**: Animated circular progress showing proficiency percentages
- **Horizontal Bar Charts**: Color-coded bars with certification badges and experience indicators
- **Flag Grid**: Country flags with proficiency badges and detailed modal views
- **Interactive Insights**: AI-generated recommendations and analytics
- **Add Language Form**: Comprehensive form with certification tracking and context selection

### Proficiency System
- **5 Levels**: Native, Fluent, Professional Working, Limited Working, Elementary
- **CEFR Integration**: Common European Framework mapping (A1-C2+)
- **ACTFL Support**: American Council framework compatibility
- **Score System**: Numerical scoring (0-100) for quantitative analysis

### Smart Features
- **AI Detection**: Automatic language extraction from CV content
- **Certification Tracking**: Formal qualification management
- **Context Tags**: Usage scenarios (Business, Academic, Technical, etc.)
- **Experience Tracking**: Years of active language use
- **Verification System**: Formal proficiency verification badges

## File Structure

```
frontend/src/
├── components/LanguageProficiency/
│   ├── LanguageProficiency.tsx           # Main component
│   ├── CircularProgress.tsx              # Circular visualization
│   ├── BarChart.tsx                      # Bar chart visualization
│   ├── FlagGrid.tsx                      # Flag grid visualization
│   ├── LanguageInsights.tsx              # Analytics panel
│   ├── AddLanguageForm.tsx               # Add language modal
│   ├── LanguageProficiencyDemo.tsx       # Demo component
│   └── index.ts                          # Export index
│
├── types/
│   ├── language.ts                       # TypeScript definitions
│   └── cvData.ts                         # Updated CV data types
│
├── hooks/
│   └── useLanguageProficiency.ts         # React hook
│
└── services/
    └── languageProficiency.service.ts    # Frontend service

functions/src/
└── services/
    └── language-proficiency.service.ts   # Backend service (updated)
```

## Integration Steps

### 1. Import Components

```typescript
// Basic usage
import { LanguageProficiency } from '../components/LanguageProficiency';
import { useLanguageProficiency } from '../hooks/useLanguageProficiency';

// Individual components
import {
  CircularProgress,
  BarChart,
  FlagGrid,
  LanguageInsights,
  AddLanguageForm
} from '../components/LanguageProficiency';
```

### 2. Hook Usage

```typescript
const LanguageProfilePage: React.FC<{ jobId: string }> = ({ jobId }) => {
  const {
    visualization,
    languages,
    isLoading,
    isGenerating,
    error,
    generateVisualization,
    addLanguage,
    updateLanguage,
    deleteLanguage,
    refresh
  } = useLanguageProficiency({
    jobId,
    autoGenerate: true, // Auto-generate on first load
    onError: (error) => {
      console.error('Language Error:', error);
      toast.error(error.message);
    }
  });

  return (
    <LanguageProficiency
      visualization={visualization}
      languages={languages}
      isLoading={isLoading}
      onGenerateVisualization={generateVisualization}
      onAddLanguage={addLanguage}
      onUpdateLanguage={updateLanguage}
      onDeleteLanguage={deleteLanguage}
    />
  );
};
```

### 3. Standalone Component Usage

```typescript
// Use individual visualization components
const CustomLanguageView: React.FC = () => {
  const languages = [
    {
      name: 'English',
      proficiency: 'native',
      flag: '🇬🇧',
      score: 100,
      certifications: ['Cambridge CPE'],
      verified: true
    }
  ];

  return (
    <div>
      <CircularProgress languages={languages} />
      <BarChart languages={languages} />
      <FlagGrid languages={languages} />
    </div>
  );
};
```

### 4. Backend Integration

The backend service automatically integrates with existing CV parsing:

```typescript
// In your CV processing function
import { languageProficiencyService } from '../services/language-proficiency.service';

export const processCV = async (jobId: string, cvData: ParsedCV) => {
  // ... existing CV processing
  
  // Generate language visualization
  const languageVisualization = await languageProficiencyService
    .generateLanguageVisualization(cvData, jobId);
  
  // Data is automatically stored in Firestore under:
  // jobs/{jobId}/enhancedFeatures/languageProficiency
};
```

## API Reference

### Types

```typescript
interface LanguageProficiency {
  name: string;
  proficiency: 'native' | 'fluent' | 'professional' | 'limited' | 'elementary';
  score?: number;
  certifications?: string[];
  yearsOfExperience?: number;
  contexts?: string[];
  verified?: boolean;
  flag?: string;
  frameworks?: {
    cefr?: string;
    actfl?: string;
    custom?: string;
  };
}

interface LanguageVisualization {
  proficiencies: LanguageProficiency[];
  visualizations: VisualizationConfig[];
  insights: {
    totalLanguages: number;
    fluentLanguages: number;
    businessReady: string[];
    certifiedLanguages: string[];
    recommendations: string[];
  };
  metadata: {
    extractedFrom: string[];
    confidence: number;
    lastUpdated: Date;
  };
}
```

### Component Props

```typescript
interface LanguageProficiencyProps {
  visualization?: LanguageVisualization;
  languages?: LanguageProficiency[];
  isLoading?: boolean;
  onGenerateVisualization?: () => Promise<void>;
  onAddLanguage?: (language: Partial<LanguageProficiency>) => Promise<void>;
  onUpdateLanguage?: (id: string, updates: Partial<LanguageProficiency>) => Promise<void>;
  onDeleteLanguage?: (id: string) => Promise<void>;
  className?: string;
}
```

## Styling

The component uses Tailwind CSS classes and supports dark mode:

```css
/* Custom animations (automatically injected) */
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.animate-shimmer {
  animation: shimmer 2s infinite;
}

.animate-fade-in {
  animation: fadeIn 0.5s ease-in;
}
```

## Customization

### Color Themes

```typescript
const CUSTOM_PROFICIENCY_COLORS = {
  native: '#059669',     // Green
  fluent: '#2563EB',     // Blue
  professional: '#7C3AED', // Purple
  limited: '#D97706',    // Orange
  elementary: '#6B7280'  // Gray
};
```

### Visualization Options

```typescript
const visualizationOptions = [
  { type: 'circular', name: 'Circular Progress', icon: '⭕' },
  { type: 'bar', name: 'Bar Chart', icon: '📊' },
  { type: 'flags', name: 'Flag Grid', icon: '🏳️' },
  { type: 'radar', name: 'Radar Chart', icon: '🎯' },
  { type: 'matrix', name: 'Skills Matrix', icon: '🔲' }
];
```

## Testing

### Unit Tests

```typescript
// Test individual components
import { render, screen } from '@testing-library/react';
import { CircularProgress } from '../CircularProgress';

test('renders language proficiency circles', () => {
  const languages = [{
    name: 'English',
    proficiency: 'native',
    score: 100
  }];
  
  render(<CircularProgress languages={languages} />);
  expect(screen.getByText('English')).toBeInTheDocument();
  expect(screen.getByText('100%')).toBeInTheDocument();
});
```

### Integration Tests

```typescript
// Test the complete hook workflow
import { renderHook, act } from '@testing-library/react';
import { useLanguageProficiency } from '../useLanguageProficiency';

test('generates language visualization', async () => {
  const { result } = renderHook(() => 
    useLanguageProficiency({ jobId: 'test-job' })
  );
  
  await act(async () => {
    await result.current.generateVisualization();
  });
  
  expect(result.current.visualization).toBeTruthy();
  expect(result.current.languages.length).toBeGreaterThan(0);
});
```

## Demo Mode

Use the demo component for showcasing:

```typescript
import { LanguageProficiencyDemo } from '../components/LanguageProficiency/LanguageProficiencyDemo';

const ShowcasePage: React.FC = () => {
  return (
    <LanguageProficiencyDemo
      jobId={undefined} // Demo mode
      className="max-w-6xl mx-auto p-6"
    />
  );
};
```

## Performance Considerations

1. **Lazy Loading**: Components use React.lazy for code splitting
2. **Memoization**: Expensive calculations are memoized
3. **Debounced Updates**: Form inputs are debounced to prevent excessive API calls
4. **Progressive Enhancement**: Core functionality works without animations
5. **Mobile Optimization**: Responsive design with touch-friendly interactions

## Accessibility

- **WCAG 2.1 AA compliant**
- **Keyboard navigation support**
- **Screen reader optimized**
- **High contrast mode support**
- **Focus indicators**
- **Semantic HTML structure**

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari 14+, Chrome Mobile 90+)

## Troubleshooting

### Common Issues

1. **Missing Flag Emojis**: Update the language flag mapping in the service
2. **Animation Performance**: Disable animations on low-end devices
3. **Data Loading Issues**: Check Firebase security rules and network connectivity
4. **Type Errors**: Ensure all language objects match the interface definition

### Debug Mode

```typescript
// Enable debug logging
const { visualization } = useLanguageProficiency({
  jobId,
  onError: (error) => {
    console.group('Language Proficiency Debug');
    console.error('Error:', error);
    console.log('Current state:', { visualization, languages });
    console.groupEnd();
  }
});
```

## Future Enhancements

- **Voice Recognition**: Practice pronunciation features
- **Learning Resources**: Integrated study materials
- **Progress Tracking**: Language improvement over time
- **Social Features**: Language exchange connections
- **Gamification**: Achievement badges and progress rewards

## Support

For technical support or feature requests:
- GitHub Issues: [CVPlus Repository]()
- Documentation: [Language Proficiency Docs]()
- Examples: [Component Storybook]()

---

*Generated for CVPlus v2.0 - Language Proficiency Visuals Feature*
*Last Updated: 2025-01-22*