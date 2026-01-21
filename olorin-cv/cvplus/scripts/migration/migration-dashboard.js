#!/usr/bin/env node

/**
 * CVPlus Migration Dashboard
 * 
 * Real-time monitoring dashboard for the progressive migration process.
 * Provides live monitoring of migration progress, health metrics, and system status.
 * 
 * Features:
 * - Real-time migration progress tracking
 * - Health metrics monitoring (error rates, latency, throughput)
 * - Service status visualization
 * - Automatic rollback detection and alerts
 * - Performance comparison between legacy and package services
 * 
 * Usage:
 *   node migration-dashboard.js [mode]
 *   
 * Modes:
 *   - monitor: Real-time monitoring (default)
 *   - summary: Migration summary report
 *   - health: Health check report
 *   - rollback: Rollback status monitoring
 * 
 * @author Gil Klainert
 * @version 1.0.0
 * @date 2025-08-27
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    admin.initializeApp();
  } catch (error) {
    console.error('Failed to initialize Firebase:', error.message);
    process.exit(1);
  }
}

const db = admin.firestore();

// Dashboard configuration
const CONFIG = {
  refreshInterval: 5000, // 5 seconds
  maxLogEntries: 50,
  healthThresholds: {
    errorRate: 5.0,        // 5%
    latency: 1000,         // 1000ms
    userSuccessRate: 95.0  // 95%
  },
  colors: {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bright: '\x1b[1m',
    dim: '\x1b[2m'
  }
};

// Service definitions
const SERVICES = [
  { id: 'CVAnalyzer', phase: 1, risk: 'LOW' },
  { id: 'ImprovementOrchestrator', phase: 1, risk: 'LOW' },
  { id: 'CacheManager', phase: 2, risk: 'MEDIUM' },
  { id: 'RecommendationGenerator', phase: 2, risk: 'MEDIUM' },
  { id: 'CircuitBreakerCore', phase: 3, risk: 'CRITICAL' },
  { id: 'RecommendationOrchestrator', phase: 3, risk: 'CRITICAL' },
  { id: 'ActionOrchestrator', phase: 3, risk: 'CRITICAL' }
];

// Utility functions
const { colors } = CONFIG;

const colorize = (text, color) => `${color}${text}${colors.reset}`;
const bold = (text) => `${colors.bright}${text}${colors.reset}`;
const dim = (text) => `${colors.dim}${text}${colors.reset}`;

const formatPercent = (value) => `${value.toFixed(1)}%`;
const formatLatency = (value) => `${Math.round(value)}ms`;
const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'Unknown';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString();
};

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'healthy': case 'completed': case 'success': return colors.green;
    case 'warning': case 'degraded': return colors.yellow;
    case 'unhealthy': case 'failed': case 'error': return colors.red;
    case 'migrating': case 'in_progress': return colors.cyan;
    default: return colors.white;
  }
};

const getRiskColor = (risk) => {
  switch (risk) {
    case 'LOW': return colors.green;
    case 'MEDIUM': return colors.yellow;
    case 'CRITICAL': return colors.red;
    default: return colors.white;
  }
};

/**
 * Migration Dashboard Class
 */
class MigrationDashboard {
  constructor(mode = 'monitor') {
    this.mode = mode;
    this.isRunning = false;
    this.refreshTimer = null;
    this.migrationData = {
      progress: {},
      health: {},
      logs: [],
      rollbacks: [],
      checkpoints: []
    };
  }

  /**
   * Start the dashboard
   */
  async start() {
    console.clear();
    this.displayHeader();
    
    switch (this.mode) {
      case 'monitor':
        await this.startMonitoring();
        break;
      case 'summary':
        await this.displaySummary();
        break;
      case 'health':
        await this.displayHealthReport();
        break;
      case 'rollback':
        await this.displayRollbackStatus();
        break;
      default:
        console.error('Unknown mode:', this.mode);
        process.exit(1);
    }
  }

