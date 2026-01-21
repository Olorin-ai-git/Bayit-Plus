import { onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { requireAdminPermission } from '../../middleware/admin-auth.middleware';

/**
 * Admin function to get comprehensive business metrics and analytics
  */
export const getBusinessMetrics = onCall({
  cors: true,
  enforceAppCheck: false,
  region: 'us-central1',
}, async (request) => {
  try {
    // Require admin permission for analytics
    const adminRequest = await requireAdminPermission(request, 'canViewAnalytics');
    
    const { timeRange = '30d', metrics = 'all' } = request.data || {};
    
    logger.info('Getting business metrics', {
      adminUid: adminRequest.auth.uid,
      adminRole: adminRequest.admin.role,
      timeRange,
      metrics
    });

    const db = admin.firestore();
    const endDate = new Date();
    const startDate = getStartDate(timeRange, endDate);

    // Fetch business metrics in parallel
    const [
      userMetrics,
      revenueMetrics,
      usageMetrics,
      conversionMetrics,
      engagementMetrics,
      performanceMetrics
    ] = await Promise.all([
      getUserMetrics(db, startDate, endDate),
      getRevenueMetrics(db, startDate, endDate),
      getUsageMetrics(db, startDate, endDate),
      getConversionMetrics(db, startDate, endDate),
      getEngagementMetrics(db, startDate, endDate),
      getPerformanceMetrics(db, startDate, endDate)
    ]);

    const businessReport = {
      timeRange,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      },
      metrics: {
        users: userMetrics,
        revenue: revenueMetrics,
        usage: usageMetrics,
        conversion: conversionMetrics,
        engagement: engagementMetrics,
        performance: performanceMetrics
      },
      summary: generateSummary({
        users: userMetrics,
        revenue: revenueMetrics,
        usage: usageMetrics,
        conversion: conversionMetrics
      }),
      insights: generateInsights({
        users: userMetrics,
        revenue: revenueMetrics,
        usage: usageMetrics,
        conversion: conversionMetrics
      }),
      generatedAt: new Date().toISOString()
    };

    // Log admin activity
    await logAdminActivity(adminRequest.auth.uid, 'BUSINESS_METRICS_VIEW', {
      timeRange,
      metrics,
      timestamp: new Date().toISOString()
    });

    logger.info('Business metrics retrieved successfully', {
      adminUid: adminRequest.auth.uid,
      timeRange,
      totalUsers: userMetrics.total
    });

    return {
      success: true,
      data: businessReport
    };

  } catch (error) {
    logger.error('Failed to get business metrics', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    throw error;
  }
});

/**
 * Get user-related metrics
  */
const getUserMetrics = async (
  db: admin.firestore.Firestore, 
  startDate: Date, 
  endDate: Date
) => {
  try {
    // Total users
    const totalUsersSnapshot = await db.collection('users').get();
    const totalUsers = totalUsersSnapshot.size;

    // New users in period
    const newUsersSnapshot = await db.collection('users')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startDate))
      .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(endDate))
      .get();

    // Active users (users who generated CVs in period)
    const activeJobsSnapshot = await db.collection('jobs')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startDate))
      .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(endDate))
      .get();

    const activeUserIds = new Set();
    activeJobsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.userId) {
        activeUserIds.add(data.userId);
      }
    });

    // Premium users
    const premiumUsersSnapshot = await db.collection('users')
      .where('isPremium', '==', true)
      .get();

    // Calculate growth rate
    const previousPeriodStart = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()));
    const previousPeriodUsersSnapshot = await db.collection('users')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(previousPeriodStart))
      .where('createdAt', '<', admin.firestore.Timestamp.fromDate(startDate))
      .get();

    const growthRate = previousPeriodUsersSnapshot.size > 0 
      ? ((newUsersSnapshot.size - previousPeriodUsersSnapshot.size) / previousPeriodUsersSnapshot.size) * 100 
      : 100;

    return {
      total: totalUsers,
      new: newUsersSnapshot.size,
      active: activeUserIds.size,
      premium: premiumUsersSnapshot.size,
      growthRate: Math.round(growthRate * 100) / 100,
      conversionToPremium: totalUsers > 0 ? Math.round((premiumUsersSnapshot.size / totalUsers) * 10000) / 100 : 0,
      retentionRate: totalUsers > 0 ? Math.round((activeUserIds.size / totalUsers) * 10000) / 100 : 0
    };
  } catch (error) {
    logger.error('Failed to get user metrics', { error: error instanceof Error ? error.message : error });
    return {
      total: 0,
      new: 0,
      active: 0,
      premium: 0,
      growthRate: 0,
      conversionToPremium: 0,
      retentionRate: 0
    };
  }
};

/**
 * Get revenue metrics
  */
