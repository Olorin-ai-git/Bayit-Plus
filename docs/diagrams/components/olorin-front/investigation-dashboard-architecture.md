# INVESTIGATION DASHBOARD ARCHITECTURE

**Component**: olorin-front Investigation Dashboard  
**Type**: Investigation Interface Architecture  
**Created**: January 31, 2025  
**Purpose**: Detailed investigation dashboard with real-time agent coordination  

---

## 🎯 INVESTIGATION DASHBOARD OVERVIEW

```mermaid
graph TB
    subgraph "Dashboard Shell"
        HEADER[Dashboard Header<br/>Investigation Info & Controls]
        TOOLBAR[Action Toolbar<br/>Start/Stop/Export Controls]
        STATUS[Status Bar<br/>Real-time Progress]
        MAIN_CONTENT[Main Content Area<br/>Investigation Interface]
    end
    
    subgraph "Investigation Form"
        FORM[Investigation Form<br/>Input Parameters]
        IDENTIFIER[Case Identifier<br/>Email/Phone/ID]
        OPTIONS[Investigation Options<br/>Agent Selection]
        SUBMIT[Submit Button<br/>Start Investigation]
    end
    
    subgraph "Agent Coordination Panel"
        AGENT_LIST[Agent Status List<br/>5 Specialized Agents]
        DEVICE_AGENT[Device Agent<br/>Fingerprinting]
        LOCATION_AGENT[Location Agent<br/>Geographic Analysis]
        NETWORK_AGENT[Network Agent<br/>Security Analysis]
        LOGS_AGENT[Logs Agent<br/>SIEM Analysis]
        RISK_AGENT[Risk Assessment Agent<br/>ML Analysis]
    end
    
    subgraph "Real-time Updates"
        PROGRESS[Progress Indicators<br/>Agent Completion Status]
        LIVE_FEED[Live Status Feed<br/>Agent Messages]
        WEBSOCKET[WebSocket Connection<br/>Real-time Communication]
        NOTIFICATIONS[Notification System<br/>Alert Management]
    end
    
    subgraph "Results Visualization"
        RESULTS_PANEL[Results Panel<br/>Investigation Findings]
        CHARTS[Data Visualization<br/>Charts & Graphs]
        MAPS[Geographic Maps<br/>Location Analysis]
        TABLES[Data Tables<br/>Structured Results]
        EXPORT[Export Controls<br/>PDF/CSV Generation]
    end
    
    subgraph "AI Tools Integration"
        MCP_PANEL[MCP Tools Panel<br/>AI Assistant Interface]
        CHAT_INTERFACE[Chat Interface<br/>AI Conversation]
        TOOL_SELECTION[Tool Selection<br/>Available AI Tools]
        CONTEXT_PANEL[Context Panel<br/>Investigation Context]
    end
    
    %% Dashboard Flow
    HEADER --> TOOLBAR
    TOOLBAR --> STATUS
    STATUS --> MAIN_CONTENT
    
    %% Investigation Flow
    MAIN_CONTENT --> FORM
    FORM --> IDENTIFIER
    FORM --> OPTIONS
    FORM --> SUBMIT
    
    %% Agent Coordination
    SUBMIT --> AGENT_LIST
    AGENT_LIST --> DEVICE_AGENT
    AGENT_LIST --> LOCATION_AGENT
    AGENT_LIST --> NETWORK_AGENT
    AGENT_LIST --> LOGS_AGENT
    AGENT_LIST --> RISK_AGENT
    
    %% Real-time Updates
    AGENT_LIST --> PROGRESS
    PROGRESS --> LIVE_FEED
    LIVE_FEED --> WEBSOCKET
    WEBSOCKET --> NOTIFICATIONS
    
    %% Results Display
    AGENT_LIST --> RESULTS_PANEL
    RESULTS_PANEL --> CHARTS
    RESULTS_PANEL --> MAPS
    RESULTS_PANEL --> TABLES
    RESULTS_PANEL --> EXPORT
    
    %% AI Integration
    MAIN_CONTENT --> MCP_PANEL
    MCP_PANEL --> CHAT_INTERFACE
    MCP_PANEL --> TOOL_SELECTION
    MCP_PANEL --> CONTEXT_PANEL
    
    %% Styling
    style HEADER fill:#9333ea,stroke:#7c3aed,color:white
    style AGENT_LIST fill:#10b981,stroke:#059669,color:white
    style RESULTS_PANEL fill:#f59e0b,stroke:#d97706,color:white
    style MCP_PANEL fill:#8b5cf6,stroke:#7c3aed,color:white
```

