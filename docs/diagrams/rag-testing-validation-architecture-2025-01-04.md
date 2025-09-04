# RAG Testing and Validation Architecture Diagram

**Date**: 2025-01-04  
**Project**: Olorin Fraud Detection Platform  
**Plan Reference**: [/docs/plans/2025-01-04-rag-testing-validation-implementation-plan.md](/docs/plans/2025-01-04-rag-testing-validation-implementation-plan.md)

## RAG Testing Architecture Flow

```mermaid
graph TB
    %% Test Infrastructure Layer
    subgraph TestInfra["🧪 Test Infrastructure Layer"]
        UnitTests["📋 Unit Tests<br/>test_rag_enhanced_agent.py<br/>19 tests (11✅ 8❌)"]
        IntegrationTests["🔗 Integration Tests<br/>test_rag_tool_integration.py<br/>Component integration"]
        E2ETests["🌐 E2E Tests<br/>test_autonomous_investigation.py<br/>Full workflow validation"]
        Fixtures["⚙️ Test Fixtures<br/>conftest.py<br/>real_investigation_context"]
    end

    %% RAG Foundation Testing
    subgraph RAGFoundation["🧠 RAG Foundation Testing"]
        ContextAugTest["📝 Context Augmentor Test<br/>Knowledge retrieval<br/>Target: <500ms"]
        RetrievalTest["🔍 Retrieval Engine Test<br/>Vector search accuracy<br/>Target: <50ms"]
        OrchestratorTest["🎼 RAG Orchestrator Test<br/>End-to-end pipeline<br/>Target: <1s"]
        KnowledgeTest["📚 Knowledge Base Test<br/>Document access<br/>Target: <100ms"]
    end

    %% Domain Agent Testing
    subgraph DomainAgents["🕵️ Domain Agent RAG Testing"]
        NetworkAgent["🌐 Network Agent<br/>IP reputation<br/>Network patterns"]
        DeviceAgent["📱 Device Agent<br/>Device fingerprinting<br/>Behavioral analysis"]  
        LocationAgent["📍 Location Agent<br/>Geolocation analysis<br/>Travel patterns"]
        LogsAgent["📄 Logs Agent<br/>Log pattern analysis<br/>Anomaly detection"]
        RiskAgent["⚠️ Risk Agent<br/>Risk aggregation<br/>Scoring enhancement"]
    end

    %% Tools Integration Testing
    subgraph ToolsIntegration["🔧 Tools Integration Testing"]
        ToolRecommender["🎯 Tool Recommender<br/>Context-aware selection<br/>Target: <30ms"]
        ToolSelection["⚡ Tool Selection<br/>Strategy coordination<br/>Target: <50ms"]
        ContextInjection["💉 Context Injection<br/>Context preparation<br/>Target: <30ms"]
        ResultAugmentation["✨ Result Augmentation<br/>Knowledge enhancement<br/>Target: <30ms"]
    end

    %% End-to-End Testing
    subgraph E2ETesting["🏁 End-to-End Testing"]
        FullInvestigation["🔬 Full Investigation<br/>Complete RAG workflow<br/>Target: <5 minutes"]
        Comparison["⚖️ RAG vs Non-RAG<br/>A/B testing comparison<br/>Statistical validation"]
        WebSocketTest["📡 WebSocket Testing<br/>Real-time updates<br/>RAG status events"]
        JourneyTracking["🗺️ Journey Tracking<br/>RAG metrics collection<br/>Audit trail"]
    end

    %% Performance Monitoring
    subgraph Monitoring["📊 Performance Monitoring"]
        RetrievalMetrics["⏱️ Retrieval Metrics<br/><500ms knowledge<br/><50ms tool context"]
        QualityMetrics["📈 Quality Metrics<br/>Relevance scores<br/>Enhancement quality"]
        FallbackTest["🛡️ Fallback Testing<br/>Graceful degradation<br/><100ms detection"]
    end

    %% Test Flow Connections
    TestInfra --> RAGFoundation
    RAGFoundation --> DomainAgents
    DomainAgents --> ToolsIntegration
    ToolsIntegration --> E2ETesting
    E2ETesting --> Monitoring

    %% Component Interactions
    UnitTests -.-> ContextAugTest
    UnitTests -.-> RetrievalTest
    UnitTests -.-> OrchestratorTest
    UnitTests -.-> KnowledgeTest

    IntegrationTests -.-> NetworkAgent
    IntegrationTests -.-> DeviceAgent
    IntegrationTests -.-> LocationAgent
    IntegrationTests -.-> LogsAgent
    IntegrationTests -.-> RiskAgent

    E2ETests -.-> FullInvestigation
    E2ETests -.-> Comparison
    E2ETests -.-> WebSocketTest
    E2ETests -.-> JourneyTracking

    %% Monitoring Connections
    RAGFoundation --> RetrievalMetrics
    DomainAgents --> QualityMetrics
    ToolsIntegration --> RetrievalMetrics
    E2ETesting --> FallbackTest

    %% Styling
    classDef testLayer fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef ragLayer fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef agentLayer fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef toolLayer fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef e2eLayer fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef monitorLayer fill:#f1f8e9,stroke:#33691e,stroke-width:2px

    class UnitTests,IntegrationTests,E2ETests,Fixtures testLayer
    class ContextAugTest,RetrievalTest,OrchestratorTest,KnowledgeTest ragLayer
    class NetworkAgent,DeviceAgent,LocationAgent,LogsAgent,RiskAgent agentLayer
    class ToolRecommender,ToolSelection,ContextInjection,ResultAugmentation toolLayer
    class FullInvestigation,Comparison,WebSocketTest,JourneyTracking e2eLayer
    class RetrievalMetrics,QualityMetrics,FallbackTest monitorLayer
```

