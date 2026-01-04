# Phase 5: RAG Frontend Integration Architecture Diagram

**Date**: 2025-01-04  
**Author**: Gil Klainert  
**Plan Reference**: [2025-01-04-phase-5-rag-frontend-integration-testing-plan.md](../plans/2025-01-04-phase-5-rag-frontend-integration-testing-plan.md)

## System Architecture Overview

```mermaid
graph TB
    %% Frontend Components
    subgraph "Frontend Application"
        subgraph "Investigation Dashboard"
            ID[OptimizedInvestigationDashboard]
            RSI[RAGStatusIndicator]
            RPM[RAGPerformanceMetrics] 
            RKP[RAGKnowledgePanel]
            RTR[RAGToolRecommendations]
            RIM[RAGInsightsModal]
        end
        
        subgraph "React Hooks"
            URS[useRAGStatus]
            URM[useRAGMetrics]
            URI[useRAGInsights]
            UAI[useStructuredInvestigation]
        end
        
        subgraph "WebSocket Client"
            AIC[StructuredInvestigationClient]
            REH[RAG Event Handlers]
        end
        
        subgraph "Type Definitions"
            RT[RAGTypes.ts]
            IE[Investigation Events]
        end
    end
    
    %% Backend Services  
    subgraph "Backend Services"
        subgraph "WebSocket Layer"
            WSS[WebSocket Streaming Service]
            SET[Stream Event Types]
        end
        
        subgraph "RAG System"
            RO[RAG Orchestrator]
            KB[Knowledge Base]
            CA[Context Augmentor]
            TR[Tool Recommender]
        end
        
        subgraph "Agent System"
            REA[RAG Enhanced Agents]
            NA[Network Agent]
            DA[Device Agent]
            LA[Location Agent]
            LogA[Logs Agent]
            RA[Risk Agent]
        end
        
        subgraph "Performance Monitoring"
            PM[Performance Metrics]
            JT[Journey Tracker]
        end
    end
    
    %% Data Flow Connections
    ID --> RSI
    ID --> RPM
    ID --> RKP
    ID --> RTR
    ID --> RIM
    
    RSI --> URS
    RPM --> URM
    RKP --> URI
    RTR --> URI
    RIM --> URI
    
    URS --> AIC
    URM --> AIC
    URI --> AIC
    UAI --> AIC
    
    AIC --> REH
    REH --> WSS
    
    WSS --> SET
    WSS --> RO
    
    RO --> KB
    RO --> CA
    RO --> TR
    
    REA --> NA
    REA --> DA
    REA --> LA
    REA --> LogA
    REA --> RA
    
    RO --> PM
    PM --> JT
    
    RT --> RSI
    RT --> RPM
    RT --> RKP
    RT --> RTR
    RT --> RIM
    
    IE --> REH
    
    %% Event Flow
    RO -.-> WSS
    PM -.-> WSS
    JT -.-> WSS
    
    style ID fill:#e1f5fe
    style RSI fill:#f3e5f5
    style RPM fill:#f3e5f5
    style RKP fill:#f3e5f5
    style RTR fill:#f3e5f5
    style RIM fill:#f3e5f5
    style RO fill:#fff3e0
    style WSS fill:#e8f5e8
```

## Component Interaction Flow

```mermaid
sequenceDiagram
    participant User
    participant Dashboard as Investigation Dashboard
    participant RAGComponents as RAG UI Components
    participant WebSocket as WebSocket Client
    participant Backend as RAG Backend
    participant Agents as Enhanced Agents
    
    User->>Dashboard: Start Investigation
    Dashboard->>WebSocket: Initialize Connection
    WebSocket->>Backend: Connect & Subscribe
    
    Backend->>Agents: Begin RAG-Enhanced Analysis
    
    loop Investigation Process
        Agents->>Backend: RAG Knowledge Retrieval
        Backend->>WebSocket: rag_knowledge_retrieved event
        WebSocket->>RAGComponents: Update Knowledge Panel
        RAGComponents->>Dashboard: Display Knowledge Sources
        
        Agents->>Backend: RAG Tool Recommendation
        Backend->>WebSocket: rag_tool_recommended event
        WebSocket->>RAGComponents: Update Tool Recommendations
        RAGComponents->>Dashboard: Show Tool Reasoning
        
        Agents->>Backend: RAG Result Enhancement
        Backend->>WebSocket: rag_result_enhanced event
        WebSocket->>RAGComponents: Update Status Indicator
        RAGComponents->>Dashboard: Show Enhancement Applied
        
        Backend->>WebSocket: rag_performance_metrics event
        WebSocket->>RAGComponents: Update Performance Dashboard
        RAGComponents->>Dashboard: Display Live Metrics
    end
    
    Backend->>WebSocket: Investigation Complete
    WebSocket->>Dashboard: Update Final Results
    Dashboard->>User: Show Enhanced Investigation Results
```

