# Structured Investigation Workflow Flow Diagram

```mermaid
graph TB
    %% Frontend Layer
    subgraph "Frontend (olorin-front)"
        A[Investigation Trigger] --> B[StructuredInvestigationClient]
        B --> C[REST API Call: /api/v1/agent/start/{entity_id}]
        B --> D[WebSocket Connection: /ws/{investigation_id}]
    end

    %% Backend API Layer
    subgraph "Backend API (olorin-server)"
        C --> E[agent_router.py: astart_investigation]
        E --> F[Construct AgentContext]
        F --> G[Call agent_service.ainvoke_agent]
    end

    %% Agent Service Layer
    subgraph "Agent Service"
        G --> H[Select Graph: Parallel/Sequential]
        H --> I[LangGraph Execution]
        I --> J[Graph State: MessagesState]
    end

    %% Structured Agents Layer
    subgraph "Structured Agents"
        J --> K[Network Agent]
        J --> L[Location Agent]
        J --> M[Device Agent]
        J --> N[Logs Agent]
        J --> O[Risk Agent]
    end

    %% LLM Integration Layer
    subgraph "LLM Integration (Claude Opus 4.1)"
        K --> P[structured_llm: ChatAnthropic]
        L --> P
        M --> P
        N --> P
        O --> Q[structured_llm: Risk Analysis]
        P --> R[Tool Selection & Execution]
        Q --> S[Risk Score Calculation]
    end

    %% Tool Execution Layer
    subgraph "Real Service Calls"
        R --> T[NetworkAnalysisService]
        R --> U[LocationAnalysisService]
        R --> V[DeviceAnalysisService]
        R --> W[LogsAnalysisService]
        S --> X[RiskAssessmentAnalysisService]
    end

    %% External APIs
    subgraph "External APIs"
        T --> Y[Splunk API]
        U --> Z[Location Services]
        V --> AA[Device Fingerprinting]
        W --> BB[Log Aggregation]
    end

    %% WebSocket Communication
    subgraph "Real-time Updates"
        I --> CC[WebSocketManager]
        CC --> DD[Progress Updates]
        CC --> EE[Phase Completion]
        CC --> FF[Final Results]
        DD --> D
        EE --> D
        FF --> D
    end

    %% Response Flow
    subgraph "Response Processing"
        FF --> GG[Investigation Results]
        GG --> HH[Frontend Processing]
        HH --> II[UI Updates]
        HH --> JJ[Results Display]
    end

    %% Styling
    classDef frontend fill:#e1f5fe
    classDef backend fill:#f3e5f5
    classDef llm fill:#fff3e0
    classDef services fill:#e8f5e8
    classDef external fill:#ffebee
    classDef websocket fill:#fce4ec

    class A,B,C,D frontend
    class E,F,G,H,I,J backend
    class K,L,M,N,O,P,Q,R,S llm
    class T,U,V,W,X services
    class Y,Z,AA,BB external
    class CC,DD,EE,FF websocket
```

## Key Validation Points

### 1. Frontend Trigger
- **File**: `/olorin-front/src/js/services/StructuredInvestigationClient.ts`
- **API Call**: `POST /api/v1/agent/start/{entity_id}?entity_type={type}`
- **Headers**: Authorization, Content-Type, olorin_tid, etc.

### 2. Backend Processing
- **Router**: `/olorin-server/app/router/agent_router.py:astart_investigation`
- **Service**: `/olorin-server/app/service/agent_service.py:ainvoke_agent`
- **Context**: AgentContext with metadata and headers

### 3. LangGraph Execution
- **Graph Selection**: Parallel vs Sequential based on investigation settings
- **State Management**: MessagesState with HumanMessage input
- **Agent Coordination**: Each domain agent runs structuredly

### 4. Structured LLM Usage
- **Model**: Claude Opus 4.1 (`claude-opus-4-1-20250805`)
- **Configuration**: Temperature 0.1, 8090 max tokens, 90s timeout
- **Tool Binding**: Real tools bound to LLM with `bind_tools(tools, strict=True)`
- **Decision Making**: LLM selects tools and analysis approaches structuredly

### 5. Real Service Integration
- **Network**: NetworkAnalysisService → Splunk API calls
- **Location**: LocationAnalysisService → Geographic validation services
- **Device**: DeviceAnalysisService → Device fingerprinting APIs
- **Logs**: LogsAnalysisService → Log aggregation systems
- **Risk**: RiskAssessmentAnalysisService → Risk calculation algorithms

### 6. WebSocket Real-time Updates
- **Manager**: WebSocketManager handles connections per investigation_id
- **Updates**: Phase progress, agent responses, completion status
- **Bidirectional**: Frontend can send control messages (pause/resume/cancel)

### 7. Response Validation
- **Unique IDs**: Investigation IDs, trace IDs, timestamps
- **Natural Variation**: LLM responses vary across runs
- **Real Data**: No mock data indicators in responses
- **Error Handling**: Proper error propagation and retry logic

## Critical Flow Characteristics

1. **End-to-End Real APIs**: From frontend fetch() to external service APIs
2. **LLM-Driven Decisions**: Claude Opus 4.1 makes structured tool selections
3. **Real-time Communication**: WebSocket streaming of progress and results
4. **Stateful Investigation**: Persistent investigation context across agents
5. **Error Recovery**: Robust error handling and retry mechanisms
6. **Parallel Execution**: Concurrent agent execution with coordination