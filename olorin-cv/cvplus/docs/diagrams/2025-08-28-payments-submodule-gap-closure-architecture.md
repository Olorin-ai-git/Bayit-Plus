# CVPlus Payments Architecture Diagrams

## Current State vs Future State Architecture

### Current State (Problematic)

```mermaid
graph TB
    subgraph "Firebase Functions"
        F1[createPaymentIntent.ts]
        F2[createCheckoutSession.ts] 
        F3[handleStripeWebhook.ts]
        F4[getUserSubscription.ts]
        F5[checkFeatureAccess.ts]
        F6[confirmPayment.ts]
    end
    
    subgraph "Premium Module"
        PS[stripe.service.ts]
        PB[billing.service.ts]
        PT[stripe.types.ts]
    end
    
    subgraph "Frontend Services"
        FS[Mixed payment logic in premium]
    end
    
    subgraph "Issues"
        I1[Scattered Logic]
        I2[Only Stripe Support]
        I3[No Provider Abstraction]
        I4[Tight Coupling]
    end
    
    F1 -.-> PS
    F2 -.-> PS
    F3 -.-> PS
    FS -.-> PS
    
    style I1 fill:#ff6b6b
    style I2 fill:#ff6b6b
    style I3 fill:#ff6b6b
    style I4 fill:#ff6b6b
```

### Future State (Proposed Solution)

```mermaid
graph TB
    subgraph "Premium Module - Payment Services"
        subgraph "Provider Layer"
            BP[BasePaymentProvider]
            SP[StripePaymentProvider]
            PP[PayPalPaymentProvider]
        end
        
        subgraph "Service Layer"
            PF[PaymentProviderFactory]
            PPS[PaymentProcessorService]
            WDS[WebhookDispatcherService]
        end
        
        subgraph "Functions Layer"
            subgraph "Stripe Functions"
                SF1[createCheckoutSession.ts]
                SF2[handleWebhook.ts]
                SF3[manageSubscription.ts]
            end
            
            subgraph "PayPal Functions"
                PF1[createPayPalOrder.ts]
                PF2[handlePayPalWebhook.ts]
                PF3[managePayPalSubscription.ts]
            end
            
            subgraph "Core Functions"
                CF1[processPayment.ts]
                CF2[getUserSubscription.ts]
                CF3[checkFeatureAccess.ts]
            end
        end
    end
    
    subgraph "Frontend Components"
        PMC[PaymentMethodSelector]
        SPF[StripePaymentForm]
        PPB[PayPalPaymentButton]
        PS[PaymentStatus]
    end
    
    BP --> SP
    BP --> PP
    PF --> SP
    PF --> PP
    PPS --> PF
    WDS --> SP
    WDS --> PP
    
    CF1 --> PPS
    SF1 --> SP
    PF1 --> PP
    
    PMC --> SPF
    PMC --> PPB
    
    style BP fill:#4CAF50
    style PF fill:#4CAF50
    style PPS fill:#4CAF50
```

## Payment Provider Abstraction Architecture

```mermaid
classDiagram
    class BasePaymentProvider {
        <<abstract>>
        +name: string
        +displayName: string
        +supportedMethods: PaymentMethod[]
        +supportedCurrencies: string[]
        +createPaymentIntent(request)* PaymentIntent
        +processWebhook(payload, signature)* WebhookResult
        +refundPayment(paymentId, amount?)* RefundResult
        +getPaymentStatus(paymentId)* PaymentStatus
        #validateRequest(request) void
        #logPaymentEvent(event) void
    }
    
    class StripePaymentProvider {
        -stripe: Stripe
        +name: "stripe"
        +displayName: "Stripe"
        +supportedMethods: ["card", "sepa_debit", "ideal"]
        +createPaymentIntent(request) PaymentIntent
        +processWebhook(payload, signature) WebhookResult
        +refundPayment(paymentId, amount?) RefundResult
        +getPaymentStatus(paymentId) PaymentStatus
    }
    
    class PayPalPaymentProvider {
        -paypal: PayPalApi
        +name: "paypal"
        +displayName: "PayPal"
        +supportedMethods: ["paypal", "card", "venmo"]
        +createPaymentIntent(request) PaymentIntent
        +processWebhook(payload, signature) WebhookResult
        +refundPayment(paymentId, amount?) RefundResult
        +getPaymentStatus(paymentId) PaymentStatus
    }
    
    class PaymentProviderFactory {
        -providers: Map<string, BasePaymentProvider>
        +getProvider(name) BasePaymentProvider
        +getAllProviders() BasePaymentProvider[]
        +getSupportedProviders(currency) BasePaymentProvider[]
        -initializeProviders() void
    }
    
    class PaymentProcessorService {
        -providerFactory: PaymentProviderFactory
        -billingService: BillingService
        +processPayment(request) PaymentResult
        +handleWebhook(provider, payload, signature) WebhookResult
        -validatePaymentRequest(request) void
        -updateSubscriptionStatus(result) void
    }
    
    BasePaymentProvider <|-- StripePaymentProvider
    BasePaymentProvider <|-- PayPalPaymentProvider
    PaymentProviderFactory --> BasePaymentProvider
    PaymentProcessorService --> PaymentProviderFactory
```

