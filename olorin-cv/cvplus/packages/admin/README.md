# @cvplus/admin

Comprehensive admin dashboard module for CVPlus platform management. Provides complete administrative functionality including user management, content moderation, system monitoring, analytics, security auditing, and operational oversight.

## Features

### 🎛️ Admin Dashboard
- Real-time system overview
- Customizable widgets and layouts
- Quick action shortcuts
- Alert management
- Performance metrics

### 👥 User Management
- Complete user lifecycle management
- Bulk operations and batch processing
- Advanced user analytics and insights
- Subscription and billing management
- Support ticket integration

### 🛡️ Content Moderation
- Automated content review workflows
- Human moderation queues
- Quality scoring and assessment
- Content flagging and appeals
- Moderation analytics and reporting

### 📊 System Monitoring
- Real-time health monitoring
- Performance tracking and alerting
- Error monitoring and resolution
- Service dependency tracking
- Capacity planning and optimization

### 📈 Business Analytics
- Revenue and growth metrics
- User behavior analytics
- Conversion funnel analysis
- Predictive insights and forecasting
- Custom report generation

### 🔒 Security Audit
- Comprehensive security monitoring
- Compliance framework management
- Threat detection and response
- Access control and permissions
- Audit logging and reporting

## Installation

```bash
npm install @cvplus/admin
```

## Dependencies

- `@cvplus/core` - Core utilities and types
- `@cvplus/auth` - Authentication and authorization
- `@cvplus/premium` - Premium feature management
- `@cvplus/analytics` - Analytics data integration
- `@cvplus/public-profiles` - Profile management
- `firebase-admin` - Firebase backend operations
- `firebase` - Firebase client operations

## Quick Start

### Basic Setup

```typescript
import { 
  initializeAdminModule, 
  AdminDashboardService 
} from '@cvplus/admin';

// Initialize the admin module
initializeAdminModule({
  features: {
    realtimeUpdates: true,
    advancedAnalytics: true,
    customDashboards: true
  },
  security: {
    mfaRequired: true,
    sessionTimeout: 3600000,
    auditLogging: true
  }
});

// Create dashboard service instance
const dashboardService = new AdminDashboardService();
```

### Admin Dashboard

```typescript
import { AdminDashboardService } from '@cvplus/admin';

const dashboardService = new AdminDashboardService();

// Initialize admin dashboard
const dashboard = await dashboardService.initializeDashboard(
  'admin-user-id',
  {
    layout: 'GRID',
    refreshInterval: 30000,
    realtimeModules: ['system_health', 'active_users', 'pending_moderation'],
    widgetConfiguration: [
      {
        id: 'system-overview',
        type: 'METRICS_CARD',
        position: { x: 0, y: 0, w: 6, h: 2 },
        size: { minWidth: 300, minHeight: 200 },
        config: {
          title: 'System Overview',
          showHeader: true,
          allowFullscreen: true
        },
        permissions: ['dashboard:view']
      }
    ]
  }
);

// Subscribe to real-time updates
dashboardService.addEventListener('realtime:admin-user-id', (data) => {
  console.log('Real-time update:', data);
});
```

### User Management

```typescript
import { UserManagementService } from '@cvplus/admin';

const userService = new UserManagementService();

// Get user management overview
const overview = await userService.getUserManagementOverview('admin-id');

// Perform user management action
const result = await userService.manageUserAccount(
  'admin-id',
  'user-id',
  'suspend_account',
  {
    reason: 'Policy violation',
    duration: 86400000, // 24 hours
    adminUserId: 'admin-id'
  }
);

// Bulk user operations
const bulkResult = await userService.performBulkOperation(
  'admin-id',
  {
    type: 'BULK_SUSPEND',
    targetUsers: ['user1', 'user2', 'user3'],
    parameters: {
      reason: 'Security review',
      duration: 86400000
    }
  }
);
```

### Content Moderation

