"""
Environment Variable Override System for Feature Flags

Allows feature flags to be overridden via environment variables
for deployment and testing flexibility.
"""

import os
from typing import Dict, Any

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class EnvironmentLoader:
    """
    Loads feature flag overrides from environment variables.
    
    Environment variable format: HYBRID_FLAG_{FLAG_NAME}=true/false
    """
    
    def __init__(self):
        self.environment_prefix = "HYBRID_FLAG_"
    
    def load_overrides(self, flags: Dict[str, Dict[str, Any]]):
        """
        Load feature flag overrides from environment variables.
        
        Args:
            flags: Feature flags dictionary to modify
        """
        
        for flag_name in flags.keys():
            self._apply_environment_override(flag_name, flags[flag_name])
    
    def _apply_environment_override(
        self, 
        flag_name: str, 
        flag_config: Dict[str, Any]
    ):
        """
        Apply environment variable override for a specific flag.
        
        Args:
            flag_name: Name of the feature flag
            flag_config: Flag configuration to modify
        """
        
        env_var_name = f"{self.environment_prefix}{flag_name.upper()}"
        env_value = os.environ.get(env_var_name)
        
        if env_value is None:
            return
        
        # Parse boolean values
        if self._is_truthy_value(env_value):
            flag_config["enabled"] = True
            flag_config["rollout_percentage"] = 100
            logger.info(f"🚩 Environment override: {flag_name} enabled via {env_var_name}")
            
        elif self._is_falsy_value(env_value):
            flag_config["enabled"] = False
            flag_config["rollout_percentage"] = 0
            logger.info(f"🚩 Environment override: {flag_name} disabled via {env_var_name}")
            
        else:
            logger.warning(f"🚩 Invalid environment value for {env_var_name}: {env_value}")
            logger.warning(f"   Expected: true/false, 1/0, yes/no, on/off")
    
    def _is_truthy_value(self, value: str) -> bool:
        """Check if environment value represents true"""
        return value.lower() in ['true', '1', 'yes', 'on']
    
    def _is_falsy_value(self, value: str) -> bool:
        """Check if environment value represents false"""
        return value.lower() in ['false', '0', 'no', 'off']
    
    def get_environment_overrides(self) -> Dict[str, str]:
        """
        Get all current environment variable overrides.
        
        Returns:
            Dictionary of environment variables and their values
        """
        
        overrides = {}
        
        for key, value in os.environ.items():
            if key.startswith(self.environment_prefix):
                flag_name = key[len(self.environment_prefix):].lower()
                overrides[flag_name] = value
        
        return overrides
    
    def clear_environment_override(self, flag_name: str):
        """
        Clear environment override for a specific flag.
        
        Args:
            flag_name: Name of the feature flag
        """
        
        env_var_name = f"{self.environment_prefix}{flag_name.upper()}"
        
        if env_var_name in os.environ:
            del os.environ[env_var_name]
            logger.info(f"🚩 Environment override cleared: {flag_name}")
        else:
            logger.debug(f"🚩 No environment override to clear: {flag_name}")
    
    def set_environment_override(self, flag_name: str, enabled: bool):
        """
        Set environment override for a specific flag.
        
        Args:
            flag_name: Name of the feature flag
            enabled: Whether to enable or disable the flag
        """
        
        env_var_name = f"{self.environment_prefix}{flag_name.upper()}"
        env_value = "true" if enabled else "false"
        
        os.environ[env_var_name] = env_value
        logger.info(f"🚩 Environment override set: {flag_name} = {env_value}")
        logger.info(f"   Variable: {env_var_name}")