# Inline Placeholder Editing - System Architecture Diagrams

## 1. Overall System Architecture

```mermaid
graph TB
    subgraph "Frontend Components"
        A[CVPreviewPageNew] --> B[PlaceholderEditingProvider]
        B --> C[EditablePlaceholder]
        C --> D[PlaceholderInput Components]
        D --> E[TextInput]
        D --> F[NumberInput]
        D --> G[CurrencyInput]
        D --> H[PercentageInput]
    end
    
    subgraph "State Management"
        I[PlaceholderEditingContext] --> J[usePlaceholderEditing Hook]
        J --> K[Local State Management]
        K --> L[Optimistic Updates]
    end
    
    subgraph "Services Layer"
        M[CVUpdateService] --> N[PlaceholderService]
        N --> O[ValidationService]
        O --> P[FormattingService]
    end
    
    subgraph "Backend"
        Q[Firebase Functions] --> R[updateCVData]
        R --> S[Firestore Database]
        S --> T[CV Documents]
    end
    
    A --> I
    C --> M
    M --> Q
    
    style A fill:#e1f5fe
    style C fill:#f3e5f5
    style M fill:#e8f5e8
    style Q fill:#fff3e0
```

## 2. User Interaction Flow

```mermaid
sequenceDiagram
    participant U as User
    participant P as CVPreviewPage
    participant E as EditablePlaceholder
    participant S as CVUpdateService
    participant F as Firebase
    participant D as Database

    U->>P: Views CV with placeholders
    P->>E: Renders [INSERT TEAM SIZE]
    U->>E: Clicks on placeholder
    E->>E: Switches to edit mode
    U->>E: Types "8 developers"
    E->>E: Validates input
    E->>S: Debounced save request
    S->>F: updateCVData function
    F->>D: Update document
    D-->>F: Success response
    F-->>S: Update confirmed
    S-->>E: Success callback
    E->>E: Update UI state
    E->>P: Refresh placeholder value
```

## 3. Component Hierarchy

```mermaid
graph TD
    subgraph "Page Level"
        A[CVPreviewPageNew]
    end
    
    subgraph "Context Providers"
        B[PlaceholderEditingProvider]
    end
    
    subgraph "Section Components"
        C[CVPersonalInfo]
        D[CVExperience]
        E[CVSkills]
        F[CVEducation]
    end
    
    subgraph "Placeholder Components"
        G[EditablePlaceholder]
        H[PlaceholderTooltip]
        I[PlaceholderError]
    end
    
    subgraph "Input Components"
        J[TextPlaceholderInput]
        K[NumberPlaceholderInput]
        L[CurrencyPlaceholderInput]
        M[PercentagePlaceholderInput]
        N[DatePlaceholderInput]
    end
    
    A --> B
    B --> C
    B --> D
    B --> E
    B --> F
    C --> G
    D --> G
    E --> G
    F --> G
    G --> H
    G --> I
    G --> J
    G --> K
    G --> L
    G --> M
    G --> N
```

## 4. Data Flow Architecture

```mermaid
graph LR
    subgraph "Data Sources"
        A[CV Document]
        B[Placeholder Values]
        C[User Input]
    end
    
    subgraph "State Management"
        D[PlaceholderState]
        E[EditingState]
        F[ValidationState]
    end
    
    subgraph "Processing"
        G[PlaceholderDetection]
        H[InputValidation]
        I[ValueFormatting]
    end
    
    subgraph "Persistence"
        J[OptimisticUpdate]
        K[DatabaseSave]
        L[ErrorRecovery]
    end
    
    A --> G
    C --> H
    H --> I
    I --> D
    D --> J
    J --> K
    K --> L
    L --> D
    
    G --> D
    D --> E
    E --> F
```

## 5. Database Schema

