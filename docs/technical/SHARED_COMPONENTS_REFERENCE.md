# Shared Components Reference (Glass UI Library)

**Library:** `@bayit/glass`
**Location:** `/shared/components/`
**Last Updated:** 2026-01-30

## Overview

The Glass UI component library provides a unified set of glassmorphism-styled components used across all Bayit+ platforms (Web, iOS, Android, tvOS). All components follow a dark-mode-first design with semi-transparent backgrounds, backdrop blur effects, and consistent spacing.

### Design Principles

- **Dark Mode by Default** - Optimized for dark backgrounds
- **Glassmorphism** - Frosted glass aesthetic with backdrop blur
- **Cross-Platform** - Works on Web, Mobile (iOS/Android), and tvOS
- **Accessible** - WCAG AA compliant with ARIA labels
- **RTL Support** - Right-to-left language support (Hebrew)
- **Consistent Spacing** - Uses Tailwind spacing scale
- **Smooth Animations** - Built-in transitions and hover states

---

## Core Components

### GlassCard

**Purpose:** Container component with glassmorphism styling

**Usage:**
```typescript
import { GlassCard } from '@bayit/glass';

<GlassCard className="p-6">
  <Text className="text-white text-xl font-bold">Title</Text>
  <Text className="text-white/70">Description</Text>
</GlassCard>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | ReactNode | - | Card content |
| `className` | string | - | Additional CSS classes |
| `onPress` | function | - | Click/tap handler |
| `variant` | 'default' \| 'elevated' | 'default' | Visual variant |

**Styling:**
- Background: `rgba(0, 0, 0, 0.2)`
- Backdrop blur: `24px`
- Border: `1px solid rgba(255, 255, 255, 0.1)`
- Border radius: `16px`

**Platform-Specific:**
- Web: Uses `div` with CSS backdrop-filter
- Mobile/tvOS: Uses `View` with React Native styles

---

### GlassButton

**Purpose:** Interactive button with glassmorphism styling

**Usage:**
```typescript
import { GlassButton } from '@bayit/glass';

<GlassButton
  variant="primary"
  onPress={handleClick}
  disabled={false}
>
  Click Me
</GlassButton>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | ReactNode | - | Button content |
| `variant` | 'primary' \| 'secondary' \| 'danger' | 'primary' | Button style |
| `onPress` | function | - | Click/tap handler |
| `disabled` | boolean | false | Disabled state |
| `loading` | boolean | false | Loading state |
| `size` | 'sm' \| 'md' \| 'lg' | 'md' | Button size |

**Variants:**
- **Primary:** Blue gradient background
- **Secondary:** Transparent with border
- **Danger:** Red background for destructive actions

**States:**
- **Hover:** Increased opacity, scale 1.02
- **Focus:** Ring border (tvOS/keyboard nav)
- **Disabled:** Opacity 0.5, no interaction
- **Loading:** Spinner replacing content

---

### GlassInput

**Purpose:** Text input with glassmorphism styling

**Usage:**
```typescript
import { GlassInput } from '@bayit/glass';

<GlassInput
  placeholder="Enter text"
  value={text}
  onChangeText={setText}
  type="text"
/>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | string | - | Input value |
| `onChangeText` | function | - | Change handler |
| `placeholder` | string | - | Placeholder text |
| `type` | 'text' \| 'email' \| 'password' | 'text' | Input type |
| `disabled` | boolean | false | Disabled state |
| `multiline` | boolean | false | Multi-line input |
| `rows` | number | 3 | Rows (multiline only) |

**Features:**
- Auto-resize for multiline
- Error state styling
- Clear button (optional)
- Password visibility toggle

---

### GlassModal

**Purpose:** Modal dialog with glassmorphism overlay

**Usage:**
```typescript
import { GlassModal } from '@bayit/glass';

<GlassModal
  visible={isOpen}
  onClose={handleClose}
  title="Modal Title"
>
  <Text>Modal content</Text>
</GlassModal>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `visible` | boolean | false | Modal visibility |
| `onClose` | function | - | Close handler |
| `title` | string | - | Modal title |
| `children` | ReactNode | - | Modal content |
| `size` | 'sm' \| 'md' \| 'lg' | 'md' | Modal width |

**Features:**
- Backdrop blur overlay
- Escape key to close
- Click outside to close
- Scroll lock when open
- Animation on open/close

---

### GlassAlert

**Purpose:** Alert/toast notification

