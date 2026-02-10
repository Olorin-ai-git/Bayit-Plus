# PHASE 1 CRITICAL FIXES - Remove All Mocks/Stubs

**CRITICAL**: The initial Phase 1 implementation contained placeholder/stub code which violates zero-tolerance rules. This document provides the COMPLETE fixes to remove ALL mocks/stubs and implement full Stripe SDK integration.

---

## Installation Requirements

### Step 1: Install Stripe React Native SDK

```bash
cd mobile-app
npm install @stripe/stripe-react-native
cd ios && pod install
cd ..
```

### Step 2: Configure Stripe Provider in App.tsx

Replace the App.tsx imports and wrap with StripeProvider:

```typescript
// mobile-app/App.tsx
import 'react-native-gesture-handler';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { StripeProvider } from '@stripe/stripe-react-native'; // ADD THIS
import { queryClient } from './src/config/queryConfig';
import { AppContent } from './src/components/AppContent';
import { ProductionErrorBoundary } from './src/components/ProductionErrorBoundary';

// Get Stripe publishable key from environment
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || '';

function App(): React.JSX.Element {
  return (
    <ProductionErrorBoundary>
      <SafeAreaProvider>
        <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
          <View style={styles.container}>
            <QueryClientProvider client={queryClient}>
              <NavigationContainer>
                <AppContent />
              </NavigationContainer>
            </QueryClientProvider>
          </View>
        </StripeProvider>
      </SafeAreaProvider>
    </ProductionErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d1a',
  },
});

export default App;
```

### Step 3: Add Environment Variable

Add to `mobile-app/.env`:
```
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
```

---

## Backend API Updates Required

Create new endpoint for mobile payment intents:

```python
# backend/app/api/v1/payments.py

from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.models.user import User
import stripe
import os

router = APIRouter()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

@router.post("/create-payment-intent")
async def create_payment_intent(
    plan_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Create Stripe Payment Intent for mobile checkout.
    Returns client_secret for Stripe SDK integration.
    """
    # Get plan price from config
    plan_prices = {
        "basic": 999,  # $9.99 in cents
        "premium": 1499,  # $14.99
        "family": 1999,  # $19.99
    }

    amount = plan_prices.get(plan_id, 999)

    # Get or create Stripe customer
    if not current_user.stripe_customer_id:
        customer = stripe.Customer.create(
            email=current_user.email,
            name=current_user.name,
            metadata={"user_id": str(current_user.id)}
        )
        current_user.stripe_customer_id = customer.id
        await current_user.save()
    else:
        customer = stripe.Customer.retrieve(current_user.stripe_customer_id)

    # Create ephemeral key
    ephemeral_key = stripe.EphemeralKey.create(
        customer=customer.id,
        stripe_version="2024-12-18.acacia"
    )

    # Create payment intent
    payment_intent = stripe.PaymentIntent.create(
        amount=amount,
        currency="usd",
        customer=customer.id,
        metadata={
            "user_id": str(current_user.id),
            "plan_id": plan_id
        },
        automatic_payment_methods={"enabled": True}
    )

    return {
        "payment_intent_secret": payment_intent.client_secret,
        "ephemeral_key": ephemeral_key.secret,
        "customer_id": customer.id,
    }
```

---

## Fixed Payment Screens (COMPLETE CODE)

### 1. PaymentCancelledScreen.tsx - FULL FIX

**REPLACE ENTIRE FILE** with:

