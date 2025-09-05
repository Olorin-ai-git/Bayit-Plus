# Advanced RAG Insights Frontend Architecture Diagram

**Associated Plan:** `/docs/plans/2025-01-05-advanced-rag-insights-frontend-implementation-plan.md`  
**Created:** 2025-01-05  
**Author:** Gil Klainert

## Overall System Architecture

```mermaid
graph TB
    %% Backend Systems
    subgraph "Backend RAG System"
        RS[RAG Server]
        KB[Knowledge Base]
        TS[Tool Selection Engine]
        PM[Performance Monitor]
    end
    
    %% WebSocket Infrastructure
    WS[WebSocket Server] --> RS
    
    %% Frontend Application
    subgraph "Frontend Application"
        %% Core Integration Layer
        subgraph "Integration Layer"
            WSC[WebSocket Client]
            RH[RAG Hooks]
            AS[API Service]
        end
        
        %% Existing Components (Refactored)
        subgraph "Existing RAG Components (Refactored)"
            REC[RAG Enhancement Core ≤200L]
            REM[RAG Enhancement Metrics ≤200L]
            RECO[RAG Enhancement Controls ≤200L]
            RSI[RAG Status Indicator ≤200L]
            RKP[RAG Knowledge Panel ≤200L]
            RPM[RAG Performance Metrics ≤200L]
        end
        
        %% New Advanced Components
        subgraph "Advanced RAG Insights"
            %% Insights Modal Components
            subgraph "Insights Modal"
                RIM[RAG Insights Modal ≤200L]
                RAD[RAG Analytics Dashboard ≤200L]
                RPC[RAG Performance Charts ≤200L]
            end
            
            %% Journey Viewer Components
            subgraph "Journey Viewer"
                RJV[RAG Journey Viewer ≤200L]
                RJT[RAG Journey Timeline ≤200L]
                RDP[RAG Decision Points ≤200L]
            end
            
            %% Knowledge Analytics Components
            subgraph "Knowledge Analytics"
                RKA[RAG Knowledge Analytics ≤200L]
                RKS[RAG Knowledge Sources ≤200L]
                RTA[RAG Trend Analysis ≤200L]
            end
            
            %% Tool Recommendation Components
            subgraph "Tool Recommendations"
                RTR[RAG Tool Recommendations ≤200L]
                RTRS[RAG Tool Reasoning ≤200L]
                RTP[RAG Tool Performance ≤200L]
            end
            
            %% Advanced Features
            subgraph "Advanced Features"
                REC_FEAT[RAG Export Capabilities ≤200L]
                RCV[RAG Comparison Views ≤200L]
                RMD[RAG Monitoring Dashboard ≤200L]
            end
        end
        
        %% Main Application Components
        IP[Investigation Page]
        ID[Investigation Dashboard]
        AIP[Autonomous Investigation Panel]
    end
    
    %% Data Flow Connections
    RS --> WS
    KB --> WS
    TS --> WS
    PM --> WS
    
    WS --> WSC
    WSC --> RH
    RH --> AS
    
    %% Real Data Flow (NO MOCK DATA)
    AS --> REC
    AS --> REM
    AS --> RECO
    AS --> RSI
    AS --> RKP
    AS --> RPM
    
    AS --> RIM
    AS --> RAD
    AS --> RPC
    AS --> RJV
    AS --> RJT
    AS --> RDP
    AS --> RKA
    AS --> RKS
    AS --> RTA
    AS --> RTR
    AS --> RTRS
    AS --> RTP
    AS --> REC_FEAT
    AS --> RCV
    AS --> RMD
    
    %% Integration with Main App
    RIM --> IP
    RJV --> ID
    RTR --> AIP
    
    %% Styling
    classDef backendNode fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef frontendNode fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef newComponent fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef refactoredComponent fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef integrationNode fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef mockViolation fill:#ffebee,stroke:#d32f2f,stroke-width:3px,stroke-dasharray: 5 5
    
    class RS,KB,TS,PM,WS backendNode
    class IP,ID,AIP frontendNode
    class RIM,RAD,RPC,RJV,RJT,RDP,RKA,RKS,RTA,RTR,RTRS,RTP,REC_FEAT,RCV,RMD newComponent
    class REC,REM,RECO,RSI,RKP,RPM refactoredComponent
    class WSC,RH,AS integrationNode
```

