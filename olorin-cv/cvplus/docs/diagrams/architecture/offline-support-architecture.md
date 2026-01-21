# Offline Support Architecture Diagrams

## Service Worker Cache Flow

```mermaid
graph TD
    subgraph "Browser"
        A[User Request] --> B{Service Worker}
        B -->|Check Cache| C[Cache Storage]
        C -->|Hit| D[Return Cached Response]
        C -->|Miss| E[Network Request]
        E -->|Success| F[Update Cache]
        E -->|Failure| G[Offline Fallback]
        F --> H[Return Response]
        G --> I[Show Offline Page]
    end
    
    subgraph "Cache Strategies"
        J[Cache First<br/>Static Assets]
        K[Network First<br/>API Calls]
        L[Stale While Revalidate<br/>CV Data]
    end
    
    subgraph "Storage Layers"
        M[Service Worker Cache]
        N[IndexedDB]
        O[LocalStorage]
    end
```

## Background Sync Architecture

```mermaid
sequenceDiagram
    participant U as User
    participant A as App
    participant SW as Service Worker
    participant Q as Sync Queue
    participant S as Server
    
    U->>A: Perform Action (Offline)
    A->>Q: Add to Sync Queue
    A->>SW: Register Sync
    Note over SW: Wait for Connection
    SW-->>SW: Online Event
    SW->>Q: Get Pending Tasks
    loop Each Task
        SW->>S: Execute Task
        S-->>SW: Response
        SW->>Q: Remove Task
    end
    SW->>A: Sync Complete
    A->>U: Update UI
```

## PWA Architecture

```mermaid
graph TB
    subgraph "Progressive Web App"
        A[Web App] --> B[Service Worker]
        A --> C[Web App Manifest]
        A --> D[HTTPS]
        
        B --> E[Offline Support]
        B --> F[Background Sync]
        B --> G[Push Notifications]
        
        C --> H[Install Prompt]
        C --> I[App Icon]
        C --> J[Splash Screen]
        
        E --> K[Cache API]
        E --> L[IndexedDB]
        E --> M[LocalStorage]
    end
    
    subgraph "Features"
        N[Offline CV Viewing]
        O[Background Save]
        P[Push Updates]
        Q[App Installation]
    end
```

## Cache Strategy Decision Tree

```mermaid
graph TD
    A[Resource Request] --> B{Resource Type?}
    
    B -->|Static Assets| C[Cache First]
    C --> D[Check Cache]
    D -->|Found| E[Return Cached]
    D -->|Not Found| F[Fetch Network]
    F --> G[Update Cache]
    G --> H[Return Response]
    
    B -->|API Data| I[Network First]
    I --> J[Try Network]
    J -->|Success| K[Update Cache]
    J -->|Failure| L[Return Cached]
    K --> M[Return Fresh]
    
    B -->|User Content| N[Stale While Revalidate]
    N --> O[Return Cached]
    N --> P[Fetch Fresh]
    P --> Q[Update Cache]
    
    B -->|Media Files| R[Cache Then Network]
    R --> S[Show Cached]
    R --> T[Fetch Updates]
    T --> U[Replace Cached]
```

## IndexedDB Schema

```mermaid
erDiagram
    CVS ||--o{ FEATURES : has
    CVS ||--o{ MEDIA : contains
    CVS ||--o{ VERSIONS : tracks
    USERS ||--o{ CVS : owns
    
    USERS {
        string id PK
        string email
        string name
        json preferences
        datetime lastSync
    }
    
    CVS {
        string id PK
        string userId FK
        json data
        string status
        datetime createdAt
        datetime updatedAt
        datetime lastSynced
    }
    
    FEATURES {
        string id PK
        string cvId FK
        string type
        json config
        blob content
        datetime generatedAt
    }
    
    MEDIA {
        string id PK
        string cvId FK
        string type
        string url
        blob data
        number size
        datetime cachedAt
    }
    
    VERSIONS {
        string id PK
        string cvId FK
        number version
        json snapshot
        datetime savedAt
    }
```

## Sync Queue State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Queuing : Add Task
    Queuing --> Waiting : Task Added
    Waiting --> Syncing : Online & Has Tasks
    Syncing --> Processing : Start Sync
    Processing --> Success : Task Complete
    Processing --> Failed : Task Failed
    Success --> Waiting : More Tasks
    Success --> Idle : Queue Empty
    Failed --> Retrying : Retry Logic
    Retrying --> Processing : Retry Attempt
    Retrying --> Failed : Max Retries
    Failed --> Waiting : Skip Task
```