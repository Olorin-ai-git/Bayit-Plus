# Multi-Entity Structured Investigation System Architecture

**Date:** 2025-01-09  
**Plan Reference:** [Multi-Entity Structured Investigation System Plan](/docs/plans/2025-01-09-enhanced-entity-search-system-plan.md)  
**Author:** Gil Klainert

## Multi-Entity Investigation Architecture Overview

```mermaid
graph TB
    subgraph "Frontend Investigation Interface"
        A[MultiEntityInvestigationStarter] --> B[EntityRelationshipBuilder]
        B --> C[MultiEntityInvestigationResults]
        C --> D[CrossEntityInsightsPanel]
        A --> E[InvestigationHistoryPanel]
    end

    subgraph "Structured Investigation API"
        F[StructuredInvestigationRouter] --> G[MultiEntityInvestigationRequest]
        G --> H[MultiEntityInvestigationResponse]
        F --> I[InvestigationStatusEndpoint]
        F --> J[WebSocketUpdates]
    end

    subgraph "Multi-Entity Investigation Engine"
        K[MultiEntityInvestigationCoordinator] --> L[LangGraphWorkflowOrchestrator]
        L --> M[DeviceAgentCluster]
        L --> N[LocationAgentCluster]
        L --> O[NetworkAgentCluster]
        L --> P[LogsAgentCluster]
        M --> Q[CrossEntityAnalyzer]
        N --> Q
        O --> Q
        P --> Q
    end

    subgraph "Investigation Tools (Existing)"
        R[SplunkTool] --> S[VectorSearchTool]
        S --> T[ThreatIntelligenceTool]
        T --> U[OSINTTools]
        U --> V[FileSystemTool]
    end

    subgraph "Enhanced Entity System"
        W[EntityManager] --> X[TransactionEntityFactory]
        X --> Y[EnhancedEntityTypes]
        Y --> Z[EntityGraph]
        Z --> AA[EntityRelationships]
    end

    A --> F
    F --> K
    K --> R
    K --> W
    W --> BB[(Transaction CSV Data)]
    W --> CC[(Existing Investigation Data)]

    classDef frontend fill:#e1f5fe
    classDef api fill:#f3e5f5
    classDef engine fill:#e8f5e8
    classDef tools fill:#fff3e0
    classDef entity fill:#fce4ec

    class A,B,C,D,E frontend
    class F,G,H,I,J api
    class K,L,M,N,O,P,Q engine
    class R,S,T,U,V tools
    class W,X,Y,Z,AA,BB,CC entity
```

## Entity Type Extension Architecture

```mermaid
graph LR
    subgraph "CSV Column Mapping"
        A[TABLE_RECORD_CREATED_AT] --> B[TIMESTAMP]
        C[ORIGINAL_TX_ID] --> D[TRANSACTION_ID]
        E[STORE_ID] --> F[MERCHANT]
        G[EMAIL] --> H[EMAIL_IDENTITY]
        I[EVENT_TYPE] --> J[EVENT]
        K[AUTHORIZATION_STAGE] --> L[AUTHORIZATION]
    end

    subgraph "Enhanced Entity Types"
        B --> M[ExistingEntityTypes<br/>48 types]
        D --> M
        F --> M
        H --> M
        J --> M
        L --> M
        M --> N[ExtendedEntityTypes<br/>60+ types]
    end

    subgraph "Entity Factory"
        O[TransactionEntityFactory] --> P[CSVParser]
        P --> Q[AttributeExtractor]
        Q --> R[ValidationEngine]
        R --> S[EntityBuilder]
        S --> N
    end

    classDef csv fill:#e3f2fd
    classDef types fill:#f1f8e9
    classDef factory fill:#fff8e1

    class A,C,E,G,I,K csv
    class B,D,F,H,J,L,M,N types
    class O,P,Q,R,S factory
```

## Multi-Entity Structured Investigation Flow

