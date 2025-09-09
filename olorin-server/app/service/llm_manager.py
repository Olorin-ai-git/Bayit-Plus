"""
LLM Model Manager for Olorin Platform
Handles model selection, initialization, and verification.

Supports:
- Anthropic Claude models
- OpenAI GPT models  
- Google Gemini models
- Model verification with secondary LLM
"""

import os
from typing import Dict, Any, Optional, List
from enum import Enum
from dataclasses import dataclass
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import BaseMessage, HumanMessage, SystemMessage
from app.service.logging import get_bridge_logger
from app.service.config_loader import ConfigLoader

logger = get_bridge_logger(__name__)


class ModelProvider(Enum):
    """Supported LLM providers."""
    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    GOOGLE = "google"


@dataclass
class ModelConfig:
    """Configuration for a specific model."""
    provider: ModelProvider
    model_name: str
    display_name: str
    max_tokens: int = 4096
    temperature: float = 0.7
    supports_verification: bool = True


# Available models configuration
AVAILABLE_MODELS = {
    # Anthropic models
    "claude-opus-4-1-20250805": ModelConfig(
        provider=ModelProvider.ANTHROPIC,
        model_name="claude-opus-4-1-20250805",
        display_name="Claude Opus 4.1",
        max_tokens=8192
    ),
    "claude-opus-4-1-20250805-thinking": ModelConfig(
        provider=ModelProvider.ANTHROPIC,
        model_name="claude-opus-4-1-20250805-thinking",
        display_name="Claude Opus 4.1 (Thinking)",
        max_tokens=8192
    ),
    "claude-3-opus-20240229": ModelConfig(
        provider=ModelProvider.ANTHROPIC,
        model_name="claude-3-opus-20240229",
        display_name="Claude 3 Opus",
        max_tokens=4096
    ),
    "claude-3-5-sonnet-20241022": ModelConfig(
        provider=ModelProvider.ANTHROPIC,
        model_name="claude-3-5-sonnet-20241022",
        display_name="Claude 3.5 Sonnet",
        max_tokens=8192
    ),
    "claude-3-5-sonnet-20240620": ModelConfig(
        provider=ModelProvider.ANTHROPIC,
        model_name="claude-3-5-sonnet-20240620",
        display_name="Claude 3.5 Sonnet (June)",
        max_tokens=8192
    ),
    "claude-3-haiku-20240307": ModelConfig(
        provider=ModelProvider.ANTHROPIC,
        model_name="claude-3-haiku-20240307",
        display_name="Claude 3 Haiku",
        max_tokens=4096
    ),
    
    # OpenAI models
    "gpt-5-chat-latest": ModelConfig(
        provider=ModelProvider.OPENAI,
        model_name="gpt-5-chat-latest",
        display_name="GPT-5 Chat",
        max_tokens=8192
    ),
    "gpt-5": ModelConfig(
        provider=ModelProvider.OPENAI,
        model_name="gpt-5",
        display_name="GPT-5",
        max_tokens=8192
    ),
    "gpt-5-mini": ModelConfig(
        provider=ModelProvider.OPENAI,
        model_name="gpt-5-mini",
        display_name="GPT-5 Mini",
        max_tokens=8192
    ),
    "gpt-5-nano": ModelConfig(
        provider=ModelProvider.OPENAI,
        model_name="gpt-5-nano",
        display_name="GPT-5 Nano",
        max_tokens=4096
    ),
    "gpt-4-turbo-preview": ModelConfig(
        provider=ModelProvider.OPENAI,
        model_name="gpt-4-turbo-preview",
        display_name="GPT-4 Turbo",
        max_tokens=4096
    ),
    "gpt-4": ModelConfig(
        provider=ModelProvider.OPENAI,
        model_name="gpt-4",
        display_name="GPT-4",
        max_tokens=8192
    ),
    "gpt-3.5-turbo": ModelConfig(
        provider=ModelProvider.OPENAI,
        model_name="gpt-3.5-turbo",
        display_name="GPT-3.5 Turbo",
        max_tokens=4096
    ),
    
    # Google models
    "gemini-1.5-flash": ModelConfig(
        provider=ModelProvider.GOOGLE,
        model_name="gemini-1.5-flash",
        display_name="Gemini 1.5 Flash",
        max_tokens=8192,
        temperature=0.7
    ),
    "gemini-1.5-flash-002": ModelConfig(
        provider=ModelProvider.GOOGLE,
        model_name="gemini-1.5-flash-002",
        display_name="Gemini 1.5 Flash 002",
        max_tokens=8192,
        temperature=0.7
    ),
    "gemini-pro": ModelConfig(
        provider=ModelProvider.GOOGLE,
        model_name="gemini-pro",
        display_name="Gemini Pro",
        max_tokens=4096
    ),
    "gemini-pro-vision": ModelConfig(
        provider=ModelProvider.GOOGLE,
        model_name="gemini-pro-vision",
        display_name="Gemini Pro Vision",
        max_tokens=4096
    )
}