## Component Size Compliance Architecture

```mermaid
graph LR
    %% Current Violation
    subgraph "BEFORE (Violations)"
        V1[❌ RAG Enhancement Section<br/>279 lines > 200 limit]
        V2[❌ mock/rag.js<br/>28,918 bytes MOCK DATA]
    end
    
    %% After Refactoring
    subgraph "AFTER (Compliant)"
        %% Refactored Components
        subgraph "Refactored Components"
            C1[✅ RAG Enhancement Core<br/>≤200 lines]
            C2[✅ RAG Enhancement Metrics<br/>≤200 lines]
            C3[✅ RAG Enhancement Controls<br/>≤200 lines]
        end
        
        %% New Advanced Components
        subgraph "New Advanced Components (All ≤200 lines)"
            N1[✅ RAG Insights Modal]
            N2[✅ RAG Analytics Dashboard]
            N3[✅ RAG Performance Charts]
            N4[✅ RAG Journey Viewer]
            N5[✅ RAG Journey Timeline]
            N6[✅ RAG Decision Points]
            N7[✅ RAG Knowledge Analytics]
            N8[✅ RAG Knowledge Sources]
            N9[✅ RAG Trend Analysis]
            N10[✅ RAG Tool Recommendations]
            N11[✅ RAG Tool Reasoning]
            N12[✅ RAG Tool Performance]
            N13[✅ RAG Export Capabilities]
            N14[✅ RAG Comparison Views]
            N15[✅ RAG Monitoring Dashboard]
        end
        
        %% Real Data Integration
        RDI[✅ Real WebSocket Data<br/>NO MOCK DATA]
    end
    
    V1 --> C1
    V1 --> C2
    V1 --> C3
    V2 --> RDI
    
    classDef violationNode fill:#ffebee,stroke:#d32f2f,stroke-width:3px
    classDef compliantNode fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef realDataNode fill:#e3f2fd,stroke:#01579b,stroke-width:2px
    
    class V1,V2 violationNode
    class C1,C2,C3,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N11,N12,N13,N14,N15 compliantNode
    class RDI realDataNode
```

## Data Flow Architecture (NO MOCK DATA)

```mermaid
sequenceDiagram
    participant BE as RAG Backend System
    participant WS as WebSocket Server
    participant WSC as WebSocket Client
    participant RH as RAG Hooks
    participant RC as RAG Components
    participant UI as User Interface
    
    Note over BE,UI: REAL DATA FLOW ONLY - NO MOCK DATA
    
    %% Real Data Flow
    BE->>WS: RAG Event Data
    WS->>WSC: Real-time Updates
    WSC->>RH: Process RAG Events
    RH->>RC: Update Component State
    RC->>UI: Render Real Data
    
    %% Investigation Journey
    BE->>WS: Investigation Step Complete
    WS->>WSC: Journey Update
    WSC->>RH: Update Journey State
    RH->>RC: Journey Component Update
    RC->>UI: Show Investigation Progress
    
    %% Performance Metrics
    BE->>WS: Performance Data
    WS->>WSC: Metrics Update
    WSC->>RH: Process Metrics
    RH->>RC: Update Charts/Analytics
    RC->>UI: Display Real Performance
    
    %% Tool Recommendations
    BE->>WS: Tool Selection Event
    WS->>WSC: Tool Recommendation
    WSC->>RH: Process Tool Data
    RH->>RC: Update Tool Components
    RC->>UI: Show Real Recommendations
    
    Note over BE,UI: All data is REAL - Zero fabricated content
```

## Component Integration Architecture

