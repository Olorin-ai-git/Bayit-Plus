#!/usr/bin/env python3
"""
Verification Configuration System

Manages all configuration settings for the LLM verification system,
including environment variables, Firebase Secrets integration,
and runtime configuration management.

Author: Gil Klainert
Date: 2025-01-10
"""

import os
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum
import logging

from app.utils.firebase_secrets import get_firebase_secret
from app.service.config_loader import ConfigLoader

logger = logging.getLogger(__name__)


class VerificationModel(Enum):
    """Supported verification models with their characteristics."""
    GEMINI_FLASH = "gemini-1.5-flash"
    CLAUDE_HAIKU = "claude-3-haiku-20240307"
    GPT_3_5_TURBO = "gpt-3.5-turbo"
    GPT_4_MINI = "gpt-4o-mini"


@dataclass
class ModelConfig:
    """Configuration for a specific verification model."""
    name: str
    cost_per_1k_tokens: float
    speed_rating: int  # 1-10, higher is faster
    accuracy_rating: int  # 1-10, higher is more accurate
    max_tokens: int
    timeout_seconds: int
    use_case: str


class VerificationConfig:
    """
    Comprehensive configuration management for LLM verification system.
    
    Handles environment variables, Firebase Secrets, and provides
    intelligent defaults for all verification settings.
    """
    
    def __init__(self):
        """Initialize configuration from environment and Firebase Secrets."""
        self._load_configuration()
        self._validate_configuration()
        logger.info(f"🔧 Verification configuration initialized - Enabled: {self.enabled}")
        
    def _load_configuration(self):
        """Load configuration from environment variables and Firebase Secrets."""
        
        # Core verification settings
        self.enabled = self._get_bool_env('LLM_VERIFICATION_ENABLED', True)
        self.primary_model = VerificationModel(
            self._get_str_env('LLM_VERIFICATION_MODEL', VerificationModel.GPT_3_5_TURBO.value)
        )
        self.timeout_seconds = self._get_int_env('LLM_VERIFICATION_TIMEOUT_SECONDS', 30)
        self.max_retries = self._get_int_env('LLM_VERIFICATION_MAX_RETRIES', 3)
        
        # Performance settings
        self.cache_enabled = self._get_bool_env('LLM_VERIFICATION_CACHE_ENABLED', True)
        self.cache_ttl_hours = self._get_int_env('LLM_VERIFICATION_CACHE_TTL_HOURS', 24)
        self.parallel_enabled = self._get_bool_env('LLM_VERIFICATION_PARALLEL_ENABLED', False)
        
        # Quality settings
        self.confidence_threshold = self._get_float_env('LLM_VERIFICATION_CONFIDENCE_THRESHOLD', 0.8)
        self.retry_exponential_backoff = self._get_bool_env('LLM_VERIFICATION_RETRY_EXPONENTIAL_BACKOFF', True)
        
        # Emergency and debugging settings
        self.bypass_for_tools = self._get_bool_env('LLM_VERIFICATION_BYPASS_FOR_TOOLS', False)
        self.log_level = self._get_str_env('LLM_VERIFICATION_LOG_LEVEL', 'INFO')
        self.metrics_enabled = self._get_bool_env('LLM_VERIFICATION_METRICS_ENABLED', True)
        
        # Advanced settings
        self.batch_size = self._get_int_env('LLM_VERIFICATION_BATCH_SIZE', 1)
        self.fallback_models = self._get_list_env('LLM_VERIFICATION_FALLBACK_MODELS', [
            VerificationModel.GPT_4_MINI.value,
            VerificationModel.GEMINI_FLASH.value,
            VerificationModel.CLAUDE_HAIKU.value
        ])
        
        # Model configurations
        self.model_configs = self._get_model_configurations()
        
        # API keys and secrets (from Firebase Secrets)
        self._load_api_credentials()
        
        # Backward compatibility properties
        self.retry_attempts = self.max_retries
        self.verification_model = self.primary_model.value
        
    def _get_bool_env(self, key: str, default: bool) -> bool:
        """Get boolean environment variable with default."""
        value = os.getenv(key, str(default)).lower()
        return value in ('true', '1', 'yes', 'on')
    
    def _get_int_env(self, key: str, default: int) -> int:
        """Get integer environment variable with default."""
        try:
            return int(os.getenv(key, str(default)))
        except ValueError:
            logger.warning(f"Invalid integer value for {key}, using default: {default}")
            return default
    
    def _get_float_env(self, key: str, default: float) -> float:
        """Get float environment variable with default."""
        try:
            return float(os.getenv(key, str(default)))
        except ValueError:
            logger.warning(f"Invalid float value for {key}, using default: {default}")
            return default
    
    def _get_str_env(self, key: str, default: str) -> str:
        """Get string environment variable with default."""
        return os.getenv(key, default)
    
    def _get_list_env(self, key: str, default: List[str]) -> List[str]:
        """Get list environment variable (comma-separated) with default."""
        value = os.getenv(key)
        if value:
            return [item.strip() for item in value.split(',') if item.strip()]
        return default
    
    def _load_api_credentials(self):
        """Load API credentials from Firebase Secrets."""
        try:
            config_loader = ConfigLoader()
            
            # Try to get verification-specific API keys first
            # Respect USE_FIREBASE_SECRETS setting - only use config_loader which handles this properly
            self.openai_api_key = (
                config_loader.load_secret('VERIFICATION_OPENAI_API_KEY') or 
                config_loader.load_secret('OPENAI_API_KEY')
            )
            
            self.anthropic_api_key = (
                config_loader.load_secret('VERIFICATION_ANTHROPIC_API_KEY') or 
                config_loader.load_secret('ANTHROPIC_API_KEY')
            )
            
            self.google_api_key = (
                config_loader.load_secret('VERIFICATION_GOOGLE_API_KEY') or 
                config_loader.load_secret('GOOGLE_API_KEY')
            )
            
        except Exception as e:
            logger.warning(f"Failed to load API credentials from config loader/Firebase Secrets: {e}")
            # Fallback to environment variables
            self.openai_api_key = os.getenv('OPENAI_API_KEY')
            self.anthropic_api_key = os.getenv('ANTHROPIC_API_KEY')
            self.google_api_key = os.getenv('GOOGLE_API_KEY')
    
    def _get_model_configurations(self) -> Dict[VerificationModel, ModelConfig]:
        """Get detailed configurations for all supported models."""
        return {
            VerificationModel.GEMINI_FLASH: ModelConfig(
                name="gemini-1.5-flash",
                cost_per_1k_tokens=0.00015,
                speed_rating=9,
                accuracy_rating=8,
                max_tokens=8192,
                timeout_seconds=15,
                use_case="primary_verification"
            ),
            VerificationModel.CLAUDE_HAIKU: ModelConfig(
                name="claude-3-haiku-20240307",
                cost_per_1k_tokens=0.00025,
                speed_rating=8,
                accuracy_rating=9,
                max_tokens=4096,
                timeout_seconds=20,
                use_case="high_accuracy_verification"
            ),
            VerificationModel.GPT_3_5_TURBO: ModelConfig(
                name="gpt-3.5-turbo",
                cost_per_1k_tokens=0.0005,
                speed_rating=7,
                accuracy_rating=8,
                max_tokens=4096,
                timeout_seconds=25,
                use_case="fallback_verification"
            ),
            VerificationModel.GPT_4_MINI: ModelConfig(
                name="gpt-4o-mini",
                cost_per_1k_tokens=0.00015,
                speed_rating=6,
                accuracy_rating=9,
                max_tokens=4096,
                timeout_seconds=30,
                use_case="high_accuracy_fallback"
            )
        }
    
    def _validate_configuration(self):
        """Validate configuration settings and log warnings for potential issues."""
        issues = []
        
        if self.confidence_threshold < 0.5:
            issues.append("Confidence threshold is very low (<0.5), may accept poor responses")
        
        if self.confidence_threshold > 0.95:
            issues.append("Confidence threshold is very high (>0.95), may cause excessive retries")
        
        if self.max_retries > 5:
            issues.append("Max retries is high (>5), may cause long delays")
        
        if self.timeout_seconds > 60:
            issues.append("Timeout is very long (>60s), may cause poor user experience")
        
        if not self.cache_enabled and self.enabled:
            issues.append("Caching disabled - verification performance may be poor")
        
        # Check API key availability for primary model
        if self.enabled:
            primary_config = self.model_configs[self.primary_model]
            if not self._has_required_api_key(self.primary_model):
                issues.append(f"No API key available for primary model: {primary_config.name}")
        
        if issues:
            logger.warning(f"⚠️  Configuration issues detected: {'; '.join(issues)}")
    
    def _has_required_api_key(self, model: VerificationModel) -> bool:
        """Check if required API key is available for model."""
        if model in [VerificationModel.GEMINI_FLASH]:
            return bool(self.google_api_key)
        elif model in [VerificationModel.CLAUDE_HAIKU]:
            return bool(self.anthropic_api_key)
        elif model in [VerificationModel.GPT_3_5_TURBO, VerificationModel.GPT_4_MINI]:
            return bool(self.openai_api_key)
        return False
    
    def get_model_config(self, model: VerificationModel) -> ModelConfig:
        """Get configuration for a specific model."""
        return self.model_configs[model]
    
    def get_available_models(self) -> List[VerificationModel]:
        """Get list of models that have API keys available."""
        available = []
        for model in VerificationModel:
            if self._has_required_api_key(model):
                available.append(model)
        return available
    
    def get_fallback_models(self) -> List[VerificationModel]:
        """Get list of fallback models with available API keys."""
        fallback = []
        for model_name in self.fallback_models:
            try:
                model = VerificationModel(model_name)
                if self._has_required_api_key(model):
                    fallback.append(model)
            except ValueError:
                logger.warning(f"Unknown fallback model: {model_name}")
        return fallback
    
    def is_emergency_bypass_enabled(self, tool_name: Optional[str] = None) -> bool:
        """Check if emergency bypass is enabled for verification."""
        if not self.enabled:
            return True
            
        if self.bypass_for_tools:
            # Could implement tool-specific bypass logic here
            return True
            
        return False
    
    def get_cache_key_prefix(self) -> str:
        """Get prefix for cache keys."""
        return f"llm_verification:{self.primary_model.value}"
    
    def get_retry_delay(self, attempt: int) -> float:
        """Get delay for retry attempt."""
        if self.retry_exponential_backoff:
            return min(2 ** attempt, 30)  # Max 30 seconds
        return 1.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary for logging/debugging."""
        return {
            'enabled': self.enabled,
            'primary_model': self.primary_model.value,
            'timeout_seconds': self.timeout_seconds,
            'max_retries': self.max_retries,
            'cache_enabled': self.cache_enabled,
            'cache_ttl_hours': self.cache_ttl_hours,
            'confidence_threshold': self.confidence_threshold,
            'fallback_models': [m.value for m in self.get_fallback_models()],
            'available_models': [m.value for m in self.get_available_models()],
            'metrics_enabled': self.metrics_enabled,
            'log_level': self.log_level
        }
    
    def is_model_available(self, model_name: str) -> bool:
        """Check if a model is available in the configuration."""
        try:
            # Check if model name exists in our enum
            model = VerificationModel(model_name)
            return model in self.model_configs
        except ValueError:
            return False
    
    def health_check(self) -> Dict[str, Any]:
        """Perform health check on configuration."""
        available_models = self.get_available_models()
        
        return {
            'config_loaded': True,
            'models_available': len(available_models),
            'model_configs': len(self.model_configs),
            'primary_model': self.primary_model.value,
            'available_models': [m.value for m in available_models],
            'enabled': self.enabled,
            'has_api_keys': len(available_models) > 0
        }
    
    def __repr__(self) -> str:
        """String representation for debugging."""
        return f"VerificationConfig(enabled={self.enabled}, model={self.primary_model.value})"


# Global configuration instance
_verification_config: Optional[VerificationConfig] = None


def get_verification_config() -> VerificationConfig:
    """Get the global verification configuration instance."""
    global _verification_config
    
    if _verification_config is None:
        _verification_config = VerificationConfig()
    
    return _verification_config


def reload_verification_config() -> VerificationConfig:
    """Reload configuration from environment (useful for testing)."""
    global _verification_config
    _verification_config = VerificationConfig()
    return _verification_config