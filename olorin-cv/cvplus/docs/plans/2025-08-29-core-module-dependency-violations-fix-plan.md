# Core Module Dependency Violations Fix Plan

**Author**: Gil Klainert  
**Date**: 2025-08-29  
**Associated Diagram**: [Core Module Refactoring Architecture](../diagrams/2025-08-29-core-module-dependency-fix-architecture.mermaid)

## Overview

The Core module currently has critical architectural violations where it depends on higher-level modules (Premium), which breaks the foundational principle that Core should have zero CVPlus module dependencies.

## Current Violations Identified

### 1. Premium Guard Middleware in Core Module
- **File**: `packages/core/src/middleware/premiumGuard.ts`
- **Violation**: Imports `SubscriptionManagementService` from `@cvplus/premium/backend`
- **Impact**: Core module inappropriately depends on Premium module

### 2. Enhanced Premium Guard in Core Module  
- **File**: `packages/core/src/middleware/enhancedPremiumGuard.ts`
- **Violations**: 
  - Imports `SecureRateLimitGuard` and `SecurityMonitorService` from `@cvplus/premium/backend`
  - References undefined `FeatureRegistry` class
- **Impact**: Core module inappropriately depends on Premium module and has undefined references

## Root Cause Analysis

The middleware files were placed in Core module but implement business logic that:
1. **Requires premium service dependencies** - Violates Core's zero-dependency principle
2. **Implements business-specific features** - Premium access control belongs in Premium module
3. **Has tightly coupled architecture** - Direct imports instead of interface-based patterns

## Solution Strategy

### Phase 1: Interface-Based Architecture Design
1. **Create Core Interfaces**: Define abstract interfaces for premium functionality in Core
2. **Dependency Injection Pattern**: Use constructor injection for service dependencies
3. **Service Registry Pattern**: Create registry for loose coupling between modules

### Phase 2: Move Premium Middleware to Premium Module
1. **Relocate Files**: Move premium-related middleware to `packages/premium/src/middleware/`
2. **Maintain Functionality**: Ensure no loss of existing premium protection features
3. **Update Imports**: Fix all references to moved middleware

### Phase 3: Create Core Abstraction Layer
1. **Abstract Middleware Interface**: Define generic middleware contracts in Core
2. **Plugin Architecture**: Enable Premium module to register middleware with Core
3. **Zero-Dependency Validation**: Ensure Core has no external CVPlus module imports

### Phase 4: Integration and Testing
1. **Update Function Implementations**: Fix all Firebase Functions using the moved middleware
2. **Integration Testing**: Verify premium features continue working correctly
3. **Dependency Validation**: Confirm Core module architectural compliance

## Implementation Plan

### Step 1: Create Core Middleware Interfaces
**Target**: `packages/core/src/types/middleware.ts`
- Define `IAuthGuard`, `IPremiumGuard`, `IRateLimitGuard` interfaces
- Create middleware registration types and factory patterns
- Establish service injection contracts

### Step 2: Move Premium Middleware
**Source**: `packages/core/src/middleware/`
**Target**: `packages/premium/src/middleware/`
- Move `premiumGuard.ts` → `packages/premium/src/middleware/premium-guard.ts`
- Move `enhancedPremiumGuard.ts` → `packages/premium/src/middleware/enhanced-premium-guard.ts`
- Update imports to use Premium module dependencies

### Step 3: Create Core Middleware Factory
**Target**: `packages/core/src/middleware/middleware-factory.ts`
- Implement factory pattern for middleware creation
- Support dependency injection for external services
- Provide fallback implementations for missing dependencies

### Step 4: Update Firebase Functions
**Target**: All functions in `functions/src/functions/`
- Replace direct premium middleware imports
- Use factory pattern to get middleware instances
- Maintain existing security and access control functionality

### Step 5: Fix Missing FeatureRegistry
**Target**: `packages/premium/src/services/feature-registry.ts`
- Create comprehensive feature registry service
- Define feature tiers, limits, and access controls
- Export for use in premium middleware

## Success Criteria

### ✅ Architectural Compliance
- [ ] Core module has zero CVPlus module dependencies
- [ ] All premium functionality moved to Premium module
- [ ] Interface-based decoupling implemented

### ✅ Functional Preservation
- [ ] All premium access controls continue working
- [ ] Rate limiting functionality preserved
- [ ] Security monitoring features intact

### ✅ Code Quality
- [ ] No undefined references or missing imports
- [ ] TypeScript compilation successful across all modules
- [ ] Comprehensive test coverage for refactored code

### ✅ Integration Success
- [ ] Firebase Functions deploy without errors
- [ ] Premium features function correctly in production
- [ ] No regression in existing user experience

## Risk Mitigation

### High Risk: Breaking Premium Functionality
- **Mitigation**: Maintain feature parity during migration
- **Validation**: Comprehensive testing of premium flows
- **Rollback**: Git-based rollback strategy if issues arise

### Medium Risk: Service Integration Complexity
- **Mitigation**: Use dependency injection patterns for loose coupling  
- **Validation**: Integration testing with mocked and real services
- **Monitoring**: Enhanced logging during transition period

### Low Risk: TypeScript Compilation Issues
- **Mitigation**: Iterative development with continuous type checking
- **Validation**: Build validation at each step
- **Resolution**: Immediate fix strategy for type errors

## Implementation Schedule

| Phase | Duration | Deliverables |
|-------|----------|-------------|
| Phase 1: Interface Design | 2 hours | Core middleware interfaces, type definitions |
| Phase 2: Middleware Migration | 3 hours | Moved files, updated imports, maintained functionality |
| Phase 3: Core Abstraction | 2 hours | Factory patterns, service injection, zero dependencies |
| Phase 4: Integration Testing | 3 hours | Function updates, testing, validation, deployment |
| **Total** | **10 hours** | **Architectural compliance, functional preservation** |

## Quality Gates

Each phase requires:
1. **TypeScript Compilation**: No build errors
2. **Unit Tests**: All tests passing
3. **Integration Tests**: Premium functionality verified
4. **Code Review**: Architectural compliance validated
5. **Documentation**: Updated imports and usage patterns

## Success Metrics

- **Zero Dependencies**: Core module dependency count = 0 external CVPlus modules
- **Function Coverage**: 100% of premium-protected functions migrated successfully
- **Test Coverage**: >90% coverage for all refactored middleware
- **Performance**: No degradation in premium access check performance
- **Security**: All existing security controls preserved and functional