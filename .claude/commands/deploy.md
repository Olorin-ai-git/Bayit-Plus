# Deployment Subagent Instructions

## Overview
This document defines the comprehensive deployment workflow for subagents, ensuring error-free deployments through automated error handling and recovery protocols.

## Deployment Workflow Protocol

### Phase 1: Git Operations & Pre-Deployment
**Responsible Agent**: `firebase-deployment-specialist` or `deployment-specialist`

1. **Take Control**: Deployment subagent assumes full control of deployment process
2. **Git Operations**:
   **MANDATORY**: All git operations MUST be delegated to `git-expert` subagent:
   ```
   Task(subagent_type="git-expert", description="Git operations for deployment", 
        prompt="Execute deployment git workflow: git add ., commit with message 'deployment: [descriptive commit message]', and push to remote repository")
   ```
   - **NO DIRECT GIT COMMANDS**: Deployment subagent MUST NOT execute git commands directly
   - **Git-expert responsibilities**: Proper commit messages, conflict resolution, repository validation
3. **Pre-deployment Validation**:
   - Check TypeScript compilation
   - Validate environment variables
   - Verify Firebase Secrets
   - Run linting checks

### Phase 2: Build Process
**Responsible Agent**: `firebase-deployment-specialist` or `deployment-specialist`

1. **Execute Build Command**:
   - Run appropriate build command for project type:
     - Frontend: `npm run build`
     - Functions: `npm run build` (in functions directory)
     - Full project: Project-specific build script
2. **Monitor Build Output**:
   - Capture all build errors and warnings
   - Identify error types (TypeScript, syntax, dependency, etc.)

### Phase 3: Error Detection & Handover Protocol
**Responsible Agent**: `firebase-deployment-specialist` → `debugger` → Specialist Subagents

#### 3.1 Error Detection
If build errors occur that prevent successful deployment:

1. **Immediate Handover**: Deployment subagent hands control to `debugger` subagent
2. **Error Context Transfer**: Provide complete error logs and context to debugger

#### 3.2 Debugger Orchestration
**Responsible Agent**: `debugger`

1. **Error Analysis**: Analyze error types and determine appropriate specialist subagent
2. **Specialist Assignment**: Assign specific errors to relevant subagents:
   - **TypeScript/JavaScript errors**: `nodejs-expert`
   - **Python errors**: `django-expert` or `python-hyx-resilience`
   - **React/Frontend errors**: `react-expert` or `frontend-developer`
   - **Backend/API errors**: `backend-architect`
   - **Database errors**: `database-architect`
   - **Test failures**: `test-writer-fixer`
   - **Type checking errors**: Appropriate language expert

#### 3.3 Iterative Error Resolution
**Responsible Agents**: Specialist Subagents → `debugger`

1. **Fix Implementation**: Specialist subagent fixes assigned errors
2. **Validation**: Run appropriate checks (compilation, tests, linting)
3. **Status Report**: Report completion status to debugger
4. **Iterative Process**: Continue until ALL errors are resolved
5. **Quality Gate**: Debugger validates all fixes before proceeding

#### 3.4 Control Return Protocol
**Responsible Agent**: `debugger` → `firebase-deployment-specialist`

1. **Verification**: Debugger confirms all errors are resolved
2. **Clean Build**: Verify project builds successfully without errors
3. **Control Transfer**: Hand control back to deployment subagent
4. **Context Update**: Provide summary of fixes applied

### Phase 4: Smart Deployment System
**Responsible Agent**: `firebase-deployment-specialist`

1. **Resume Deployment**: Continue with deployment using the Intelligent Firebase Deployment System
2. **Deployment Features**:
   - **Advanced Error Recovery**: 24 different recovery strategies
   - **Quota Management**: Intelligent batching for large deployments
   - **Health Checking**: 10 validation categories
   - **Firebase Secrets Integration**: Dual environment support
   - **Comprehensive Reporting**: Detailed deployment reports

3. **Deployment Modes Available**:
   - **Full Deployment**: Comprehensive validation and error recovery
   - **Quick Deployment**: Streamlined process with basic validation
   - **Test Mode**: Validation only without actual deployment
   - **Batch-only**: Functions deployment with intelligent batching
   - **Report-only**: Generate reports from previous deployments

### Phase 5: Post-Deployment Validation
**Responsible Agent**: `firebase-deployment-specialist`

1. **Health Checks**: Run comprehensive post-deployment validation
2. **Function Validation**: Verify all deployed functions are operational
3. **Integration Testing**: Test critical user flows
4. **Performance Monitoring**: Check response times and error rates
5. **Rollback Preparation**: Prepare rollback strategy if issues detected

## Mandatory Protocols

### Git Operations Protocol
- **MANDATORY**: ALL git operations MUST be handled by git-expert subagent
- **NO DIRECT GIT COMMANDS**: Deployment subagents MUST NOT execute git commands directly
- **COORDINATION ONLY**: Deployment subagents coordinate git operations through Task tool delegation
- **Git-expert Responsibilities**: Repository management, commit messages, conflict resolution, push operations

### Error Handover Requirements
- **MANDATORY**: Deployment subagent MUST hand over control when compilation errors occur
- **NO SKIPPING**: Error resolution protocol MUST NOT be bypassed
- **COMPLETE RESOLUTION**: ALL errors must be fixed before deployment continues
- **QUALITY GATES**: Each fix must be validated before proceeding

### Control Flow Rules
1. **Single Point of Control**: Only one subagent has control at any time
2. **Clear Handovers**: Explicit control transfer with context
3. **Status Reporting**: Regular status updates to maintaining subagent
4. **Completion Confirmation**: Explicit confirmation before control return

### Communication Protocol
- **Context Transfer**: Complete error logs and environment details
- **Progress Updates**: Regular status updates during error resolution
- **Completion Confirmation**: Explicit "all clear" before proceeding
- **Documentation**: Log all fixes and changes made during process

## Deployment Subagent Responsibilities

### Primary Responsibilities
- **Git operations coordination**: Delegate all git operations to git-expert subagent (add, commit, push)
- Build process execution and monitoring
- Error detection and classification
- Handover orchestration when errors occur
- Smart deployment system execution
- Post-deployment validation and reporting

### Quality Assurance
- Ensure 100% error-free builds before deployment
- Validate all fixes don't introduce regressions
- Maintain comprehensive deployment logs
- Implement proper rollback procedures when needed

### Success Criteria
- All code compiles without errors or warnings
- All tests pass successfully
- Deployment completes without failures
- Post-deployment health checks pass
- Comprehensive deployment report generated

## Integration with Existing Systems

### Firebase CVPlus Project
- **127+ Firebase Functions**: Specialized handling for large function deployments
- **Intelligent Batching**: Quota-aware deployment strategies
- **Firebase Secrets**: Dual environment configuration support
- **Health Monitoring**: Real-time deployment progress tracking

### Global Subagent Integration
- **Centralized Configuration**: Uses global subagent library
- **Specialized Expertise**: Leverages domain-specific subagents
- **Quality Assurance**: Multi-layer validation and testing
- **Continuous Improvement**: Learning from deployment outcomes

This deployment protocol ensures 100% deployment success through automated error detection, intelligent handover protocols, and comprehensive quality assurance measures.