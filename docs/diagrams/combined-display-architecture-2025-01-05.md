# Combined Structured Investigation Display Architecture

**Date**: 2025-01-05  
**Author**: Gil Klainert  
**Plan Reference**: [Combined Display Integration Plan](../plans/2025-01-05-combined-structured-investigation-display-integration-plan.md)

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
            NAM[NeuralAnimationManager.tsx]
        end
        
        subgraph "Interactive Graph Section"
            IIG[InteractiveInvestigationGraph.tsx]
            GN[GraphNode.tsx]
            GE[GraphEdge.tsx]
            GIH[GraphInteractionHandler.tsx]
        end
        
        subgraph "Command Terminal Section"
            CT[CommandTerminal.tsx]
            TL[TerminalLine.tsx]
            TE[TypewriterEffect.tsx]
            TLM[TerminalLogManager.tsx]
        end
    end
    
    %% React Hooks Layer
    subgraph "State Management Hooks"
        UCD[useCombinedDisplay.ts]
        UIA[useInvestigationAnimation.ts]
        UTT[useTerminalTypewriter.ts]
        UAI[useStructuredInvestigation.ts]
    end
    
    %% WebSocket Integration Layer
    subgraph "WebSocket Integration"
        AIC[StructuredInvestigationClient.ts]
        IEH[Investigation Event Handlers]
        SET[Stream Event Types]
    end
    
    %% Backend Integration
    subgraph "Backend System"
        WSS[WebSocket Streaming Service]
        AA[Structured Agents]
        JT[Journey Tracker]
        IR[Investigation Router]
    end
    
    %% Component Relationships
    CAID --> NNF
    CAID --> IIG
    CAID --> CT
    
    NNF --> NN
    NNF --> NC
    NNF --> NAM
    
    IIG --> GN
    IIG --> GE
    IIG --> GIH
    
    CT --> TL
    CT --> TE
    CT --> TLM
    
    %% Hooks Integration
    CAID --> UCD
    NNF --> UIA
    IIG --> UIA
    CT --> UTT
    
    UCD --> UAI
    UIA --> AIC
    UTT --> AIC
    
    %% WebSocket Flow
    AIC --> IEH
    IEH --> SET
    SET --> WSS
    
    %% Backend Integration
    WSS --> AA
    AA --> JT
    JT --> IR
    
    %% Styling
    style CAID fill:#e3f2fd
    style NNF fill:#f1f8e9
    style IIG fill:#fff3e0
    style CT fill:#fce4ec
    style UCD fill:#e8f5e8
    style AIC fill:#fff8e1
    style WSS fill:#e0f2f1
```

## Investigation Event Flow

```mermaid
sequenceDiagram
    participant User
    participant CAID as Combined Display
    participant Neural as Neural Network
    participant Graph as Interactive Graph
    participant Terminal as Command Terminal
    participant Hooks as React Hooks
    participant WS as WebSocket Client
    participant Backend as Backend System
    
    User->>CAID: Start Investigation
    CAID->>WS: Initialize WebSocket Connection
    WS->>Backend: Connect & Subscribe
    
    Backend->>WS: phase_update event
    WS->>Hooks: Process Investigation Event
    Hooks->>Neural: Update Agent Node States
    Hooks->>Graph: Progress Investigation Flow
    Hooks->>Terminal: Add Log Entry
    
    Backend->>WS: status_update event
    WS->>Hooks: Process Status Event
    Hooks->>Neural: Update Network Status
    Hooks->>Graph: Update Progress Indicators
    Hooks->>Terminal: Log Status Change
    
    Backend->>WS: agent_response event
    WS->>Hooks: Process Agent Response
    Hooks->>Neural: Animate Agent Activity
    Hooks->>Graph: Update Node States
    Hooks->>Terminal: Stream Agent Logs
    
    Backend->>WS: completion event
    WS->>Hooks: Process Completion Event
    Hooks->>Neural: Final State Animation
    Hooks->>Graph: Complete Investigation Flow
    Hooks->>Terminal: Show Completion Message
    
    CAID->>User: Display Final Results
