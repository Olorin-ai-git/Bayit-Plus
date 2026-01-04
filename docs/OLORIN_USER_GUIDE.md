# Olorin User Guide

**Version**: 1.0  
**Last Updated**: 2025-01-11  
**Audience**: End Users

Welcome to Olorin! This guide will help you navigate and use the Olorin fraud detection and investigation platform.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Creating an Investigation](#creating-an-investigation)
4. [Monitoring Investigation Progress](#monitoring-investigation-progress)
5. [Viewing Investigation Results](#viewing-investigation-results)
6. [Managing Investigations](#managing-investigations)
7. [Analytics Dashboard](#analytics-dashboard)
8. [Anomaly Detection](#anomaly-detection)
9. [Creating Detectors](#creating-detectors)
10. [Generating Reports](#generating-reports)
11. [Tips and Best Practices](#tips-and-best-practices)
12. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Logging In

1. Navigate to the Olorin login page
2. Enter your username and password
3. Click **Sign In**

You'll be redirected to the main dashboard after successful authentication.

### First Time Setup

If this is your first time using Olorin, familiarize yourself with:
- **Navigation Menu**: Located on the left sidebar
- **Main Dashboard**: Overview of all investigations and analytics
- **Investigation Wizard**: Step-by-step investigation creation

---

## Dashboard Overview

The Olorin dashboard provides a comprehensive view of your fraud detection operations.

### Main Sections

1. **Investigations Management**
   - View all investigations
   - Filter by status, date, or search
   - Quick actions: View, Delete, Replay

2. **Analytics Dashboard**
   - Fraud metrics and KPIs
   - Trend graphs
   - Anomaly detection overview

3. **Quick Actions**
   - Create New Investigation
   - View Recent Anomalies
   - Access Detector Studio

### Navigation

- **Investigations**: Manage and view all investigations
- **Analytics**: Access analytics dashboard, anomalies, and detectors
- **Reports**: View and generate investigation reports

---

## Creating an Investigation

Olorin offers two ways to create investigations:

### Method 1: Entity-Based Investigation

Investigate a specific entity (IP address, user ID, email, device, etc.).

#### Step 1: Access the Investigation Wizard

1. Click **"New Investigation"** from the dashboard or investigations page
2. You'll be taken to the **Settings** page

#### Step 2: Configure Investigation Settings

**Investigation Name**
- Enter a descriptive name (e.g., "Suspicious Activity - IP 192.168.1.100")

**Entity Type**
- Select the type of entity you're investigating:
  - **IP Address**: For IP-based investigations
  - **User ID**: For user account investigations
  - **Email**: For email-based investigations
  - **Device ID**: For device fingerprinting investigations
  - **Session ID**: For session-based investigations

**Entity Value**
- Enter the specific entity value (e.g., IP address, user ID, email address)

**Time Range**
- **Quick Select**: Choose from predefined ranges:
  - Last 24 hours
  - Last 7 days
  - Last 30 days
  - Last 180 days
- **Custom Range**: Select specific start and end dates/times

**Investigation Type**
- **Structured**: You select specific tools to use
- **Hybrid**: AI automatically selects the best tools based on context (Recommended)

**Tools** (Structured investigations only)
- Select tools you want to use:
  - Snowflake Query
  - VirusTotal
  - Shodan
  - OSINT Tools
  - SIEM Logs
  - And more...

#### Step 3: Start Investigation

1. Review your settings
2. Click **"Start Investigation"**
3. You'll be automatically redirected to the **Progress** page

### Method 2: Risk-Based Investigation (Auto-Select Entities)

Let Olorin automatically identify high-risk entities for investigation.

#### Steps:

1. Click **"New Investigation"**
2. Select **"Risk-Based"** mode
3. Choose time range (7 days or 14 days)
4. Click **"Start Investigation"**

**What Happens:**
- Olorin queries transaction data for highest risk-weighted entities
- System identifies top 3 entities
- Chooses the final investigation target
- Automatically starts investigation

---

## Monitoring Investigation Progress

Once an investigation starts, you'll see real-time progress updates on the **Progress** page.

### Progress Page Features

#### 1. Progress Indicator
- **Overall Progress**: Percentage complete (0-100%)
- **Current Phase**: Which phase is currently executing
- **Elapsed Time**: How long the investigation has been running

#### 2. Phase Tracking
Investigation phases:
- **Initialization**: Setting up investigation (5%)
- **Context Preparation**: Preparing data and context (15%)
- **Agent Investigation**: Running analysis agents (70%)
- **Results Processing**: Aggregating results (10%)
- **Completion**: Finalizing investigation (1%)

#### 3. Agent Status
View status of each domain agent:
- **Device Agent**: Device fingerprinting analysis
- **Location Agent**: Geographic analysis
- **Network Agent**: Network security analysis
- **Logs Agent**: SIEM log analysis
- **Risk Agent**: ML-based risk assessment

Each agent shows:
- Status (Running, Completed, Failed)
- Risk Score (0-100)
- Execution time

#### 4. Tool Executions
See all tools being executed:
- Tool name
- Status
- Duration
- Results summary

#### 5. Live Logs
- Real-time log entries
- Filter by agent or tool
- Search logs
- Expand/collapse sidebar for detailed view

#### 6. Risk Metrics
- **Overall Risk Score**: Current risk assessment (0-100)
- **Confidence Score**: How confident the system is in results (0-1)
- **Risk Progression**: How risk score changes over time

#### 7. Domain Findings
View findings by domain:
- **Device**: Device-related findings and risk score
- **Location**: Location-based findings
- **Network**: Network security findings
- **Logs**: SIEM log analysis findings

Each domain shows:
- Risk score
- Key findings
- Evidence
- LLM analysis and reasoning

### What to Expect

**Typical Investigation Duration:**
- Simple investigations: 2-5 minutes
- Complex investigations: 5-15 minutes
- Very complex investigations: 15-30 minutes

**Progress Updates:**
- Updates every 2-5 seconds automatically
- No need to refresh the page
- Connection status indicator shows if updates are working

### While Waiting

- You can navigate away and return later
- Progress is saved automatically
- You'll receive notifications when complete (if enabled)

---

## Viewing Investigation Results

After an investigation completes, you can view comprehensive results.

### Results Page Sections

#### 1. Executive Summary
- **Overall Risk Score**: Final risk assessment
- **Confidence Score**: System confidence in results
- **Investigation Status**: Completed, Failed, or Cancelled
- **Key Findings**: Top-level summary

#### 2. Risk Assessment
- **Risk Level**: High, Medium, Low, or No Risk
- **Risk Breakdown**: Risk scores by domain
- **Risk Progression Chart**: How risk changed during investigation

#### 3. Agent Analysis Results
Detailed results from each agent:
- **Device Agent**: Device fingerprints, device history, anomalies
- **Location Agent**: Geographic patterns, location history
- **Network Agent**: Network security findings, IP reputation
- **Logs Agent**: SIEM log analysis, security events
- **Risk Agent**: ML-based risk assessment

#### 4. Performance Metrics
- **Total Execution Time**: How long investigation took
- **Agent Execution Times**: Time per agent
- **Tool Execution Count**: Number of tools used
- **Success Rate**: Percentage of successful tool executions

#### 5. Recommendations
- **Immediate Actions**: What to do right away
- **Follow-up Actions**: Next steps to take
- **Prevention Measures**: How to prevent similar issues

#### 6. Evidence and Artifacts
- **Transaction Data**: Relevant transaction records
- **Log Entries**: Security and application logs
- **External Intelligence**: VirusTotal, Shodan, OSINT data
- **Charts and Visualizations**: Risk score over time, agent execution timeline

### Exporting Results

1. Click **"Generate Report"** button
2. Wait for report generation (may take 1-3 minutes)
3. Click **"View Report"** to open HTML report in new tab
4. Report includes all findings, charts, and recommendations

---

## Managing Investigations

### Investigations Management Page

Access via **Investigations** menu item.

#### Features

**Investigation List**
- View all investigations in a table
- Sort by: Name, Status, Created Date, Risk Score
- Filter by: Status, Date Range, Search Query

**Status Filters**
- **All**: Show all investigations
- **Pending**: Not yet started
- **In Progress**: Currently running
- **Completed**: Successfully finished
- **Failed**: Investigation errors
- **Cancelled**: User-cancelled investigations

**Search**
- Search by investigation name, ID, or entity value
- Real-time filtering as you type

**Bulk Actions**
- Select multiple investigations
- Bulk delete
- Export selected investigations

#### Investigation Actions

**View Details**
- Click on an investigation row
- Opens investigation details modal
- Shows: Status, Risk Score, Progress, Entity Info, Timestamps

**Generate Report**
- Click **"Generate Report"** button in details modal
- Only available for completed investigations
- Shows spinner while generating
- Opens report in new tab when ready

**Analytics Button**
- Click **"Analytics"** button in details modal
- Automatically creates a detector based on investigation findings
- Navigates to detector studio
- Detector will monitor for similar patterns

**Delete Investigation**
- Click **"Delete"** button
- Confirmation dialog appears
- Cannot be undone

**Replay Investigation**
- Click **"Replay"** button
- Re-runs investigation with same settings
- Useful for re-analyzing entities

### Investigation Details Modal

When you click on an investigation, a modal opens showing:

**Header**
- Investigation name
- Status badge
- Risk indicator (color-coded)

**Investigation Details**
- Investigation ID
- Created/Updated timestamps
- Entity information
- Time range
- Risk model version
- Sources and tools used

**Risk Assessment**
- Overall risk score
- Risk level (High/Medium/Low/No Risk)
- Visual risk bar

**Progress**
- Overall progress percentage
- Progress bar

**Domain Analysis**
- Location findings and risk score
- Network findings and risk score
- Logs findings and risk score
- Device findings and risk score
- LLM thoughts for each domain

**Actions**
- Generate Report
- Analytics (Create Detector)
- View Analytics
- Delete
- Close

---

## Analytics Dashboard

Access via **Analytics** menu item.

### Dashboard Overview

The analytics dashboard provides insights into fraud patterns and trends.

#### KPI Tiles
- **Total Transactions**: Count of transactions in time period
- **Fraud Rate**: Percentage of fraudulent transactions
- **Precision**: Accuracy of fraud detection
- **Recall**: Coverage of fraud detection
- **F1 Score**: Balanced metric of precision and recall

#### Trend Graphs
- **Fraud Rate Over Time**: Line chart showing fraud trends
- **Transaction Volume**: Volume trends
- **Approval Rate**: Approval rate trends

#### Filters
- **Time Window**: 1h, 24h, 7d, 30d, 90d, All
- **Custom Date Range**: Select specific dates
- **Investigation Filter**: Filter by investigation ID

### Anomaly Hub

Access via **Analytics → Anomalies**.

#### Features

**Anomaly List**
- View all detected anomalies
- Sort by: Score, Severity, Date, Metric
- Filter by: Severity, Status, Detector, Date Range

**Anomaly Details**
- Click on an anomaly to view details
- Shows: Cohort, Metric, Score, Severity, Time Window
- Evidence and detector information

**Investigate Anomaly**
- Click **"Investigate"** button on an anomaly
- Creates investigation from anomaly automatically
- Pre-populates entity, time range, and context
- Navigates to investigation progress page

**Anomaly Status**
- **New**: Recently detected, not yet reviewed
- **Triaged**: Under review
- **Closed**: Resolved or false positive

### Detector Studio

Access via **Analytics → Detectors**.

#### Creating a Detector

**Method 1: Manual Creation**

1. Click **"Create Detector"**
2. Fill in detector configuration:
   - **Name**: Descriptive name
   - **Type**: STL+MAD, CUSUM, or Isolation Forest
   - **Metrics**: Select metrics to monitor (tx_count, decline_rate, etc.)
   - **Cohort Dimensions**: Select grouping (geo, merchant_id, channel)
   - **Parameters**: Adjust sensitivity (k), persistence, min support
3. Click **"Create"**

**Method 2: From Investigation**

1. Open investigation details modal
2. Click **"Analytics"** button
3. Detector is automatically created with:
   - Metrics from investigation findings
   - Cohorts based on investigation entity types
   - Investigation ID stored for tracking
4. Review and adjust detector settings if needed

#### Detector Configuration

**Detector Types**
- **STL+MAD**: Best for seasonal patterns
- **CUSUM**: Best for detecting mean shifts
- **Isolation Forest**: Best for multivariate anomalies

**Metrics**
- `tx_count`: Transaction count
- `decline_rate`: Decline rate (0-1)
- `refund_rate`: Refund rate
- `amount_mean`: Average transaction amount
- `unique_devices`: Unique device count
- And more...

**Cohort Dimensions**
- `geo`: Geographic region
- `merchant_id`: Merchant identifier
- `channel`: Channel type (web, mobile, etc.)

**Parameters**
- **K (Threshold Multiplier)**: Higher = fewer anomalies (default: 3.5)
- **Persistence**: Number of consecutive windows required (default: 2)
- **Min Support**: Minimum data points needed (default: 50)

#### Previewing Detectors

1. Configure detector settings
2. Click **"Preview"** button
3. View chart showing:
   - Time series data
   - Detected anomalies (highlighted)
   - Expected vs observed values
4. Adjust parameters and preview again
5. Click **"Create"** when satisfied

#### Managing Detectors

- **Edit**: Modify detector configuration
- **Enable/Disable**: Toggle detector on/off
- **Delete**: Remove detector
- **View Anomalies**: See anomalies detected by this detector

---

## Anomaly Detection

### Understanding Anomalies

Anomalies are statistical deviations in transaction patterns that may indicate fraud or issues.

#### Anomaly Components

**Cohort**
- Grouping dimensions (e.g., `{"geo": "US-CA", "merchant_id": "m_001"}`)
- Defines which segment the anomaly affects

**Metric**
- What metric was anomalous (e.g., `decline_rate`, `tx_count`)
- The measurement that deviated from normal

**Time Window**
- 15-minute time window when anomaly occurred
- Example: 10:15 AM - 10:30 AM

**Score**
- Anomaly severity score (0-10+)
- Higher scores = more significant anomalies

**Severity**
- **Info**: Minor deviation, informational
- **Warn**: Moderate deviation, worth reviewing
- **Critical**: Significant deviation, requires investigation

**Evidence**
- Detector-specific evidence
- Residuals, changepoints, or other statistical indicators

### Working with Anomalies

#### Viewing Anomalies

1. Navigate to **Analytics → Anomalies**
2. Use filters to find specific anomalies:
   - Filter by severity (Critical, Warn, Info)
   - Filter by status (New, Triaged, Closed)
   - Filter by detector
   - Filter by date range
3. Click on an anomaly to view details

#### Investigating Anomalies

**Automatic Investigation**
- Critical anomalies (severity=critical, persistence≥2, score≥4.5) may auto-create investigations
- Check Investigations page for new investigations

**Manual Investigation**
1. Open anomaly details
2. Click **"Investigate"** button
3. Investigation is created with:
   - Entity extracted from anomaly cohort
   - Time range from anomaly window
   - Anomaly context pre-populated
4. Navigate to investigation progress page

#### Anomaly Status Management

**Triaging Anomalies**
1. Review anomaly details
2. Click **"Triage"** button
3. Add notes or comments
4. Status changes to "Triaged"

**Closing Anomalies**
1. After investigation or review
2. Click **"Close"** button
3. Select reason: Resolved, False Positive, etc.
4. Status changes to "Closed"

---

## Creating Detectors

Detectors monitor transaction metrics for anomalies and can automatically trigger investigations.

### When to Create a Detector

Create detectors when:
- You've found a fraud pattern in an investigation
- You want to monitor specific metrics continuously
- You need to catch similar patterns automatically

### Creating from Investigation Findings

**Easiest Method:**

1. Complete an investigation
2. Open investigation details modal
3. Click **"Analytics"** button
4. Detector is automatically created with:
   - Metrics based on investigation findings
   - Cohorts based on entity types
   - Investigation ID stored for reference
5. Review detector in Detector Studio
6. Adjust parameters if needed
7. Enable detector

**What Gets Created:**
- Detector name: "Detector: {Investigation Name}"
- Metrics: Extracted from investigation (e.g., decline_rate, tx_count)
- Cohorts: Based on investigation entity types (e.g., geo, merchant_id)
- Default parameters: Sensible defaults (k=3.5, persistence=2)

### Manual Detector Creation

1. Navigate to **Analytics → Detectors**
2. Click **"Create Detector"**
3. Configure:
   - **Name**: Descriptive name
   - **Type**: Choose algorithm (STL+MAD recommended for most cases)
   - **Metrics**: Select what to monitor
   - **Cohorts**: Select grouping dimensions
   - **Parameters**: Adjust sensitivity
4. Click **"Preview"** to test
5. Review preview results
6. Click **"Create"** when ready

### Detector Best Practices

**Starting Points:**
- Begin with common metrics: `tx_count`, `decline_rate`
- Use `geo` cohort for geographic monitoring
- Start with default parameters (k=3.5, persistence=2)

**Tuning:**
- **Too many false positives**: Increase `k` (e.g., 3.5 → 4.0), increase `persistence` (2 → 3)
- **Missing real issues**: Decrease `k` (e.g., 3.5 → 3.0), decrease `persistence` (2 → 1)
- **Not enough data**: Decrease `min_support` (50 → 30)

**Testing:**
- Always use Preview before creating
- Test on historical data
- Review detected anomalies
- Adjust parameters based on results

---

## Generating Reports

### Investigation Reports

Investigation reports provide comprehensive HTML documents with all investigation findings.

#### Generating a Report

**From Investigation Details Modal:**
1. Open investigation details modal
2. Ensure investigation is **Completed**
3. Click **"Generate Report"** button
4. Wait for generation (spinner shows progress)
5. Click **"View Report"** when ready
6. Report opens in new browser tab

**From Progress Page:**
1. Navigate to investigation progress page
2. Wait for investigation to complete
3. Click **"Create Report"** button
4. Wait for generation
5. Click **"View Report"** when ready

**Report Generation Time:**
- Template-based: 10-30 seconds
- LLM-based: 1-3 minutes (if enabled)

#### Report Contents

**Executive Summary**
- Overall risk score
- Confidence score
- Key findings summary
- Investigation status

**Risk Analyzer Flow** (Collapsible)
- How entities were selected
- Top 3 entities identified
- Final entity chosen for investigation
- Time window and fallback logic

**Risk Assessment**
- Overall risk level
- Risk score breakdown
- Risk progression over time

**Agent Analysis Results**
- Device Agent findings
- Location Agent findings
- Network Agent findings
- Logs Agent findings
- Risk Agent assessment

**Performance Metrics**
- Total execution time
- Agent execution times
- Tool execution details
- Success rates

**Charts and Visualizations**
- Risk Score Over Time (SVG chart)
- Agent Execution Timeline (SVG chart)
- Time series visualizations

**Tool Execution Details**
- All tools used
- Execution results
- Evidence collected

**Recommendations**
- Immediate actions
- Follow-up actions
- Prevention measures

**Journey Tracking Summary**
- Investigation phases
- Progress tracking
- Thought processes summary

#### Report Features

- **Collapsible Sections**: Click headers to expand/collapse
- **Print-Friendly**: Optimized for printing
- **Export**: Save HTML file or print to PDF
- **Shareable**: Send report URL to team members

---

## Tips and Best Practices

### Investigation Best Practices

**1. Use Descriptive Names**
- Name investigations clearly (e.g., "Fraud Investigation - IP 192.168.1.100 - Jan 11")
- Makes it easier to find later

**2. Choose Appropriate Time Ranges**
- **Recent Activity**: Use 7-30 days for recent issues
- **Historical Analysis**: Use 180 days for pattern analysis
- **Custom Ranges**: Use specific dates for known incidents

**3. Start with Hybrid Investigations**
- Let AI select tools automatically
- More comprehensive analysis
- Can switch to structured if needed

**4. Monitor Progress**
- Check progress page regularly
- Review agent status
- Watch for errors or warnings

**5. Review All Domain Findings**
- Don't just look at overall risk score
- Review each domain (Device, Location, Network, Logs)
- Each domain provides unique insights

### Anomaly Detection Best Practices

**1. Start Broad, Then Narrow**
- Begin with common metrics (`tx_count`, `decline_rate`)
- Use common cohorts (`geo`)
- Refine based on results

**2. Use Multiple Metrics**
- Monitor related metrics together
- Example: `tx_count` + `decline_rate` + `amount_mean`
- Provides comprehensive coverage

**3. Test Before Enabling**
- Always preview detectors
- Review historical anomalies
- Adjust parameters based on results

**4. Monitor Detector Performance**
- Review anomaly quality regularly
- Adjust parameters as needed
- Disable detectors that produce too many false positives

### Report Best Practices

**1. Generate Reports for Completed Investigations**
- Reports are only available for completed investigations
- Wait for investigation to finish before generating

**2. Review Reports Thoroughly**
- Check all sections
- Review recommendations
- Share with team members

**3. Use Reports for Documentation**
- Save reports for audit trails
- Include in incident reports
- Reference in follow-up investigations

### Keyboard Shortcuts

- **Ctrl/Cmd + K**: Focus search
- **Ctrl/Cmd + N**: New investigation
- **Esc**: Close modals
- **Tab**: Navigate between form fields

---

## Troubleshooting

### Common Issues

#### Investigation Won't Start

**Problem**: Clicking "Start Investigation" doesn't work

**Solutions**:
1. Check that all required fields are filled
2. Verify entity value is valid
3. Ensure time range is valid (end after start)
4. Check browser console for errors
5. Refresh page and try again

#### Investigation Stuck in Progress

**Problem**: Investigation shows "In Progress" but no updates

**Solutions**:
1. Check connection status indicator
2. Refresh the page
3. Check server logs (if you have access)
4. Contact support if persists

#### Report Generation Fails

**Problem**: Report generation shows error

**Solutions**:
1. Ensure investigation is completed
2. Wait a few minutes and try again
3. Check that investigation has results
4. Try template-based report (if LLM-based fails)

#### Can't Find Investigation

**Problem**: Investigation not showing in list

**Solutions**:
1. Check filters (status, date range)
2. Clear search query
3. Check "All" tab
4. Verify investigation ID
5. Refresh page

#### Anomaly Investigation Not Created

**Problem**: Clicked "Investigate" but no investigation appears

**Solutions**:
1. Check Investigations page
2. Look for investigations with anomaly ID in name
3. Check if investigation is still creating
4. Verify anomaly has valid entity in cohort
5. Refresh page

#### Detector Not Finding Anomalies

**Problem**: Detector enabled but no anomalies detected

**Solutions**:
1. Check detector is enabled
2. Verify metrics exist in data
3. Check cohort dimensions match data
4. Lower `k` parameter (more sensitive)
5. Decrease `persistence` requirement
6. Check `min_support` isn't too high

### Getting Help

**Support Resources**:
- Check documentation
- Review investigation logs
- Contact your system administrator
- Submit support ticket

**Useful Information to Provide**:
- Investigation ID
- Error messages
- Steps to reproduce
- Browser and version
- Screenshots

---

## Glossary

**Agent**: Specialized AI component that analyzes specific domains (Device, Location, Network, Logs, Risk)

**Anomaly**: Statistical deviation in transaction patterns detected by detectors

**Cohort**: Grouping dimensions for analysis (e.g., geographic region, merchant, channel)

**Detector**: Configuration that monitors metrics for anomalies

**Entity**: Subject of investigation (IP address, user ID, email, device, etc.)

**Investigation**: Analysis process that examines entities for fraud indicators

**Metric**: Measurement being monitored (e.g., transaction count, decline rate)

**Risk Score**: Numerical assessment of fraud risk (0-100)

**Severity**: Anomaly importance level (info, warn, critical)

**Tool**: External service or data source used in investigation (Snowflake, VirusTotal, etc.)

---

## Quick Reference

### Investigation Types

| Type | Description | When to Use |
|------|-------------|-------------|
| **Structured** | User selects tools | Specific analysis goals |
| **Hybrid** | AI selects tools | Exploratory investigations |

### Investigation Modes

| Mode | Description | When to Use |
|------|-------------|-------------|
| **Entity** | User specifies entity | Known entity to investigate |
| **Risk** | Auto-selects entities | Proactive high-risk monitoring |

### Entity Types

- **IP Address**: Network/IP-based investigations
- **User ID**: User account investigations
- **Email**: Email-based investigations
- **Device ID**: Device fingerprinting
- **Session ID**: Session-based investigations

### Detector Types

| Type | Best For | Description |
|------|----------|-------------|
| **STL+MAD** | Seasonal patterns | Decomposes time series, detects outliers |
| **CUSUM** | Mean shifts | Detects changes in mean values |
| **Isolation Forest** | Multivariate anomalies | Detects anomalies in multiple dimensions |

### Common Metrics

- `tx_count`: Transaction count
- `decline_rate`: Decline rate (0-1)
- `refund_rate`: Refund rate
- `amount_mean`: Average transaction amount
- `unique_devices`: Unique device count

### Common Cohorts

- `geo`: Geographic region
- `merchant_id`: Merchant identifier
- `channel`: Channel type (web, mobile, etc.)

---

## Conclusion

This guide covers the essential features of Olorin. As you use the platform, you'll discover additional features and workflows that suit your specific needs.

**Remember**:
- Start with simple investigations to learn the system
- Use Hybrid investigations for comprehensive analysis
- Create detectors from successful investigations
- Review reports thoroughly for insights
- Don't hesitate to experiment with different settings

For additional help or advanced features, consult the technical documentation or contact your system administrator.

**Happy Investigating!** 🕵️‍♂️

