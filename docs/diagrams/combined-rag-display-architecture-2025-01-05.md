# Combined RAG-Enhanced Structured Investigation Display Architecture

**Date**: 2025-01-05  
**Author**: Gil Klainert  
**Plan Reference**: [Combined RAG-Enhanced Display Integration Plan](../plans/2025-01-05-combined-rag-enhanced-display-integration-plan.md)

## System Architecture Overview

```mermaid
graph TB
    %% Main Display Component
    subgraph "Combined Structured Investigation Display"
        CAID[CombinedStructuredInvestigationDisplay.tsx]
        
        subgraph "Neural Network Section"
            NNF[NeuralNetworkFlow.tsx]
            NN[NeuralNode.tsx]
            NC[NeuralConnection.tsx]
            RNE[RAGNeuralEnhancements.tsx]
        end
        
        subgraph "Interactive Graph Section"
            IIG[InteractiveInvestigationGraph.tsx]
            GN[GraphNode.tsx]
            GE[GraphEdge.tsx]
            RGI[RAGGraphIndicators.tsx]
        end
        
        subgraph "Command Terminal Section"
            CT[CommandTerminal.tsx]
            TL[TerminalLine.tsx]
            TE[TypewriterEffect.tsx]
            RTL[RAGTerminalLogs.tsx]
        end
    end
    
    %% React Hooks Layer
    subgraph "State Management Hooks"
        UCD[useCombinedDisplay.ts]
        URV[useRAGVisualization.ts]
        URTA[useRealTimeAnimations.ts]
        UAI[useStructuredInvestigation.ts]
    end
    
    %% WebSocket Integration Layer
    subgraph "WebSocket Integration"
        AIC[StructuredInvestigationClient.ts]
        REH[RAG Event Handlers]
        SET[Stream Event Types]
    end
    
    %% RAG Backend Integration
    subgraph "RAG Backend System"
        WSS[WebSocket Streaming Service]
        RO[RAG Orchestrator]
        KB[Knowledge Base]
        TR[Tool Recommender]
        REA[RAG Enhanced Agents]
    end
    
    %% Component Relationships
    CAID --> NNF
    CAID --> IIG
    CAID --> CT
    
    NNF --> NN
    NNF --> NC
    NNF --> RNE
    
    IIG --> GN
    IIG --> GE
    IIG --> RGI
    
    CT --> TL
    CT --> TE
    CT --> RTL
    
    %% Hooks Integration
    CAID --> UCD
    NNF --> URV
    IIG --> URV
    CT --> URTA
    
    UCD --> UAI
    URV --> AIC
    URTA --> AIC
    
    %% WebSocket Flow
    AIC --> REH
    REH --> SET
    SET --> WSS
    
    %% Backend Integration
    WSS --> RO
    RO --> KB
    RO --> TR
    RO --> REA
    
    %% Styling
    style CAID fill:#e3f2fd
    style NNF fill:#f1f8e9
    style IIG fill:#fff3e0
    style CT fill:#fce4ec
    style UCD fill:#e8f5e8
    style AIC fill:#fff8e1
    style WSS fill:#e0f2f1
```

## RAG Event Flow Architecture

```mermaid
sequenceDiagram
    participant User
    participant CAID as Combined Display
    participant Neural as Neural Network
    participant Graph as Interactive Graph
    participant Terminal as Command Terminal
    participant Hooks as React Hooks
    participant WS as WebSocket Client
    participant Backend as RAG Backend
    
    User->>CAID: Start Investigation
    CAID->>WS: Initialize WebSocket Connection
    WS->>Backend: Connect to RAG-Enhanced Investigation
    
    Backend->>WS: rag_knowledge_retrieved
    WS->>Hooks: Process RAG Event
    Hooks->>Neural: Update Node Colors & Status
    Hooks->>Graph: Add Knowledge Indicators
    Hooks->>Terminal: Display RAG Log Entry
    
    Backend->>WS: rag_tool_recommended
    WS->>Hooks: Process Tool Event
    Hooks->>Neural: Highlight Tool Connections
    Hooks->>Graph: Show Tool Recommendation
    Hooks->>Terminal: Log Tool Selection
    
    Backend->>WS: rag_context_augmented
    WS->>Hooks: Process Context Event
    Hooks->>Neural: Show Context Flow
    Hooks->>Graph: Update Edge Thickness
    Hooks->>Terminal: Display Context Info
    
    Backend->>WS: rag_result_enhanced
    WS->>Hooks: Process Enhancement Event
    Hooks->>Neural: Node Success Animation
    Hooks->>Graph: Result Confidence Display
    Hooks->>Terminal: Show Enhancement Results
    
    Backend->>WS: rag_performance_metrics
    WS->>Hooks: Process Metrics Event
    Hooks->>Neural: Update Performance Overlay
    Hooks->>Graph: Show Metrics Dashboard
    Hooks->>Terminal: Display Performance Stats
```

