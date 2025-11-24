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
<<<<<<< HEAD
from langchain.schema import BaseMessage, HumanMessage, SystemMessage
=======
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage, AIMessage
from langchain_core.language_models.base import BaseLanguageModel
>>>>>>> 001-modify-analyzer-method
from app.service.logging import get_bridge_logger
from app.service.config_loader import ConfigLoader
from app.service.agent.verification import LLMVerificationService, get_verification_config

logger = get_bridge_logger(__name__)


<<<<<<< HEAD
=======
class GPT5ResponsesWrapper:
    """
    Custom wrapper for GPT-5 using OpenAI Responses API.
    
    This wrapper implements the LangChain interface to work with existing code
    while using the Responses API instead of Chat Completions API.
    """
    
    def __init__(self, model_name: str = "gpt-5", openai_api_key: Optional[str] = None, **kwargs):
        """Initialize GPT-5 Responses API wrapper."""
        from openai import OpenAI
        
        self.model_name = model_name
        self.openai_api_key = openai_api_key
        self.client = OpenAI(api_key=openai_api_key) if openai_api_key else OpenAI()
        self.temperature = kwargs.get('temperature', 0.1)  # Low temperature for consistent results
        self.max_tokens = kwargs.get('max_tokens', 8192)
        logger.info(f"✅ GPT-5 Responses API wrapper initialized (model: {model_name})")
    
    def _format_messages_to_input(self, messages: List[BaseMessage]) -> str:
        """Convert LangChain messages to a single input string for Responses API."""
        formatted_parts = []
        
        for message in messages:
            # Extract content safely
            content = getattr(message, 'content', None)
            if content is None:
                content = str(message)
            elif not isinstance(content, str):
                content = str(content)
            
            # Format based on message type
            if isinstance(message, SystemMessage):
                formatted_parts.append(f"System: {content}")
            elif isinstance(message, HumanMessage):
                formatted_parts.append(f"User: {content}")
            elif isinstance(message, AIMessage):
                formatted_parts.append(f"Assistant: {content}")
            else:
                # Fallback for other message types
                formatted_parts.append(f"{type(message).__name__}: {content}")
        
        return "\n\n".join(formatted_parts)
    
    async def ainvoke(self, messages: List[BaseMessage], **kwargs):
        """Async invocation using Responses API."""
        try:
            # Convert messages to single input string
            input_text = self._format_messages_to_input(messages)
            
            # Call Responses API
            resp = self.client.responses.create(
                model=self.model_name,
                input=input_text
            )
            
            # Return as AIMessage to match LangChain interface
            return AIMessage(content=resp.output_text)
            
        except Exception as e:
            logger.error(f"❌ GPT-5 Responses API error: {e}")
            raise
    
    def invoke(self, messages: List[BaseMessage], **kwargs):
        """Sync invocation using Responses API."""
        try:
            # Convert messages to single input string
            input_text = self._format_messages_to_input(messages)
            
            # Call Responses API
            resp = self.client.responses.create(
                model=self.model_name,
                input=input_text
            )
            
            # Return as AIMessage to match LangChain interface
            return AIMessage(content=resp.output_text)
            
        except Exception as e:
            logger.error(f"❌ GPT-5 Responses API error: {e}")
            raise
    
    def bind_tools(self, tools, **kwargs):
        """
        Fall back to Chat Completions API when tools are needed.
        
        The Responses API doesn't support function calling/tools, so we create
        a ChatOpenAI instance with the same model name for tool-enabled calls.
        """
        logger.info(f"🔄 bind_tools called on GPT-5 Responses API wrapper - falling back to Chat Completions API for tool support")
        logger.info(f"   Tools to bind: {len(tools) if tools else 0}")
        
        # Create a ChatOpenAI instance for tool-enabled calls
        # Use the same model name - OpenAI will handle the model selection
        chat_llm = ChatOpenAI(
            model=self.model_name,
            openai_api_key=self.openai_api_key,
            max_tokens=self.max_tokens,
            temperature=self.temperature
        )
        
        # Bind tools to the Chat Completions LLM
        return chat_llm.bind_tools(tools, **kwargs)
    
    def with_structured_output(self, schema, **kwargs):
        """Mock structured output binding for compatibility."""
        logger.warning("⚠️ with_structured_output called on GPT-5 Responses API wrapper - structured output not supported")
        return self
    
    async def astream(self, messages: List[BaseMessage], **kwargs):
        """Mock streaming for compatibility."""
        logger.warning("⚠️ astream called on GPT-5 Responses API wrapper - streaming not supported")
        response = await self.ainvoke(messages, **kwargs)
        yield response


