# Quickstart Guide: Investigation Wizard Implementation

**Feature**: 004-new-olorin-frontend
**Created**: 2025-10-14
**Phase**: Phase 1 - Design

This guide provides a step-by-step walkthrough for implementing the Investigation Wizard based on GAIA's design system.

---

## 1. Prerequisites

### Environment Setup

```bash
# Navigate to olorin-front directory
cd /Users/gklainert/Documents/olorin/olorin-front

# Ensure you're on the feature branch
git checkout 004-new-olorin-frontend

# Install dependencies (if not already done)
npm install
```

### Environment Variables

Create `.env.local` with required configuration:

```bash
# API Configuration
REACT_APP_API_BASE_URL=https://your-backend-api-host
REACT_APP_WS_BASE_URL=wss://your-websocket-host

# Feature Flags
REACT_APP_FEATURE_ENABLE_WIZARD=true
REACT_APP_FEATURE_ENABLE_REAL_TIME_UPDATES=true
REACT_APP_FEATURE_ENABLE_TEMPLATES=true

# UI Configuration
REACT_APP_MAX_ENTITIES=10
REACT_APP_MAX_TOOLS=20
REACT_APP_DEFAULT_RISK_THRESHOLD=50
REACT_APP_DEFAULT_CORRELATION_MODE=OR
REACT_APP_DEFAULT_EXECUTION_MODE=parallel
```

---

## 2. GAIA Design System Setup

### Step 1: Update Tailwind Configuration

Add GAIA corporate colors to `tailwind.config.js`:

```javascript
module.exports = {
  // ... existing config
  theme: {
    extend: {
      colors: {
        corporate: {
          // Backgrounds
          bgPrimary: '#0B1221',
          bgSecondary: '#1A2332',
          bgTertiary: '#242E3E',

          // Accent colors
          accentPrimary: '#FF6600',
          accentPrimaryHover: '#E55A00',
          accentSecondary: '#06B6D4',
          accentSecondaryHover: '#0891B2',

          // Status colors
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#3B82F6',

          // Text colors
          textPrimary: '#F9FAFB',
          textSecondary: '#D1D5DB',
          textTertiary: '#9CA3AF',
          textDisabled: '#6B7280',

          // Border colors
          borderPrimary: '#374151',
          borderSecondary: '#4B5563',
          borderAccent: '#FF6600'
        }
      }
    }
  }
};
```

### Step 2: Create Shared Component Library

Create reusable Tailwind components in `src/shared/components/`:

```typescript
// src/shared/components/wizard/WizardButton.tsx
interface WizardButtonProps {
  variant: 'primary' | 'secondary' | 'outline';
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

export function WizardButton({
  variant,
  onClick,
  disabled,
  loading,
  children
}: WizardButtonProps) {
  const baseClasses = "px-4 py-2 rounded font-medium transition-all duration-200";
  const variantClasses = {
    primary: "bg-corporate-accentPrimary hover:bg-corporate-accentPrimaryHover text-white",
    secondary: "bg-corporate-bgTertiary hover:bg-corporate-bgSecondary text-corporate-textPrimary",
    outline: "border-2 border-corporate-accentPrimary text-corporate-accentPrimary hover:bg-corporate-accentPrimary hover:text-white"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'
      }`}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
}
```

---

## 3. Wizard Infrastructure Setup

### Step 1: Create Wizard Store

Create Zustand store for wizard state management:

```typescript
// src/microservices/investigation/stores/investigationWizardStore.ts
import { create } from 'zustand';
import { WizardStep, Investigation, InvestigationSettings } from '../types/wizard.types';

interface WizardStore {
  investigation: Investigation | null;
  currentStep: WizardStep;
  settings: InvestigationSettings | null;
  notification: Notification | null;

  // Actions
  setInvestigation: (investigation: Investigation) => void;
  setCurrentStep: (step: WizardStep) => void;
  setSettings: (settings: InvestigationSettings) => void;
  showNotification: (notification: Notification) => void;
  dismissNotification: () => void;
}

