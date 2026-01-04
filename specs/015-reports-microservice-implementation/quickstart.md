# Quickstart Guide: Reports Microservice

**Feature**: `001-reports-microservice-implementation`
**Date**: 2025-01-09
**Status**: Ready for Implementation

## Prerequisites

- Backend server running on port 8090 (or configured port)
- Frontend development server running
- Authentication configured (JWT tokens)
- Database initialized (reports table created)

## Quick Start

### 1. Verify Backend API

```bash
# Check backend is running
curl http://localhost:8090/api/v1/reports/statistics/investigations \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected response:
# {
#   "total": 10,
#   "completed": 8,
#   "success_rate": 80.0,
#   "investigations": [...]
# }
```

### 2. Navigate to Reports Microservice

1. Open frontend application
2. Navigate to Reports microservice (typically `/reports` route)
3. Verify reports list loads (may be empty initially)

### 3. Create Your First Report

**User Story Validation**: User Story 2 - Create and Edit Reports

1. Click "New Report" button (or press `N` key)
2. Enter title: "Test Report"
3. Enter markdown content:
   ```markdown
   # Test Report
   
   This is a test report.
   
   ## KPIs
   {{KPI total}}
   {{KPI completed}}
   {{KPI success}}
   
   ## Chart
   {{CHART timeseries}}
   ```
4. Click "Save" (or press `Ctrl/Cmd+S`)
5. Verify toast notification appears: "Saved"
6. Verify report appears in list

**Expected Result**: Report created successfully, appears in list with "Draft" status

### 4. View Report with Widgets

**User Story Validation**: User Story 4 - View Reports with Dynamic Widgets

1. Click on the report you just created
2. Verify report viewer opens
3. Verify KPI widgets display actual numbers:
   - Total investigations count
   - Completed investigations count
   - Success rate percentage
4. Verify chart widget renders (timeseries line chart)
5. Verify table of contents appears in sidebar (if report has headings)

**Expected Result**: Report displays with widgets showing real investigation data

### 5. Edit Report

**User Story Validation**: User Story 2 - Create and Edit Reports

1. Click "Edit" button
2. Modify markdown content
3. Add a widget: `{{TABLE recent}}`
4. Click "Save"
5. Verify changes persist
6. Click "Preview" to view updated report
7. Verify table widget displays recent investigations

**Expected Result**: Report updates successfully, widgets render correctly

### 6. Publish Report

**User Story Validation**: User Story 3 - Publish and Manage Report Status

1. With report open, click "Publish" button
2. Verify status changes to "Published"
3. Verify toast notification: "Published"
4. Filter reports by "Published" status
5. Verify report appears in filtered list

**Expected Result**: Report status changes to Published, appears in Published filter

### 7. Search and Filter Reports

**User Story Validation**: User Story 1 - View and Browse Reports

1. Create 2-3 more reports with different titles
2. Type search query in search box (e.g., "Test")
3. Verify list filters to matching reports
4. Select "Draft" status filter
5. Verify only draft reports shown
6. Select "All" to show all reports

**Expected Result**: Search and filtering work correctly

### 8. Share Report

**User Story Validation**: User Story 5 - Share and Export Reports

1. Open a published report
2. Click "Share" button
3. Verify shareable URL copied to clipboard
4. Open URL in new browser tab/window
5. Verify report loads directly (deep linking works)

**Expected Result**: Share URL works, report loads via deep link

### 9. Export Report

**User Story Validation**: User Story 5 - Share and Export Reports

1. Open reports dashboard
2. Click "Export JSON" button
3. Verify JSON file downloads
4. Open downloaded file
5. Verify all reports included in JSON

**Expected Result**: JSON export works, contains all reports

### 10. Table of Contents Navigation

**User Story Validation**: User Story 6 - Navigate Reports with Table of Contents

1. Create/edit a report with multiple headings:
   ```markdown
   # Section 1
   Content here
   
   ## Subsection 1.1
   More content
   
   # Section 2
   Even more content
   ```