## RAG WebSocket Event Architecture

```mermaid
graph LR
    subgraph "RAG Event Types"
        RE1[rag_knowledge_retrieved]
        RE2[rag_context_augmented]
        RE3[rag_tool_recommended]
        RE4[rag_result_enhanced]
        RE5[rag_performance_metrics]
    end
    
    subgraph "Event Data Structure"
        ED[Event Data]
        IT[investigation_id]
        AT[agent_type]
        TS[timestamp]
        OD[operation_data]
    end
    
    subgraph "Operation Data"
        OP[operation]
        KS[knowledge_sources]
        CS[context_size]
        RT[retrieval_time]
        CNF[confidence_score]
        EA[enhancement_applied]
    end
    
    RE1 --> ED
    RE2 --> ED
    RE3 --> ED
    RE4 --> ED
    RE5 --> ED
    
    ED --> IT
    ED --> AT
    ED --> TS
    ED --> OD
    
    OD --> OP
    OD --> KS
    OD --> CS
    OD --> RT
    OD --> CNF
    OD --> EA
    
    style RE1 fill:#ffeb3b
    style RE2 fill:#ffeb3b
    style RE3 fill:#ffeb3b
    style RE4 fill:#ffeb3b
    style RE5 fill:#ffeb3b
```

## Component State Management

```mermaid
graph TD
    subgraph "Component State Flow"
        subgraph "RAG Status Management"
            RS[RAG Status State]
            RSE[RAG Status Events]
            RSU[Status Updates]
        end
        
        subgraph "Performance Metrics"
            PM[Performance Metrics State]
            PME[Performance Events] 
            PMU[Metrics Updates]
        end
        
        subgraph "Knowledge Insights"
            KI[Knowledge Insights State]
            KIE[Knowledge Events]
            KIU[Insights Updates]
        end
        
        subgraph "WebSocket Event Manager"
            WEM[WebSocket Event Manager]
            EH[Event Handlers]
            ES[Event Streaming]
        end
    end
    
    ES --> EH
    EH --> WEM
    
    WEM --> RSE
    WEM --> PME
    WEM --> KIE
    
    RSE --> RS
    PME --> PM
    KIE --> KI
    
    RS --> RSU
    PM --> PMU
    KI --> KIU
    
    RSU --> RSI[RAG Status Indicator]
    PMU --> RPM[RAG Performance Metrics]
    KIU --> RKP[RAG Knowledge Panel]
    
    style WEM fill:#4caf50
    style RS fill:#2196f3
    style PM fill:#ff9800
    style KI fill:#9c27b0
```

## UI Component Hierarchy

```mermaid
graph TB
    subgraph "Investigation Dashboard (≤200 lines)"
        ID[OptimizedInvestigationDashboard]
        
        subgraph "RAG Section"
            RS[RAG Status Section]
            RM[RAG Metrics Section]
            RI[RAG Insights Section]
        end
    end
    
    subgraph "RAG Components (≤200 lines each)"
        RSI[RAGStatusIndicator]
        RPM[RAGPerformanceMetrics]
        RKP[RAGKnowledgePanel]
        RTR[RAGToolRecommendations]
        RIM[RAGInsightsModal]
    end
    
    subgraph "React Hooks"
        URS[useRAGStatus]
        URM[useRAGMetrics]  
        URI[useRAGInsights]
    end
    
    ID --> RS
    ID --> RM
    ID --> RI
    
    RS --> RSI
    RM --> RPM
    RI --> RKP
    RI --> RTR
    RI --> RIM
    
    RSI --> URS
    RPM --> URM
    RKP --> URI
    RTR --> URI
    RIM --> URI
    
    style ID fill:#e3f2fd
    style RSI fill:#f1f8e9
    style RPM fill:#f1f8e9
    style RKP fill:#f1f8e9
    style RTR fill:#f1f8e9
    style RIM fill:#f1f8e9
```