```mermaid
sequenceDiagram
    participant U as Investigation UI
    participant A as Investigation API
    participant C as Investigation Coordinator
    participant L as LangGraph Orchestrator
    participant DA as Device Agent
    participant LA as Location Agent
    participant NA as Network Agent
    participant LGA as Logs Agent
    participant T as Investigation Tools
    participant W as WebSocket

    U->>A: MultiEntityInvestigationRequest<br/>entities: [user123, txn456, store789]<br/>relationships: [{user→txn}, {txn→store}]<br/>boolean_logic: "user AND (txn OR store)"
    A->>C: Coordinate Investigation<br/>+ Entity Relationships<br/>+ Boolean Logic
    C->>L: Create Multi-Entity Workflow<br/>+ Investigation Scope<br/>+ Agent Assignment
    
    par Parallel Entity Investigations
        L->>DA: Investigate user123<br/>+ Device Analysis
        and
        L->>LA: Investigate user123, store789<br/>+ Location Analysis
        and
        L->>NA: Investigate user123<br/>+ Network Analysis
        and
        L->>LGA: Investigate txn456, store789<br/>+ Logs Analysis
    end
    
    par Agent Tool Execution
        DA->>T: Use VectorSearch, OSINT<br/>for user123 device
        and
        LA->>T: Use Splunk, ThreatIntel<br/>for user123, store789
        and
        NA->>T: Use NetworkTools<br/>for user123 network
        and
        LGA->>T: Use Splunk, FileSystem<br/>for txn456, store789
    end
    
    T-->>DA: Device Investigation Results
    T-->>LA: Location Investigation Results  
    T-->>NA: Network Investigation Results
    T-->>LGA: Logs Investigation Results
    
    DA-->>L: AgentResult + Risk Score
    LA-->>L: AgentResult + Risk Score
    NA-->>L: AgentResult + Risk Score
    LGA-->>L: AgentResult + Risk Score
    
    L->>C: Cross-Entity Analysis<br/>+ Relationship Validation<br/>+ Pattern Detection
    C->>C: Apply Boolean Logic<br/>Combine Entity Results<br/>Calculate Overall Risk
    
    C-->>A: MultiEntityInvestigationResult<br/>+ Cross-Entity Insights<br/>+ Risk Assessment
    A-->>U: Investigation Complete<br/>+ Entity Results<br/>+ Relationship Analysis
    
    loop Real-time Updates
        L->>W: Investigation Progress
        W-->>U: Live Status Updates
    end
```

## Multi-Entity Search Performance Architecture

```mermaid
graph TB
    subgraph "Query Processing Pipeline"
        A[User Query] --> B[Query Parser]
        B --> C[Syntax Validator]
        C --> D[Query Optimizer]
        D --> E[Execution Planner]
    end

    subgraph "Parallel Search Execution"
        E --> F[Entity Search 1]
        E --> G[Entity Search 2]
        E --> H[Entity Search N]
        F --> I[Index Lookup]
        G --> J[Vector Search]
        H --> K[Graph Traversal]
    end

    subgraph "Result Aggregation"
        I --> L[Result Combiner]
        J --> L
        K --> L
        L --> M[Boolean Logic Processor]
        M --> N[Cross-Entity Ranker]
        N --> O[Result Formatter]
    end

    subgraph "Performance Optimization"
        P[Query Cache] --> B
        Q[Entity Indexes] --> I
        R[Connection Pool] --> J
        S[Memory Pool] --> K
        T[Result Cache] --> O
    end

    P -.-> Q
    Q -.-> R
    R -.-> S
    S -.-> T

    classDef query fill:#e8eaf6
    classDef search fill:#e0f2f1
    classDef result fill:#fff3e0
    classDef perf fill:#fce4ec

    class A,B,C,D,E query
    class F,G,H,I,J,K search
    class L,M,N,O result
    class P,Q,R,S,T perf
```

## Enhanced Entity Relationship Graph

```mermaid
graph TD
    subgraph "Transaction Domain Entities"
        A[TRANSACTION_ID] --> B[EMAIL_IDENTITY]
        B --> C[USER_IDENTITY]
        C --> D[MERCHANT]
        D --> E[AUTHORIZATION]
        A --> F[TIMESTAMP]
        F --> G[EVENT]
    end

    subgraph "Existing Core Entities"
        H[USER] --> I[DEVICE]
        I --> J[LOCATION]
        J --> K[NETWORK]
        K --> L[SESSION]
    end

    subgraph "Cross-Domain Relationships"
        C --> H
        B --> M[EMAIL]
        G --> N[LOGS]
        E --> O[RISK_INDICATOR]
        D --> P[PAYMENT_METHOD]
    end

    subgraph "Boolean Search Operations"
        Q["AND: All conditions must match"] --> R[IntersectionProcessor]
        S["OR: Any condition can match"] --> T[UnionProcessor]
        U["NOT: Exclude matching entities"] --> V[ExclusionProcessor]
        W["XOR: Exactly one condition matches"] --> X[ExclusiveProcessor]
    end

    R --> Y[SearchResultAggregator]
    T --> Y
    V --> Y
    X --> Y

    classDef transaction fill:#e3f2fd
    classDef core fill:#f1f8e9
    classDef cross fill:#fff8e1
    classDef boolean fill:#fce4ec

    class A,B,C,D,E,F,G transaction
    class H,I,J,K,L core
    class C,B,G,E,D,M,N,O,P cross
    class Q,S,U,W,R,T,V,X,Y boolean
```

