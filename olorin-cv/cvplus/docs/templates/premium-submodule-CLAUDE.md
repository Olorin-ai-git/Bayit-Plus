# Premium Module - CVPlus Submodule

**Author**: Gil Klainert  
**Domain**: Subscription Management, Billing & Feature Gates  
**Type**: CVPlus Git Submodule  
**Independence**: Fully autonomous build and run capability

## Critical Requirements

⚠️ **MANDATORY**: You are a submodule of the CVPlus project. You MUST ensure you can run autonomously in every aspect.

🚫 **ABSOLUTE PROHIBITION**: Never create mock data or use placeholders - EVER!

🚨 **CRITICAL**: Never delete ANY files without explicit user approval - this is a security violation.

💳 **BILLING CRITICAL**: This module handles sensitive billing and subscription data. All changes must be security-reviewed.

## Submodule Overview

The Premium module manages the entire subscription lifecycle for CVPlus, from feature gating to billing management. It provides sophisticated subscription tiers, usage tracking, billing integration, and feature access control. This module ensures that premium features are properly protected while providing a seamless upgrade experience for users.

## Domain Expertise

### Primary Responsibilities
- **Subscription Management**: Complete subscription lifecycle from signup to cancellation
- **Feature Gating**: Granular control over premium feature access
- **Billing Integration**: Stripe integration for payment processing and subscription management
- **Usage Tracking**: Monitor feature usage and enforce usage limits
- **Tier Management**: Multiple subscription tiers with different feature sets
- **Upgrade/Downgrade**: Seamless tier transitions with prorated billing
- **Security Monitoring**: Premium feature security and fraud detection
- **Customer Support**: Billing support and subscription management tools

### Key Features
- **Multi-Tier Subscriptions**: Free, Basic, Pro, and Enterprise tiers
- **Feature Gates**: Component-level and API-level feature protection
- **Usage Limits**: Sophisticated usage tracking and limit enforcement
- **Billing Dashboard**: User-friendly subscription and billing management
- **Payment Methods**: Multiple payment method support and management
- **Prorated Billing**: Automatic prorating for plan changes
- **Subscription Analytics**: Revenue tracking and subscription metrics
- **Fraud Prevention**: Advanced security monitoring for premium features

### Integration Points
- **Auth Module**: Subscription-aware authentication and user management
- **Core Module**: Shared types and utilities for subscription data
- **Payments Module**: Payment processing and transaction management
- **Analytics Module**: Subscription and revenue analytics
- **All Feature Modules**: Feature gate integration across all premium features
- **Admin Module**: Administrative subscription management and monitoring

## Specialized Subagents

### Primary Specialist
- **premium-specialist**: Expert in subscription systems, billing integration, and feature gating

### Supporting Specialists
- **payment-integration-agent**: Stripe and payment processing expertise
- **business-analyst**: Subscription metrics and business intelligence
- **security-specialist**: Billing security and fraud prevention
- **financial-modeling-agent**: Revenue modeling and pricing optimization

### Universal Specialists
- **code-reviewer**: Quality assurance and security review (MANDATORY for billing changes)
- **debugger**: Complex troubleshooting and error resolution
- **git-expert**: All git operations and repository management
- **test-writer-fixer**: Comprehensive testing and test maintenance
- **backend-test-engineer**: Subscription system testing strategies

## Technology Stack

### Core Technologies
- Node.js 20+ with TypeScript
- Stripe SDK for payment processing
- Firebase Functions for subscription management
- React.js for billing components
- Firestore for subscription data

### Payment & Billing
- Stripe API for payment processing
- Stripe Webhooks for real-time updates
- Stripe Customer Portal for self-service
- PCI DSS compliance tools
- Financial reporting integrations

### Build System
- **Build Command**: `npm run build`
- **Test Command**: `npm run test`
- **Type Check**: `npm run type-check`
- **Security Test**: `npm run test:security`

## Development Workflow

### Setup Instructions
1. Clone premium submodule: `git clone git@github.com:gilco1973/cvplus-premium.git`
2. Install dependencies: `npm install`
3. Configure Stripe keys (ask for approval before modifying .env)
4. Run type checks: `npm run type-check`
5. Run subscription tests: `npm test`
6. Test Stripe integration: `npm run test:stripe-integration`
7. Build module: `npm run build`

### Testing Requirements
- **Coverage Requirement**: Minimum 90% code coverage (critical for billing)
- **Test Framework**: Vitest with Stripe Test SDK
- **Test Types**: Unit tests, integration tests, billing flow tests, security tests
- **Billing Testing**: Mock Stripe webhooks, test subscription flows, validate billing calculations

