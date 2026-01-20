# Olorin Ecosystem UI Package Migration Guide

This document outlines the process for completing the migration of UI components to the unified package structure.

## Overview

The Olorin ecosystem now uses a monorepo structure with shared packages:

```
packages/ui/
├── design-tokens/      # @olorin/design-tokens - Colors, spacing, typography, etc.
├── glass-components/   # @olorin/glass-ui - Glass UI component library
├── shared-components/  # @olorin/shared-components - Non-Glass shared components
├── shared-hooks/       # @olorin/shared-hooks - Reusable React hooks
├── shared-stores/      # @olorin/shared-stores - Zustand stores
├── shared-services/    # @olorin/shared-services - API clients and services
└── shared-i18n/        # @olorin/shared-i18n - Internationalization
```

## Migration Status

### Completed

1. **Infrastructure Setup**
   - Turborepo configuration (`turbo.json`)
   - npm workspaces configuration
   - GitHub Packages authentication (`.npmrc`)
   - Changesets for versioning (`.changeset/`)
   - CI/CD workflows (`.github/workflows/`)

2. **@olorin/design-tokens** (Ready for use)
   - Colors (primary, secondary, dark, semantic, glass)
   - Spacing scale
   - Typography (fonts, sizes, weights)
   - Shadows (web and React Native)
   - Animations (keyframes, transitions)
   - Tailwind preset

3. **@olorin/glass-ui** (Structure created)
   - Package configuration
   - Theme exports
   - useTVFocus hook
   - GlassView component (native)

### Pending Migration

The following components need to be migrated from `shared/components/ui/`:

#### Core Components
- [ ] GlassButton
- [ ] GlassCard
- [ ] GlassFAB
- [ ] GlassView (web version)

#### Form Components
- [ ] GlassInput
- [ ] GlassSelect
- [ ] GlassTextarea
- [ ] GlassCheckbox
- [ ] GlassToggle
- [ ] TVSwitch

#### UI Components
- [ ] GlassModal
- [ ] GlassBadge
- [ ] GlassTabs
- [ ] GlassCategoryPill
- [ ] GlassBreadcrumbs
- [ ] GlassAvatar
- [ ] GlassStatCard
- [ ] GlassLiveChannelCard
- [ ] GlassResizablePanel
- [ ] GlassSplitterHandle
- [ ] GlassTooltip
- [ ] GlassChevron
- [ ] GlassParticleLayer
- [ ] GlassReorderableList
- [ ] GlassSectionItem
- [ ] AnalogClock

#### Web-Only Components
- [ ] GlassTable
- [ ] GlassLog
- [ ] GlassDraggableExpander

## Migration Process

### Step 1: Copy Component to Package

```bash
# Example: Migrating GlassButton
cp shared/components/ui/GlassButton.tsx packages/ui/glass-components/src/native/components/
```

### Step 2: Update Imports

Change imports from relative paths to package imports:

```typescript
// Before
import { colors, borderRadius } from '../theme';
import { useTVFocus } from '../hooks/useTVFocus';

// After
import { colors, borderRadius } from '../../theme';
import { useTVFocus } from '../../hooks';
```

### Step 3: Add TypeScript Types

Ensure all props are properly typed and exported:

```typescript
export interface GlassButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  // ... other props
}

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | ...;
```

### Step 4: Export from Index

Add the component to the appropriate index file:

```typescript
// packages/ui/glass-components/src/native/index.ts
export { GlassButton, type GlassButtonProps, type ButtonVariant } from './components/GlassButton';
```

### Step 5: Create Web Version (if different)

If the component has web-specific code, create a separate web version:

```typescript
// packages/ui/glass-components/src/web/components/GlassButton.tsx
// Web-specific implementation
```

### Step 6: Update Consuming Apps

Update app imports to use the new package:

```typescript
// Before
import { GlassButton } from '@bayit/shared/components/ui';

// After
import { GlassButton } from '@olorin/glass-ui';
// or
import { GlassButton } from '@olorin/glass-ui/native';
```

## Building Packages

```bash
# Build all packages
npm run build:packages

# Build specific package
cd packages/ui/design-tokens && npm run build

# Watch mode for development
cd packages/ui/glass-components && npm run dev
```

## Testing Changes

```bash
# Run all tests
npm run test

# Test specific package
cd packages/ui/glass-components && npm run test
```

## Publishing Packages

Packages are automatically published via Changesets when merged to main:

1. Create a changeset:
   ```bash
   npm run changeset
   ```

2. Select the packages that changed and describe the changes

3. Commit and push the changeset

4. When merged to main, the release workflow will:
   - Create a release PR with version bumps
   - Publish packages to GitHub Packages when the release PR is merged

## Manual Publishing (if needed)

```bash
# Build packages
npm run build:packages

# Publish
npm run changeset:publish
```

## Consuming Packages in Apps

### Installation

```bash
# In app directory
npm install @olorin/design-tokens @olorin/glass-ui
```

### Configuration

```javascript
// tailwind.config.js
module.exports = {
  presets: [require('@olorin/design-tokens/tailwind.preset')],
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './node_modules/@olorin/glass-ui/**/*.{js,jsx,ts,tsx}',
  ],
}
```

### Usage

```typescript
// Import components
import { GlassButton, GlassCard, GlassModal } from '@olorin/glass-ui';

// Import design tokens directly
import { colors, spacing } from '@olorin/design-tokens';

// Use in components
function MyComponent() {
  return (
    <GlassCard>
      <GlassButton title="Click me" variant="primary" onPress={handlePress} />
    </GlassCard>
  );
}
```

## Backward Compatibility

During the migration period, apps can continue using the legacy shared/ directory.
The legacy imports will work until all apps are migrated:

```typescript
// Legacy (still works)
import { GlassButton } from '@bayit/shared/components/ui';

// New (preferred)
import { GlassButton } from '@olorin/glass-ui';
```

## Questions?

For questions about the migration process, refer to:
- Plan document: `OLORIN_ECOSYSTEM_UNIFICATION_PLAN.md`
- CLAUDE.md for coding standards
- Package README files for specific usage instructions