>>>>>>> 001-modify-analyzer-method
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
<<<<<<< HEAD
    temperature: float = 0.7
=======
    temperature: float = 0.1  # Low temperature for consistent, deterministic results
>>>>>>> 001-modify-analyzer-method
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
<<<<<<< HEAD
=======
    "claude-haiku-4-5": ModelConfig(
        provider=ModelProvider.ANTHROPIC,
        model_name="claude-haiku-4-5",
        display_name="Claude Haiku 4.5",
        max_tokens=8192
    ),
    "claude-3-5-haiku-20241022": ModelConfig(
        provider=ModelProvider.ANTHROPIC,
        model_name="claude-3-5-haiku-20241022",
        display_name="Claude 3.5 Haiku",
        max_tokens=8192
    ),
>>>>>>> 001-modify-analyzer-method
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
<<<<<<< HEAD
=======
    "gpt-4o": ModelConfig(
        provider=ModelProvider.OPENAI,
        model_name="gpt-4o",
        display_name="GPT-4o",
        max_tokens=16384
    ),
    "gpt-4o-mini": ModelConfig(
        provider=ModelProvider.OPENAI,
        model_name="gpt-4o-mini",
        display_name="GPT-4o Mini",
        max_tokens=16384
    ),
>>>>>>> 001-modify-analyzer-method
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
<<<<<<< HEAD
        temperature=0.7
=======
        temperature=0.1  # Low temperature for consistent results