## Frontend Component Architecture

```mermaid
graph TB
    subgraph "Search Interface Components"
        A[SearchPage] --> B[BooleanSearchBuilder]
        B --> C[EntityTypeSelector]
        B --> D[QuerySyntaxHelper]
        B --> E[OperatorSelector]
        C --> F[TypeAutocomplete]
        D --> G[SyntaxValidator]
        E --> H[LogicBuilder]
    end

    subgraph "Results Display Components"
        A --> I[MultiEntityResults]
        I --> J[EntityGroupView]
        I --> K[RelevanceScoreDisplay]
        I --> L[CrossEntityLinks]
        J --> M[EntityCard]
        M --> N[EntityDetailsPanel]
    end

    subgraph "Query Management"
        A --> O[QueryHistory]
        A --> P[SavedSearches]
        A --> Q[SearchPreferences]
        O --> R[QueryHistoryList]
        P --> S[SearchBookmarks]
    end

    subgraph "Performance Indicators"
        A --> T[SearchMetrics]
        T --> U[ResponseTimeDisplay]
        T --> V[ResultCountIndicator]
        T --> W[CacheHitIndicator]
    end

    classDef interface fill:#e8eaf6
    classDef results fill:#e0f2f1
    classDef management fill:#fff3e0
    classDef metrics fill:#fce4ec

    class A,B,C,D,E,F,G,H interface
    class I,J,K,L,M,N results
    class O,P,Q,R,S management
    class T,U,V,W metrics
```

## Data Flow Architecture

```mermaid
flowchart LR
    subgraph "Data Sources"
        A[(CSV Transaction Data)]
        B[(Existing Entity DB)]
        C[(Investigation Data)]
    end

    subgraph "Entity Processing"
        D[CSVEntityMapper]
        E[EntityValidator]
        F[AttributeExtractor]
    end

    subgraph "Enhanced Entity Store"
        G[(Extended Entity Types)]
        H[(Entity Relationships)]
        I[(Entity Indexes)]
    end

    subgraph "Search Processing"
        J[Boolean Query Parser]
        K[Multi-Entity Search Engine]
        L[Result Aggregator]
    end

    subgraph "API Response"
        M[Search Results]
        N[Performance Metrics]
        O[Query Analysis]
    end

    A --> D
    B --> E
    C --> F
    D --> G
    E --> H
    F --> I
    
    G --> J
    H --> K
    I --> L
    
    J --> M
    K --> N
    L --> O

    classDef source fill:#e3f2fd
    classDef process fill:#f1f8e9
    classDef store fill:#fff8e1
    classDef search fill:#fce4ec
    classDef response fill:#e8f5e8

    class A,B,C source
    class D,E,F process
    class G,H,I store
    class J,K,L search
    class M,N,O response
```

## Implementation Phase Dependencies

```mermaid
gantt
    title Enhanced Entity Search Implementation Timeline
    dateFormat  YYYY-MM-DD
    section Phase 1: Entity Types
    Entity Type Extension    :active, p1a, 2025-01-09, 3d
    Transaction Factory      :p1b, after p1a, 2d
    
    section Phase 2: Boolean Logic
    Boolean Parser          :p2a, after p1b, 3d
    Query Validator         :p2b, after p2a, 2d
    
    section Phase 3: Search Engine
    Multi-Entity Engine     :p3a, after p2b, 4d
    Result Aggregator       :p3b, after p3a, 3d
    
    section Phase 4: API Layer
    Search Endpoints        :p4a, after p3b, 2d
    API Models              :p4b, after p4a, 1d
    
    section Phase 5: Frontend
    Search Components       :p5a, after p4b, 4d
    Query Builder UI        :p5b, after p5a, 3d
    
    section Phase 6: Testing
    Backend Tests           :p6a, after p5b, 3d
    Frontend Tests          :p6b, after p6a, 2d
    Integration Tests       :p6c, after p6b, 2d
    
    section Phase 7: Optimization
    Performance Tuning      :p7a, after p6c, 2d
    Caching Implementation  :p7b, after p7a, 1d
    
    section Phase 8: Deployment
    Documentation           :p8a, after p7b, 1d
    Production Deploy       :p8b, after p8a, 1d
```

This architectural diagram provides a comprehensive visual representation of the enhanced entity search system, showing the relationships between components, data flow patterns, and implementation dependencies. The diagrams support the detailed implementation plan and provide clear guidance for the development team during implementation.