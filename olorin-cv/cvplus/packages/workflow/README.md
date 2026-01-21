# @cvplus/workflow

CVPlus workflow management module for job processing, feature orchestration, templates, and certification badges.

## Overview

The CVPlus Workflow module provides a comprehensive system for managing CV creation workflows, including job management, feature orchestration, template management, placeholder value management, certification badges system, and feature skipping functionality.

## Features

### Core Workflow Management
- **Job Management**: Create, monitor, and manage CV processing jobs
- **Feature Orchestration**: Coordinate feature completion and dependencies
- **Workflow State Management**: Track workflow progress and completion
- **Real-time Monitoring**: Live updates on job progress and status

### Template System
- **Template Management**: Browse, select, and customize CV templates
- **Template Categories**: Professional, creative, technical, academic, executive templates
- **Placeholder Management**: Dynamic content injection with validation
- **Template Customization**: Personalize templates for specific roles

### Certification Badges
- **Badge System**: Earn and display certification badges
- **Progress Tracking**: Monitor progress towards badge requirements
- **Badge Verification**: Verify badge authenticity with blockchain support
- **Achievement Analytics**: Track user achievements and milestones

### Feature Management
- **Feature Completion**: Mark features as completed with validation
- **Feature Skipping**: Skip non-essential features with reason tracking
- **Dependency Management**: Handle feature dependencies and execution order
- **Progress Monitoring**: Track individual feature progress

## Installation

```bash
npm install @cvplus/workflow
```

## Usage

### Backend Services

```typescript
import { 
  WorkflowOrchestrator, 
  JobMonitoringService, 
  FeatureCompletionService 
} from '@cvplus/workflow';

// Initialize workflow orchestrator
const orchestrator = new WorkflowOrchestrator();

// Monitor job progress
const monitoring = new JobMonitoringService();
await monitoring.startMonitoring(jobId);

// Complete a feature
const featureService = new FeatureCompletionService();
await featureService.completeFeature(jobId, featureId, completionData);
```

### Frontend Components

```typescript
import React from 'react';
import { 
  WorkflowMonitor, 
  FeatureManager, 
  TemplateSelector,
  CertificationBadges 
} from '@cvplus/workflow';

function WorkflowDashboard({ jobId, userId }) {
  return (
    <div>
      <WorkflowMonitor 
        jobId={jobId} 
        showDetails={true}
        onStatusChange={(status) => console.log('Status:', status)}
      />
      
      <FeatureManager 
        jobId={jobId}
        features={features}
        allowSkip={true}
        onFeatureUpdate={(featureId, status) => console.log('Feature updated')}
      />
      
      <CertificationBadges 
        userId={userId}
        displayMode="grid"
        showProgress={true}
      />
    </div>
  );
}
```

### Hooks

```typescript
import { 
  useWorkflowMonitoring, 
  useFeatureManagement, 
  useTemplates,
  useCertificationBadges 
} from '@cvplus/workflow';

function useWorkflow(jobId: string) {
  const { progress, status, features } = useWorkflowMonitoring(jobId);
  const { completeFeature, skipFeature } = useFeatureManagement(jobId);
  const { templates, searchTemplates } = useTemplates();
  
  return {
    progress,
    status,
    features,
    completeFeature,
    skipFeature,
    templates,
    searchTemplates
  };
}
```

## API Reference

### Job Management

#### Create Job
```typescript
POST /jobs
{
  "userId": "user-123",
  "title": "Senior Developer CV",
  "templateId": "template-456",
  "features": ["feature-1", "feature-2"]
}
```

#### Monitor Job
```typescript
GET /jobs/:id/monitor
// Returns real-time job progress and status
```

### Feature Management

#### Complete Feature
```typescript
POST /jobs/:jobId/features/:featureId/complete
{
  "completionData": { ... }
}
```

#### Skip Feature
```typescript
POST /jobs/:jobId/features/:featureId/skip
{
  "reason": "Not applicable for this role"
}
```

### Template Management

#### Get Templates
```typescript
GET /templates?category=professional&featured=true
// Returns filtered list of templates
```

#### Update Placeholder
```typescript
PATCH /jobs/:jobId/placeholders/:key
{
  "value": "Updated value"
}
```