## Testing Phase Dependencies

```mermaid
gantt
    title RAG Testing Implementation Timeline
    dateFormat  X
    axisFormat  %s

    section Phase 1: Fix Tests
    Fix EntityType Issues    :active, p1-1, 0, 15
    Fix Import Dependencies  :p1-2, after p1-1, 10
    Mock Setup Validation    :p1-3, after p1-2, 5

    section Phase 2: RAG Foundation
    Context Augmentor Test   :p2-1, after p1-3, 15
    Retrieval Engine Test    :p2-2, after p1-3, 15
    Orchestrator Test        :p2-3, after p2-1, 10
    Knowledge Base Test      :p2-4, after p2-2, 5

    section Phase 3: Domain Agents
    Network Agent Test       :p3-1, after p2-3, 12
    Device Agent Test        :p3-2, after p2-4, 12
    Location Agent Test      :p3-3, after p3-1, 12
    Logs Agent Test          :p3-4, after p3-2, 12
    Risk Agent Test          :p3-5, after p3-3, 12
    Fallback Testing         :p3-6, after p3-4, 8

    section Phase 4: Tools Integration
    Tool Recommender Test    :p4-1, after p2-3, 15
    Tool Selection Test      :p4-2, after p4-1, 10
    Context Injection Test   :p4-3, after p4-2, 10
    Result Augmentation Test :p4-4, after p4-3, 10

    section Phase 5: E2E Testing
    Full Investigation Test  :p5-1, after p3-6, 30
    RAG vs Non-RAG Compare   :p5-2, after p5-1, 25
    WebSocket Testing        :p5-3, after p4-4, 15
    Journey Tracking Test    :p5-4, after p5-2, 20
```

## Performance Target Architecture

```mermaid
graph LR
    %% Performance Targets
    subgraph PerformanceTargets["🎯 Performance Targets"]
        KnowledgeRetrieval["📚 Knowledge Retrieval<br/>Target: <500ms<br/>Current: TBD"]
        ToolContext["🔧 Tool Context<br/>Target: <50ms<br/>Current: TBD"]
        ResultAugment["✨ Result Augmentation<br/>Target: <30ms<br/>Current: TBD"]
        Investigation["🔬 Full Investigation<br/>Target: <5 minutes<br/>Current: TBD"]
        FallbackDetect["🛡️ Fallback Detection<br/>Target: <100ms<br/>Current: TBD"]
    end

    %% Quality Metrics
    subgraph QualityMetrics["📊 Quality Metrics"]
        RelevanceScore["🎯 Relevance Score<br/>Target: ≥0.8<br/>Current: TBD"]
        RecommendAccuracy["🎪 Recommendation Accuracy<br/>Target: ≥0.9<br/>Current: TBD"]
        Enhancement["📈 Enhancement Quality<br/>Target: Significant<br/>Current: TBD"]
        Coverage["🌐 Test Coverage<br/>Target: 100%<br/>Current: 58%"]
    end

    %% Monitoring Flow
    KnowledgeRetrieval --> RelevanceScore
    ToolContext --> RecommendAccuracy  
    ResultAugment --> Enhancement
    Investigation --> Coverage
    FallbackDetect --> Coverage

    %% Styling
    classDef performance fill:#e3f2fd,stroke:#0277bd,stroke-width:2px
    classDef quality fill:#f1f8e9,stroke:#558b2f,stroke-width:2px

    class KnowledgeRetrieval,ToolContext,ResultAugment,Investigation,FallbackDetect performance
    class RelevanceScore,RecommendAccuracy,Enhancement,Coverage quality
```

## Test Data Flow Architecture

```mermaid
sequenceDiagram
    participant TF as Test Framework
    participant RA as RAG Agent
    participant RO as RAG Orchestrator  
    participant CA as Context Augmentor
    participant KB as Knowledge Base
    participant RE as Retrieval Engine
    participant TR as Tool Recommender
    participant MA as Monitoring Agent

    Note over TF,MA: RAG Testing Validation Flow

    %% Phase 1: Foundation Testing
    TF->>RA: Initialize RAG Agent
    RA->>RO: Setup RAG Orchestrator
    RO->>CA: Initialize Context Augmentor
    RO->>KB: Connect Knowledge Base
    RO->>RE: Setup Retrieval Engine
    
    %% Phase 2: Component Testing
    TF->>CA: Test Context Augmentation (<500ms)
    CA->>KB: Retrieve Knowledge
    KB-->>CA: Return Context Data
    CA-->>TF: Augmented Context
    
    TF->>RE: Test Retrieval Engine (<50ms)
    RE->>KB: Vector Search Query
    KB-->>RE: Search Results
    RE-->>TF: Ranked Results
    
    %% Phase 3: Tool Integration Testing
    TF->>TR: Test Tool Recommendation (<30ms)
    TR->>RO: Request Tool Context
    RO->>CA: Get Context for Tools
    CA-->>RO: Tool Context
    RO-->>TR: Context Data
    TR-->>TF: Recommended Tools
    
    %% Phase 4: End-to-End Testing
    TF->>RA: Full Investigation Test
    RA->>RO: Start RAG-Enhanced Investigation
    
    loop Domain Analysis
        RO->>CA: Get Domain Context
        CA->>KB: Domain Knowledge Query
        KB-->>CA: Domain Data
        CA-->>RO: Enhanced Context
        RO->>TR: Get Domain Tools
        TR-->>RO: Optimal Tools
    end
    
    RO-->>RA: Investigation Results
    RA-->>TF: Complete Analysis
    
    %% Phase 5: Performance Monitoring
    MA->>TF: Collect Performance Metrics
    MA->>RO: RAG Performance Stats
    MA->>TR: Tool Performance Stats
    MA-->>TF: Performance Report
```