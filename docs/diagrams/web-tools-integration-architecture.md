# Web Tools Integration Architecture

This diagram illustrates the integration of web tools into Olorin's investigation workflow with PII sanitization.

```mermaid
graph TB
    subgraph "Investigation Workflow"
        IG[Investigation Graph] --> DA[Domain Agents]
        DA --> TC[Tool Categories]
        
        subgraph "Tool Categories"
            TC --> OT[Olorin Tools]
            TC --> ST[Search Tools] 
            TC --> DT[Database Tools]
            TC --> TI[Threat Intelligence]
            TC --> MC[MCP Clients]
            TC --> BT[Blockchain Tools]
            TC --> WT[Web Tools] 
            TC --> IT[Intelligence Tools]
        end
        
        subgraph "Web Tools"
            WT --> WS[WebSearchTool]
            WT --> WST[WebScrapeTool]
            WT --> HT[HTTPRequestTool]
            WT --> JT[JSONAPITool]
        end
    end
    
    subgraph "Domain Agent Instructions"
        DA --> NA[Network Agent]
        DA --> DEA[Device Agent]
        DA --> LA[Location Agent]
        DA --> LGA[Logs Agent]
        DA --> RA[Risk Agent]
        
        NA --> NWI["Web Search Instructions:<br/>- Research suspicious IPs<br/>- Domain reputation checks<br/>- Infrastructure analysis"]
        
        DEA --> DWI["Web Search Instructions:<br/>- Device fingerprint research<br/>- Vulnerability searches<br/>- Fraud pattern analysis"]
        
        LA --> LWI["Web Search Instructions:<br/>- Business verification<br/>- Geographic anomaly research<br/>- Location-based fraud reports"]
        
        LGA --> LGWI["Web Search Instructions:<br/>- Attack pattern research<br/>- Threat signature searches<br/>- Security blog correlation"]
        
        RA --> RWI["Web Search Instructions:<br/>- Aggregate threat intelligence<br/>- Recent fraud trends<br/>- Risk assessment enhancement"]
    end
    
    subgraph "PII Sanitization Framework"
        WS --> PS[PII Sanitizer]
        WST --> PS
        HT --> PS
        JT --> PS
        
        PS --> PD[PII Detection]
        PS --> SM[Sanitization Methods]
        
        subgraph "PII Detection Patterns"
            PD --> SSN[SSN Patterns]
            PD --> CC[Credit Card Patterns]
            PD --> EM[Email Patterns]
            PD --> PH[Phone Patterns]
            PD --> BA[Bank Account Patterns]
        end
        
        subgraph "Sanitization Methods"
            SM --> RED[Redaction]
            SM --> MASK[Masking]
            SM --> TOK[Tokenization]
            SM --> CTX[Context-Aware Protection]
        end
        
        PS --> SC[Sanitized Content]
    end
    
    subgraph "Test Scenarios"
        TS[Test Scenarios] --> TS1[Domain Reputation Investigation]
        TS --> TS2[Business Verification]
        TS --> TS3[Threat Pattern Research]
        TS --> TS4[PII Sanitization Validation]
        
        TS1 --> TW1[Tests web_search and web_scrape usage]
        TS2 --> TW2[Tests business verification searches]
        TS3 --> TW3[Tests threat intelligence gathering]
        TS4 --> TW4[Tests PII protection effectiveness]
    end
    
    subgraph "Data Flow"
        SC --> IR[Investigation Results]
        IR --> FR[Final Report]
        FR --> "✅ PII-Safe Investigation Output"
    end
    
    style WT fill:#e1f5fe
    style PS fill:#fff3e0
    style IR fill:#e8f5e8
    style FR fill:#e8f5e8
```

## Architecture Components

### 1. Investigation Workflow Integration
- **Investigation Graph**: Central orchestrator that manages all tool categories
- **Domain Agents**: Specialized agents for different investigation domains
- **Tool Categories**: Organized tool groups including the new "web" category

### 2. Web Tools Category
- **WebSearchTool**: Performs web searches with configurable search engines
- **WebScrapeTool**: Extracts content from web pages and APIs
- **HTTPRequestTool**: Makes direct HTTP requests for API access
- **JSONAPITool**: Handles JSON-based API communications

### 3. Domain Agent Web Instructions
Each domain agent receives specific web search instructions:
- **Network Agent**: IP/domain reputation, infrastructure analysis
- **Device Agent**: Device fingerprint research, vulnerability searches  
- **Location Agent**: Business verification, geographic anomaly research
- **Logs Agent**: Attack pattern research, threat signature correlation
- **Risk Agent**: Threat intelligence aggregation, fraud trend analysis

### 4. PII Sanitization Framework
- **PII Detection**: Pattern-based detection of sensitive information
- **Sanitization Methods**: Multiple approaches for protecting sensitive data
- **Context-Aware Protection**: Preserves investigation-relevant information

### 5. Test Scenarios
- **Domain Reputation**: Tests web tools for investigating suspicious domains
- **Business Verification**: Tests web-based business legitimacy checks
- **Threat Pattern Research**: Tests web-based threat intelligence gathering
- **PII Sanitization**: Validates protection of sensitive information

## Data Flow Security

1. **Input**: Investigation requests with potential PII
2. **Web Tool Execution**: Tools gather information from web sources
3. **PII Sanitization**: All web tool outputs are sanitized before processing
4. **Domain Analysis**: Agents analyze sanitized data for fraud indicators
5. **Output**: Investigation results with PII protection maintained

## Integration Benefits

- **Enhanced Intelligence**: Web-based information gathering capabilities
- **Privacy Protection**: Robust PII sanitization ensures compliance
- **Comprehensive Coverage**: All investigation domains utilize web intelligence
- **Automated Testing**: Comprehensive test scenarios validate functionality
- **Scalable Architecture**: Framework supports additional web tools in the future