---

## 🔧 DETAILED COMPONENT BREAKDOWN

### 1. **Investigation Input Interface**
```mermaid
graph TB
    subgraph "Investigation Form Component"
        FORM_WRAPPER[FraudInvestigationForm.tsx<br/>Main Form Component]
        INPUT_SECTION[Input Section<br/>Case Parameters]
        VALIDATION[Form Validation<br/>Input Verification]
        SUBMIT_HANDLER[Submit Handler<br/>Investigation Trigger]
    end
    
    subgraph "Input Fields"
        IDENTIFIER_FIELD[Identifier Field<br/>Email/Phone/UserID]
        DESCRIPTION[Description Field<br/>Case Description]
        PRIORITY[Priority Selector<br/>Investigation Priority]
        AGENT_SELECTION[Agent Selection<br/>Enable/Disable Agents]
    end
    
    subgraph "Validation Rules"
        EMAIL_VALIDATION[Email Validation<br/>RFC 5322 Compliance]
        PHONE_VALIDATION[Phone Validation<br/>International Format]
        REQUIRED_FIELDS[Required Field Check<br/>Mandatory Data]
        FORMAT_VALIDATION[Format Validation<br/>Data Structure]
    end
    
    FORM_WRAPPER --> INPUT_SECTION
    INPUT_SECTION --> VALIDATION
    VALIDATION --> SUBMIT_HANDLER
    
    INPUT_SECTION --> IDENTIFIER_FIELD
    INPUT_SECTION --> DESCRIPTION
    INPUT_SECTION --> PRIORITY
    INPUT_SECTION --> AGENT_SELECTION
    
    VALIDATION --> EMAIL_VALIDATION
    VALIDATION --> PHONE_VALIDATION
    VALIDATION --> REQUIRED_FIELDS
    VALIDATION --> FORMAT_VALIDATION
    
    style FORM_WRAPPER fill:#9333ea,color:white
    style VALIDATION fill:#10b981,color:white
    style AGENT_SELECTION fill:#f59e0b,color:white
```

### 2. **Real-time Agent Status Display**
```mermaid
graph TB
    subgraph "Agent Status Container"
        STATUS_GRID[Agent Status Grid<br/>5 Agent Cards]
        REFRESH_HANDLER[Status Refresh<br/>Real-time Updates]
        WEBSOCKET_HANDLER[WebSocket Handler<br/>Live Communication]
    end
    
    subgraph "Individual Agent Cards"
        DEVICE_CARD[Device Agent Card<br/>Status: Active/Idle/Complete]
        LOCATION_CARD[Location Agent Card<br/>Geographic Processing]
        NETWORK_CARD[Network Agent Card<br/>Security Analysis]
        LOGS_CARD[Logs Agent Card<br/>SIEM Processing]
        RISK_CARD[Risk Agent Card<br/>ML Assessment]
    end
    
    subgraph "Status Indicators"
        PROGRESS_BAR[Progress Bar<br/>Completion Percentage]
        STATUS_ICON[Status Icon<br/>Visual Indicator]
        MESSAGE_FEED[Message Feed<br/>Agent Messages]
        TIMESTAMP[Timestamp<br/>Last Update]
    end
    
    subgraph "Agent Actions"
        START_AGENT[Start Agent<br/>Manual Trigger]
        STOP_AGENT[Stop Agent<br/>Manual Halt]
        RETRY_AGENT[Retry Agent<br/>Error Recovery]
        VIEW_LOGS[View Logs<br/>Detailed Messages]
    end
    
    STATUS_GRID --> DEVICE_CARD
    STATUS_GRID --> LOCATION_CARD
    STATUS_GRID --> NETWORK_CARD
    STATUS_GRID --> LOGS_CARD
    STATUS_GRID --> RISK_CARD
    
    DEVICE_CARD --> PROGRESS_BAR
    DEVICE_CARD --> STATUS_ICON
    DEVICE_CARD --> MESSAGE_FEED
    DEVICE_CARD --> TIMESTAMP
    
    DEVICE_CARD --> START_AGENT
    DEVICE_CARD --> STOP_AGENT
    DEVICE_CARD --> RETRY_AGENT
    DEVICE_CARD --> VIEW_LOGS
    
    REFRESH_HANDLER --> WEBSOCKET_HANDLER
    WEBSOCKET_HANDLER --> STATUS_GRID
    
    style STATUS_GRID fill:#9333ea,color:white
    style DEVICE_CARD fill:#10b981,color:white
    style PROGRESS_BAR fill:#f59e0b,color:white
    style START_AGENT fill:#ef4444,color:white
```

