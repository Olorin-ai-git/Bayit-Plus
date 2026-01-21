# Video Monitoring & Analytics System - Deployment Guide

**Author**: Gil Klainert  
**Created**: 2025-08-21  
**Version**: 1.0.0  
**Project**: CVPlus Enhanced Video Generation Platform

## Deployment Overview

This guide provides step-by-step instructions for deploying the comprehensive video generation monitoring and analytics system to production. The system provides real-time performance tracking, quality analysis, business intelligence, and intelligent alerting.

## Prerequisites

### System Requirements
- Firebase Functions with Node.js 18+
- Firestore database with appropriate indexes
- Firebase Admin SDK access
- 2GB+ memory allocation for analytics functions
- Premium Firebase plan for extended function timeout

### Dependencies Verification
```bash
# Verify Node.js version
node --version  # Should be 18.x or higher

# Check Firebase CLI
firebase --version  # Should be latest version

# Verify project access
firebase projects:list
firebase use cvplus-app  # Replace with your project ID
```

## Step 1: Database Setup

### Create Firestore Collections and Indexes

```javascript
// Run this script to create required Firestore indexes
const setupIndexes = async () => {
  // Performance metrics indexes
  await admin.firestore().collection('video_generation_metrics')
    .doc('_index_setup')
    .set({
      indexes: [
        'startTime ASC',
        'status ASC, startTime DESC',
        'userId ASC, startTime DESC',
        'providerId ASC, startTime DESC',
        'success ASC, startTime DESC'
      ]
    });

  // Analytics events indexes
  await admin.firestore().collection('analytics_events')
    .doc('_index_setup')
    .set({
      indexes: [
        'timestamp ASC',
        'userId ASC, timestamp DESC',
        'eventType ASC, timestamp DESC',
        'featureUsed ASC, timestamp DESC'
      ]
    });

  // Alert instances indexes
  await admin.firestore().collection('alert_instances')
    .doc('_index_setup')
    .set({
      indexes: [
        'status ASC, triggeredAt DESC',
        'ruleId ASC, triggeredAt DESC',
        'severity ASC, triggeredAt DESC'
      ]
    });

  console.log('Database indexes setup completed');
};
```

### Create Firestore Security Rules

```javascript
// Add to firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Video generation metrics - admin and analytics users only
    match /video_generation_metrics/{document} {
      allow read, write: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         isAdmin(request.auth.uid) || 
         hasRole(request.auth.uid, 'analytics'));
    }
    
    // Analytics events - authenticated users can create their own
    match /analytics_events/{document} {
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
      allow read: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         isAdmin(request.auth.uid) || 
         hasRole(request.auth.uid, 'analytics'));
    }
    
    // Alert rules and instances - admin only
    match /alert_rules/{document} {
      allow read, write: if isAdmin(request.auth.uid);
    }
    
    match /alert_instances/{document} {
      allow read, write: if isAdmin(request.auth.uid) || 
        hasRole(request.auth.uid, 'analytics');
    }
    
    // Analytics dashboards - premium users and admins
    match /business_metrics/{document} {
      allow read: if request.auth != null && 
        (isPremiumUser(request.auth.uid) || 
         isAdmin(request.auth.uid) || 
         hasRole(request.auth.uid, 'analytics'));
    }
    
    // Helper functions
    function isAdmin(userId) {
      return get(/databases/$(database)/documents/users/$(userId)).data.isAdmin == true;
    }
    
    function hasRole(userId, role) {
      return get(/databases/$(database)/documents/users/$(userId)).data.role == role;
    }
    
    function isPremiumUser(userId) {
      return get(/databases/$(database)/documents/users/$(userId)).data.isPremium == true;
    }
  }
}
```

## Step 2: Environment Configuration

### Firebase Functions Configuration

Add the following environment variables:

```bash
# Set monitoring configuration
firebase functions:config:set monitoring.enabled=true
firebase functions:config:set monitoring.alert_email="alerts@cvplus.ai"
firebase functions:config:set monitoring.slack_webhook="https://hooks.slack.com/..."

# Set analytics configuration
firebase functions:config:set analytics.enabled=true
firebase functions:config:set analytics.retention_days=90
firebase functions:config:set analytics.aggregation_interval="1h"

# Set alert configuration
firebase functions:config:set alerts.email_enabled=true
firebase functions:config:set alerts.slack_enabled=true
firebase functions:config:set alerts.sms_enabled=false
```

### Update functions/package.json

Ensure the package.json includes required dependencies:

```json
{
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^4.5.0",
    "cors": "^2.8.5"
  },
  "engines": {
    "node": "18"
  }
}
```

## Step 3: Function Deployment

### Deploy Core Monitoring Services

```bash
# Deploy performance monitoring service
firebase deploy --only functions:videoAnalyticsDashboard

# Deploy specific monitoring functions (if needed individually)
firebase deploy --only functions:generateVideoIntroduction
firebase deploy --only functions:enhancedVideoGeneration

# Deploy all functions (full deployment)
firebase deploy --only functions
```

### Verify Deployment

