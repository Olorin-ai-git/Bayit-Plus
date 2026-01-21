/**
 * CVPlus Migration Status Dashboard
 * 
 * Real-time dashboard for monitoring Firebase Functions migration progress
 * Author: Gil Klainert
 * Date: 2025-08-28
 * 
 * Features:
 * - Real-time migration progress visualization
 * - Interactive function status management
 * - Risk assessment dashboard
 * - Dependency visualization
 * - Migration workflow coordination
 */

const fs = require('fs').promises;
const path = require('path');
const MigrationTracker = require('./migration-tracker');

class MigrationStatusDashboard {
  constructor() {
    this.tracker = new MigrationTracker();
    this.rootPath = '/Users/gklainert/Documents/cvplus';
    this.dashboardPath = path.join(this.rootPath, 'scripts/migration/dashboard');
    
    // Dashboard configuration
    this.config = {
      refreshInterval: 30000, // 30 seconds
      autoSave: true,
      enableRealTimeUpdates: true,
      maxLogEntries: 500
    };
    
    // Dashboard state
    this.isRunning = false;
    this.lastUpdate = null;
    this.subscribers = new Map();
  }

  /**
   * Initialize the dashboard
   */
  async initialize() {
    console.log('🚀 Initializing Migration Status Dashboard...');
    
    try {
      // Initialize tracker
      await this.tracker.initialize();
      
      // Create dashboard directory
      await this.ensureDashboardDirectories();
      
      // Generate initial dashboard files
      await this.generateDashboardFiles();
      
      console.log('✅ Migration Status Dashboard initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Dashboard:', error);
      throw error;
    }
  }