2. View the report
3. Verify TOC appears in sidebar with all headings
4. Click a heading link in TOC
5. Verify page scrolls to that section
6. Scroll through report manually
7. Verify TOC highlights current section

**Expected Result**: TOC generates correctly, navigation works, scroll spy highlights current section

## Keyboard Shortcuts

**User Story Validation**: FR-016

- `/` → Focus search input
- `N` → Create new report
- `Ctrl/Cmd+S` → Save report (in editor)
- `Enter` → Open selected report (in list)
- `Delete` → Delete report (in list, with confirmation)

## Widget Testing

### KPI Widgets

Test each KPI widget type:
- `{{KPI total}}` → Shows total investigation count
- `{{KPI completed}}` → Shows completed investigation count
- `{{KPI success}}` → Shows success rate percentage

### Chart Widgets

Test each chart widget type:
- `{{CHART timeseries}}` → Line chart showing investigation timeline
- `{{CHART success}}` → Donut chart showing success rate
- `{{CHART hbar}}` → Horizontal bar chart showing top sources/tools
- `{{HEATMAP}}` → Heatmap showing activity by day/hour

### Table Widget

Test table widget:
- `{{TABLE recent}}` → Table showing 10 most recent investigations

## Error Scenarios

### Network Failure

1. Disconnect network
2. Try to save report
3. Verify error message displayed
4. Verify report state preserved (can retry)

### Invalid Markdown

1. Create report with malformed markdown
2. Save report
3. Verify report saves (markdown validation is permissive)
4. View report
5. Verify markdown renders (may have formatting issues, but doesn't crash)

### Empty Report

1. Create report with empty title
2. Try to save
3. Verify validation error (title required)
4. Enter title
5. Save successfully

## Performance Validation

**Success Criteria Validation**:

1. **SC-001**: Create and save report in <5 seconds
   - Time the operation from click to toast notification
   - Should complete in <5 seconds including network round-trip

2. **SC-002**: Report list loads 100+ reports in <2 seconds
   - Create 100+ reports (or use test data)
   - Time list load
   - Should complete in <2 seconds

3. **SC-003**: Markdown editor responds in <100ms
   - Type in editor
   - Verify no lag
   - Should feel instant

4. **SC-004**: Widget rendering completes in <3 seconds
   - Open report with widgets
   - Time from load to widget display
   - Should complete in <3 seconds

## Integration Points

### Backend API

- **Base URL**: `/api/v1/reports`
- **Authentication**: JWT Bearer token
- **Endpoints**: See `contracts/reports-api.yaml`

### Visualization Microservice

- **Import**: `@microservices/visualization`
- **Components**: `LineChart`, `BarChart`, `PieChart`
- **Integration**: Pass investigation data to chart components

### Investigation Data

- **Statistics Endpoint**: `/api/v1/reports/statistics/investigations`
- **Usage**: Fetched once per report view, cached for 30 seconds
- **Data Format**: See `InvestigationStatisticsResponse` schema

## Troubleshooting

### Reports Not Loading

1. Check backend is running: `curl http://localhost:8090/health`
2. Check authentication token is valid
3. Check browser console for errors
4. Verify API endpoint: `curl http://localhost:8090/api/v1/reports`

### Widgets Not Rendering

1. Check investigation statistics endpoint: `curl http://localhost:8090/api/v1/reports/statistics/investigations`
2. Verify widget placeholders are correct format: `{{WIDGET_TYPE subtype}}`
3. Check browser console for errors
4. Verify visualization microservice is loaded

### Markdown Not Rendering

1. Check react-markdown is installed: `npm list react-markdown`
2. Verify markdown content is valid
3. Check browser console for errors
4. Verify markdown renderer component is imported correctly

## Next Steps

After completing quickstart validation:

1. ✅ All user stories validated
2. → Run full test suite
3. → Performance testing
4. → E2E testing
5. → Production deployment