### 3. **Results Visualization System**
```mermaid
graph TB
    subgraph "Results Container"
        RESULTS_WRAPPER[Results Wrapper<br/>Investigation Results]
        TABS_CONTROLLER[Results Tabs<br/>Category Navigation]
        EXPORT_CONTROLLER[Export Controller<br/>Report Generation]
    end
    
    subgraph "Visualization Components"
        SUMMARY_CARD[Summary Card<br/>Investigation Overview]
        RISK_CHART[Risk Score Chart<br/>Risk Visualization]
        LOCATION_MAP[Location Map<br/>Geographic Visualization]
        TIMELINE_CHART[Timeline Chart<br/>Event Sequence]
        DATA_TABLE[Data Table<br/>Structured Results]
    end
    
    subgraph "Data Processing"
        DATA_TRANSFORMER[Data Transformer<br/>Format Conversion]
        CHART_DATA[Chart Data Preparation<br/>Visualization Ready]
        MAP_DATA[Map Data Processing<br/>Geographic Coordinates]
        TABLE_DATA[Table Data Formatting<br/>Structured Display]
    end
    
    subgraph "Export Features"
        PDF_EXPORT[PDF Export<br/>Report Generation]
        CSV_EXPORT[CSV Export<br/>Data Download]
        JSON_EXPORT[JSON Export<br/>Raw Data]
        PRINT_EXPORT[Print Layout<br/>Browser Print]
    end
    
    RESULTS_WRAPPER --> TABS_CONTROLLER
    TABS_CONTROLLER --> SUMMARY_CARD
    TABS_CONTROLLER --> RISK_CHART
    TABS_CONTROLLER --> LOCATION_MAP
    TABS_CONTROLLER --> TIMELINE_CHART
    TABS_CONTROLLER --> DATA_TABLE
    
    SUMMARY_CARD --> DATA_TRANSFORMER
    RISK_CHART --> CHART_DATA
    LOCATION_MAP --> MAP_DATA
    DATA_TABLE --> TABLE_DATA
    
    EXPORT_CONTROLLER --> PDF_EXPORT
    EXPORT_CONTROLLER --> CSV_EXPORT
    EXPORT_CONTROLLER --> JSON_EXPORT
    EXPORT_CONTROLLER --> PRINT_EXPORT
    
    style RESULTS_WRAPPER fill:#9333ea,color:white
    style RISK_CHART fill:#10b981,color:white
    style LOCATION_MAP fill:#f59e0b,color:white
    style PDF_EXPORT fill:#ef4444,color:white
```

---

## 🔄 REAL-TIME UPDATE ARCHITECTURE