  /**
   * Ensure dashboard directories exist
   */
  async ensureDashboardDirectories() {
    const dirs = [
      this.dashboardPath,
      path.join(this.dashboardPath, 'static'),
      path.join(this.dashboardPath, 'templates'),
      path.join(this.dashboardPath, 'data')
    ];
    
    for (const dir of dirs) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    }
  }

  /**
   * Generate dashboard HTML and assets
   */
  async generateDashboardFiles() {
    // Generate main dashboard HTML
    await this.generateMainDashboard();
    
    // Generate CSS styles
    await this.generateDashboardCSS();
    
    // Generate JavaScript
    await this.generateDashboardJS();
    
    // Generate initial data files
    await this.updateDashboardData();
    
    console.log('📊 Dashboard files generated');
  }

  /**
   * Generate main dashboard HTML
   */
  async generateMainDashboard() {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CVPlus Migration Dashboard</title>
    <link rel="stylesheet" href="static/dashboard.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/date-fns@2.29.3/index.min.js"></script>
</head>
<body>
    <div class="dashboard-container">
        <!-- Header -->
        <header class="dashboard-header">
            <div class="header-content">
                <h1>CVPlus Migration Dashboard</h1>
                <div class="header-stats">
                    <div class="stat-item">
                        <span class="stat-label">Total Functions</span>
                        <span class="stat-value" id="totalFunctions">-</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Migration Progress</span>
                        <span class="stat-value" id="migrationProgress">-</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Last Updated</span>
                        <span class="stat-value" id="lastUpdate">-</span>
                    </div>
                </div>
                <button id="refreshBtn" class="refresh-btn">🔄 Refresh</button>
            </div>
        </header>

        <!-- Main Content -->
        <main class="dashboard-main">
            <!-- Progress Overview -->
            <section class="card progress-overview">
                <h2>Migration Progress</h2>
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" id="overallProgress"></div>
                    </div>
                    <div class="progress-stats">
                        <div class="progress-stat">
                            <span class="label">Completed</span>
                            <span class="value" id="completedCount">0</span>
                        </div>
                        <div class="progress-stat">
                            <span class="label">In Progress</span>
                            <span class="value" id="inProgressCount">0</span>
                        </div>
                        <div class="progress-stat">
                            <span class="label">Pending</span>
                            <span class="value" id="pendingCount">0</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Charts Row -->
            <div class="charts-row">
                <!-- Status Chart -->
                <section class="card chart-container">
                    <h3>Status Distribution</h3>
                    <canvas id="statusChart"></canvas>
                </section>

                <!-- Risk Chart -->
                <section class="card chart-container">
                    <h3>Risk Level Distribution</h3>
                    <canvas id="riskChart"></canvas>
                </section>

                <!-- Submodule Chart -->
                <section class="card chart-container">
                    <h3>Functions by Submodule</h3>
                    <canvas id="submoduleChart"></canvas>
                </section>
            </div>

            <!-- Functions Table -->
            <section class="card functions-table-container">
                <div class="table-header">
                    <h3>Functions Status</h3>
                    <div class="table-controls">
                        <select id="statusFilter" class="filter-select">
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="analyzing">Analyzing</option>
                            <option value="in_progress">In Progress</option>
                            <option value="migrated">Migrated</option>
                            <option value="verified">Verified</option>
                            <option value="failed">Failed</option>
                        </select>
                        <select id="riskFilter" class="filter-select">
                            <option value="">All Risk Levels</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                        </select>
                        <select id="submoduleFilter" class="filter-select">
                            <option value="">All Submodules</option>
                        </select>
                    </div>
                </div>
                <div class="table-container">
                    <table id="functionsTable" class="functions-table">
                        <thead>
                            <tr>
                                <th>Function Name</th>
                                <th>Status</th>
                                <th>Risk Level</th>
                                <th>Target Submodule</th>
                                <th>Size</th>
                                <th>Dependencies</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="functionsTableBody">
                        </tbody>
                    </table>
                </div>
            </section>

            <!-- Dependencies Section -->
            <section class="card dependencies-section">
                <h3>Cross-Submodule Dependencies</h3>
                <div id="dependenciesContainer">
                </div>
            </section>

            <!-- Recommendations -->
            <section class="card recommendations-section">
                <h3>Migration Recommendations</h3>
                <div id="recommendationsContainer">
                </div>
            </section>

            <!-- Migration Log -->
            <section class="card log-section">
                <h3>Migration Log</h3>
                <div class="log-container">
                    <div id="logEntries" class="log-entries">
                    </div>
                </div>
            </section>
        </main>
    </div>

    <!-- Status Update Modal -->
    <div id="statusModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Update Function Status</h3>
                <button class="modal-close" onclick="closeStatusModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Function Name:</label>
                    <input type="text" id="modalFunctionName" readonly>
                </div>
                <div class="form-group">
                    <label>New Status:</label>
                    <select id="modalStatus">
                        <option value="pending">Pending</option>
                        <option value="analyzing">Analyzing</option>
                        <option value="in_progress">In Progress</option>
                        <option value="migrated">Migrated</option>
                        <option value="verified">Verified</option>
                        <option value="failed">Failed</option>
                        <option value="rollback">Rollback</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Notes:</label>
                    <textarea id="modalNotes" rows="3" placeholder="Optional migration notes..."></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button onclick="closeStatusModal()" class="btn-secondary">Cancel</button>
                <button onclick="updateFunctionStatus()" class="btn-primary">Update Status</button>
            </div>
        </div>
    </div>

    <script src="static/dashboard.js"></script>
</body>
</html>`;

    await fs.writeFile(path.join(this.dashboardPath, 'index.html'), html);
  }

  /**
   * Generate dashboard CSS
   */
  async generateDashboardCSS() {
    const css = `
/* CVPlus Migration Dashboard Styles */
:root {
    --primary-color: #2563eb;
    --secondary-color: #64748b;
    --success-color: #10b981;
    --warning-color: #f59e0b;
    --error-color: #ef4444;
    --critical-color: #dc2626;
    --background-color: #f8fafc;
    --card-background: #ffffff;
    --border-color: #e2e8f0;
    --text-primary: #1e293b;
    --text-secondary: #64748b;
    --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background-color: var(--background-color);
    color: var(--text-primary);
    line-height: 1.6;
}

.dashboard-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

/* Header */
.dashboard-header {
    background: var(--card-background);
    border-bottom: 1px solid var(--border-color);
    padding: 1rem 2rem;
    box-shadow: var(--shadow);
}

.header-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 2rem;
}

.dashboard-header h1 {
    color: var(--primary-color);
    font-size: 1.5rem;
    font-weight: 700;
}

.header-stats {
    display: flex;
    gap: 2rem;
}

.stat-item {
    display: flex;
    flex-direction: column;
    text-align: center;
}

