# RAG-Agent Integration Architecture Diagram

**Associated Plan**: [2025-01-04-rag-agent-integration-implementation-plan.md](/docs/plans/2025-01-04-rag-agent-integration-implementation-plan.md)  
**Date**: 2025-01-04  
**Author**: Gil Klainert

## System Architecture Overview

```mermaid
graph TB
    %% Investigation Request Flow
    subgraph "Investigation Request"
        IR[Investigation Request] --> AF[Agent Factory]
    end
    
    %% RAG System Components
    subgraph "RAG System"
        RO[RAG Orchestrator] --> KB[Knowledge Base]
        RO --> RE[Retrieval Engine]
        RO --> CA[Context Augmentor]
        KB --> DC[Document Chunks]
        KB --> DM[Document Metadata]
        RE --> VS[Vector Search]
        RE --> SS[Semantic Search]
        CA --> KF[Knowledge Filtering]
        CA --> CI[Context Injection]
    end
    
    %% Enhanced Agent Architecture
    subgraph "Enhanced Agent System"
        AF --> REIA[RAG-Enhanced Investigation Agent]
        REIA --> AIA[StructuredInvestigationAgent Base]
        REIA --> RO
        
        %% Domain Agents
        REIA --> NA[Network Agent]
        REIA --> DA[Device Agent]
        REIA --> LA[Location Agent]
        REIA --> LogA[Logs Agent]
        REIA --> RA[Risk Agent]
    end
    
    %% Tool Integration
    subgraph "Enhanced Tool System"
        TR[Tool Recommender] --> RO
        TR --> TS[Tool Selector]
        TS --> TE[Tool Executor]
        TE --> RP[Result Processor]
        RP --> RO
    end
    
    %% Knowledge Flow
    subgraph "Knowledge Enhancement Flow"
        IR --> RO
        RO --> KC[Knowledge Context]
        KC --> REIA
        REIA --> ED[Enhanced Decisions]
        ED --> AR[Augmented Results]
    end
    
    %% Monitoring & Integration
    subgraph "System Integration"
        REIA --> JT[Journey Tracker]
        REIA --> UL[Unified Logging]
        REIA --> PM[Performance Metrics]
        RO --> RM[RAG Metrics]
    end
    
    %% Data Flow Connections
    NA --> TR
    DA --> TR
    LA --> TR
    LogA --> TR
    RA --> TR
    
    %% Response Flow
    AR --> OF[Output Formatter]
    OF --> FR[Final Response]
    
    %% Styling
    classDef ragComponent fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef agentComponent fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef toolComponent fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    classDef integrationComponent fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    
    class RO,KB,RE,CA,DC,DM,VS,SS,KF,CI ragComponent
    class AF,REIA,AIA,NA,DA,LA,LogA,RA agentComponent
    class TR,TS,TE,RP toolComponent
    class JT,UL,PM,RM integrationComponent
```

## RAG Integration Data Flow

```mermaid
sequenceDiagram
    participant Client as Investigation Client
    participant AF as Agent Factory
    participant REIA as RAG-Enhanced Agent
    participant RO as RAG Orchestrator
    participant KB as Knowledge Base
    participant Tools as Tool System
    participant Results as Results Processor
    
    Client->>AF: Investigation Request
    AF->>REIA: Create Agent Instance
    REIA->>RO: Request Knowledge Context
    RO->>KB: Query Relevant Knowledge
    KB-->>RO: Return Knowledge Chunks
    RO-->>REIA: Enhanced Context
    
    REIA->>REIA: Process with Context
    REIA->>Tools: Select Enhanced Tools
    Tools->>RO: Request Tool Context
    RO-->>Tools: Tool-Specific Knowledge
    Tools-->>REIA: Enhanced Tool Results
    
    REIA->>Results: Process Final Results
    Results->>RO: Augment with Knowledge
    RO-->>Results: Enhanced Interpretation
    Results-->>Client: Augmented Response
    
    %% Parallel logging and metrics
    REIA->>JT: Log Journey Events
    RO->>Metrics: Record RAG Metrics
```

## Component Integration Architecture