## Payment Flow Sequence Diagrams

### Multi-Provider Payment Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant API as Payment API
    participant PPS as PaymentProcessor
    participant PF as ProviderFactory
    participant SP as StripeProvider
    participant PP as PayPalProvider
    participant B as BillingService
    
    U->>F: Select subscription plan
    F->>API: Get available providers
    API->>PF: getSupportedProviders(currency)
    PF-->>API: [Stripe, PayPal]
    API-->>F: Available providers
    
    U->>F: Choose PayPal
    F->>API: Create payment intent
    API->>PPS: processPayment(paypalRequest)
    PPS->>PF: getProvider("paypal")
    PF-->>PPS: PayPalProvider instance
    PPS->>PP: createPaymentIntent(request)
    PP->>PayPal: Create order
    PayPal-->>PP: Order with approval URL
    PP-->>PPS: PaymentIntent with redirectUrl
    PPS->>B: recordPaymentAttempt()
    PPS-->>API: PaymentResult with redirectUrl
    API-->>F: Payment result
    F->>U: Redirect to PayPal
    
    U->>PayPal: Complete payment
    PayPal->>API: Webhook notification
    API->>PPS: handleWebhook("paypal", payload)
    PPS->>PP: processWebhook(payload)
    PP-->>PPS: WebhookResult (success)
    PPS->>B: updatePaymentStatus("succeeded")
    PPS-->>API: Webhook processed
```

### Failover Scenario

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant API as Payment API
    participant PPS as PaymentProcessor
    participant HM as HealthMonitor
    participant SP as StripeProvider
    participant PP as PayPalProvider
    
    U->>F: Attempt payment
    F->>API: processPayment(stripeRequest)
    API->>PPS: processPayment()
    PPS->>HM: checkProviderHealth("stripe")
    HM-->>PPS: unhealthy
    
    Note over PPS: Automatic failover
    PPS->>HM: checkProviderHealth("paypal")
    HM-->>PPS: healthy
    
    PPS->>PP: createPaymentIntent(convertedRequest)
    PP-->>PPS: PaymentIntent
    PPS-->>API: PaymentResult (PayPal)
    API-->>F: Fallback to PayPal
    F->>U: Show PayPal option
```

## Frontend Component Architecture

```mermaid
graph TB
    subgraph "Payment UI Components"
        PMS[PaymentMethodSelector]
        SPF[StripePaymentForm]
        PPB[PayPalPaymentButton]
        PSt[PaymentStatus]
        PM[PaymentModal]
    end
    
    subgraph "Enhanced Premium Components"
        SP[SubscriptionPlans]
        BH[BillingHistory]
        UG[UpgradePrompt]
    end
    
    subgraph "Hooks"
        UP[usePayment]
        US[useSubscription]
        UB[useBilling]
    end
    
    subgraph "Services"
        PS[PaymentService]
        SS[SubscriptionService]
        BS[BillingService]
    end
    
    SP --> PM
    PM --> PMS
    PMS --> SPF
    PMS --> PPB
    PMS --> PSt
    
    UP --> PS
    US --> SS
    UB --> BS
    
    SPF --> UP
    PPB --> UP
    
    style PMS fill:#2196F3
    style UP fill:#4CAF50
    style PS fill:#FF9800
```

## Data Flow Architecture