```mermaid
graph TB
    %% Main Investigation Flow
    subgraph "Investigation Dashboard Integration"
        IP[Investigation Page]
        ID[Investigation Dashboard]
        AIP[Autonomous Investigation Panel]
    end
    
    %% Advanced RAG Modal
    subgraph "RAG Insights Modal (Triggered from Dashboard)"
        RIM[RAG Insights Modal]
        RAD[Analytics Dashboard]
        RPC[Performance Charts]
        
        RIM --> RAD
        RIM --> RPC
    end
    
    %% Journey Integration
    subgraph "Investigation Journey (Embedded in Investigation)"
        RJV[Journey Viewer]
        RJT[Journey Timeline]
        RDP[Decision Points]
        
        RJV --> RJT
        RJV --> RDP
    end
    
    %% Tool Integration
    subgraph "Tool Recommendations (Integrated with Agent Panel)"
        RTR[Tool Recommendations]
        RTRS[Tool Reasoning]
        RTP[Tool Performance]
        
        RTR --> RTRS
        RTR --> RTP
    end
    
    %% Knowledge Integration
    subgraph "Knowledge Analytics (Sidebar Integration)"
        RKA[Knowledge Analytics]
        RKS[Knowledge Sources]
        RTA[Trend Analysis]
        
        RKA --> RKS
        RKA --> RTA
    end
    
    %% Integration Points
    IP --> RIM
    ID --> RJV
    AIP --> RTR
    ID --> RKA
    
    %% Modal Triggers
    IP -.->|"Open RAG Insights"| RIM
    ID -.->|"View Journey"| RJV
    AIP -.->|"Show Tool Details"| RTR
    
    classDef mainApp fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef ragComponent fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef integration fill:#fff3e0,stroke:#e65100,stroke-width:2px
    
    class IP,ID,AIP mainApp
    class RIM,RAD,RPC,RJV,RJT,RDP,RTR,RTRS,RTP,RKA,RKS,RTA ragComponent
```

## Technology Stack Integration

```mermaid
graph TB
    %% Technology Layers
    subgraph "Frontend Technology Stack"
        %% Framework Layer
        subgraph "Framework Layer"
            REACT[React 18]
            TS[TypeScript 5.x]
            TC[Tailwind CSS]
        end
        
        %% State Management
        subgraph "State Management"
            RH_HOOKS[React Hooks]
            WS_CLIENT[WebSocket Client]
            API_SERVICE[RAG API Service]
        end
        
        %% Component Libraries
        subgraph "Component Architecture"
            MOD_COMP[Modular Components ≤200L]
            TYPE_SAFE[Type-Safe Props]
            REAL_DATA[Real Data Only]
        end
        
        %% Testing & Quality
        subgraph "Testing & Quality"
            JEST[Jest Testing]
            RTL[React Testing Library]
            ESLINT[ESLint + Prettier]
            A11Y[Accessibility Testing]
        end
    end
    
    %% Backend Integration
    subgraph "Backend Integration"
        RAG_BACKEND[RAG Backend System]
        WS_SERVER[WebSocket Server]
        KB_SYS[Knowledge Base System]
    end
    
    %% Connections
    RAG_BACKEND --> WS_SERVER
    WS_SERVER --> WS_CLIENT
    WS_CLIENT --> API_SERVICE
    API_SERVICE --> RH_HOOKS
    RH_HOOKS --> MOD_COMP
    
    REACT --> MOD_COMP
    TS --> TYPE_SAFE
    TC --> MOD_COMP
    
    classDef techNode fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef qualityNode fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef backendNode fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    
    class REACT,TS,TC,RH_HOOKS,WS_CLIENT,API_SERVICE,MOD_COMP,TYPE_SAFE,REAL_DATA techNode
    class JEST,RTL,ESLINT,A11Y qualityNode
    class RAG_BACKEND,WS_SERVER,KB_SYS backendNode
```

## Security & Performance Architecture

