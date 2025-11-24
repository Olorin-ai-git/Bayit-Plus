# RAG-Enhanced Tool Selection Architecture Diagram

**Date**: 2025-01-04  
**Author**: Gil Klainert  
**Related Plan**: [RAG-Enhanced Tool Selection Implementation Plan](/docs/plans/2025-01-04-rag-enhanced-tool-selection-implementation-plan.md)

## System Architecture Overview

```mermaid
graph TB
    subgraph "Investigation Request"
        A[Investigation Context<br/>- Entity ID/Type<br/>- Domain<br/>- Investigation ID] --> B[Enhanced Agent Factory]
    end

    subgraph "RAG-Enhanced Tool Selection System"
        B --> C[Tool Selection Service]
        C --> D[Knowledge-Based<br/>Tool Recommender]
        D --> E[RAG Orchestrator<br/>Knowledge Retrieval]
        E --> F[Historical Effectiveness<br/>Analysis]
        E --> G[Case Similarity<br/>Matching]
        E --> H[Domain-Specific<br/>Intelligence]
        
        F --> I[Tool Recommendations<br/>with Confidence Scores]
        G --> I
        H --> I
        
        I --> J[Tool Registry<br/>Filtering & Validation]
        J --> K[Enhanced Tool List]
    end

    subgraph "Agent Creation & Execution"
        K --> L[Structured Investigation<br/>Agent Creation]
        L --> M[Domain-Specific Agent<br/>- Network<br/>- Device<br/>- Location<br/>- Logs<br/>- Risk]
        M --> N[Agent Investigation<br/>Execution]
    end

    subgraph "Fallback & Monitoring"
        C --> O[Fallback Handler]
        O --> P[Static Tool Selection<br/>Legacy Categories]
        P --> Q[Standard Tool List]
        Q --> L
        
        C --> R[Performance Monitor]
        R --> S[Metrics Collection<br/>- Selection Time<br/>- Tool Effectiveness<br/>- Fallback Rate]
    end

    subgraph "Knowledge Base"
        T[Investigation History<br/>& Tool Effectiveness] --> E
        U[Domain Knowledge<br/>& Best Practices] --> E
        V[Case Patterns<br/>& Correlations] --> E
    end

    style C fill:#e1f5fe
    style D fill:#f3e5f5
    style E fill:#f3e5f5
    style L fill:#e8f5e8
    style R fill:#fff3e0
```

## Tool Selection Flow Detail

```mermaid
sequenceDiagram
    participant IR as Investigation Request
    participant AF as Agent Factory
    participant TS as Tool Selection Service
    participant TR as Tool Recommender
    participant RO as RAG Orchestrator
    participant KB as Knowledge Base
    participant TReg as Tool Registry
    participant Agent as Structured Agent

    IR->>AF: Create Agent Request<br/>(domain, context)
    AF->>TS: Request Enhanced Tools<br/>(context, domain, categories)
    
    alt RAG Available
        TS->>TR: Get Tool Recommendations<br/>(investigation_context, domain)
        TR->>RO: Retrieve Relevant Knowledge<br/>(domain_patterns, effectiveness_data)
        RO->>KB: Query Historical Data<br/>(tool_performance, case_patterns)
        KB-->>RO: Knowledge Results
        RO-->>TR: Augmented Context
        TR->>TR: Analyze Effectiveness<br/>& Case Similarity
        TR-->>TS: Ranked Tool Recommendations<br/>(confidence, reasoning)
        TS->>TReg: Validate & Filter Tools<br/>(recommendations)
        TReg-->>TS: Validated Tool List
    else RAG Unavailable
        TS->>TReg: Get Standard Tools<br/>(default_categories)
        TReg-->>TS: Standard Tool List
    end
    
    TS-->>AF: Enhanced/Standard Tools
    AF->>Agent: Create Agent with Tools
    Agent->>Agent: Execute Investigation<br/>with Selected Tools
    Agent-->>AF: Investigation Results
    
    Note over TS,TR: Performance metrics collected<br/>for continuous improvement
```

## Component Integration Architecture

