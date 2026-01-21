# Role-Oriented CV Processing Architecture

**Author:** Gil Klainert  
**Date:** 2025-01-21  
**Project:** CVPlus  
**Document Type:** Architecture Diagram  
**Related Plan:** [Role-Oriented LLM Prompts Implementation Plan](/docs/plans/2025-01-21-role-oriented-llm-prompts-implementation-plan.md)

## System Architecture Overview

This diagram illustrates the complete architecture for the role-oriented CV processing system, showing how role detection, profile management, and enhanced LLM prompting work together to deliver targeted CV improvements.

```mermaid
graph TB
    %% User Interface Layer
    subgraph "Frontend (React)"
        CV[CV Upload Interface]
        RS[Role Selector Component]
        MB[Magic Button]
        RD[Role Dropdown]
        RI[Recommendations Interface]
        RB[Role-Based Recommendations]
    end

    %% API Gateway Layer
    subgraph "Firebase Functions API"
        UF[uploadCV]
        DR[detectRoleProfile]
        AR[applyRoleProfile]
        GR[getRecommendations - Enhanced]
        AI[applyImprovements]
    end

    %% Core Services Layer
    subgraph "Backend Services"
        CVS[CVTransformationService]
        RDS[RoleDetectionService]
        RPS[RoleProfileService]
        PMS[PlaceholderManager]
        VCS[VerifiedClaudeService]
    end

    %% Data Processing Layer
    subgraph "Role Processing Engine"
        RDA[Role Detection Algorithm]
        RSE[Role Scoring Engine]
        PEE[Prompt Enhancement Engine]
        AME[Achievement Matching Engine]
    end

    %% AI/LLM Layer
    subgraph "Claude AI Integration"
        RBP[Role-Based Prompts]
        GPR[Generic Prompt Fallback]
        LLM[Claude Sonnet/Haiku Models]
    end

    %% Database Layer
    subgraph "Firestore Database"
        JOB[(jobs)]
        RPF[(roleProfiles)]
        USR[(users)]
        REC[(recommendations)]
    end

    %% Data Flow - CV Upload and Processing
    CV --> UF
    UF --> CVS
    CVS --> JOB

    %% Data Flow - Role Detection
    CVS --> DR
    DR --> RDS
    RDS --> RDA
    RDA --> RSE
    RSE --> RPF
    RPF --> RDS
    RDS --> JOB

    %% Data Flow - Role Selection
    RS --> MB
    RS --> RD
    MB --> AR
    RD --> AR
    AR --> RPS
    RPS --> RPF
    AR --> JOB

    %% Data Flow - Enhanced Recommendations
    RI --> GR
    GR --> CVS
    CVS --> PEE
    PEE --> RPF
    PEE --> RBP
    RBP --> LLM
    GPR --> LLM
    LLM --> VCS
    VCS --> CVS
    CVS --> AME
    AME --> REC
    REC --> RB

    %% Data Flow - Apply Improvements
    RB --> AI
    AI --> CVS
    CVS --> PMS
    PMS --> JOB

    %% Styling
    classDef frontend fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef api fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef service fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    classDef engine fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef ai fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef database fill:#f1f8e9,stroke:#689f38,stroke-width:2px

    class CV,RS,MB,RD,RI,RB frontend
    class UF,DR,AR,GR,AI api
    class CVS,RDS,RPS,PMS,VCS service
    class RDA,RSE,PEE,AME engine
    class RBP,GPR,LLM ai
    class JOB,RPF,USR,REC database
```

## Component Specifications

### Frontend Components

#### Role Selector Component
```mermaid
graph LR
    subgraph "Role Selector Component"
        DRC[Detected Role Card]
        CB[Confidence Badge]
        MB[Magic Button]
        AS[Alternative Suggestions]
        MD[Manual Dropdown]
        RP[Role Preview]
    end

    DRC --> CB
    CB --> MB
    AS --> MD
    MD --> RP
    MB --> Apply[Apply Role Profile]
    MD --> Apply
```

### Backend Service Architecture