  /**
   * Display dashboard header
   */
  displayHeader() {
    const title = bold('CVPlus Progressive Migration Dashboard');
    const subtitle = `Mode: ${this.mode} | Refresh: ${CONFIG.refreshInterval / 1000}s`;
    const timestamp = new Date().toLocaleString();
    
    console.log(colorize('╔' + '═'.repeat(78) + '╗', colors.cyan));
    console.log(colorize(`║${title.padStart(45).padEnd(78)}║`, colors.cyan));
    console.log(colorize(`║${subtitle.padStart(30).padEnd(78)}║`, colors.cyan));
    console.log(colorize(`║${timestamp.padStart(25).padEnd(78)}║`, colors.cyan));
    console.log(colorize('╚' + '═'.repeat(78) + '╝', colors.cyan));
    console.log();
  }

  /**
   * Start real-time monitoring
   */
  async startMonitoring() {
    this.isRunning = true;
    
    // Setup graceful shutdown
    process.on('SIGINT', () => {
      console.log(colorize('\n\nShutting down dashboard...', colors.yellow));
      this.stop();
    });
    
    // Initial data load
    await this.refreshData();
    this.displayDashboard();
    
    // Start refresh timer
    this.refreshTimer = setInterval(async () => {
      if (this.isRunning) {
        await this.refreshData();
        console.clear();
        this.displayHeader();
        this.displayDashboard();
      }
    }, CONFIG.refreshInterval);
  }

  /**
   * Stop monitoring
   */
  stop() {
    this.isRunning = false;
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    process.exit(0);
  }

  /**
   * Refresh all dashboard data
   */
  async refreshData() {
    try {
      await Promise.all([
        this.refreshMigrationProgress(),
        this.refreshHealthMetrics(),
        this.refreshMigrationLogs(),
        this.refreshRollbackEvents(),
        this.refreshMigrationCheckpoints()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error.message);
    }
  }

  /**
   * Refresh migration progress data
   */
  async refreshMigrationProgress() {
    try {
      const flagsSnapshot = await db.collection('feature_flags').doc('migration_flags').get();
      const flags = flagsSnapshot.exists ? flagsSnapshot.data() : {};
      
      this.migrationData.progress = {};
      
      SERVICES.forEach(service => {
        const flagName = `${service.id.toLowerCase()}-package-enabled`;
        const flag = flags[flagName] || { enabled: false, rolloutPercentage: 0 };
        
        this.migrationData.progress[service.id] = {
          ...service,
          enabled: flag.enabled,
          percentage: flag.rolloutPercentage || 0,
          updatedAt: flag.updatedAt,
          status: this.getServiceStatus(flag)
        };
      });
    } catch (error) {
      console.error('Error fetching migration progress:', error.message);
    }
  }

  /**
   * Refresh health metrics
   */
  async refreshHealthMetrics() {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      // Get recent metrics for all services
      const metricsSnapshot = await db.collection('performance_metrics')
        .where('timestamp', '>=', fiveMinutesAgo)
        .orderBy('timestamp', 'desc')
        .limit(100)
        .get();
      
      const requestsSnapshot = await db.collection('request_logs')
        .where('timestamp', '>=', fiveMinutesAgo)
        .get();
      
      const errorsSnapshot = await db.collection('error_logs')
        .where('timestamp', '>=', fiveMinutesAgo)
        .get();
      
      const userActionsSnapshot = await db.collection('user_actions')
        .where('timestamp', '>=', fiveMinutesAgo)
        .get();
      
      // Process metrics by service
      this.migrationData.health = {};
      
      SERVICES.forEach(service => {
        const serviceMetrics = metricsSnapshot.docs
          .filter(doc => doc.data().serviceId === service.id)
          .map(doc => doc.data());
        
        const serviceRequests = requestsSnapshot.docs
          .filter(doc => doc.data().serviceId === service.id);
        
        const serviceErrors = errorsSnapshot.docs
          .filter(doc => doc.data().serviceId === service.id);
        
        const serviceUserActions = userActionsSnapshot.docs
          .filter(doc => doc.data().serviceId === service.id);
        
        // Calculate health metrics
        const latency = serviceMetrics.length > 0 
          ? serviceMetrics.reduce((sum, m) => sum + (m.latency || 0), 0) / serviceMetrics.length
          : 0;
        
        const errorRate = serviceRequests.length > 0
          ? (serviceErrors.length / serviceRequests.length) * 100
          : 0;
        
        const userSuccessRate = serviceUserActions.length > 0
          ? (serviceUserActions.filter(doc => doc.data().success === true).length / serviceUserActions.length) * 100
          : 100;
        
        this.migrationData.health[service.id] = {
          latency,
          errorRate,
          userSuccessRate,
          requestCount: serviceRequests.length,
          errorCount: serviceErrors.length,
          lastUpdate: serviceMetrics.length > 0 ? serviceMetrics[0].timestamp : null,
          status: this.getHealthStatus({ latency, errorRate, userSuccessRate })
        };
      });
    } catch (error) {
      console.error('Error fetching health metrics:', error.message);
    }
  }