```mermaid
graph LR
    subgraph "Existing Components (Phase 2-3)"
        A[RAG Orchestrator] --> B[Context Augmentor]
        A --> C[Retrieval Engine]
        D[Knowledge Base] --> A
        E[Domain Agents<br/>RAG-Enhanced] --> A
    end

    subgraph "Phase 4 Component 1 (Complete)"
        F[Knowledge-Based<br/>Tool Recommender] --> A
        F --> G[Tool Effectiveness<br/>Analysis]
        F --> H[Case Similarity<br/>Matching]
    end

    subgraph "Phase 4 Component 2 (This Implementation)"
        I[Tool Selection<br/>Service] --> F
        I --> J[Enhanced Agent<br/>Factory]
        J --> K[Structured Agent<br/>Base Enhancement]
        K --> L[Domain Agent<br/>Tool Integration]
    end

    subgraph "Tool System Integration"
        M[Tool Registry] --> I
        N[Global Tools<br/>(Legacy)] --> I
        I --> O[Enhanced Tool<br/>Selection]
        O --> K
    end

    style F fill:#c8e6c9
    style I fill:#e1f5fe
    style J fill:#e1f5fe
    style K fill:#e1f5fe
    style L fill:#e1f5fe
```

## Tool Selection Decision Matrix

```mermaid
graph TB
    A[Investigation Context] --> B{RAG Available?}
    
    B -->|Yes| C[Knowledge-Based<br/>Tool Recommender]
    B -->|No| D[Static Tool Selection<br/>Default Categories]
    
    C --> E[Historical Effectiveness<br/>Analysis]
    C --> F[Case Similarity<br/>Matching] 
    C --> G[Domain-Specific<br/>Intelligence]
    
    E --> H[Weighted Scoring<br/>Algorithm]
    F --> H
    G --> H
    
    H --> I{Confidence > Threshold?}
    
    I -->|Yes| J[Enhanced Tool List<br/>with Reasoning]
    I -->|No| K[Hybrid Selection<br/>RAG + Defaults]
    
    D --> L[Standard Tool List<br/>by Category]
    
    J --> M[Agent Creation]
    K --> M
    L --> M
    
    M --> N[Investigation Execution]
    
    style C fill:#e8f5e8
    style H fill:#fff3e0
    style J fill:#e1f5fe
    style K fill:#f3e5f5
```

## Performance & Monitoring Flow

```mermaid
graph TB
    A[Tool Selection Request] --> B[Performance Timer Start]
    B --> C[RAG Tool Selection Process]
    C --> D[Performance Timer End]
    
    D --> E[Metrics Collection]
    E --> F[Selection Time<br/>< 100ms Target]
    E --> G[Cache Hit Rate<br/>> 80% Target]  
    E --> H[Recommendation Quality<br/>Confidence Scores]
    E --> I[Fallback Frequency<br/>Monitor RAG Health]
    
    F --> J[Performance Dashboard]
    G --> J
    H --> J
    I --> J
    
    C --> K{Performance Issue?}
    K -->|Yes| L[Circuit Breaker<br/>Activate Fallback]
    K -->|No| M[Continue Normal<br/>Operation]
    
    L --> N[Static Tool Selection]
    M --> O[Enhanced Tool Selection]
    
    N --> P[Agent Creation]
    O --> P
    
    style E fill:#fff3e0
    style J fill:#f3e5f5
    style L fill:#ffebee
```

## Domain-Specific Tool Categories

```mermaid
graph TB
    subgraph "Network Domain"
        A[threat_intelligence<br/>- AbuseIPDB<br/>- VirusTotal<br/>- Shodan] --> B[Enhanced Network Tools]
        C[intelligence<br/>- OSINT<br/>- Social Media<br/>- Dark Web] --> B
        D[search<br/>- Web Search<br/>- Deep Web] --> B
        E[api<br/>- HTTP Requests<br/>- JSON APIs] --> B
    end

    subgraph "Device Domain" 
        F[threat_intelligence<br/>- File Analysis<br/>- Reputation] --> G[Enhanced Device Tools]
        H[ml_ai<br/>- Behavioral Analysis<br/>- Anomaly Detection] --> G
        I[search<br/>- Device Research<br/>- Vulnerabilities] --> G
    end

    subgraph "Risk Domain"
        J[olorin<br/>- Splunk<br/>- SumoLogic] --> K[Enhanced Risk Tools]
        L[search<br/>- Pattern Research<br/>- Threat Intel] --> K
        M[threat_intelligence<br/>- All Sources] --> K
        N[ml_ai<br/>- Fraud Detection<br/>- Risk Scoring] --> K
    end

    B --> O[Context-Aware<br/>Tool Selection]
    G --> O
    K --> O
    
    style O fill:#e8f5e8
```

This architecture demonstrates how the RAG-Enhanced Tool Selection Mechanism integrates with existing components while providing intelligent, context-aware tool selection for improved investigation outcomes.