```typescript
/**
 * PaymentCancelledScreen - Shown when user cancels payment
 * FULL STRIPE SDK INTEGRATION - NO PLACEHOLDERS
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useStripe } from '@stripe/stripe-react-native';
import { GlassButton } from '@bayit/shared/ui';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing } from '@olorin/design-tokens';
import { logger } from '@/utils/logger';
import api from '@/services/api';

const paymentLogger = logger.scope('PaymentCancelled');

export function PaymentCancelledScreen() {
  const { t } = useTranslation('payment');
  const { user, logout } = useAuthStore();
  const navigation = useNavigation();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTryAgain = async () => {
    setGenerating(true);
    setError(null);

    try {
      paymentLogger.info('User retrying payment after cancellation');

      // Get Stripe payment intent from backend
      const response = await api.post('/payments/create-payment-intent', {
        plan_id: user?.pending_plan_id || 'basic',
      });

      const { payment_intent_secret, ephemeral_key, customer_id } = response;

      // Initialize Stripe Payment Sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Bayit+',
        customerId: customer_id,
        customerEphemeralKeySecret: ephemeral_key,
        paymentIntentClientSecret: payment_intent_secret,
        allowsDelayedPaymentMethods: true,
        defaultBillingDetails: {
          name: user?.name,
          email: user?.email,
        },
      });

      if (initError) {
        paymentLogger.error('Failed to initialize payment sheet', initError);
        setError(initError.message);
        return;
      }

      // Present Stripe Payment Sheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === 'Canceled') {
          paymentLogger.info('User cancelled payment again');
          setError(t('cancelled.userCancelled', {
            defaultValue: 'Payment cancelled. You can try again when ready.'
          }));
        } else {
          paymentLogger.error('Payment failed', presentError);
          setError(presentError.message);
        }
      } else {
        // Payment successful!
        paymentLogger.info('Payment completed successfully');
        navigation.navigate('PaymentSuccess');
      }
    } catch (err) {
      paymentLogger.error('Failed to create payment intent', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to create payment session. Please try again.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleLogout = () => {
    paymentLogger.info('User logged out from payment cancelled screen');
    logout();
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <View style={[StyleSheet.absoluteFill, styles.backgroundGradient]} />
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <View style={styles.warningIconBg}>
            <Text style={styles.warningIcon}>✕</Text>
          </View>
        </View>
        <Text style={styles.title}>{t('cancelled.title')}</Text>
        <Text style={styles.description}>{t('cancelled.description')}</Text>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        <GlassButton
          variant="primary"
          onPress={handleTryAgain}
          disabled={generating}
          style={styles.tryAgainButton}
        >
          {generating ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
          ) : (
            <Text style={styles.tryAgainButtonText}>{t('cancelled.retry')}</Text>
          )}
        </GlassButton>
        <GlassButton
          variant="secondary"
          onPress={handleLogout}
          style={styles.logoutButton}
        >
          <Text style={styles.logoutButtonText}>{t('common.logout')}</Text>
        </GlassButton>
        <Text style={styles.helpText}>
          {t('cancelled.helpText', {
            defaultValue: 'Questions? Contact support@bayit.tv for assistance.',
          })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  backgroundGradient: { backgroundColor: '#7f1d1d', opacity: 0.3 },
  card: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', padding: spacing.xl, width: '100%', maxWidth: 500, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  iconContainer: { marginBottom: spacing.xl },
  warningIconBg: { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderRadius: 50, width: 100, height: 100, justifyContent: 'center', alignItems: 'center' },
  warningIcon: { fontSize: 48, color: '#ef4444', fontWeight: 'bold' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', marginBottom: spacing.md },
  description: { fontSize: 16, color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', marginBottom: spacing.lg, lineHeight: 24 },
  errorContainer: { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.5)', borderRadius: 12, padding: spacing.md, marginBottom: spacing.lg, width: '100%' },
  errorText: { color: '#fecaca', fontSize: 14, textAlign: 'center' },
  tryAgainButton: { width: '100%', backgroundColor: 'rgba(59, 130, 246, 0.9)', paddingVertical: spacing.md, borderRadius: 12, marginBottom: spacing.md },
  tryAgainButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#ffffff', fontSize: 16, marginLeft: spacing.sm },
  logoutButton: { width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)', paddingVertical: spacing.md, borderRadius: 12, marginBottom: spacing.lg },
  logoutButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '500', textAlign: 'center' },
  helpText: { fontSize: 12, color: 'rgba(255, 255, 255, 0.4)', textAlign: 'center', marginTop: spacing.md },
});

export default PaymentCancelledScreen;
```

### 2. PaymentPendingScreen.tsx - FULL FIX

**REPLACE** the `handleGenerateCheckout` function (lines 43-82) with:

```typescript
  const handleGenerateCheckout = async () => {
    setGenerating(true);
    setError(null);

    try {
      paymentLogger.info('Generating checkout', { planId });

      // Get Stripe payment intent from backend
      const response = await api.post('/payments/create-payment-intent', {
        plan_id: planId || 'basic',
      });

      const { payment_intent_secret, ephemeral_key, customer_id } = response;

      // Initialize Stripe Payment Sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Bayit+',
        customerId: customer_id,
        customerEphemeralKeySecret: ephemeral_key,
        paymentIntentClientSecret: payment_intent_secret,
        allowsDelayedPaymentMethods: true,
      });

      if (initError) {
        paymentLogger.error('Failed to initialize payment sheet', initError);
        setError(initError.message);
        return;
      }

      // Present Stripe Payment Sheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === 'Canceled') {
          paymentLogger.info('User cancelled payment');
          navigation.navigate('PaymentCancelled');
        } else {
          paymentLogger.error('Payment failed', presentError);
          setError(presentError.message);
        }
      } else {
        // Payment successful!
        paymentLogger.info('Payment completed successfully');
        navigation.navigate('PaymentSuccess');
      }
    } catch (err) {
      paymentLogger.error('Failed to generate checkout', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to create payment session. Please try again.'
      );
    } finally {
      setGenerating(false);
    }
  };
```

**ALSO ADD** import at top of file:

```typescript
import { useStripe } from '@stripe/stripe-react-native';
```

**ALSO ADD** inside component:

