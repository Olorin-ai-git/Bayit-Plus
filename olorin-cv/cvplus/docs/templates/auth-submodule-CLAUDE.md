# Authentication Module - CVPlus Submodule

**Author**: Gil Klainert  
**Domain**: Authentication, Authorization & Session Management  
**Type**: CVPlus Git Submodule  
**Independence**: Fully autonomous build and run capability

## Critical Requirements

⚠️ **MANDATORY**: You are a submodule of the CVPlus project. You MUST ensure you can run autonomously in every aspect.

🚫 **ABSOLUTE PROHIBITION**: Never create mock data or use placeholders - EVER!

🚨 **CRITICAL**: Never delete ANY files without explicit user approval - this is a security violation.

🔒 **SECURITY CRITICAL**: This module handles sensitive authentication data. All changes must be security-reviewed.

## Submodule Overview

The Authentication module provides comprehensive authentication, authorization, and session management for the CVPlus platform. It integrates with Firebase Auth, manages user sessions, handles permissions, and provides premium subscription authentication. This module is security-critical and requires special attention to secure coding practices.

## Domain Expertise

### Primary Responsibilities
- Firebase Authentication integration and user management
- Session management with enhanced security features
- Permission-based authorization system
- Premium subscription authentication and feature gates
- Google OAuth integration and social login flows
- JWT token management and validation
- User profile management and data synchronization

### Key Features
- **Firebase Auth Integration**: Complete Firebase Authentication setup with custom claims
- **Session Management**: Enhanced session handling with refresh tokens and security monitoring
- **Permission System**: Role-based access control with granular permissions
- **Premium Authentication**: Subscription-aware authentication with feature gating
- **Social Login**: Google OAuth and other social authentication providers
- **Multi-Factor Authentication**: Support for MFA and enhanced security measures
- **User Migration**: Tools for migrating user accounts and authentication data

### Integration Points
- **Premium Module**: Authentication for subscription features and billing
- **Core Module**: Uses shared types and utilities
- **Admin Module**: Administrative user management and monitoring
- **All Frontend Components**: Provides authentication context and hooks
- **Firebase Functions**: Authentication middleware for all protected endpoints

## Specialized Subagents

### Primary Specialist
- **auth-module-specialist**: Expert in authentication systems, security patterns, and Firebase Auth

### Supporting Specialists
- **security-specialist**: Security audit and vulnerability assessment
- **firebase-deployment-specialist**: Firebase Auth configuration and deployment
- **privacy-engineer**: Privacy compliance and data protection

### Universal Specialists
- **code-reviewer**: Quality assurance and security review (MANDATORY for auth changes)
- **debugger**: Complex troubleshooting and error resolution
- **git-expert**: All git operations and repository management
- **test-writer-fixer**: Comprehensive testing and test maintenance
- **backend-test-engineer**: Backend authentication testing strategies

## Technology Stack

### Core Technologies
- Firebase Authentication SDK
- React.js with TypeScript
- Node.js for backend services
- JWT tokens for session management
- Rollup/TSup for module bundling

### Dependencies
- Firebase Admin SDK
- Firebase Client SDK
- React Context API for state management
- Google APIs for OAuth integration
- Encryption libraries for secure data handling

### Build System
- **Build Command**: `npm run build`
- **Test Command**: `npm run test`
- **Type Check**: `npm run type-check`
- **Security Audit**: `npm audit`

## Development Workflow

### Setup Instructions
1. Clone auth submodule repository: `git clone git@github.com:gilco1973/cvplus-auth.git`
2. Install dependencies: `npm install`
3. Configure Firebase credentials (ask for approval before modifying)
4. Run type checks: `npm run type-check`
5. Run security tests: `npm test`
6. Build module: `npm run build`

### Testing Requirements
- **Coverage Requirement**: Minimum 90% code coverage (higher for security-critical module)
- **Test Framework**: Vitest with Firebase Test SDK
- **Test Types**: Unit tests, integration tests, security tests, authentication flow tests
- **Security Testing**: Penetration testing, token validation testing, permission testing

### Deployment Process
- **CRITICAL**: All deployments must be approved by security team
- Firebase Auth configuration deployment
- Function deployment with authentication middleware
- Client-side authentication component updates

## Integration Patterns

### CVPlus Ecosystem Integration
- **Import Pattern**: `@cvplus/auth`
- **Export Pattern**: Authentication context, hooks, middleware, and services
- **Dependency Chain**: Depends on @cvplus/core for shared types and utilities

### Component Exports
```typescript
// React Components and Hooks
export { AuthContext, AuthProvider } from './context/AuthContext';
export { useAuth, usePermissions, usePremium } from './hooks';
export { AuthGuard, PermissionGate, SignInDialog } from './components';

// Services and Middleware
export { AuthService, SessionService, PermissionService } from './services';
export { authMiddleware, premiumGuard } from './middleware';

// Types
export * from './types/auth.types';
export * from './types/permissions.types';
export * from './types/session.types';
```

### Firebase Functions Integration
- Authentication middleware for protected endpoints
- Custom claims management for premium features
- Session validation and renewal services

## Scripts and Automation

### Available Scripts
- `npm run build`: Build authentication module
- `npm run test`: Run comprehensive test suite including security tests
- `npm run type-check`: TypeScript compilation validation
- `npm run security-audit`: Run security vulnerability assessment
- `npm run test:auth-flows`: Test all authentication flows
- `npm run migrate-users`: User account migration utilities

### Build Automation
- Automatic security scanning on build
- Authentication flow validation
- Token expiration and refresh testing
- Permission system validation

## Quality Standards

### Code Quality
- TypeScript strict mode with additional security rules
- ESLint with security-focused rules
- All authentication functions must be pure and testable
- Comprehensive error handling for security scenarios
- All files must be under 200 lines (security functions may require exceptions)

### Security Requirements
- **MANDATORY**: All authentication code must pass security review
- No hardcoded credentials or secrets
- Secure token storage and transmission
- Protection against common auth vulnerabilities (CSRF, XSS, replay attacks)
- Proper input validation and sanitization
- Secure session management with proper expiration
- Rate limiting for authentication attempts

### Performance Requirements
- Fast authentication state resolution (< 100ms)
- Efficient token validation and refresh
- Minimal impact on application startup
- Optimized permission checking

## Authentication Module Specific Guidelines

### Security Best Practices
- Always use HTTPS for authentication endpoints
- Implement proper CORS policies
- Validate all inputs and sanitize outputs
- Use secure random number generation
- Implement proper logging for security events
- Never log sensitive authentication data

### Token Management
- Secure JWT token generation and validation
- Proper token expiration and refresh cycles
- Secure token storage on client side
- Token revocation capabilities

### Permission System Design
- Hierarchical permission structure
- Role-based access control implementation
- Feature-based permission gates
- Dynamic permission evaluation

## Troubleshooting

### Common Issues
- **Authentication Failures**: Check Firebase configuration and API keys
- **Permission Denied**: Verify user roles and custom claims
- **Token Expiration**: Check token refresh mechanisms
- **Session Issues**: Validate session storage and state management
- **Firebase Errors**: Check Firebase Auth configuration and quotas

### Debug Commands
- `npm run test:auth-flows`: Test all authentication scenarios
- `npm run validate-permissions`: Check permission system integrity
- `firebase auth:export`: Export user data for debugging
- `firebase emulators:start --only auth`: Run local auth emulator

### Security Incident Response
- Immediate token revocation procedures
- User notification systems
- Security logging and monitoring
- Incident documentation and reporting

### Support Resources
- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- CVPlus Security Guidelines (internal)
- Authentication Architecture Decision Records (ADRs)