```mermaid
flowchart TD
    subgraph "Client Layer"
        UI[Payment UI Components]
        H[Payment Hooks]
    end
    
    subgraph "API Layer"
        PE[Payment Endpoints]
        WE[Webhook Endpoints]
    end
    
    subgraph "Service Layer"
        PPS[PaymentProcessorService]
        WDS[WebhookDispatcherService]
        PAS[PaymentAnalyticsService]
    end
    
    subgraph "Provider Layer"
        SP[Stripe Provider]
        PP[PayPal Provider]
    end
    
    subgraph "External Services"
        Stripe[Stripe API]
        PayPal[PayPal API]
    end
    
    subgraph "Data Layer"
        FS[Firestore]
        AS[Analytics Store]
    end
    
    UI --> H
    H --> PE
    PE --> PPS
    PPS --> SP
    PPS --> PP
    SP --> Stripe
    PP --> PayPal
    
    Stripe --> WE
    PayPal --> WE
    WE --> WDS
    WDS --> PAS
    
    PPS --> FS
    PAS --> AS
    WDS --> FS
    
    style PPS fill:#4CAF50
    style WDS fill:#2196F3
    style FS fill:#FF9800
```

## Migration Timeline Visualization

```mermaid
gantt
    title CVPlus Payments Gap Closure Implementation
    dateFormat  YYYY-MM-DD
    section Foundation (Week 1-2)
    Code Migration           :foundation1, 2025-08-29, 7d
    Provider Abstraction     :foundation2, after foundation1, 7d
    
    section PayPal Integration (Week 3-4)
    PayPal Provider         :paypal1, after foundation2, 7d
    PayPal Components       :paypal2, after paypal1, 7d
    
    section Service Integration (Week 5)
    Provider Factory        :service1, after paypal2, 4d
    Payment Processor       :service2, after service1, 3d
    
    section Frontend (Week 6)
    Payment Selector        :frontend1, after service2, 4d
    Enhanced UI             :frontend2, after frontend1, 3d
    
    section Testing (Week 7)
    Test Suite             :testing1, after frontend2, 5d
    Security Validation    :testing2, after testing1, 2d
    
    section Deployment (Week 8)
    Staged Deployment      :deploy1, after testing2, 4d
    Monitoring Setup       :deploy2, after deploy1, 3d
```

## Risk Mitigation Architecture

```mermaid
graph TB
    subgraph "Risk Mitigation Components"
        HM[HealthMonitor]
        RLM[RateLimitManager]
        FB[FeatureFlagsBuffer]
        BU[BackupStrategy]
    end
    
    subgraph "Monitoring Systems"
        PM[PaymentMetrics]
        AL[AlertingLogic]
        EM[ErrorMonitoring]
    end
    
    subgraph "Fallback Mechanisms"
        PF[ProviderFailover]
        CS[CircuitSentry]
        RT[RetryTactics]
    end
    
    HM --> PF
    RLM --> CS
    FB --> RT
    
    PM --> AL
    AL --> EM
    
    PF --> PM
    CS --> EM
    RT --> PM
    
    style HM fill:#4CAF50
    style PF fill:#2196F3
    style PM fill:#FF9800
```

## Success Metrics Dashboard View

```mermaid
graph LR
    subgraph "Technical Metrics"
        SR[Success Rate > 95%]
        RT[Response Time < 500ms]
        FT[Failover Time < 30s]
        TC[Test Coverage > 90%]
    end
    
    subgraph "Business Metrics"  
        CR[Conversion Rate > 12%]
        PMD[PayMethod Diversity 40%]
        IR[Intl Revenue 25%]
        CS[Customer Satisfaction > 4.5]
    end
    
    subgraph "UX Metrics"
        PFC[Flow Completion > 85%]
        TTP[Time to Payment < 2min]
        ER[Error Rate < 3%]
        ST[Support Tickets < 5%]
    end
    
    SR --> Dashboard
    RT --> Dashboard
    FT --> Dashboard
    TC --> Dashboard
    
    CR --> Dashboard
    PMD --> Dashboard  
    IR --> Dashboard
    CS --> Dashboard
    
    PFC --> Dashboard
    TTP --> Dashboard
    ER --> Dashboard
    ST --> Dashboard
    
    style Dashboard fill:#4CAF50
```

These diagrams illustrate the comprehensive architectural transformation from the current scattered payment implementation to a robust, multi-provider payment system that maintains the premium module's cohesive structure while enabling future extensibility and international market expansion.