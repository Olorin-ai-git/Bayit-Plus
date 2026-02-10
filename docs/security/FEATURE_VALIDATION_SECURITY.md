# Feature Validation Security System

## Overview

The Bayit+ platform implements a **two-tier feature validation system** to prevent client-side bypass of security-critical features:

1. **Client-Side Flags** (Info.plist) - Fast UI hints, optimistic rendering
2. **Server-Side Validation** (API) - Authoritative security checks, cannot be bypassed

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ iOS/tvOS App (Client)                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Check Info.plist flag (fast)                                │
│     ├─ If disabled → Hide UI                                    │
│     └─ If enabled → Show UI (optimistic)                        │
│                                                                  │
│  2. Call Feature Validation API (authoritative)                 │
│     ├─ Server validates: credits, subscription, controls        │
│     ├─ If denied → Disable feature + show upgrade prompt        │
│     └─ If approved → Enable feature execution                   │
│                                                                  │
│  3. Execute Feature (only if both pass)                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ Backend API (Server) - AUTHORITATIVE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  POST /api/v1/features/validate/{feature_name}                  │
│                                                                  │
│  Validates:                                                      │
│  ├─ Beta 500: User enrolled + has credits                       │
│  ├─ Family Controls: Controls configured + time allowed         │
│  ├─ Premium Features: Subscription tier = premium/family        │
│  ├─ AI Features: Beta enrolled OR premium subscription          │
│  └─ UI Features: Always approved (no restrictions)              │
│                                                                  │
│  Returns: { "enabled": true/false, "reason": "..." }            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Critical Features Requiring Server Validation

| Feature | Validation Rule | Bypass Risk | Implementation Status |
|---------|----------------|-------------|----------------------|
| **Beta 500** | User enrolled + credits > 0 | ⚠️ **CRITICAL** - Financial impact | ✅ Implemented |
| **Family Controls** | Controls configured + time allowed | ⚠️ **CRITICAL** - Child safety | ✅ Implemented |
| **Live Dubbing** | Subscription tier = premium/family | ⚠️ **HIGH** - Revenue loss | ✅ Implemented |
| **Audiobooks** | Subscription tier = premium/family | ⚠️ **HIGH** - Revenue loss | ✅ Implemented |
| **LLM Search** | Beta enrolled OR premium | ⚠️ **HIGH** - API cost | ✅ Implemented |
| **Passkey** | User verified | ⚠️ **CRITICAL** - Auth security | ✅ Implemented |
| **Avatar Mode** | Beta enrolled OR premium | ⚠️ **HIGH** - AI cost | ✅ Implemented |
| **Proactive Voice** | Beta enrolled OR premium | ⚠️ **HIGH** - AI cost | ✅ Implemented |
| **Rewards** | User enrolled | ⚠️ **HIGH** - Financial | ✅ Implemented |
| **Household** | Subscription tier checked | ⚠️ **MEDIUM** - Data access | ✅ Implemented |
| **Device Pairing** | Device limit enforced | ⚠️ **MEDIUM** - Sharing abuse | ✅ Implemented |

## API Endpoints

### 1. Validate Single Feature

```bash
POST /api/v1/features/validate/{feature_name}
Authorization: Bearer <JWT_TOKEN>

# Example: Check Beta 500 access
curl -H "Authorization: Bearer eyJ..." \
     https://api.bayit.tv/api/v1/features/validate/beta_500
```

**Response:**
```json
{
  "feature": "beta_500",
  "enabled": true,
  "metadata": {
    "remaining_credits": 347
  }
}
```

### 2. Validate Multiple Features (Batch)

```bash
POST /api/v1/features/validate/batch
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "features": ["beta_500", "live_dubbing", "family_controls"]
}
```

**Response:**
```json
{
  "results": [
    {
      "feature": "beta_500",
      "enabled": true,
      "metadata": {"remaining_credits": 347}
    },
    {
      "feature": "live_dubbing",
      "enabled": false,
      "reason": "requires_premium_subscription",
      "metadata": {
        "current_tier": "free",
        "required_tiers": ["premium", "family"]
      }
    },
    {
      "feature": "family_controls",
      "enabled": true,
      "metadata": {
        "kids_enabled": true,
        "viewing_hours_enabled": true
      }
    }
  ]
}
```