>>>>>>> 001-modify-analyzer-method
    ),
    "gemini-1.5-flash-002": ModelConfig(
        provider=ModelProvider.GOOGLE,
        model_name="gemini-1.5-flash-002",
        display_name="Gemini 1.5 Flash 002",
        max_tokens=8192,
<<<<<<< HEAD
        temperature=0.7
=======
        temperature=0.1  # Low temperature for consistent results
>>>>>>> 001-modify-analyzer-method
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
        
        # Initialize verification system
        self._verification_enabled = os.getenv('LLM_VERIFICATION_ENABLED', 'false').lower() == 'true'
        if self._verification_enabled:
            verification_config = get_verification_config()
            self.verification_service = LLMVerificationService(config=verification_config)
            logger.info("LLM Verification System enabled")
        else:
            self.verification_service = None
            logger.info("LLM Verification System disabled")
        
    def _load_configuration(self):
        """Load configuration from environment and Firebase."""
        # Load API keys
        self.anthropic_api_key = os.getenv('ANTHROPIC_API_KEY') or self.config_loader.load_secret('ANTHROPIC_API_KEY')
        self.openai_api_key = os.getenv('OPENAI_API_KEY') or self.config_loader.load_secret('OPENAI_API_KEY')
        self.gemini_api_key = os.getenv('GEMINI_API_KEY') or self.config_loader.load_secret('GEMINI_API_KEY')
        
<<<<<<< HEAD
        # Load model selection - use cost-effective models by default
        self.selected_model_id = os.getenv('SELECTED_MODEL', 'claude-3-5-sonnet-20240620')  # Sonnet is more cost-effective than Opus
        self.verification_model_id = os.getenv('LLM_VERIFICATION_MODEL', 'gpt-3.5-turbo')  # Use cost-effective GPT-3.5 Turbo for verification
        
        # Validate configuration
        if self.selected_model_id not in AVAILABLE_MODELS:
            logger.warning(f"Invalid selected model: {self.selected_model_id}, defaulting to claude-3.5-sonnet")
            self.selected_model_id = 'claude-3-5-sonnet-20240620'
=======
        # Load model selection - use cheaper gpt-4o-mini as default (cost-effective OpenAI model)
        self.selected_model_id = os.getenv('SELECTED_MODEL', 'gpt-4o-mini')  # gpt-4o-mini is cheaper than gpt-4o
        self.verification_model_id = os.getenv('LLM_VERIFICATION_MODEL', 'gpt-3.5-turbo')  # Use cost-effective GPT-3.5 Turbo for verification

        # Validate configuration
        if self.selected_model_id not in AVAILABLE_MODELS:
            logger.warning(f"Invalid selected model: {self.selected_model_id}, defaulting to gpt-4o-mini")
            self.selected_model_id = 'gpt-4o-mini'
>>>>>>> 001-modify-analyzer-method
            
        if self.verification_model_id not in AVAILABLE_MODELS:
            logger.warning(f"Invalid verification model: {self.verification_model_id}, defaulting to gpt-3.5-turbo")
            self.verification_model_id = 'gpt-3.5-turbo'
            
        logger.info(f"LLM Manager configured: selected={self.selected_model_id}, verification={self.verification_model_id}")
        
    def _initialize_models(self):
        """Initialize the selected and verification models."""
        self.selected_model = None
        self.verification_model = None
<<<<<<< HEAD
        
        # Initialize selected model
        selected_config = AVAILABLE_MODELS[self.selected_model_id]
        self.selected_model = self._create_model(selected_config)
        
=======

        # Check for TEST_MODE=demo first
        test_mode = os.getenv("TEST_MODE", "").lower()

        # Check if any API key is available
        has_api_key = (self.anthropic_api_key or
                      self.openai_api_key or
                      self.gemini_api_key)

        use_mock = test_mode == "demo" or not has_api_key

        if use_mock:
            logger.info("🧪 Using MockLLM for testing (TEST_MODE=demo or no API keys)")
            self.selected_model = self._create_mock_llm()
            self.verification_model = self._create_mock_llm()
            return

        # Initialize selected model
        selected_config = AVAILABLE_MODELS[self.selected_model_id]
        self.selected_model = self._create_model(selected_config)

>>>>>>> 001-modify-analyzer-method
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
<<<<<<< HEAD
                    temperature=config.temperature
=======
                    temperature=config.temperature,
                    timeout=120.0  # 120 seconds for comprehensive fraud analysis responses
>>>>>>> 001-modify-analyzer-method
                )
                
            elif config.provider == ModelProvider.OPENAI:
                if not self.openai_api_key:
                    logger.warning(f"OpenAI API key not found for {config.display_name}")
                    return None
<<<<<<< HEAD
                return ChatOpenAI(
                    model=config.model_name,
                    openai_api_key=self.openai_api_key,
                    max_tokens=config.max_tokens,
                    temperature=config.temperature
                )
=======
                
                # Use Responses API for GPT-5 models
                if config.model_name in ["gpt-5", "gpt-5-chat-latest", "gpt-5-mini", "gpt-5-nano"]:
                    logger.info(f"🚀 Using GPT-5 Responses API for {config.display_name}")
                    return GPT5ResponsesWrapper(
                        model_name=config.model_name,
                        openai_api_key=self.openai_api_key,
                        max_tokens=config.max_tokens,
                        temperature=config.temperature
                    )
                else:
                    # Use standard Chat Completions API for other OpenAI models
                    return ChatOpenAI(
                        model=config.model_name,
                        openai_api_key=self.openai_api_key,
                        max_tokens=config.max_tokens,
                        temperature=config.temperature
                    )
>>>>>>> 001-modify-analyzer-method
                
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
<<<<<<< HEAD
            