```mermaid
graph TB
    subgraph "WebSocket Communication"
        WS_CONNECTION[WebSocket Connection<br/>ws://localhost:8090/ws]
        CONNECTION_MANAGER[Connection Manager<br/>Auto-reconnect Logic]
        MESSAGE_HANDLER[Message Handler<br/>Event Processing]
        HEARTBEAT[Heartbeat Monitor<br/>Connection Health]
    end
    
    subgraph "Update Events"
        AGENT_START[Agent Started<br/>Investigation Begin]
        AGENT_PROGRESS[Agent Progress<br/>Status Updates]
        AGENT_COMPLETE[Agent Complete<br/>Results Available]
        AGENT_ERROR[Agent Error<br/>Failure Handling]
        INVESTIGATION_COMPLETE[Investigation Complete<br/>Final Results]
    end
    
    subgraph "UI Update Handlers"
        STATUS_UPDATER[Status Updater<br/>Agent Status Refresh]
        PROGRESS_UPDATER[Progress Updater<br/>Progress Bar Updates]
        NOTIFICATION_HANDLER[Notification Handler<br/>User Alerts]
        RESULTS_UPDATER[Results Updater<br/>Data Refresh]
    end
    
    subgraph "State Management"
        INVESTIGATION_STATE[Investigation State<br/>Current Investigation]
        AGENT_STATES[Agent States<br/>Individual Agent Status]
        UI_STATE[UI State<br/>Interface State]
        ERROR_STATE[Error State<br/>Error Handling]
    end
    
    WS_CONNECTION --> CONNECTION_MANAGER
    CONNECTION_MANAGER --> MESSAGE_HANDLER
    MESSAGE_HANDLER --> HEARTBEAT
    
    MESSAGE_HANDLER --> AGENT_START
    MESSAGE_HANDLER --> AGENT_PROGRESS
    MESSAGE_HANDLER --> AGENT_COMPLETE
    MESSAGE_HANDLER --> AGENT_ERROR
    MESSAGE_HANDLER --> INVESTIGATION_COMPLETE
    
    AGENT_START --> STATUS_UPDATER
    AGENT_PROGRESS --> PROGRESS_UPDATER
    AGENT_COMPLETE --> NOTIFICATION_HANDLER
    AGENT_ERROR --> NOTIFICATION_HANDLER
    INVESTIGATION_COMPLETE --> RESULTS_UPDATER
    
    STATUS_UPDATER --> INVESTIGATION_STATE
    PROGRESS_UPDATER --> AGENT_STATES
    NOTIFICATION_HANDLER --> UI_STATE
    RESULTS_UPDATER --> ERROR_STATE
    
    style WS_CONNECTION fill:#9333ea,color:white
    style MESSAGE_HANDLER fill:#10b981,color:white
    style NOTIFICATION_HANDLER fill:#f59e0b,color:white
    style INVESTIGATION_STATE fill:#ef4444,color:white
```

---

## 🎨 DASHBOARD LAYOUT SYSTEM

```mermaid
graph TB
    subgraph "Layout Grid System"
        GRID_CONTAINER[Grid Container<br/>Material-UI Grid]
        HEADER_SECTION[Header Section<br/>12 columns]
        SIDEBAR_SECTION[Sidebar Section<br/>3 columns]
        MAIN_SECTION[Main Section<br/>9 columns]
        FOOTER_SECTION[Footer Section<br/>12 columns]
    end
    
    subgraph "Responsive Breakpoints"
        MOBILE_LAYOUT[Mobile Layout<br/>< 768px Single Column]
        TABLET_LAYOUT[Tablet Layout<br/>768px-1024px Stacked]
        DESKTOP_LAYOUT[Desktop Layout<br/>> 1024px Side by Side]
    end
    
    subgraph "Component Positioning"
        STICKY_HEADER[Sticky Header<br/>Fixed Position]
        SCROLLABLE_CONTENT[Scrollable Content<br/>Overflow Auto]
        FLOATING_ACTIONS[Floating Actions<br/>Fixed Position]
        MODAL_OVERLAY[Modal Overlay<br/>Z-index Management]
    end
    
    GRID_CONTAINER --> HEADER_SECTION
    GRID_CONTAINER --> SIDEBAR_SECTION
    GRID_CONTAINER --> MAIN_SECTION
    GRID_CONTAINER --> FOOTER_SECTION
    
    HEADER_SECTION --> MOBILE_LAYOUT
    SIDEBAR_SECTION --> TABLET_LAYOUT
    MAIN_SECTION --> DESKTOP_LAYOUT
    
    MOBILE_LAYOUT --> STICKY_HEADER
    TABLET_LAYOUT --> SCROLLABLE_CONTENT
    DESKTOP_LAYOUT --> FLOATING_ACTIONS
    FLOATING_ACTIONS --> MODAL_OVERLAY
    
    style GRID_CONTAINER fill:#9333ea,color:white
    style MOBILE_LAYOUT fill:#ef4444,color:white
    style TABLET_LAYOUT fill:#f59e0b,color:white
    style DESKTOP_LAYOUT fill:#10b981,color:white
```

---

## 🚀 PERFORMANCE OPTIMIZATION FEATURES

### Component Optimization
```mermaid
graph LR
    MEMO[React.memo<br/>Component Memoization] --> CALLBACK[useCallback<br/>Function Memoization]
    CALLBACK --> MEMO_HOOK[useMemo<br/>Value Memoization]
    MEMO_HOOK --> DEBOUNCE[Debounced Updates<br/>Input Optimization]
    
    style MEMO fill:#9333ea,color:white
    style CALLBACK fill:#10b981,color:white
    style MEMO_HOOK fill:#f59e0b,color:white
    style DEBOUNCE fill:#ef4444,color:white
```

