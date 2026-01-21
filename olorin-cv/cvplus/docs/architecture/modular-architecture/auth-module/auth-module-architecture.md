# Authentication Module Architecture Diagram

This diagram illustrates the comprehensive architecture of the @cvplus/auth module, showing the relationships between different components and services.

```mermaid
graph TB
    %% External Dependencies
    Firebase[Firebase Auth]
    GoogleOAuth[Google OAuth]
    Firestore[Firebase Firestore]
    
    %% Core Types Layer
    subgraph "Types Layer"
        UserTypes[User Types]
        SessionTypes[Session Types]
        PermissionTypes[Permission Types]
        PremiumTypes[Premium Types]
        AuthTypes[Auth Types]
    end
    
    %% Services Layer
    subgraph "Services Layer"
        AuthService[Auth Service]
        TokenService[Token Service]
        SessionService[Session Service]
        PermissionsService[Permissions Service]
        PremiumService[Premium Service]
        CalendarService[Calendar Service]
    end
    
    %% React Integration Layer
    subgraph "React Layer"
        AuthContext[Auth Context]
        UseAuth[useAuth Hook]
        UsePremium[usePremium Hook]
        UsePermissions[usePermissions Hook]
        UseSession[useSession Hook]
        UseCalendar[useCalendar Hook]
        
        AuthGuard[Auth Guard]
        SignInDialog[SignIn Dialog]
        UserMenu[User Menu]
        PermissionGate[Permission Gate]
    end
    
    %% Server Middleware Layer
    subgraph "Server Layer"
        AuthMiddleware[Auth Middleware]
        PremiumMiddleware[Premium Middleware]
        RateLimitMiddleware[Rate Limit Middleware]
    end
    
    %% Utilities Layer
    subgraph "Utils Layer"
        ValidationUtils[Validation Utils]
        EncryptionUtils[Encryption Utils]
        StorageUtils[Storage Utils]
        CacheUtils[Cache Utils]
        ErrorUtils[Error Utils]
    end
    
    %% Constants Layer
    subgraph "Constants Layer"
        AuthConstants[Auth Constants]
        PermissionConstants[Permission Constants]
        PremiumConstants[Premium Constants]
    end
    
    %% External System Connections
    Firebase --> AuthService
    GoogleOAuth --> AuthService
    Firestore --> SessionService
    Firestore --> PremiumService
    Firestore --> PermissionsService
    
    %% Service Dependencies
    AuthService --> TokenService
    AuthService --> SessionService
    SessionService --> CacheUtils
    TokenService --> EncryptionUtils
    PremiumService --> CacheUtils
    PermissionsService --> ValidationUtils
    CalendarService --> GoogleOAuth
    
    %% React Layer Dependencies
    AuthContext --> AuthService
    AuthContext --> SessionService
    AuthContext --> PremiumService
    
    UseAuth --> AuthContext
    UsePremium --> PremiumService
    UsePermissions --> PermissionsService
    UseSession --> SessionService
    UseCalendar --> CalendarService
    
    AuthGuard --> UseAuth
    SignInDialog --> UseAuth
    UserMenu --> UseAuth
    UserMenu --> UsePremium
    PermissionGate --> UsePermissions
    
    %% Server Layer Dependencies
    AuthMiddleware --> AuthService
    AuthMiddleware --> TokenService
    PremiumMiddleware --> PremiumService
    RateLimitMiddleware --> CacheUtils
    
    %% Utility Dependencies
    AuthService --> ValidationUtils
    AuthService --> ErrorUtils
    TokenService --> StorageUtils
    SessionService --> StorageUtils
    
    %% Constants Usage
    AuthService --> AuthConstants
    PermissionsService --> PermissionConstants
    PremiumService --> PremiumConstants
    
    %% Styling
    classDef external fill:#ff6b6b,stroke:#d63031,stroke-width:2px,color:#fff
    classDef types fill:#74b9ff,stroke:#0984e3,stroke-width:2px,color:#fff
    classDef services fill:#6c5ce7,stroke:#5f3dc4,stroke-width:2px,color:#fff
    classDef react fill:#a29bfe,stroke:#6c5ce7,stroke-width:2px,color:#fff
    classDef server fill:#fd79a8,stroke:#e84393,stroke-width:2px,color:#fff
    classDef utils fill:#00b894,stroke:#00a085,stroke-width:2px,color:#fff
    classDef constants fill:#fdcb6e,stroke:#e17055,stroke-width:2px,color:#fff
    
    class Firebase,GoogleOAuth,Firestore external
    class UserTypes,SessionTypes,PermissionTypes,PremiumTypes,AuthTypes types
    class AuthService,TokenService,SessionService,PermissionsService,PremiumService,CalendarService services
    class AuthContext,UseAuth,UsePremium,UsePermissions,UseSession,UseCalendar,AuthGuard,SignInDialog,UserMenu,PermissionGate react
    class AuthMiddleware,PremiumMiddleware,RateLimitMiddleware server
    class ValidationUtils,EncryptionUtils,StorageUtils,CacheUtils,ErrorUtils utils
    class AuthConstants,PermissionConstants,PremiumConstants constants
```