### Certification Badges

#### Get User Badges
```typescript
GET /users/:userId/badges
// Returns user's certification badges
```

#### Verify Badge
```typescript
POST /badges/:id/verify
{
  "verificationCode": "CODE123"
}
```

## Migration Functions

This module is designed to handle the migration of the following functions from the main CVPlus project:

- `injectCompletedFeatures.ts`
- `skipFeature.ts`
- `updateJobFeatures.ts`
- `updatePlaceholderValue.ts`
- `getTemplates.ts`
- `certificationBadges.ts`
- `role-profile.functions.ts`
- `monitorJobs.ts`

## Types

### Core Types

```typescript
import { 
  Job, 
  JobStatus, 
  JobProgress, 
  Feature, 
  FeatureStatus, 
  CVTemplate, 
  CertificationBadge 
} from '@cvplus/workflow';

// Job management
interface Job {
  id: string;
  userId: string;
  status: JobStatus;
  title: string;
  features: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Feature management
interface Feature {
  id: string;
  name: string;
  status: FeatureStatus;
  priority: 'low' | 'medium' | 'high';
  dependencies: string[];
  progress?: number;
}

// Template management
interface CVTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  isPremium: boolean;
  isFeatured: boolean;
}

// Certification badges
interface CertificationBadge {
  id: string;
  userId: string;
  badgeType: BadgeType;
  name: string;
  status: BadgeStatus;
  issuedAt: Date;
}
```

## Constants

```typescript
import { 
  JOB_STATUS, 
  FEATURE_STATUS, 
  TEMPLATE_CATEGORIES, 
  BADGE_TYPES 
} from '@cvplus/workflow';

// Job statuses
console.log(JOB_STATUS.PROCESSING); // 'processing'

// Feature statuses
console.log(FEATURE_STATUS.COMPLETED); // 'completed'

// Template categories
console.log(TEMPLATE_CATEGORIES); // ['professional', 'creative', ...]
```

## Utilities

```typescript
import { 
  calculateJobProgress, 
  determineJobStatus, 
  validateFeatureDependencies,
  makeApiRequest 
} from '@cvplus/workflow';

// Calculate job progress
const progress = calculateJobProgress(features);

// Determine job status
const status = determineJobStatus(features);

// Validate dependencies
const validation = validateFeatureDependencies(features);

// Make API request
const response = await makeApiRequest('/jobs', { method: 'POST', body: jobData });
```

## Configuration

### Environment Variables

```bash
REACT_APP_API_BASE_URL=https://api.cvplus.com
```

### Build Configuration

The module uses Rollup for building with support for:
- CommonJS and ES modules
- TypeScript compilation
- Tree shaking
- Code minification (production)

## Development

### Building

```bash
npm run build          # Production build
npm run build:dev      # Development build
npm run build:watch    # Watch mode
```

### Type Checking

```bash
npm run type-check     # Check types
npm run type-check:watch # Watch mode type checking
```

## Integration with CVPlus

This module is designed to be used as a git submodule in the CVPlus project:

```bash
# Add as submodule
git submodule add git@github.com:gilco1973/cvplus-workflow.git packages/workflow

# Initialize and update
git submodule init
git submodule update

# Import in CVPlus project
import { WorkflowOrchestrator } from '@cvplus/workflow';
```

## Architecture

```
@cvplus/workflow/
├── src/
│   ├── backend/
│   │   ├── functions/       # Firebase functions (migration targets)
│   │   └── services/        # Core workflow services
│   ├── frontend/
│   │   ├── components/      # React components
│   │   └── hooks/          # React hooks
│   ├── types/              # TypeScript definitions
│   ├── constants/          # Application constants
│   └── utils/              # Helper functions
├── dist/                   # Built files
├── package.json
├── tsconfig.json
└── rollup.config.js
```

## Contributing

1. Follow the existing code structure and patterns
2. Ensure all functions have comprehensive TypeScript types
3. Add JSDoc comments for all public APIs
4. Write tests for new functionality
5. Update documentation for any API changes

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions, please use the GitHub issue tracker or contact the CVPlus development team.