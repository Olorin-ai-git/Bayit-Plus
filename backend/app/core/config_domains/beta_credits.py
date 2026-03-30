"""Domain config: Beta 500 program, credit rates, playlists, quizzes, sessions, email, fraud."""
from pydantic import Field


class BetaCreditsConfigMixin:
    """Beta 500 closed beta, credit rates, playlist, quiz, session, email, and fraud config."""

    # BETA 500 CLOSED BETA PROGRAM
    BETA_MAX_USERS: int = Field(
        default=500, env="BETA_MAX_USERS",
        description="Maximum number of users allowed in Beta 500 program")
    BETA_AI_CREDITS: int = Field(
        default=5000, env="BETA_AI_CREDITS",
        description="Total AI credits allocated per beta user")
    BETA_DURATION_DAYS: int = Field(
        default=90, env="BETA_DURATION_DAYS",
        description="Duration of beta program in days")

    # Credit Rate Configuration
    CREDIT_RATE_LIVE_DUBBING: float = Field(
        default=1.0, env="CREDIT_RATE_LIVE_DUBBING",
        description="Credits consumed per second of live dubbing")
    CREDIT_RATE_AI_SEARCH: float = Field(
        default=10.0, env="CREDIT_RATE_AI_SEARCH",
        description="Credits per AI search query")
    CREDIT_RATE_AI_RECOMMENDATIONS: float = Field(
        default=5.0, env="CREDIT_RATE_AI_RECOMMENDATIONS",
        description="Credits per AI recommendation generation")
    CREDIT_RATE_COMPREHENSION_QUESTION: float = Field(
        default=1.0, env="CREDIT_RATE_COMPREHENSION_QUESTION",
        description="Credits per comprehension question")
    CREDIT_RATE_SUBTITLE_NIKUD: float = Field(
        default=15.0, env="CREDIT_RATE_SUBTITLE_NIKUD",
        description="Credits per nikud subtitle generation")
    CREDIT_RATE_SUBTITLE_SHORESH: float = Field(
        default=15.0, env="CREDIT_RATE_SUBTITLE_SHORESH",
        description="Credits per shoresh subtitle generation")
    CREDIT_RATE_SUBTITLE_HEBLISH: float = Field(
        default=15.0, env="CREDIT_RATE_SUBTITLE_HEBLISH",
        description="Credits per heblish subtitle generation")
    CREDIT_RATE_SUBTITLE_GRAMMAR_FLIP: float = Field(
        default=15.0, env="CREDIT_RATE_SUBTITLE_GRAMMAR_FLIP",
        description="Credits per grammar-flip subtitle generation")
    CREDIT_RATE_SUBTITLE_SLANG_SYNTHESIS: float = Field(
        default=15.0, env="CREDIT_RATE_SUBTITLE_SLANG_SYNTHESIS",
        description="Credits per slang-synthesis subtitle generation")
    CREDIT_RATE_SUBTITLE_ENGREW: float = Field(
        default=15.0, env="CREDIT_RATE_SUBTITLE_ENGREW",
        description="Credits per engrew subtitle generation")
    CREDIT_RATE_PHRASE_BREAKDOWN: float = Field(
        default=5.0, env="CREDIT_RATE_PHRASE_BREAKDOWN",
        description="Credits per phrase breakdown request")
    CREDIT_RATE_CULTURAL_DETECT: float = Field(
        default=5.0, env="CREDIT_RATE_CULTURAL_DETECT",
        description="Credits per cultural reference detection")
    CREDIT_RATE_CHAPTER_GENERATION: float = Field(
        default=10.0, env="CREDIT_RATE_CHAPTER_GENERATION",
        description="Credits per chapter generation request")
    CREDIT_RATE_CHAT_TRANSLATION: float = Field(
        default=3.0, env="CREDIT_RATE_CHAT_TRANSLATION",
        description="Credits per chat translation request")
    CREDIT_RATE_TALK_BACK_RESPOND: float = Field(
        default=5.0, env="CREDIT_RATE_TALK_BACK_RESPOND",
        description="Credits per Talk Back voice response evaluation")
    CREDIT_RATE_BILINGUAL_SESSION: float = Field(
        default=10.0, env="CREDIT_RATE_BILINGUAL_SESSION",
        description="Credits per bilingual dubbing session start")
    CREDIT_RATE_BILINGUAL_TRANSLATE: float = Field(
        default=3.0, env="CREDIT_RATE_BILINGUAL_TRANSLATE",
        description="Credits per bilingual segment translation")
    CREDIT_RATE_ZINE_GENERATION: float = Field(
        default=15.0, env="CREDIT_RATE_ZINE_GENERATION",
        description="Credits per AI weekly zine generation")

    # PLAYLIST CONFIGURATION
    PLAYLIST_MAX_ITEMS: int = Field(
        default=500, env="PLAYLIST_MAX_ITEMS",
        description="Maximum number of items per user playlist")

    # Comprehension Quiz Feature
    COMPREHENSION_QUIZ_ENABLED: bool = Field(
        default=True, env="COMPREHENSION_QUIZ_ENABLED",
        description="Enable scene-triggered comprehension questions")
    COMPREHENSION_QUIZ_ROLLOUT_PERCENTAGE: int = Field(
        default=100, env="COMPREHENSION_QUIZ_ROLLOUT_PERCENTAGE",
        description="Percentage of users with comprehension quiz (0-100)")

    # Credit Thresholds
    BETA_CREDIT_WARNING_THRESHOLD: int = Field(
        default=500, env="BETA_CREDIT_WARNING_THRESHOLD",
        description="Credit balance threshold for warning notification")
    BETA_CREDIT_CRITICAL_THRESHOLD: int = Field(
        default=100, env="BETA_CREDIT_CRITICAL_THRESHOLD",
        description="Credit balance threshold for critical alert")
    CREDIT_ABUSE_HOURLY_THRESHOLD: int = Field(
        default=500, env="CREDIT_ABUSE_HOURLY_THRESHOLD",
        description="Maximum credits per hour before flagging potential abuse")

    # Session Management
    SESSION_CHECKPOINT_INTERVAL_SECONDS: int = Field(
        default=30, env="SESSION_CHECKPOINT_INTERVAL_SECONDS",
        description="Interval in seconds between credit checkpoint updates during live dubbing")
    SESSION_CLEANUP_INTERVAL_SECONDS: int = Field(
        default=300, env="SESSION_CLEANUP_INTERVAL_SECONDS",
        description="Interval for background worker to clean up orphaned sessions")
    SESSION_TIMEOUT_SECONDS: int = Field(
        default=3600, env="SESSION_TIMEOUT_SECONDS",
        description="Maximum inactive session duration before auto-termination")

    # Email Verification
    EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS: int = Field(
        default=24, env="EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS",
        description="Expiration time for email verification tokens (hours)")
    EMAIL_VERIFICATION_SECRET_KEY: str = Field(
        default="",  # MUST be set via GCloud Secret Manager in production
        env="EMAIL_VERIFICATION_SECRET_KEY",
        description="Secret key for HMAC-SHA256 email verification token signing (64+ hex chars)")

    # Fraud Detection
    DISPOSABLE_EMAIL_DOMAINS: str = Field(
        default="tempmail.com,10minutemail.com,guerrillamail.com,mailinator.com,throwaway.email",
        env="DISPOSABLE_EMAIL_DOMAINS",
        description="Comma-separated list of disposable email domains to block")

    # Beta Program URLs
    BETA_LANDING_PAGE_URL: str = Field(
        default="https://bayitplus.com/beta-500", env="BETA_LANDING_PAGE_URL",
        description="URL for beta program landing page")
    BETA_SUPPORT_EMAIL: str = Field(
        default="beta@bayitplus.com", env="BETA_SUPPORT_EMAIL",
        description="Support email address for beta users")

    @property
    def disposable_email_domains_list(self) -> list[str]:
        """Parse comma-separated disposable email domains into a list."""
        return [
            domain.strip()
            for domain in self.DISPOSABLE_EMAIL_DOMAINS.split(",")
            if domain.strip()
        ]
