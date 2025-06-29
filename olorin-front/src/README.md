# Frontend Components Documentation

**Project:** OLORIN - Generative AI Investigation Agents

**Author:** Gil Klainert | Senior Manager, Fraud Prevention NYC, Trust & Safety,
Olorin

## AgentLogSidebar

### Overview

The `AgentLogSidebar` component is a collapsible sidebar that displays real-time
logs from the risk assessment process. It provides features for copying logs,
clearing logs, and animating log entries.

### Props

```typescript
interface AgentLogSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onClearLogs: () => void;
  onCopyLogs: () => void;
  onLogAnimationComplete?: (agentName: string) => void;
}
```

### Features

- Real-time log display with animation
- Copy logs to clipboard
- Clear logs
- Collapsible sidebar
- Resizable width
- Auto-scrolling to latest logs

### Usage

```tsx
<AgentLogSidebar
  isOpen={isSidebarOpen}
  onClose={() => setIsSidebarOpen(false)}
  onClearLogs={handleClearLogs}
  onCopyLogs={handleCopyLogs}
  onLogAnimationComplete={handleLogAnimationComplete}
/>
```

## InvestigationStep

### Overview

The `InvestigationStep` component displays the progress and status of each
investigation step in the risk assessment process.

### Props

```typescript
interface InvestigationStepProps {
  step: InvestigationStep;
  isActive: boolean;
  isCompleted: boolean;
}
```

### Features

- Visual representation of step status
- Progress indicators
- Detailed step information
- Status badges (pending, in progress, completed, failed)

### Usage

```tsx
<InvestigationStep
  step={step}
  isActive={currentStep === index}
  isCompleted={currentStep > index}
/>
```

## ProgressBar

### Overview

The `ProgressBar` component provides a visual representation of the overall
investigation progress.

### Props

```typescript
interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}
```

### Features

- Visual progress indicator
- Step count display
- Responsive design
- Smooth transitions

### Usage

```tsx
<ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
```

## AnimatedText

### Overview

A utility component used within `AgentLogSidebar` to animate text display.

### Props

```typescript
interface AnimatedTextProps {
  text: string;
  className?: string;
  charSpeed?: number;
  lineDelay?: number;
}
```

### Features

- Character-by-character animation
- Customizable animation speed
- Line delay between entries
- HTML content support

### Usage

```tsx
<AnimatedText
  text={log.message}
  className={getLogColor(log.type)}
  charSpeed={50}
  lineDelay={1000}
/>
```

## Component Interactions

### Log Management Flow

1. User submits risk assessment request
2. `InvestigationPage` dispatches log entries to Redux store
3. `AgentLogSidebar` receives updates and displays logs
4. `AnimatedText` animates each log entry
5. User can interact with logs (copy, clear)

### Progress Tracking Flow

1. Each agent completes its analysis
2. `InvestigationStep` updates its status
3. `ProgressBar` reflects overall progress
4. `AgentLogSidebar` logs the completion

## Styling

### Tailwind CSS Classes

Components use Tailwind CSS for styling with the following conventions:

- Background colors: `bg-{color}-{shade}`
- Text colors: `text-{color}-{shade}`
- Spacing: `p-{size}`, `m-{size}`
- Flexbox: `flex`, `flex-col`, `items-center`
- Transitions: `transition-all`, `duration-{time}`

### Custom Classes

- Log types: `text-purple-600` (Risk Agent), `text-red-600` (error),
  `text-gray-600` (info), `text-green-600` (success)
- Sidebar: `w-{size}`, `min-w-{size}`, `max-w-{size}`
- Progress indicators: `w-full`, `h-{size}`, `rounded-full`

## Best Practices

### Component Design

1. Keep components focused and single-responsibility
2. Use TypeScript for type safety
3. Implement proper error handling
4. Follow React hooks best practices
5. Use memoization when appropriate

### Performance Optimization

1. Use `React.memo` for pure components
2. Implement proper dependency arrays in hooks
3. Avoid unnecessary re-renders
4. Use `useCallback` for event handlers
5. Implement proper cleanup in effects

### Accessibility

1. Use semantic HTML elements
2. Implement proper ARIA attributes
3. Ensure keyboard navigation
4. Provide proper focus management
5. Include screen reader support
