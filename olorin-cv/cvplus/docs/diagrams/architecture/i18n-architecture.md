# Internationalization (i18n) Architecture Diagrams

## i18n System Architecture

```mermaid
graph TB
    subgraph "Frontend Application"
        A[React App] --> B[i18n Provider]
        B --> C[Language Detector]
        B --> D[Translation Engine]
        
        C --> E[Browser Language]
        C --> F[User Preference]
        C --> G[URL Parameter]
        
        D --> H[Static Translations]
        D --> I[Dynamic Translations]
        D --> J[Lazy Loading]
    end
    
    subgraph "Translation Resources"
        K[/locales/en/*.json]
        L[/locales/es/*.json]
        M[/locales/fr/*.json]
        N[/locales/de/*.json]
        O[/locales/ar/*.json]
    end
    
    subgraph "Backend Services"
        P[Google Translate API]
        Q[Translation Cache]
        R[Custom Translations DB]
    end
    
    H --> K
    H --> L
    H --> M
    I --> P
    P --> Q
```

## Language Detection Flow

```mermaid
flowchart TD
    A[User Visits Site] --> B{Saved Preference?}
    B -->|Yes| C[Load Saved Language]
    B -->|No| D{URL Parameter?}
    D -->|Yes| E[Use URL Language]
    D -->|No| F{Browser Language?}
    F -->|Yes| G[Detect Browser Lang]
    F -->|No| H[Use Default English]
    
    C --> I[Load Translations]
    E --> I
    G --> J{Language Supported?}
    H --> I
    J -->|Yes| I
    J -->|No| H
    
    I --> K[Initialize i18n]
    K --> L[Render App]
    L --> M{User Changes Language?}
    M -->|Yes| N[Update Preference]
    N --> O[Reload Translations]
    O --> L
    M -->|No| P[Continue]
```

## Translation Loading Strategy

```mermaid
sequenceDiagram
    participant U as User
    participant A as App
    participant I as i18n
    participant C as Cache
    participant S as Server
    participant G as Google API
    
    U->>A: Select Language
    A->>I: Change Language
    I->>C: Check Cache
    
    alt Translations Cached
        C-->>I: Return Cached
        I-->>A: Apply Translations
    else Not Cached
        I->>S: Fetch Translations
        S-->>I: Static Translations
        I->>C: Store in Cache
        I-->>A: Apply Translations
    end
    
    Note over A: For Dynamic Content
    A->>S: Request Translation
    S->>G: Translate via API
    G-->>S: Translated Text
    S->>C: Cache Translation
    S-->>A: Return Translation
```

## Component Translation Flow

```mermaid
graph LR
    subgraph "Component"
        A[useTranslation Hook] --> B[t Function]
        B --> C[Translation Key]
        C --> D[Interpolation]
    end
    
    subgraph "i18n System"
        E[Namespace] --> F[Language File]
        F --> G[Translation Value]
        G --> H[Formatted Output]
    end
    
    C --> E
    D --> H
    H --> I[Rendered Text]
    
    style A fill:#22d3ee
    style B fill:#22d3ee
    style I fill:#10b981
```

## RTL Support Architecture

```mermaid
graph TD
    A[Language Change] --> B{Is RTL?}
    
    B -->|Yes| C[Arabic/Hebrew/Farsi]
    C --> D[Set dir='rtl']
    D --> E[Apply RTL Styles]
    E --> F[Mirror Layout]
    F --> G[Flip Icons]
    G --> H[Adjust Alignment]
    
    B -->|No| I[LTR Languages]
    I --> J[Set dir='ltr']
    J --> K[Standard Styles]
    
    subgraph "RTL Transformations"
        L[margin-left ➔ margin-right]
        M[text-align: left ➔ right]
        N[float: left ➔ right]
        O[border-left ➔ border-right]
        P[padding-left ➔ padding-right]
    end
    
    H --> L
    H --> M
    H --> N
    H --> O
    H --> P
```

## Translation Management Workflow

```mermaid
gitGraph
    commit id: "Base English"
    branch translations
    checkout translations
    commit id: "Extract Keys"
    commit id: "Send to Translators"
    
    branch spanish
    checkout spanish
    commit id: "Spanish Translations"
    
    branch french
    checkout french
    commit id: "French Translations"
    
    branch german
    checkout german
    commit id: "German Translations"
    
    checkout translations
    merge spanish
    merge french
    merge german
    commit id: "Review Translations"
    
    checkout main
    merge translations
    commit id: "Deploy i18n"
```

## Dynamic Content Translation

```mermaid
flowchart TD
    A[CV Content] --> B{Language Selected}
    
    B -->|English| C[Display Original]
    
    B -->|Other| D[Check Cache]
    D -->|Hit| E[Return Cached]
    D -->|Miss| F[Translate via API]
    
    F --> G[Google Translate]
    G --> H[Translated Content]
    H --> I[Store in Cache]
    I --> J[Display Translation]
    
    subgraph "Translatable Content"
        K[Summary]
        L[Experience Descriptions]
        M[Skills]
        N[Achievements]
        O[Education Details]
    end
    
    A --> K
    A --> L
    A --> M
    A --> N
    A --> O
```

## Localization Features

```mermaid
graph TB
    subgraph "Localization System"
        A[i18n Core] --> B[Text Translation]
        A --> C[Date Formatting]
        A --> D[Number Formatting]
        A --> E[Currency Display]
        A --> F[Time Zones]
        A --> G[Pluralization]
    end
    
    subgraph "Examples"
        B --> B1["Hello → Hola"]
        C --> C1["8/25/2025 → 25/08/2025"]
        D --> D1["1,234.56 → 1.234,56"]
        E --> E1["$100 → 100€"]
        F --> F1["PST → CET"]
        G --> G1["1 item → 2 items"]
    end
    
    subgraph "Regional Variants"
        H[en-US vs en-GB]
        I[es-ES vs es-MX]
        J[pt-PT vs pt-BR]
        K[zh-CN vs zh-TW]
    end
```

## Translation Performance Optimization

```mermaid
graph LR
    subgraph "Loading Strategy"
        A[Initial Load] --> B[Common Namespace]
        B --> C[Current Language Only]
        C --> D[Lazy Load Features]
    end
    
    subgraph "Caching Layers"
        E[Browser Cache]
        F[LocalStorage]
        G[Service Worker]
        H[CDN Cache]
    end
    
    subgraph "Bundle Optimization"
        I[Code Splitting]
        J[Tree Shaking]
        K[Compression]
        L[CDN Delivery]
    end
    
    D --> E
    E --> F
    F --> G
    G --> H
    
    C --> I
    I --> J
    J --> K
    K --> L
```

## Language Selector Component

```mermaid
stateDiagram-v2
    [*] --> Closed
    Closed --> Opening : Click
    Opening --> Open : Animation Complete
    Open --> Selecting : Hover Option
    Selecting --> Selected : Click Option
    Selected --> Updating : Change Language
    Updating --> Loading : Fetch Translations
    Loading --> Applied : Translations Loaded
    Applied --> Closing : Update Complete
    Closing --> Closed : Animation Complete
    
    Open --> Closing : Click Outside
    Open --> Closing : Press Escape
```