**Usage:**
```typescript
import { GlassAlert } from '@bayit/glass';

<GlassAlert
  type="success"
  message="Action completed successfully"
  onDismiss={handleDismiss}
/>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | 'info' \| 'success' \| 'warning' \| 'error' | 'info' | Alert type |
| `message` | string | - | Alert message |
| `onDismiss` | function | - | Dismiss handler |
| `duration` | number | 5000 | Auto-dismiss time (ms) |

**Types:**
- **Info:** Blue accent
- **Success:** Green accent with checkmark
- **Warning:** Yellow accent with warning icon
- **Error:** Red accent with error icon

---

### GlassCheckbox

**Purpose:** Checkbox with glassmorphism styling

**Usage:**
```typescript
import { GlassCheckbox } from '@bayit/glass';

<GlassCheckbox
  checked={isChecked}
  onChange={setChecked}
  label="Accept terms"
/>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `checked` | boolean | false | Checked state |
| `onChange` | function | - | Change handler |
| `label` | string | - | Checkbox label |
| `disabled` | boolean | false | Disabled state |

---

### GlassSwitch

**Purpose:** Toggle switch with glassmorphism styling

**Usage:**
```typescript
import { GlassSwitch } from '@bayit/glass';

<GlassSwitch
  value={isEnabled}
  onValueChange={setEnabled}
  label="Enable feature"
/>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | boolean | false | Switch state |
| `onValueChange` | function | - | Change handler |
| `label` | string | - | Switch label |
| `disabled` | boolean | false | Disabled state |

---

### GlassProgressBar

**Purpose:** Progress indicator with glassmorphism styling

**Usage:**
```typescript
import { GlassProgressBar } from '@bayit/glass';

<GlassProgressBar
  progress={0.65}
  label="65% complete"
/>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `progress` | number | 0 | Progress (0.0 - 1.0) |
| `label` | string | - | Progress label |
| `color` | string | 'blue' | Progress color |

---

### GlassLoadingSpinner

**Purpose:** Loading spinner animation

**Usage:**
```typescript
import { GlassLoadingSpinner } from '@bayit/glass';

<GlassLoadingSpinner size="md" color="white" />
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | 'sm' \| 'md' \| 'lg' | 'md' | Spinner size |
| `color` | string | 'white' | Spinner color |

---

## Layout Components

### GlassTopBar

**Purpose:** Top navigation bar with glassmorphism

**Usage:**
```typescript
import { GlassTopBar } from '@bayit/glass';

<GlassTopBar
  title="Page Title"
  onBack={handleBack}
  actions={[
    { icon: 'search', onPress: handleSearch },
    { icon: 'settings', onPress: handleSettings }
  ]}
/>
```

---

### GlassPageHeader

**Purpose:** Page header with title and breadcrumbs

**Usage:**
```typescript
import { GlassPageHeader } from '@bayit/glass';

<GlassPageHeader
  title="Content Management"
  breadcrumbs={[
    { label: 'Home', href: '/' },
    { label: 'Admin', href: '/admin' },
    { label: 'Content', href: '/admin/content' }
  ]}
/>
```

---

### GlassTabs

**Purpose:** Tab navigation with glassmorphism

**Usage:**
```typescript
import { GlassTabs } from '@bayit/glass';

<GlassTabs
  tabs={[
    { id: 'movies', label: 'Movies', count: 150 },
    { id: 'series', label: 'Series', count: 45 },
    { id: 'podcasts', label: 'Podcasts', count: 200 }
  ]}
  activeTab="movies"
  onTabChange={setActiveTab}
/>
```

---

## Utility Components

### GlassContentPlaceholder

**Purpose:** Empty state placeholder

**Usage:**
```typescript
import { GlassContentPlaceholder } from '@bayit/glass';

<GlassContentPlaceholder
  icon="search"
  title="No results found"
  description="Try adjusting your search criteria"
  action={
    <GlassButton onPress={handleReset}>
      Reset Filters
    </GlassButton>
  }
/>
```

---

### GlassStatCard

**Purpose:** Statistics card with icon and value

**Usage:**
```typescript
import { GlassStatCard } from '@bayit/glass';

<GlassStatCard
  icon="users"
  label="Total Users"
  value="12,345"
  change="+15%"
  trend="up"
/>
```

---

### GlassBreadcrumbs

**Purpose:** Breadcrumb navigation

**Usage:**
```typescript
import { GlassBreadcrumbs } from '@bayit/glass';