## Authentication Flow Diagram

```mermaid
sequenceDiagram
    participant User
    participant Frontend as Frontend App
    participant AuthModule as Auth Module
    participant Firebase as Firebase Auth
    participant Backend as Backend API
    participant Database as Firestore
    
    %% Initial Authentication
    User->>Frontend: Click Sign In
    Frontend->>AuthModule: signInWithGoogle()
    AuthModule->>Firebase: signInWithRedirect()
    Firebase->>User: Redirect to Google OAuth
    User->>Firebase: Grant permissions
    Firebase->>AuthModule: Return with tokens
    AuthModule->>Database: Store user data & tokens
    AuthModule->>Frontend: Authentication success
    
    %% Token Management
    Frontend->>AuthModule: API request needs token
    AuthModule->>AuthModule: Check token cache
    alt Token valid
        AuthModule->>Frontend: Return cached token
    else Token expired
        AuthModule->>Firebase: Refresh token
        Firebase->>AuthModule: New token
        AuthModule->>AuthModule: Update cache
        AuthModule->>Frontend: Return new token
    end
    
    %% API Request with Authentication
    Frontend->>Backend: API request with token
    Backend->>AuthModule: Validate token
    AuthModule->>Firebase: Verify token
    Firebase->>AuthModule: Token valid
    AuthModule->>Backend: Authentication confirmed
    
    %% Premium Status Check
    Backend->>AuthModule: Check premium status
    AuthModule->>Database: Query subscription
    Database->>AuthModule: Subscription data
    AuthModule->>Backend: Premium status
    Backend->>Frontend: API response with data
    
    %% Session Management
    AuthModule->>AuthModule: Monitor session
    AuthModule->>Database: Update last activity
    AuthModule->>Frontend: Session status update
```

## Permission System Diagram

```mermaid
graph LR
    %% User Roles
    subgraph "User Roles"
        Guest[Guest User]
        Authenticated[Authenticated User]
        Premium[Premium User]
        Admin[Admin User]
    end
    
    %% Permissions
    subgraph "Permissions"
        BasicFeatures[Basic Features]
        CVGeneration[CV Generation]
        WebPortal[Web Portal]
        AIChat[AI Chat]
        Podcast[Podcast Generation]
        VideoIntro[Video Introduction]
        Analytics[Advanced Analytics]
        AdminPanel[Admin Panel]
    end
    
    %% Role-Permission Mappings
    Guest --> BasicFeatures
    Authenticated --> BasicFeatures
    Authenticated --> CVGeneration
    
    Premium --> BasicFeatures
    Premium --> CVGeneration
    Premium --> WebPortal
    Premium --> AIChat
    Premium --> Podcast
    Premium --> VideoIntro
    Premium --> Analytics
    
    Admin --> BasicFeatures
    Admin --> CVGeneration
    Admin --> WebPortal
    Admin --> AIChat
    Admin --> Podcast
    Admin --> VideoIntro
    Admin --> Analytics
    Admin --> AdminPanel
    
    %% Styling
    classDef role fill:#6c5ce7,stroke:#5f3dc4,stroke-width:2px,color:#fff
    classDef permission fill:#00b894,stroke:#00a085,stroke-width:2px,color:#fff
    
    class Guest,Authenticated,Premium,Admin role
    class BasicFeatures,CVGeneration,WebPortal,AIChat,Podcast,VideoIntro,Analytics,AdminPanel permission
```

This architecture ensures:

1. **Separation of Concerns**: Clear boundaries between authentication, authorization, and premium features
2. **Modularity**: Each service has a single responsibility
3. **Extensibility**: Easy to add new authentication providers or features
4. **Type Safety**: Comprehensive TypeScript integration
5. **Framework Agnostic**: Core business logic independent of React/Firebase
6. **Security**: Multiple layers of validation and encryption
7. **Performance**: Caching and session optimization
8. **Maintainability**: Well-organized structure with clear dependencies