```typescript
import { ContentModerationService } from '@cvplus/admin';

const moderationService = new ContentModerationService();

// Initialize content moderation
const setup = await moderationService.initializeContentModeration({
  enableSpamDetection: true,
  enableProfanityFilter: true,
  enableContentQualityCheck: true,
  confidenceThreshold: 0.8,
  moderatorRoles: ['moderator', 'admin'],
  reviewTimeLimit: 86400000
});

// Process human moderation review
const reviewResult = await moderationService.processHumanModerationReview(
  'review-id',
  'moderator-id',
  {
    decision: 'APPROVE',
    confidence: 0.95,
    reasoning: 'Content meets quality standards',
    notes: 'Professional and well-structured'
  }
);
```

### System Monitoring

```typescript
import { SystemMonitoringService } from '@cvplus/admin';

const monitoringService = new SystemMonitoringService();

// Setup system monitoring
const monitoringSetup = await monitoringService.setupSystemMonitoring({
  healthCheckInterval: 60000,
  monitoredServices: ['api', 'database', 'cache', 'storage'],
  performanceMetrics: {
    responseTime: true,
    throughput: true,
    errorRate: true,
    resourceUsage: true
  },
  alertChannels: ['email', 'slack', 'webhook']
});

// Get system health status
const healthStatus = await monitoringService.getSystemHealthStatus();

// Generate system report
const systemReport = await monitoringService.generateSystemReport(
  'admin-id',
  {
    timeRange: {
      start: new Date(Date.now() - 86400000),
      end: new Date()
    },
    includeMetrics: true,
    includeAlerts: true,
    format: 'detailed'
  }
);
```

### Business Analytics

```typescript
import { AnalyticsService } from '@cvplus/admin';

const analyticsService = new AnalyticsService();

// Generate executive dashboard
const executiveDashboard = await analyticsService.generateExecutiveDashboard(
  'admin-id',
  {
    timeRange: {
      start: new Date(Date.now() - 30 * 86400000), // Last 30 days
      end: new Date(),
      preset: 'LAST_30_DAYS'
    },
    includeForecasting: true,
    includeBenchmarks: true
  }
);

// Generate operational report
const operationalReport = await analyticsService.generateOperationalReport(
  'admin-id',
  {
    timeRange: {
      start: new Date(Date.now() - 7 * 86400000), // Last 7 days
      end: new Date(),
      preset: 'LAST_7_DAYS'
    },
    includeQualityMetrics: true,
    includeEfficiencyAnalysis: true
  }
);
```

### Security Audit

```typescript
import { SecurityAuditService } from '@cvplus/admin';

const securityService = new SecurityAuditService();

// Get security overview
const securityOverview = await securityService.getSecurityAuditOverview();

// Run compliance assessment
const complianceAssessment = await securityService.runComplianceAssessment(
  'admin-id',
  {
    frameworks: ['GDPR', 'CCPA', 'SOX', 'ISO27001'],
    scope: {
      includeUserData: true,
      includeSystemConfiguration: true,
      includeAuditLogs: true
    }
  }
);

// Investigate security incident
const investigation = await securityService.investigateSecurityIncident(
  'incident-id',
  'admin-id',
  {
    priority: 'HIGH',
    assignedTeam: ['security-analyst', 'system-admin'],
    timeline: {
      responseDeadline: new Date(Date.now() + 3600000), // 1 hour
      resolutionDeadline: new Date(Date.now() + 86400000) // 24 hours
    }
  }
);
```

## Admin Roles and Permissions

### Role Hierarchy

1. **Support (L1)** - Basic support access
   - User support and basic reporting
   - View-only access to most systems

2. **Moderator (L2)** - Content moderation
   - Content review and moderation
   - Limited user management
   - Support ticket management

3. **Admin (L3)** - Full admin access
   - Complete platform management
   - Advanced analytics and reporting
   - System configuration (limited)

4. **Super Admin (L4)** - Platform management
   - Full system access
   - Admin user management
   - Advanced security controls

5. **System Admin (L5)** - System administration
   - Core system configuration
   - Infrastructure management
   - Emergency access controls

### Permission Matrix

