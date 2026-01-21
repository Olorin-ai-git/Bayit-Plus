# Visual Feature Components

This directory contains visual CV feature components that provide rich, interactive presentations of achievement and skills data.

## Components

### AchievementCards

A production-ready React component for displaying professional achievements in an interactive card-based layout.

#### Features

- **Multiple Layout Options**: Grid, Carousel, and Masonry layouts
- **Interactive Cards**: Expandable cards with hover effects and detailed metrics
- **Filtering & Sorting**: Filter by category/importance, sort by date/priority/title
- **Export Functionality**: Export achievement cards as PNG images
- **Responsive Design**: Mobile-friendly with appropriate breakpoints
- **Accessibility**: WCAG 2.1 AA compliant with proper ARIA labels
- **Real Firebase Integration**: Uses `useFeatureData` hook for backend data
- **Animations**: Smooth Framer Motion animations with multiple styles

#### Props Interface

```typescript
interface AchievementCardsProps extends CVFeatureProps {
  data: {
    achievements: Achievement[];
    totalAchievements?: number;
    highlightedAchievements?: string[];
  };
  customization?: {
    layout?: 'grid' | 'carousel' | 'masonry';
    animationType?: 'fade' | 'slide' | 'zoom' | 'flip';
    showMetrics?: boolean;
    showIcons?: boolean;
    cardSize?: 'small' | 'medium' | 'large';
    colorScheme?: 'default' | 'professional' | 'colorful' | 'minimal';
  };
}
```

#### Achievement Data Structure

```typescript
interface Achievement {
  id: string;
  title: string;
  description: string;
  impact?: string;
  metrics?: AchievementMetric[];
  category: string;
  date?: string;
  importance: 'high' | 'medium' | 'low';
  icon?: string;
  tags?: string[];
}

interface AchievementMetric {
  label: string;
  value: string | number;
  type: 'percentage' | 'number' | 'currency' | 'time';
  improvement?: string;
}
```

#### Usage Example

```tsx
import { AchievementCards } from './Visual/AchievementCards';

const MyComponent = () => {
  const achievementData = {
    achievements: [
      {
        id: '1',
        title: 'Project Leadership Excellence',
        description: 'Led a team of 12 developers...',
        impact: 'Increased productivity by 35%',
        category: 'leadership',
        importance: 'high',
        date: '2024-01-15',
        metrics: [
          { label: 'Team Size', value: 12, type: 'number' },
          { label: 'Productivity Increase', value: 35, type: 'percentage' }
        ],
        tags: ['leadership', 'project-management']
      }
    ],
    totalAchievements: 1,
    highlightedAchievements: ['1']
  };

  return (
    <AchievementCards
      jobId="job-123"
      profileId="profile-456"
      data={achievementData}
      customization={{
        layout: 'grid',
        cardSize: 'medium',
        showMetrics: true,
        colorScheme: 'professional'
      }}
    />
  );
};
```

#### Card Layouts

1. **Grid Layout** (default)
   - Responsive grid with consistent card sizing
   - Supports pagination for large datasets
   - Adapts to different screen sizes

2. **Carousel Layout**
   - Single card display with navigation controls
   - Swipe gestures on mobile devices
   - Smooth transitions between cards

3. **Masonry Layout**
   - Pinterest-style dynamic sizing
   - Cards arranged by content height
   - Efficient space utilization

#### Customization Options

- **Card Sizes**: Small (compact), Medium (balanced), Large (detailed)
- **Color Schemes**: Default, Professional, Colorful, Minimal
- **Animations**: Fade, Slide, Zoom, Flip transitions
- **Display Options**: Toggle metrics, icons, and various UI elements

#### Backend Integration

The component integrates with Firebase Functions through the `getAchievementCards` function:

```typescript
// Firebase Function call
const { data, loading, error } = useFeatureData({
  jobId: 'user-job-id',
  featureName: 'achievement-cards',
  params: { profileId: 'user-profile-id' }
});
```

#### Testing

Comprehensive test suite includes:
- Component rendering tests
- User interaction tests
- Filtering and sorting functionality
- Export functionality
- Different layout and customization options
- Accessibility compliance

Run tests with:
```bash
npm test -- AchievementCards.test.tsx
```

#### Demo

See `examples/AchievementCardsDemo.tsx` for a full interactive demonstration with sample data and all customization options.

#### Dependencies

- `framer-motion`: Animations and transitions
- `html2canvas`: Export functionality
- `lucide-react`: Icons
- `react-hot-toast`: User notifications

#### Accessibility

- Proper semantic HTML structure
- ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- High contrast color ratios
- Focus management

#### Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

#### Performance

- Optimized for large datasets with pagination
- Lazy loading of images and heavy content
- Efficient re-rendering with React.memo patterns
- Smooth 60fps animations

## Related Components

- `SkillsVisualization`: Visual representation of skills data
- `InteractiveTimeline`: Career timeline with achievements
- `PortfolioGallery`: Portfolio item showcase