```mermaid
graph LR
    %% Security Measures
    subgraph "Security Layer"
        DS[Data Sanitization]
        AT[Authentication Token]
        RV[Input Validation]
        XSS[XSS Prevention]
    end
    
    %% Performance Optimization
    subgraph "Performance Layer"
        LL[Lazy Loading]
        MC[Memoized Components]
        CO[Code Optimization]
        BC[Bundle Compression]
    end
    
    %% Real-time Processing
    subgraph "Real-time Processing"
        WSO[WebSocket Optimization]
        EC[Error Correction]
        RC[Reconnection Logic]
        BH[Backpressure Handling]
    end
    
    %% Component Optimization
    subgraph "Component Optimization"
        SC[Small Components ≤200L]
        PU[Pure Components]
        VC[Virtual Rendering]
        MU[Memory Usage Control]
    end
    
    %% Integration Flow
    DS --> WSO
    AT --> EC
    RV --> RC
    XSS --> BH
    
    LL --> SC
    MC --> PU
    CO --> VC
    BC --> MU
    
    classDef securityNode fill:#ffebee,stroke:#d32f2f,stroke-width:2px
    classDef performanceNode fill:#e3f2fd,stroke:#01579b,stroke-width:2px
    classDef realtimeNode fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef optimizationNode fill:#fff3e0,stroke:#e65100,stroke-width:2px
    
    class DS,AT,RV,XSS securityNode
    class LL,MC,CO,BC performanceNode
    class WSO,EC,RC,BH realtimeNode
    class SC,PU,VC,MU optimizationNode
```

## Deployment & Monitoring Architecture

```mermaid
graph TB
    %% Development Pipeline
    subgraph "Development Pipeline"
        GIT[Git Feature Branch]
        CI[CI/CD Pipeline]
        TEST[Automated Testing]
        BUILD[Production Build]
    end
    
    %% Quality Gates
    subgraph "Quality Gates"
        LC[Line Count Check ≤200]
        MD[Mock Data Detection]
        TS_CHECK[TypeScript Validation]
        LINT[Linting & Formatting]
        PERF[Performance Testing]
    end
    
    %% Deployment Stages
    subgraph "Deployment Stages"
        DEV[Development]
        STAGING[Staging]
        PROD[Production]
    end
    
    %% Monitoring
    subgraph "Monitoring & Observability"
        ERROR[Error Tracking]
        PERF_MON[Performance Monitoring]
        USER[User Analytics]
        HEALTH[Health Checks]
    end
    
    %% Flow
    GIT --> CI
    CI --> TEST
    TEST --> BUILD
    BUILD --> LC
    LC --> MD
    MD --> TS_CHECK
    TS_CHECK --> LINT
    LINT --> PERF
    PERF --> DEV
    DEV --> STAGING
    STAGING --> PROD
    
    PROD --> ERROR
    PROD --> PERF_MON
    PROD --> USER
    PROD --> HEALTH
    
    classDef devNode fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef qualityNode fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef deployNode fill:#e3f2fd,stroke:#01579b,stroke-width:2px
    classDef monitorNode fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    
    class GIT,CI,TEST,BUILD devNode
    class LC,MD,TS_CHECK,LINT,PERF qualityNode
    class DEV,STAGING,PROD deployNode
    class ERROR,PERF_MON,USER,HEALTH monitorNode
```

---

## Architecture Summary

This architecture ensures:

1. **✅ Zero Mock Data**: All components use real WebSocket data from RAG backend
2. **✅ Component Size Compliance**: Every component ≤200 lines through modular design
3. **✅ Real-time Integration**: Live data flow from RAG system to UI components
4. **✅ Modular Architecture**: Focused, single-responsibility components
5. **✅ Type Safety**: Full TypeScript integration with proper interfaces
6. **✅ Performance Optimization**: Lazy loading, memoization, and efficient rendering
7. **✅ Quality Assurance**: Automated testing and validation throughout pipeline
8. **✅ Production Ready**: Comprehensive monitoring and deployment strategy

**Critical Success Factors:**
- Complete elimination of mock data violations
- Strict adherence to 200-line component limit
- Real-time WebSocket integration functional
- Comprehensive test coverage for all components
- Performance optimization for production deployment