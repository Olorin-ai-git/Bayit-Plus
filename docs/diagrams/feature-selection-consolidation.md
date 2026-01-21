# Feature Selection Consolidation - Architecture Diagrams

## Current State Architecture (Problematic)

```mermaid
graph TD
    subgraph "Current Duplicate Architecture"
        A[CVAnalysisPage] --> B[CVPreviewPage]
        B --> B1[FeatureSelectionPanel #1]
        B1 --> B2[selectedFeatures State]
        B2 --> B3[sessionStorage Config]
        B --> C[Navigate to ResultsPage]
        
        C --> D[ResultsPage]
        D --> D1[FeatureSelectionPanel #2]
        D1 --> D2[Different SelectedFeatures State]
        D2 --> D3[generateCV Service]
        D3 --> E[FinalResultsPage]
        
        F[CVPreviewPageMobile] --> F1[MobileFeatureSelection #3]
        F1 --> F2[Another selectedFeatures State]
        
        style B1 fill:#ff9999
        style D1 fill:#ff9999
        style F1 fill:#ff9999
        style B3 fill:#ffcccc
    end
    
    subgraph "Problems Identified"
        P1[User selects features twice]
        P2[sessionStorage ignored]
        P3[Different feature sets]
        P4[820+ lines duplicate code]
        P5[Inconsistent naming]
    end
```

## Current Feature Set Comparison

```mermaid
graph LR
    subgraph "FeatureSelectionPanel #1 (CVPreviewPage)"
        A1[atsOptimized]
        A2[keywordOptimization]
        A3[achievementsShowcase]
        A4[embedQRCode]
        A5[languageProficiency]
        A6[certificationBadges]
        A7[socialMediaLinks]
        A8[skillsVisualization]
        A9[personalityInsights]
        A10[careerTimeline]
        A11[portfolioGallery]
    end
    
    subgraph "FeatureSelectionPanel #2 (ResultsPage)"
        B1[atsOptimization]
        B2[keywordEnhancement]
        B3[achievementHighlighting]
        B4[skillsVisualization]
        B5[generatePodcast]
        B6[embedQRCode]
        B7[interactiveTimeline]
        B8[skillsChart]
        B9[videoIntroduction]
        B10[portfolioGallery]
        B11[languageProficiency]
        B12[certificationBadges]
    end
    
    subgraph "MobileFeatureSelection #3"
        C1[Same as #1 + Premium Flags]
        C2[Mobile Optimizations]
        C3[Progressive Disclosure]
    end
    
    A1 -.->|MISMATCH| B1
    A2 -.->|MISMATCH| B2
    A3 -.->|MISMATCH| B3
    A8 -->|MATCH| B4
    A11 -->|MATCH| B10
    
    style A1 fill:#ffcccc
    style A2 fill:#ffcccc
    style A3 fill:#ffcccc
    style B1 fill:#ffcccc
    style B2 fill:#ffcccc
    style B3 fill:#ffcccc
```

## Data Flow Issues

```mermaid
sequenceDiagram
    participant User
    participant CVPreviewPage
    participant SessionStorage
    participant ResultsPage
    participant GenerateCV
    
    User->>CVPreviewPage: Select Features
    CVPreviewPage->>SessionStorage: Store config
    Note over SessionStorage: generation-config-{jobId}
    CVPreviewPage->>ResultsPage: Navigate
    
    Note over ResultsPage: Ignores sessionStorage!
    User->>ResultsPage: Select Features AGAIN
    ResultsPage->>GenerateCV: Send selected features
    
    Note over User,GenerateCV: CVPreviewPage selection WASTED
    
    rect rgb(255, 200, 200)
        Note over User: Confused: Why select twice?
    end
```

## Proposed Unified Architecture

```mermaid
graph TD
    subgraph "Unified Architecture Solution"
        A[CVAnalysisPage] --> B[CVPreviewPage - Text Only]
        B --> B1[CVPreview Component]
        B1 --> B2[Improvements Summary]
        B2 --> B3[Approve & Select Features Button]
        B --> C[Navigate to ResultsPage]
        
        C --> D[ResultsPage - Features Only]
        D --> D1[UnifiedFeatureSelectionPanel]
        D1 --> D2[Centralized Feature State]
        D2 --> D3[Live Preview]
        D3 --> D4[generateCV Service]
        D4 --> E[FinalResultsPage]
        
        F[Mobile Pages] --> D1
        
        style D1 fill:#99ff99
        style B1 fill:#99ccff
        style D2 fill:#99ff99
    end
    
    subgraph "Benefits"
        G1[Single feature selection]
        G2[Clear page purposes]
        G3[Unified codebase]
        G4[Better UX]
        G5[Maintainable code]
    end
```