class LLMManager:
    """Manages LLM model selection and interaction."""
    
    def __init__(self):
        """Initialize the LLM manager."""
        self.config_loader = ConfigLoader()
        self._load_configuration()
        self._initialize_models()
        
    def _load_configuration(self):
        """Load configuration from environment and Firebase."""
        # Load API keys
        self.anthropic_api_key = os.getenv('ANTHROPIC_API_KEY') or self.config_loader.load_secret('ANTHROPIC_API_KEY')
        self.openai_api_key = os.getenv('OPENAI_API_KEY') or self.config_loader.load_secret('OPENAI_API_KEY')
        self.gemini_api_key = os.getenv('GEMINI_API_KEY') or self.config_loader.load_secret('GEMINI_API_KEY')
        
        # Load model selection - use cost-effective models by default
        self.selected_model_id = os.getenv('SELECTED_MODEL', 'claude-3-5-sonnet-20240620')  # Sonnet is more cost-effective than Opus
        self.verification_model_id = os.getenv('VERIFICATION_MODEL', 'gemini-1.5-flash')  # Use cost-effective Gemini Flash for verification
        
        # Validate configuration
        if self.selected_model_id not in AVAILABLE_MODELS:
            logger.warning(f"Invalid selected model: {self.selected_model_id}, defaulting to claude-3.5-sonnet")
            self.selected_model_id = 'claude-3-5-sonnet-20240620'
            
        if self.verification_model_id not in AVAILABLE_MODELS:
            logger.warning(f"Invalid verification model: {self.verification_model_id}, defaulting to gemini-1.5-flash")
            self.verification_model_id = 'gemini-1.5-flash'
            
        logger.info(f"LLM Manager configured: selected={self.selected_model_id}, verification={self.verification_model_id}")
        
    def _initialize_models(self):
        """Initialize the selected and verification models."""
        self.selected_model = None
        self.verification_model = None
        
        # Initialize selected model
        selected_config = AVAILABLE_MODELS[self.selected_model_id]
        self.selected_model = self._create_model(selected_config)
        
        # Initialize verification model
        verification_config = AVAILABLE_MODELS[self.verification_model_id]
        self.verification_model = self._create_model(verification_config)
        
    def _create_model(self, config: ModelConfig):
        """Create a model instance based on configuration."""
        try:
            if config.provider == ModelProvider.ANTHROPIC:
                if not self.anthropic_api_key:
                    logger.warning(f"Anthropic API key not found for {config.display_name}")
                    return None
                return ChatAnthropic(
                    model=config.model_name,
                    anthropic_api_key=self.anthropic_api_key,
                    max_tokens=config.max_tokens,
                    temperature=config.temperature
                )
                
            elif config.provider == ModelProvider.OPENAI:
                if not self.openai_api_key:
                    logger.warning(f"OpenAI API key not found for {config.display_name}")
                    return None
                return ChatOpenAI(
                    model=config.model_name,
                    openai_api_key=self.openai_api_key,
                    max_tokens=config.max_tokens,
                    temperature=config.temperature
                )
                
            elif config.provider == ModelProvider.GOOGLE:
                if not self.gemini_api_key:
                    logger.warning(f"Google API key not found for {config.display_name}")
                    return None
                return ChatGoogleGenerativeAI(
                    model=config.model_name,
                    google_api_key=self.gemini_api_key,
                    max_tokens=config.max_tokens,
                    temperature=config.temperature
                )
                
        except Exception as e:
            logger.error(f"Failed to initialize {config.display_name}: {e}")
            return None
            
    def get_selected_model(self):
        """Get the currently selected model."""
        if not self.selected_model:
            logger.error("Selected model not initialized")
            # Try to fallback to any available model
            self._try_fallback_model()
        return self.selected_model
        
    def get_verification_model(self):
        """Get the verification model."""
        if not self.verification_model:
            logger.warning("Verification model not initialized")
        return self.verification_model
        
    def _try_fallback_model(self):
        """Try to initialize a fallback model if primary fails."""
        # Fallback order prioritizes cost-effective models first
        fallback_order = [
            'claude-3-5-sonnet-20240620',  # Start with cost-effective models
            'claude-3-haiku-20240307',
            'gemini-1.5-flash',          # Very cost-effective
            'gemini-1.5-flash-002',
            'gpt-3.5-turbo',
            'gemini-pro',
            'gpt-4-turbo-preview',
            'claude-3-opus-20240229',  # More expensive models later in fallback
            'gpt-4',
            'gpt-5',
            'gpt-5-chat-latest',
            'claude-opus-4-1-20250805'  # Most expensive models last
        ]
        
        for model_id in fallback_order:
            if model_id != self.selected_model_id:
                config = AVAILABLE_MODELS[model_id]
                model = self._create_model(config)
                if model:
                    logger.info(f"Using fallback model: {config.display_name}")
                    self.selected_model = model
                    self.selected_model_id = model_id
                    break
                    
    async def invoke_with_verification(
        self,
        messages: List[BaseMessage],
        verify: bool = True
    ) -> Dict[str, Any]:
        """
        Invoke the selected model and optionally verify with verification model.
        
        Args:
            messages: Messages to send to the model
            verify: Whether to verify the response
            
        Returns:
            Dictionary with response and verification results
        """
        result = {
            'response': None,
            'verification': None,
            'model_used': self.selected_model_id
        }
        
        # Get response from selected model
        if not self.selected_model:
            logger.error("No model available for invocation")
            return result
            
        try:
            response = await self.selected_model.ainvoke(messages)
            result['response'] = response.content
            
            # Verify if requested and verification model available
            if verify and self.verification_model:
                verification_result = await self._verify_response(
                    original_messages=messages,
                    response=response.content
                )
                result['verification'] = verification_result
                
        except Exception as e:
            # Handle LLM API errors gracefully (works for OpenAI, Anthropic, etc.)
            if "context_length_exceeded" in str(e) or "maximum context length" in str(e) or "token limit" in str(e).lower():
                logger.error(f"❌ LLM context length exceeded in model invocation")
                logger.error(f"   Model: {self.selected_model_id}")
                logger.error(f"   Error: {str(e)}")
                logger.error(f"   Context info: {len(messages)} messages, estimated {sum(len(str(m.content)) for m in messages if hasattr(m, 'content'))} characters")
                result['error'] = f"Context length exceeded for model {self.selected_model_id}"
                
            elif "not_found_error" in str(e).lower() or "notfounderror" in str(type(e)).lower() or "model:" in str(e).lower():
                logger.error(f"❌ LLM model not found in model invocation")
                logger.error(f"   Model: {self.selected_model_id}")
                logger.error(f"   Error type: {type(e).__name__}")
                logger.error(f"   Error details: {str(e)}")
                result['error'] = f"Model not found: {self.selected_model_id} (check model name/availability)"
                
            elif any(error_type in str(type(e)).lower() for error_type in ["badrequest", "apierror", "ratelimit"]) or any(provider in str(e).lower() for provider in ["openai", "anthropic", "google"]):
                logger.error(f"❌ LLM API error in model invocation")
                logger.error(f"   Model: {self.selected_model_id}")
                logger.error(f"   Error type: {type(e).__name__}")
                logger.error(f"   Error details: {str(e)}")
                result['error'] = f"API error for model {self.selected_model_id}: {type(e).__name__}"
                
            else:
                logger.error(f"❌ Unexpected error in model invocation")
                logger.error(f"   Model: {self.selected_model_id}")
                logger.error(f"   Error type: {type(e).__name__}")
                logger.error(f"   Error details: {str(e)}")
                result['error'] = str(e)
            
        return result
        
    async def _verify_response(
        self,
        original_messages: List[BaseMessage],
        response: str
    ) -> Dict[str, Any]:
        """
        Verify a response using the verification model.
        
        Args:
            original_messages: Original messages sent
            response: Response to verify
            
        Returns:
            Verification results
        """
        try:
            # Create verification prompt
            verification_prompt = f"""
            You are a verification model. Please verify if the following response is appropriate, accurate, and helpful.
            
            Original Query: {original_messages[-1].content if original_messages else 'N/A'}
            
            Response to Verify: {response}
            
            Please evaluate:
            1. Accuracy: Is the information correct?
            2. Relevance: Does it address the query?
            3. Completeness: Is the response complete?
            4. Safety: Is the response safe and appropriate?
            
            Provide a brief assessment and a confidence score (0-100).
            """
            
            verification_response = await self.verification_model.ainvoke([
                HumanMessage(content=verification_prompt)
            ])
            
            return {
                'verified': True,
                'assessment': verification_response.content,
                'verification_model': self.verification_model_id
            }
            
        except Exception as e:
            # Handle verification model LLM API errors gracefully
            if "context_length_exceeded" in str(e) or "maximum context length" in str(e) or "token limit" in str(e).lower():
                logger.error(f"❌ Verification model context length exceeded")
                logger.error(f"   Verification model: {self.verification_model_id}")
                logger.error(f"   Error: {str(e)}")
                logger.error(f"   Verification prompt length: {len(verification_prompt)} characters")
                return {
                    'verified': False,
                    'error': f"Context length exceeded for verification model {self.verification_model_id}"
                }
                
            elif "not_found_error" in str(e).lower() or "notfounderror" in str(type(e)).lower() or "model:" in str(e).lower():
                logger.error(f"❌ Verification model not found")
                logger.error(f"   Verification model: {self.verification_model_id}")
                logger.error(f"   Error type: {type(e).__name__}")
                logger.error(f"   Error details: {str(e)}")
                return {
                    'verified': False,
                    'error': f"Verification model not found: {self.verification_model_id} (check model name/availability)"
                }
                
            elif any(error_type in str(type(e)).lower() for error_type in ["badrequest", "apierror", "ratelimit"]) or any(provider in str(e).lower() for provider in ["openai", "anthropic", "google"]):
                logger.error(f"❌ Verification model API error")
                logger.error(f"   Verification model: {self.verification_model_id}")
                logger.error(f"   Error type: {type(e).__name__}")
                logger.error(f"   Error details: {str(e)}")
                return {
                    'verified': False,
                    'error': f"API error for verification model {self.verification_model_id}: {type(e).__name__}"
                }
                
            else:
                logger.error(f"❌ Unexpected error in verification model")
                logger.error(f"   Verification model: {self.verification_model_id}")
                logger.error(f"   Error type: {type(e).__name__}")
                logger.error(f"   Error details: {str(e)}")
                return {
                    'verified': False,
                    'error': str(e)
                }
            
    def switch_model(self, model_id: str) -> bool:
        """
        Switch to a different model.
        
        Args:
            model_id: ID of the model to switch to
            
        Returns:
            True if switch successful, False otherwise
        """
        if model_id not in AVAILABLE_MODELS:
            logger.error(f"Invalid model ID: {model_id}")
            return False
            
        config = AVAILABLE_MODELS[model_id]
        new_model = self._create_model(config)
        
        if new_model:
            self.selected_model = new_model
            self.selected_model_id = model_id
            logger.info(f"Switched to model: {config.display_name}")
            return True
        else:
            logger.error(f"Failed to switch to model: {config.display_name}")
            return False
            
    def get_available_models(self) -> List[Dict[str, str]]:
        """
        Get list of available models.
        
        Returns:
            List of model information
        """
        models = []
        for model_id, config in AVAILABLE_MODELS.items():
            # Check if we have API key for this provider
            has_api_key = False
            if config.provider == ModelProvider.ANTHROPIC:
                has_api_key = bool(self.anthropic_api_key)
            elif config.provider == ModelProvider.OPENAI:
                has_api_key = bool(self.openai_api_key)
            elif config.provider == ModelProvider.GOOGLE:
                has_api_key = bool(self.gemini_api_key)
                
            models.append({
                'id': model_id,
                'name': config.display_name,
                'provider': config.provider.value,
                'available': has_api_key,
                'selected': model_id == self.selected_model_id,
                'verification': model_id == self.verification_model_id
            })
            
        return models


# Global instance
_llm_manager = None


def get_llm_manager() -> LLMManager:
    """Get the global LLM manager instance."""
    global _llm_manager
    if _llm_manager is None:
        _llm_manager = LLMManager()
    return _llm_manager