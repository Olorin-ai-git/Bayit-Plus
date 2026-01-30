# Beta 500 Integration Guide

This guide shows how to integrate the Beta 500 components into your application.

## Components Overview

### 1. BetaEnrollmentModal
Reusable modal for Beta 500 enrollment with program status and benefits display.

### 2. BetaProgramsSettings
Settings page component for managing Beta enrollment and viewing program details.

### 3. BetaPostSignupWelcome
Post-signup component that invites new users to join Beta 500.

### 4. useBetaFeatureGate (Hook)
React hook for gating AI features behind Beta 500 enrollment.

## Integration Examples

### 1. Settings Integration

Add Beta Programs section to your Settings screen:

```tsx
import { BetaProgramsSettings } from '@bayit/shared/components/beta';

function SettingsScreen() {
  const user = useUser();

  const handleEnrollmentChange = async () => {
    // Refresh user status
    await refetchUser();
  };

  return (
    <ScrollView>
      {/* Existing settings sections */}

      <BetaProgramsSettings
        userStatus={{
          isEnrolled: user?.betaStatus?.isEnrolled,
          status: user?.betaStatus?.status,
          creditsRemaining: user?.betaStatus?.creditsRemaining,
          totalCredits: user?.betaStatus?.totalCredits,
          expiresAt: user?.betaStatus?.expiresAt,
        }}
        onEnrollmentChange={handleEnrollmentChange}
        apiBaseUrl="/api/v1"
      />
    </ScrollView>
  );
}
```

### 2. Feature Discovery Integration

Gate AI features with enrollment prompt:

```tsx
import { useBetaFeatureGate } from '@bayit/shared/hooks/useBetaFeatureGate';
import { BetaEnrollmentModal } from '@bayit/shared/components/beta';

function LiveDubbingButton() {
  const user = useUser();
  const {
    canAccess,
    showEnrollmentPrompt,
    requestFeatureAccess,
    dismissPrompt
  } = useBetaFeatureGate({
    feature: 'live_dubbing',
    isEnrolled: user?.betaStatus?.isEnrolled ?? false,
    onEnrollmentRequired: (feature) => {
      analytics.track('beta_enrollment_prompt', { feature });
    }
  });

  const handleStartDubbing = () => {
    requestFeatureAccess(); // Shows modal if not enrolled
    if (canAccess) {
      startLiveDubbing();
    }
  };

  return (
    <>
      <GlassButton onPress={handleStartDubbing}>
        Start Live Dubbing
      </GlassButton>

      <BetaEnrollmentModal
        visible={showEnrollmentPrompt}
        onClose={dismissPrompt}
        onEnroll={handleEnroll}
      />
    </>
  );
}
```

### 3. Post-Signup Welcome Integration

Show Beta welcome after signup completion:

```tsx
import { BetaPostSignupWelcome } from '@bayit/shared/components/beta';

function SignupFlow() {
  const [showBetaWelcome, setShowBetaWelcome] = useState(false);

  const handleSignupComplete = async (userData) => {
    await createUserAccount(userData);
    setShowBetaWelcome(true); // Invite to Beta 500
  };

  const handleBetaEnroll = async () => {
    await enrollInBeta500();
    await refetchUser();
  };

  return (
    <>
      <SignupForm onComplete={handleSignupComplete} />

      <BetaPostSignupWelcome
        visible={showBetaWelcome}
        onClose={() => setShowBetaWelcome(false)}
        onEnroll={handleBetaEnroll}
        apiBaseUrl="/api/v1"
        autoShowDelay={1500} // Optional: delay before showing
      />
    </>
  );
}
```

## API Integration

All components require these API endpoints:

### GET /api/v1/beta/status
Returns program status:
```json
{
  "totalSlots": 500,
  "filledSlots": 342,
  "availableSlots": 158,
  "isOpen": true,
  "programName": "Beta 500"
}
```

### POST /api/v1/beta/signup
Enrolls user in Beta 500:
```json
{
  "email": "user@example.com",
  "userId": "user-123"
}
```

### GET /api/v1/beta/credits/{userId}
Returns user's credit balance:
```json
{
  "userId": "user-123",
  "creditsRemaining": 4750,
  "totalCredits": 5000,
  "status": "active",
  "expiresAt": "2026-04-29T00:00:00Z"
}
```

## User Data Structure

Expected user beta status structure:

```typescript
interface UserBetaStatus {
  isEnrolled: boolean;
  status?: 'pending_verification' | 'active' | 'expired';
  creditsRemaining?: number;
  totalCredits?: number;
  expiresAt?: string; // ISO 8601 date string
}
```

## i18n Support

All components support English, Spanish, and Hebrew via react-i18next.

Translation keys are under `beta.*`:
- `beta.enrollment.*` - Enrollment modal
- `beta.settings.*` - Settings component
- `beta.credits.*` - Credit display

## TypeScript Types

Import types from shared package:

```typescript
import type {
  BetaEnrollmentModalProps,
  BetaProgramsSettingsProps,
  BetaPostSignupWelcomeProps,
  BetaFeature,
  UseBetaFeatureGateOptions,
  UseBetaFeatureGateReturn
} from '@bayit/shared/components/beta';
```

## Platform Support

All components work across:
- ✅ iOS (React Native)
- ✅ Android (React Native)
- ✅ tvOS (React Native)
- ✅ Web (React Native Web)

Components use StyleSheet.create() for React Native compatibility.