export const useWizardStore = create<WizardStore>((set) => ({
  investigation: null,
  currentStep: WizardStep.SETTINGS,
  settings: null,
  notification: null,

  setInvestigation: (investigation) => set({ investigation }),
  setCurrentStep: (step) => set({ currentStep: step }),
  setSettings: (settings) => set({ settings }),
  showNotification: (notification) => set({ notification }),
  dismissNotification: () => set({ notification: null })
}));
```

### Step 2: Create Navigation Hook

Create hook for wizard navigation logic:

```typescript
// src/microservices/investigation/hooks/useWizardNavigation.ts
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWizardStore } from '../stores/investigationWizardStore';
import { WizardStep } from '../types/wizard.types';

export function useWizardNavigation() {
  const navigate = useNavigate();
  const { currentStep, settings } = useWizardStore();

  const canNavigateToStep = useCallback((targetStep: WizardStep): boolean => {
    // Always allow backward navigation
    const stepOrder = [WizardStep.SETTINGS, WizardStep.PROGRESS, WizardStep.RESULTS];
    const currentIndex = stepOrder.indexOf(currentStep);
    const targetIndex = stepOrder.indexOf(targetStep);

    if (targetIndex <= currentIndex) {
      return true;
    }

    // Forward navigation requires validation
    if (targetStep === WizardStep.PROGRESS) {
      return settings?.isValid ?? false;
    }

    if (targetStep === WizardStep.RESULTS) {
      // Can only access results after investigation completes
      return false; // Will be enabled by backend completion event
    }

    return false;
  }, [currentStep, settings]);

  const navigateToStep = useCallback((step: WizardStep, investigationId?: string) => {
    if (!canNavigateToStep(step)) {
      return;
    }

    const baseUrl = investigationId ? `/investigation/${investigationId}` : '/investigation';
    navigate(`${baseUrl}/${step}`);
  }, [canNavigateToStep, navigate]);

  return { canNavigateToStep, navigateToStep };
}
```

---

## 4. Wizard Pages Implementation

### Step 1: Settings Page Structure

```typescript
// src/microservices/investigation/pages/InvestigationSettingsPage.tsx
import { useState } from 'react';
import { useWizardStore } from '../stores/investigationWizardStore';
import { useWizardNavigation } from '../hooks/useWizardNavigation';
import { EntitySelectionPanel } from '../components/wizard/settings/EntitySelectionPanel';
import { TimeRangePanel } from '../components/wizard/settings/TimeRangePanel';
import { ToolMatrixPanel } from '../components/wizard/settings/ToolMatrixPanel';
import { ValidationPanel } from '../components/wizard/settings/ValidationPanel';
import { InvestigationSettings } from '../types/wizard.types';