### 3. Deduct Beta Credit

**CRITICAL:** This MUST be called BEFORE executing any AI-powered feature.

```bash
POST /api/v1/features/deduct-credit
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "feature": "ai_search"
}
```

**Response (Success):**
```json
{
  "success": true,
  "remaining_credits": 346,
  "message": "Credit deducted successfully"
}
```

**Response (Insufficient Credits):**
```json
HTTP 403 Forbidden

{
  "detail": "insufficient_credits"
}
```

## iOS Implementation

### Step 1: Add FeatureValidationService to DI

```swift
// BayitPlusApp.swift
@State private var featureValidationService: FeatureValidationService?

init() {
    // ... existing init
    _featureValidationService = State(initialValue: FeatureValidationService(
        apiClient: client
    ))
}

var body: some Scene {
    WindowGroup {
        ContentView()
            .environment(featureValidationService)
            // ... other environments
    }
}
```

### Step 2: Validate Before Feature Usage

```swift
// Example: Beta 500 AI Search
@Environment(FeatureFlags.self) private var featureFlags
@Environment(FeatureValidationService.self) private var featureValidation

func performAISearch(query: String) async {
    // Step 1: Client-side flag check (fast, optimistic)
    guard featureFlags.isBeta500Enabled else {
        showError("Beta 500 feature not available")
        return
    }

    // Step 2: Server-side validation (authoritative)
    do {
        let validation = try await featureValidation.validate(.beta500)
        guard validation.enabled else {
            if validation.reason == "insufficient_credits" {
                showUpgradePrompt("You're out of Beta 500 credits")
            } else {
                showError("Feature not available: \(validation.reason ?? "unknown")")
            }
            return
        }

        // Step 3: Deduct credit before execution
        let deduction = try await featureValidation.deductCredit(for: "ai_search")
        print("Credits remaining: \(deduction.remainingCredits)")

        // Step 4: Execute feature (now authorized)
        let results = try await performAISearchRequest(query)
        displayResults(results)

    } catch {
        showError("Feature validation failed: \(error)")
    }
}
```

### Step 3: Batch Validation (App Launch)

```swift
// AppDelegate or App init
func validateFeaturesOnLaunch() async {
    let criticalFeatures: [FeatureName] = [
        .beta500,
        .familyControls,
        .liveDubbing,
        .audiobooks,
        .llmSearch
    ]

    do {
        let response = try await featureValidation.validateBatch(criticalFeatures)

        for result in response.results {
            print("\(result.feature): \(result.enabled)")

            // Cache results for offline mode
            FeatureCache.set(result.feature, enabled: result.enabled)
        }
    } catch {
        // Use cached values or disable all features
        logger.error("Feature validation failed", error: error)
    }
}
```

## Security Best Practices

### ✅ DO

1. **Always validate server-side before executing critical features**
   ```swift
   let validation = try await featureValidation.validate(.beta500)
   if validation.enabled {
       // Execute feature
   }
   ```

2. **Deduct credits BEFORE execution (not after)**
   ```swift
   // ✅ CORRECT
   try await featureValidation.deductCredit(for: "ai_search")
   let results = try await aiSearch(query)

   // ❌ WRONG - user gets feature for free if deduction fails after
   let results = try await aiSearch(query)
   try await featureValidation.deductCredit(for: "ai_search")
   ```

3. **Cache validation results with TTL**
   ```swift
   struct FeatureCache {
       static func set(_ feature: String, enabled: Bool, ttl: TimeInterval = 300) {
           // Cache for 5 minutes
       }
   }
   ```

4. **Show upgrade prompts for disabled premium features**
   ```swift
   if validation.reason == "requires_premium_subscription" {
       showUpgradePrompt(
           title: "Premium Feature",
           message: "Upgrade to Premium to access Live Dubbing",
           action: "Upgrade Now"
       )
   }
   ```

### ❌ DON'T

1. **Don't trust client-side flags for security-critical features**
   ```swift
   // ❌ WRONG - can be bypassed
   if featureFlags.isBeta500Enabled {
       deductCredit()  // Attacker modified Info.plist
   }

   // ✅ CORRECT - server validates
   let validation = try await featureValidation.validate(.beta500)
   if validation.enabled {
       deductCredit()
   }
   ```

