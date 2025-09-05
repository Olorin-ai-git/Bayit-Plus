# Autonomous Mode Default Architecture Diagram

**Date:** January 4, 2025  
**Related Plan:** [2025-01-04-autonomous-mode-default-implementation-plan.md](../plans/2025-01-04-autonomous-mode-default-implementation-plan.md)

## System Architecture Overview

```mermaid
graph TB
    subgraph "Frontend Configuration Layer"
        A[Environment Config<br/>environment.ts] --> B{Default Autonomous Mode?}
        B -->|Yes| C[autonomousMode = true]
        B -->|No| D[autonomousMode = false]
        
        E[User Local Storage<br/>Preference] --> F{Saved Preference?}
        F -->|Yes| G[Load Saved Preference]
        F -->|No| H[Use Environment Default]
        
        G --> I[Final Mode State]
        C --> I
        D --> I
        H --> I
    end
    
    subgraph "Component State Management"
        I --> J[InvestigationPage<br/>useState Hook]
        J --> K{Autonomous Mode?}
        K -->|Yes| L[EnhancedAutonomousInvestigationPanel]
        K -->|No| M[ManualInvestigationPanel]
    end
    
    subgraph "Backend Configuration"
        N[Firebase Secrets<br/>DEFAULT_AUTONOMOUS_MODE] --> O[Backend Config<br/>config.py]
        O --> P[Settings API<br/>/api/settings]
        P --> Q{Frontend Request?}
        Q -->|Yes| R[Return Server Defaults]
    end
    
    subgraph "Investigation Flow"
        L --> S[Autonomous Investigation<br/>WebSocket Flow]
        M --> T[Manual Investigation<br/>Step-by-step Flow]
        
        S --> U[LangGraph Agents]
        U --> V[Real-time Updates]
        V --> W[Investigation Results]
        
        T --> X[User-driven Analysis]
        X --> Y[Manual Tool Execution]
        Y --> W
    end
    
    subgraph "User Experience"
        W --> Z[Results Display]
        Z --> AA[Mode Toggle Available]
        AA --> AB{User Changes Mode?}
        AB -->|Yes| AC[Save to Local Storage]
        AB -->|No| AD[Maintain Current Mode]
        AC --> AE[Update Component State]
        AD --> AE
    end
    
    %% Styling
    classDef configNode fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef componentNode fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef investigationNode fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef userNode fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    
    class A,B,C,D,E,F,G,H,N,O,P configNode
    class I,J,K,L,M componentNode
    class S,T,U,V,W,X,Y investigationNode
    class Z,AA,AB,AC,AD,AE userNode
```

## Configuration Flow Diagram

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant LS as Local Storage
    participant ENV as Environment Config
    participant BE as Backend
    participant FS as Firebase Secrets
    
    Note over U,FS: Application Startup
    
    F->>ENV: Load environment config
    ENV->>F: defaultAutonomousMode = true
    
    F->>LS: Check saved preference
    alt Preference exists
        LS->>F: Return saved preference
    else No preference
        F->>F: Use environment default
    end
    
    F->>BE: GET /api/settings
    BE->>FS: Load server config
    FS->>BE: DEFAULT_AUTONOMOUS_MODE = true
    BE->>F: Return server recommendations
    
    F->>F: Initialize component state
    
    Note over U,FS: User Interaction
    
    U->>F: Toggle investigation mode
    F->>LS: Save user preference
    F->>F: Update component state
    
    alt Autonomous Mode
        F->>BE: Start autonomous investigation
        BE->>F: WebSocket updates
    else Manual Mode
        F->>U: Display manual tools
        U->>F: Execute tools manually
    end
```

## State Management Flow

```mermaid
stateDiagram-v2
    [*] --> LoadingConfig
    
    LoadingConfig --> CheckLocalStorage: Config loaded
    
    CheckLocalStorage --> UseLocalStorage: Preference exists
    CheckLocalStorage --> UseEnvironmentDefault: No preference
    
    UseLocalStorage --> AutonomousMode: Preference = true
    UseLocalStorage --> ManualMode: Preference = false
    
    UseEnvironmentDefault --> AutonomousMode: ENV default = true
    UseEnvironmentDefault --> ManualMode: ENV default = false
    
    AutonomousMode --> InvestigationActive: Start investigation
    ManualMode --> InvestigationActive: Start investigation
    
    InvestigationActive --> UserToggle: User changes mode
    InvestigationActive --> InvestigationComplete: Investigation finished
    
    UserToggle --> SavePreference: Update preference
    SavePreference --> AutonomousMode: Switch to autonomous
    SavePreference --> ManualMode: Switch to manual
    
    InvestigationComplete --> [*]: Investigation closed
    
    note right of UseEnvironmentDefault
        New default behavior:
        autonomous mode = true
    end note
    
    note left of SavePreference
        User preference overrides
        all defaults
    end note