  /**
   * Refresh migration logs
   */
  async refreshMigrationLogs() {
    try {
      const logsSnapshot = await db.collection('migration_logs')
        .orderBy('timestamp', 'desc')
        .limit(CONFIG.maxLogEntries)
        .get();
      
      this.migrationData.logs = logsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching migration logs:', error.message);
    }
  }

  /**
   * Refresh rollback events
   */
  async refreshRollbackEvents() {
    try {
      const rollbackSnapshot = await db.collection('rollback_events')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get();
      
      this.migrationData.rollbacks = rollbackSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching rollback events:', error.message);
    }
  }

  /**
   * Refresh migration checkpoints
   */
  async refreshMigrationCheckpoints() {
    try {
      const checkpointsSnapshot = await db.collection('migration_checkpoints')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get();
      
      this.migrationData.checkpoints = checkpointsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching migration checkpoints:', error.message);
    }
  }

  /**
   * Display main dashboard
   */
  displayDashboard() {
    this.displayMigrationProgress();
    this.displayHealthMetrics();
    this.displayRecentActivity();
    this.displaySystemStatus();
  }

  /**
   * Display migration progress section
   */
  displayMigrationProgress() {
    console.log(bold(colorize('📊 MIGRATION PROGRESS', colors.cyan)));
    console.log('─'.repeat(80));
    
    // Group services by phase
    const phases = { 1: [], 2: [], 3: [] };
    Object.values(this.migrationData.progress).forEach(service => {
      phases[service.phase].push(service);
    });
    
    Object.keys(phases).forEach(phaseNum => {
      const phaseServices = phases[phaseNum];
      if (phaseServices.length === 0) return;
      
      const phaseProgress = phaseServices.reduce((sum, s) => sum + s.percentage, 0) / phaseServices.length;
      const phaseStatus = this.getPhaseStatus(phaseServices);
      
      console.log(`\nPhase ${phaseNum} (${phaseStatus.risk} Risk): ${colorize(phaseStatus.label, getStatusColor(phaseStatus.label))}`);
      console.log(`Progress: ${this.getProgressBar(phaseProgress)} ${formatPercent(phaseProgress)}`);
      
      phaseServices.forEach(service => {
        const statusColor = getStatusColor(service.status);
        const riskColor = getRiskColor(service.risk);
        const bar = this.getProgressBar(service.percentage, 20);
        
        console.log(`  ${colorize(service.id.padEnd(25), colors.white)} ${bar} ` +
                   `${formatPercent(service.percentage).padStart(6)} ` +
                   `${colorize(service.status.padEnd(12), statusColor)} ` +
                   `${colorize(service.risk, riskColor)}`);
      });
    });
    
    console.log();
  }

  /**
   * Display health metrics section
   */
  displayHealthMetrics() {
    console.log(bold(colorize('💖 HEALTH METRICS', colors.green)));
    console.log('─'.repeat(80));
    
    const headers = ['Service', 'Status', 'Latency', 'Error Rate', 'Success Rate', 'Requests'];
    console.log(headers.map(h => bold(h.padEnd(12))).join(' '));
    console.log('─'.repeat(80));
    
    Object.keys(this.migrationData.health).forEach(serviceId => {
      const health = this.migrationData.health[serviceId];
      const statusColor = getStatusColor(health.status);
      
      const cells = [
        serviceId.padEnd(12),
        colorize(health.status.padEnd(12), statusColor),
        formatLatency(health.latency).padEnd(12),
        formatPercent(health.errorRate).padEnd(12),
        formatPercent(health.userSuccessRate).padEnd(12),
        health.requestCount.toString().padEnd(12)
      ];
      
      console.log(cells.join(' '));
    });
    
    console.log();
  }

