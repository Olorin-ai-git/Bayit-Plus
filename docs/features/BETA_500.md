# Beta 500 Program

The Beta 500 program is a closed beta for testing AI features on the Bayit+ platform.

## Features

- **500 AI Credits**: Each beta user receives 500 credits
- **AI Search**: Enhanced content discovery powered by AI
- **AI Recommendations**: Personalized content suggestions
- **Auto-Enrollment**: Users with beta invitations are automatically enrolled during OAuth login
- **Credit Tracking**: Real-time credit balance display in UI

## API Endpoints

```bash
# Get current user's credit balance (authenticated)
GET /api/v1/beta/credits/balance
Response: {"balance": 500, "is_beta_user": true}

# Get specific user's credit balance (admin)
GET /api/v1/beta/credits/balance/{user_id}

# Deduct credits (internal)
POST /api/v1/beta/credits/deduct
```

## Testing Beta Enrollment

```bash
# 1. Create beta invitation
cd backend
poetry run python scripts/create_beta_invitation.py user@example.com

# 2. Delete existing user (for testing)
poetry run python scripts/delete_user.py user@example.com

# 3. Sign up with Google OAuth
# User will be auto-enrolled and receive 500 credits
```
