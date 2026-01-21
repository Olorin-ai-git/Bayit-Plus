# Dual-Tier ATS System Architecture Plan

**Author:** Gil Klainert  
**Date:** 2025-01-24  
**Status:** Planning  
**Diagram:** [ATS Architecture Diagram](/docs/diagrams/dual-tier-ats-architecture.mermaid)

## Executive Summary

Design and implement a dual-tier ATS (Applicant Tracking System) optimization system for CVPlus that maintains the existing free tier while introducing a professional premium tier with advanced ML-based capabilities.

## Architecture Overview

### System Tiers

1. **Basic ATS (Free Tier)**
   - Location: `/functions/src/services/ats-optimization/`
   - Features: Basic multi-factor scoring, simple keyword analysis, general recommendations
   - Status: Existing, maintain backward compatibility

2. **Professional ATS (Premium Tier)**
   - Location: `/functions/src/services/professional-ats/`
   - Features: ML-based scoring, enterprise integration, predictive analytics, industry optimization
   - Status: New implementation

## Implementation Plan

### Phase 1: Foundation (Infrastructure & Core Services)

#### 1.1 Tier Management System
- **File:** `/functions/src/services/tier-management/TierManager.ts`
  - Tier detection and routing
  - Feature availability checks
  - Usage tracking integration

#### 1.2 Feature Gate System
- **File:** `/functions/src/services/feature-gates/FeatureGateService.ts`
  - Premium feature flags
  - Gradual rollout support
  - A/B testing capabilities

#### 1.3 Professional ATS Core Types
- **File:** `/functions/src/services/professional-ats/types.ts`
  - ML model interfaces
  - Professional scoring types
  - Enterprise integration types

### Phase 2: Professional ATS Services

#### 2.1 ML Scoring Engine
- **File:** `/functions/src/services/professional-ats/ml/MLScoringEngine.ts`
  - Advanced scoring algorithms
  - Feature extraction
  - Model prediction interface

#### 2.2 Enterprise ATS Integration
- **File:** `/functions/src/services/professional-ats/enterprise/EnterpriseConnector.ts`
  - ATS API adapters
  - Data normalization
  - Sync mechanisms

#### 2.3 Predictive Analytics
- **File:** `/functions/src/services/professional-ats/analytics/PredictiveAnalyzer.ts`
  - Success probability prediction
  - Interview likelihood scoring
  - Salary range prediction

#### 2.4 Industry Optimizer
- **File:** `/functions/src/services/professional-ats/industry/IndustryOptimizer.ts`
  - Industry-specific keyword banks
  - Sector-based scoring adjustments
  - Role-specific optimizations

#### 2.5 Outcome Tracker
- **File:** `/functions/src/services/professional-ats/tracking/OutcomeTracker.ts`
  - Application outcome recording
  - Success metrics calculation
  - Model feedback loop

### Phase 3: Integration & Orchestration

#### 3.1 Professional ATS Orchestrator
- **File:** `/functions/src/services/professional-ats/ProfessionalATSOrchestrator.ts`
  - Service coordination
  - Workflow management
  - Result aggregation

#### 3.2 Unified ATS Router
- **File:** `/functions/src/services/ats-router/UnifiedATSRouter.ts`
  - Tier-based routing
  - Fallback handling
  - Performance monitoring

### Phase 4: API & Frontend Integration

#### 4.1 Enhanced ATS Function
- **File:** `/functions/src/functions/atsOptimizationV2.ts`
  - Tier detection
  - Service invocation
  - Response formatting

#### 4.2 Frontend Components
- **Files:** 
  - `/frontend/src/components/features/Professional/ProfessionalATS.tsx`
  - `/frontend/src/hooks/useProfessionalATS.ts`

## Technical Architecture

### Service Dependencies
```
UnifiedATSRouter
├── TierManager
├── FeatureGateService
├── BasicATSOrchestrator (existing)
└── ProfessionalATSOrchestrator
    ├── MLScoringEngine
    ├── EnterpriseConnector
    ├── PredictiveAnalyzer
    ├── IndustryOptimizer
    └── OutcomeTracker
```

### Data Flow
1. Request → UnifiedATSRouter
2. TierManager determines user tier
3. FeatureGateService checks enabled features
4. Route to appropriate orchestrator
5. Process and return results

## Implementation Guidelines

### Code Standards
- Maximum 200 lines per file
- Comprehensive TypeScript types
- Unit tests for each service
- Integration tests for workflows

### Backward Compatibility
- No changes to existing basic ATS API
- Gradual migration path
- Feature flags for rollout

### Performance Considerations
- Lazy loading of ML models
- Caching of predictions
- Async processing for heavy operations

## Success Metrics

1. **Technical Metrics**
   - API response time < 2s
   - ML model accuracy > 85%
   - Zero impact on basic tier performance

2. **Business Metrics**
   - Premium conversion rate increase
   - User satisfaction scores
   - ATS match rate improvement

## Risk Mitigation

1. **Technical Risks**
   - ML model performance → Use fallback heuristics
   - API rate limits → Implement caching and queuing
   - Data privacy → Strict data isolation

2. **Business Risks**
   - Feature cannibalization → Clear tier differentiation
   - User confusion → Progressive disclosure UI
   - Cost overruns → Monitor usage and optimize

## Next Steps

1. Create professional ATS service structure
2. Implement tier management system
3. Build ML scoring engine foundation
4. Develop feature gate system
5. Test integration with existing system

## References

- Existing ATS Service: `/functions/src/services/ats-optimization/`
- Premium Status Hook: `/frontend/src/hooks/usePremiumStatus.ts`
- Policy Enforcement: `/functions/src/services/policy-enforcement.service.ts`