# Progressive CV Enhancement System - Architecture Diagrams

## System Architecture Overview

```mermaid
graph TB
    subgraph "Frontend (React)"
        FRP[FinalResultsPage]
        PEM[ProgressiveEnhancementManager]
        FPC[FeatureProgressCard]
        HCM[HTMLContentMerger]
        DHV[DynamicHTMLViewer]
    end
    
    subgraph "Firebase Backend"
        FS[Firebase Storage]
        FD[Firestore Database]
        FF[Firebase Functions]
    end
    
    subgraph "Legacy Functions"
        GSV[generateSkillsVisualization]
        GCB[generateCertificationBadges]
        GT[generateTimeline]
        GVR[generateVideoIntroduction]
        GPG[generatePortfolioGallery]
    end
    
    FRP --> PEM
    PEM --> FF
    FF --> GSV
    FF --> GCB
    FF --> GT
    FF --> GVR
    FF --> GPG
    
    GSV --> FD
    GCB --> FD
    GT --> FD
    GVR --> FD
    GPG --> FD
    
    FD --> FPC
    FPC --> HCM
    HCM --> DHV
    
    FS --> FRP
    DHV --> FS
```

## Data Flow Sequence

```mermaid
sequenceDiagram
    participant U as User
    participant FRP as FinalResultsPage
    participant PEM as ProgressiveEnhancementManager
    participant FF as Firebase Functions
    participant FD as Firestore
    participant FS as Firebase Storage
    
    U->>FRP: Navigate to /final-results/{jobId}
    FRP->>FS: Load base HTML content
    FS-->>FRP: Return base HTML
    FRP->>U: Display base CV immediately
    
    FRP->>PEM: Initialize feature queue
    PEM->>FF: Call generateSkillsVisualization
    FF->>FD: Update progress (processing)
    FD-->>FRP: Real-time progress update
    FRP->>U: Show "Processing Skills..."
    
    FF->>FD: Update with HTML fragment (completed)
    FD-->>FRP: Skills HTML fragment
    FRP->>FRP: Merge skills HTML into base
    FRP->>U: Update CV display with skills
    
    PEM->>FF: Call generateCertificationBadges
    FF->>FD: Update progress (processing)
    FD-->>FRP: Real-time progress update
    FRP->>U: Show "Processing Badges..."
    
    FF->>FD: Update with HTML fragment (completed)
    FD-->>FRP: Badges HTML fragment
    FRP->>FRP: Merge badges HTML into CV
    FRP->>U: Update CV display with badges
    
    Note over FRP,U: Continue for all selected features...
    
    FRP->>FS: Save final enhanced HTML
    FRP->>U: Show "All features complete!"
```

## Component Architecture

```mermaid
graph TD
    subgraph "FinalResultsPage"
        FRP[FinalResultsPage Component]
        PEP[ProgressiveEnhancementProvider]
        
        subgraph "Left Panel"
            FPP[FeatureProgressPanel]
            FPC1[FeatureProgressCard - Skills]
            FPC2[FeatureProgressCard - Badges]
            FPC3[FeatureProgressCard - Timeline]
            PT[ProgressTimeline]
        end
        
        subgraph "Main Content"
            BCVI[BaseContentViewer]
            ECVI[EnhancedContentViewer]
            HDV[HTMLDiffViewer]
        end
        
        subgraph "Bottom Panel"
            DM[DownloadManager]
            DP[DownloadProgress]
        end
    end
    
    FRP --> PEP
    PEP --> FPP
    PEP --> BCVI
    PEP --> ECVI
    PEP --> DM
    
    FPP --> FPC1
    FPP --> FPC2
    FPP --> FPC3
    FPP --> PT
    
    BCVI --> HDV
    ECVI --> HDV
    DM --> DP
```

## Feature Processing Flow

```mermaid
flowchart TD
    Start([User arrives at FinalResultsPage]) --> LoadBase[Load base HTML from Storage]
    LoadBase --> DisplayBase[Display base CV immediately]
    DisplayBase --> CreateQueue[Create feature queue from selected features]
    
    CreateQueue --> CheckQueue{More features in queue?}
    CheckQueue -->|Yes| ProcessNext[Get next feature from queue]
    CheckQueue -->|No| AllComplete[All features complete]
    
    ProcessNext --> CallFunction[Call legacy Firebase Function]
    CallFunction --> UpdateProgress[Update Firestore with progress]
    UpdateProgress --> WaitComplete[Wait for function completion]
    
    WaitComplete --> Success{Function successful?}
    Success -->|Yes| GetFragment[Get HTML fragment from Firestore]
    Success -->|No| HandleError[Handle error gracefully]
    
    GetFragment --> MergeHTML[Merge fragment into current HTML]
    MergeHTML --> UpdateDisplay[Update display with new content]
    UpdateDisplay --> UpdateDownloads[Update download links]
    UpdateDownloads --> CheckQueue
    
    HandleError --> LogError[Log error for user]
    LogError --> CheckQueue
    
    AllComplete --> FinalSave[Save final enhanced HTML]
    FinalSave --> ShowComplete[Show completion message]
    ShowComplete --> End([User can download final CV])
```

## Error Handling Flow