  /**
   * Display recent activity section
   */
  displayRecentActivity() {
    console.log(bold(colorize('📋 RECENT ACTIVITY', colors.yellow)));
    console.log('─'.repeat(80));
    
    const recentLogs = this.migrationData.logs.slice(0, 8);
    
    if (recentLogs.length === 0) {
      console.log(dim('No recent activity'));
    } else {
      recentLogs.forEach(log => {
        const timestamp = formatTimestamp(log.timestamp);
        const levelColor = getStatusColor(log.level);
        const message = log.message.substring(0, 60) + (log.message.length > 60 ? '...' : '');
        
        console.log(`${dim(timestamp)} ${colorize(log.level.padEnd(8), levelColor)} ${message}`);
      });
    }
    
    console.log();
  }

  /**
   * Display system status section
   */
  displaySystemStatus() {
    const totalServices = SERVICES.length;
    const migratedServices = Object.values(this.migrationData.progress)
      .filter(s => s.percentage >= 100).length;
    const healthyServices = Object.values(this.migrationData.health)
      .filter(h => h.status === 'healthy').length;
    const recentRollbacks = this.migrationData.rollbacks.length;
    const completedCheckpoints = this.migrationData.checkpoints
      .filter(c => c.status === 'completed').length;
    
    console.log(bold(colorize('📈 SYSTEM STATUS', colors.magenta)));
    console.log('─'.repeat(80));
    console.log(`Migration Progress:   ${migratedServices}/${totalServices} services migrated`);
    console.log(`System Health:        ${healthyServices}/${totalServices} services healthy`);
    console.log(`Rollback Events:      ${recentRollbacks} recent rollbacks`);
    console.log(`Checkpoints:          ${completedCheckpoints} completed`);
    console.log(`Last Refresh:         ${new Date().toLocaleTimeString()}`);
    
    if (recentRollbacks > 0) {
      console.log(`\n${colorize('⚠️  Recent rollback events detected!', colors.red)}`);
    }
  }

  /**
   * Get service migration status
   */
  getServiceStatus(flag) {
    if (!flag.enabled && flag.rolloutPercentage === 0) return 'pending';
    if (flag.enabled && flag.rolloutPercentage < 100) return 'migrating';
    if (flag.enabled && flag.rolloutPercentage >= 100) return 'completed';
    return 'unknown';
  }

  /**
   * Get phase status
   */
  getPhaseStatus(services) {
    const avgProgress = services.reduce((sum, s) => sum + s.percentage, 0) / services.length;
    const risk = services[0].risk;
    
    let label;
    if (avgProgress === 0) label = 'pending';
    else if (avgProgress < 100) label = 'in_progress';
    else label = 'completed';
    
    return { label, risk };
  }

  /**
   * Get health status from metrics
   */
  getHealthStatus(metrics) {
    const { latency, errorRate, userSuccessRate } = metrics;
    const thresholds = CONFIG.healthThresholds;
    
    if (errorRate > thresholds.errorRate || 
        latency > thresholds.latency || 
        userSuccessRate < thresholds.userSuccessRate) {
      return 'unhealthy';
    }
    
    if (errorRate > thresholds.errorRate * 0.5 || 
        latency > thresholds.latency * 0.7 || 
        userSuccessRate < thresholds.userSuccessRate * 1.02) {
      return 'warning';
    }
    
    return 'healthy';
  }

  /**
   * Generate progress bar
   */
  getProgressBar(percentage, width = 30) {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    
    const filledBar = colorize('█'.repeat(filled), colors.green);
    const emptyBar = colorize('░'.repeat(empty), colors.dim);
    
    return `[${filledBar}${emptyBar}]`;
  }

