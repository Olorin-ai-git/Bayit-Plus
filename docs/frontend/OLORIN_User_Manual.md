# OLORIN Fraud Investigation System - User Manual

**Version 1.0 | January 2024**  
**Intuit Trust & Safety - Fraud Prevention NYC**

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Navigation Overview](#3-navigation-overview)
4. [Managing Investigations](#4-managing-investigations)
5. [Running a New Investigation](#5-running-a-new-investigation)
6. [Understanding Results](#6-understanding-results)
7. [AI-Powered Investigations](#7-ai-powered-investigations)
8. [Settings](#8-settings)
9. [Tips & Best Practices](#9-tips--best-practices)
10. [Troubleshooting](#10-troubleshooting)
11. [Glossary](#11-glossary)

---

## 1. Introduction

### What is OLORIN?

OLORIN (General Artificial Intelligence Assistant) is Intuit's advanced fraud investigation system that helps Trust & Safety teams identify and analyze potentially fraudulent activities. It combines automated analysis with AI-powered insights to provide comprehensive fraud assessments.

### Who Should Use This Manual?

- Trust & Safety analysts
- Fraud investigators  
- Policy team members
- Anyone investigating suspicious user activities

### Key Features

✅ **Automated Investigation** - Run comprehensive fraud checks with one click  
✅ **Real-time Analysis** - Get live updates as investigations progress  
✅ **Risk Assessment** - Receive detailed risk scores and explanations  
✅ **AI Chat** - Interact with AI agents for deeper investigation  
✅ **Investigation Management** - Track and manage multiple cases  
✅ **Team Collaboration** - Add comments and share findings  

---

## 2. Getting Started

### System Requirements

- **Browser**: Chrome, Firefox, Safari, or Edge (latest versions)
- **Connection**: Stable internet required for real-time updates
- **Screen**: Minimum 1280x720 (1920x1080 recommended)

### Accessing OLORIN

1. Open your web browser
2. Navigate to the OLORIN system URL
3. Log in with your Intuit credentials
4. You'll see the main OLORIN dashboard

### First Time Setup

1. Visit **Settings** to configure preferences
2. Review **Investigations** page for existing cases
3. Familiarize yourself with the navigation menu

---

## 3. Navigation Overview

### Main Navigation

The OLORIN interface has four main sections:

#### 🔍 **Investigations**
- View all existing investigations
- Filter and search cases
- Manage investigation lifecycle
- Export results

#### 🐛 **New Investigation**  
- Start new fraud investigations
- Configure investigation parameters
- Monitor real-time progress
- Review detailed results

#### 💬 **Investigate with AI**
- Chat with AI agents
- Ask complex investigation questions
- Get AI-powered insights
- Use advanced analysis tools

#### ⚙️ **Settings**
- Configure system preferences
- Set investigation defaults
- Manage user settings
- Access system information

---

## 4. Managing Investigations

### Viewing All Investigations

Navigate to **Investigations** to see a table with:

| Column | Description |
|--------|-------------|
| **Investigation ID** | Unique case identifier (INV-xxxxxxxxx) |
| **Entity Type** | User ID or Device ID investigation |
| **Status** | Current state (In Progress, Completed, Failed) |
| **Risk Score** | Overall fraud risk (0.0 = Low, 1.0 = High) |
| **Created** | When investigation started |
| **Actions** | View, edit, delete options |

### Investigation Status

| Status | Meaning |
|--------|---------|
| 🟢 **Completed** | Investigation finished successfully |
| 🟡 **In Progress** | Currently running |
| 🔴 **Failed** | Encountered an error |
| ⚪ **Cancelled** | Stopped by user |

### Available Actions

#### **👁️ View Details**
- See complete investigation results
- Review risk scores and findings
- View investigation timeline

#### **✏️ Edit**
- Modify investigation parameters
- Add comments or notes
- Update status

#### **🗑️ Delete**
- Remove unwanted investigations
- ⚠️ **Warning**: Cannot be undone

#### **☑️ Bulk Operations**
- Select multiple investigations
- Delete multiple cases
- Export batch results

### Filtering Investigations

Use filters to find specific cases:
- **Risk Level**: High, Medium, Low
- **Date Range**: Filter by creation date  
- **Entity Type**: User ID or Device ID only
- **Status**: Filter by completion status

---

## 5. Running a New Investigation

### Starting an Investigation

1. Click **"New Investigation"** in navigation
2. Complete the investigation setup form

### Step 1: Choose Investigation Type

**🙋 User ID Investigation**
- Investigate specific user account
- Analyzes behavior, location, device patterns
- Use when you have suspicious user ID

**💻 Device ID Investigation**  
- Investigate specific device
- Analyzes device usage and associated accounts
- Use when you have suspicious device identifier

### Step 2: Enter the Target ID

- **User ID**: Enter numeric user identifier
- **Device ID**: Enter device identifier string
- System validates ID format automatically

### Step 3: Configure Settings

#### **Time Range**
- **7 days**: Quick recent activity analysis
- **30 days**: Standard period (recommended)
- **90 days**: Comprehensive historical analysis

#### **Investigation Mode**
- **Manual**: Step through each phase manually
- **Autonomous**: System runs all checks automatically ⭐

#### **Processing Mode**
- **Parallel**: Run steps simultaneously (faster) ⭐
- **Sequential**: Run steps one-by-one (detailed logs)

### Step 4: Select Investigation Steps

Choose which analyses to include:

#### 🌐 **Network Analysis**
- IP address patterns
- VPN/proxy detection
- Connection anomalies
- Geographic inconsistencies

#### 📍 **Location Analysis**
- Geographic movement patterns
- Impossible travel scenarios
- Location vs. stated address
- Historical location changes

#### 💻 **Device Analysis**
- Device fingerprinting
- Hardware characteristics
- Device sharing patterns
- Usage consistency

#### 📋 **Log Analysis**
- System activity logs
- Login pattern analysis
- Transaction behaviors
- Activity anomalies

#### ⚠️ **Risk Assessment**
- Overall fraud probability
- Risk factor analysis
- Confidence scoring
- Recommendation generation

**💡 Tip**: Keep all steps enabled for comprehensive analysis

### Running the Investigation

1. Click **"Start Investigation"**
2. Investigation begins immediately
3. Monitor real-time progress

### Monitoring Progress

#### **Progress Indicators**
- **Progress Bar**: Overall completion percentage
- **Current Step**: Which analysis is running
- **Agent Status**: Color-coded step indicators
  - 🟢 Green: Completed successfully
  - 🟡 Yellow: Currently running
  - 🔴 Red: Error encountered
  - ⚪ Gray: Not started

#### **Real-time Log**
- Live updates from each step
- Detailed analysis information
- Error messages and warnings
- Progress timestamps

#### **Investigation Timer**
- Shows elapsed time
- Helps track performance
- Useful for reporting

### Investigation Controls

While running, you can:

#### **⏸️ Pause**
- Temporarily stop investigation
- Resume from current point
- Useful when waiting for additional info

#### **⏹️ Stop**
- Completely halt investigation
- Cannot resume (must restart)
- Use when investigation not needed

#### **📋 Clear Logs**
- Remove log display clutter
- Doesn't affect investigation
- Logs still saved in results

#### **💬 Add Comments**
- Add investigator notes
- Include context/observations
- Comments saved with results

---

## 6. Understanding Results

### Risk Score Overview

After completion, you'll see an **Overall Risk Score**:

| Risk Level | Score | Color | Action Required |
|------------|-------|-------|-----------------|
| **Low Risk** | 0.0 - 0.3 | 🟢 Green | Normal behavior, monitor |
| **Medium Risk** | 0.3 - 0.7 | 🟡 Yellow | Review required |
| **High Risk** | 0.7 - 1.0 | 🔴 Red | Immediate attention |

### Detailed Analysis Results

Each investigation step provides specific insights:

#### **Network Analysis**
- IP address usage patterns
- VPN/proxy service detection
- Geographic connection consistency
- Unusual network behaviors

#### **Location Analysis**  
- Geographic movement patterns
- Impossible travel scenarios
- Location vs. stated address
- Historical location changes

#### **Device Analysis**
- Unique device characteristics
- Multiple user detection
- Device consistency over time
- Hardware anomalies

#### **Log Analysis**
- User activity patterns
- Login/logout behaviors
- Transaction patterns
- System interaction anomalies

### Investigation Summary

Each completed investigation includes:

#### **Executive Summary**
- High-level findings overview
- Key risk factors identified
- Recommended next actions
- Confidence assessment

#### **Detailed Findings**
- Step-by-step results
- Supporting evidence
- Technical analysis details
- Data sources used

#### **Risk Breakdown**
- Contributing risk factors
- Factor confidence levels
- Comparison to normal patterns
- Historical context

### Exporting Results

Export options available:
- **📄 PDF Report**: Formatted investigation report
- **📊 CSV Data**: Raw data for analysis
- **🔧 JSON**: Technical data for integration

---

## 7. AI-Powered Investigations

### Accessing AI Chat

1. Click **"Investigate with AI"** 
2. Enter the AI investigation interface
3. Start chatting with AI agents

### AI Agent Capabilities

The system includes specialized agents:

#### **🔍 Investigation Agent**
- General fraud investigation assistance
- Data analysis and interpretation
- Pattern recognition
- Investigation guidance

#### **⚠️ Risk Assessment Agent**
- Specialized risk scoring
- Risk factor analysis
- Threat assessment
- Probability calculations

#### **📊 Pattern Analysis Agent**
- Behavioral pattern recognition
- Anomaly detection
- Trend analysis
- Comparative analysis

#### **📋 Policy Agent**
- Fraud policy guidance
- Compliance requirements
- Procedure recommendations
- Regulatory considerations

### Using AI Chat Effectively

#### **Starting Conversations**
Be specific in your questions:

**Good Examples**:
- "Analyze user ID 12345 for fraud risk over the last 30 days"
- "What location patterns do you see for device ABC123?"
- "Compare behavior between users 12345 and 67890"
- "Explain why user 12345 has a high risk score"

**Less Effective**:
- "Is this user bad?"
- "Check this account"
- "What do you think?"

#### **Advanced AI Features**

**🔧 Tool Integration**
- Real-time data queries
- Database access
- Custom report generation
- Complex analysis tasks

**🔄 Multi-step Analysis**
- Follow-up questions
- Building on previous analysis
- Combining data sources
- Comprehensive narratives

**👥 Collaboration**
- Share chat sessions
- Export conversations
- Reference in formal reports
- Team knowledge sharing

### Best Practices for AI Chat

#### **Be Specific**
- Include exact IDs and timeframes
- Specify analysis type needed
- Mention particular concerns

#### **Ask Follow-ups**
- Dig deeper into findings
- Request clarification
- Ask for additional evidence

#### **Verify Results**
- Cross-reference with manual investigation
- Use AI as starting point
- Document both AI and human findings

---

## 8. Settings

### User Preferences

#### **Investigation Defaults**
- **Time Range**: Set preferred analysis period
- **Investigation Mode**: Manual or autonomous default
- **Processing**: Parallel or sequential default

#### **Display Settings**
- **Theme**: Light or dark mode
- **Log Detail**: Choose verbosity level
- **Auto-refresh**: Page refresh intervals

#### **Notifications**
- **Completion Alerts**: When investigations finish
- **Error Notifications**: Investigation failures
- **Email Updates**: If available

### System Configuration

#### **Performance Settings**
- **Timeout Values**: Response wait times
- **Retry Attempts**: Automatic retry behavior
- **Connection Settings**: Network configuration

#### **Data Management**
- **Data Sources**: Primary and backup sources
- **Retention Periods**: How long to keep results
- **Export Permissions**: Who can export data

### Team Collaboration

#### **Sharing Features**
- **Comment Sharing**: Team comment access
- **Investigation Sharing**: Case sharing permissions
- **Role Access**: Feature access by role

#### **Audit & Compliance**
- **Activity Logging**: User action tracking
- **Access Controls**: Investigation access management
- **Data Security**: Export and sharing restrictions

---

## 9. Tips & Best Practices

### Investigation Workflow

#### **Before Starting**
1. **Gather Context** - Understand why investigating
2. **Check Recent Activity** - Look for immediate flags
3. **Set Expectations** - Define desired outcome
4. **Document Reasoning** - Note investigation trigger

#### **During Investigation**
1. **Monitor Progress** - Watch real-time logs
2. **Take Notes** - Add comments on findings
3. **Stay Objective** - Let data guide conclusions
4. **Be Patient** - Comprehensive analysis takes time

#### **After Investigation**
1. **Review All Results** - Don't just check risk score
2. **Cross-reference** - Compare across analysis types
3. **Document Conclusions** - Add final assessment
4. **Plan Follow-up** - Determine next steps

### Efficiency Tips

#### **Smart Filtering**
- Filter by risk level for prioritization
- Use date filters for recent cases
- Combine filters for specific searches

#### **Leverage AI**
- Start with AI analysis first
- Use AI to understand complex patterns
- Ask AI to explain technical findings

#### **Organization**
- Use consistent naming conventions
- Add meaningful comments
- Export important results
- Keep investigation notes

#### **Team Collaboration**
- Share interesting findings
- Use comments for communication
- Document decisions
- Cross-reference team investigations

### Performance Optimization

#### **System Performance**
- Close unnecessary browser tabs
- Use parallel processing
- Clear browser cache regularly
- Ensure stable internet connection

#### **Investigation Speed**
- Start with shorter time ranges
- Use autonomous mode for standard cases
- Manual configuration only when needed
- Prioritize high-risk investigations

---

## 10. Troubleshooting

### Common Issues

#### **Investigation Won't Start**

**Symptoms**: Button doesn't work, error messages

**Solutions**:
1. ✅ Verify valid ID format
2. ✅ Ensure at least one step selected
3. ✅ Refresh page and retry
4. ✅ Check internet connection
5. ✅ Try different browser

#### **Investigation Stuck/Slow**

**Symptoms**: Progress bar not moving, very slow

**Solutions**:
1. ✅ Check system load status
2. ✅ Switch to sequential processing
3. ✅ Reduce time range
4. ✅ Contact administrator
5. ✅ Try during off-peak hours

#### **Missing Results**

**Symptoms**: Incomplete results, failed steps

**Solutions**:
1. ✅ Check for failed steps (red indicators)
2. ✅ Review error logs
3. ✅ Re-run with different settings
4. ✅ Verify ID exists in system
5. ✅ Check data source availability

#### **Access Issues**

**Symptoms**: "Unauthorized" or "Access Denied"

**Solutions**:
1. ✅ Verify login credentials
2. ✅ Check account permissions
3. ✅ Log out and back in
4. ✅ Contact administrator
5. ✅ Clear browser cookies

#### **AI Chat Problems**

**Symptoms**: AI not responding, timeouts

**Solutions**:
1. ✅ Check internet connection
2. ✅ Ask simpler questions
3. ✅ Refresh page
4. ✅ Verify AI service status
5. ✅ Try different browser

### Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| **"Investigation Failed to Start"** | System initialization issue | Check ID format, retry |
| **"Data Source Unavailable"** | Backend service down | Wait and retry |
| **"Timeout Error"** | Investigation too long | Use shorter time range |
| **"Invalid ID Format"** | Incorrect ID format | Verify and re-enter ID |
| **"Permission Denied"** | Insufficient access | Contact administrator |

### Getting Help

#### **Self-Service**
1. 📖 This user manual
2. 🌐 System status page
3. ❓ Built-in help tooltips
4. 📚 FAQ section

#### **Support Escalation**
1. **Document Issue** - Screenshots, error messages, steps
2. **Gather Info** - Investigation IDs, timestamps
3. **Contact Admin** - Local OLORIN administrator
4. **Escalate** - Trust & Safety team if urgent

---

## 11. Glossary

### Key Terms

**Agent** - AI component performing specific analysis (Network, Location, Device, etc.)

**Autonomous Mode** - System automatically runs all investigation steps

**Device Fingerprinting** - Unique device identification technique

**Entity** - Investigation subject (User ID or Device ID)

**Investigation ID** - Unique case identifier (INV-xxxxxxxxx)

**Parallel Processing** - Running multiple steps simultaneously

**Risk Score** - Fraud probability (0.0 = Low, 1.0 = High)

**Sequential Processing** - Running steps one at a time

**Time Range** - Historical data period (7d, 30d, 90d)

### Investigation Terms

**Baseline Behavior** - Normal activity patterns

**False Positive** - Normal behavior flagged as suspicious

**False Negative** - Actual fraud missed by system

**Pattern Analysis** - Behavioral examination for anomalies

**Risk Threshold** - Score level for high-risk classification

### Technical Terms

**API** - Application Programming Interface

**Mock Mode** - Testing with sample data

**REST Service** - Web service for data operations

**Sandbox** - Isolated testing environment

**WebSocket** - Real-time update technology

---

## Appendix

### Quick Reference

#### **Keyboard Shortcuts**
- `Ctrl + N` - New investigation
- `Ctrl + R` - Refresh list
- `Ctrl + F` - Search/filter
- `Esc` - Close dialogs

#### **Risk Score Guide**
- **0.0-0.3** 🟢 Low Risk - Normal behavior
- **0.3-0.7** 🟡 Medium Risk - Review needed  
- **0.7-1.0** 🔴 High Risk - Immediate attention

#### **Investigation ID Format**
- Pattern: `INV-` + up to 16 digits
- Example: `INV-1234567890123456`
- Auto-generated for new investigations

### Support Contacts

**OLORIN Development Team**  
Trust & Safety - Fraud Prevention NYC  
📧 olorin-support@intuit.com

**System Administrator**  
[Your local admin contact]

**Emergency Escalation**  
[Critical fraud case contact]

---

**Document Information**  
📅 **Version**: 1.0  
📅 **Last Updated**: January 2024  
📅 **Next Review**: April 2024  

© 2024 Intuit Inc. All rights reserved. 