=======

    def _create_mock_llm(self):
        """Create a mock LLM that generates appropriate tool calls for testing."""
        from langchain_core.messages import AIMessage
        from langchain_core.language_models.base import BaseLanguageModel

        class MockLLM:
            """Mock LLM implementation for testing."""

            def __init__(self):
                self.model_name = "mock-llm"
                logger.info("🧪 MockLLM initialized")

            async def ainvoke(self, messages, *args, **kwargs):
                """Mock async invocation."""
                logger.info("🧪 MockLLM.ainvoke called")

                # Check if this is a verification prompt
                is_verification = False
                for msg in messages:
                    if hasattr(msg, 'content') and isinstance(msg.content, str):
                        content_lower = msg.content.lower()
                        if 'verify the quality' in content_lower or 'verification' in content_lower:
                            is_verification = True
                            break

                # Return appropriate response based on prompt type
                if is_verification:
                    # Return a verification response with a clear numerical score
                    return AIMessage(
                        content="Based on the investigation results, I assess the overall quality and consistency at 0.75. The investigation demonstrates comprehensive data collection, multiple fraud indicators, consistent risk assessment, and proper evidence gathering.",
                        additional_kwargs={}
                    )
                else:
                    # Standard mock response
                    return AIMessage(
                        content="Mock LLM response for investigation analysis in demo mode.",
                        additional_kwargs={}
                    )

            def invoke(self, messages, *args, **kwargs):
                """Mock sync invocation."""
                logger.info("🧪 MockLLM.invoke called")

                return AIMessage(
                    content="Mock LLM response for investigation analysis in demo mode.",
                    additional_kwargs={}
                )

            def bind_tools(self, tools, **kwargs):
                """Mock bind_tools that returns self for chaining."""
                logger.info(f"🧪 MockLLM.bind_tools called with {len(tools) if tools else 0} tools")
                return self

            def with_structured_output(self, schema, **kwargs):
                """Mock structured output binding."""
                logger.info("🧪 MockLLM.with_structured_output called")
                return self

            async def astream(self, messages, *args, **kwargs):
                """Mock async streaming."""
                logger.info("🧪 MockLLM.astream called")
                yield AIMessage(
                    content="Mock LLM streaming response.",
                    additional_kwargs={}
                )

        mock_llm = MockLLM()
        logger.info("🧪 MockLLM created successfully")
        return mock_llm

>>>>>>> 001-modify-analyzer-method
    def get_selected_model(self):
        """Get the currently selected model."""
        if not self.selected_model:
            logger.error("Selected model not initialized")
            # Try to fallback to any available model
<<<<<<< HEAD
            self._try_fallback_model()
=======
            fallback_found = self._try_fallback_model()
            if not fallback_found:
                logger.error("❌ No fallback models available")
>>>>>>> 001-modify-analyzer-method
        return self.selected_model
        
    def get_verification_model(self):
        """Get the verification model."""
        if not self.verification_model:
            logger.warning("Verification model not initialized")
        return self.verification_model
        
