# OLORIN MCP Architecture Documentation

## Table of Contents
1. [System Overview](#1-system-overview)
2. [MCP Integration Architecture](#2-mcp-integration-architecture)
3. [Authentication & Security](#3-authentication--security)
4. [Tool Ecosystem](#4-tool-ecosystem)
5. [Environment Configuration](#5-environment-configuration)
6. [API Specifications](#6-api-specifications)
7. [Data Flow & Processing](#7-data-flow--processing)
8. [Deployment Architecture](#8-deployment-architecture)

---

## 1. System Overview

### 1.1 High-Level Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[Web UI/Client]
        CLI[CLI Tools]
    end
    
    subgraph "API Gateway Layer"
        FastAPI[FastAPI Application<br/>Port 8000]
        Router[MCP Router<br/>/mcp/*]
    end
    
    subgraph "MCP Protocol Layer"
        MCPServer[MCP Server<br/>Port 3000]
        MCPBridge[MCP Bridge<br/>HTTP Client]
    end
    
    subgraph "Tool Execution Layer"
        OlorinTools[Olorin Tools]
        LangChainTools[LangChain Tools]
        PromptEngine[Prompt Engine]
    end
    
    subgraph "External Services"
        Splunk[Splunk<br/>Log Analysis]
        OII[OII Service<br/>Identity Lookup]
        Chronos[Chronos<br/>Device Analysis]
        VectorDB[Vector Search<br/>Semantic Analysis]
        Tavily[Tavily API<br/>Web Search]
        IDPS[IDPS<br/>Secret Management]
    end
    
    UI --> FastAPI
    CLI --> FastAPI
    FastAPI --> Router
    Router --> MCPBridge
    MCPBridge --> MCPServer
    MCPServer --> OlorinTools
    MCPServer --> LangChainTools
    MCPServer --> PromptEngine
    
    OlorinTools --> Splunk
    OlorinTools --> OII
    OlorinTools --> Chronos
    OlorinTools --> VectorDB
    LangChainTools --> Tavily
    
    FastAPI --> IDPS
    OlorinTools --> IDPS
    
    style FastAPI fill:#e1f5fe
    style MCPServer fill:#f3e5f5
    style OlorinTools fill:#e8f5e8
    style IDPS fill:#fff3e0
```

### 1.2 Component Responsibilities

```mermaid
graph LR
    subgraph "API Layer"
        A1[FastAPI Application]
        A2[MCP Router]
        A3[Authentication Middleware]
    end
    
    subgraph "Protocol Layer"
        B1[MCP Server]
        B2[Tool Registry]
        B3[Prompt Manager]
    end
    
    subgraph "Execution Layer"
        C1[Fraud Investigation Tools]
        C2[Search & Analysis Tools]
        C3[Automation Tools]
    end
    
    A1 --> |HTTP Requests| A2
    A2 --> |MCP Protocol| B1
    B1 --> |Tool Execution| C1
    B1 --> |Tool Execution| C2
    B1 --> |Tool Execution| C3
    
    A1 -.-> |Secret Retrieval| A3
    C1 -.-> |Authentication| A3
```

---

## 2. MCP Integration Architecture

### 2.1 MCP Protocol Flow

```mermaid
sequenceDiagram
    participant Client
    participant FastAPI
    participant MCPRouter
    participant MCPBridge
    participant MCPServer
    participant Tools
    
    Client->>FastAPI: HTTP Request
    FastAPI->>MCPRouter: Route to /mcp/*
    MCPRouter->>MCPBridge: Create Bridge Instance
    MCPBridge->>MCPServer: HTTP Call (Port 3000)
    MCPServer->>Tools: Execute Tool/Prompt
    Tools-->>MCPServer: Tool Result
    MCPServer-->>MCPBridge: JSON Response
    MCPBridge-->>MCPRouter: Parsed Result
    MCPRouter-->>FastAPI: Structured Response
    FastAPI-->>Client: HTTP Response
```

### 2.2 MCP Server Internal Architecture

```mermaid
graph TB
    subgraph "MCP Server (Port 3000)"
        subgraph "HTTP Endpoints"
            Health[/health]
            Status[/resources/olorin/status]
            Tools[/resources/olorin/tools]
            ToolCall[/tools/call]
            Prompts[/prompts]
            CustomPrompt[/prompts/custom]
            Templates[/prompts/templates/*]
        end
        
        subgraph "Tool Management"
            ToolRegistry[Tool Registry]
            OlorinToolsInit[Olorin Tools Initializer]
            LangChainInit[LangChain Tools Initializer]
        end
        
        subgraph "Prompt Management"
            PromptEngine[Prompt Engine]
            TemplateManager[Template Manager]
            CustomPrompts[Custom Prompt Executor]
        end
        
        subgraph "Authentication"
            AuthContext[Auth Context Creator]
            TokenManager[Token Manager]
            IDPSClient[IDPS Client]
        end
    end
    
    Health --> ToolRegistry
    Status --> ToolRegistry
    Tools --> ToolRegistry
    ToolCall --> ToolRegistry
    
    Prompts --> PromptEngine
    CustomPrompt --> CustomPrompts
    Templates --> TemplateManager
    
    ToolRegistry --> OlorinToolsInit
    ToolRegistry --> LangChainInit
    
    OlorinToolsInit --> AuthContext
    AuthContext --> TokenManager
    TokenManager --> IDPSClient
    
    style ToolRegistry fill:#e8f5e8
    style PromptEngine fill:#f3e5f5
    style AuthContext fill:#fff3e0
```

### 2.3 FastAPI Router Bridge Architecture

```mermaid
graph TB
    subgraph "FastAPI Router (/mcp)"
        subgraph "Endpoints"
            Status[GET /status]
            ToolsList[GET /tools]
            Categories[GET /tools/categories]
            Execute[POST /tools/{name}/execute]
            PromptsList[GET /prompts]
            PromptExec[POST /prompts/{name}/execute]
            Health[GET /health]
        end
        
        subgraph "Bridge Layer"
            MCPBridge[MCP Bridge Class]
            HTTPClient[HTTP Client Pool]
            ResponseParser[Response Parser]
            ErrorHandler[Error Handler]
        end
        
        subgraph "Models"
            ToolInfo[Tool Info Model]
            ToolCategory[Tool Category Model]
            ToolResponse[Tool Response Model]
            PromptResponse[Prompt Response Model]
        end
    end
    
    Status --> MCPBridge
    ToolsList --> MCPBridge
    Categories --> MCPBridge
    Execute --> MCPBridge
    PromptsList --> MCPBridge
    PromptExec --> MCPBridge
    Health --> MCPBridge
    
    MCPBridge --> HTTPClient
    MCPBridge --> ResponseParser
    MCPBridge --> ErrorHandler
    
    ResponseParser --> ToolInfo
    ResponseParser --> ToolCategory
    ResponseParser --> ToolResponse
    ResponseParser --> PromptResponse
    
    style MCPBridge fill:#e1f5fe
    style HTTPClient fill:#f3e5f5
```

---

## 3. Authentication & Security

### 3.1 IDPS Integration Flow

```mermaid
sequenceDiagram
    participant Tool
    participant AuthContext
    participant IDPSClient
    participant IDPS
    participant ExternalService
    
    Tool->>AuthContext: Request Credentials
    AuthContext->>IDPSClient: get_app_secret(secret_path)
    IDPSClient->>IDPS: Authenticate & Retrieve Secret
    IDPS-->>IDPSClient: Secret Value
    IDPSClient-->>AuthContext: Decrypted Secret
    AuthContext-->>Tool: Credentials
    Tool->>ExternalService: Authenticated Request
    ExternalService-->>Tool: Service Response
```

### 3.2 Secret Management Architecture

```mermaid
graph TB
    subgraph "IDPS Secret Store"
        subgraph "Environment Specific"
            E2E_IDPS[vkm-e2e.ps.idps.a.intuit.com]
            PRD_IDPS[vkm.ps.idps.a.intuit.com]
        end
        
        subgraph "Secret Paths"
            AppSecret[olorin/app_secret]
            SplunkUser[olorin/splunk_username]
            SplunkPass[olorin/splunk_password]
            TavilyKey[olorin/TAVILY_API_KEY]
            ChronosGhost[olorin/chronos_ghost]
            DIFraud[olorin/di_fraudlistclient]
            DITest[olorin/di_testclient]
            LangfusePub[olorin/langfuse/public_key]
            LangfuseSec[olorin/langfuse/secret_key]
        end
    end
    
    subgraph "Application Layer"
        ConfigManager[Config Manager]
        IDPSUtils[IDPS Utils]
        ToolAuth[Tool Authentication]
    end
    
    subgraph "Tools Requiring Auth"
        SplunkTool[Splunk Tool]
        ChronosTool[Chronos Tool]
        DITool[DI Tool]
        TavilyTool[Tavily Tool]
    end
    
    E2E_IDPS --> AppSecret
    E2E_IDPS --> SplunkUser
    E2E_IDPS --> SplunkPass
    E2E_IDPS --> TavilyKey
    E2E_IDPS --> ChronosGhost
    E2E_IDPS --> DIFraud
    E2E_IDPS --> DITest
    E2E_IDPS --> LangfusePub
    E2E_IDPS --> LangfuseSec
    
    ConfigManager --> IDPSUtils
    IDPSUtils --> ToolAuth
    
    ToolAuth --> SplunkTool
    ToolAuth --> ChronosTool
    ToolAuth --> DITool
    ToolAuth --> TavilyTool
    
    style E2E_IDPS fill:#fff3e0
    style IDPSUtils fill:#e8f5e8
    style ToolAuth fill:#f3e5f5
```

### 3.3 Environment-Specific Authentication

```mermaid
graph LR
    subgraph "Local Development"
        LocalEnv[Environment Variables]
        LocalOverride[Direct Credential Override]
    end
    
    subgraph "Pre-Production (QAL/E2E/PRF)"
        PreProdIDPS[vkm-e2e.ps.idps.a.intuit.com]
        PreProdPolicy[p-2abqgwqm8n5i]
    end
    
    subgraph "Production (STG/PRD)"
        ProdIDPS[vkm.ps.idps.a.intuit.com]
        ProdPolicy[Production Policy ID]
    end
    
    LocalEnv --> LocalOverride
    PreProdIDPS --> PreProdPolicy
    ProdIDPS --> ProdPolicy
    
    LocalOverride -.-> |Fallback| PreProdIDPS
    
    style LocalEnv fill:#e8f5e8
    style PreProdIDPS fill:#fff3e0
    style ProdIDPS fill:#ffebee
```

---

## 4. Tool Ecosystem

### 4.1 Tool Classification & Categories

```mermaid
graph TB
    subgraph "Olorin Tools (Fraud Detection)"
        subgraph "Fraud Investigation"
            Splunk[Splunk Query Tool<br/>Log Analysis & Pattern Detection]
            OII[OII Tool<br/>Identity Information Lookup]
        end
        
        subgraph "Data Analysis"
            Chronos[Chronos Tool<br/>Device & Temporal Analysis]
            Vector[Vector Search Tool<br/>Semantic Similarity Search]
        end
    end
    
    subgraph "LangChain Tools (General Purpose)"
        subgraph "Search & Analysis"
            Tavily[Tavily Search<br/>Advanced Web Search]
            DDG[DuckDuckGo Search<br/>Web Search]
            ArXiv[ArXiv Search<br/>Academic Papers]
        end
        
        subgraph "Automation"
            PythonREPL[Python REPL<br/>Code Execution]
            ReadFile[Read File<br/>File Operations]
            WriteFile[Write File<br/>File Operations]
            ListDir[List Directory<br/>File System]
        end
    end
    
    style Splunk fill:#ffcdd2
    style OII fill:#ffcdd2
    style Chronos fill:#c8e6c9
    style Vector fill:#c8e6c9
    style Tavily fill:#bbdefb
    style PythonREPL fill:#f8bbd9
```

### 4.2 Tool Execution Flow

```mermaid
sequenceDiagram
    participant Client
    participant MCPServer
    participant ToolRegistry
    participant AuthContext
    participant IDPS
    participant Tool
    participant ExternalAPI
    
    Client->>MCPServer: POST /tools/call
    MCPServer->>ToolRegistry: Get Tool Instance
    ToolRegistry->>AuthContext: Create Auth Context
    AuthContext->>IDPS: Retrieve Credentials
    IDPS-->>AuthContext: Return Secrets
    AuthContext-->>ToolRegistry: Auth Config
    ToolRegistry->>Tool: Execute with Auth
    Tool->>ExternalAPI: Authenticated Request
    ExternalAPI-->>Tool: API Response
    Tool-->>ToolRegistry: Tool Result
    ToolRegistry-->>MCPServer: Formatted Response
    MCPServer-->>Client: JSON Response
```

### 4.3 Tool Initialization Architecture

```mermaid
graph TB
    subgraph "Tool Initialization Process"
        subgraph "Olorin Tools Init"
            SplunkInit[Splunk Tool Initialization]
            OIIInit[OII Tool Initialization]
            ChronosInit[Chronos Tool Initialization]
            VectorInit[Vector Search Initialization]
        end
        
        subgraph "LangChain Tools Init"
            TavilyInit[Tavily Search Initialization]
            DDGInit[DuckDuckGo Initialization]
            ArXivInit[ArXiv Initialization]
            PythonInit[Python REPL Initialization]
            FileInit[File Tools Initialization]
        end
        
        subgraph "Tool Registry"
            OlorinRegistry[OLORIN_TOOLS Dict]
            LangChainRegistry[LANGCHAIN_TOOLS Dict]
            ToolStatus[Tool Status Tracking]
        end
    end
    
    SplunkInit --> OlorinRegistry
    OIIInit --> OlorinRegistry
    ChronosInit --> OlorinRegistry
    VectorInit --> OlorinRegistry
    
    TavilyInit --> LangChainRegistry
    DDGInit --> LangChainRegistry
    ArXivInit --> LangChainRegistry
    PythonInit --> LangChainRegistry
    FileInit --> LangChainRegistry
    
    OlorinRegistry --> ToolStatus
    LangChainRegistry --> ToolStatus
    
    style OlorinRegistry fill:#e8f5e8
    style LangChainRegistry fill:#e1f5fe
    style ToolStatus fill:#fff3e0
```

---

## 5. Environment Configuration

### 5.1 Multi-Environment Architecture

```mermaid
graph TB
    subgraph "Development Environments"
        Local[Local Development<br/>localhost:3000]
        QAL[QAL Environment<br/>olorin-qal.api.intuit.com:3000]
        E2E[E2E Environment<br/>olorin-e2e.api.intuit.com:3000]
        PRF[PRF Environment<br/>olorin-prf.api.intuit.com:3000]
    end
    
    subgraph "Production Environments"
        STG[Staging<br/>olorin-stg.api.intuit.com:3000]
        PRD[Production<br/>olorin.api.intuit.com:3000]
    end
    
    subgraph "Configuration Sources"
        EnvVars[Environment Variables]
        ConfigClasses[Configuration Classes]
        IDPSSecrets[IDPS Secret Store]
    end
    
    subgraph "External Services"
        SplunkE2E[Splunk E2E<br/>splunk-rest-us-east-2.e2e.cmn.cto.a.intuit.com]
        SplunkPRD[Splunk Production<br/>ip.adhoc.rest.splunk.intuit.com]
        LangfuseE2E[Langfuse E2E<br/>langfuse-e2e.api.intuit.com]
        LangfusePRD[Langfuse Production<br/>langfuse.api.intuit.com]
    end
    
    Local --> EnvVars
    QAL --> ConfigClasses
    E2E --> ConfigClasses
    PRF --> ConfigClasses
    STG --> ConfigClasses
    PRD --> ConfigClasses
    
    ConfigClasses --> IDPSSecrets
    
    Local --> SplunkE2E
    QAL --> SplunkE2E
    E2E --> SplunkE2E
    PRF --> SplunkE2E
    STG --> SplunkE2E
    PRD --> SplunkPRD
    
    Local --> LangfuseE2E
    QAL --> LangfuseE2E
    E2E --> LangfuseE2E
    PRF --> LangfuseE2E
    STG --> LangfuseE2E
    PRD --> LangfusePRD
    
    style Local fill:#e8f5e8
    style PRD fill:#ffebee
    style IDPSSecrets fill:#fff3e0
```

### 5.2 Configuration Hierarchy

```mermaid
graph TB
    subgraph "Configuration Inheritance"
        BaseSettings[SvcSettings<br/>Base Configuration]
        
        subgraph "Environment Groups"
            PreProdSettings[PreProdSettings<br/>Shared Pre-Prod Config]
            ProdSettings[ProdSettings<br/>Shared Production Config]
        end
        
        subgraph "Specific Environments"
            LocalSettings[LocalSettings]
            QALSettings[QALSettings]
            E2ESettings[E2ESettings]
            PRFSettings[PRFSettings]
            STGSettings[STGSettings]
            PRDSettings[PRDSettings]
        end
    end
    
    BaseSettings --> PreProdSettings
    BaseSettings --> ProdSettings
    
    PreProdSettings --> LocalSettings
    PreProdSettings --> QALSettings
    PreProdSettings --> E2ESettings
    PreProdSettings --> PRFSettings
    
    ProdSettings --> STGSettings
    ProdSettings --> PRDSettings
    
    style BaseSettings fill:#f5f5f5
    style PreProdSettings fill:#e1f5fe
    style ProdSettings fill:#ffebee
```

### 5.3 MCP Server URL Configuration

```mermaid
graph LR
    subgraph "Environment Detection"
        AppEnv[APP_ENV Variable]
        ConfigFactory[Settings Factory]
    end
    
    subgraph "MCP Server URLs"
        LocalURL[localhost:3000]
        QALURL[olorin-qal.api.intuit.com:3000]
        E2EURL[olorin-e2e.api.intuit.com:3000]
        PRFURL[olorin-prf.api.intuit.com:3000]
        STGURL[olorin-stg.api.intuit.com:3000]
        PRDURL[olorin.api.intuit.com:3000]
    end
    
    subgraph "Override Options"
        MCPHost[MCP_SERVER_HOST]
        MCPPort[MCP_SERVER_PORT]
    end
    
    AppEnv --> ConfigFactory
    
    ConfigFactory --> |local| LocalURL
    ConfigFactory --> |qal| QALURL
    ConfigFactory --> |e2e| E2EURL
    ConfigFactory --> |prf| PRFURL
    ConfigFactory --> |stg| STGURL
    ConfigFactory --> |prd| PRDURL
    
    MCPHost -.-> |Override| ConfigFactory
    MCPPort -.-> |Override| ConfigFactory
    
    style ConfigFactory fill:#e8f5e8
    style LocalURL fill:#e1f5fe
    style PRDURL fill:#ffebee
```

---

## 6. API Specifications

### 6.1 FastAPI Router Endpoints

```mermaid
graph TB
    subgraph "MCP Router (/mcp)"
        subgraph "Status & Health"
            GetStatus[GET /status<br/>Server Status & Health]
            GetHealth[GET /health<br/>Health Check]
        end
        
        subgraph "Tool Management"
            GetTools[GET /tools<br/>List All Tools]
            GetCategories[GET /tools/categories<br/>Tool Categories]
            ExecuteTool[POST /tools/{name}/execute<br/>Execute Tool]
        end
        
        subgraph "Prompt Management"
            GetPrompts[GET /prompts<br/>List Prompts]
            ExecutePrompt[POST /prompts/{name}/execute<br/>Execute Prompt]
        end
    end
    
    subgraph "Request/Response Models"
        ToolExecutionRequest[ToolExecutionRequest<br/>- tool_name: str<br/>- parameters: Dict]
        ToolExecutionResponse[ToolExecutionResponse<br/>- success: bool<br/>- result: str<br/>- error: str<br/>- execution_time: float]
        ToolsResponse[ToolsResponse<br/>- total_tools: int<br/>- olorin_tools: int<br/>- langchain_tools: int<br/>- categories: List[ToolCategory]<br/>- tools: List[ToolInfo]]
    end
    
    ExecuteTool --> ToolExecutionRequest
    ExecuteTool --> ToolExecutionResponse
    GetTools --> ToolsResponse
    
    style GetStatus fill:#e8f5e8
    style ExecuteTool fill:#f3e5f5
    style ToolsResponse fill:#fff3e0
```

### 6.2 MCP Server Direct Endpoints

```mermaid
graph TB
    subgraph "MCP Server Direct API (Port 3000)"
        subgraph "Core Endpoints"
            Health[GET /health<br/>Server Health Check]
            StatusResource[GET /resources/olorin/status<br/>Comprehensive Status]
            ToolsResource[GET /resources/olorin/tools<br/>Raw Tools Data]
        end
        
        subgraph "Tool Execution"
            ToolCall[POST /tools/call<br/>Direct Tool Execution]
        end
        
        subgraph "Prompt System"
            GetPrompts[GET /prompts<br/>Available Prompts]
            GetPromptsPost[POST /prompts/get<br/>Execute Predefined Prompt]
            CustomPrompt[POST /prompts/custom<br/>Execute Custom Prompt]
        end
        
        subgraph "Template Management"
            CreateTemplate[POST /prompts/templates/create<br/>Create Template]
            GetTemplates[GET /prompts/templates<br/>List Templates]
            ExecuteTemplate[POST /prompts/templates/{name}/execute<br/>Execute Template]
            DeleteTemplate[DELETE /prompts/templates/{name}<br/>Delete Template]
            GetExamples[GET /prompts/examples<br/>Example Prompts]
        end
    end
    
    style Health fill:#e8f5e8
    style ToolCall fill:#f3e5f5
    style CustomPrompt fill:#fff3e0
    style CreateTemplate fill:#e1f5fe
```

### 6.3 API Request/Response Flow

```mermaid
sequenceDiagram
    participant Client
    participant FastAPI
    participant MCPRouter
    participant MCPServer
    participant Tool
    
    Note over Client,Tool: Tool Execution Flow
    
    Client->>FastAPI: POST /mcp/tools/splunk_query/execute
    Note right of Client: {<br/>  "parameters": {<br/>    "query": "search index=main"<br/>  }<br/>}
    
    FastAPI->>MCPRouter: Route Request
    MCPRouter->>MCPServer: POST /tools/call
    Note right of MCPRouter: {<br/>  "name": "splunk_query",<br/>  "arguments": {<br/>    "query": "search index=main"<br/>  }<br/>}
    
    MCPServer->>Tool: Execute Tool
    Tool-->>MCPServer: Tool Result
    MCPServer-->>MCPRouter: JSON Response
    Note left of MCPServer: {<br/>  "content": "...",<br/>  "isError": false<br/>}
    
    MCPRouter-->>FastAPI: Structured Response
    FastAPI-->>Client: HTTP Response
    Note left of FastAPI: {<br/>  "success": true,<br/>  "result": "...",<br/>  "execution_time": 1.23<br/>}
```

---

## 7. Data Flow & Processing

### 7.1 Fraud Investigation Data Flow

```mermaid
graph TB
    subgraph "Data Sources"
        SplunkLogs[Splunk Logs<br/>Transaction & Behavior Data]
        OIIService[OII Service<br/>Identity Information]
        ChronosData[Chronos<br/>Device & Session Data]
        VectorDB[Vector Database<br/>Historical Patterns]
    end
    
    subgraph "Processing Pipeline"
        DataIngestion[Data Ingestion Layer]
        DataNormalization[Data Normalization]
        PatternAnalysis[Pattern Analysis]
        RiskScoring[Risk Scoring Engine]
    end
    
    subgraph "Analysis Outputs"
        RiskAssessment[Risk Assessment Report]
        FraudIndicators[Fraud Indicators]
        RecommendedActions[Recommended Actions]
        InvestigationReport[Investigation Report]
    end
    
    SplunkLogs --> DataIngestion
    OIIService --> DataIngestion
    ChronosData --> DataIngestion
    VectorDB --> DataIngestion
    
    DataIngestion --> DataNormalization
    DataNormalization --> PatternAnalysis
    PatternAnalysis --> RiskScoring
    
    RiskScoring --> RiskAssessment
    RiskScoring --> FraudIndicators
    RiskScoring --> RecommendedActions
    RiskScoring --> InvestigationReport
    
    style DataIngestion fill:#e8f5e8
    style RiskScoring fill:#f3e5f5
    style RiskAssessment fill:#fff3e0
```

### 7.2 Tool Orchestration Flow

```mermaid
sequenceDiagram
    participant Investigator
    participant MCPSystem
    participant SplunkTool
    participant OIITool
    participant ChronosTool
    participant RiskEngine
    
    Investigator->>MCPSystem: Start Investigation (User ID)
    
    par Parallel Data Collection
        MCPSystem->>SplunkTool: Query Transaction Logs
        and
        MCPSystem->>OIITool: Lookup Identity Info
        and
        MCPSystem->>ChronosTool: Analyze Device Sessions
    end
    
    SplunkTool-->>MCPSystem: Transaction Patterns
    OIITool-->>MCPSystem: Identity Verification
    ChronosTool-->>MCPSystem: Device Fingerprints
    
    MCPSystem->>RiskEngine: Aggregate Data
    RiskEngine-->>MCPSystem: Risk Score & Analysis
    MCPSystem-->>Investigator: Investigation Report
```

### 7.3 Prompt Processing Pipeline

```mermaid
graph TB
    subgraph "Prompt Input"
        UserPrompt[User Custom Prompt]
        TemplatePrompt[Template-Based Prompt]
        PredefinedPrompt[Predefined Prompt]
    end
    
    subgraph "Processing Engine"
        PromptParser[Prompt Parser]
        ContextInjection[Context Injection]
        ParameterSubstitution[Parameter Substitution]
        LLMExecution[LLM Execution]
    end
    
    subgraph "Output Processing"
        ResponseParsing[Response Parsing]
        ResultFormatting[Result Formatting]
        ErrorHandling[Error Handling]
    end
    
    UserPrompt --> PromptParser
    TemplatePrompt --> PromptParser
    PredefinedPrompt --> PromptParser
    
    PromptParser --> ContextInjection
    ContextInjection --> ParameterSubstitution
    ParameterSubstitution --> LLMExecution
    
    LLMExecution --> ResponseParsing
    ResponseParsing --> ResultFormatting
    ResponseParsing --> ErrorHandling
    
    style PromptParser fill:#e8f5e8
    style LLMExecution fill:#f3e5f5
    style ResultFormatting fill:#fff3e0
```

---

## 8. Deployment Architecture

### 8.1 Container Deployment Model

```mermaid
graph TB
    subgraph "Kubernetes Cluster"
        subgraph "Namespace: olorin"
            subgraph "FastAPI Pod"
                FastAPIContainer[FastAPI Application<br/>Port 8000]
                SidecarProxy[Istio Sidecar]
            end
            
            subgraph "MCP Server Pod"
                MCPContainer[MCP Server<br/>Port 3000]
                MCPSidecar[Istio Sidecar]
            end
            
            subgraph "Services"
                FastAPIService[FastAPI Service<br/>ClusterIP]
                MCPService[MCP Service<br/>ClusterIP]
            end
            
            subgraph "Ingress"
                IngressController[Ingress Controller]
                TLSTermination[TLS Termination]
            end
        end
        
        subgraph "External Dependencies"
            IDPSExternal[IDPS Service]
            SplunkExternal[Splunk Service]
            LangfuseExternal[Langfuse Service]
        end
    end
    
    IngressController --> FastAPIService
    FastAPIService --> FastAPIContainer
    FastAPIContainer --> MCPService
    MCPService --> MCPContainer
    
    FastAPIContainer --> IDPSExternal
    MCPContainer --> SplunkExternal
    MCPContainer --> LangfuseExternal
    
    style FastAPIContainer fill:#e1f5fe
    style MCPContainer fill:#f3e5f5
    style IDPSExternal fill:#fff3e0
```

### 8.2 Network Architecture

```mermaid
graph TB
    subgraph "External Network"
        Internet[Internet]
        IntuitNetwork[Intuit Internal Network]
    end
    
    subgraph "Load Balancer Layer"
        PublicLB[Public Load Balancer]
        InternalLB[Internal Load Balancer]
    end
    
    subgraph "API Gateway Layer"
        APIGateway[API Gateway<br/>Rate Limiting & Auth]
        ServiceMesh[Istio Service Mesh]
    end
    
    subgraph "Application Layer"
        FastAPICluster[FastAPI Cluster<br/>Multiple Replicas]
        MCPCluster[MCP Server Cluster<br/>Multiple Replicas]
    end
    
    subgraph "Service Layer"
        IDPSService[IDPS Service]
        SplunkService[Splunk Service]
        VectorService[Vector DB Service]
        ExternalAPIs[External APIs<br/>Tavily, etc.]
    end
    
    Internet --> PublicLB
    IntuitNetwork --> InternalLB
    
    PublicLB --> APIGateway
    InternalLB --> APIGateway
    
    APIGateway --> ServiceMesh
    ServiceMesh --> FastAPICluster
    FastAPICluster --> MCPCluster
    
    MCPCluster --> IDPSService
    MCPCluster --> SplunkService
    MCPCluster --> VectorService
    MCPCluster --> ExternalAPIs
    
    style APIGateway fill:#e8f5e8
    style ServiceMesh fill:#f3e5f5
    style FastAPICluster fill:#e1f5fe
    style MCPCluster fill:#fff3e0
```

### 8.3 Environment-Specific Deployment

```mermaid
graph TB
    subgraph "Development Pipeline"
        LocalDev[Local Development<br/>Docker Compose]
        QALDeploy[QAL Deployment<br/>K8s QAL Cluster]
        E2EDeploy[E2E Deployment<br/>K8s E2E Cluster]
        PRFDeploy[PRF Deployment<br/>K8s PRF Cluster]
    end
    
    subgraph "Production Pipeline"
        STGDeploy[Staging Deployment<br/>K8s STG Cluster]
        PRDDeploy[Production Deployment<br/>K8s PRD Cluster]
    end
    
    subgraph "CI/CD Pipeline"
        GitRepo[Git Repository]
        Jenkins[Jenkins Pipeline]
        DockerRegistry[Docker Registry]
        HelmCharts[Helm Charts]
    end
    
    subgraph "Monitoring & Observability"
        Prometheus[Prometheus Metrics]
        Grafana[Grafana Dashboards]
        Jaeger[Jaeger Tracing]
        ELK[ELK Stack Logging]
    end
    
    GitRepo --> Jenkins
    Jenkins --> DockerRegistry
    Jenkins --> HelmCharts
    
    HelmCharts --> QALDeploy
    HelmCharts --> E2EDeploy
    HelmCharts --> PRFDeploy
    HelmCharts --> STGDeploy
    HelmCharts --> PRDDeploy
    
    QALDeploy --> Prometheus
    E2EDeploy --> Prometheus
    PRFDeploy --> Prometheus
    STGDeploy --> Prometheus
    PRDDeploy --> Prometheus
    
    Prometheus --> Grafana
    QALDeploy --> Jaeger
    QALDeploy --> ELK
    
    style Jenkins fill:#e8f5e8
    style DockerRegistry fill:#f3e5f5
    style PRDDeploy fill:#ffebee
    style Prometheus fill:#fff3e0
```

---

## Summary

This comprehensive architecture documentation covers:

1. **System Overview**: High-level component relationships and responsibilities
2. **MCP Integration**: Protocol flow, server architecture, and router bridge design
3. **Authentication & Security**: IDPS integration, secret management, and environment-specific auth
4. **Tool Ecosystem**: Classification, execution flow, and initialization architecture
5. **Environment Configuration**: Multi-environment setup, configuration hierarchy, and URL management
6. **API Specifications**: Complete endpoint documentation with request/response models
7. **Data Flow & Processing**: Fraud investigation pipeline, tool orchestration, and prompt processing
8. **Deployment Architecture**: Container deployment, network architecture, and CI/CD pipeline

The OLORIN MCP system provides a robust, scalable architecture for fraud detection and investigation, with comprehensive tool integration, secure authentication, and multi-environment support.