### Data Loading Strategies
- **Progressive Loading**: Load components incrementally as needed
- **Skeleton Loading**: Display loading placeholders during data fetch
- **Error Boundaries**: Graceful degradation for component failures
- **Retry Logic**: Automatic retry for failed operations

### Real-time Optimization
- **WebSocket Pooling**: Efficient connection management
- **Message Queuing**: Batch processing of frequent updates
- **Selective Updates**: Only update changed components
- **Background Sync**: Continue operations in background tabs

---

## 📊 DASHBOARD METRICS & MONITORING

```mermaid
graph TB
    subgraph "Performance Metrics"
        RENDER_TIME[Component Render Time<br/>< 16ms target]
        UPDATE_FREQUENCY[Update Frequency<br/>Real-time metrics]
        MEMORY_USAGE[Memory Usage<br/>< 50MB target]
        NETWORK_USAGE[Network Usage<br/>WebSocket efficiency]
    end
    
    subgraph "User Experience Metrics"
        RESPONSE_TIME[User Response Time<br/>< 200ms interaction]
        ERROR_RATE[Error Rate<br/>< 1% target]
        SUCCESS_RATE[Success Rate<br/>> 99% target]
        USER_SATISFACTION[User Satisfaction<br/>Feedback tracking]
    end
    
    subgraph "Investigation Metrics"
        AVG_INVESTIGATION_TIME[Average Investigation Time<br/>< 5 minutes]
        AGENT_SUCCESS_RATE[Agent Success Rate<br/>Per agent metrics]
        DATA_ACCURACY[Data Accuracy<br/>Result validation]
        EXPORT_SUCCESS[Export Success Rate<br/>Report generation]
    end
    
    RENDER_TIME --> RESPONSE_TIME
    UPDATE_FREQUENCY --> ERROR_RATE
    MEMORY_USAGE --> SUCCESS_RATE
    NETWORK_USAGE --> USER_SATISFACTION
    
    RESPONSE_TIME --> AVG_INVESTIGATION_TIME
    ERROR_RATE --> AGENT_SUCCESS_RATE
    SUCCESS_RATE --> DATA_ACCURACY
    USER_SATISFACTION --> EXPORT_SUCCESS
    
    style RENDER_TIME fill:#9333ea,color:white
    style RESPONSE_TIME fill:#10b981,color:white
    style AVG_INVESTIGATION_TIME fill:#f59e0b,color:white
```

---

## 🔧 INTEGRATION SPECIFICATIONS

### Backend API Integration
```typescript
// Investigation Service Integration
interface InvestigationService {
  startInvestigation(params: InvestigationParams): Promise<Investigation>
  getInvestigationStatus(id: string): Promise<InvestigationStatus>
  getInvestigationResults(id: string): Promise<InvestigationResults>
  exportInvestigation(id: string, format: ExportFormat): Promise<ExportData>
}

// Real-time WebSocket Events
interface WebSocketEvents {
  'investigation:started': InvestigationStartedEvent
  'agent:progress': AgentProgressEvent
  'agent:completed': AgentCompletedEvent
  'investigation:completed': InvestigationCompletedEvent
  'error:occurred': ErrorEvent
}
```

### Component Props Interface
```typescript
interface DashboardProps {
  investigationId?: string
  autoStart?: boolean
  defaultAgents?: AgentType[]
  onInvestigationComplete?: (results: InvestigationResults) => void
  onError?: (error: Error) => void
}

interface AgentStatusProps {
  agent: Agent
  status: AgentStatus
  onStart?: () => void
  onStop?: () => void
  onRetry?: () => void
}
```

---

## 📱 MOBILE RESPONSIVE FEATURES

### Mobile-First Approach
- **Touch-Friendly**: Large tap targets (minimum 44px)
- **Swipe Gestures**: Navigation and interaction support
- **Offline Support**: Progressive Web App capabilities
- **Push Notifications**: Investigation status updates

### Adaptive UI Elements
- **Collapsible Panels**: Space-efficient information display
- **Bottom Sheet**: Mobile-optimized action panels
- **Floating Action Button**: Quick access to primary actions
- **Pull-to-Refresh**: Native mobile interaction patterns

---

**Last Updated**: January 31, 2025  
**Component Version**: 1.0  
**Real-time Features**: WebSocket + REST API  
**Mobile Support**: Responsive + PWA Ready 