## Performance Monitoring Architecture

```mermaid
graph TB
    subgraph "Frontend Performance"
        subgraph "Component Metrics"
            CRT[Component Render Time]
            CRM[Component Re-renders]
            CMU[Component Memory Usage]
        end
        
        subgraph "WebSocket Metrics"
            WEL[WebSocket Event Latency]
            WTH[WebSocket Throughput]
            WER[WebSocket Error Rate]
        end
        
        subgraph "RAG UI Metrics"
            RLD[RAG Load Duration]
            RRT[RAG Response Time]
            RIA[RAG Interaction Analytics]
        end
    end
    
    subgraph "Backend Performance"
        subgraph "RAG Operation Metrics"  
            RQT[RAG Query Time]
            RHR[RAG Hit Rate]
            RSR[RAG Success Rate]
        end
        
        subgraph "Knowledge Metrics"
            KRT[Knowledge Retrieval Time]
            KCS[Knowledge Context Size]
            KQF[Knowledge Query Frequency]
        end
        
        subgraph "Enhancement Metrics"
            EAR[Enhancement Application Rate]
            EIT[Enhancement Impact Time]
            EQS[Enhancement Quality Score]
        end
    end
    
    CRT --> RLD
    CRM --> RRT
    CMU --> RIA
    
    WEL --> RQT
    WTH --> RHR
    WER --> RSR
    
    RLD --> KRT
    RRT --> KCS
    RIA --> KQF
    
    RQT --> EAR
    RHR --> EIT
    RSR --> EQS
    
    style CRT fill:#ffcdd2
    style RQT fill:#c8e6c9
    style KRT fill:#fff3e0
    style EAR fill:#e1bee7
```

## Technology Stack Integration

```mermaid
graph LR
    subgraph "Frontend Stack"
        R[React 18+]
        TS[TypeScript]
        TC[Tailwind CSS]
        WS[WebSocket API]
    end
    
    subgraph "State Management"
        RH[React Hooks]
        CM[Context Management]
        MM[Memo Management]
    end
    
    subgraph "Backend Stack"
        FA[FastAPI]
        WS2[WebSocket Server]
        PY[Python 3.11+]
        RA[RAG System]
    end
    
    subgraph "Real-time Communication"
        WP[WebSocket Protocol]
        JM[JSON Messaging]
        ES[Event Streaming]
    end
    
    R --> RH
    TS --> CM
    TC --> MM
    WS --> WP
    
    RH --> JM
    CM --> ES
    MM --> JM
    
    FA --> WS2
    PY --> RA
    WS2 --> WP
    RA --> ES
    
    style R fill:#61dafb
    style TS fill:#3178c6
    style TC fill:#06b6d4
    style FA fill:#009688
    style PY fill:#3776ab
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development Environment"
        DE[Development Server]
        DM[Demo Mode]
        TF[Test Fixtures]
    end
    
    subgraph "Testing Environment"
        UT[Unit Tests]
        IT[Integration Tests]
        E2E[End-to-End Tests]
        UAT[User Acceptance Tests]
    end
    
    subgraph "Production Environment"  
        PS[Production Server]
        FF[Feature Flags]
        MN[Monitoring]
        AL[Analytics]
    end
    
    subgraph "Quality Gates"
        CR[Code Review]
        PA[Performance Audit]
        AT[Accessibility Tests]
        ST[Security Tests]
    end
    
    DE --> UT
    DM --> IT
    TF --> E2E
    
    UT --> CR
    IT --> PA
    E2E --> AT
    UAT --> ST
    
    CR --> FF
    PA --> PS
    AT --> MN
    ST --> AL
    
    style DE fill:#4caf50
    style PS fill:#f44336
    style CR fill:#2196f3
    style FF fill:#ff9800
```

This architecture ensures a robust, scalable, and maintainable RAG frontend integration that provides comprehensive visibility into the RAG enhancement process while maintaining optimal performance.