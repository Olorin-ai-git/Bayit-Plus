import json  # CRITICAL FIX: Added for snowflake data parsing
import os
"""
Orchestrator Agent for LangGraph Clean Architecture

Central coordinator that manages the investigation flow, tool selection,
and routing to domain agents.
"""

from typing import Dict, Any, List
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_anthropic import ChatAnthropic

from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.state_schema import (
    InvestigationState,
    update_phase,
    add_tool_result,
    is_investigation_complete
)
from app.utils.firebase_secrets import get_firebase_secret
from app.service.config import get_settings_for_env

logger = get_bridge_logger(__name__)


class InvestigationOrchestrator:
    """
    Central orchestrator that manages the entire investigation flow.
    """
    
    def __init__(self, tools: List[Any]):
        """
        Initialize the orchestrator with tools.
        
        Args:
            tools: List of all available tools (52 tools)
        """
        import os
        
        self.tools = tools
        self.tool_names = [tool.name for tool in tools]
        
        logger.info(f"🎯 Initializing orchestrator...")
        logger.info(f"   TEST_MODE: {os.getenv('TEST_MODE')}")
        
        self.llm = self._initialize_llm()
        self.llm_with_tools = self.llm.bind_tools(tools)
        
        logger.info(f"🎯 Orchestrator initialized with {len(tools)} tools")
        logger.info(f"   LLM type: {type(self.llm)}")
        logger.info(f"   LLM with tools type: {type(self.llm_with_tools)}")
        
    def _sanitize_custom_prompt(self, prompt: str) -> str:
        """
        Sanitize custom prompt to prevent injection and ensure safety.
        
        Args:
            prompt: Raw custom prompt from user
            
        Returns:
            Sanitized prompt safe for use
        """
        if not prompt:
            return ""
        
        # Basic sanitization
        sanitized = prompt.strip()
        
        # Length limit for reasonable prompts
        if len(sanitized) > 500:
            sanitized = sanitized[:500] + "..."
            logger.warning(f"Custom prompt truncated to 500 characters")
        
        # Basic security filtering - prevent common injection patterns
        dangerous_patterns = [
            'ignore previous', 'forget instructions', 'system:', 
            'assistant:', 'user:', '```', 'exec(', 'eval(',
            'import ', '__', 'os.', 'subprocess', 'rm -rf', 'delete'
        ]
        
        prompt_lower = sanitized.lower()
        for pattern in dangerous_patterns:
            if pattern in prompt_lower:
                logger.warning(f"Potentially dangerous pattern '{pattern}' detected in custom prompt - removing")
                # Replace dangerous patterns with safe alternatives
                sanitized = sanitized.replace(pattern, '[FILTERED]')
        
        return sanitized
    
    def _validate_investigation_integrity(self, state: InvestigationState) -> bool:
        """
        Validate that custom prompts don't compromise investigation integrity.
        
        Args:
            state: Current investigation state
            
        Returns:
            True if investigation integrity is maintained
        """
        custom_prompt = state.get('custom_user_prompt')
        if not custom_prompt:
            return True
        
        # Ensure mandatory phases cannot be disabled
        prompt_lower = custom_prompt.lower()
        integrity_violations = [
            'skip snowflake', 'bypass snowflake', 'ignore snowflake',
            'no snowflake', 'disable snowflake', 'avoid analysis',
            'skip investigation', 'bypass analysis', 'only use'
        ]
        
        for violation in integrity_violations:
            if violation in prompt_lower:
                logger.warning(f"Investigation integrity violation detected: '{violation}' in custom prompt")
                return False
        
        return True
    
    def _create_enhanced_system_prompt(self, base_prompt: str, state: InvestigationState) -> str:
        """
        Create system prompt with custom user prompt priority.
        
        Args:
            base_prompt: Base system prompt for the current phase
            state: Current investigation state
            
        Returns:
            Enhanced prompt with custom user instruction
        """
        custom_prompt = state.get('custom_user_prompt')
        if not custom_prompt:
            return base_prompt
        
        # Validate investigation integrity first
        if not self._validate_investigation_integrity(state):
            logger.warning("Custom prompt violates investigation integrity - ignoring")
            return base_prompt
        
        # Sanitize custom prompt
        sanitized_prompt = self._sanitize_custom_prompt(custom_prompt)
        if not sanitized_prompt or sanitized_prompt == '[FILTERED]':
            logger.warning("Custom prompt was filtered out due to security concerns")
            return base_prompt
        
        # Construct enhanced prompt with priority
        enhanced_prompt = f"""🎯 USER PRIORITY INSTRUCTION: {sanitized_prompt}

{base_prompt}

IMPORTANT: While following the standard investigation process, give special attention to the user's priority instruction above. Adapt your analysis and tool selection to focus on the specified areas while maintaining investigation completeness."""
        
        logger.info(f"✨ Enhanced prompt with custom user focus: '{sanitized_prompt}'")
        return enhanced_prompt
    
    def _initialize_llm(self):
        """Initialize the configured LLM for orchestration (uses environment-selected model)."""
        import os
        
        # Check for TEST_MODE first
        test_mode = os.getenv("TEST_MODE", "").lower()
        # Check if any API key is available (Anthropic, OpenAI, Google, etc.)
        has_api_key = (os.getenv("ANTHROPIC_API_KEY") or 
                      os.getenv("OPENAI_API_KEY") or 
                      os.getenv("GEMINI_API_KEY"))
        use_mock = test_mode == "mock" or not has_api_key
        
        if use_mock:
            logger.info("🧪 Using mock LLM for testing")
            # Return a mock LLM that generates tool calls
            from unittest.mock import MagicMock
            mock_llm = MagicMock(spec=ChatAnthropic)
            
            # Create a mock response with Snowflake tool call
            async def mock_ainvoke(messages, *args, **kwargs):
                from langchain_core.messages import AIMessage
                
                logger.info("🧪 Mock LLM invoked")
                
                # Check what phase we're in based on message content
                is_tool_execution = False
                for msg in messages:
                    if hasattr(msg, 'content'):
                        content = str(msg.content)
                        if 'select and use additional tools' in content.lower():
                            is_tool_execution = True
                            break
                
                if is_tool_execution:
                    logger.info("🧪 Mock LLM: Generating tool calls for domain analysis")
                    # Fix 2: Generate tool calls for different domains instead of skipping
                    # Need tools for: network, device, location, logs, risk_aggregation
                    
                    # Simulate tool selection for comprehensive domain coverage
                    domain_tools = [
                        {"name": "virustotal_ip_analysis", "args": {"ip_address": entity_id}},  # network domain
                        {"name": "splunk_query", "args": {"entity_id": entity_id, "query_type": "device_analysis"}},  # device domain  
                        {"name": "geoip_lookup", "args": {"ip_address": entity_id}},  # location domain
                        {"name": "sumo_logic_query", "args": {"entity_id": entity_id, "query_type": "behavior_logs"}},  # logs domain
                        {"name": "ml_anomaly_detection", "args": {"entity_id": entity_id, "entity_type": entity_type}}  # risk analysis
                    ]
                    
                    # Return AIMessage with tool calls for domain analysis
                    return AIMessage(
                        content="Selecting tools for comprehensive domain analysis: network reputation, device patterns, location analysis, behavior logs, and anomaly detection.",
                        tool_calls=domain_tools
                    )
                
                logger.info("🧪 Mock LLM: Generating Snowflake tool call")
                
                # Extract entity info from the messages (since state is not accessible here)
                entity_id = '192.168.1.100'  # Default
                entity_type = 'ip_address'  # Default
                
                # Try to extract entity info from the system message
                for msg in messages:
                    if hasattr(msg, 'content') and 'Entity to investigate:' in str(msg.content):
                        import re
                        match = re.search(r'Entity to investigate: (\w+) = ([\w\.]+)', str(msg.content))
                        if match:
                            entity_type = match.group(1).lower()
                            entity_id = match.group(2)
                
                # Build appropriate WHERE clause based on entity type
                if entity_type == 'ip_address':
                    where_field = 'IP'  # CSV schema uses IP column
                elif entity_type == 'user_id':
                    where_field = 'USER_ID'
                else:
                    where_field = 'IP'  # Default to IP
                
                # Get date range from state context if available, default to 7 days
                date_range = 7  # Default fallback
                # CRITICAL FIX: Always select IS_FRAUD_TX - explicit column list prevents missing fraud label
                # User requirement: "Query template must include: SELECT TX_ID_KEY, EMAIL, MODEL_SCORE, IS_FRAUD_TX, NSURE_LAST_DECISION, DISPUTES, FRAUD_ALERTS"
                query = f"""SELECT
                           TX_ID_KEY,
                           EMAIL,
                           MODEL_SCORE,
                           IS_FRAUD_TX,
                           NSURE_LAST_DECISION,
                           DISPUTES,
                           FRAUD_ALERTS,
                           PAID_AMOUNT_VALUE,
                           IP, IP_COUNTRY_CODE,
                           DEVICE_ID, DEVICE_FINGERPRINT,
                           USER_AGENT, DEVICE_TYPE,
                           TX_DATETIME
                           FROM {os.getenv('SNOWFLAKE_DATABASE', 'FRAUD_ANALYTICS')}.{os.getenv('SNOWFLAKE_SCHEMA', 'PUBLIC')}.{os.getenv('SNOWFLAKE_TRANSACTIONS_TABLE', 'TRANSACTIONS_ENRICHED')}
                           WHERE {where_field} = '{entity_id}'
                           ORDER BY TX_DATETIME DESC
                           LIMIT 10"""
                
                response = AIMessage(
                    content=f"I'll query Snowflake for {date_range} days of data.",
                    tool_calls=[{
                        "name": "snowflake_query_tool",
                        "args": {
                            "query": query,
                            "database": os.getenv('SNOWFLAKE_DATABASE', 'FRAUD_ANALYTICS'),
                            "db_schema": os.getenv('SNOWFLAKE_SCHEMA', 'PUBLIC'),
                            "limit": 100
                        },
                        "id": "tool_call_001",
                        "type": "tool_call"  # Ensure type is set
                    }]
                )
                
                logger.info(f"🧪 Mock response has tool_calls: {hasattr(response, 'tool_calls')}")
                logger.info(f"🧪 Number of tool calls: {len(response.tool_calls) if response.tool_calls else 0}")
                
                return response
            
            mock_llm.ainvoke = mock_ainvoke
            # Make bind_tools return self with ainvoke preserved
            def bind_tools_mock(tools):
                mock_llm_with_tools = MagicMock()
                mock_llm_with_tools.ainvoke = mock_ainvoke
                return mock_llm_with_tools
            
            mock_llm.bind_tools = bind_tools_mock
            return mock_llm
        
        # Use the LLM manager to get the configured model
        from app.service.llm_manager import get_llm_manager
        
        try:
            llm_manager = get_llm_manager()
            llm = llm_manager.get_selected_model()
            
            if llm is None:
                raise RuntimeError("No LLM model is available - check API keys and configuration")
            
            # Override settings for orchestration based on model capabilities
            if hasattr(llm, 'temperature'):
                llm.temperature = 0.3  # Lower temperature for more focused orchestration
            if hasattr(llm, 'max_tokens'):
                # Set max_tokens based on model capabilities
                model_id = llm_manager.selected_model_id
                if 'haiku' in model_id.lower():
                    llm.max_tokens = 4096  # Haiku max limit
                elif 'sonnet' in model_id.lower() or 'opus' in model_id.lower():
                    llm.max_tokens = 8000  # Sonnet/Opus can handle more
                else:
                    llm.max_tokens = 4096  # Conservative default for other models
            if hasattr(llm, 'timeout'):
                llm.timeout = 90
                
            logger.info(f"🤖 Orchestrator using model: {llm_manager.selected_model_id}")
            return llm
            
        except Exception as e:
            # Fallback to direct initialization if LLM manager fails
            logger.warning(f"LLM Manager failed, falling back to direct initialization: {e}")
            
            from app.service.config_loader import ConfigLoader
            config_loader = ConfigLoader()
            
            # Respect USE_FIREBASE_SECRETS setting
            api_key = config_loader.load_secret('ANTHROPIC_API_KEY')
            
            if not api_key:
                raise RuntimeError(f"No API key available - check .env file or Firebase Secrets configuration")
            
            # Use the configured model from SELECTED_MODEL
            fallback_model = os.getenv('SELECTED_MODEL', 'claude-3-5-sonnet-20240620')
            logger.info(f"🤖 Orchestrator using fallback model: {fallback_model}")
            
            return ChatAnthropic(
                api_key=api_key,
                model=fallback_model,
                temperature=0.3,  # Lower temperature for more focused orchestration
                max_tokens=8000,
                timeout=90
            )
    
    async def orchestrate(self, state: InvestigationState) -> Dict[str, Any]:
        """
        Main orchestration logic that manages investigation phases.
        
        Args:
            state: Current investigation state
            
        Returns:
            State updates
        """
        import os
        
        # DEBUG logging for Phase 3.2: Phase-Specific Orchestration
        logger.debug("[Step 3.2.1] Phase detection from state.get('current_phase') - Starting orchestrate method")
        
        is_test_mode = os.environ.get("TEST_MODE") == "mock"
        current_phase = state.get("current_phase", "initialization")
        
        logger.debug(f"[Step 3.2.1] Phase detection complete: '{current_phase}'")
        logger.debug(f"[Step 3.2.1] Available phases: ['initialization', 'snowflake_analysis', 'tool_execution', 'domain_analysis', 'summary']")
        logger.debug(f"[Step 3.2.2] LLM initialization with TEST_MODE detection: {'MockLLM' if is_test_mode else 'Real LLM'}")
        
        logger.info(f"🎼 Orchestrator handling phase: {current_phase}")
        logger.debug(f"🎼 ORCHESTRATE DEBUG:")
        logger.debug(f"   Mode: {'TEST' if is_test_mode else 'LIVE'}")
        logger.debug(f"   Current phase: {current_phase}")
        logger.debug(f"   State keys: {list(state.keys())}")
        logger.debug(f"   Tools used so far: {len(state.get('tools_used', []))}")
        logger.debug(f"   Snowflake completed: {state.get('snowflake_completed', False)}")
        logger.debug(f"   Domains completed: {len(state.get('domains_completed', []))}")
        logger.debug(f"   Messages count: {len(state.get('messages', []))}")
        
        if current_phase == "initialization":
            logger.debug("   → Handling initialization phase")
            return await self._handle_initialization(state)
        
        elif current_phase == "snowflake_analysis":
            logger.debug("   → Handling snowflake analysis phase")
            return await self._handle_snowflake_analysis(state)
        
        elif current_phase == "tool_execution":
            logger.debug("   → Handling tool execution phase")
            return await self._handle_tool_execution(state)
        
        elif current_phase == "domain_analysis":
            logger.debug("   → Handling domain analysis phase")
            return await self._handle_domain_analysis(state)
        
        elif current_phase == "summary":
            logger.debug("   → Handling summary phase")
            return await self._handle_summary(state)
        
        else:
            logger.warning(f"Unknown phase: {current_phase}")
            logger.debug(f"   → Unknown phase, moving to summary")
            return update_phase(state, "summary")
    
    async def _handle_initialization(self, state: InvestigationState) -> Dict[str, Any]:
        """Handle the initialization phase."""
        logger.debug("[Step 3.2.3.1] Initialization Handler entry - Creating initial system message")
        
        logger.info(f"🚀 Starting investigation for {state['entity_type']}: {state['entity_id']}")
        logger.debug(f"🚀 INITIALIZATION PHASE DEBUG:")
        logger.debug(f"   Investigation ID: {state['investigation_id']}")
        logger.debug(f"   Entity type: {state['entity_type']}")
        logger.debug(f"   Entity ID: {state['entity_id']}")
        
        # Get configuration from state
        date_range_days = state.get('date_range_days', 7)
        logger.debug(f"   Date range: {date_range_days} days")
        logger.debug(f"[Step 3.2.3.1] Configuration retrieved: {date_range_days}-day lookback analysis")
        
        # Create initial message
        init_message = SystemMessage(content=f"""
        Starting comprehensive fraud investigation.
        Investigation ID: {state['investigation_id']}
        Entity: {state['entity_type']} - {state['entity_id']}
        
        Investigation phases:
        1. Snowflake Analysis ({date_range_days}-day lookback) - MANDATORY
        2. Tool Execution (based on Snowflake findings)
        3. Domain Analysis (6 specialized agents)
        4. Risk Assessment and Summary
        """)
        
        # Immediately move to Snowflake analysis phase
        logger.debug("[Step 3.2.3.1] Immediate transition to 'snowflake_analysis' phase - No analysis in initialization")
        logger.info("📊 Moving from initialization to snowflake_analysis phase")
        
        logger.debug("   ✅ Initialization complete, moving to snowflake_analysis phase")
        logger.debug("[Step 3.2.3.1] Return state: {'messages': [SystemMessage], 'current_phase': 'snowflake_analysis'}")
        
        return {
            "messages": [init_message],
            "current_phase": "snowflake_analysis"
        }
    
    async def _handle_snowflake_analysis(self, state: InvestigationState) -> Dict[str, Any]:
        """Handle Snowflake analysis phase - MANDATORY lookback (default 7 days, configurable)."""
        logger.debug("[Step 3.2.4.1] Snowflake Analysis Handler entry - Checking completion status")
        
        if state.get("snowflake_completed", False):
            logger.debug("[Step 3.2.4.1] Snowflake analysis already completed - Skipping to tool_execution phase")
            logger.info("✅ Snowflake analysis already complete, moving to tool execution")
            return update_phase(state, "tool_execution")
            
        logger.debug("[Step 3.2.4.1] Snowflake analysis not completed - Proceeding with mandatory query execution")
        database = os.getenv('SNOWFLAKE_DATABASE', 'FRAUD_ANALYTICS')
        schema = os.getenv('SNOWFLAKE_SCHEMA', 'PUBLIC')
        table = os.getenv('SNOWFLAKE_TRANSACTIONS_TABLE', 'TRANSACTIONS_ENRICHED')
        logger.debug(f"[Step 3.2.4.1] Target table: {database}.{schema}.{table}")
        
        # CRITICAL FIX: Check if any Snowflake ToolMessage already exists
        from langchain_core.messages import ToolMessage
        messages = state.get("messages", [])
        snowflake_result_found = False
        
        for msg in messages:
            if isinstance(msg, ToolMessage) and "snowflake" in msg.name.lower():
                logger.warning("🔧 Found Snowflake ToolMessage but completion flag not set - forcing completion")
                snowflake_result_found = True
                # Force completion and move to next phase
                # Try to parse as JSON, but handle Python repr() strings too
                snowflake_data = msg.content
                if isinstance(msg.content, str):
                    try:
                        snowflake_data = json.loads(msg.content)
                    except json.JSONDecodeError:
                        # If it's a Python repr string, try to evaluate it safely
                        logger.warning(f"Snowflake data is not valid JSON, attempting to parse Python repr: {msg.content[:100]}...")
                        try:
                            import ast
                            snowflake_data = ast.literal_eval(msg.content)
                        except (ValueError, SyntaxError):
                            logger.error("Failed to parse Snowflake data as JSON or Python literal")
                            snowflake_data = {"error": "Failed to parse Snowflake data", "raw": msg.content}
                
                return {
                    "snowflake_data": snowflake_data,
                    "snowflake_completed": True,
                    "current_phase": "tool_execution"
                }
        
        # Check if we already generated a tool call
        for msg in reversed(messages):
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                # Check if any are Snowflake calls
                for tool_call in msg.tool_calls:
                    if "snowflake" in str(tool_call.get("name", "")).lower():
                        logger.info("⏳ Snowflake tool call already generated, waiting for execution")
                        # Don't generate another one - just return current state
                        return {"current_phase": "snowflake_analysis"}
        
        # Get date range from state, default to 7 days
        date_range_days = state.get('date_range_days', 7)
        
        logger.debug(f"[Step 3.2.4.2] Tool call generation for Snowflake - Date range: {date_range_days} days")
        logger.info(f"❄️ Starting MANDATORY Snowflake {date_range_days}-day analysis")
        
        # Create Snowflake query prompt
        logger.debug("[Step 3.2.4.2] Creating Snowflake query prompt for LLM")
        database = os.getenv('SNOWFLAKE_DATABASE', 'FRAUD_ANALYTICS')
        schema = os.getenv('SNOWFLAKE_SCHEMA', 'PUBLIC')
        table = os.getenv('SNOWFLAKE_TRANSACTIONS_TABLE', 'TRANSACTIONS_ENRICHED')

        snowflake_prompt = f"""
        You MUST use the snowflake_query_tool to analyze ALL data for the past {date_range_days} days.

        Entity to investigate: {state['entity_type']} = {state['entity_id']}

        Required Snowflake queries:
        1. Query {database}.{schema}.{table} table for ALL records where:
           - IP = '{state['entity_id']}' (if entity is IP address)
           - Or related fields match the entity
           - Date range: LAST {date_range_days} DAYS
        
        2. Retrieve these key fields:
           - TX_ID_KEY, TX_DATETIME
           - MODEL_SCORE, IS_FRAUD_TX
           - NSURE_LAST_DECISION
           - PAID_AMOUNT_VALUE, PAYMENT_METHOD
           - IP_COUNTRY, IP_CITY
           - DEVICE_ID, USER_AGENT
           - Any fraud indicators
        
        3. Look for:
           - High risk scores (MODEL_SCORE > 0.7)
           - Confirmed fraud transactions (IS_FRAUD_TX = true)
           - Rejected transactions (NSURE_LAST_DECISION = 'reject')
           - Unusual patterns or anomalies
           - Related entities (other IPs, devices, users)
        
        This is MANDATORY - you MUST query Snowflake before any other analysis.
        Use SQL to get comprehensive {date_range_days}-day data.
        """
        
        # Create human message for Snowflake query
        human_msg = HumanMessage(content=snowflake_prompt)
        
        # Get LLM to generate Snowflake tool call
        # Filter out any system messages from state to avoid duplicates
        existing_messages = [m for m in state.get("messages", []) 
                           if not isinstance(m, SystemMessage)]
        
        # Add single system message at the beginning
        base_prompt = f"""You are the investigation orchestrator. Your FIRST and MANDATORY task is to 
query Snowflake for {date_range_days} days of historical data. This is non-negotiable.
Use the snowflake_query_tool immediately."""
        
        enhanced_prompt = self._create_enhanced_system_prompt(base_prompt, state)
        system_msg = SystemMessage(content=enhanced_prompt)
        
        messages = [system_msg] + existing_messages + [human_msg]
        
        logger.debug("[Step 3.2.4.2] LLM tool call generation - Invoking LLM with SnowflakeQueryTool")
        logger.debug(f"[Step 3.2.4.2] LLM generates tool calls for SnowflakeQueryTool")
        logger.info("🤖 Invoking LLM for Snowflake query generation...")
        logger.info(f"   LLM type: {type(self.llm_with_tools)}")
        logger.info(f"   Messages to LLM: {len(messages)}")
        logger.debug(f"[Step 3.2.4.2] Expected tool call: snowflake_query_tool with {database}.{schema}.{table} query")
        
        # DEBUG: Detailed LLM interaction logging
        logger.debug("🤖 LLM SNOWFLAKE INTERACTION DEBUG:")
        logger.debug(f"   🧠 Reasoning context: Snowflake analysis for {state.get('entity_type')} - {state.get('entity_id')}")
        logger.debug(f"   📝 System prompt length: {len(system_msg.content)} chars")
        logger.debug(f"   📝 System prompt preview: {system_msg.content[:200]}...")
        logger.debug(f"   💭 Human message: {human_msg.content}")
        logger.debug(f"   📚 Existing messages count: {len(existing_messages)}")
        for i, msg in enumerate(existing_messages[-3:]):  # Last 3 messages
            logger.debug(f"      Message {i}: {type(msg).__name__} - {str(msg.content)[:100] if hasattr(msg, 'content') else 'No content'}...")
        logger.debug(f"   🔧 Available tools: {len(self.tools)}")
        logger.debug(f"   🎯 Expected outcome: Snowflake tool call generation")
        
        # CHAIN OF THOUGHT: Log reasoning for Snowflake analysis
        from app.service.agent.chain_of_thought_logger import get_chain_of_thought_logger, ReasoningType
        cot_logger = get_chain_of_thought_logger()
        
        # Start or get active thought process for orchestrator
        investigation_id = state.get('investigation_id', 'unknown')
        process_id = f"orchestrator_{investigation_id}"
        
        if process_id not in cot_logger._active_processes:
            cot_logger.start_agent_thinking(
                investigation_id=investigation_id,
                agent_name="orchestrator",
                domain="orchestration",
                initial_context={"phase": "snowflake_analysis", "entity_type": state.get('entity_type'), "entity_id": state.get('entity_id')}
            )
        
        # Log the reasoning for Snowflake analysis decision
        cot_logger.log_reasoning_step(
            process_id=process_id,
            reasoning_type=ReasoningType.ANALYSIS,
            premise=f"Investigation requires data analysis for {state.get('entity_type')} {state.get('entity_id')}",
            reasoning=f"Snowflake analysis is mandatory first step. Need to query transaction data for last {state.get('date_range_days', 7)} days to understand entity behavior patterns and risk indicators.",
            conclusion="Must generate Snowflake tool call to retrieve foundational data for investigation",
            confidence=0.9,
            supporting_evidence=[
                {"type": "requirement", "data": "Snowflake analysis is mandatory first phase"},
                {"type": "context", "data": f"Entity: {state.get('entity_type')} - {state.get('entity_id')}"},
                {"type": "tools", "data": f"{len(self.tools)} tools available including Snowflake"}
            ],
            metadata={"phase": "snowflake_analysis", "attempt": "initial"}
        )
        
        # Invoke LLM and measure timing
        import time
        start_time = time.time()
        
        try:
            response = await self.llm_with_tools.ainvoke(messages)
            llm_duration = time.time() - start_time
        except Exception as e:
            llm_duration = time.time() - start_time
            
            # Get model information for error reporting
            model_info = "unknown"
            try:
                from app.service.llm_manager import get_llm_manager
                llm_manager = get_llm_manager()
                model_info = llm_manager.selected_model_id if hasattr(llm_manager, 'selected_model_id') else "unknown"
            except:
                model_info = "unknown"
            
            # Handle LLM API errors gracefully (works for OpenAI, Anthropic, etc.)
            if "context_length_exceeded" in str(e) or "maximum context length" in str(e) or "token limit" in str(e).lower():
                logger.error(f"❌ LLM context length exceeded in Snowflake analysis")
                logger.error(f"   Model: {model_info}")
                logger.error(f"   Error: {str(e)}")
                logger.error(f"   Context info: {len(messages)} messages, estimated {sum(len(str(m.content)) for m in messages if hasattr(m, 'content'))} characters")
                logger.error(f"   Investigation cannot continue - fix context length issue")
                raise e
                
            elif "not_found_error" in str(e).lower() or "notfounderror" in str(type(e)).lower() or "model:" in str(e).lower():
                logger.error(f"❌ LLM model not found in Snowflake analysis")
                logger.error(f"   Model: {model_info}")
                logger.error(f"   Error type: {type(e).__name__}")
                logger.error(f"   Error details: {str(e)}")
                logger.error(f"   Investigation cannot continue - fix model configuration (check model name/availability)")
                raise e
                
            elif any(error_type in str(type(e)).lower() for error_type in ["badrequest", "apierror", "ratelimit"]) or any(provider in str(e).lower() for provider in ["openai", "anthropic", "google"]):
                logger.error(f"❌ LLM API error in Snowflake analysis")
                logger.error(f"   Model: {model_info}")
                logger.error(f"   Error type: {type(e).__name__}")
                logger.error(f"   Error details: {str(e)}")
                logger.error(f"   Investigation cannot continue - fix API configuration")
                raise e
                
            else:
                # Re-raise unexpected errors
                logger.error(f"❌ Unexpected error in Snowflake analysis LLM call")
                logger.error(f"   Model: {model_info}")
                logger.error(f"   Error type: {type(e).__name__}")
                logger.error(f"   Error details: {str(e)}")
                raise e
        
        logger.info(f"🤖 LLM response type: {type(response)}")
        logger.debug(f"🤖 LLM RESPONSE DEBUG:")
        logger.debug(f"   ⏱️  LLM response time: {llm_duration:.3f}s")
        logger.debug(f"   📄 Response content length: {len(str(response.content)) if hasattr(response, 'content') else 0} chars")
        logger.debug(f"   📄 Response content preview: {str(response.content)[:200] if hasattr(response, 'content') else 'No content'}...")
        logger.debug(f"   🔧 Tool calls present: {'Yes' if hasattr(response, 'tool_calls') and response.tool_calls else 'No'}")
        if hasattr(response, 'tool_calls') and response.tool_calls:
            for i, tc in enumerate(response.tool_calls):
                tool_name = tc.get('name', 'unknown')
                tool_args_preview = str(tc.get('args', {}))[:100] if tc.get('args') else 'No args'
                logger.debug(f"      Tool call {i}: {tool_name} - {tool_args_preview}...")
        logger.debug(f"   🧠 Chain of thought: LLM analyzed entity and generated {'tool calls' if hasattr(response, 'tool_calls') and response.tool_calls else 'text response'}")
        
        # Log reasoning assessment
        if hasattr(response, 'tool_calls') and response.tool_calls:
            snowflake_calls = [tc for tc in response.tool_calls if 'snowflake' in tc.get('name', '').lower()]
            if snowflake_calls:
                logger.debug(f"   ✅ Reasoning successful: Generated {len(snowflake_calls)} Snowflake tool call(s)")
                
                # CHAIN OF THOUGHT: Log successful tool selection reasoning
                tool_names = [tc.get('name', 'unknown') for tc in response.tool_calls]
                cot_logger.log_tool_selection_reasoning(
                    process_id=process_id,
                    available_tools=[tool.name for tool in self.tools],
                    selected_tools=tool_names,
                    selection_criteria={
                        "requirement": "Snowflake analysis mandatory",
                        "phase": "snowflake_analysis", 
                        "data_needed": "transaction history"
                    },
                    reasoning_chain=[
                        "Identified need for foundational data analysis",
                        "Snowflake contains comprehensive transaction history", 
                        "Query will provide risk indicators and patterns",
                        f"Generated {len(snowflake_calls)} Snowflake tool calls"
                    ],
                    expected_outcomes={tool_name: "Transaction data with risk indicators" for tool_name in tool_names if 'snowflake' in tool_name.lower()},
                    confidence_scores={tool_name: 0.9 for tool_name in tool_names},
                    contextual_factors={
                        "entity_type": state.get('entity_type'),
                        "entity_id": state.get('entity_id'),
                        "date_range_days": state.get('date_range_days', 7),
                        "llm_response_time": llm_duration
                    }
                )
            else:
                logger.debug(f"   ⚠️  Reasoning issue: Generated {len(response.tool_calls)} tool calls but none are Snowflake")
                
                # CHAIN OF THOUGHT: Log tool selection issue
                cot_logger.log_reasoning_step(
                    process_id=process_id,
                    reasoning_type=ReasoningType.ERROR_RECOVERY,
                    premise="LLM generated tool calls but none are Snowflake tools",
                    reasoning=f"Expected Snowflake tool call but got {[tc.get('name') for tc in response.tool_calls]}. This indicates potential prompt engineering issue or tool binding problem.",
                    conclusion="Need to investigate why Snowflake tool was not selected",
                    confidence=0.3,
                    supporting_evidence=[
                        {"type": "response", "data": f"{len(response.tool_calls)} tool calls generated"},
                        {"type": "tools", "data": [tc.get('name') for tc in response.tool_calls]}
                    ],
                    metadata={"issue": "snowflake_not_selected", "phase": "snowflake_analysis"}
                )
        else:
            logger.debug(f"   ❌ Reasoning issue: No tool calls generated, got text response instead")
            
            # CHAIN OF THOUGHT: Log no tool calls issue
            cot_logger.log_reasoning_step(
                process_id=process_id,
                reasoning_type=ReasoningType.ERROR_RECOVERY,
                premise="LLM generated text response instead of tool calls",
                reasoning="Expected tool calls for Snowflake analysis but LLM provided text response. This could indicate prompt engineering issue, tool binding problem, or LLM reasoning failure.",
                conclusion="Investigation cannot proceed without Snowflake data - need to retry or escalate",
                confidence=0.2,
                supporting_evidence=[
                    {"type": "response_type", "data": "text_response"},
                    {"type": "response_content", "data": str(response.content)[:200] if hasattr(response, 'content') else 'No content'}
                ],
                metadata={"issue": "no_tool_calls", "phase": "snowflake_analysis"}
            )
        
        # Check if Snowflake tool was called
        if hasattr(response, 'tool_calls') and response.tool_calls:
            logger.info(f"📞 LLM generated {len(response.tool_calls)} tool calls")
            for tool_call in response.tool_calls:
                logger.info(f"  - Tool: {tool_call.get('name', 'unknown')}")
                if 'snowflake' in tool_call.get('name', '').lower():
                    logger.info("✅ Snowflake tool call generated")
                    break
        else:
            logger.warning("⚠️ LLM did not generate any tool calls")
        
        return {
            "messages": [response],
            "current_phase": "snowflake_analysis"  # Stay in this phase until Snowflake completes
        }
    
    async def _handle_tool_execution(self, state: InvestigationState) -> Dict[str, Any]:
        """Handle additional tool execution based on Snowflake findings."""
        
        snowflake_data = state.get("snowflake_data", {})
        tools_used = state.get("tools_used", [])
        
        # ARCHITECTURE FIX: Set reasonable limits to prevent infinite loops
        import os
        test_mode = os.getenv('TEST_MODE', '').lower()
        
        # In mock mode: Skip additional tools after Snowflake
        logger.debug(f"[SAFETY-CHECK-2] 🔒 TOOL EXECUTION SAFETY CHECK (MOCK MODE)")
        logger.debug(f"[SAFETY-CHECK-2]   Test mode: {test_mode}")
        logger.debug(f"[SAFETY-CHECK-2]   Tools used count: {len(tools_used)}")
        # Fix 2: Mock Mode Domain Completion - Need tools for all 5 domains
        min_tools_for_domains = 5  # network, device, location, logs, risk_aggregation
        logger.debug(f"[SAFETY-CHECK-2]   Mock mode skip condition: {test_mode == 'mock' and len(tools_used) >= min_tools_for_domains}")
        
        if test_mode == 'mock' and len(tools_used) >= min_tools_for_domains:
            logger.debug(f"[SAFETY-CHECK-2]   ✅ TRIGGERED: Mock mode skip after {len(tools_used)} tools (sufficient for all domains)")
            logger.info(f"🎭 Mock mode: Skipping to domain analysis after {len(tools_used)} tools (allows all 5 domains)")
            return update_phase(state, "domain_analysis")
        
        # In live mode: Allow adequate tool execution for domain analysis
        tool_execution_attempts = state.get("tool_execution_attempts", 0) + 1
        orchestrator_loops = state.get("orchestrator_loops", 0)
        max_attempts = 4  # Increased to allow more tool attempts for proper domain analysis
        max_tools = 10  # Increased to allow domain-specific tools
        max_orchestrator_loops = 12  # Increased safety valve for proper analysis
        
        logger.debug(f"[SAFETY-CHECK-3] 🔒 TOOL EXECUTION SAFETY CHECK (LIVE MODE)")
        logger.debug(f"[SAFETY-CHECK-3]   Tool execution attempts: {tool_execution_attempts}/{max_attempts}")
        logger.debug(f"[SAFETY-CHECK-3]   Tools used count: {len(tools_used)}/{max_tools}")
        logger.debug(f"[SAFETY-CHECK-3]   Orchestrator loops: {orchestrator_loops}/{max_orchestrator_loops}")
        logger.debug(f"[SAFETY-CHECK-3]   Condition 1 (attempts): {tool_execution_attempts >= max_attempts}")
        logger.debug(f"[SAFETY-CHECK-3]   Condition 2 (tools): {len(tools_used) >= max_tools}")
        logger.debug(f"[SAFETY-CHECK-3]   Condition 3 (loops): {orchestrator_loops >= max_orchestrator_loops}")
        logger.debug(f"[SAFETY-CHECK-3]   Any condition met: {tool_execution_attempts >= max_attempts or len(tools_used) >= max_tools or orchestrator_loops >= max_orchestrator_loops}")
        
        # CRITICAL FIX: Multiple exit conditions to prevent loops
        if (tool_execution_attempts >= max_attempts or 
            len(tools_used) >= max_tools or  # Reduced tool count
            orchestrator_loops >= max_orchestrator_loops):  # Safety valve
            triggered_condition = []
            if tool_execution_attempts >= max_attempts:
                triggered_condition.append(f"max_attempts({tool_execution_attempts}>={max_attempts})")
            if len(tools_used) >= max_tools:
                triggered_condition.append(f"max_tools({len(tools_used)}>={max_tools})")
            if orchestrator_loops >= max_orchestrator_loops:
                triggered_condition.append(f"max_loops({orchestrator_loops}>={max_orchestrator_loops})")
            
            logger.debug(f"[SAFETY-CHECK-3]   ✅ TRIGGERED: Tool execution limit reached - {', '.join(triggered_condition)}")
            logger.info(f"✅ Tool execution complete: {len(tools_used)} tools used, {tool_execution_attempts} attempts, {orchestrator_loops} loops")
            return update_phase(state, "domain_analysis")
        
        logger.info(f"🔧 Tool execution phase - {len(tools_used)} tools used, attempt {tool_execution_attempts}/{max_attempts}, loop {orchestrator_loops}")
        
        # Get tool count from state, allow adequate tools for domain analysis
        # CRITICAL FIX: Use actual tool count instead of string range
        actual_tools_used = len(set(state.get("tools_used", [])))
        tool_count = max(actual_tools_used, 2)  # Minimum 2 for proper analysis
        
        # Analyze Snowflake data to determine which tools to use
        tool_selection_prompt = f"""
        Based on the Snowflake analysis results, select appropriate additional tools for comprehensive investigation.
        
        Snowflake findings summary:
        {self._summarize_snowflake_data(snowflake_data)}
        
        Tools already used: {tools_used}
        Attempt: {tool_execution_attempts}/{max_attempts}
        Orchestrator loops: {orchestrator_loops}
        
        OBJECTIVE: Select {tool_count} tools that will provide domain-specific data for network, device, location, and behavioral analysis.
        
        Recommended tools for comprehensive fraud investigation:
        1. Threat Intelligence: VirusTotal OR AbuseIPDB (for IP reputation analysis)
        2. Network Analysis: Splunk OR SumoLogic (for network behavior patterns)
        3. Device Fingerprinting: ML Anomaly Detection (for device behavior analysis)
        4. Geographic Analysis: GeoIP tools (for location-based risk assessment)
        
        Select tools that will provide the domain agents with rich data for analysis.
        Each tool should target a different domain (network, device, location, logs) to maximize investigation coverage.
        The goal is to gather comprehensive evidence across multiple fraud dimensions.
        """
        
        human_msg = HumanMessage(content=tool_selection_prompt)
        
        # Filter out system messages and add our own
        existing_messages = [m for m in state.get("messages", []) 
                           if not isinstance(m, SystemMessage)]
        
        base_prompt = f"""You are investigating potential fraud. You have {len(self.tools)} tools available.
Select {tool_count} tools based on the Snowflake findings for comprehensive domain analysis.
So far you have used {len(tools_used)} tools. This is attempt {tool_execution_attempts}/{max_attempts}.
Orchestrator loops: {orchestrator_loops}. Select tools that will provide rich data to domain agents for network, device, location, and behavioral analysis."""
        
        enhanced_prompt = self._create_enhanced_system_prompt(base_prompt, state)
        system_msg = SystemMessage(content=enhanced_prompt)
        
        messages = [system_msg] + existing_messages + [human_msg]
        
        # DEBUG: Detailed LLM interaction logging for tool execution
        logger.debug("🤖 LLM TOOL EXECUTION INTERACTION DEBUG:")
        logger.debug(f"   🧠 Reasoning context: Tool execution phase for {state.get('entity_type')} - {state.get('entity_id')}")
        logger.debug(f"   📝 System prompt length: {len(system_msg.content)} chars")
        logger.debug(f"   📝 System prompt preview: {enhanced_prompt[:200]}...")
        logger.debug(f"   💭 Human message: {human_msg.content}")
        logger.debug(f"   📚 Existing messages count: {len(existing_messages)}")
        logger.debug(f"   🔧 Available tools: {len(self.tools)}")
        logger.debug(f"   🎯 Expected outcome: Additional tool call generation based on Snowflake results")
        
        # Log Snowflake context for reasoning
        snowflake_data = state.get('snowflake_data')
        if snowflake_data:
            logger.debug(f"   📊 Snowflake context available: Yes ({len(str(snowflake_data))} chars)")
            logger.debug(f"   📊 Snowflake preview: {str(snowflake_data)[:150]}...")
        else:
            logger.debug(f"   📊 Snowflake context available: No")
        
        # Invoke LLM and measure timing
        import time
        start_time = time.time()
        
        try:
            response = await self.llm_with_tools.ainvoke(messages)
            llm_duration = time.time() - start_time
        except Exception as e:
            llm_duration = time.time() - start_time
            
            # Get model information for error reporting
            model_info = "unknown"
            try:
                from app.service.llm_manager import get_llm_manager
                llm_manager = get_llm_manager()
                model_info = llm_manager.selected_model_id if hasattr(llm_manager, 'selected_model_id') else "unknown"
            except:
                model_info = "unknown"
            
            # Handle LLM API errors gracefully (works for OpenAI, Anthropic, etc.)
            if "context_length_exceeded" in str(e) or "maximum context length" in str(e) or "token limit" in str(e).lower():
                logger.error(f"❌ LLM context length exceeded in tool execution")
                logger.error(f"   Model: {model_info}")
                logger.error(f"   Error: {str(e)}")
                logger.error(f"   Context info: {len(messages)} messages, estimated {sum(len(str(m.content)) for m in messages if hasattr(m, 'content'))} characters")
                logger.error(f"   Tool execution attempts: {tool_execution_attempts}/{max_attempts}")
                logger.error(f"   Investigation cannot continue - fix context length issue")
                raise e
                
            elif "not_found_error" in str(e).lower() or "notfounderror" in str(type(e)).lower() or "model:" in str(e).lower():
                logger.error(f"❌ LLM model not found in tool execution")
                logger.error(f"   Model: {model_info}")
                logger.error(f"   Error type: {type(e).__name__}")
                logger.error(f"   Error details: {str(e)}")
                logger.error(f"   Tool execution attempts: {tool_execution_attempts}/{max_attempts}")
                logger.error(f"   Investigation cannot continue - fix model configuration (check model name/availability)")
                raise e
                
            elif any(error_type in str(type(e)).lower() for error_type in ["badrequest", "apierror", "ratelimit"]) or any(provider in str(e).lower() for provider in ["openai", "anthropic", "google"]):
                logger.error(f"❌ LLM API error in tool execution")
                logger.error(f"   Model: {model_info}")
                logger.error(f"   Error type: {type(e).__name__}")
                logger.error(f"   Error details: {str(e)}")
                logger.error(f"   Tool execution attempts: {tool_execution_attempts}/{max_attempts}")
                logger.error(f"   Investigation cannot continue - fix API configuration")
                raise e
                
            else:
                # Re-raise unexpected errors
                logger.error(f"❌ Unexpected error in tool execution LLM call")
                logger.error(f"   Model: {model_info}")
                logger.error(f"   Error type: {type(e).__name__}")
                logger.error(f"   Error details: {str(e)}")
                logger.error(f"   Tool execution attempts: {tool_execution_attempts}/{max_attempts}")
                raise e
        
        # DEBUG: Detailed response analysis
        logger.debug(f"🤖 LLM TOOL EXECUTION RESPONSE DEBUG:")
        logger.debug(f"   ⏱️  LLM response time: {llm_duration:.3f}s")
        logger.debug(f"   📄 Response content length: {len(str(response.content)) if hasattr(response, 'content') else 0} chars")
        logger.debug(f"   📄 Response content preview: {str(response.content)[:200] if hasattr(response, 'content') else 'No content'}...")
        logger.debug(f"   🔧 Tool calls present: {'Yes' if hasattr(response, 'tool_calls') and response.tool_calls else 'No'}")
        
        if hasattr(response, 'tool_calls') and response.tool_calls:
            for i, tc in enumerate(response.tool_calls):
                tool_name = tc.get('name', 'unknown')
                tool_args_preview = str(tc.get('args', {}))[:100] if tc.get('args') else 'No args'
                logger.debug(f"      Tool call {i}: {tool_name} - {tool_args_preview}...")
            logger.debug(f"   🧠 Chain of thought: LLM analyzed Snowflake results and generated {len(response.tool_calls)} additional tool calls")
        else:
            logger.debug(f"   🧠 Chain of thought: LLM decided no additional tools needed based on current analysis")
            
        # Log reasoning assessment for tool execution
        tools_used_count = len(state.get('tools_used', []))
        if hasattr(response, 'tool_calls') and response.tool_calls:
            logger.debug(f"   ✅ Reasoning successful: Generated {len(response.tool_calls)} new tool calls (total tools used: {tools_used_count})")
        else:
            logger.debug(f"   💭 Reasoning decision: No additional tools needed (current tools used: {tools_used_count})")
        
        return {
            "messages": [response],
            "current_phase": "tool_execution",  # Stay in this phase until enough tools used
            "tool_execution_attempts": tool_execution_attempts  # Track attempts to prevent infinite loops
        }
    
    async def _handle_domain_analysis(self, state: InvestigationState) -> Dict[str, Any]:
        """Handle domain analysis phase - route to specialized agents."""
        
        # Domain agents handle mock mode internally - don't skip them
        import os
        test_mode = os.getenv('TEST_MODE', '').lower()
        
        logger.debug(f"[SAFETY-CHECK-4] 🔒 DOMAIN ANALYSIS SAFETY CHECK (MODE DETECTION)")
        logger.debug(f"[SAFETY-CHECK-4]   Test mode: {test_mode}")
        logger.debug(f"[SAFETY-CHECK-4]   Domain agents will run in: {'MOCK' if test_mode == 'mock' else 'LIVE'} mode")
        logger.debug(f"[SAFETY-CHECK-4]   Domain agents handle mock behavior internally")
        
        domains_completed = state.get("domains_completed", [])
        orchestrator_loops = state.get("orchestrator_loops", 0)
        min_domains_required = 5  # Require at least 5 domains (network, device, location, logs, authentication)
        max_orchestrator_loops = 15  # Allow more loops for complete analysis
        
        logger.debug(f"[SAFETY-CHECK-5] 🔒 DOMAIN ANALYSIS SAFETY CHECK (LIVE MODE)")
        logger.debug(f"[SAFETY-CHECK-5]   Domains completed: {domains_completed}")
        logger.debug(f"[SAFETY-CHECK-5]   Domains completed count: {len(domains_completed)}")
        logger.debug(f"[SAFETY-CHECK-5]   Minimum domains required: {min_domains_required}")
        logger.debug(f"[SAFETY-CHECK-5]   Orchestrator loops: {orchestrator_loops}")
        logger.debug(f"[SAFETY-CHECK-5]   Maximum orchestrator loops: {max_orchestrator_loops}")
        logger.debug(f"[SAFETY-CHECK-5]   Condition 1 (min domains): {len(domains_completed) >= min_domains_required}")
        logger.debug(f"[SAFETY-CHECK-5]   Condition 2 (max loops): {orchestrator_loops >= max_orchestrator_loops}")
        logger.debug(f"[SAFETY-CHECK-5]   Any condition met: {len(domains_completed) >= min_domains_required or orchestrator_loops >= max_orchestrator_loops}")
        
        # CRITICAL FIX: Force completion after reasonable attempts
        if len(domains_completed) >= min_domains_required or orchestrator_loops >= max_orchestrator_loops:
            triggered_condition = []
            if len(domains_completed) >= min_domains_required:
                triggered_condition.append(f"sufficient_domains({len(domains_completed)}>={min_domains_required})")
            if orchestrator_loops >= max_orchestrator_loops:
                triggered_condition.append(f"max_loops({orchestrator_loops}>={max_orchestrator_loops})")
            
            logger.debug(f"[SAFETY-CHECK-5]   ✅ TRIGGERED: Domain analysis completion - {', '.join(triggered_condition)}")
            logger.info(f"✅ Domain analysis sufficient: {len(domains_completed)} domains, {orchestrator_loops} loops - moving to summary")
            return update_phase(state, "summary")
        
        # Check if all domains are complete
        required_domains = ["network", "device", "location", "logs", "authentication", "risk"]
        remaining_domains = [d for d in required_domains if d not in domains_completed]
        
        logger.debug(f"[SAFETY-CHECK-6] 🔒 DOMAIN COMPLETION CHECK")
        logger.debug(f"[SAFETY-CHECK-6]   Required domains: {required_domains}")
        logger.debug(f"[SAFETY-CHECK-6]   Remaining domains: {remaining_domains}")
        logger.debug(f"[SAFETY-CHECK-6]   All domains complete: {not remaining_domains}")
        
        if not remaining_domains:
            logger.info("✅ All domain analyses complete, moving to summary")
            return update_phase(state, "summary")
        
        logger.info(f"🔄 Domain analysis - completed: {domains_completed}, remaining: {remaining_domains}, loop: {orchestrator_loops}")
        
        # Create message for domain agents
        base_prompt = f"""Domain analysis phase initiated.
Domains to analyze: {remaining_domains}
Execution mode: Sequential (to prevent conflicts)
Orchestrator loops: {orchestrator_loops}

Each domain agent should analyze their specific area based on:
- Snowflake data ({state.get('date_range_days', 7)}-day analysis)
- Tool execution results
- Cross-domain correlations

Be efficient to prevent timeout issues."""
        
        enhanced_prompt = self._create_enhanced_system_prompt(base_prompt, state)
        domain_msg = SystemMessage(content=enhanced_prompt)
        
        return {
            "messages": [domain_msg],
            "current_phase": "domain_analysis",
            "parallel_execution": False  # Force sequential to prevent conflicts
        }
    
    async def _handle_summary(self, state: InvestigationState) -> Dict[str, Any]:
        """Handle summary phase - consolidate all findings."""
        
        from datetime import datetime
        
        logger.info("📊 Generating investigation summary with LLM risk assessment")
        
        # Get LLM-based risk assessment from aggregated tool results
        llm_assessment = await self.analyze_with_llm(state)
        
        # Use LLM's risk score as the final risk score
        final_risk_score = llm_assessment.get("risk_score", 0.5)
        confidence = llm_assessment.get("confidence", 0.5)
        
        # Generate summary including LLM reasoning
        summary = self._generate_investigation_summary_with_llm(state, llm_assessment)
        
        summary_msg = AIMessage(content=summary)
        
        # Calculate total duration
        start_time = state.get("start_time")
        if start_time:
            from datetime import datetime
            start_dt = datetime.fromisoformat(start_time)
            end_dt = datetime.utcnow()
            duration_ms = int((end_dt - start_dt).total_seconds() * 1000)
        else:
            duration_ms = 0
        
        return {
            "messages": [summary_msg],
            "current_phase": "complete",
            "risk_score": final_risk_score,
            "confidence_score": confidence,
            "end_time": datetime.utcnow().isoformat(),
            "total_duration_ms": duration_ms
        }
    
    def _summarize_snowflake_data(self, snowflake_data) -> str:
        """Summarize Snowflake data for tool selection - handles both string and dict."""
        if not snowflake_data:
            return "No Snowflake data available yet"
        
        # CRITICAL FIX: Handle both string (non-JSON) and dict (JSON) data
        if isinstance(snowflake_data, str):
            # Raw string content from Snowflake
            return f"Snowflake raw result: {snowflake_data[:200]}{'...' if len(snowflake_data) > 200 else ''}"
        
        if not isinstance(snowflake_data, dict):
            return f"Snowflake data type: {type(snowflake_data)} - {str(snowflake_data)[:200]}"
        
        # Extract key metrics from JSON data
        summary_parts = []
        
        if "results" in snowflake_data:
            results = snowflake_data["results"]
            summary_parts.append(f"- {len(results)} records analyzed")
            
            # Look for high risk scores
            high_risk = [r for r in results if r.get("MODEL_SCORE", 0) > 0.7]
            if high_risk:
                summary_parts.append(f"- {len(high_risk)} high-risk transactions found")
            
            # Look for fraud flags
            fraud_txs = [r for r in results if r.get("IS_FRAUD_TX")]
            if fraud_txs:
                summary_parts.append(f"- {len(fraud_txs)} confirmed fraud transactions")
        
        if "row_count" in snowflake_data:
            summary_parts.append(f"- Total rows: {snowflake_data['row_count']}")
        
        return "\n".join(summary_parts) if summary_parts else "Snowflake data received"
    
    async def analyze_with_llm(self, state: InvestigationState) -> Dict[str, Any]:
        """Analyze aggregated tool results with LLM for risk assessment."""
        logger.info("🤖 Performing LLM-based risk assessment on aggregated tool results")
        
        # Prepare comprehensive analysis prompt
        analysis_prompt = self._prepare_risk_analysis_prompt(state)
        
        # Create messages for LLM
        system_msg = SystemMessage(content="""You are a fraud risk assessment expert. Analyze the investigation results and provide:
1. A risk score from 0.0 to 1.0 based on the evidence
2. Confidence level in your assessment (0.0 to 1.0)
3. Key risk factors identified
4. Detailed reasoning for your risk assessment
5. Recommended actions

Base your assessment ONLY on the actual data provided. Do not use arbitrary values.""")
        
        human_msg = HumanMessage(content=analysis_prompt)
        
        try:
            # Invoke LLM for risk assessment
            response = await self.llm.ainvoke([system_msg, human_msg])
            
            # Parse the LLM response to extract risk metrics
            return self._parse_llm_risk_assessment(response.content)
            
        except Exception as e:
            logger.error(f"LLM risk assessment failed: {e}")
            # Fallback to data-driven calculation
            return self._calculate_fallback_risk_score(state)
    
    def _prepare_risk_analysis_prompt(self, state: InvestigationState) -> str:
        """Prepare comprehensive prompt for LLM risk analysis."""
        
        # Extract key data from state
        snowflake_data = state.get("snowflake_data", {})
        tool_results = state.get("tool_results", {})
        domain_findings = state.get("domain_findings", {})
        
        prompt = f"""Analyze this fraud investigation and provide risk assessment:

## Investigation Details
- Entity: {state.get('entity_type', 'unknown')} - {state.get('entity_id', 'unknown')}
- Investigation ID: {state.get('investigation_id', 'unknown')}

## Snowflake Data Analysis ({state.get('date_range_days', 7)}-day lookback)
{self._format_snowflake_for_llm(snowflake_data)}

## Tool Results
{self._format_tools_for_llm(tool_results)}

## Domain Agent Findings
{self._format_domains_for_llm(domain_findings)}

## Risk Indicators Found
{self._format_risk_indicators_for_llm(state.get('risk_indicators', []))}

Based on ALL the above evidence, provide:
1. Overall risk score (0.0-1.0) - MUST be data-driven based on the evidence
2. Confidence in assessment (0.0-1.0) - based on data completeness
3. Top 5 risk factors with evidence
4. Detailed reasoning explaining your risk score
5. Specific recommended actions"""
        
        return prompt
    
    def _format_snowflake_for_llm(self, snowflake_data) -> str:
        """Format Snowflake data for LLM analysis."""
        if not snowflake_data:
            return "No Snowflake data available"
        
        if isinstance(snowflake_data, dict) and "results" in snowflake_data:
            results = snowflake_data["results"]
            if not results:
                return "No transaction records found"
            
            # Extract key metrics
            model_scores = [r.get("MODEL_SCORE", 0) for r in results if "MODEL_SCORE" in r]
            fraud_flags = [r for r in results if r.get("IS_FRAUD_TX")]
            
            summary = f"""- Total transactions: {len(results)}
- Average MODEL_SCORE: {sum(model_scores)/len(model_scores) if model_scores else 0:.3f}
- High risk transactions (MODEL_SCORE > 0.7): {len([s for s in model_scores if s > 0.7])}
- Confirmed fraud transactions: {len(fraud_flags)}
- Date range: {results[0].get('TX_DATETIME', 'N/A')} to {results[-1].get('TX_DATETIME', 'N/A') if results else 'N/A'}"""
            
            return summary
        
        return f"Raw data: {str(snowflake_data)[:500]}"
    
    def _format_tools_for_llm(self, tool_results: Dict) -> str:
        """Format tool results for LLM analysis."""
        if not tool_results:
            return "No additional tools executed"
        
        formatted = []
        for tool_name, result in tool_results.items():
            if isinstance(result, dict):
                # Extract key findings from each tool
                if "risk_score" in result:
                    formatted.append(f"- {tool_name}: Risk score {result['risk_score']}")
                elif "is_malicious" in result:
                    formatted.append(f"- {tool_name}: {'Malicious' if result['is_malicious'] else 'Clean'}")
                else:
                    formatted.append(f"- {tool_name}: {str(result)[:100]}")
            else:
                formatted.append(f"- {tool_name}: {str(result)[:100]}")
        
        return "\n".join(formatted) if formatted else "No tool results"
    
    def _format_domains_for_llm(self, domain_findings: Dict) -> str:
        """Format domain findings for LLM analysis."""
        if not domain_findings:
            return "No domain analysis completed"
        
        formatted = []
        for domain, findings in domain_findings.items():
            if isinstance(findings, dict):
                risk = findings.get("risk_score", 0.0)
                indicators = findings.get("risk_indicators", [])
                formatted.append(f"""### {domain.title()} Domain
- Risk Score: {risk:.2f}
- Indicators: {', '.join(indicators[:3]) if indicators else 'None'}
- Confidence: {findings.get('confidence', 0.0):.2f}""")
        
        return "\n\n".join(formatted) if formatted else "No domain findings"
    
    def _format_risk_indicators_for_llm(self, indicators: list) -> str:
        """Format risk indicators for LLM analysis."""
        if not indicators:
            return "No specific risk indicators identified"
        
        unique = list(set(indicators))[:15]  # Top 15 unique indicators
        return "\n".join([f"- {ind}" for ind in unique])
    
    def _parse_llm_risk_assessment(self, llm_response: str) -> Dict[str, Any]:
        """Parse LLM response to extract risk assessment metrics."""
        import re
        
        # Try to extract risk score
        risk_pattern = r"risk\s*score[:\s]*(\d*\.?\d+)"
        risk_match = re.search(risk_pattern, llm_response.lower())
        risk_score = float(risk_match.group(1)) if risk_match else 0.5
        
        # Try to extract confidence
        conf_pattern = r"confidence[:\s]*(\d*\.?\d+)"
        conf_match = re.search(conf_pattern, llm_response.lower())
        confidence = float(conf_match.group(1)) if conf_match else 0.5
        
        # Extract risk factors (look for numbered or bulleted lists)
        factors_pattern = r"(?:risk factors?|key factors?)[:\s]*([\s\S]*?)(?:reasoning|recommendation|$)"
        factors_match = re.search(factors_pattern, llm_response.lower())
        risk_factors = factors_match.group(1).strip() if factors_match else ""
        
        # Extract reasoning
        reasoning_pattern = r"(?:reasoning|explanation)[:\s]*([\s\S]*?)(?:recommendation|$)"
        reasoning_match = re.search(reasoning_pattern, llm_response.lower())
        reasoning = reasoning_match.group(1).strip() if reasoning_match else llm_response
        
        # Extract recommendations
        rec_pattern = r"(?:recommendation|action)[s]?[:\s]*([\s\S]*?)$"
        rec_match = re.search(rec_pattern, llm_response.lower())
        recommendations = rec_match.group(1).strip() if rec_match else "Monitor activity"
        
        return {
            "risk_score": min(1.0, max(0.0, risk_score)),
            "confidence": min(1.0, max(0.0, confidence)),
            "risk_factors": risk_factors,
            "reasoning": reasoning,
            "recommendations": recommendations,
            "llm_response": llm_response
        }
    
    def _calculate_fallback_risk_score(self, state: InvestigationState) -> Dict[str, Any]:
        """Calculate fallback risk score based on data when LLM fails."""
        logger.warning("Using fallback risk calculation")
        
        # Extract MODEL_SCORE from Snowflake data as primary indicator
        risk_score = 0.0
        snowflake_data = state.get("snowflake_data", {})
        
        if isinstance(snowflake_data, dict) and "results" in snowflake_data:
            results = snowflake_data["results"]
            model_scores = [float(r.get("MODEL_SCORE", 0)) for r in results if "MODEL_SCORE" in r]
            if model_scores:
                risk_score = sum(model_scores) / len(model_scores)
        
        # Calculate confidence based on data availability
        data_points = 0
        if state.get("snowflake_completed"):
            data_points += 1
        data_points += len(state.get("tools_used", [])) * 0.1
        data_points += len(state.get("domains_completed", [])) * 0.2
        
        confidence = min(1.0, data_points / 5.0)
        
        return {
            "risk_score": risk_score,
            "confidence": confidence,
            "risk_factors": "Fallback calculation based on MODEL_SCORE",
            "reasoning": f"Primary risk indicator MODEL_SCORE average: {risk_score:.3f}",
            "recommendations": "Review investigation manually due to LLM failure"
        }
    
    def _generate_investigation_summary_with_llm(self, state: InvestigationState, llm_assessment: Dict[str, Any]) -> str:
        """Generate comprehensive investigation summary with LLM assessment."""
        
        tools_used = state.get("tools_used", [])
        domains_completed = state.get("domains_completed", [])
        risk_score = llm_assessment.get("risk_score", 0.5)
        confidence = llm_assessment.get("confidence", 0.5)
        
        summary = f"""
# Fraud Investigation Summary

**Investigation ID:** {state['investigation_id']}
**Entity:** {state['entity_type']} - {state['entity_id']}

## LLM Risk Assessment
- **Risk Score:** {risk_score:.2f} / 1.00 (LLM-determined)
- **Confidence:** {confidence:.2f} / 1.00
- **Risk Level:** {self._get_risk_level(risk_score)}

## LLM Analysis
### Risk Factors
{llm_assessment.get('risk_factors', 'No specific factors identified')}

### Reasoning
{llm_assessment.get('reasoning', 'No reasoning provided')}

## Investigation Coverage
- **Tools Used:** {len(tools_used)} tools
- **Domains Analyzed:** {', '.join(domains_completed)}
- **Snowflake Analysis:** {'✅ Complete (' + str(state.get('date_range_days', 7)) + '-day)' if state.get('snowflake_completed') else '❌ Incomplete'}

## Tool Usage Summary
- Primary Analysis: Snowflake ({state.get('date_range_days', 7)}-day lookback)
- Threat Intelligence: {sum(1 for t in tools_used if 'threat' in t.lower() or 'virus' in t.lower())} tools
- Database/SIEM: {sum(1 for t in tools_used if 'splunk' in t.lower() or 'sumo' in t.lower())} tools
- ML/AI Analysis: {sum(1 for t in tools_used if 'ml' in t.lower() or 'anomaly' in t.lower())} tools

## Domain Findings
{self._format_domain_findings(state.get('domain_findings', {}))}

## LLM Recommendations
{llm_assessment.get('recommendations', self._get_recommendation(risk_score))}

**Investigation Complete**
"""
        return summary
    
    def _get_risk_level(self, risk_score: float) -> str:
        """Get risk level description from score."""
        if risk_score >= 0.8:
            return "🔴 CRITICAL"
        elif risk_score >= 0.6:
            return "🟠 HIGH"
        elif risk_score >= 0.4:
            return "🟡 MEDIUM"
        elif risk_score >= 0.2:
            return "🔵 LOW"
        else:
            return "🟢 MINIMAL"
    
    def _format_risk_indicators(self, indicators: List[str]) -> str:
        """Format risk indicators for summary."""
        if not indicators:
            return "- No specific risk indicators identified"
        
        unique_indicators = list(set(indicators))[:10]  # Top 10 unique indicators
        return "\n".join([f"- {indicator}" for indicator in unique_indicators])
    
    def _format_domain_findings(self, domain_findings: Dict[str, Any]) -> str:
        """Format domain findings for summary."""
        if not domain_findings:
            return "No domain findings available"
        
        formatted = []
        for domain, findings in domain_findings.items():
            if isinstance(findings, dict):
                risk = findings.get("risk_score", 0.0)
                formatted.append(f"- **{domain.title()}**: Risk {risk:.2f}")
        
        return "\n".join(formatted) if formatted else "Domain analysis pending"
    
    def _get_recommendation(self, risk_score: float) -> str:
        """Get recommendation based on risk score."""
        if risk_score >= 0.8:
            return "🚨 **IMMEDIATE ACTION REQUIRED**: Block entity and investigate all related transactions"
        elif risk_score >= 0.6:
            return "⚠️ **HIGH PRIORITY**: Flag for manual review and consider temporary restrictions"
        elif risk_score >= 0.4:
            return "📋 **MONITOR**: Add to watchlist and monitor future activity"
        elif risk_score >= 0.2:
            return "👀 **LOW RISK**: Continue standard monitoring"
        else:
            return "✅ **APPROVED**: No immediate action required"


