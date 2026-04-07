"""Domain config: Payment, Stripe, IAP, device auth, and migration fields."""
from pydantic import Field


class PaymentsConfigMixin:
    """Payment flow, Stripe, IAP, device auth, migration, and rollback configuration."""

    # Stripe
    STRIPE_API_KEY: str = ""
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_PLUS_MONTHLY: str = ""
    STRIPE_PRICE_PLUS_YEARLY: str = ""

    # Apple App Store Server API (IAP verification)
    APPLE_APP_STORE_ISSUER_ID: str = ""
    APPLE_APP_STORE_KEY_ID: str = ""
    APPLE_APP_STORE_PRIVATE_KEY: str = ""

    # Google Play Developer API (IAP verification)
    GOOGLE_PLAY_PACKAGE_NAME: str = ""

    # IAP Plus product identifiers (comma-separated)
    IAP_PLUS_PRODUCT_IDS: str = "tv.bayit.plus.monthly,tv.bayit.plus.yearly"

    # App Store environment: Production or Sandbox
    APPLE_APP_STORE_ENVIRONMENT: str = "Production"

    # Guest Demo (unauthenticated Pause & Ask)
    DEMO_CONTENT_ID: str = Field(
        default="",
        env="DEMO_CONTENT_ID",
        description="Content ID for the pre-loaded demo video (e.g. BTTF)"
    )
    DEMO_PORTAL_ORIGINS: str = Field(
        default="",
        env="DEMO_PORTAL_ORIGINS",
        description="Comma-separated origins for the demo portal (bypass tier gating)"
    )
    GUEST_DEMO_MAX_INTERACTIONS: int = Field(
        default=10,
        env="GUEST_DEMO_MAX_INTERACTIONS",
        description="Maximum lifetime interactions for unauthenticated demo users"
    )
    DEMO_FEATURE_MAX_USES: int = Field(
        default=3,
        env="DEMO_FEATURE_MAX_USES",
        description="Max uses per AI feature for registered demo portal users",
    )
    DEMO_VIDEO_MAX_UPLOAD_MB: int = Field(
        default=100,
        env="DEMO_VIDEO_MAX_UPLOAD_MB",
        description="Maximum video file upload size in MB for demo portal users",
    )
    DEMO_VIDEO_MAX_DURATION_SECONDS: int = Field(
        default=600,
        env="DEMO_VIDEO_MAX_DURATION_SECONDS",
        description="Maximum video duration in seconds for demo processing (longer videos are truncated)",
    )

    # Consumer URL Submission (unauthenticated)
    CONSUMER_DEMO_MAX_SUBMISSIONS: int = Field(
        default=3,
        description="Maximum URL submissions per fingerprint (lifetime)",
    )
    CONSUMER_DEMO_TTL_HOURS: int = Field(
        default=24,
        description="Hours before consumer-submitted content is cleaned up",
    )

    # Consumer URL Submission (authenticated, per-tier limits)
    CONSUMER_SUBMIT_LIMIT_FREE: int = Field(
        default=3,
        description="Maximum URL submissions for free tier (lifetime)",
    )
    CONSUMER_SUBMIT_LIMIT_FAN: int = Field(
        default=10,
        description="Maximum URL submissions for fan tier (lifetime)",
    )
    CONSUMER_SUBMIT_LIMIT_SUPERFAN: int = Field(
        default=50,
        description="Maximum URL submissions for superfan tier (lifetime)",
    )

    # Internal API key for Cloud Scheduler-triggered endpoints
    INTERNAL_CRON_API_KEY: str = Field(
        default="",
        env="INTERNAL_CRON_API_KEY",
        description="API key for internal cron/scheduler endpoints"
    )

    # ==========================================
    # PAYMENT FLOW FEATURE FLAGS
    # ==========================================
    REQUIRE_PAYMENT_ON_SIGNUP: bool = Field(
        default=False,  # Safe default - disabled until explicitly enabled
        env="REQUIRE_PAYMENT_ON_SIGNUP",
        description="Require immediate payment during signup (mandatory subscription model)"
    )

    REQUIRE_PAYMENT_ON_SIGNUP_PERCENTAGE: int = Field(
        default=0,  # 0% = disabled, 100% = all users
        env="REQUIRE_PAYMENT_ON_SIGNUP_PERCENTAGE",
        description="Percentage of new signups requiring payment (0-100) for gradual rollout"
    )

    # ==========================================
    # PAYMENT FLOW CONFIGURATION
    # ==========================================
    SIGNUP_TRIAL_PERIOD_DAYS: int = Field(
        default=7,
        env="SIGNUP_TRIAL_PERIOD_DAYS",
        description="Free trial duration for new signups (days)"
    )

    FRONTEND_URL: str = Field(
        default="http://localhost:3000",
        env="FRONTEND_URL",
        description="Frontend base URL for payment redirects"
    )

    PAYMENT_SUCCESS_PATH: str = Field(
        default="/payment/success",
        env="PAYMENT_SUCCESS_PATH",
        description="Frontend path for successful payment redirect"
    )

    PAYMENT_CANCELLED_PATH: str = Field(
        default="/payment/cancelled",
        env="PAYMENT_CANCELLED_PATH",
        description="Frontend path for cancelled payment redirect"
    )

    PAYMENT_STATUS_POLL_INTERVAL_MS: int = Field(
        default=5000,  # 5 seconds
        env="PAYMENT_STATUS_POLL_INTERVAL_MS",
        description="Frontend polling interval for payment status (milliseconds)"
    )

    PAYMENT_PENDING_CLEANUP_DAYS: int = Field(
        default=7,
        env="PAYMENT_PENDING_CLEANUP_DAYS",
        description="Delete abandoned signups with payment_pending after N days"
    )

    PAYMENT_CHECKOUT_SESSION_TTL_HOURS: int = Field(
        default=24,
        env="PAYMENT_CHECKOUT_SESSION_TTL_HOURS",
        description="Stripe checkout session expiration (hours)"
    )

    # ==========================================
    # DEVICE CODE AUTH (RFC 8628 - TV Login)
    # ==========================================
    DEVICE_CODE_EXPIRY_SECONDS: int = Field(
        default=600,
        env="DEVICE_CODE_EXPIRY_SECONDS",
        description="Device code TTL in seconds (default 10 minutes)"
    )

    DEVICE_CODE_POLL_INTERVAL_SECONDS: int = Field(
        default=5,
        env="DEVICE_CODE_POLL_INTERVAL_SECONDS",
        description="Minimum poll interval for device code auth (seconds)"
    )

    # ==========================================
    # MIGRATION CONFIGURATION
    # ==========================================
    VIEWER_MIGRATION_BATCH_SIZE: int = Field(
        default=100,
        env="VIEWER_MIGRATION_BATCH_SIZE",
        description="Batch size for viewer-to-payment-pending migration"
    )

    # ==========================================
    # ROLLBACK CONFIGURATION
    # ==========================================
    PAYMENT_CONVERSION_THRESHOLD: float = Field(
        default=0.40,  # 40%
        env="PAYMENT_CONVERSION_THRESHOLD",
        description="Trigger rollback if payment conversion rate falls below this threshold"
    )

    # ==========================================
    # TRAINING PLATFORM STRIPE
    # ==========================================
    STRIPE_PRICE_TRAINING_TEAM: str = Field(
        default="",
        env="STRIPE_PRICE_TRAINING_TEAM",
        description="Stripe price ID for Training Team tier ($349/mo)",
    )
    STRIPE_PRICE_TRAINING_ORG: str = Field(
        default="",
        env="STRIPE_PRICE_TRAINING_ORG",
        description="Stripe price ID for Training Organization tier ($599/mo)",
    )
    STRIPE_WEBHOOK_SECRET_TRAINING: str = Field(
        default="",
        env="STRIPE_WEBHOOK_SECRET_TRAINING",
        description="Webhook signing secret for training checkout endpoint",
    )
    TRAINING_FRONTEND_URL: str = Field(
        default="",
        env="TRAINING_FRONTEND_URL",
        description="Training portal frontend URL for Stripe redirects",
    )