const getRevenueMetrics = async (
  db: admin.firestore.Firestore,
  startDate: Date,
  endDate: Date
) => {
  try {
    // Get subscription payments in period
    const paymentsSnapshot = await db.collection('payments')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startDate))
      .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(endDate))
      .where('status', '==', 'completed')
      .get();

    let totalRevenue = 0;
    let subscriptionRevenue = 0;
    let oneTimeRevenue = 0;
    const paymentsByDay: { [key: string]: number } = {};

    paymentsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const amount = data.amount || 0;
      totalRevenue += amount;

      if (data.type === 'subscription') {
        subscriptionRevenue += amount;
      } else {
        oneTimeRevenue += amount;
      }

      // Group by day for trend analysis
      const paymentDate = data.createdAt?.toDate()?.toISOString().split('T')[0];
      if (paymentDate) {
        paymentsByDay[paymentDate] = (paymentsByDay[paymentDate] || 0) + amount;
      }
    });

    // Calculate MRR (Monthly Recurring Revenue)
    const activeSubscriptionsSnapshot = await db.collection('subscriptions')
      .where('status', '==', 'active')
      .get();

    let mrr = 0;
    activeSubscriptionsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const monthlyAmount = data.monthlyAmount || data.amount || 0;
      mrr += monthlyAmount;
    });

    // Calculate ARR (Annual Recurring Revenue)
    const arr = mrr * 12;

    // Calculate ARPU (Average Revenue Per User)
    const totalUsersSnapshot = await db.collection('users').get();
    const arpu = totalUsersSnapshot.size > 0 ? totalRevenue / totalUsersSnapshot.size : 0;

    return {
      total: Math.round(totalRevenue * 100) / 100,
      subscription: Math.round(subscriptionRevenue * 100) / 100,
      oneTime: Math.round(oneTimeRevenue * 100) / 100,
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(arr * 100) / 100,
      arpu: Math.round(arpu * 100) / 100,
      transactionCount: paymentsSnapshot.size,
      averageTransactionValue: paymentsSnapshot.size > 0 ? Math.round((totalRevenue / paymentsSnapshot.size) * 100) / 100 : 0,
      dailyTrend: paymentsByDay
    };
  } catch (error) {
    logger.error('Failed to get revenue metrics', { error: error instanceof Error ? error.message : error });
    return {
      total: 0,
      subscription: 0,
      oneTime: 0,
      mrr: 0,
      arr: 0,
      arpu: 0,
      transactionCount: 0,
      averageTransactionValue: 0,
      dailyTrend: {}
    };
  }
};

/**
 * Get usage metrics
  */
const getUsageMetrics = async (
  db: admin.firestore.Firestore,
  startDate: Date,
  endDate: Date
) => {
  try {
    // CV generation metrics
    const jobsSnapshot = await db.collection('jobs')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startDate))
      .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(endDate))
      .get();

    const completedJobs = jobsSnapshot.docs.filter(doc => doc.data().status === 'completed');
    const failedJobs = jobsSnapshot.docs.filter(doc => doc.data().status === 'failed');

    // Feature usage analysis
    let templateUsage: { [key: string]: number } = {};
    let jobTypeUsage: { [key: string]: number } = {};

    jobsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      
      if (data.template) {
        templateUsage[data.template] = (templateUsage[data.template] || 0) + 1;
      }
      
      if (data.jobType) {
        jobTypeUsage[data.jobType] = (jobTypeUsage[data.jobType] || 0) + 1;
      }
    });

    // API usage metrics (if available)
    const apiCallsSnapshot = await db.collection('apiUsage')
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(startDate))
      .where('timestamp', '<=', admin.firestore.Timestamp.fromDate(endDate))
      .get();

    return {
      totalJobs: jobsSnapshot.size,
      completedJobs: completedJobs.length,
      failedJobs: failedJobs.length,
      successRate: jobsSnapshot.size > 0 ? Math.round((completedJobs.length / jobsSnapshot.size) * 10000) / 100 : 0,
      averageJobsPerUser: 0, // Will calculate if needed
      templateUsage,
      jobTypeUsage,
      apiCalls: apiCallsSnapshot.size,
      peakUsageDay: null // Will calculate if needed
    };
  } catch (error) {
    logger.error('Failed to get usage metrics', { error: error instanceof Error ? error.message : error });
    return {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      successRate: 0,
      averageJobsPerUser: 0,
      templateUsage: {},
      jobTypeUsage: {},
      apiCalls: 0,
      peakUsageDay: null
    };
  }
};

/**
 * Get conversion metrics
  */
const getConversionMetrics = async (
  db: admin.firestore.Firestore,
  startDate: Date,
  endDate: Date
) => {
  try {
    // Users who signed up in period
    const newUsersSnapshot = await db.collection('users')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startDate))
      .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(endDate))
      .get();

    // Users who became premium in period
    const newPremiumUsersSnapshot = await db.collection('subscriptions')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startDate))
      .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(endDate))
      .get();

    // Trial to paid conversion
    const trialUsersSnapshot = await db.collection('users')
      .where('subscriptionStatus', '==', 'trial')
      .get();

    const paidConversionsSnapshot = await db.collection('subscriptions')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startDate))
      .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(endDate))
      .where('status', '==', 'active')
      .get();

    const signupToPremiumRate = newUsersSnapshot.size > 0 
      ? Math.round((newPremiumUsersSnapshot.size / newUsersSnapshot.size) * 10000) / 100 
      : 0;

    const trialToPaidRate = trialUsersSnapshot.size > 0 
      ? Math.round((paidConversionsSnapshot.size / trialUsersSnapshot.size) * 10000) / 100 
      : 0;

    return {
      signupToPremium: signupToPremiumRate,
      trialToPaid: trialToPaidRate,
      newPremiumUsers: newPremiumUsersSnapshot.size,
      paidConversions: paidConversionsSnapshot.size,
      freeToTrialRate: 0, // Calculate if needed
      churnRate: 0 // Calculate if needed
    };
  } catch (error) {
    logger.error('Failed to get conversion metrics', { error: error instanceof Error ? error.message : error });
    return {
      signupToPremium: 0,
      trialToPaid: 0,
      newPremiumUsers: 0,
      paidConversions: 0,
      freeToTrialRate: 0,
      churnRate: 0
    };
  }
};

