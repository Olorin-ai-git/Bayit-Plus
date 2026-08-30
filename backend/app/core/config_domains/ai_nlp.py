"""Domain config: AI, NLP, and language processing."""
from typing import Literal

from pydantic import AliasChoices, Field, SecretStr


class AINLPConfigMixin:
    """AI, NLP, and language processing configuration fields."""

    # Anthropic (Claude)
    ANTHROPIC_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-haiku-4-5-20251001"
    CLAUDE_MAX_TOKENS_SHORT: int = 200
    CLAUDE_MAX_TOKENS_LONG: int = 500
    CHESS_BOT_CHAT_LIMIT: int = 10
    CHESS_BOT_CHAT_MAX_TOKENS: int = 150

    # Erebor Phase D provider routing is explicitly opt-in. The four connection
    # values are validated as an all-or-none group by Settings so a partially
    # configured service cannot silently bypass Gate 1.
    TWOGATES_ROUTING_ENABLED: bool = False
    TWOGATES_PROXY_URL: SecretStr = SecretStr("")
    TWOGATES_PROXY_CREDENTIAL: SecretStr = SecretStr("")
    TWOGATES_CA_CERT_PEM: SecretStr = SecretStr("")
    TWOGATES_TASK_CLASS: Literal["", "cheap_bulk", "standard", "heavy"] = ""
    TWOGATES_CONNECT_TIMEOUT_SECONDS: float = Field(default=5.0, gt=0, le=60)
    TWOGATES_REQUEST_TIMEOUT_SECONDS: float = Field(default=60.0, gt=0, le=600)
    TWOGATES_PROVIDER_MAX_ATTEMPTS: int = Field(default=3, ge=1, le=6)
    TWOGATES_MAX_CONNECTIONS: int = Field(default=100, ge=1, le=1000)
    TWOGATES_MAX_KEEPALIVE_CONNECTIONS: int = Field(default=20, ge=0, le=1000)
    TWOGATES_KEEPALIVE_EXPIRY_SECONDS: float = Field(default=5.0, gt=0, le=300)

    # Subtitle AI Processing (Nikud & Shoresh)
    SUBTITLE_AI_MODEL: str = Field(
        default="claude-sonnet-4-20250514",
        env="SUBTITLE_AI_MODEL",
        description="Claude model for subtitle nikud/shoresh generation"
    )
    SUBTITLE_NIKUD_CACHE_MAX_SIZE: int = Field(
        default=10000,
        env="SUBTITLE_NIKUD_CACHE_MAX_SIZE",
        description="Maximum in-memory cache entries for nikud text"
    )
    SUBTITLE_SHORESH_CACHE_MAX_SIZE: int = Field(
        default=10000,
        env="SUBTITLE_SHORESH_CACHE_MAX_SIZE",
        description="Maximum in-memory cache entries for shoresh text"
    )
    SUBTITLE_HEBLISH_CACHE_MAX_SIZE: int = Field(
        default=10000,
        env="SUBTITLE_HEBLISH_CACHE_MAX_SIZE",
        description="Maximum in-memory cache entries for heblish text"
    )
    SUBTITLE_GRAMMAR_FLIP_CACHE_MAX_SIZE: int = Field(
        default=10000,
        env="SUBTITLE_GRAMMAR_FLIP_CACHE_MAX_SIZE",
        description="Maximum in-memory cache entries for grammar-flip text"
    )
    SUBTITLE_SLANG_SYNTHESIS_CACHE_MAX_SIZE: int = Field(
        default=10000,
        env="SUBTITLE_SLANG_SYNTHESIS_CACHE_MAX_SIZE",
        description="Maximum in-memory cache entries for slang synthesis text"
    )
    SUBTITLE_ENGREW_CACHE_MAX_SIZE: int = Field(
        default=10000,
        env="SUBTITLE_ENGREW_CACHE_MAX_SIZE",
        description="Maximum in-memory cache entries for engrew text"
    )
    SUBTITLE_AI_MAX_TOKENS: int = Field(
        default=4096,
        env="SUBTITLE_AI_MAX_TOKENS",
        description="Maximum tokens per AI request (prevents unbounded requests)"
    )

    # Tavily (Web Search & News API)
    TAVILY_API_KEY: str = ""

    # Exa.ai (Article Search & Extraction)
    EXA_API_KEY: str = ""

    # NLP Features (opt-in, requires ANTHROPIC_API_KEY)
    NLP_ENABLED: bool = Field(
        default=False,
        validation_alias=AliasChoices('OLORIN_NLP_ENABLED', 'NLP_ENABLED')
    )
    NLP_CONFIDENCE_THRESHOLD: float = Field(
        default=0.7,
        validation_alias=AliasChoices('OLORIN_NLP_CONFIDENCE_THRESHOLD', 'NLP_CONFIDENCE_THRESHOLD')
    )
    NLP_MAX_COST_PER_QUERY: float = Field(
        default=0.10,
        validation_alias=AliasChoices('OLORIN_NLP_MAX_COST_PER_QUERY', 'NLP_MAX_COST_PER_QUERY')
    )

    # Agent Execution (for multi-step workflows)
    AGENT_MAX_ITERATIONS: int = Field(default=20)
    AGENT_BUDGET_LIMIT_USD: float = Field(default=0.50)

    # Wizard Voice Assistant Configuration
    WIZARD_CHAT_MAX_ITERATIONS: int = Field(
        default=3,
        env="WIZARD_CHAT_MAX_ITERATIONS",
        description="Maximum tool execution iterations for wizard chat"
    )
    WIZARD_CHAT_TIMEOUT_SECONDS: float = Field(
        default=30.0,
        env="WIZARD_CHAT_TIMEOUT_SECONDS",
        description="Timeout for wizard chat responses (seconds)"
    )
    WIZARD_CHAT_MAX_HISTORY: int = Field(
        default=10,
        env="WIZARD_CHAT_MAX_HISTORY",
        description="Maximum conversation messages to retain"
    )
    WIZARD_CHAT_MEMORY_TTL_MINUTES: int = Field(
        default=30,
        env="WIZARD_CHAT_MEMORY_TTL_MINUTES",
        description="Conversation memory expiry (minutes)"
    )

    # NLP Session Management
    NLP_SESSION_TTL_MINUTES: int = Field(
        default=30,
        description="Session expiry time in minutes",
    )
    NLP_SESSION_MAX_HISTORY: int = Field(
        default=50,
        description="Maximum messages to retain in session history",
    )
    NLP_SESSION_CLEANUP_INTERVAL_MINUTES: int = Field(
        default=5,
        description="Interval for cleaning up expired sessions",
    )

    # NLP Ecosystem Context
    NLP_ECOSYSTEM_CONTEXT_CACHE_TTL_SECONDS: int = Field(
        default=30,
        description="Cache TTL for ecosystem context",
    )
    NLP_GIT_CONTEXT_CACHE_TTL_SECONDS: int = Field(
        default=300,
        description="Cache TTL for git context (5 minutes)",
    )
    NLP_GIT_CONTEXT_MAX_COMMITS: int = Field(
        default=10,
        description="Maximum recent commits to include in context",
    )

    # NLP Action Execution
    NLP_DEFAULT_ACTION_MODE: str = Field(
        default="smart",
        description="Default action mode: smart or confirm_all",
    )
    NLP_ACTION_TOKEN_TTL_SECONDS: int = Field(
        default=300,
        description="TTL for pending action tokens (5 minutes)",
    )

    # NLP Rate Limiting
    NLP_RATE_LIMIT_REQUESTS_PER_MINUTE: int = Field(
        default=30,
        description="Max NLP requests per minute per user",
    )
    NLP_RATE_LIMIT_COST_PER_HOUR_USD: float = Field(
        default=5.00,
        description="Max API cost per hour per user",
    )