<<<<<<< HEAD
    def _try_fallback_model(self):
        """Try to initialize a fallback model if primary fails."""
        # Fallback order prioritizes cost-effective models first, OpenAI preferred for verification
        fallback_order = [
            'claude-3-5-sonnet-20240620',  # Start with cost-effective models
            'gpt-3.5-turbo',             # OpenAI preferred for verification
            'claude-3-haiku-20240307',
            'gemini-1.5-flash',          # Very cost-effective
            'gemini-1.5-flash-002',
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
=======
    def _try_fallback_model(self) -> bool:
        """
        Try to initialize a fallback model if primary fails.

        Returns:
            True if fallback model successfully initialized, False otherwise
        """
        # Fallback order prioritizes cost-effective models first, OpenAI preferred for verification
        fallback_order = [
            'claude-haiku-4-5',           # Most cost-effective model ($1/$5 per million tokens)
            'claude-3-5-haiku-20241022',  # Alternative Haiku name
            'claude-3-haiku-20240307',    # Previous Haiku version
            'gemini-1.5-flash',           # Very cost-effective
            'gemini-1.5-flash-002',
            'gpt-3.5-turbo',              # OpenAI cost-effective
            'claude-3-5-sonnet-20240620',
            'claude-3-5-sonnet-20241022',
            'gemini-pro',
            'gpt-4-turbo-preview',
            'claude-3-opus-20240229',     # More expensive models later in fallback
            'gpt-4',
            'gpt-5',
            'gpt-5-mini',
            'gpt-5-nano',
            'gpt-5-chat-latest',
            'claude-opus-4-1-20250805'    # Most expensive models last
        ]

        for model_id in fallback_order:
            if model_id != self.selected_model_id:
                config = AVAILABLE_MODELS.get(model_id)
                if not config:
                    continue  # Skip models not in registry

                model = self._create_model(config)
                if model:
                    logger.info(f"✅ Using fallback model: {config.display_name}")
                    self.selected_model = model
                    self.selected_model_id = model_id
                    return True

        # No fallback found
        logger.warning("⚠️ No fallback models available")
        return False
>>>>>>> 001-modify-analyzer-method
                    
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
    
    async def invoke_with_mandatory_verification(
        self,
        messages: List[BaseMessage],
        context: Optional[Dict[str, Any]] = None,
        max_retries: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Invoke the selected model with mandatory verification using the new verification system.
        
        This method ensures every LLM call is verified by the verification system.
        If verification is disabled, it falls back to direct invocation.
        
        Args:
            messages: Messages to send to the model
            context: Additional context for verification
            max_retries: Maximum retry attempts (overrides config)
            
        Returns:
            Dictionary with response and comprehensive verification results
        """
        if not self._verification_enabled or not self.verification_service:
            # Fallback to direct invocation if verification disabled
            logger.debug("Verification disabled, using direct invocation")
            return await self._invoke_direct(messages)
        
        # Use the new verification system
        try:
            verified_response, verification_details = await self.verification_service.verify_response_with_retry(
                original_request=messages,
                response="",  # Will be generated by the LLM invoke function
                context=context or {},
                max_retries=max_retries,
                llm_invoke_function=self._invoke_direct
            )
            
            return {
                'response': verified_response,
                'verification': {
                    'verified': True,
                    'confidence_score': verification_details.confidence_score,
                    'verification_model': verification_details.verification_model,
                    'attempt_count': verification_details.attempt_count,
                    'total_time_ms': verification_details.total_time_ms,
                    'cached': verification_details.cached,
                    'explanation': verification_details.explanation,
                    'issues': verification_details.issues
                },
                'model_used': self.selected_model_id,
                'verification_enabled': True
            }
            
        except Exception as e:
            logger.error(f"Verification system failed: {str(e)}")
            # Fallback to direct invocation on verification system failure
            logger.warning("Falling back to direct invocation due to verification system failure")
            result = await self._invoke_direct(messages)
            result['verification_error'] = str(e)
            result['verification_enabled'] = False
            return result
    
    async def _invoke_direct(self, messages: List[BaseMessage]) -> Dict[str, Any]:
        """
        Direct model invocation without verification (internal use only).
<<<<<<< HEAD
        
        Args:
            messages: Messages to send to the model
            
        Returns:
            Dictionary with response and model information
        """
        result = {
            'response': None,
            'model_used': self.selected_model_id,
            'verification_enabled': False
        }
        
        if not self.selected_model:
            logger.error("No model available for invocation")
            result['error'] = "No model available"
            return result
            
        try:
            response = await self.selected_model.ainvoke(messages)
            result['response'] = response.content
            
        except Exception as e:
            # Handle LLM API errors gracefully
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
=======

        Automatically tries fallback models on 404 "model not found" errors.

        Args:
            messages: Messages to send to the model

        Returns:
            Dictionary with response and model information
        """
        # Track which models we've tried to avoid infinite loops
        tried_models = set()
        original_model = self.selected_model_id

        while True:
            result = {
                'response': None,
                'model_used': self.selected_model_id,
                'verification_enabled': False
            }

            # Check if we have a model to try
            if not self.selected_model:
                logger.error("No model available for invocation")
                result['error'] = "No model available"
                return result

            # Check if we've already tried this model (avoid infinite loops)
            if self.selected_model_id in tried_models:
                logger.error(f"❌ Already tried model {self.selected_model_id}, no more fallbacks available")
                result['error'] = f"All fallback models exhausted. Last tried: {self.selected_model_id}"
                return result

            # Mark this model as tried
            tried_models.add(self.selected_model_id)

            try:
                response = await self.selected_model.ainvoke(messages)
                result['response'] = response.content

                # Log successful fallback if we're not using the original model
                if self.selected_model_id != original_model:
                    logger.info(f"✅ Successfully used fallback model: {self.selected_model_id} (original: {original_model})")

                return result

            except Exception as e:
                # Handle LLM API errors gracefully
                if "context_length_exceeded" in str(e) or "maximum context length" in str(e) or "token limit" in str(e).lower():
                    logger.error(f"❌ LLM context length exceeded in model invocation")
                    logger.error(f"   Model: {self.selected_model_id}")
                    logger.error(f"   Error: {str(e)}")
                    logger.error(f"   Context info: {len(messages)} messages, estimated {sum(len(str(m.content)) for m in messages if hasattr(m, 'content'))} characters")
                    result['error'] = f"Context length exceeded for model {self.selected_model_id}"
                    return result

                elif "not_found_error" in str(e).lower() or "notfounderror" in str(type(e)).lower() or ("404" in str(e) and "model" in str(e).lower()):
                    logger.warning(f"⚠️ Model not found: {self.selected_model_id}")
                    logger.info(f"🔄 Attempting automatic fallback to next available model...")

                    # Try fallback model
                    fallback_tried = self._try_fallback_model()

                    if fallback_tried and self.selected_model:
                        logger.info(f"✅ Switched to fallback model: {self.selected_model_id}")
                        # Continue loop to try the new model
                        continue
                    else:
                        logger.error(f"❌ No fallback models available")
                        result['error'] = f"Model not found and no fallback available: {original_model}"
                        return result

                elif any(error_type in str(type(e)).lower() for error_type in ["badrequest", "apierror", "ratelimit"]) or any(provider in str(e).lower() for provider in ["openai", "anthropic", "google"]):
                    logger.error(f"❌ LLM API error in model invocation")
                    logger.error(f"   Model: {self.selected_model_id}")
                    logger.error(f"   Error type: {type(e).__name__}")
                    logger.error(f"   Error details: {str(e)}")
                    result['error'] = f"API error for model {self.selected_model_id}: {type(e).__name__}"
                    return result

                else:
                    logger.error(f"❌ Unexpected error in model invocation")
                    logger.error(f"   Model: {self.selected_model_id}")
                    logger.error(f"   Error type: {type(e).__name__}")
                    logger.error(f"   Error details: {str(e)}")
                    result['error'] = str(e)
                    return result
>>>>>>> 001-modify-analyzer-method
    
    def is_verification_enabled(self) -> bool:
        """
        Check if verification is enabled.
        
        Returns:
            True if verification is enabled, False otherwise
        """
        return self._verification_enabled and self.verification_service is not None
    
    def get_verification_status(self) -> Dict[str, Any]:
        """
        Get comprehensive verification system status.
        
        Returns:
            Dictionary with verification system status and statistics
        """
        if not self.verification_service:
            return {
                'enabled': False,
                'reason': 'Verification service not initialized'
            }
        
        return {
            'enabled': self._verification_enabled,
            'service_healthy': True,
            'cache_stats': self.verification_service.cache.get_cache_stats() if self.verification_service.cache else None,
            'metrics_summary': self.verification_service.metrics.get_performance_summary() if self.verification_service.metrics else None
        }


# Global instance
_llm_manager = None


def get_llm_manager() -> LLMManager:
    """Get the global LLM manager instance."""
    global _llm_manager
    if _llm_manager is None:
        _llm_manager = LLMManager()
    return _llm_manager