.stat-label {
    font-size: 0.75rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.stat-value {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
}

.refresh-btn {
    background: var(--primary-color);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 0.2s;
}

.refresh-btn:hover {
    background: #1d4ed8;
}

/* Main Content */
.dashboard-main {
    flex: 1;
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    width: 100%;
}

.card {
    background: var(--card-background);
    border-radius: 0.5rem;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: var(--shadow);
    border: 1px solid var(--border-color);
}

.card h2, .card h3 {
    color: var(--text-primary);
    margin-bottom: 1rem;
    font-weight: 600;
}

/* Progress Overview */
.progress-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.progress-bar {
    height: 2rem;
    background: var(--border-color);
    border-radius: 1rem;
    overflow: hidden;
    position: relative;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--primary-color), var(--success-color));
    transition: width 0.5s ease;
    border-radius: 1rem;
}

.progress-stats {
    display: flex;
    justify-content: space-around;
    gap: 1rem;
}

.progress-stat {
    text-align: center;
    flex: 1;
    padding: 0.5rem;
    border-radius: 0.375rem;
    background: var(--background-color);
}

.progress-stat .label {
    display: block;
    font-size: 0.75rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.progress-stat .value {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
}

/* Charts */
.charts-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-bottom: 1.5rem;
}

.chart-container {
    min-height: 300px;
    display: flex;
    flex-direction: column;
}

.chart-container canvas {
    flex: 1;
}

/* Functions Table */
.functions-table-container {
    overflow: hidden;
}

.table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    gap: 1rem;
}

.table-controls {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.filter-select {
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 0.375rem;
    font-size: 0.875rem;
    background: white;
}

.table-container {
    overflow-x: auto;
    border-radius: 0.5rem;
    border: 1px solid var(--border-color);
}

.functions-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
}

.functions-table th {
    background: var(--background-color);
    padding: 0.75rem;
    text-align: left;
    font-weight: 600;
    color: var(--text-primary);
    border-bottom: 1px solid var(--border-color);
    white-space: nowrap;
}

.functions-table td {
    padding: 0.75rem;
    border-bottom: 1px solid var(--border-color);
    vertical-align: top;
}

.functions-table tbody tr:hover {
    background: var(--background-color);
}

/* Status Badges */
.status-badge, .risk-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
}

