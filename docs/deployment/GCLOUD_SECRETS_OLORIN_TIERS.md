# GCloud Secrets — Olorin Pricing Tiers

Secrets required for the Olorin 4-tier pricing enforcement system.

## Backend Secrets (Bayit+ Backend / All Extracted Services)

| Secret Name                | Value  | Description                                          |
| -------------------------- | ------ | ---------------------------------------------------- |
| `FAN_MONTHLY_CREDITS`      | `100`  | Monthly AI credits for Olorin Fan tier ($12/mo)      |
| `SUPERFAN_MONTHLY_CREDITS` | `300`  | Monthly AI credits for Olorin Superfan tier ($35/mo) |
| `B2B_MONTHLY_CREDITS`      | `5000` | Monthly AI credits for Olorin B2B API tier ($399/mo) |

These override the defaults in `app/core/config.py`. The `FREE_MONTHLY_CREDITS` default was changed from 50 to 10 (lifetime, not monthly).

## Checkout-API Secrets (Firebase Functions)

| Secret Name                | Value                             | Description                                      |
| -------------------------- | --------------------------------- | ------------------------------------------------ |
| `BACKEND_INTERNAL_URL`     | `https://api.bayit.tv`            | Backend base URL for tier sync calls             |
| `BACKEND_INTERNAL_API_KEY` | _(same as INTERNAL_CRON_API_KEY)_ | Auth key for `/api/v1/internal/olorin-tier-sync` |

These enable the Stripe checkout fulfillment to sync tier changes to the backend.

## Sync Procedure

```bash
# Update secrets in GCloud
gcloud secrets versions add FAN_MONTHLY_CREDITS --data-file=-
gcloud secrets versions add SUPERFAN_MONTHLY_CREDITS --data-file=-
gcloud secrets versions add B2B_MONTHLY_CREDITS --data-file=-
gcloud secrets versions add BACKEND_INTERNAL_URL --data-file=-
gcloud secrets versions add BACKEND_INTERNAL_API_KEY --data-file=-

# Regenerate .env files
./scripts/sync-gcloud-secrets.sh

# Restart services
# Backend services pick up new env vars on next deploy
# Checkout-API (Firebase Functions) requires redeployment
```

## Tier Flow

```
User subscribes on olorin.ai pricing page
  -> Stripe Checkout session created (olorin-fan or olorin-superfan)
  -> Stripe webhook fires checkout.session.completed
  -> checkout-api records purchase in premium_purchases collection
  -> checkout-api calls POST /api/v1/internal/olorin-tier-sync
  -> Backend sets User.olorin_tier = "fan" or "superfan"
  -> Next monthly credit refill allocates tier-appropriate credits
```