```typescript
import { ROLE_PERMISSIONS } from '@cvplus/admin';

// Check permissions for a specific role
const adminPermissions = ROLE_PERMISSIONS.admin;
console.log(adminPermissions.canManageUsers); // true
console.log(adminPermissions.canConfigureSystem); // false

// Get permissions for user management
const userMgmtPermissions = adminPermissions.userManagement;
console.log(userMgmtPermissions.canSuspendUsers); // true
console.log(userMgmtPermissions.canDeleteUsers); // true
```

## Configuration

### Module Configuration

```typescript
import { initializeAdminModule } from '@cvplus/admin';

initializeAdminModule({
  // Firebase configuration
  firebaseConfig: {
    projectId: 'your-project-id',
    apiKey: 'your-api-key',
    authDomain: 'your-project.firebaseapp.com'
  },
  
  // API configuration
  apiConfig: {
    baseUrl: 'https://api.yourplatform.com',
    timeout: 30000,
    retries: 3
  },
  
  // Feature flags
  features: {
    realtimeUpdates: true,
    advancedAnalytics: true,
    automatedModeration: true,
    customDashboards: true
  },
  
  // Security settings
  security: {
    mfaRequired: true,
    sessionTimeout: 3600000,
    ipWhitelistEnabled: true,
    auditLogging: true
  },
  
  // UI customization
  ui: {
    theme: 'system',
    compactMode: false,
    enableAnimations: true
  }
});
```

### Environment Variables

```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com

# API Configuration
ADMIN_API_BASE_URL=https://api.yourplatform.com
ADMIN_API_TIMEOUT=30000

# Security Settings
ADMIN_MFA_REQUIRED=true
ADMIN_SESSION_TIMEOUT=3600000
ADMIN_IP_WHITELIST_ENABLED=false

# Feature Flags
ADMIN_REALTIME_UPDATES=true
ADMIN_ADVANCED_ANALYTICS=true
ADMIN_AUTOMATED_MODERATION=false
```

## Error Handling

```typescript
import { 
  AdminModuleError, 
  AdminPermissionError, 
  AdminOperationError 
} from '@cvplus/admin';

try {
  await userService.deleteUser('user-id');
} catch (error) {
  if (error instanceof AdminPermissionError) {
    console.error('Permission denied:', error.message);
  } else if (error instanceof AdminOperationError) {
    console.error('Operation failed:', error.message, error.context);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Performance Monitoring

```typescript
import { performanceMonitor } from '@cvplus/admin';

// Monitor async operations
const result = await performanceMonitor.measureAsync(
  'user-bulk-operation',
  () => userService.performBulkOperation(adminId, operation)
);

// Manual timing
const timer = performanceMonitor.startTimer('dashboard-load');
const dashboard = await dashboardService.loadDashboard(adminId);
const duration = timer.end(); // Logs duration automatically
```

## Caching

```typescript
import { adminCache } from '@cvplus/admin';

// Cache dashboard data
adminCache.set('dashboard:admin-123', dashboardData, 300000); // 5 minutes TTL

// Retrieve cached data
const cachedDashboard = adminCache.get<DashboardData>('dashboard:admin-123');

// Clear specific cache
adminCache.delete('dashboard:admin-123');

// Clear all cache
adminCache.clear();
```

## Testing

```typescript
import { checkAdminModuleHealth } from '@cvplus/admin';

// Check module health
const health = await checkAdminModuleHealth();
console.log('Module status:', health.status);
console.log('Dependencies:', health.dependencies);
```

## TypeScript Support

The module is written in TypeScript and provides comprehensive type definitions:

```typescript
import type {
  AdminDashboard,
  AdminPermissions,
  UserManagementOverview,
  ContentModerationResult,
  SystemHealthStatus,
  SecurityAuditOverview
} from '@cvplus/admin';
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run tests: `npm test`
6. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- Documentation: [https://docs.cvplus.com/admin](https://docs.cvplus.com/admin)
- Issues: [GitHub Issues](https://github.com/cvplus/cvplus/issues)
- Email: support@cvplus.com