```

## Component State Management

```mermaid
graph TB
    subgraph "Component State Flow"
        subgraph "Combined Display State"
            CDS[Combined Display State]
            ISV[Investigation State Variables]
            ASV[Animation State Variables]
            USV[UI State Variables]
        end
        
        subgraph "Neural Network State"
            NNS[Neural Network State]
            NSV[Node State Variables]
            CSV[Connection State Variables]
            ANSV[Animation State Variables]
        end
        
        subgraph "Interactive Graph State"
            IGS[Interactive Graph State]
            GSV[Graph State Variables]
            ESV[Edge State Variables]
            GISV[Graph Interaction Variables]
        end
        
        subgraph "Terminal State"
            TS[Terminal State]
            LSV[Log State Variables]
            TSV[Typewriter State Variables]
            TLSV[Terminal Line Variables]
        end
    end
    
    subgraph "Event Processing"
        EP[Event Processor]
        IEP[Investigation Event Parser]
        SU[State Updater]
        AU[Animation Updater]
    end
    
    subgraph "WebSocket Events"
        WE[WebSocket Events]
        PU[phase_update]
        STA[status_update]
        AR[agent_response]
        ERR[error]
        COMP[completion]
    end
    
    %% Event Flow
    WE --> EP
    PU --> IEP
    STA --> IEP
    AR --> IEP
    ERR --> IEP
    COMP --> IEP
    
    EP --> IEP
    IEP --> SU
    SU --> AU
    
    %% State Updates
    AU --> CDS
    AU --> NNS
    AU --> IGS
    AU --> TS
    
    %% Internal State Management
    CDS --> ISV
    CDS --> ASV
    CDS --> USV
    
    NNS --> NSV
    NNS --> CSV
    NNS --> ANSV
    
    IGS --> GSV
    IGS --> ESV
    IGS --> GISV
    
    TS --> LSV
    TS --> TSV
    TS --> TLSV
    
    style EP fill:#4caf50
    style IEP fill:#2196f3
    style SU fill:#ff9800
    style AU fill:#9c27b0
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
        NSA[Node State Animation]
    end
    
    subgraph "Interactive Graph Animations"
        IGA[Interactive Graph Animations]
        GPA[Graph Progress Animation]
        EFA[Edge Flow Animation]
        NIA[Node Interaction Animation]
    end
    
    subgraph "Terminal Animations"
        TA[Terminal Animations]
        TEA[Typewriter Effect Animation]
        SCA[Scroll Animation]
        LFA[Log Fade Animation]
    end
    
    subgraph "Animation Triggers"
        WSEvents[WebSocket Events]
        UserInteractions[User Interactions]
        StateChanges[State Changes]
        TimerEvents[Timer Events]
    end
    
    %% Animation Flow
    WSEvents --> AM
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
    NNA --> NSA
    
    IGA --> GPA
    IGA --> EFA
    IGA --> NIA
    
    TA --> TEA
    TA --> SCA
    TA --> LFA
    
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
        CNV[Compact Neural View]
        SGI[Simplified Graph Interface]
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
    SL --> CNV
    GL --> SGI
    FL --> RCT
    
    CA --> IA
    CNV --> TG
    SGI --> SW
    RCT --> PM
    
    style M fill:#f44336
    style T fill:#ff9800
    style D fill:#4caf50
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
        AA[Structured Agents]
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
    PY --> AA
    WS2 --> WP
    AA --> ES
    
    style R fill:#61dafb
    style TS fill:#3178c6
    style TC fill:#06b6d4
    style FA fill:#009688
    style PY fill:#3776ab
```

This architecture ensures optimal performance, maintainability, and user experience while providing comprehensive structured investigation visualization capabilities without RAG complexity.