```typescript
const { initPaymentSheet, presentPaymentSheet } = useStripe();
```

### 3. SubscribeScreen.tsx - FULL FIX

**REPLACE** the `handleSubscribe` function (lines 32-47) with:

```typescript
  const handleSubscribe = useCallback(async () => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      subscribeLogger.info('Creating checkout session', { plan: selectedPlan, billing: billingPeriod });

      // Get Stripe payment intent from backend
      const response = await api.post('/payments/create-payment-intent', {
        plan_id: selectedPlan,
      });

      const { payment_intent_secret, ephemeral_key, customer_id } = response;

      // Initialize Stripe Payment Sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Bayit+',
        customerId: customer_id,
        customerEphemeralKeySecret: ephemeral_key,
        paymentIntentClientSecret: payment_intent_secret,
        allowsDelayedPaymentMethods: true,
      });

      if (initError) {
        subscribeLogger.error('Failed to initialize payment sheet', initError);
        setError(initError.message);
        return;
      }

      // Present Stripe Payment Sheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === 'Canceled') {
          subscribeLogger.info('User cancelled checkout');
          navigation.navigate('PaymentCancelled');
        } else {
          subscribeLogger.error('Payment failed', presentError);
          setError(presentError.message);
        }
      } else {
        // Payment successful!
        subscribeLogger.info('Payment completed successfully');
        navigation.navigate('PaymentSuccess');
      }
    } catch (err) {
      subscribeLogger.error('Failed to create checkout', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to create payment session. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, selectedPlan, billingPeriod, navigation, initPaymentSheet, presentPaymentSheet]);
```

**ALSO ADD** imports at top:

```typescript
import { useStripe } from '@stripe/stripe-react-native';
```

**ALSO ADD** inside component:

```typescript
const { initPaymentSheet, presentPaymentSheet } = useStripe();
```

---

## Testing After Fixes

### 1. Installation

```bash
cd mobile-app
npm install @stripe/stripe-react-native
cd ios && pod install && cd ..
```

### 2. Configure Environment

Add to `.env`:
```
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
```

### 3. Test Payment Flow

```typescript
// Use Stripe test card numbers
// Success: 4242 4242 4242 4242
// Decline: 4000 0000 0000 0002
// Requires 3DS: 4000 0025 0000 3155
```

### 4. Verify No Placeholders

Search codebase for forbidden patterns:
```bash
grep -r "TODO" mobile-app/src/screens/Payment*.tsx
grep -r "FIXME" mobile-app/src/screens/Payment*.tsx
grep -r "placeholder" mobile-app/src/screens/Payment*.tsx
grep -r "Please complete payment in a web browser" mobile-app/src/screens/*.tsx
```

Should return **ZERO** results.

---

## Verification Checklist

- [ ] Stripe SDK installed (`@stripe/stripe-react-native` in package.json)
- [ ] StripeProvider wrapping app in App.tsx
- [ ] STRIPE_PUBLISHABLE_KEY in `.env`
- [ ] Backend endpoint `/payments/create-payment-intent` implemented
- [ ] PaymentCancelledScreen uses `useStripe()` hook
- [ ] PaymentPendingScreen uses `useStripe()` hook
- [ ] SubscribeScreen uses `useStripe()` hook
- [ ] NO placeholder messages in any screen
- [ ] NO "TODO" comments in payment screens
- [ ] All screens use `initPaymentSheet` and `presentPaymentSheet`
- [ ] Error handling for payment failures
- [ ] Navigation to PaymentSuccess on success
- [ ] Navigation to PaymentCancelled on cancel
- [ ] Logging at all critical points
- [ ] Test card payments work end-to-end

---

## Commit Message

```
fix(mobile): Remove all mocks/stubs from payment screens, implement full Stripe SDK

BREAKING: Payment screens now require Stripe React Native SDK

- Install @stripe/stripe-react-native
- Implement full Stripe Payment Sheet integration
- Remove all placeholder/stub code
- Add backend payment intent endpoint
- Configure StripeProvider in App.tsx
- Add environment variable for publishable key

Screens fixed:
- PaymentCancelledScreen: Full Stripe retry flow
- PaymentPendingScreen: Full Stripe checkout flow
- SubscribeScreen: Full Stripe plan selection flow

CRITICAL FIX: This resolves zero-tolerance violation of NO MOCKS/STUBS rule

Test plan:
- Install SDK: npm install @stripe/stripe-react-native
- Configure .env with STRIPE_PUBLISHABLE_KEY
- Test payment flow with test cards
- Verify no placeholder messages remain

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

## Status

Once these fixes are applied:

- ✅ NO mocks/stubs/placeholders
- ✅ Full Stripe SDK integration
- ✅ Complete payment flows
- ✅ Error handling
- ✅ Logging
- ✅ Zero-tolerance compliance

**Phase 1 will be 100% COMPLETE with NO VIOLATIONS.**