```mermaid
erDiagram
    CV_DOCUMENT {
        string id PK
        string userId FK
        object parsedData
        object placeholderValues
        object placeholderMetadata
        timestamp updatedAt
        timestamp createdAt
    }
    
    PLACEHOLDER_VALUES {
        string fieldPath
        string placeholderKey
        string value
        timestamp updatedAt
        string updatedBy
    }
    
    PLACEHOLDER_METADATA {
        number totalPlaceholders
        number completedPlaceholders
        timestamp lastUpdated
        object completionStats
    }
    
    CV_DOCUMENT ||--o{ PLACEHOLDER_VALUES : contains
    CV_DOCUMENT ||--|| PLACEHOLDER_METADATA : has
```

## 6. State Transition Diagram

```mermaid
stateDiagram-v2
    [*] --> Rendered
    Rendered --> Hovering : mouse_enter
    Hovering --> Rendered : mouse_leave
    Hovering --> Editing : click
    Rendered --> Editing : click
    
    Editing --> Validating : input_change
    Validating --> Editing : validation_result
    Validating --> Error : validation_failed
    Error --> Editing : user_fixes_input
    
    Editing --> Saving : blur/enter
    Saving --> Saved : save_success
    Saving --> Error : save_failed
    Saved --> Rendered : auto_transition
    Error --> Editing : retry
    
    Editing --> Rendered : escape/cancel
```

## 7. API Integration Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant S as CVUpdateService
    participant V as ValidationService
    participant F as Firebase Function
    participant D as Firestore

    C->>S: updatePlaceholder(jobId, fieldPath, value)
    S->>V: validatePlaceholderValue(type, value)
    V-->>S: validation_result
    
    alt validation_success
        S->>F: updateCVData({jobId, updateData})
        F->>D: doc.update({placeholderValues})
        D-->>F: success
        F-->>S: {success: true, data}
        S-->>C: success_response
    else validation_failed
        V-->>S: validation_errors
        S-->>C: error_response
    end
    
    alt network_error
        F-->>S: network_error
        S->>S: retry_mechanism
        S-->>C: retry_or_error
    end
```

## 8. Error Handling Flow

```mermaid
flowchart TD
    A[User Input] --> B{Valid Input?}
    B -->|No| C[Show Validation Error]
    C --> A
    B -->|Yes| D[Optimistic Update]
    D --> E[Save to Database]
    E --> F{Save Success?}
    F -->|Yes| G[Confirm UI State]
    F -->|No| H{Retry Possible?}
    H -->|Yes| I[Exponential Backoff]
    I --> E
    H -->|No| J[Revert UI State]
    J --> K[Show Error Message]
    K --> L[User Can Retry]
    L --> A
```

## 9. Performance Optimization Strategy

```mermaid
graph TB
    subgraph "Client Optimizations"
        A[Debounced Saves]
        B[Optimistic Updates]
        C[Local Caching]
        D[Request Batching]
    end
    
    subgraph "Network Optimizations"
        E[Compression]
        F[Connection Pooling]
        G[CDN Caching]
        H[Request Deduplication]
    end
    
    subgraph "Server Optimizations"
        I[Database Indexing]
        J[Query Optimization]
        K[Response Caching]
        L[Load Balancing]
    end
    
    A --> E
    B --> F
    C --> G
    D --> H
    E --> I
    F --> J
    G --> K
    H --> L
```

## 10. Security Architecture

```mermaid
graph TD
    subgraph "Input Security"
        A[XSS Prevention]
        B[Input Sanitization]
        C[Length Validation]
        D[Type Checking]
    end
    
    subgraph "Access Control"
        E[User Authentication]
        F[CV Ownership Verification]
        G[Rate Limiting]
        H[Audit Logging]
    end
    
    subgraph "Data Security"
        I[Encryption at Rest]
        J[Encryption in Transit]
        K[Data Validation]
        L[Backup Security]
    end
    
    A --> E
    B --> F
    C --> G
    D --> H
    E --> I
    F --> J
    G --> K
    H --> L
```