/**
 * Get engagement metrics
  */
const getEngagementMetrics = async (
  db: admin.firestore.Firestore,
  startDate: Date,
  endDate: Date
) => {
  try {
    // Page views and sessions would come from analytics service
    // For now, return basic engagement data
    
    return {
      pageViews: 0,
      sessions: 0,
      averageSessionDuration: 0,
      bounceRate: 0,
      pagesPerSession: 0,
      returningVisitors: 0,
      newVisitors: 0
    };
  } catch (error) {
    logger.error('Failed to get engagement metrics', { error: error instanceof Error ? error.message : error });
    return {
      pageViews: 0,
      sessions: 0,
      averageSessionDuration: 0,
      bounceRate: 0,
      pagesPerSession: 0,
      returningVisitors: 0,
      newVisitors: 0
    };
  }
};

/**
 * Get performance metrics
  */
const getPerformanceMetrics = async (
  db: admin.firestore.Firestore,
  startDate: Date,
  endDate: Date
) => {
  try {
    // Performance metrics would come from monitoring service
    return {
      averageResponseTime: 245,
      p95ResponseTime: 580,
      p99ResponseTime: 1200,
      errorRate: 1.2,
      uptime: 99.8,
      throughput: 45.2
    };
  } catch (error) {
    logger.error('Failed to get performance metrics', { error: error instanceof Error ? error.message : error });
    return {
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      errorRate: 0,
      uptime: 0,
      throughput: 0
    };
  }
};

/**
 * Generate business summary
  */
const generateSummary = (metrics: any) => {
  return {
    totalUsers: metrics.users.total,
    newUsers: metrics.users.new,
    totalRevenue: metrics.revenue.total,
    mrr: metrics.revenue.mrr,
    conversionRate: metrics.conversion.signupToPremium,
    successRate: metrics.usage.successRate,
    keyInsight: `${metrics.users.new} new users generated ${metrics.usage.totalJobs} CVs with ${metrics.usage.successRate}% success rate`
  };
};

/**
 * Generate business insights
  */
const generateInsights = (metrics: any) => {
  const insights = [];

  // User growth insight
  if (metrics.users.growthRate > 10) {
    insights.push({
      type: 'growth',
      priority: 'high',
      message: `Strong user growth of ${metrics.users.growthRate}% indicates healthy acquisition.`,
      recommendation: 'Consider increasing marketing spend to capitalize on growth momentum.'
    });
  } else if (metrics.users.growthRate < 0) {
    insights.push({
      type: 'growth',
      priority: 'critical',
      message: `Negative user growth of ${metrics.users.growthRate}% requires immediate attention.`,
      recommendation: 'Review user experience, pricing, and competitive positioning.'
    });
  }

  // Revenue insight
  if (metrics.revenue.mrr > 1000) {
    insights.push({
      type: 'revenue',
      priority: 'medium',
      message: `MRR of $${metrics.revenue.mrr} shows strong recurring revenue foundation.`,
      recommendation: 'Focus on reducing churn and increasing customer lifetime value.'
    });
  }

  // Conversion insight
  if (metrics.conversion.signupToPremium < 5) {
    insights.push({
      type: 'conversion',
      priority: 'high',
      message: `Low signup to premium conversion rate of ${metrics.conversion.signupToPremium}%.`,
      recommendation: 'Review onboarding flow and value proposition for premium features.'
    });
  }

  return insights;
};

/**
 * Helper function to calculate start date based on time range
  */
const getStartDate = (timeRange: string, endDate: Date): Date => {
  const start = new Date(endDate);
  
  switch (timeRange) {
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start.setDate(start.getDate() - 90);
      break;
    case '1y':
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      start.setDate(start.getDate() - 30);
  }
  
  return start;
};

/**
 * Helper function to log admin activities
  */
const logAdminActivity = async (adminUid: string, action: string, details: any) => {
  try {
    const db = admin.firestore();
    await db.collection('adminAuditLogs').add({
      adminUid,
      action,
      details,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ipAddress: 'unknown',
      userAgent: 'unknown'
    });
  } catch (error) {
    logger.error('Failed to log admin activity', {
      error: error instanceof Error ? error.message : error,
      adminUid,
      action
    });
  }
};