```

## Component Architecture

```mermaid
graph TD
    subgraph "InvestigationPage Component"
        A[State: autonomousMode] --> B{Mode Check}
        B -->|true| C[EnhancedAutonomousInvestigationPanel]
        B -->|false| D[ManualInvestigationPanel]
    end
    
    subgraph "Configuration Sources Priority"
        E[1. User Local Storage<br/>Highest Priority] --> F[Final Mode State]
        G[2. Environment Config<br/>Medium Priority] --> F
        H[3. Server Config<br/>Lowest Priority] --> F
    end
    
    subgraph "Autonomous Investigation Components"
        C --> I[WebSocket Connection]
        C --> J[Progress Tracker]
        C --> K[Real-time Updates]
        I --> L[LangGraph Agent System]
        J --> M[Investigation Status]
        K --> N[Results Display]
    end
    
    subgraph "Manual Investigation Components"
        D --> O[Tool Selection]
        D --> P[Step-by-step Guide]
        D --> Q[Manual Results]
        O --> R[Individual Analysis Tools]
        P --> S[User-driven Flow]
        Q --> T[Aggregated Results]
    end
    
    subgraph "Common Components"
        N --> U[Investigation Results]
        T --> U
        U --> V[PDF Export]
        U --> W[Mode Toggle]
        W --> X[Update State & Preference]
    end
    
    F --> A
    X --> A
    
    %% Styling
    classDef priorityNode fill:#ffecb3,stroke:#ff8f00,stroke-width:2px
    classDef autonomousNode fill:#c8e6c9,stroke:#4caf50,stroke-width:2px
    classDef manualNode fill:#ffcdd2,stroke:#f44336,stroke-width:2px
    classDef commonNode fill:#e1bee7,stroke:#9c27b0,stroke-width:2px
    
    class E,G,H,F priorityNode
    class C,I,J,K,L,M,N autonomousNode
    class D,O,P,Q,R,S,T manualNode
    class A,B,U,V,W,X commonNode
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development Environment"
        A[Local Development<br/>REACT_APP_DEFAULT_AUTONOMOUS_MODE=true] --> B[Testing & Validation]
    end
    
    subgraph "Staging Environment"
        C[Staging Config<br/>DEFAULT_AUTONOMOUS_MODE=true] --> D[Integration Testing]
        D --> E[User Acceptance Testing]
    end
    
    subgraph "Production Environment"
        F[Production Config<br/>Feature Flag Enabled] --> G{Gradual Rollout}
        G -->|Phase 1| H[Beta Users<br/>10% Traffic]
        G -->|Phase 2| I[Expanded Rollout<br/>50% Traffic]
        G -->|Phase 3| J[Full Rollout<br/>100% Traffic]
    end
    
    subgraph "Rollback Strategy"
        K[Environment Variable<br/>REACT_APP_DEFAULT_AUTONOMOUS_MODE=false] --> L[Immediate Rollback<br/>< 5 minutes]
        M[Git Revert] --> N[Code Rollback<br/>< 30 minutes]
    end
    
    subgraph "Monitoring"
        O[Usage Metrics] --> P[Dashboard]
        Q[Error Tracking] --> P
        R[User Feedback] --> P
        P --> S{Issues Detected?}
        S -->|Yes| T[Trigger Rollback]
        S -->|No| U[Continue Rollout]
    end
    
    B --> C
    E --> F
    H --> I
    I --> J
    
    T --> K
    T --> M
    
    J --> O
    J --> Q
    J --> R
    
    %% Styling
    classDef envNode fill:#e8f5e8,stroke:#4caf50,stroke-width:2px
    classDef rollbackNode fill:#ffcdd2,stroke:#f44336,stroke-width:2px
    classDef monitorNode fill:#e3f2fd,stroke:#2196f3,stroke-width:2px
    
    class A,B,C,D,E,F,G,H,I,J envNode
    class K,L,M,N,T rollbackNode
    class O,P,Q,R,S,U monitorNode
```