export function InvestigationSettingsPage() {
  const { settings, setSettings } = useWizardStore();
  const { navigateToStep } = useWizardNavigation();
  const [isValidating, setIsValidating] = useState(false);

  const handleStartInvestigation = async () => {
    if (!settings?.isValid) return;

    try {
      // API call to start investigation
      const response = await fetch('/api/investigations/execute', {
        method: 'POST',
        body: JSON.stringify({ settings })
      });

      const data = await response.json();
      navigateToStep('progress', data.investigationId);
    } catch (error) {
      // Handle error
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Left column - 2/3 width */}
      <div className="lg:col-span-2 space-y-6">
        <EntitySelectionPanel
          entities={settings?.entities ?? []}
          onChange={(entities) => setSettings({ ...settings, entities })}
        />

        <TimeRangePanel
          timeRange={settings?.timeRange}
          onChange={(timeRange) => setSettings({ ...settings, timeRange })}
        />

        <ToolMatrixPanel
          selections={settings?.toolSelections ?? []}
          onChange={(toolSelections) => setSettings({ ...settings, toolSelections })}
        />
      </div>

      {/* Right column - 1/3 width (sticky sidebar) */}
      <div className="lg:col-span-1">
        <div className="sticky top-6 space-y-6">
          <ValidationPanel
            settings={settings}
            onValidate={() => {/* validate */}}
            isValidating={isValidating}
          />

          <button
            onClick={handleStartInvestigation}
            disabled={!settings?.isValid}
            className="w-full px-6 py-3 bg-corporate-accentPrimary hover:bg-corporate-accentPrimaryHover text-white rounded font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Investigation
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Step 2: Progress Page with WebSocket

```typescript
// src/microservices/investigation/pages/InvestigationProgressPage.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { ProgressIndicator } from '../components/wizard/progress/ProgressIndicator';
import { LogStream } from '../components/wizard/progress/LogStream';
import { ToolExecutionList } from '../components/wizard/progress/ToolExecutionList';

export function InvestigationProgressPage() {
  const { investigationId } = useParams<{ investigationId: string }>();
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Connect to WebSocket for real-time updates
    const wsUrl = process.env.REACT_APP_WS_BASE_URL;
    const newSocket = io(`${wsUrl}/investigations/${investigationId}`);

    newSocket.on('progress_update', (data) => {
      setProgress(data.overallProgress);
    });

    newSocket.on('log_entry', (data) => {
      setLogs(prev => [...prev, data]);
    });

    newSocket.on('investigation_completed', () => {
      // Navigate to results page
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [investigationId]);

  return (
    <div className="space-y-6">
      <ProgressIndicator progress={progress} />
      <LogStream logs={logs} />
      <ToolExecutionList investigationId={investigationId} />
    </div>
  );
}
```

### Step 3: Results Page

```typescript
// src/microservices/investigation/pages/InvestigationResultsPage.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { RiskGauge } from '../components/wizard/results/RiskGauge';
import { FindingsTable } from '../components/wizard/results/FindingsTable';
import { VisualizationTabs } from '../components/wizard/results/VisualizationTabs';
import { InvestigationResults } from '../types/wizard.types';

export function InvestigationResultsPage() {
  const { investigationId } = useParams<{ investigationId: string }>();
  const [results, setResults] = useState<InvestigationResults | null>(null);

  useEffect(() => {
    // Fetch results from API
    fetch(`/api/investigations/${investigationId}/results`)
      .then(res => res.json())
      .then(data => setResults(data));
  }, [investigationId]);

  if (!results) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <RiskGauge riskAssessment={results.riskAssessment} />
      <FindingsTable findings={results.agentResults} />
      <VisualizationTabs
        networkData={results.visualizations?.networkDiagram}
        timelineData={results.visualizations?.timeline}
      />
    </div>
  );
}
```

---

## 5. Wizard Shell Integration

### Step 1: Create Wizard Shell Component

```typescript
// src/microservices/investigation/components/wizard/InvestigationWizardShell.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { WizardProgressIndicator } from './WizardProgressIndicator';
import { InvestigationSettingsPage } from '../../pages/InvestigationSettingsPage';
import { InvestigationProgressPage } from '../../pages/InvestigationProgressPage';
import { InvestigationResultsPage } from '../../pages/InvestigationResultsPage';

export function InvestigationWizardShell() {
  return (
    <div className="wizard-container min-h-screen bg-corporate-bgPrimary text-corporate-textPrimary">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <WizardProgressIndicator />

        <div className="mt-6">
          <Routes>
            <Route path="settings" element={<InvestigationSettingsPage />} />
            <Route path="progress" element={<InvestigationProgressPage />} />
            <Route path="results" element={<InvestigationResultsPage />} />
            <Route path="" element={<Navigate to="settings" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
```

### Step 2: Add Routes to Application

```typescript
// src/App.tsx (or appropriate router file)
import { InvestigationWizardShell } from './microservices/investigation/components/wizard/InvestigationWizardShell';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/investigation/*" element={<InvestigationWizardShell />} />
        {/* Other routes */}
      </Routes>
    </BrowserRouter>
  );
}
```

---

## 6. Testing Workflow

### Step 1: Unit Tests

```typescript
// src/microservices/investigation/__tests__/useWizardNavigation.test.tsx
import { renderHook, act } from '@testing-library/react';
import { useWizardNavigation } from '../hooks/useWizardNavigation';

describe('useWizardNavigation', () => {
  it('allows backward navigation', () => {
    const { result } = renderHook(() => useWizardNavigation());

    expect(result.current.canNavigateToStep('settings')).toBe(true);
  });

  it('requires valid settings for forward navigation', () => {
    const { result } = renderHook(() => useWizardNavigation());

    expect(result.current.canNavigateToStep('progress')).toBe(false);
  });
});
```

### Step 2: Integration Tests

```typescript
// src/microservices/investigation/__tests__/wizard-flow.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InvestigationWizardShell } from '../components/wizard/InvestigationWizardShell';

describe('Investigation Wizard Flow', () => {
  it('completes full wizard flow from settings to results', async () => {
    render(<InvestigationWizardShell />);

    // Step 1: Configure settings
    fireEvent.click(screen.getByText('Add Entity'));
    // ... configure settings

    // Step 2: Start investigation
    fireEvent.click(screen.getByText('Start Investigation'));

    // Step 3: Wait for completion
    await waitFor(() => {
      expect(screen.getByText('Investigation Complete')).toBeInTheDocument();
    });

    // Step 4: View results
    expect(screen.getByText('Risk Assessment')).toBeInTheDocument();
  });
});
```

---

## 7. Development Workflow

### Daily Development Cycle

```bash
# 1. Start development server
npm run dev:investigation

# 2. Run tests in watch mode
npm run test:watch

# 3. Lint and format code
npm run lint
npm run format

# 4. Check TypeScript types
npm run typecheck

# 5. Check file sizes (must be <200 lines)
npm run migration:file-sizes
```

### Before Committing

```bash
# Run full test suite
npm test

# Run coverage check
npm run test:coverage

# Verify Material-UI removal
npm run migration:mui-finder

# Build to catch any build errors
npm run build
```

---

## 8. Common Pitfalls & Solutions

### Issue 1: Material-UI Imports

**Problem**: Accidentally importing from `@mui/material`

**Solution**: Use Tailwind CSS and Headless UI instead:
```typescript
// ❌ Wrong
import { Button } from '@mui/material';

// ✅ Correct
import { WizardButton } from '@shared/components/wizard/WizardButton';
```

### Issue 2: Hardcoded Values

**Problem**: Hardcoding API URLs or configuration

**Solution**: Use environment variables:
```typescript
// ❌ Wrong
const apiUrl = 'https://api.example.com';

// ✅ Correct
const apiUrl = process.env.REACT_APP_API_BASE_URL;
```

### Issue 3: Files Over 200 Lines

**Problem**: Components growing beyond 200 lines

**Solution**: Extract sub-components:
```typescript
// ❌ Wrong - Single 500-line file
function LargeComponent() { /* 500 lines */ }

// ✅ Correct - Multiple focused files
// ComponentHeader.tsx (80 lines)
// ComponentBody.tsx (120 lines)
// ComponentFooter.tsx (60 lines)
// index.tsx (40 lines - composition)
```

---

## 9. Next Steps

After completing this quickstart:

1. **Review Data Model**: Understand all entities in `data-model.md`
2. **Review API Contracts**: Study all endpoints in `contracts/`
3. **Implement Tasks**: Follow task list generated by `/tasks` command
4. **Run Tests Continuously**: Use TDD approach with failing tests first
5. **Iterate on Design**: Refine components based on GAIA patterns

---

## 10. Resources

### Documentation
- [GAIA Design System Reference](file:///Users/gklainert/Documents/Gaia/gaia-webplugin)
- [Feature Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Data Model](./data-model.md)

### Key Files
- Tailwind Config: `olorin-front/tailwind.config.js`
- TypeScript Config: `olorin-front/tsconfig.json`
- Package JSON: `olorin-front/package.json`

### External Resources
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Headless UI Documentation](https://headlessui.com/)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [React Router Documentation](https://reactrouter.com/)

---

**Ready to implement?** Run `/tasks` command to generate the complete task breakdown!