```mermaid
graph LR
    %% Existing System
    subgraph "Existing Olorin System"
        ES[Existing Services]
        EA[Existing Agents]
        ET[Existing Tools]
    end
    
    %% RAG Integration Layer
    subgraph "RAG Integration Layer"
        RL[RAG Orchestrator]
        KB[Knowledge Base]
        CA[Context Augmentor]
        RE[Retrieval Engine]
    end
    
    %% Enhanced System
    subgraph "Enhanced System"
        REA[RAG-Enhanced Agents]
        RET[RAG-Enhanced Tools]
        RER[RAG-Enhanced Results]
    end
    
    %% Integration Connections
    ES --> REA
    EA --> REA
    ET --> RET
    
    RL --> REA
    RL --> RET
    RL --> RER
    
    KB --> RL
    CA --> RL
    RE --> RL
    
    REA --> RER
    RET --> RER
    
    %% Backward Compatibility
    ES -.-> EA
    EA -.-> ET
    ET -.-> Results[Original Results]
    
    %% Styling
    classDef existing fill:#ffebee,stroke:#d32f2f,stroke-width:2px
    classDef rag fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef enhanced fill:#e8f5e8,stroke:#4caf50,stroke-width:2px
    classDef compatibility fill:#f3e5f5,stroke:#9c27b0,stroke-width:1px,stroke-dasharray: 5 5
    
    class ES,EA,ET existing
    class RL,KB,CA,RE rag
    class REA,RET,RER enhanced
    class Results compatibility
```

## Phase Implementation Flow

```mermaid
gantt
    title RAG-Agent Integration Implementation Timeline
    dateFormat  YYYY-MM-DD
    section Phase 1: Analysis
    Codebase Analysis           :done, p1a, 2025-01-04, 1d
    Integration Points          :done, p1b, 2025-01-04, 1d
    Implementation Plan         :done, p1c, 2025-01-04, 1d
    
    section Phase 2: Foundation
    Context Augmentor           :p2a, 2025-01-05, 2d
    Retrieval Engine           :p2b, after p2a, 2d
    Enhanced Agent Base        :p2c, after p2a, 3d
    Agent Factory Update       :p2d, after p2c, 1d
    
    section Phase 3: Domain Integration
    Network Agent Enhancement  :p3a, after p2d, 2d
    Device Agent Enhancement   :p3b, after p3a, 2d
    Location Agent Enhancement :p3c, after p3b, 2d
    Logs Agent Enhancement     :p3d, after p3c, 2d
    Risk Agent Enhancement     :p3e, after p3d, 2d
    
    section Phase 4: Tools Integration
    Tool Recommender          :p4a, after p3e, 2d
    Enhanced Tool Selection   :p4b, after p4a, 2d
    Tool Context Enhancement  :p4c, after p4b, 2d
    Results Enhancement       :p4d, after p4c, 1d
    
    section Phase 5: Testing
    Unit Test Suite           :p5a, after p4d, 3d
    Integration Tests         :p5b, after p5a, 3d
    Performance Testing       :p5c, after p5b, 2d
    Validation Testing        :p5d, after p5c, 2d
    
    section Phase 6: Production
    Documentation            :p6a, after p5d, 2d
    Production Deployment    :p6b, after p6a, 3d
    Monitoring Setup         :p6c, after p6b, 2d
```

## Knowledge Base Integration Architecture

```mermaid
erDiagram
    KNOWLEDGE_BASE ||--o{ DOCUMENT_CHUNKS : contains
    DOCUMENT_CHUNKS ||--o{ VECTOR_EMBEDDINGS : has
    KNOWLEDGE_BASE ||--o{ DOCUMENT_METADATA : manages
    
    RAG_ORCHESTRATOR ||--|| KNOWLEDGE_BASE : queries
    RAG_ORCHESTRATOR ||--|| CONTEXT_AUGMENTOR : uses
    RAG_ORCHESTRATOR ||--|| RETRIEVAL_ENGINE : uses
    
    DOMAIN_AGENTS ||--o{ RAG_REQUESTS : creates
    RAG_REQUESTS ||--|| RAG_ORCHESTRATOR : processed_by
    RAG_ORCHESTRATOR ||--o{ RAG_RESPONSES : generates
    RAG_RESPONSES ||--|| DOMAIN_AGENTS : consumed_by
    
    KNOWLEDGE_BASE {
        string id PK
        string name
        string description
        datetime created_at
        datetime updated_at
        json config
    }
    
    DOCUMENT_CHUNKS {
        string id PK
        string kb_id FK
        string content
        json metadata
        int chunk_index
        datetime created_at
    }
    
    VECTOR_EMBEDDINGS {
        string id PK
        string chunk_id FK
        blob embedding_vector
        string model_name
        datetime created_at
    }
    
    DOCUMENT_METADATA {
        string id PK
        string kb_id FK
        string filename
        string file_type
        json properties
        datetime indexed_at
    }
    
    RAG_REQUESTS {
        string id PK
        string agent_id
        string investigation_id
        string query
        json context
        datetime created_at
    }
    
    RAG_RESPONSES {
        string id PK
        string request_id FK
        json knowledge_chunks
        float relevance_score
        json metadata
        datetime created_at
    }
```

---

**Diagram Status**: Complete  
**Associated Plan**: [RAG-Agent Integration Implementation Plan](/docs/plans/2025-01-04-rag-agent-integration-implementation-plan.md)  
**Last Updated**: 2025-01-04 by Gil Klainert