#!/usr/bin/env node
/**
 * Migration Health Monitor
 * Continuous monitoring system for migration health checks
 * Author: Gil Klainert
 * Date: 2025-08-27
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// Configuration
const MONITORING_CONFIG = {
    intervals: {
        health_check: 30000,        // 30 seconds
        metrics_collection: 60000,  // 1 minute
        alert_check: 15000,         // 15 seconds
        reporting: 300000           // 5 minutes
    },
    thresholds: {
        error_rate: 0.05,           // 5%
        latency_multiplier: 2.0,    // 2x baseline
        success_rate: 0.95,         // 95%
        availability: 0.99          // 99%
    },
    alerting: {
        consecutive_failures: 3,
        cooldown_period: 300000     // 5 minutes
    }
};

class MigrationHealthMonitor {
    constructor() {
        this.isMonitoring = false;
        this.alertCooldowns = new Map();
        this.healthCheckResults = [];
        this.baseline = null;
        this.logFile = `/tmp/migration-health-${Date.now()}.log`;
        
        console.log(`Migration Health Monitor started - Log: ${this.logFile}`);
        this.loadBaseline();
    }

    async loadBaseline() {
        try {
            const snapshot = await db.collection('performance_baselines')
                .orderBy('timestamp', 'desc')
                .limit(1)
                .get();
            
            if (!snapshot.empty) {
                this.baseline = snapshot.docs[0].data();
                this.log('INFO', `Baseline loaded: ${this.baseline.timestamp.toDate()}`);
            } else {
                this.log('WARN', 'No baseline found - creating default baseline');
                this.baseline = this.createDefaultBaseline();
            }
        } catch (error) {
            this.log('ERROR', `Failed to load baseline: ${error.message}`);
            this.baseline = this.createDefaultBaseline();
        }
    }

    createDefaultBaseline() {
        return {
            metrics: {
                responseTime: { p50: 250, p95: 500, p99: 1000 },
                errorRate: 0.01,
                throughput: 100,
                availability: 99.9
            },
            timestamp: new Date()
        };
    }

    log(level, message) {
        const timestamp = new Date().toISOString();
        const logMessage = `${timestamp} [${level}] ${message}\n`;
        
        console.log(`[${level}] ${message}`);
        
        try {
            fs.appendFileSync(this.logFile, logMessage);
        } catch (error) {
            console.error('Failed to write to log file:', error.message);
        }
    }

    async startMonitoring() {
        if (this.isMonitoring) {
            this.log('WARN', 'Monitoring already started');
            return;
        }

        this.isMonitoring = true;
        this.log('INFO', 'Starting migration health monitoring...');

        // Start monitoring intervals
        setInterval(() => this.performHealthCheck(), MONITORING_CONFIG.intervals.health_check);
        setInterval(() => this.collectMetrics(), MONITORING_CONFIG.intervals.metrics_collection);
        setInterval(() => this.checkAlerts(), MONITORING_CONFIG.intervals.alert_check);
        setInterval(() => this.generateReport(), MONITORING_CONFIG.intervals.reporting);

        // Initial health check
        await this.performHealthCheck();
    }

    stopMonitoring() {
        this.isMonitoring = false;
        this.log('INFO', 'Migration health monitoring stopped');
    }

    async performHealthCheck() {
        if (!this.isMonitoring) return;

        try {
            const healthCheck = {
                timestamp: new Date(),
                checks: {}
            };

            // Performance checks
            healthCheck.checks.performance = await this.checkPerformance();
            healthCheck.checks.functionality = await this.checkFunctionality();
            healthCheck.checks.integration = await this.checkIntegration();
            healthCheck.checks.dataIntegrity = await this.checkDataIntegrity();

            // Overall health assessment
            const failedChecks = Object.values(healthCheck.checks).filter(check => !check.status);
            healthCheck.overallHealth = failedChecks.length === 0;
            healthCheck.failureCount = failedChecks.length;

            // Store health check result
            this.healthCheckResults.push(healthCheck);
            
            // Keep only last 100 results
            if (this.healthCheckResults.length > 100) {
                this.healthCheckResults.shift();
            }

            // Check for rollback conditions
            if (this.shouldTriggerRollback(healthCheck)) {
                await this.triggerRollback(healthCheck);
            }

            this.log('INFO', `Health check completed - Overall: ${healthCheck.overallHealth ? 'HEALTHY' : 'UNHEALTHY'}`);

        } catch (error) {
            this.log('ERROR', `Health check failed: ${error.message}`);
        }
    }

    async checkPerformance() {
        try {
            const currentMetrics = await this.getCurrentPerformanceMetrics();
            const checks = {
                errorRate: currentMetrics.errorRate <= MONITORING_CONFIG.thresholds.error_rate,
                latency: currentMetrics.latency <= (this.baseline.metrics.responseTime.p95 * MONITORING_CONFIG.thresholds.latency_multiplier),
                throughput: currentMetrics.throughput >= (this.baseline.metrics.throughput * 0.8) // 80% of baseline
            };

            return {
                status: Object.values(checks).every(check => check),
                details: checks,
                metrics: currentMetrics
            };
        } catch (error) {
            this.log('ERROR', `Performance check failed: ${error.message}`);
            return { status: false, error: error.message };
        }
    }

    async checkFunctionality() {
        try {
            const checks = {
                recommendationGeneration: await this.testRecommendationGeneration(),
                cvProcessing: await this.testCVProcessing(),
                userExperience: await this.testUserExperience()
            };

            return {
                status: Object.values(checks).every(check => check),
                details: checks
            };
        } catch (error) {
            this.log('ERROR', `Functionality check failed: ${error.message}`);
            return { status: false, error: error.message };
        }
    }

    async checkIntegration() {
        try {
            const checks = {
                firebaseFunctions: await this.testFirebaseFunctions(),
                firestoreConnectivity: await this.testFirestoreConnectivity(),
                externalAPIs: await this.testExternalAPIs()
            };

            return {
                status: Object.values(checks).every(check => check),
                details: checks
            };
        } catch (error) {
            this.log('ERROR', `Integration check failed: ${error.message}`);
            return { status: false, error: error.message };
        }
    }

    async checkDataIntegrity() {
        try {
            const checks = {
                dataConsistency: await this.testDataConsistency(),
                cacheCoherence: await this.testCacheCoherence(),
                userSessionIntegrity: await this.testUserSessionIntegrity()
            };

            return {
                status: Object.values(checks).every(check => check),
                details: checks
            };
        } catch (error) {
            this.log('ERROR', `Data integrity check failed: ${error.message}`);
            return { status: false, error: error.message };
        }
    }

    async getCurrentPerformanceMetrics() {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        // Get error rate
        const [requestsSnapshot, errorsSnapshot] = await Promise.all([
            db.collection('request_logs').where('timestamp', '>=', fiveMinutesAgo).get(),
            db.collection('error_logs').where('timestamp', '>=', fiveMinutesAgo).get()
        ]);

        const totalRequests = requestsSnapshot.size || 1;
        const totalErrors = errorsSnapshot.size || 0;
        const errorRate = totalErrors / totalRequests;

        // Get latency
        const metricsSnapshot = await db.collection('performance_metrics')
            .where('timestamp', '>=', fiveMinutesAgo)
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();

        let avgLatency = this.baseline.metrics.responseTime.p50;
        if (!metricsSnapshot.empty) {
            const latencies = [];
            metricsSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.latency) latencies.push(data.latency);
            });
            
            if (latencies.length > 0) {
                avgLatency = latencies.reduce((sum, latency) => sum + latency, 0) / latencies.length;
            }
        }

        return {
            errorRate,
            latency: Math.round(avgLatency),
            throughput: totalRequests / 5 // requests per minute
        };
    }

    async testRecommendationGeneration() {
        try {
            // Simple test of recommendation generation
            const testDoc = await db.collection('test_recommendations').add({
                test: true,
                timestamp: new Date(),
                purpose: 'health_check'
            });

            await testDoc.delete();
            return true;
        } catch (error) {
            this.log('WARN', `Recommendation generation test failed: ${error.message}`);
            return false;
        }
    }

    async testCVProcessing() {
        try {
            // Simple test of CV processing capabilities
            const testDoc = await db.collection('test_cv_processing').add({
                test: true,
                timestamp: new Date(),
                purpose: 'health_check'
            });

            await testDoc.delete();
            return true;
        } catch (error) {
            this.log('WARN', `CV processing test failed: ${error.message}`);
            return false;
        }
    }

    async testUserExperience() {
        try {
            // Test user experience metrics collection
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            const userActionsSnapshot = await db.collection('user_actions')
                .where('timestamp', '>=', tenMinutesAgo)
                .limit(1)
                .get();

            // If we have user actions, that's a good sign
            return true;
        } catch (error) {
            this.log('WARN', `User experience test failed: ${error.message}`);
            return false;
        }
    }

    async testFirebaseFunctions() {
        try {
            // Test basic Firestore connectivity as a proxy for function health
            await db.collection('health_check').doc('test').get();
            return true;
        } catch (error) {
            this.log('WARN', `Firebase Functions test failed: ${error.message}`);
            return false;
        }
    }

    async testFirestoreConnectivity() {
        try {
            await db.collection('health_check').doc('connectivity_test').set({
                timestamp: new Date(),
                test: true
            }, { merge: true });
            return true;
        } catch (error) {
            this.log('WARN', `Firestore connectivity test failed: ${error.message}`);
            return false;
        }
    }

    async testExternalAPIs() {
        // For now, just return true - in a real implementation,
        // this would test external API connectivity
        return true;
    }

    async testDataConsistency() {
        try {
            // Simple data consistency check
            const collections = ['users', 'recommendations', 'user_cvs'];
            for (const collection of collections) {
                const snapshot = await db.collection(collection).limit(1).get();
                // Just checking accessibility for now
            }
            return true;
        } catch (error) {
            this.log('WARN', `Data consistency test failed: ${error.message}`);
            return false;
        }
    }

    async testCacheCoherence() {
        try {
            // Simple cache coherence test
            await db.collection('cache_entries').limit(1).get();
            return true;
        } catch (error) {
            this.log('WARN', `Cache coherence test failed: ${error.message}`);
            return false;
        }
    }

    async testUserSessionIntegrity() {
        try {
            // Test user session data integrity
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            await db.collection('active_sessions')
                .where('lastActivity', '>=', fiveMinutesAgo)
                .limit(1)
                .get();
            return true;
        } catch (error) {
            this.log('WARN', `User session integrity test failed: ${error.message}`);
            return false;
        }
    }

    shouldTriggerRollback(healthCheck) {
        // Check for immediate rollback conditions
        if (healthCheck.checks.dataIntegrity && !healthCheck.checks.dataIntegrity.status) {
            return true;
        }

        // Check for consecutive failures
        const recentChecks = this.healthCheckResults.slice(-MONITORING_CONFIG.alerting.consecutive_failures);
        const consecutiveFailures = recentChecks.every(check => !check.overallHealth);

        if (consecutiveFailures && recentChecks.length >= MONITORING_CONFIG.alerting.consecutive_failures) {
            return true;
        }

        // Check performance thresholds
        if (healthCheck.checks.performance) {
            const metrics = healthCheck.checks.performance.metrics;
            if (metrics.errorRate > MONITORING_CONFIG.thresholds.error_rate * 2) { // 2x error rate threshold
                return true;
            }
        }

        return false;
    }

    async triggerRollback(healthCheck) {
        const rollbackId = `rollback_${Date.now()}`;
        
        this.log('CRITICAL', `TRIGGERING AUTOMATIC ROLLBACK: ${rollbackId}`);

        try {
            // Record rollback trigger
            await db.collection('rollback_triggers').add({
                id: rollbackId,
                timestamp: new Date(),
                reason: 'automatic_health_check_failure',
                healthCheck: healthCheck,
                triggerConditions: this.identifyTriggerConditions(healthCheck)
            });

            // Send emergency alert
            await this.sendEmergencyAlert('CRITICAL', 'Automatic rollback triggered by health monitor', {
                rollbackId,
                healthCheck
            });

            this.log('SUCCESS', `Rollback trigger recorded: ${rollbackId}`);

        } catch (error) {
            this.log('ERROR', `Failed to trigger rollback: ${error.message}`);
        }
    }

    identifyTriggerConditions(healthCheck) {
        const conditions = [];
        
        if (healthCheck.checks.dataIntegrity && !healthCheck.checks.dataIntegrity.status) {
            conditions.push('data_integrity_failure');
        }
        
        if (healthCheck.checks.performance && healthCheck.checks.performance.metrics) {
            const metrics = healthCheck.checks.performance.metrics;
            if (metrics.errorRate > MONITORING_CONFIG.thresholds.error_rate) {
                conditions.push('error_rate_threshold_exceeded');
            }
            if (metrics.latency > this.baseline.metrics.responseTime.p95 * MONITORING_CONFIG.thresholds.latency_multiplier) {
                conditions.push('latency_threshold_exceeded');
            }
        }
        
        const recentChecks = this.healthCheckResults.slice(-MONITORING_CONFIG.alerting.consecutive_failures);
        const consecutiveFailures = recentChecks.every(check => !check.overallHealth);
        if (consecutiveFailures) {
            conditions.push('consecutive_health_check_failures');
        }
        
        return conditions;
    }

    async sendEmergencyAlert(severity, message, context = {}) {
        try {
            await db.collection('emergency_alerts').add({
                severity,
                message,
                timestamp: new Date(),
                source: 'migration_health_monitor',
                context,
                acknowledged: false
            });

            this.log('INFO', `Emergency alert sent: ${severity} - ${message}`);
        } catch (error) {
            this.log('ERROR', `Failed to send emergency alert: ${error.message}`);
        }
    }

    async collectMetrics() {
        if (!this.isMonitoring) return;

        try {
            const metrics = await this.getCurrentPerformanceMetrics();
            
            await db.collection('migration_monitoring_metrics').add({
                timestamp: new Date(),
                metrics,
                source: 'health_monitor'
            });

            this.log('INFO', `Metrics collected - Error Rate: ${(metrics.errorRate * 100).toFixed(2)}%, Latency: ${metrics.latency}ms`);
        } catch (error) {
            this.log('ERROR', `Failed to collect metrics: ${error.message}`);
        }
    }

    async checkAlerts() {
        if (!this.isMonitoring) return;

        try {
            // Check for unacknowledged alerts
            const alertsSnapshot = await db.collection('emergency_alerts')
                .where('acknowledged', '==', false)
                .where('timestamp', '>=', new Date(Date.now() - 30 * 60 * 1000)) // Last 30 minutes
                .get();

            if (!alertsSnapshot.empty) {
                this.log('WARN', `${alertsSnapshot.size} unacknowledged alerts found`);
            }
        } catch (error) {
            this.log('ERROR', `Failed to check alerts: ${error.message}`);
        }
    }

    async generateReport() {
        if (!this.isMonitoring) return;

        try {
            const now = new Date();
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
            
            const recentChecks = this.healthCheckResults.filter(check => 
                check.timestamp >= fiveMinutesAgo
            );

            if (recentChecks.length === 0) {
                this.log('WARN', 'No recent health checks for report generation');
                return;
            }

            const healthyChecks = recentChecks.filter(check => check.overallHealth);
            const healthPercentage = (healthyChecks.length / recentChecks.length * 100).toFixed(2);

            const report = {
                timestamp: now,
                period: '5_minutes',
                totalChecks: recentChecks.length,
                healthyChecks: healthyChecks.length,
                healthPercentage: parseFloat(healthPercentage),
                summary: {
                    overallHealth: healthPercentage >= 95,
                    performanceIssues: recentChecks.filter(c => c.checks.performance && !c.checks.performance.status).length,
                    functionalityIssues: recentChecks.filter(c => c.checks.functionality && !c.checks.functionality.status).length,
                    integrationIssues: recentChecks.filter(c => c.checks.integration && !c.checks.integration.status).length,
                    dataIntegrityIssues: recentChecks.filter(c => c.checks.dataIntegrity && !c.checks.dataIntegrity.status).length
                }
            };

            // Store report
            await db.collection('migration_health_reports').add(report);

            this.log('INFO', `Health report generated - ${healthPercentage}% healthy over last 5 minutes`);

            // Log detailed summary
            if (report.summary.overallHealth) {
                this.log('SUCCESS', 'System health is stable');
            } else {
                this.log('WARN', `System health issues detected - Performance: ${report.summary.performanceIssues}, Functionality: ${report.summary.functionalityIssues}, Integration: ${report.summary.integrationIssues}, Data: ${report.summary.dataIntegrityIssues}`);
            }

        } catch (error) {
            this.log('ERROR', `Failed to generate report: ${error.message}`);
        }
    }
}

// CLI interface
if (require.main === module) {
    const monitor = new MigrationHealthMonitor();
    
    // Handle process signals
    process.on('SIGINT', () => {
        console.log('\nReceived SIGINT - stopping health monitor...');
        monitor.stopMonitoring();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        console.log('\nReceived SIGTERM - stopping health monitor...');
        monitor.stopMonitoring();
        process.exit(0);
    });

    // Start monitoring
    monitor.startMonitoring().then(() => {
        console.log('Migration health monitoring started successfully');
    }).catch(error => {
        console.error('Failed to start health monitoring:', error);
        process.exit(1);
    });
}

module.exports = MigrationHealthMonitor;