async def orchestrator_node(state: InvestigationState) -> Dict[str, Any]:
    """
    Node function for the orchestrator in the graph.
    
    Args:
        state: Current investigation state
        
    Returns:
        State updates
    """
    import os
    
    # DEBUG logging for Phase 3.1: Orchestrator Node Entry
    logger.debug("[Step 3.1.1] Safety check with loop counter increment - Starting orchestrator_node")
    
    # ARCHITECTURE FIX: Track orchestrator loops to prevent infinite recursion
    orchestrator_loops = state.get("orchestrator_loops", 0) + 1
    is_test_mode = os.environ.get("TEST_MODE") == "mock"
    
    logger.debug(f"[Step 3.1.1] Loop counter incremented: {orchestrator_loops} (previous: {state.get('orchestrator_loops', 0)})")
    logger.debug(f"[Step 3.1.1] Test mode detection: {'TEST_MODE=mock' if is_test_mode else 'LIVE mode'}")
    
    # CRITICAL SAFETY CHECK: Prevent runaway orchestrator execution
    max_orchestrator_executions = 8 if is_test_mode else 15  # Conservative limits
    
    logger.debug(f"[SAFETY-CHECK-1] 🔒 ORCHESTRATOR LOOP SAFETY CHECK")
    logger.debug(f"[SAFETY-CHECK-1]   Current orchestrator loops: {orchestrator_loops}")
    logger.debug(f"[SAFETY-CHECK-1]   Maximum allowed executions: {max_orchestrator_executions}")
    logger.debug(f"[SAFETY-CHECK-1]   Mode: {'TEST' if is_test_mode else 'LIVE'}")
    logger.debug(f"[SAFETY-CHECK-1]   Investigation ID: {state.get('investigation_id', 'unknown')}")
    logger.debug(f"[SAFETY-CHECK-1]   Current phase: {state.get('current_phase', 'unknown')}")
    logger.debug(f"[SAFETY-CHECK-1]   Safety status: {'❌ EXCEEDED' if orchestrator_loops > max_orchestrator_executions else '✅ WITHIN LIMITS'}")
    
    if orchestrator_loops > max_orchestrator_executions:
        logger.error(f"🚨 ORCHESTRATOR SAFETY VIOLATION: {orchestrator_loops} executions exceeded limit of {max_orchestrator_executions}")
        logger.error(f"   Mode: {'TEST' if is_test_mode else 'LIVE'}")
        logger.error(f"   Investigation: {state.get('investigation_id', 'unknown')}")
        logger.error(f"   Phase: {state.get('current_phase', 'unknown')}")
        logger.error(f"   This indicates an infinite loop bug - FORCING INVESTIGATION TERMINATION")
        
        # Force investigation termination with error state
        return {
            "orchestrator_loops": orchestrator_loops,
            "current_phase": "complete",  # Force to completion
            "errors": state.get("errors", []) + [{
                "type": "orchestrator_runaway",
                "message": f"Orchestrator executed {orchestrator_loops} times, exceeding safety limit of {max_orchestrator_executions}",
                "phase": state.get("current_phase", "unknown"),
                "safety_termination": True
            }],
            "risk_score": 0.5,  # Default medium risk on safety termination
            "confidence_score": 0.0  # Zero confidence due to incomplete investigation
        }
    
    logger.info(f"🎼 Orchestrator node execution #{orchestrator_loops}/{max_orchestrator_executions}")
    logger.debug(f"🎼 ORCHESTRATOR NODE DEBUG:")
    logger.debug(f"   Mode: {'TEST' if is_test_mode else 'LIVE'}")
    logger.debug(f"   Loop: {orchestrator_loops}")
    logger.debug(f"   Investigation ID: {state.get('investigation_id', 'N/A')}")
    logger.debug(f"   Current phase: {state.get('current_phase', 'N/A')}")
    logger.debug(f"   Entity: {state.get('entity_type', 'N/A')} - {state.get('entity_id', 'N/A')}")
    logger.debug(f"   Messages count: {len(state.get('messages', []))}")
    logger.debug(f"   Tools used: {state.get('tools_used', [])}")
    logger.debug(f"   Snowflake completed: {state.get('snowflake_completed', False)}")
    logger.debug(f"   Domains completed: {state.get('domains_completed', [])}")
    
    # Get tools from graph configuration
    from app.service.agent.orchestration.clean_graph_builder import get_all_tools
    
    logger.debug("[Step 3.1.3] InvestigationOrchestrator instance creation - Getting tools")
    tools = get_all_tools()
    logger.debug(f"[Step 3.1.3] Tools retrieved: {len(tools)} tools available")
    logger.debug(f"[Step 3.1.3] Tool names: {[tool.name for tool in tools[:5]]}..." if len(tools) > 5 else f"[Step 3.1.3] Tool names: {[tool.name for tool in tools]}")
    
    logger.debug("[Step 3.1.3] Creating InvestigationOrchestrator instance")
    orchestrator = InvestigationOrchestrator(tools)
    logger.debug("[Step 3.1.3] InvestigationOrchestrator instance created successfully")
    
    logger.debug("   🚀 Starting orchestration...")
    result = await orchestrator.orchestrate(state)
    
    # Add loop counter to result
    if isinstance(result, dict):
        result["orchestrator_loops"] = orchestrator_loops
        logger.debug(f"   ✅ Orchestration complete, returning:")
        logger.debug(f"      Updated phase: {result.get('current_phase', 'unchanged')}")
        logger.debug(f"      New messages: {len(result.get('messages', []))}")
        logger.debug(f"      Tool calls made: {'Yes' if result.get('messages') and any(hasattr(msg, 'tool_calls') and msg.tool_calls for msg in result.get('messages', [])) else 'No'}")
    
    return result