.status-badge.pending { background: #f3f4f6; color: #374151; }
.status-badge.analyzing { background: #dbeafe; color: #1e40af; }
.status-badge.in_progress { background: #fef3c7; color: #92400e; }
.status-badge.migrated { background: #d1fae5; color: #065f46; }
.status-badge.verified { background: #dcfdf7; color: #047857; }
.status-badge.failed { background: #fee2e2; color: #991b1b; }
.status-badge.rollback { background: #fef2f2; color: #b91c1c; }

.risk-badge.low { background: #dcfdf7; color: #047857; }
.risk-badge.medium { background: #fef3c7; color: #92400e; }
.risk-badge.high { background: #fed7aa; color: #c2410c; }
.risk-badge.critical { background: #fee2e2; color: #991b1b; }

/* Action Buttons */
.action-btn {
    padding: 0.25rem 0.5rem;
    border: none;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    cursor: pointer;
    text-decoration: none;
    display: inline-block;
    margin-right: 0.25rem;
    transition: background-color 0.2s;
}

.action-btn.primary {
    background: var(--primary-color);
    color: white;
}

.action-btn.primary:hover {
    background: #1d4ed8;
}

/* Dependencies */
.dependency-item {
    background: var(--background-color);
    padding: 1rem;
    border-radius: 0.375rem;
    margin-bottom: 0.5rem;
    border-left: 3px solid var(--warning-color);
}

.dependency-function {
    font-weight: 600;
    color: var(--text-primary);
}

.dependency-details {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin-top: 0.25rem;
}

/* Recommendations */
.recommendation-item {
    background: var(--background-color);
    padding: 1rem;
    border-radius: 0.375rem;
    margin-bottom: 0.5rem;
    border-left: 3px solid var(--primary-color);
}

.recommendation-priority {
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.75rem;
    letter-spacing: 0.05em;
}

.recommendation-priority.high { color: var(--warning-color); }
.recommendation-priority.critical { color: var(--error-color); }

.recommendation-title {
    font-weight: 600;
    color: var(--text-primary);
    margin: 0.5rem 0;
}

.recommendation-description {
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
}

/* Log */
.log-container {
    max-height: 400px;
    overflow-y: auto;
    border: 1px solid var(--border-color);
    border-radius: 0.375rem;
}

.log-entries {
    padding: 1rem;
}

.log-entry {
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border-color);
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
    font-size: 0.875rem;
}

.log-entry:last-child {
    border-bottom: none;
}

.log-timestamp {
    color: var(--text-secondary);
    margin-right: 0.5rem;
}

.log-type {
    font-weight: 600;
    margin-right: 0.5rem;
    color: var(--primary-color);
}

/* Modal */
.modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
}

.modal-content {
    background: var(--card-background);
    border-radius: 0.5rem;
    max-width: 500px;
    margin: 10% auto;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.modal-header {
    padding: 1.5rem 1.5rem 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
    margin: 0;
    color: var(--text-primary);
}

.modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--text-secondary);
    cursor: pointer;
}

.modal-body {
    padding: 1.5rem;
}

.form-group {
    margin-bottom: 1rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--text-primary);
}

.form-group input, .form-group select, .form-group textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 0.375rem;
    font-size: 0.875rem;
}

.modal-footer {
    padding: 1rem 1.5rem 1.5rem;
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    border-top: 1px solid var(--border-color);
}

.btn-primary {
    background: var(--primary-color);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 0.2s;
}

.btn-primary:hover {
    background: #1d4ed8;
}

.btn-secondary {
    background: var(--background-color);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 0.2s;
}

.btn-secondary:hover {
    background: #e2e8f0;
}

/* Responsive Design */
@media (max-width: 768px) {
    .dashboard-main {
        padding: 1rem;
    }
    
    .header-content {
        flex-direction: column;
        gap: 1rem;
    }
    
    .header-stats {
        flex-wrap: wrap;
        justify-content: center;
    }
    
    .charts-row {
        grid-template-columns: 1fr;
    }
    
    .table-header {
        flex-direction: column;
        align-items: flex-start;
    }
}
`;

    await fs.writeFile(path.join(this.dashboardPath, 'static/dashboard.css'), css);
  }

  /**
   * Generate dashboard JavaScript
   */
  async generateDashboardJS() {
    const js = `
// CVPlus Migration Dashboard JavaScript
class MigrationDashboard {
    constructor() {
        this.data = null;
        this.charts = {};
        this.refreshInterval = null;
        this.currentFunction = null;
    }

    async init() {
        console.log('Initializing Migration Dashboard...');
        
        // Load initial data
        await this.loadData();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Render dashboard
        this.render();
        
        // Setup auto-refresh
        this.setupAutoRefresh();
        
        console.log('Dashboard initialized');
    }

    async loadData() {
        try {
            const response = await fetch('data/migration-status.json');
            this.data = await response.json();
            console.log('Data loaded:', this.data);
        } catch (error) {
            console.error('Failed to load data:', error);
            // Use mock data for development
            this.data = this.getMockData();
        }
    }

    setupEventListeners() {
        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refresh();
        });

        // Filter controls
        document.getElementById('statusFilter').addEventListener('change', () => {
            this.filterTable();
        });
        
        document.getElementById('riskFilter').addEventListener('change', () => {
            this.filterTable();
        });
        
        document.getElementById('submoduleFilter').addEventListener('change', () => {
            this.filterTable();
        });
    }

    setupAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            this.refresh();
        }, 30000); // Refresh every 30 seconds
    }

    async refresh() {
        console.log('Refreshing data...');
        await this.loadData();
        this.render();
    }

    render() {
        this.renderHeader();
        this.renderProgressOverview();
        this.renderCharts();
        this.renderFunctionsTable();
        this.renderDependencies();
        this.renderRecommendations();
        this.renderLog();
    }

    renderHeader() {
        const summary = this.data.summary;
        
        document.getElementById('totalFunctions').textContent = summary.totalFunctions;
        document.getElementById('migrationProgress').textContent = summary.migrationProgress + '%';
        document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
    }

    renderProgressOverview() {
        const summary = this.data.summary;
        
        // Update progress bar
        const progressFill = document.getElementById('overallProgress');
        progressFill.style.width = summary.migrationProgress + '%';
        
        // Update progress stats
        document.getElementById('completedCount').textContent = 
            (summary.statusBreakdown.verified || 0) + (summary.statusBreakdown.migrated || 0);
        document.getElementById('inProgressCount').textContent = 
            (summary.statusBreakdown.analyzing || 0) + (summary.statusBreakdown.in_progress || 0);
        document.getElementById('pendingCount').textContent = 
            summary.statusBreakdown.pending || 0;
    }

    renderCharts() {
        this.renderStatusChart();
        this.renderRiskChart();
        this.renderSubmoduleChart();
    }

    renderStatusChart() {
        const ctx = document.getElementById('statusChart').getContext('2d');
        
        if (this.charts.status) {
            this.charts.status.destroy();
        }

        const statusData = this.data.summary.statusBreakdown;
        
        this.charts.status = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusData),
                datasets: [{
                    data: Object.values(statusData),
                    backgroundColor: [
                        '#f3f4f6', '#dbeafe', '#fef3c7', '#d1fae5', '#dcfdf7', '#fee2e2', '#fef2f2'
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    renderRiskChart() {
        const ctx = document.getElementById('riskChart').getContext('2d');
        
        if (this.charts.risk) {
            this.charts.risk.destroy();
        }

        const riskData = this.data.summary.riskBreakdown;
        
        this.charts.risk = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(riskData),
                datasets: [{
                    label: 'Functions',
                    data: Object.values(riskData),
                    backgroundColor: ['#dcfdf7', '#fef3c7', '#fed7aa', '#fee2e2'],
                    borderColor: ['#047857', '#92400e', '#c2410c', '#991b1b'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    renderSubmoduleChart() {
        const ctx = document.getElementById('submoduleChart').getContext('2d');
        
        if (this.charts.submodule) {
            this.charts.submodule.destroy();
        }

        const submoduleData = this.data.summary.submoduleBreakdown;
        
        this.charts.submodule = new Chart(ctx, {
            type: 'horizontalBar',
            data: {
                labels: Object.keys(submoduleData),
                datasets: [{
                    label: 'Functions',
                    data: Object.values(submoduleData),
                    backgroundColor: '#2563eb',
                    borderColor: '#1d4ed8',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    renderFunctionsTable() {
        const tbody = document.getElementById('functionsTableBody');
        const submoduleFilter = document.getElementById('submoduleFilter');
        
        // Clear existing content
        tbody.innerHTML = '';
        
        // Update submodule filter options
        const submodules = new Set();
        
        // Process functions from bySubmodule data
        for (const [submodule, submoduleData] of Object.entries(this.data.bySubmodule)) {
            submodules.add(submodule);
            
            for (const func of submoduleData.functions) {
                const row = this.createFunctionRow(func, submodule);
                tbody.appendChild(row);
            }
        }
        
        // Update submodule filter
        const currentValue = submoduleFilter.value;
        submoduleFilter.innerHTML = '<option value="">All Submodules</option>';
        Array.from(submodules).sort().forEach(submodule => {
            const option = document.createElement('option');
            option.value = submodule;
            option.textContent = submodule;
            if (submodule === currentValue) {
                option.selected = true;
            }
            submoduleFilter.appendChild(option);
        });
        
        // Apply current filters
        this.filterTable();
    }

    createFunctionRow(func, submodule) {
        const row = document.createElement('tr');
        row.dataset.function = func.name;
        row.dataset.status = func.status;
        row.dataset.riskLevel = func.riskLevel;
        row.dataset.submodule = submodule;
        
        row.innerHTML = \`
            <td>\${func.name}</td>
            <td><span class="status-badge \${func.status}">\${func.status}</span></td>
            <td><span class="risk-badge \${func.riskLevel}">\${func.riskLevel}</span></td>
            <td>\${submodule}</td>
            <td>\${this.formatFileSize(func.size)}</td>
            <td>\${func.dependencies || 0}</td>
            <td>
                <button class="action-btn primary" onclick="openStatusModal('\${func.name}')">
                    Update Status
                </button>
            </td>
        \`;
        
        return row;
    }

    filterTable() {
        const statusFilter = document.getElementById('statusFilter').value;
        const riskFilter = document.getElementById('riskFilter').value;
        const submoduleFilter = document.getElementById('submoduleFilter').value;
        
        const rows = document.querySelectorAll('#functionsTableBody tr');
        
        rows.forEach(row => {
            let show = true;
            
            if (statusFilter && row.dataset.status !== statusFilter) {
                show = false;
            }
            
            if (riskFilter && row.dataset.riskLevel !== riskFilter) {
                show = false;
            }
            
            if (submoduleFilter && row.dataset.submodule !== submoduleFilter) {
                show = false;
            }
            
            row.style.display = show ? '' : 'none';
        });
    }

    renderDependencies() {
        const container = document.getElementById('dependenciesContainer');
        
        if (!this.data.dependencies || !this.data.dependencies.crossSubmoduleDependencies) {
            container.innerHTML = '<p>No cross-submodule dependencies found.</p>';
            return;
        }
        
        const deps = this.data.dependencies.crossSubmoduleDependencies;
        
        if (deps.length === 0) {
            container.innerHTML = '<p>No cross-submodule dependencies found.</p>';
            return;
        }
        
        container.innerHTML = deps.map(dep => \`
            <div class="dependency-item">
                <div class="dependency-function">\${dep.function}</div>
                <div class="dependency-details">
                    Source: \${dep.sourceSubmodule} → Dependencies: \${dep.dependencies.map(d => \`\${d.function} (\${d.targetSubmodule})\`).join(', ')}
                </div>
            </div>
        \`).join('');
    }

    renderRecommendations() {
        const container = document.getElementById('recommendationsContainer');
        
        if (!this.data.recommendations || this.data.recommendations.length === 0) {
            container.innerHTML = '<p>No recommendations available.</p>';
            return;
        }
        
        container.innerHTML = this.data.recommendations.map(rec => \`
            <div class="recommendation-item">
                <div class="recommendation-priority \${rec.priority.toLowerCase()}">\${rec.priority}</div>
                <div class="recommendation-title">\${rec.title}</div>
                <div class="recommendation-description">\${rec.description}</div>
            </div>
        \`).join('');
    }

    renderLog() {
        const container = document.getElementById('logEntries');
        
        // Use mock log entries for now
        const logEntries = [
            { timestamp: new Date().toISOString(), type: 'INFO', message: 'Dashboard initialized' },
            { timestamp: new Date().toISOString(), type: 'INVENTORY', message: 'Function inventory scan completed' }
        ];
        
        container.innerHTML = logEntries.map(entry => \`
            <div class="log-entry">
                <span class="log-timestamp">\${new Date(entry.timestamp).toLocaleTimeString()}</span>
                <span class="log-type">\${entry.type}</span>
                <span class="log-message">\${entry.message}</span>
            </div>
        \`).join('');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getMockData() {
        return {
            summary: {
                totalFunctions: 65,
                migrationProgress: 15,
                completionPercentage: 8,
                statusBreakdown: {
                    pending: 55,
                    analyzing: 5,
                    in_progress: 3,
                    migrated: 2,
                    verified: 0,
                    failed: 0
                },
                riskBreakdown: {
                    low: 25,
                    medium: 20,
                    high: 15,
                    critical: 5
                },
                submoduleBreakdown: {
                    'cv-processing': 25,
                    'admin': 8,
                    'analytics': 7,
                    'multimedia': 6,
                    'premium': 5,
                    'public-profiles': 4,
                    'recommendations': 3,
                    'auth': 2,
                    'core': 3,
                    'i18n': 1,
                    'payments': 1
                }
            },
            bySubmodule: {
                'cv-processing': {
                    functions: [
                        { name: 'analyzeCV', status: 'pending', riskLevel: 'medium', size: 8192 },
                        { name: 'generateCV', status: 'analyzing', riskLevel: 'high', size: 12288 }
                    ]
                }
            },
            dependencies: {
                crossSubmoduleDependencies: []
            },
            recommendations: [
                {
                    type: 'MIGRATION_ORDER',
                    priority: 'HIGH',
                    title: 'Start with Low-Risk Functions',
                    description: '25 low-risk functions are ready for migration'
                }
            ]
        };
    }
}

// Global functions for modal handling
function openStatusModal(functionName) {
    window.dashboard.currentFunction = functionName;
    document.getElementById('modalFunctionName').value = functionName;
    document.getElementById('statusModal').style.display = 'block';
}

function closeStatusModal() {
    document.getElementById('statusModal').style.display = 'none';
    window.dashboard.currentFunction = null;
}

function updateFunctionStatus() {
    const functionName = document.getElementById('modalFunctionName').value;
    const status = document.getElementById('modalStatus').value;
    const notes = document.getElementById('modalNotes').value;
    
    console.log('Updating function status:', { functionName, status, notes });
    
    // Here you would make an API call to update the function status
    // For now, just close the modal
    closeStatusModal();
    
    // Refresh the dashboard
    window.dashboard.refresh();
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new MigrationDashboard();
    window.dashboard.init();
});
`;

    await fs.writeFile(path.join(this.dashboardPath, 'static/dashboard.js'), js);
  }

  /**
   * Update dashboard data files
   */
  async updateDashboardData() {
    // Generate current status report
    const statusReport = await this.tracker.generateStatusReport();
    
    // Save to dashboard data directory
    const dataFile = path.join(this.dashboardPath, 'data/migration-status.json');
    await fs.writeFile(dataFile, JSON.stringify(statusReport, null, 2));
    
    console.log('📊 Dashboard data updated');
  }

  /**
   * Start the dashboard server
   */
  async startServer(port = 3000) {
    console.log(`🌐 Starting Migration Dashboard server on port ${port}...`);
    
    // Simple HTTP server for dashboard
    const http = require('http');
    const url = require('url');
    
    const server = http.createServer(async (req, res) => {
      const parsedUrl = url.parse(req.url);
      let filePath = parsedUrl.pathname;
      
      if (filePath === '/' || filePath === '') {
        filePath = '/index.html';
      }
      
      const fullPath = path.join(this.dashboardPath, filePath.substring(1));
      
      try {
        const content = await fs.readFile(fullPath);
        
        // Set content type
        let contentType = 'text/html';
        if (filePath.endsWith('.css')) contentType = 'text/css';
        if (filePath.endsWith('.js')) contentType = 'application/javascript';
        if (filePath.endsWith('.json')) contentType = 'application/json';
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      } catch (error) {
        res.writeHead(404);
        res.end('Not Found');
      }
    });
    
    server.listen(port, () => {
      console.log(`✅ Dashboard server running at http://localhost:${port}`);
      console.log('🔄 Auto-refresh enabled (30 second intervals)');
    });
    
    this.isRunning = true;
    return server;
  }

  /**
   * Update function status via API
   */
  async updateFunctionStatus(functionName, status, notes = null) {
    try {
      await this.tracker.updateMigrationStatus(functionName, status, notes);
      await this.updateDashboardData();
      
      console.log(`✅ Updated ${functionName} status to ${status}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to update ${functionName} status:`, error);
      return false;
    }
  }

  /**
   * Get current dashboard statistics
   */
  async getStatistics() {
    const report = await this.tracker.generateStatusReport();
    return {
      totalFunctions: report.summary.totalFunctions,
      migrationProgress: report.summary.migrationProgress,
      completionPercentage: report.summary.completionPercentage,
      statusBreakdown: report.summary.statusBreakdown,
      riskBreakdown: report.summary.riskBreakdown,
      readyForMigration: this.tracker.getFunctionsReadyForMigration().length,
      lastUpdate: new Date().toISOString()
    };
  }
}

module.exports = MigrationStatusDashboard;

// CLI support
if (require.main === module) {
  const dashboard = new MigrationStatusDashboard();
  
  const command = process.argv[2];
  const port = parseInt(process.argv[3]) || 3000;
  
  switch (command) {
    case 'init':
      dashboard.initialize().then(() => {
        console.log('✅ Migration dashboard initialized successfully');
      }).catch(error => {
        console.error('❌ Dashboard initialization failed:', error);
        process.exit(1);
      });
      break;
      
    case 'serve':
      dashboard.initialize().then(() => {
        return dashboard.startServer(port);
      }).then(() => {
        // Keep server running
        console.log('Press Ctrl+C to stop the server');
      }).catch(error => {
        console.error('❌ Dashboard server failed:', error);
        process.exit(1);
      });
      break;
      
    case 'update':
      dashboard.initialize().then(() => {
        return dashboard.updateDashboardData();
      }).then(() => {
        console.log('✅ Dashboard data updated successfully');
      }).catch(error => {
        console.error('❌ Dashboard update failed:', error);
        process.exit(1);
      });
      break;
      
    default:
      console.log(`
CVPlus Migration Status Dashboard

Usage:
  node migration-status.js init         - Initialize dashboard
  node migration-status.js serve [port] - Start dashboard server (default: 3000)
  node migration-status.js update       - Update dashboard data

Examples:
  node migration-status.js init
  node migration-status.js serve 8080
  node migration-status.js update
      `);
  }
}