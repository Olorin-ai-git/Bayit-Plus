# Create CVPlus Payments Submodule Task

## Objective
Create a new git submodule for the CVPlus payments package following the established patterns.

## Requirements

### GitHub Repository
- **Name**: cvplus-payments
- **Owner**: gilco1973  
- **SSH URL**: git@github.com:gilco1973/cvplus-payments.git
- **Visibility**: Private (following pattern of other CVPlus submodules)

### Local Submodule Configuration
- **Path**: packages/payments
- **Branch**: main (default)

### Package Structure to Create
```
packages/payments/
├── README.md
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── rollup.config.js (or tsup.config.ts)
└── src/
    ├── index.ts
    ├── backend/
    │   ├── functions/
    │   │   ├── index.ts
    │   │   ├── createCheckoutSession.ts
    │   │   ├── confirmPayment.ts
    │   │   ├── createPaymentIntent.ts
    │   │   ├── getUserSubscription.ts
    │   │   ├── checkFeatureAccess.ts
    │   │   └── handleStripeWebhook.ts
    │   └── services/
    │       ├── index.ts
    │       ├── stripe.service.ts
    │       ├── payment-processor.service.ts
    │       └── booking.service.ts
    ├── frontend/
    │   ├── components/
    │   │   ├── index.ts
    │   │   ├── PaymentForm.tsx
    │   │   └── BookingScheduler.tsx
    │   └── hooks/
    │       ├── index.ts
    │       ├── usePayment.ts
    │       └── useBooking.ts
    ├── types/
    │   ├── index.ts
    │   ├── payment.types.ts
    │   ├── booking.types.ts
    │   └── stripe.types.ts
    ├── constants/
    │   ├── index.ts
    │   └── payment.constants.ts
    └── utils/
        ├── index.ts
        └── payment-helpers.ts
```

## Functions to Migrate Later
These functions will be moved from `/functions/src/functions/` to the new payments submodule:

### Payment Functions (from payments/ directory)
- createCheckoutSession.ts
- confirmPayment.ts
- createPaymentIntent.ts
- getUserSubscription.ts
- checkFeatureAccess.ts
- handleStripeWebhook.ts

### Booking/Scheduling Functions (from root functions/)
- bookMeeting.ts
- sendSchedulingEmail.ts

## Package.json Template
Follow the pattern from other CVPlus submodules (auth, core, etc.) with:
- TypeScript dependencies
- Build scripts (build, dev, type-check)
- Proper exports configuration
- CVPlus specific dependencies

## Steps Required
1. Create GitHub repository cvplus-payments under gilco1973
2. Initialize repository with basic package structure
3. Add as git submodule at packages/payments
4. Commit submodule addition to main CVPlus repository
5. Verify submodule is properly configured

## Success Criteria
- [ ] GitHub repository created successfully
- [ ] Repository initialized with proper package structure  
- [ ] Submodule added to CVPlus main repository
- [ ] `git submodule status` shows the new payments submodule
- [ ] Package structure ready for function migration

## Notes
- Follow EXACTLY the same pattern as existing submodules (auth, core, multimedia, etc.)
- Use SSH URLs for submodule configuration
- Ensure proper .gitignore and package.json configuration
- This is preparation work - actual function migration will happen separately