```bash
# Check function deployment status
firebase functions:log --only videoAnalyticsDashboard

# Test dashboard endpoint
curl -X GET "https://us-central1-cvplus-app.cloudfunctions.net/videoAnalyticsDashboard?path=summary" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

## Step 4: Integration with Existing Services

### Update Enhanced Video Generation Service

Add monitoring hooks to existing video generation functions:

```typescript
// In your existing video generation function
import { VideoGenerationMonitor } from '../services/video-monitoring-hooks.service';

export const generateVideoIntroduction = onCall(async (request) => {
  const monitor = new VideoGenerationMonitor(
    request.auth.uid,
    request.data.jobId,
    'enhanced'
  );

  try {
    // Start monitoring
    await monitor.start(enhancedOptions);

    // Your existing video generation logic
    const result = await enhancedVideoGenerationService.generateVideoIntroduction(
      cvData,
      enhancedOptions,
      jobId,
      userId
    );

    // Complete monitoring
    await monitor.complete({
      success: true,
      videoUrl: result.videoUrl,
      metadata: result.metadata
    });

    return result;

  } catch (error) {
    await monitor.recordError(error);
    await monitor.complete({ success: false, error });
    throw error;
  }
});
```

### Update Provider Services

Add monitoring to provider fallback logic:

```typescript
// In your provider selection service
import { VideoMonitoringHooks } from '../services/video-monitoring-hooks.service';

// When switching providers
await VideoMonitoringHooks.onProviderSwitch(
  generationId,
  fromProvider,
  toProvider,
  'provider_failure'
);

// When recording quality scores
await VideoMonitoringHooks.onQualityAssessment(
  generationId,
  qualityScore,
  qualityFactors
);
```

## Step 5: Alert Configuration

### Configure Notification Channels

```typescript
// Email configuration (in your environment config)
const emailConfig = {
  service: 'gmail',
  auth: {
    user: process.env.ALERT_EMAIL_USER,
    pass: process.env.ALERT_EMAIL_PASS
  }
};