```mermaid
flowchart TD
    FeatureCall[Feature Function Called] --> Processing[Function Processing]
    Processing --> Success{Success?}
    
    Success -->|Yes| UpdateHTML[Update HTML with fragment]
    Success -->|No| ErrorType{Error Type?}
    
    ErrorType -->|Timeout| TimeoutHandler[Handle Timeout]
    ErrorType -->|Network| NetworkHandler[Handle Network Error]
    ErrorType -->|Function Error| FunctionHandler[Handle Function Error]
    
    TimeoutHandler --> Retry1{Retry Available?}
    NetworkHandler --> Retry2{Retry Available?}
    FunctionHandler --> Retry3{Retry Available?}
    
    Retry1 -->|Yes| RetryFeature1[Retry Feature]
    Retry1 -->|No| SkipFeature1[Skip Feature]
    
    Retry2 -->|Yes| RetryFeature2[Retry Feature]
    Retry2 -->|No| SkipFeature2[Skip Feature]
    
    Retry3 -->|Yes| RetryFeature3[Retry Feature]
    Retry3 -->|No| SkipFeature3[Skip Feature]
    
    RetryFeature1 --> FeatureCall
    RetryFeature2 --> FeatureCall
    RetryFeature3 --> FeatureCall
    
    SkipFeature1 --> LogSkip1[Log skipped feature]
    SkipFeature2 --> LogSkip2[Log skipped feature]
    SkipFeature3 --> LogSkip3[Log skipped feature]
    
    LogSkip1 --> ContinueNext1[Continue with next feature]
    LogSkip2 --> ContinueNext2[Continue with next feature]
    LogSkip3 --> ContinueNext3[Continue with next feature]
    
    UpdateHTML --> ContinueNext4[Continue with next feature]
    
    ContinueNext1 --> NextFeature[Process Next Feature]
    ContinueNext2 --> NextFeature
    ContinueNext3 --> NextFeature
    ContinueNext4 --> NextFeature
```

## State Management Flow

```mermaid
stateDiagram-v2
    [*] --> Initializing: Page Load
    
    Initializing --> BaseLoaded: Base HTML loaded
    BaseLoaded --> EnhancementStarted: Feature queue created
    
    EnhancementStarted --> ProcessingFeatures: Start feature processing
    
    state ProcessingFeatures {
        [*] --> FeaturePending
        FeaturePending --> FeatureProcessing: Function called
        FeatureProcessing --> FeatureCompleted: Success
        FeatureProcessing --> FeatureFailed: Error
        FeatureCompleted --> FeaturePending: Next feature
        FeatureFailed --> FeaturePending: Skip/Retry
        FeaturePending --> [*]: Queue empty
    }
    
    ProcessingFeatures --> EnhancementCompleted: All features done
    ProcessingFeatures --> PartiallyCompleted: Some features failed
    
    EnhancementCompleted --> Ready: Final HTML saved
    PartiallyCompleted --> Ready: Partial HTML saved
    
    Ready --> [*]: User downloads CV
```

## HTML Merging Strategy

```mermaid
graph LR
    subgraph "Base HTML Structure"
        BH[Base HTML Document]
        HS[Header Section]
        SS[Skills Section]
        ES[Experience Section]
        CS[Certifications Section]
        PS[Projects Section]
    end
    
    subgraph "Feature HTML Fragments"
        SF[Skills Visualization Fragment]
        CF[Certification Badges Fragment]
        TF[Timeline Fragment]
        PF[Portfolio Fragment]
    end
    
    subgraph "Injection Points"
        SP[Skills Placeholder]
        CP[Certification Placeholder]
        TP[Timeline Placeholder]
        PP[Portfolio Placeholder]
    end
    
    BH --> HS
    BH --> SS
    BH --> ES
    BH --> CS
    BH --> PS
    
    SS --> SP
    CS --> CP
    ES --> TP
    PS --> PP
    
    SF --> SP
    CF --> CP
    TF --> TP
    PF --> PP
```

## Performance and Caching Strategy

```mermaid
graph TD
    subgraph "Frontend Caching"
        BC[Base HTML Cache]
        FC[Fragment Cache]
        SC[State Cache]
    end
    
    subgraph "Backend Optimization"
        FP[Function Parallelization]
        RB[Response Batching]
        CP[Connection Pooling]
    end
    
    subgraph "Storage Strategy"
        FS[Firebase Storage]
        CDN[CDN Distribution]
        LC[Local Storage]
    end
    
    User --> BC
    BC --> FC
    FC --> SC
    
    SC --> FP
    FP --> RB
    RB --> CP
    
    CP --> FS
    FS --> CDN
    CDN --> LC
    
    LC --> User
```

These diagrams provide comprehensive visual representation of:
1. **System Architecture**: Overall component relationships
2. **Data Flow**: Sequence of operations from user action to completion
3. **Component Structure**: Internal organization of React components
4. **Feature Processing**: Step-by-step feature enhancement workflow
5. **Error Handling**: Robust error management and recovery
6. **State Management**: Application state transitions
7. **HTML Merging**: Strategy for combining base HTML with feature fragments
8. **Performance**: Caching and optimization approaches

The diagrams complement the implementation plan by providing clear visual guidance for development teams implementing the progressive enhancement system.