### Deployment Process
- **CRITICAL**: All billing deployments must be approved by finance team
- Stripe webhook configuration and validation
- Firebase Functions deployment with billing endpoints
- Subscription data migration and validation

## Integration Patterns

### CVPlus Ecosystem Integration
- **Import Pattern**: `@cvplus/premium`
- **Export Pattern**: Subscription components, feature gates, billing services
- **Dependency Chain**: Depends on @cvplus/core, @cvplus/auth, @cvplus/payments

### Component Exports
```typescript
// React Components
export { SubscriptionPlans, BillingHistory, UpgradePrompt, FeatureGate } from './components';
export { useSubscription, useBilling, useFeatureGate } from './hooks';

// Services and Middleware
export { SubscriptionService, BillingService, FeatureService } from './services';
export { premiumGuard, enhancedPremiumGuard, featureGate } from './middleware';

// Types
export * from './types/subscription.types';
export * from './types/billing.types';
export * from './types/premium-features';
```

### Firebase Functions Integration
- Subscription management functions
- Stripe webhook handlers
- Usage tracking and limit enforcement
- Billing analytics and reporting

## Scripts and Automation

### Available Scripts
- `npm run build`: Build premium module
- `npm run test`: Run comprehensive test suite including billing tests
- `npm run test:stripe-integration`: Test Stripe API integration
- `npm run sync-subscriptions`: Sync subscription data with Stripe
- `npm run validate-billing`: Validate billing calculations and data integrity
- `npm run generate-invoice`: Generate subscription invoices

### Build Automation
- Stripe webhook validation
- Subscription flow testing
- Billing calculation validation
- Security compliance checking
- PCI DSS compliance validation

## Quality Standards

### Code Quality
- TypeScript strict mode with billing-specific type safety
- Comprehensive error handling for payment failures
- Robust input validation for billing data
- Secure handling of sensitive subscription information
- All files must be under 200 lines (complex billing flows may need architectural review)

### Security Requirements
- **MANDATORY**: All billing code must pass security and PCI compliance review
- No hardcoded payment credentials or secrets
- Secure API key management and rotation
- Protection against common billing vulnerabilities
- Proper webhook signature validation
- Secure subscription data storage and transmission
- Comprehensive audit logging for all billing events

### Performance Requirements
- Subscription status resolution within 100ms
- Billing calculations must be accurate to the cent
- Real-time subscription updates
- Efficient feature gate checking
- Optimized subscription data queries

## Premium Module Specific Guidelines

### Subscription Management Best Practices
- Implement graceful degradation for billing service outages
- Maintain accurate subscription state synchronization
- Handle edge cases in subscription lifecycle
- Implement proper retry logic for failed payments
- Maintain detailed audit logs for all subscription changes

### Feature Gate Implementation
- Implement efficient feature checking mechanisms
- Cache subscription status for performance
- Provide clear upgrade prompts for premium features
- Handle graceful degradation when premium features are unavailable
- Maintain consistent feature gate behavior across all modules

### Billing Security Standards
- Validate all webhook signatures
- Never log sensitive billing information
- Implement proper CSRF protection
- Use secure random number generation
- Implement rate limiting for billing endpoints
- Maintain PCI DSS compliance standards

## Troubleshooting

### Common Issues
- **Payment Failures**: Check Stripe configuration and webhook delivery
- **Subscription Sync Issues**: Validate Stripe webhook processing
- **Feature Gate Failures**: Check subscription status resolution
- **Billing Calculation Errors**: Validate pricing configuration and prorating logic
- **Security Issues**: Review audit logs and security monitoring

### Debug Commands
- `npm run test:stripe-integration -- --verbose`: Debug Stripe integration
- `npm run sync-subscriptions -- --dry-run`: Test subscription synchronization
- `npm run validate-billing -- --user-id <id>`: Validate specific user billing
- `stripe webhooks test`: Test webhook configuration

### Billing Incident Response
- Immediate subscription suspension procedures
- Customer notification systems
- Billing dispute resolution
- Incident documentation and reporting
- Financial reconciliation procedures

### Support Resources
- [Stripe API Documentation](https://stripe.com/docs/api)
- [PCI DSS Compliance Guidelines](https://www.pcisecuritystandards.org/)
- [Subscription Billing Best Practices](https://stripe.com/guides)
- CVPlus Billing Guidelines (internal)
- Premium Feature Architecture Documentation