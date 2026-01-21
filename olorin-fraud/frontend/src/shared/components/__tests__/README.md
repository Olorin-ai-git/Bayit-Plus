# Shared Components Contract Tests
Feature: 004-new-olorin-frontend

## Overview
Comprehensive contract tests for all Investigation Wizard shared components. These tests validate:
- Component interfaces and prop types
- Type safety with TypeScript
- Accessibility (ARIA, keyboard navigation)
- Required vs optional props
- Interaction behaviors

## Test Coverage

### Phase 3.3: Contract Test Layer (T019-T022)

#### T019: Component Contract Tests ✅
Tests that all components match their expected TypeScript interfaces and accept all defined props correctly.

**Completed Tests**:
- [x] WizardButton.test.tsx - Button component interface
- [x] WizardPanel.test.tsx - Collapsible panel interface
- [x] WizardProgressIndicator.test.tsx - 3-step wizard interface
- [x] NotificationToast.test.tsx - Toast notification interface

**Pending Tests**:
- [ ] EntitySelector.test.tsx - Entity dropdown interface
- [ ] RiskGauge.test.tsx - Risk visualization interface
- [ ] FormField.test.tsx - Form input interface
- [ ] LoadingSpinner.test.tsx - Loading indicator interface
- [ ] ErrorBoundary.test.tsx - Error boundary interface

#### T020: Type Safety Tests ✅
Validates that TypeScript types are enforced correctly at compile-time and runtime.

**Coverage**: All test files include type safety sections that verify:
- Enum types (WizardButtonVariant, WizardButtonSize, NotificationType, WizardStep)
- Required vs optional props
- Callback function signatures
- React node types

#### T021: Prop Validation Tests ✅
Tests that components correctly handle all prop variations and edge cases.

**Coverage**: All test files include prop validation sections that verify:
- All prop variants (primary/secondary, sm/md/lg, etc.)
- Boolean flags (disabled, loading, fullWidth, defaultExpanded)
- Optional vs required props
- Edge cases (empty arrays, null/undefined)

#### T022: Accessibility Tests ✅
Validates ARIA attributes, keyboard navigation, and screen reader compatibility.

**Coverage**: All test files include accessibility sections that verify:
- ARIA roles (alert, button)
- ARIA attributes (aria-expanded, aria-label)
- Keyboard accessibility (focus, tab index)
- Disabled state handling
- Clickable vs non-clickable states

## Running Tests

```bash
# Run all component contract tests
npm test -- --testPathPattern="shared/components/__tests__"

# Run specific component test
npm test -- WizardButton.test.tsx

# Run tests with coverage
npm test -- --coverage --testPathPattern="shared/components/__tests__"

# Run tests in watch mode
npm test -- --watch --testPathPattern="shared/components/__tests__"
```

## Test Standards

### Component Interface Tests
Every component must test:
- Rendering with required props only
- Rendering with all props (required + optional)
- Correct prop types and TypeScript compilation

### Prop Validation Tests
Every component must test:
- All prop variants and options
- Edge cases (empty, null, undefined)
- Boolean flag combinations
- Disabled/loading states

### Accessibility Tests
Every component must test:
- Proper ARIA roles
- ARIA attributes (expanded, label, etc.)
- Keyboard accessibility (focus, navigation)
- Screen reader compatibility
- Disabled state accessibility

### Type Safety Tests
Every component must test:
- TypeScript enum enforcement
- Required vs optional prop types
- Callback function signatures
- Complex type definitions

## Test File Template

```typescript
/**
 * ComponentName Contract Tests
 * Feature: 004-new-olorin-frontend
 *
 * Tests component interface, props validation, and accessibility.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ComponentName } from '../ComponentName';

describe('ComponentName Contract Tests', () => {
  describe('Component Interface', () => {
    it('should render with required props', () => {
      // Test minimal required props
    });

    it('should accept all prop types correctly', () => {
      // Test with all props
    });
  });

  describe('Prop Validation', () => {
    // Test all prop variants
    // Test edge cases
    // Test boolean flags
  });

  describe('Accessibility', () => {
    // Test ARIA attributes
    // Test keyboard navigation
    // Test disabled states
  });

  describe('Type Safety', () => {
    // Test TypeScript types
    // Test enum enforcement
    // Test callback signatures
  });
});
```

## Coverage Goals

- **Line Coverage**: 85%+ for all components
- **Branch Coverage**: 80%+ for all conditional logic
- **Function Coverage**: 90%+ for all exported functions
- **Statement Coverage**: 85%+ for all code statements

## Integration with CI/CD

These contract tests run automatically:
- On every commit (pre-commit hook)
- On pull request creation
- Before production deployment
- As part of nightly test suites

## Compliance

All tests follow:
- SYSTEM MANDATE: No mocks/stubs in production code
- React Testing Library best practices
- Jest testing conventions
- TypeScript strict mode
- Accessibility standards (WCAG 2.1 AA)