## Component State Management Architecture

```mermaid
graph TB
    subgraph "Component State Flow"
        subgraph "Combined Display State"
            CDS[Combined Display State]
            ISV[Investigation State Variables]
            RSV[RAG Status Variables]
            ASV[Animation State Variables]
        end
        
        subgraph "Neural Network State"
            NNS[Neural Network State]
            NSV[Node State Variables]
            CSV[Connection State Variables]
            RESV[RAG Enhancement Variables]
        end
        
        subgraph "Interactive Graph State"
            IGS[Interactive Graph State]
            GSV[Graph State Variables]
            ESV[Edge State Variables]
            RISV[RAG Indicator Variables]
        end
        
        subgraph "Terminal State"
            TS[Terminal State]
            LSV[Log State Variables]
            TSV[Typewriter State Variables]
            RLSV[RAG Log State Variables]
        end
    end
    
    subgraph "Event Processing"
        EP[Event Processor]
        REP[RAG Event Parser]
        SU[State Updater]
        AU[Animation Updater]
    end
    
    subgraph "WebSocket Events"
        WE[WebSocket Events]
        RKR[rag_knowledge_retrieved]
        RCA[rag_context_augmented]
        RTR[rag_tool_recommended]
        RRE[rag_result_enhanced]
        RPM[rag_performance_metrics]
    end
    
    %% Event Flow
    WE --> EP
    RKR --> REP
    RCA --> REP
    RTR --> REP
    RRE --> REP
    RPM --> REP
    
    EP --> REP
    REP --> SU
    SU --> AU
    
    %% State Updates
    AU --> CDS
    AU --> NNS
    AU --> IGS
    AU --> TS
    
    %% Internal State Management
    CDS --> ISV
    CDS --> RSV
    CDS --> ASV
    
    NNS --> NSV
    NNS --> CSV
    NNS --> RESV
    
    IGS --> GSV
    IGS --> ESV
    IGS --> RISV
    
    TS --> LSV
    TS --> TSV
    TS --> RLSV
    
    style EP fill:#4caf50
    style REP fill:#2196f3
    style SU fill:#ff9800
    style AU fill:#9c27b0
```

## RAG Enhancement Visual Integration

```mermaid
graph LR
    subgraph "RAG Event Types"
        RKR[Knowledge Retrieved]
        RCA[Context Augmented]
        RTR[Tool Recommended]
        RRE[Result Enhanced]
        RPM[Performance Metrics]
    end
    
    subgraph "Neural Network Visuals"
        NNV[Neural Network Visuals]
        NC[Node Colors]
        NP[Node Pulsing]
        CA[Connection Animation]
        TO[Tooltip Overlays]
    end
    
    subgraph "Interactive Graph Visuals"
        IGV[Interactive Graph Visuals]
        NG[Node Glow Effects]
        ET[Edge Thickness]
        TI[Tool Indicators]
        CF[Confidence Flow]
    end
    
    subgraph "Command Terminal Visuals"
        CTV[Command Terminal Visuals]
        LC[Log Color Coding]
        SA[Source Attribution]
        PM[Performance Metrics]
        TA[Typewriter Animation]
    end
    
    %% RAG to Visual Mappings
    RKR --> NC
    RKR --> NG
    RKR --> LC
    
    RCA --> NP
    RCA --> ET
    RCA --> SA
    
    RTR --> CA
    RTR --> TI
    RTR --> LC
    
    RRE --> TO
    RRE --> CF
    RRE --> PM
    
    RPM --> NNV
    RPM --> IGV
    RPM --> TA
    
    %% Visual Component Integration
    NC --> NNV
    NP --> NNV
    CA --> NNV
    TO --> NNV
    
    NG --> IGV
    ET --> IGV
    TI --> IGV
    CF --> IGV
    
    LC --> CTV
    SA --> CTV
    PM --> CTV
    TA --> CTV
    
    style RKR fill:#ffeb3b
    style RCA fill:#ffeb3b
    style RTR fill:#ffeb3b
    style RRE fill:#ffeb3b
    style RPM fill:#ffeb3b
```

## Animation System Architecture