#### Role Detection Service Flow
```mermaid
sequenceDiagram
    participant CV as CV Data
    participant RDS as RoleDetectionService
    participant RSE as RoleScoring Engine
    participant RPF as Role Profiles DB
    participant Result as Detection Result

    CV->>RDS: detectRoleProfile(parsedCV)
    RDS->>RPF: getAllRoleProfiles()
    RPF-->>RDS: roleProfiles[]
    
    loop For each role profile
        RDS->>RSE: calculateRoleMatch(cv, profile)
        RSE-->>RDS: confidence score
    end
    
    RDS->>RDS: sortByConfidence()
    RDS-->>Result: {roleProfile, confidence, alternatives}
```

### Role Profile Data Structure

#### Role Profile Entity Model
```mermaid
erDiagram
    ROLE_PROFILE {
        string id PK
        string name
        string domain
        string category
        string description
        string[] keySkills
        string[] industryKeywords
        string[] achievementPatterns
        object experienceWeights
        object promptEnhancements
        object atsOptimization
        number confidence
        datetime createdAt
        datetime updatedAt
    }

    JOB {
        string id PK
        object parsedData
        string detectedRoleProfile FK
        string selectedRoleProfile FK
        number roleDetectionConfidence
        object[] roleBasedRecommendations
        object[] roleProfileHistory
    }

    RECOMMENDATIONS {
        string id PK
        string jobId FK
        string roleProfileId FK
        string type
        string category
        string title
        string description
        number priority
        number estimatedScoreImprovement
    }

    ROLE_PROFILE ||--o{ JOB : "detects/applies"
    ROLE_PROFILE ||--o{ RECOMMENDATIONS : "influences"
    JOB ||--o{ RECOMMENDATIONS : "generates"
```

### Enhanced LLM Prompting Architecture

#### Role-Based Prompt Generation
```mermaid
graph TD
    subgraph "Prompt Enhancement Engine"
        CVD[CV Data] --> PB[Prompt Builder]
        RP[Role Profile] --> PB
        TK[Target Keywords] --> PB
        
        PB --> RC[Role Context]
        PB --> SF[Summary Focus]
        PB --> EE[Experience Emphasis]
        PB --> SP[Skills Prioritization]
        PB --> AM[Achievement Metrics]
        PB --> AO[ATS Optimization]
        
        RC --> EP[Enhanced Prompt]
        SF --> EP
        EE --> EP
        SP --> EP
        AM --> EP
        AO --> EP
        
        EP --> LLM[Claude LLM]
        LLM --> RBR[Role-Based Recommendations]
    end
```

### User Experience Flow

#### Complete User Journey
```mermaid
journey
    title Role-Oriented CV Improvement Journey
    section CV Upload
      Upload CV File: 5: User
      Process CV Data: 3: System
      
    section Role Detection
      Analyze CV Content: 3: System
      Calculate Role Scores: 3: System
      Present Role Suggestion: 5: User
      
    section Role Selection
      Review Detected Role: 4: User
      One-Click Accept: 5: User
      Or Manual Selection: 4: User
      
    section Enhanced Recommendations
      Generate Role-Based Prompts: 3: System
      LLM Processing: 3: System
      Present Targeted Recommendations: 5: User
      
    section Apply Improvements
      Select Recommendations: 4: User
      Apply CV Transformations: 3: System
      Download Enhanced CV: 5: User
```

## Performance and Scalability Considerations

### System Performance Architecture
```mermaid
graph TB
    subgraph "Performance Optimization"
        subgraph "Caching Layer"
            RPC[Role Profile Cache]
            DRC[Detection Result Cache]
            PRC[Prompt Response Cache]
        end
        
        subgraph "Optimization Strategies"
            LP[Lazy Profile Loading]
            BDP[Batch Detection Processing]
            PPO[Prompt Pre-optimization]
        end
        
        subgraph "Monitoring"
            PM[Performance Metrics]
            EM[Error Monitoring]
            UM[Usage Analytics]
        end
    end

    RPC --> LP
    DRC --> BDP
    PRC --> PPO
    
    LP --> PM
    BDP --> EM
    PPO --> UM
```

This architecture ensures scalable, efficient processing of role-oriented CV improvements while maintaining high performance and user experience standards.