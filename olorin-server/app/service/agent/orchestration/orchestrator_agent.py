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
    
    def _initialize_llm(self) -> ChatAnthropic:
        """Initialize the Claude Opus LLM for orchestration."""
        import os
        
        # Check for TEST_MODE first
        test_mode = os.getenv("TEST_MODE", "").lower()
        use_mock = test_mode == "mock" or not os.getenv("ANTHROPIC_API_KEY")
        
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
                    logger.info("🧪 Mock LLM: Skipping additional tools in mock mode")
                    # In tool execution phase, just return a message without tool calls
                    # This will allow the graph to progress
                    return AIMessage(content="In mock mode, skipping additional tool execution.")
                
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
                    where_field = 'IP_ADDRESS'
                elif entity_type == 'user_id':
                    where_field = 'USER_ID'
                else:
                    where_field = 'IP_ADDRESS'  # Default to IP
                
                # Get date range from state context if available, default to 7 days
                date_range = 7  # Default fallback
                query = f"SELECT * FROM TRANSACTIONS_ENRICHED WHERE {where_field} = '{entity_id}' AND TX_DATETIME >= DATEADD(day, -{date_range}, CURRENT_DATE()) LIMIT 100"
                
                response = AIMessage(
                    content=f"I'll query Snowflake for {date_range} days of data.",
                    tool_calls=[{
                        "name": "snowflake_query_tool",
                        "args": {
                            "query": query,
                            "database": "FRAUD_ANALYTICS",
                            "db_schema": "PUBLIC",
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
        
        settings = get_settings_for_env()
        api_key = get_firebase_secret(settings.anthropic_api_key_secret)
        
        if not api_key:
            raise RuntimeError(f"Anthropic API key must be configured in Firebase Secrets")
        
        return ChatAnthropic(
            api_key=api_key,
            model="claude-opus-4-1-20250805",
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
        current_phase = state.get("current_phase", "initialization")
        
        logger.info(f"🎼 Orchestrator handling phase: {current_phase}")
        logger.debug(f"State keys: {list(state.keys())}")
        logger.debug(f"Tools used so far: {len(state.get('tools_used', []))}")
        
        if current_phase == "initialization":
            return await self._handle_initialization(state)
        
        elif current_phase == "snowflake_analysis":
            return await self._handle_snowflake_analysis(state)
        
        elif current_phase == "tool_execution":
            return await self._handle_tool_execution(state)
        
        elif current_phase == "domain_analysis":
            return await self._handle_domain_analysis(state)
        
        elif current_phase == "summary":
            return await self._handle_summary(state)
        
        else:
            logger.warning(f"Unknown phase: {current_phase}")
            return update_phase(state, "summary")
    
    async def _handle_initialization(self, state: InvestigationState) -> Dict[str, Any]:
        """Handle the initialization phase."""
        logger.info(f"🚀 Starting investigation for {state['entity_type']}: {state['entity_id']}")
        
        # Get configuration from state
        date_range_days = state.get('date_range_days', 7)
        
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
        logger.info("📊 Moving from initialization to snowflake_analysis phase")
        
        return {
            "messages": [init_message],
            "current_phase": "snowflake_analysis"
        }
    
    async def _handle_snowflake_analysis(self, state: InvestigationState) -> Dict[str, Any]:
        """Handle Snowflake analysis phase - MANDATORY lookback (default 7 days, configurable)."""
        
        if state.get("snowflake_completed", False):
            logger.info("✅ Snowflake analysis already complete, moving to tool execution")
            return update_phase(state, "tool_execution")
        
        # CRITICAL FIX: Check if any Snowflake ToolMessage already exists
        from langchain_core.messages import ToolMessage
        messages = state.get("messages", [])
        snowflake_result_found = False
        
        for msg in messages:
            if isinstance(msg, ToolMessage) and "snowflake" in msg.name.lower():
                logger.warning("🔧 Found Snowflake ToolMessage but completion flag not set - forcing completion")
                snowflake_result_found = True
                # Force completion and move to next phase
                return {
                    "snowflake_data": msg.content,  # Store the result
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
        
        logger.info(f"❄️ Starting MANDATORY Snowflake {date_range_days}-day analysis")
        
        # Get date range from state, default to 7 days
        date_range_days = state.get('date_range_days', 7)
        
        # Create Snowflake query prompt
        snowflake_prompt = f"""
        You MUST use the snowflake_query_tool to analyze ALL data for the past {date_range_days} days.
        
        Entity to investigate: {state['entity_type']} = {state['entity_id']}
        
        Required Snowflake queries:
        1. Query FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED table for ALL records where:
           - IP_ADDRESS = '{state['entity_id']}' (if entity is IP)
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
        
        logger.info("🤖 Invoking LLM for Snowflake query generation...")
        logger.info(f"   LLM type: {type(self.llm_with_tools)}")
        logger.info(f"   Messages to LLM: {len(messages)}")
        
        response = await self.llm_with_tools.ainvoke(messages)
        
        logger.info(f"🤖 LLM response type: {type(response)}")
        
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
        if test_mode == 'mock' and len(tools_used) >= 1:
            logger.info(f"🎭 Mock mode: Skipping to domain analysis after {len(tools_used)} tools")
            return update_phase(state, "domain_analysis")
        
        # In live mode: Limit tool execution attempts to prevent infinite loops
        tool_execution_attempts = state.get("tool_execution_attempts", 0) + 1
        max_attempts = 3  # Maximum 3 attempts at tool execution
        
        if tool_execution_attempts >= max_attempts or len(tools_used) >= 10:
            logger.info(f"✅ Tool execution complete: {len(tools_used)} tools used, {tool_execution_attempts} attempts")
            return update_phase(state, "domain_analysis")
        
        logger.info(f"🔧 Tool execution phase - {len(tools_used)} tools used, attempt {tool_execution_attempts}/{max_attempts}")
        
        # Get tool count from state, default to 5-6 range
        tool_count = state.get('tool_count', '5-6')
        
        # Analyze Snowflake data to determine which tools to use
        tool_selection_prompt = f"""
        Based on the Snowflake analysis results, select and use {tool_count} additional tools for investigation.
        
        Snowflake findings summary:
        {self._summarize_snowflake_data(snowflake_data)}
        
        Tools already used: {tools_used}
        Attempt: {tool_execution_attempts}/{max_attempts}
        
        IMPORTANT: Select only {tool_count} most relevant tools based on findings. Quality over quantity.
        
        Priority tools to consider:
        1. Threat Intelligence: VirusTotal, AbuseIPDB (for IP reputation)
        2. Database/SIEM: Splunk, SumoLogic (if logs indicate suspicious patterns)
        3. OSINT: For entity investigation (if high-risk patterns detected)
        
        Focus on tools that will provide the most valuable insights based on the Snowflake findings.
        Do NOT select tools unless they are directly relevant to the findings.
        """
        
        human_msg = HumanMessage(content=tool_selection_prompt)
        
        # Filter out system messages and add our own
        existing_messages = [m for m in state.get("messages", []) 
                           if not isinstance(m, SystemMessage)]
        
        base_prompt = f"""You are investigating potential fraud. You have {len(self.tools)} tools available.
Select {tool_count} most relevant tools based on the Snowflake findings.
So far you have used {len(tools_used)} tools. This is attempt {tool_execution_attempts}/{max_attempts}."""
        
        enhanced_prompt = self._create_enhanced_system_prompt(base_prompt, state)
        system_msg = SystemMessage(content=enhanced_prompt)
        
        messages = [system_msg] + existing_messages + [human_msg]
        response = await self.llm_with_tools.ainvoke(messages)
        
        return {
            "messages": [response],
            "current_phase": "tool_execution",  # Stay in this phase until enough tools used
            "tool_execution_attempts": tool_execution_attempts  # Track attempts to prevent infinite loops
        }
    
    async def _handle_domain_analysis(self, state: InvestigationState) -> Dict[str, Any]:
        """Handle domain analysis phase - route to specialized agents."""
        
        # In mock mode, skip domain analysis
        import os
        if os.getenv('TEST_MODE') == 'mock':
            logger.info("🎭 Mock mode: Skipping domain analysis, moving to summary")
            return update_phase(state, "summary")
        
        domains_completed = state.get("domains_completed", [])
        
        # Check if all domains are complete
        required_domains = ["network", "device", "location", "logs", "authorization", "risk"]
        remaining_domains = [d for d in required_domains if d not in domains_completed]
        
        if not remaining_domains:
            logger.info("✅ All domain analyses complete, moving to summary")
            return update_phase(state, "summary")
        
        logger.info(f"🔄 Domain analysis - completed: {domains_completed}, remaining: {remaining_domains}")
        
        # Create message for domain agents
        base_prompt = f"""Domain analysis phase initiated.
Domains to analyze: {remaining_domains}
Execution mode: {'Parallel' if state.get('parallel_execution', True) else 'Sequential'}

Each domain agent should analyze their specific area based on:
- Snowflake data (7-day analysis)
- Tool execution results
- Cross-domain correlations"""
        
        enhanced_prompt = self._create_enhanced_system_prompt(base_prompt, state)
        domain_msg = SystemMessage(content=enhanced_prompt)
        
        return {
            "messages": [domain_msg],
            "current_phase": "domain_analysis",
            "parallel_execution": state.get("parallel_execution", True)
        }
    
    async def _handle_summary(self, state: InvestigationState) -> Dict[str, Any]:
        """Handle summary phase - consolidate all findings."""
        
        from app.service.agent.orchestration.state_schema import calculate_final_risk_score
        from datetime import datetime
        
        logger.info("📊 Generating investigation summary")
        
        # Calculate final risk score
        final_risk_score = calculate_final_risk_score(state)
        
        # Calculate confidence based on tool coverage
        tools_used = state.get("tools_used", [])
        confidence = min(1.0, len(tools_used) / 20.0)  # Max confidence at 20+ tools
        
        # Generate summary
        summary = self._generate_investigation_summary(state, final_risk_score, confidence)
        
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
    
    def _generate_investigation_summary(self, state: InvestigationState, risk_score: float, confidence: float) -> str:
        """Generate comprehensive investigation summary."""
        
        tools_used = state.get("tools_used", [])
        domains_completed = state.get("domains_completed", [])
        risk_indicators = state.get("risk_indicators", [])
        
        summary = f"""
# Fraud Investigation Summary

**Investigation ID:** {state['investigation_id']}
**Entity:** {state['entity_type']} - {state['entity_id']}

## Risk Assessment
- **Risk Score:** {risk_score:.2f} / 1.00
- **Confidence:** {confidence:.2f} / 1.00
- **Risk Level:** {self._get_risk_level(risk_score)}

## Investigation Coverage
- **Tools Used:** {len(tools_used)} tools
- **Domains Analyzed:** {', '.join(domains_completed)}
- **Snowflake Analysis:** {'✅ Complete (' + str(state.get('date_range_days', 7)) + '-day)' if state.get('snowflake_completed') else '❌ Incomplete'}

## Key Risk Indicators
{self._format_risk_indicators(risk_indicators)}

## Tool Usage Summary
- Primary Analysis: Snowflake ({state.get('date_range_days', 7)}-day lookback)
- Threat Intelligence: {sum(1 for t in tools_used if 'threat' in t.lower() or 'virus' in t.lower())} tools
- Database/SIEM: {sum(1 for t in tools_used if 'splunk' in t.lower() or 'sumo' in t.lower())} tools
- ML/AI Analysis: {sum(1 for t in tools_used if 'ml' in t.lower() or 'anomaly' in t.lower())} tools

## Domain Findings
{self._format_domain_findings(state.get('domain_findings', {}))}

## Recommendation
{self._get_recommendation(risk_score)}

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
    # ARCHITECTURE FIX: Track orchestrator loops to prevent infinite recursion
    orchestrator_loops = state.get("orchestrator_loops", 0) + 1
    
    logger.info(f"🎼 Orchestrator node execution #{orchestrator_loops}")
    
    # Get tools from graph configuration
    from app.service.agent.orchestration.clean_graph_builder import get_all_tools
    
    tools = get_all_tools()
    orchestrator = InvestigationOrchestrator(tools)
    
    result = await orchestrator.orchestrate(state)
    
    # Add loop counter to result
    if isinstance(result, dict):
        result["orchestrator_loops"] = orchestrator_loops
    
    return result