```mermaid
graph TB
    subgraph "Animation Management"
        AM[Animation Manager]
        AQ[Animation Queue]
        AT[Animation Timers]
        AS[Animation Sequences]
    end
    
    subgraph "Neural Network Animations"
        NNA[Neural Network Animations]
        NPA[Node Pulse Animation]
        CFA[Connection Flow Animation]
        REA[RAG Enhancement Animation]
    end
    
    subgraph "Interactive Graph Animations"
        IGA[Interactive Graph Animations]
        GGA[Graph Glow Animation]
        ETA[Edge Thickness Animation]
        TIA[Tool Indicator Animation]
    end
    
    subgraph "Terminal Animations"
        TA[Terminal Animations]
        TEA[Typewriter Effect Animation]
        SCA[Scroll Animation]
        CCA[Color Change Animation]
    end
    
    subgraph "Animation Triggers"
        RAGEvents[RAG Events]
        UserInteractions[User Interactions]
        StateChanges[State Changes]
        TimerEvents[Timer Events]
    end
    
    %% Animation Flow
    RAGEvents --> AM
    UserInteractions --> AM
    StateChanges --> AM
    TimerEvents --> AM
    
    AM --> AQ
    AQ --> AT
    AT --> AS
    
    AS --> NNA
    AS --> IGA
    AS --> TA
    
    %% Component Animations
    NNA --> NPA
    NNA --> CFA
    NNA --> REA
    
    IGA --> GGA
    IGA --> ETA
    IGA --> TIA
    
    TA --> TEA
    TA --> SCA
    TA --> CCA
    
    style AM fill:#e91e63
    style AQ fill:#9c27b0
    style AT fill:#673ab7
    style AS fill:#3f51b5
```

## Performance Optimization Architecture

```mermaid
graph TB
    subgraph "Performance Monitoring"
        PM[Performance Monitor]
        RTC[Render Time Checker]
        MUM[Memory Usage Monitor]
        APC[Animation Performance Counter]
    end
    
    subgraph "Optimization Strategies"
        OS[Optimization Strategies]
        RM[React.memo]
        UC[useCallback]
        UM[useMemo]
        VIR[Virtualization]
    end
    
    subgraph "Component Optimization"
        CO[Component Optimization]
        LR[Lazy Rendering]
        ET[Event Throttling]
        SU[State Updates]
        AO[Animation Optimization]
    end
    
    subgraph "Bundle Optimization"
        BO[Bundle Optimization]
        CS[Code Splitting]
        DC[Dynamic Components]
        AC[Asset Compression]
        CO2[Cache Optimization]
    end
    
    %% Performance Flow
    PM --> RTC
    PM --> MUM
    PM --> APC
    
    RTC --> OS
    MUM --> OS
    APC --> OS
    
    OS --> RM
    OS --> UC
    OS --> UM
    OS --> VIR
    
    RM --> CO
    UC --> CO
    UM --> CO
    VIR --> CO
    
    CO --> LR
    CO --> ET
    CO --> SU
    CO --> AO
    
    LR --> BO
    ET --> BO
    SU --> BO
    AO --> BO
    
    BO --> CS
    BO --> DC
    BO --> AC
    BO --> CO2
    
    style PM fill:#4caf50
    style OS fill:#2196f3
    style CO fill:#ff9800
    style BO fill:#9c27b0
```

## Mobile Responsive Architecture

```mermaid
graph LR
    subgraph "Screen Sizes"
        SS[Screen Sizes]
        M[Mobile (<768px)]
        T[Tablet (768-1024px)]
        D[Desktop (>1024px)]
    end
    
    subgraph "Layout Adaptations"
        LA[Layout Adaptations]
        SL[Stacked Layout]
        GL[Grid Layout]
        FL[Flex Layout]
    end
    
    subgraph "Component Adaptations"
        CA[Component Adaptations]
        SNV[Simplified Neural View]
        CGI[Compact Graph Interface]
        RCT[Responsive Command Terminal]
    end
    
    subgraph "Interaction Adaptations"
        IA[Interaction Adaptations]
        TG[Touch Gestures]
        SW[Swipe Navigation]
        PM[Pinch/Zoom Management]
    end
    
    %% Responsive Flow
    SS --> LA
    M --> SL
    T --> GL
    D --> FL
    
    LA --> CA
    SL --> SNV
    GL --> CGI
    FL --> RCT
    
    CA --> IA
    SNV --> TG
    CGI --> SW
    RCT --> PM
    
    style M fill:#f44336
    style T fill:#ff9800
    style D fill:#4caf50
```

This comprehensive architecture ensures optimal performance, maintainability, and user experience across all device types while providing full RAG enhancement visualization capabilities.