## Unified Feature Configuration

```mermaid
graph TD
    subgraph "Unified Feature System"
        A[UnifiedFeatureConfig]
        
        A --> B[Core Features]
        B --> B1[atsOptimized: ATS Optimization]
        B --> B2[keywordOptimization: Keyword Enhancement]
        B --> B3[achievementsShowcase: Achievement Highlighting]
        
        A --> C[Enhancement Features]
        C --> C1[embedQRCode: QR Code Integration]
        C --> C2[languageProficiency: Language Skills]
        C --> C3[certificationBadges: Certifications]
        C --> C4[socialMediaLinks: Professional Links]
        
        A --> D[Advanced Features]
        D --> D1[skillsVisualization: Skills Charts]
        D --> D2[portfolioGallery: Portfolio Display]
        D --> D3[videoIntroduction: Video Content]
        D --> D4[generatePodcast: Audio Content]
        D --> D5[personalityInsights: AI Insights]
        D --> D6[careerTimeline: Career Journey]
        
        style A fill:#99ff99
        style B fill:#cceeff
        style C fill:#ffffcc
        style D fill:#ffccff
    end
```

## Component Consolidation Plan

```mermaid
flowchart TD
    subgraph "Phase 1: Current State"
        A1[FeatureSelectionPanel.tsx - 281 lines]
        A2[results/FeatureSelectionPanel.tsx - 146 lines]
        A3[MobileFeatureSelection.tsx - 393 lines]
        A4[FeatureCheckbox.tsx - 65 lines]
    end
    
    subgraph "Phase 2: Consolidation"
        B1[UnifiedFeatureSelectionPanel]
        B2[Merge all functionality]
        B3[Single configuration source]
        B4[Mobile + Desktop support]
    end
    
    subgraph "Phase 3: Implementation"
        C1[Update CVPreviewPage]
        C2[Remove feature selection]
        C3[Focus on text improvements]
        C4[Update ResultsPage]
        C5[Use unified component]
    end
    
    subgraph "Phase 4: Result"
        D1[CVPreviewPage: Text Only]
        D2[ResultsPage: Features Only]
        D3[Single source of truth]
        D4[Improved user experience]
    end
    
    A1 --> B1
    A2 --> B1
    A3 --> B1
    A4 --> B1
    
    B1 --> C1
    B1 --> C4
    
    C1 --> D1
    C4 --> D2
    
    style B1 fill:#99ff99
    style D1 fill:#99ccff
    style D2 fill:#99ccff
    style D3 fill:#99ff99
    style D4 fill:#99ff99
```

## State Management Improvement

```mermaid
stateDiagram-v2
    [*] --> CVAnalysis
    CVAnalysis --> CVPreview
    
    state CVPreview {
        [*] --> ShowImprovements
        ShowImprovements --> ApproveChanges
        ApproveChanges --> NavigateToFeatures
    }
    
    CVPreview --> FeatureSelection
    
    state FeatureSelection {
        [*] --> LoadFeatureDefaults
        LoadFeatureDefaults --> UserSelection
        UserSelection --> LivePreview
        LivePreview --> UserSelection
        LivePreview --> GenerateCV
    }
    
    FeatureSelection --> FinalResults
    
    state FinalResults {
        [*] --> DisplayCV
        DisplayCV --> DownloadOptions
        DownloadOptions --> ShareOptions
    }
    
    note right of CVPreview : Text improvements only
    note right of FeatureSelection : Single feature selection point
    note right of FinalResults : Export and sharing
```

## Risk Mitigation Strategy

```mermaid
graph LR
    subgraph "Current Risks"
        R1[User Confusion]
        R2[Duplicate Code]
        R3[State Sync Issues]
        R4[Maintenance Burden]
        R5[Feature Inconsistency]
    end
    
    subgraph "Mitigation Actions"
        M1[Clear Page Separation]
        M2[Component Consolidation]
        M3[Unified State Management]
        M4[Comprehensive Testing]
        M5[Feature Standardization]
    end
    
    subgraph "Success Metrics"
        S1[Single Feature Selection]
        S2[Reduced Code Duplication]
        S3[Improved User Flow]
        S4[Better Maintainability]
        S5[Consistent Experience]
    end
    
    R1 --> M1 --> S1
    R2 --> M2 --> S2
    R3 --> M3 --> S3
    R4 --> M4 --> S4
    R5 --> M5 --> S5
    
    style M1 fill:#99ff99
    style M2 fill:#99ff99
    style M3 fill:#99ff99
    style M4 fill:#99ff99
    style M5 fill:#99ff99
```