// Slack configuration
const slackConfig = {
  webhookUrl: process.env.SLACK_WEBHOOK_URL,
  channel: '#cvplus-alerts',
  username: 'CVPlus Monitoring'
};
```

### Setup Alert Rules

The system includes default alert rules, but you can customize them:

```typescript
// Custom alert rule example
const customAlertRule = {
  ruleId: 'custom_quality_alert',
  name: 'Custom Quality Alert',
  description: 'Alert when video quality drops below 7.5',
  type: 'quality',
  metric: 'average_quality_score',
  condition: 'below',
  threshold: 7.5,
  severity: 'medium',
  enabled: true,
  cooldownMinutes: 30,
  notificationChannels: [
    {
      channelId: 'quality_team_email',
      type: 'email',
      configuration: { recipient: 'quality@cvplus.ai' },
      severity: ['medium', 'high']
    }
  ]
};
```

## Step 6: Dashboard Setup

### Frontend Integration

Create dashboard components that consume the analytics API:

```typescript
// Dashboard API client
class VideoAnalyticsClient {
  async getDashboardSummary(authToken: string) {
    const response = await fetch(
      'https://us-central1-cvplus-app.cloudfunctions.net/videoAnalyticsDashboard?path=summary',
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.json();
  }

  async getPerformanceMetrics(authToken: string, timeRange: string = '24h') {
    const response = await fetch(
      `https://us-central1-cvplus-app.cloudfunctions.net/videoAnalyticsDashboard?path=performance&timeRange=${timeRange}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.json();
  }
}
```

### React Dashboard Component

```typescript
// Dashboard component example
import React, { useState, useEffect } from 'react';

export const VideoAnalyticsDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const client = new VideoAnalyticsClient();
        const authToken = await getCurrentUserToken();
        const data = await client.getDashboardSummary(authToken);
        setDashboardData(data);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) {
    return <div>Loading analytics dashboard...</div>;
  }

  return (
    <div className="analytics-dashboard">
      <h2>Video Generation Analytics</h2>
      {dashboardData && (
        <>
          <div className="performance-metrics">
            <h3>Performance</h3>
            <p>Success Rate: {(dashboardData.performance.successRate * 100).toFixed(1)}%</p>
            <p>Avg Generation Time: {dashboardData.performance.averageGenerationTime}ms</p>
            <p>Active Generations: {dashboardData.performance.activeGenerations}</p>
          </div>
          
          <div className="quality-metrics">
            <h3>Quality</h3>
            <p>Overall Score: {dashboardData.quality.overallScore.toFixed(1)}/10</p>
            <p>User Satisfaction: {dashboardData.quality.userSatisfaction.toFixed(1)}/5</p>
            <p>Trend: {dashboardData.quality.trend}</p>
          </div>
          
          <div className="business-metrics">
            <h3>Business</h3>
            <p>Total Revenue: ${dashboardData.business.totalRevenue.toFixed(2)}</p>
            <p>Conversion Rate: {(dashboardData.business.conversionRate * 100).toFixed(1)}%</p>
            <p>Active Users: {dashboardData.business.activeUsers}</p>
          </div>
        </>
      )}
    </div>
  );
};
```

## Step 7: Testing and Validation

### Run Automated Tests

```bash
# Run monitoring system tests
cd functions
npm test -- --testPathPattern=video-monitoring-system.test.ts

# Run integration tests
npm test -- --testPathPattern=video-generation-enhanced.integration.test.ts
```

### Manual Testing Checklist

- [ ] Video generation triggers performance monitoring
- [ ] Analytics data is collected and aggregated
- [ ] Alerts are triggered for threshold violations
- [ ] Dashboard displays real-time data
- [ ] Provider switches are tracked correctly
- [ ] Quality assessments are recorded
- [ ] User feedback is captured
- [ ] Error scenarios are handled gracefully

### Performance Testing

```bash
# Load test the monitoring system
node scripts/load-test-monitoring.js

# Test alert response times
node scripts/test-alert-response.js

# Validate dashboard performance
node scripts/test-dashboard-performance.js
```

## Step 8: Monitoring System Health

### Create Health Check Endpoints

```typescript
// Health check function
export const monitoringSystemHealth = onCall(async (request) => {
  const status = await VideoMonitoringHooks.getStatus();
  
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    monitoring: {
      enabled: true,
      activeGenerations: status.activeGenerations,
      systemHealth: status.systemHealth
    },
    services: {
      performanceMonitor: 'operational',
      analyticsEngine: 'operational',
      alertManager: 'operational',
      dashboard: 'operational'
    }
  };
});
```

### Setup CloudWatch/Monitoring Alerts

```bash
# Create monitoring alerts for the monitoring system itself
firebase projects:setup-monitoring --alerts
```

## Step 9: Backup and Recovery

### Data Backup Strategy

```typescript
// Backup critical monitoring data
export const backupMonitoringData = functions.pubsub
  .schedule('0 2 * * *') // Daily at 2 AM
  .onRun(async (context) => {
    const bucket = admin.storage().bucket();
    const collections = [
      'video_generation_metrics',
      'analytics_events',
      'alert_instances',
      'business_metrics'
    ];

    for (const collection of collections) {
      await backupCollection(collection, bucket);
    }
  });
```

### Recovery Procedures

Document recovery procedures for:
- Database restoration
- Function redeployment
- Alert configuration recovery
- Dashboard reconfiguration

## Step 10: Production Rollout

### Gradual Rollout Strategy

1. **Phase 1 (Week 1)**: Deploy monitoring for 10% of video generations
2. **Phase 2 (Week 2)**: Increase to 50% with alert monitoring
3. **Phase 3 (Week 3)**: Full rollout with dashboard access
4. **Phase 4 (Week 4)**: Advanced analytics and business intelligence

### Monitoring Rollout

```typescript
// Feature flag for gradual rollout
const MONITORING_ROLLOUT_PERCENTAGE = parseInt(
  process.env.MONITORING_ROLLOUT_PERCENTAGE || '100'
);

function shouldEnableMonitoring(userId: string): boolean {
  const hash = crypto.createHash('md5').update(userId).digest('hex');
  const hashInt = parseInt(hash.substring(0, 8), 16);
  return (hashInt % 100) < MONITORING_ROLLOUT_PERCENTAGE;
}
```

## Step 11: Documentation and Training

### User Documentation

Create documentation for:
- Dashboard usage guide
- Alert interpretation guide
- Performance optimization recommendations
- Troubleshooting common issues

### Team Training

Provide training on:
- Reading analytics dashboards
- Responding to alerts
- Using monitoring data for optimization
- Debugging video generation issues

## Success Metrics

### Deployment Success Criteria

- [ ] All monitoring functions deployed successfully
- [ ] Database indexes created and optimized
- [ ] Real-time data collection operational
- [ ] Alert system functional and tested
- [ ] Dashboard accessible to authorized users
- [ ] Integration with existing video generation complete
- [ ] Performance impact within acceptable limits (<5% overhead)

### Operational Success Criteria

- [ ] 99.9% monitoring system uptime
- [ ] <1 second dashboard response time
- [ ] <5% false positive alert rate
- [ ] 100% coverage of video generation events
- [ ] Successful alert escalation procedures

## Troubleshooting Guide

### Common Issues

**Issue**: Dashboard shows no data
- **Solution**: Check Firestore permissions and indexes
- **Verification**: Run test queries on collections

**Issue**: Alerts not triggering
- **Solution**: Verify alert rules configuration
- **Verification**: Run manual alert check

**Issue**: Performance degradation
- **Solution**: Check function memory allocation
- **Verification**: Monitor function execution times

**Issue**: Missing video generation events
- **Solution**: Verify monitoring hooks integration
- **Verification**: Check function logs for monitoring calls

### Support Contacts

- **Technical Issues**: engineering@cvplus.ai
- **Dashboard Access**: admin@cvplus.ai
- **Alert Configuration**: alerts@cvplus.ai

## Conclusion

The video generation monitoring and analytics system provides comprehensive visibility into the performance, quality, and business impact of CVPlus's video generation platform. Following this deployment guide ensures a successful rollout with minimal disruption to existing services while providing immediate value through real-time insights and intelligent alerting.

Regular monitoring of the monitoring system itself ensures continued reliability and performance as the platform scales.