2. **Don't skip server validation for "performance"**
   ```swift
   // ❌ WRONG - creates security hole
   if cachedValidation.enabled {
       execute()  // Cache never expires, attacker exploits
   }

   // ✅ CORRECT - always validate critical features
   let validation = try await featureValidation.validate(.beta500)
   if validation.enabled {
       execute()
   }
   ```

3. **Don't execute features on validation error**
   ```swift
   // ❌ WRONG - fail-open (executes on error)
   let validation = try? await featureValidation.validate(.beta500)
   execute()  // Runs even if validation threw error

   // ✅ CORRECT - fail-closed (blocks on error)
   do {
       let validation = try await featureValidation.validate(.beta500)
       if validation.enabled {
           execute()
       }
   } catch {
       showError("Feature unavailable")
   }
   ```

## Testing

### Unit Tests

```swift
func testBeta500ValidationSuccess() async throws {
    // Given: User has credits
    mockAPIClient.stubbedResponse = ValidationResult(
        feature: "beta_500",
        enabled: true,
        metadata: ["remaining_credits": AnyCodable(347)]
    )

    // When: Validate feature
    let result = try await featureValidation.validate(.beta500)

    // Then: Feature is enabled
    XCTAssertTrue(result.enabled)
    XCTAssertNil(result.reason)
}

func testBeta500ValidationInsufficientCredits() async throws {
    // Given: User has no credits
    mockAPIClient.stubbedResponse = ValidationResult(
        feature: "beta_500",
        enabled: false,
        reason: "insufficient_credits",
        metadata: ["remaining_credits": AnyCodable(0)]
    )

    // When: Validate feature
    let result = try await featureValidation.validate(.beta500)

    // Then: Feature is disabled
    XCTAssertFalse(result.enabled)
    XCTAssertEqual(result.reason, "insufficient_credits")
}
```

### Integration Tests

```bash
# Test with real backend
cd ios-app
xcodebuild test \
  -scheme BayitPlusApp \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  -only-testing:BayitPlusTests/FeatureValidationIntegrationTests
```

## Monitoring & Alerts

### Metrics to Track

1. **Validation Success Rate**
   ```python
   feature_validation_success_rate = (
       successful_validations / total_validation_requests
   )
   # Alert if < 95%
   ```

2. **Credit Bypass Attempts**
   ```python
   bypass_attempts = (
       ai_feature_executions_without_credit_deduction
   )
   # Alert if > 0
   ```

3. **Family Controls Violations**
   ```python
   family_controls_violations = (
       kids_content_access_outside_viewing_hours
   )
   # Alert if > 0
   ```

### Logging

```python
# Backend logs all validation requests
logger.info(
    "Feature validation",
    extra={
        "user_id": user_id,
        "feature": feature_name,
        "enabled": result.enabled,
        "reason": result.reason,
        "metadata": result.metadata
    }
)
```

## Compliance

### COPPA (Children's Privacy)

Family Controls validation ensures:
- ✅ Content filtering by age rating (server-enforced)
- ✅ Viewing hour restrictions (server-enforced)
- ✅ Parent PIN verification (server-enforced)

### PCI DSS (Payment Security)

Subscription validation ensures:
- ✅ Premium features require valid subscription (server-enforced)
- ✅ Credit deduction tracked server-side (audit trail)

## Rollout Plan

### Phase 1: Beta Testing (Week 1)
- Enable validation for Beta 500 users only
- Monitor error rates and performance
- Gather feedback on UX

### Phase 2: Premium Features (Week 2)
- Enable validation for Live Dubbing, Audiobooks
- Monitor subscription upgrade conversions

### Phase 3: Family Controls (Week 3)
- Enable validation for all family controls
- Monitor child safety compliance

### Phase 4: Full Rollout (Week 4)
- Enable validation for all features
- Deprecate client-only flags

## Related Documentation

- [Beta Credits API](/docs/api/beta-credits.md)
- [Family Controls API](/docs/api/family-controls.md)
- [Subscription Management](/docs/api/subscriptions.md)
- [iOS Security Guidelines](/docs/security/ios-security.md)

---

**Last Updated:** 2026-02-10
**Status:** ✅ Implemented
**Security Review:** Approved by Security Team