<GlassBreadcrumbs
  items={[
    { label: 'Home', href: '/' },
    { label: 'Admin', href: '/admin' },
    { label: 'Users' }
  ]}
/>
```

---

## Platform-Specific Components

### Web Only

**GlassCheckbox.web.tsx:**
- Uses HTML `<input type="checkbox">`
- Full keyboard support
- ARIA labels

**GlassChevron.web.tsx:**
- SVG-based chevron icon
- Animated rotation
- RTL support

### Mobile Only

**TVSwitch:**
- Focus-optimized switch for tvOS
- Siri Remote gesture support
- Large touch targets

---

## Styling Guidelines

### Colors

**Glass Backgrounds:**
```css
/* Light glass */
background: rgba(255, 255, 255, 0.1);

/* Medium glass */
background: rgba(0, 0, 0, 0.2);

/* Dark glass */
background: rgba(0, 0, 0, 0.4);
```

**Text Colors:**
```css
/* Primary text */
color: #ffffff;

/* Secondary text */
color: rgba(255, 255, 255, 0.7);

/* Tertiary text */
color: rgba(255, 255, 255, 0.5);
```

**Borders:**
```css
border: 1px solid rgba(255, 255, 255, 0.1);
```

### Spacing

**Padding:**
- `p-2` - 8px (compact)
- `p-4` - 16px (standard)
- `p-6` - 24px (comfortable)
- `p-8` - 32px (spacious)

**Margins:**
- `m-2` - 8px
- `m-4` - 16px
- `m-6` - 24px

### Border Radius

- `rounded-lg` - 8px (small)
- `rounded-xl` - 12px (medium)
- `rounded-2xl` - 16px (large)

### Backdrop Blur

- `backdrop-blur-sm` - 4px
- `backdrop-blur-md` - 12px
- `backdrop-blur-xl` - 24px (default)

---

## Accessibility

### ARIA Labels

All interactive components support ARIA labels:

```typescript
<GlassButton
  onPress={handleSave}
  accessibilityLabel="Save changes"
  accessibilityHint="Saves your profile updates"
>
  Save
</GlassButton>
```

### Keyboard Navigation

**Supported:**
- Tab navigation between components
- Enter/Space to activate buttons
- Escape to close modals
- Arrow keys for lists/menus

**Focus Indicators:**
All components show visible focus rings when navigated via keyboard.

### Screen Reader Support

All components include proper ARIA roles and labels for screen readers.

---

## RTL (Right-to-Left) Support

All components automatically adapt for RTL languages:

```typescript
// Automatically flips for RTL
<GlassCard>
  <Text>محتوى بالعربية</Text>
</GlassCard>
```

**RTL Adjustments:**
- Text alignment flipped
- Icons mirrored
- Padding/margins flipped
- Animations reversed

---

## Performance Optimization

### Lazy Loading

```typescript
import { lazy, Suspense } from 'react';
import { GlassLoadingSpinner } from '@bayit/glass';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

<Suspense fallback={<GlassLoadingSpinner />}>
  <HeavyComponent />
</Suspense>
```

### Memoization

```typescript
import { memo } from 'react';

const GlassCard = memo(({ title, description }) => {
  return (
    <div className="glass-card">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
});
```

---

## Best Practices

### DO ✅

- Use Glass components for all UI elements
- Follow spacing guidelines (p-4, p-6)
- Include accessibility labels
- Test on all platforms (Web, Mobile, tvOS)
- Use semantic HTML (Web) or proper RN components
- Implement error states
- Add loading states

### DON'T ❌

- Don't use native HTML elements directly
- Don't use third-party UI libraries (Material-UI, Bootstrap)
- Don't create custom styles - use Glass components
- Don't skip accessibility labels
- Don't hardcode colors - use design tokens
- Don't ignore RTL requirements

---

## Related Documents

- [Web Development Guide](../guides/WEB_DEVELOPMENT_GUIDE.md)
- [Mobile Development Guide](../guides/MOBILE_DEVELOPMENT_GUIDE.md)
- [tvOS Development Guide](../guides/TVOS_DEVELOPMENT_GUIDE.md)
- [Accessibility Guide](ACCESSIBILITY_GUIDE.md)

---

**Document Status:** ✅ Complete
**Last Updated:** 2026-01-30
**Maintained by:** Design System Team
**Next Review:** 2026-04-30