  /**
   * Display migration summary
   */
  async displaySummary() {
    await this.refreshData();
    
    console.log(bold(colorize('📊 MIGRATION SUMMARY REPORT', colors.cyan)));
    console.log('═'.repeat(80));
    
    const progress = Object.values(this.migrationData.progress);
    const totalServices = progress.length;
    const completedServices = progress.filter(s => s.percentage >= 100).length;
    const overallProgress = progress.reduce((sum, s) => sum + s.percentage, 0) / totalServices;
    
    console.log(`\nOverall Progress: ${this.getProgressBar(overallProgress)} ${formatPercent(overallProgress)}`);
    console.log(`Completed Services: ${completedServices}/${totalServices}`);
    console.log(`Migration Status: ${overallProgress >= 100 ? colorize('COMPLETED', colors.green) : colorize('IN PROGRESS', colors.yellow)}`);
    
    // Phase breakdown
    console.log('\n' + bold('Phase Breakdown:'));
    [1, 2, 3].forEach(phaseNum => {
      const phaseServices = progress.filter(s => s.phase === phaseNum);
      const phaseProgress = phaseServices.reduce((sum, s) => sum + s.percentage, 0) / phaseServices.length;
      const risk = phaseServices[0]?.risk || 'UNKNOWN';
      
      console.log(`  Phase ${phaseNum} (${colorize(risk, getRiskColor(risk))}): ${formatPercent(phaseProgress)}`);
    });
    
    // Health summary
    const healthServices = Object.values(this.migrationData.health);
    const healthyCount = healthServices.filter(h => h.status === 'healthy').length;
    
    console.log('\n' + bold('System Health:'));
    console.log(`  Healthy Services: ${healthyCount}/${healthServices.length}`);
    console.log(`  System Status: ${healthyCount === healthServices.length ? colorize('HEALTHY', colors.green) : colorize('DEGRADED', colors.yellow)}`);
    
    console.log();
  }

  /**
   * Display health report
   */
  async displayHealthReport() {
    await this.refreshData();
    
    console.log(bold(colorize('💖 HEALTH STATUS REPORT', colors.green)));
    console.log('═'.repeat(80));
    
    Object.keys(this.migrationData.health).forEach(serviceId => {
      const health = this.migrationData.health[serviceId];
      const service = this.migrationData.progress[serviceId];
      
      console.log(`\n${bold(serviceId)} (Phase ${service.phase}, ${colorize(service.risk, getRiskColor(service.risk))})`);
      console.log(`  Status: ${colorize(health.status.toUpperCase(), getStatusColor(health.status))}`);
      console.log(`  Latency: ${formatLatency(health.latency)}`);
      console.log(`  Error Rate: ${formatPercent(health.errorRate)}`);
      console.log(`  User Success Rate: ${formatPercent(health.userSuccessRate)}`);
      console.log(`  Request Volume: ${health.requestCount} requests (5min)`);
      
      if (health.status !== 'healthy') {
        console.log(`  ${colorize('⚠️  Health issues detected', colors.red)}`);
      }
    });
    
    console.log();
  }

  /**
   * Display rollback status
   */
  async displayRollbackStatus() {
    await this.refreshData();
    
    console.log(bold(colorize('🔄 ROLLBACK STATUS', colors.red)));
    console.log('═'.repeat(80));
    
    if (this.migrationData.rollbacks.length === 0) {
      console.log(colorize('\n✅ No rollback events detected', colors.green));
    } else {
      console.log(`\n⚠️  ${this.migrationData.rollbacks.length} rollback events found:\n`);
      
      this.migrationData.rollbacks.forEach(rollback => {
        const timestamp = formatTimestamp(rollback.timestamp);
        const statusColor = getStatusColor(rollback.status);
        
        console.log(`${timestamp} - ${bold(rollback.serviceId || 'SYSTEM')}`);
        console.log(`  Status: ${colorize(rollback.status?.toUpperCase() || 'UNKNOWN', statusColor)}`);
        console.log(`  Reason: ${rollback.reason || 'Unknown'}`);
        console.log(`  Scope: ${rollback.scope || 'Unknown'}`);
        console.log();
      });
    }
    
    console.log();
  }
}

/**
 * Main execution
 */
async function main() {
  const mode = process.argv[2] || 'monitor';
  const dashboard = new MigrationDashboard(mode);
  
  try {
    await dashboard.start();
  } catch (error) {
    console.error('Dashboard error:', error.message);
    process.exit(1);
  }
}

// Run dashboard if called directly
if (require.main === module) {
  main();
}

module.exports = { MigrationDashboard };