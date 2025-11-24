"""
Enhanced Tool Executor - Advanced LangGraph tool execution with resilience patterns.

This module implements Phase 1 of the LangGraph enhancement plan, providing:
- Advanced retry logic with exponential backoff
- Circuit breaker pattern for external service protection
- Performance monitoring and tracing
- Tool health checking and dynamic filtering
"""

import asyncio
import json
import time
import threading
from typing import Any, Dict, List, Optional, Set, Union, Sequence
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum

from langchain_core.tools import BaseTool
from langgraph.prebuilt import ToolNode
from langchain_core.runnables import RunnableConfig
from langchain_core.messages import AIMessage, ToolMessage, BaseMessage
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict, Annotated
from app.service.logging import get_bridge_logger
from app.utils.security_utils import (
    sanitize_tool_result,
    sanitize_exception_message,
    sanitize_websocket_event_data,
    get_error_category,
    create_result_hash
)

logger = get_bridge_logger(__name__)

# Global tool execution event handlers
_tool_event_handlers = []

# Resource limits for metrics storage
MAX_TOOL_METRICS = 1000  # Maximum number of tools to track
MAX_PERFORMANCE_SAMPLES = 50  # Reduced from 100 for memory efficiency


class CircuitState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"  # Normal operation
    OPEN = "open"      # Failures exceeded threshold
    HALF_OPEN = "half_open"  # Testing if service recovered


@dataclass
class ToolHealthMetrics:
    """Health metrics for a tool."""
    tool_name: str
    success_count: int = 0
    failure_count: int = 0
    total_latency: float = 0.0
    last_failure_time: Optional[datetime] = None
    circuit_state: CircuitState = CircuitState.CLOSED
    consecutive_failures: int = 0
    
    @property
    def average_latency(self) -> float:
        """Calculate average latency."""
        total = self.success_count + self.failure_count
        return self.total_latency / total if total > 0 else 0.0
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate."""
        total = self.success_count + self.failure_count
        return self.success_count / total if total > 0 else 1.0


class MessagesState(TypedDict):
    """State with messages for LangGraph."""
    messages: Annotated[List[BaseMessage], add_messages]


class EnhancedToolNode(ToolNode):
    """Enhanced tool node with resilience patterns and monitoring."""
    
    def __init__(self, tools: Sequence[BaseTool], investigation_id: str = None, **kwargs):
        """Initialize enhanced tool node with validation."""
        # Input validation
        if not tools:
            raise ValueError("Tools sequence cannot be empty")
        if not isinstance(tools, (list, tuple)):
            raise TypeError("Tools must be a sequence (list or tuple)")
        
        super().__init__(tools, **kwargs)
        # Store tools explicitly for our enhanced functionality
        self.tools = tools
        self.investigation_id = investigation_id if investigation_id else None
        
        # Thread lock for circuit breaker state changes
        self._state_lock = threading.RLock()
        
        # Retry configuration with validation
        self.retry_config = {
            'max_retries': 3,
            'backoff_factor': 1.5,
            'retry_exceptions': [ConnectionError, TimeoutError, asyncio.TimeoutError],
            'max_backoff': 30.0  # Maximum backoff time in seconds
        }
        
        # Circuit breaker configuration with validation
        self.circuit_config = {
            'failure_threshold': 5,  # Open circuit after 5 failures
            'recovery_timeout': 60,  # Try recovery after 60 seconds
            'half_open_requests': 2   # Number of test requests in half-open state
        }
        
        # Validate configurations
        self._validate_config()
        
        # Tool health tracking - Initialize proper health manager
        self.health_manager = ToolHealthManager()
        self.tool_metrics: Dict[str, ToolHealthMetrics] = {}
        self._initialize_metrics()
        
        # Initialize health manager with our tools
        for tool in self.tools:
            if isinstance(tool, BaseTool):
                # Add tool to health manager
                self.health_manager.health_checks[tool.name] = ToolHealthMetrics(tool_name=tool.name)
                # Ensure circuit breaker starts in CLOSED state (working)
                self.health_manager.health_checks[tool.name].circuit_state = CircuitState.CLOSED
        
    def _validate_config(self):
        """Validate configuration parameters."""
        if self.retry_config['max_retries'] <= 0:
            raise ValueError("max_retries must be greater than 0")
        if self.retry_config['backoff_factor'] <= 1.0:
            raise ValueError("backoff_factor must be greater than 1.0")
        if self.retry_config['max_backoff'] <= 0:
            raise ValueError("max_backoff must be greater than 0")
        if self.circuit_config['failure_threshold'] <= 0:
            raise ValueError("failure_threshold must be greater than 0")
        if self.circuit_config['recovery_timeout'] <= 0:
            raise ValueError("recovery_timeout must be greater than 0")
        if self.circuit_config['half_open_requests'] <= 0:
            raise ValueError("half_open_requests must be greater than 0")
        
        # Performance monitoring
        self.performance_threshold = 5.0  # Warn if tool takes > 5 seconds
        
    def _initialize_metrics(self):
        """Initialize metrics for all tools."""
        for tool in self.tools:
            if isinstance(tool, BaseTool):
                self.tool_metrics[tool.name] = ToolHealthMetrics(tool_name=tool.name)
    
    async def ainvoke(self, input: Union[Dict[str, Any], MessagesState], config: Optional[RunnableConfig] = None) -> Union[Dict[str, Any], MessagesState]:
        """
        Enhanced invoke with resilience patterns.

        Args:
            input: Input state or messages
            config: Runtime configuration

        Returns:
            Updated state with tool responses
        """
        logger.info(f"🔧 EnhancedToolNode.ainvoke called with input type: {type(input)}")
<<<<<<< HEAD
        
=======

        # DEBUG: Log input keys if it's a dict
        if isinstance(input, dict):
            logger.info(f"🔧 Input is dict with keys: {list(input.keys())}")
            if "investigation_id" in input:
                logger.info(f"🔧 investigation_id found in input: {input['investigation_id']}")

        # Extract investigation_id from state if not set at init time (CRITICAL FIX)
        if not self.investigation_id:
            if isinstance(input, dict) and "investigation_id" in input:
                self.investigation_id = input.get("investigation_id")
                logger.info(f"🔧 CRITICAL: Extracted investigation_id from state: {self.investigation_id}")
            elif config:
                # Try to extract from config.configurable
                configurable = config.get("configurable", {}) if isinstance(config, dict) else getattr(config, "configurable", {})
                if isinstance(configurable, dict) and "investigation_id" in configurable:
                    self.investigation_id = configurable["investigation_id"]
                    logger.info(f"🔧 CRITICAL: Extracted investigation_id from config: {self.investigation_id}")
                elif isinstance(configurable, dict) and "thread_id" in configurable:
                    # Some graphs use thread_id as investigation_id
                    self.investigation_id = configurable["thread_id"]
                    logger.info(f"🔧 CRITICAL: Extracted investigation_id from thread_id: {self.investigation_id}")

>>>>>>> 001-modify-analyzer-method
        # Extract messages from input
        if isinstance(input, dict) and "messages" in input:
            messages = input["messages"]
            logger.info(f"🔧 Extracted {len(messages)} messages from dict input")
        else:
            # Handle direct message input
            messages = input if isinstance(input, list) else [input]
            logger.info(f"🔧 Processing {len(messages)} direct messages")
<<<<<<< HEAD
=======
        
        # Check if composio tools should be forced
        input_state = input if isinstance(input, dict) else {}
        entity_id = input_state.get('entity_id', '')
        entity_type = input_state.get('entity_type', '')
        tools_used = input_state.get('tools_used', [])
        orchestrator_loops = input_state.get('orchestrator_loops', 0)
        
        # Also check messages for composio_search tool results (in case tools_used isn't updated yet)
        composio_search_in_messages = False
        if isinstance(input, dict) and "messages" in input:
            for msg in input["messages"]:
                if hasattr(msg, 'name') and msg.name == "composio_search":
                    composio_search_in_messages = True
                    break
        
        # Log state for debugging
        logger.info(f"🔧 Composio forcing check: entity_id={entity_id}, entity_type={entity_type}, tools_used={tools_used}, orchestrator_loops={orchestrator_loops}, composio_search_in_messages={composio_search_in_messages}")
        logger.info(f"🔧 Available composio tools: {[t.name for t in self.tools if 'composio' in t.name.lower()]}")
        
        # Extract IP addresses, phone numbers, and emails from Snowflake data for threat intelligence tools
        extracted_ips = []
        extracted_phones = []
        extracted_emails = []
        if isinstance(input, dict):
            snowflake_data = input.get("snowflake_data", {})
            if isinstance(snowflake_data, dict) and "results" in snowflake_data:
                results = snowflake_data.get("results", [])
                for r in results:
                    # Extract IP addresses
                    ip = (r.get("IP") or r.get("ip") or r.get("ip_address") or 
                          r.get("IP_ADDRESS") or r.get("source_ip") or r.get("SOURCE_IP"))
                    if ip and isinstance(ip, str) and ip not in extracted_ips:
                        # Basic IP validation (IPv4 or IPv6)
                        import re
                        ipv4_pattern = r'^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'
                        ipv6_pattern = r'^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$'
                        if re.match(ipv4_pattern, ip) or re.match(ipv6_pattern, ip) or ':' in ip:
                            extracted_ips.append(ip)
                    
                    # Extract phone numbers
                    phone = (r.get("PHONE") or r.get("phone") or r.get("phone_number") or 
                            r.get("PHONE_NUMBER") or r.get("mobile") or r.get("MOBILE") or
                            r.get("telephone") or r.get("TELEPHONE"))
                    if phone and isinstance(phone, str) and phone not in extracted_phones:
                        # Basic phone validation (contains digits, at least 10 characters)
                        import re
                        cleaned_phone = re.sub(r'\D', '', phone)
                        if len(cleaned_phone) >= 10:  # Minimum 10 digits for a valid phone
                            extracted_phones.append(phone)
                    
                    # Extract email addresses
                    email = (r.get("EMAIL") or r.get("email") or r.get("email_address") or 
                            r.get("EMAIL_ADDRESS") or r.get("user_email") or r.get("USER_EMAIL") or
                            r.get("paypal_email") or r.get("PAYPAL_EMAIL"))
                    if email and isinstance(email, str) and email not in extracted_emails:
                        # Basic email validation (contains @ and .)
                        import re
                        email_pattern = r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'
                        if re.match(email_pattern, email):
                            extracted_emails.append(email)
        
        logger.info(f"🔧 Extracted {len(extracted_ips)} IP address(es) from Snowflake data: {extracted_ips[:3]}..." if len(extracted_ips) > 3 else f"🔧 Extracted {len(extracted_ips)} IP address(es): {extracted_ips}")
        logger.info(f"🔧 Extracted {len(extracted_phones)} phone number(s) from Snowflake data: {extracted_phones[:3]}..." if len(extracted_phones) > 3 else f"🔧 Extracted {len(extracted_phones)} phone number(s): {extracted_phones}")
        logger.info(f"🔧 Extracted {len(extracted_emails)} email address(es) from Snowflake data: {extracted_emails[:3]}..." if len(extracted_emails) > 3 else f"🔧 Extracted {len(extracted_emails)} email address(es): {extracted_emails}")
        
        # Force composio tools if conditions are met
        # Force after first tool call OR if we have entity but no tools used yet
        has_composio_search = any(t.name == "composio_search" for t in self.tools)
        has_composio_webcrawl = any(t.name == "composio_webcrawl" for t in self.tools)
        
        # Check for threat intelligence tools
        has_abuseipdb = any(t.name == "abuseipdb_ip_reputation" for t in self.tools)
        has_virustotal = any(t.name == "virustotal_ip_analysis" for t in self.tools)
        has_shodan = any(t.name == "shodan_infrastructure_analysis" for t in self.tools)
        has_veriphone = any(t.name == "veriphone_verify_phone" for t in self.tools)
        has_ipqs_email = any(t.name == "ipqs_email_verification" for t in self.tools)
        
        force_composio_search = (
            "composio_search" not in tools_used and 
            not composio_search_in_messages and  # Also check messages
            entity_id and 
            has_composio_search and
            (len(tools_used) > 0 or orchestrator_loops >= 0)  # Force after any tool OR always if we have entity
        )
        
        # Force composio_webcrawl after composio_search has been used
        # Check both tools_used list AND messages for composio_search
        force_composio_webcrawl = (
            "composio_webcrawl" not in tools_used and 
            ("composio_search" in tools_used or composio_search_in_messages) and  # Check both sources
            entity_id and 
            has_composio_webcrawl
        )
        
        logger.info(f"🔧 Composio forcing decision: search={force_composio_search}, webcrawl={force_composio_webcrawl}, has_search={has_composio_search}, has_webcrawl={has_composio_webcrawl}")
        
        tool_calls_to_add = []
        
        if force_composio_search:
            logger.warning(f"⚠️ FORCING composio_search for {entity_type}={entity_id} (loop {orchestrator_loops}, tools_used: {tools_used})")
            from uuid import uuid4
            tool_calls_to_add.append({
                "name": "composio_search",
                "args": {
                    "query": f"{entity_id} fraud",
                    "max_results": 5,
                    "entity_id": entity_id
                },
                "id": str(uuid4())
            })
        
        # Force threat intelligence tools if we have IP addresses and they haven't been used
        if extracted_ips and len(tools_used) > 0:  # Only force after some tools have been used (e.g., after Snowflake query)
            first_ip = extracted_ips[0]  # Use first IP for threat intelligence
            
            # Force AbuseIPDB if available and not used
            if has_abuseipdb and "abuseipdb_ip_reputation" not in tools_used:
                logger.warning(f"⚠️ FORCING abuseipdb_ip_reputation for IP {first_ip}")
                from uuid import uuid4
                tool_calls_to_add.append({
                    "name": "abuseipdb_ip_reputation",
                    "args": {"ip": first_ip, "max_age_days": 90},
                    "id": str(uuid4())
                })
            
            # Force VirusTotal if available and not used
            if has_virustotal and "virustotal_ip_analysis" not in tools_used:
                logger.warning(f"⚠️ FORCING virustotal_ip_analysis for IP {first_ip}")
                from uuid import uuid4
                tool_calls_to_add.append({
                    "name": "virustotal_ip_analysis",
                    "args": {"ip": first_ip, "include_vendor_details": False},
                    "id": str(uuid4())
                })
        
        # Force Veriphone if we have phone numbers and it hasn't been used
        if extracted_phones and len(tools_used) > 0:  # Only force after some tools have been used (e.g., after Snowflake query)
            first_phone = extracted_phones[0]  # Use first phone for verification
            
            # Force Veriphone if available and not used
            if has_veriphone and "veriphone_verify_phone" not in tools_used:
                logger.warning(f"⚠️ FORCING veriphone_verify_phone for phone {first_phone}")
                from uuid import uuid4
                tool_calls_to_add.append({
                    "name": "veriphone_verify_phone",
                    "args": {"phone": first_phone, "entity_id": entity_id},
                    "id": str(uuid4())
                })
        
        # Force IPQS Email if we have email addresses and it hasn't been used
        if extracted_emails and len(tools_used) > 0:  # Only force after some tools have been used (e.g., after Snowflake query)
            first_email = extracted_emails[0]  # Use first email for verification
            
            # Force IPQS Email if available and not used
            if has_ipqs_email and "ipqs_email_verification" not in tools_used:
                logger.warning(f"⚠️ FORCING ipqs_email_verification for email {first_email}")
                from uuid import uuid4
                tool_calls_to_add.append({
                    "name": "ipqs_email_verification",
                    "args": {"email": first_email, "entity_id": entity_id},
                    "id": str(uuid4())
                })
        
        # Note: webcrawl forcing will be checked AFTER composio_search executes (see below)
        
        if tool_calls_to_add:
            composio_aimessage = AIMessage(content="", tool_calls=tool_calls_to_add)
            messages.append(composio_aimessage)
>>>>>>> 001-modify-analyzer-method
        
        # Process each message that requires tool invocation
        result_messages = []
        tool_calls_found = 0
        
        for message_idx, message in enumerate(messages):
            logger.debug(f"🔧 Processing message {message_idx + 1}/{len(messages)}: {type(message)}")
            
            if isinstance(message, AIMessage) and message.tool_calls:
                tool_calls_found += len(message.tool_calls)
                logger.info(f"🔧 Found {len(message.tool_calls)} tool calls in AIMessage")
                
                for tool_idx, tool_call in enumerate(message.tool_calls):
                    tool_name = tool_call.get("name", "unknown")
                    tool_id = tool_call.get("id", "")
                    logger.info(f"🔧 Executing tool {tool_idx + 1}/{len(message.tool_calls)}: {tool_name} (id: {tool_id})")
                    
                    try:
<<<<<<< HEAD
                        # Execute with resilience
                        result = await self._execute_tool_with_resilience(tool_call, config)
                        logger.info(f"🔧 ✅ Tool {tool_name} executed successfully, result type: {type(result)}")
                        
                        # Create tool message with result
=======
                        # Execute with resilience - pass input state to infer agent name
                        result = await self._execute_tool_with_resilience(tool_call, config, input_state=input)
                        logger.info(f"🔧 ✅ Tool {tool_name} executed successfully, result type: {type(result)}")

                        # CRITICAL FIX: Serialize result to proper JSON for LLM processing
                        # This ensures database results (List[Dict]) remain structured objects, not strings
                        if isinstance(result, (dict, list)):
                            content = json.dumps(result, default=str, ensure_ascii=False)
                            logger.debug(f"🔧 Serialized {type(result).__name__} to JSON string (length: {len(content)})")
                        elif isinstance(result, str):
                            content = result
                            logger.debug(f"🔧 Result already string (length: {len(content)})")
                        else:
                            content = str(result)
                            logger.debug(f"🔧 Converted {type(result).__name__} to string")

                        # Create tool message with properly serialized result
>>>>>>> 001-modify-analyzer-method
                        tool_message = ToolMessage(
                            content=content,
                            tool_call_id=tool_call.get("id", ""),
                            name=tool_call.get("name", "unknown")
                        )
                        result_messages.append(tool_message)
                        logger.debug(f"🔧 Created ToolMessage for {tool_name}")
<<<<<<< HEAD
=======
                        
                        # After snowflake_query_tool completes, extract IPs, phones, and emails, then force threat intelligence tools
                        if tool_name == "snowflake_query_tool" and isinstance(result, dict):
                            logger.info(f"🔧 snowflake_query_tool completed, extracting IPs, phones, emails and checking threat intelligence tools...")
                            # Extract IPs, phones, and emails from Snowflake results
                            snowflake_results = result.get("results", [])
                            new_extracted_ips = []
                            new_extracted_phones = []
                            new_extracted_emails = []
                            for r in snowflake_results:
                                # Extract IP addresses
                                ip = (r.get("IP") or r.get("ip") or r.get("ip_address") or 
                                      r.get("IP_ADDRESS") or r.get("source_ip") or r.get("SOURCE_IP"))
                                if ip and isinstance(ip, str) and ip not in new_extracted_ips:
                                    import re
                                    ipv4_pattern = r'^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'
                                    ipv6_pattern = r'^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$'
                                    if re.match(ipv4_pattern, ip) or re.match(ipv6_pattern, ip) or ':' in ip:
                                        new_extracted_ips.append(ip)
                                
                                # Extract phone numbers
                                phone = (r.get("PHONE") or r.get("phone") or r.get("phone_number") or 
                                        r.get("PHONE_NUMBER") or r.get("mobile") or r.get("MOBILE") or
                                        r.get("telephone") or r.get("TELEPHONE"))
                                if phone and isinstance(phone, str) and phone not in new_extracted_phones:
                                    import re
                                    cleaned_phone = re.sub(r'\D', '', phone)
                                    if len(cleaned_phone) >= 10:  # Minimum 10 digits for a valid phone
                                        new_extracted_phones.append(phone)
                                
                                # Extract email addresses
                                email = (r.get("EMAIL") or r.get("email") or r.get("email_address") or 
                                        r.get("EMAIL_ADDRESS") or r.get("user_email") or r.get("USER_EMAIL") or
                                        r.get("paypal_email") or r.get("PAYPAL_EMAIL"))
                                if email and isinstance(email, str) and email not in new_extracted_emails:
                                    import re
                                    email_pattern = r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'
                                    if re.match(email_pattern, email):
                                        new_extracted_emails.append(email)
                            
                            if new_extracted_ips:
                                logger.info(f"🔧 Extracted {len(new_extracted_ips)} IP(s) from Snowflake results: {new_extracted_ips[:3]}")
                                first_ip = new_extracted_ips[0]
                            
                            if new_extracted_phones:
                                logger.info(f"🔧 Extracted {len(new_extracted_phones)} phone(s) from Snowflake results: {new_extracted_phones[:3]}")
                                first_phone = new_extracted_phones[0]
                            
                            if new_extracted_emails:
                                logger.info(f"🔧 Extracted {len(new_extracted_emails)} email(s) from Snowflake results: {new_extracted_emails[:3]}")
                                first_email = new_extracted_emails[0]
                                
                                # Force AbuseIPDB if available and not used
                                if has_abuseipdb and "abuseipdb_ip_reputation" not in tools_used:
                                    logger.warning(f"⚠️ FORCING abuseipdb_ip_reputation after Snowflake query for IP {first_ip}")
                                    from uuid import uuid4
                                    try:
                                        abuseipdb_tool_call = {
                                            "name": "abuseipdb_ip_reputation",
                                            "args": {"ip": first_ip, "max_age_days": 90},
                                            "id": str(uuid4())
                                        }
                                        abuseipdb_result = await self._execute_tool_with_resilience(abuseipdb_tool_call, config, input_state=input)
                                        logger.info(f"🔧 ✅ Tool abuseipdb_ip_reputation executed successfully, result type: {type(abuseipdb_result)}")
                                        
                                        # Serialize result
                                        if isinstance(abuseipdb_result, (dict, list)):
                                            abuseipdb_content = json.dumps(abuseipdb_result, default=str, ensure_ascii=False)
                                        elif isinstance(abuseipdb_result, str):
                                            abuseipdb_content = abuseipdb_result
                                        else:
                                            abuseipdb_content = str(abuseipdb_result)
                                        
                                        abuseipdb_tool_message = ToolMessage(
                                            content=abuseipdb_content,
                                            tool_call_id=abuseipdb_tool_call.get("id", ""),
                                            name="abuseipdb_ip_reputation"
                                        )
                                        result_messages.append(abuseipdb_tool_message)
                                        logger.debug(f"🔧 Created ToolMessage for abuseipdb_ip_reputation")
                                    except Exception as e:
                                        safe_error_msg = sanitize_exception_message(e)
                                        logger.error(f"🔧 ❌ Tool abuseipdb_ip_reputation execution failed: {safe_error_msg}")
                                
                                # Force VirusTotal if available and not used
                                if has_virustotal and "virustotal_ip_analysis" not in tools_used:
                                    logger.warning(f"⚠️ FORCING virustotal_ip_analysis after Snowflake query for IP {first_ip}")
                                    from uuid import uuid4
                                    try:
                                        virustotal_tool_call = {
                                            "name": "virustotal_ip_analysis",
                                            "args": {"ip": first_ip, "include_vendor_details": False},
                                            "id": str(uuid4())
                                        }
                                        virustotal_result = await self._execute_tool_with_resilience(virustotal_tool_call, config, input_state=input)
                                        logger.info(f"🔧 ✅ Tool virustotal_ip_analysis executed successfully, result type: {type(virustotal_result)}")
                                        
                                        # Serialize result
                                        if isinstance(virustotal_result, (dict, list)):
                                            virustotal_content = json.dumps(virustotal_result, default=str, ensure_ascii=False)
                                        elif isinstance(virustotal_result, str):
                                            virustotal_content = virustotal_result
                                        else:
                                            virustotal_content = str(virustotal_result)
                                        
                                        virustotal_tool_message = ToolMessage(
                                            content=virustotal_content,
                                            tool_call_id=virustotal_tool_call.get("id", ""),
                                            name="virustotal_ip_analysis"
                                        )
                                        result_messages.append(virustotal_tool_message)
                                        logger.debug(f"🔧 Created ToolMessage for virustotal_ip_analysis")
                                    except Exception as e:
                                        safe_error_msg = sanitize_exception_message(e)
                                        logger.error(f"🔧 ❌ Tool virustotal_ip_analysis execution failed: {safe_error_msg}")
                                
                                # Force Veriphone if available and not used
                                if new_extracted_phones and has_veriphone and "veriphone_verify_phone" not in tools_used:
                                    logger.warning(f"⚠️ FORCING veriphone_verify_phone after Snowflake query for phone {first_phone}")
                                    from uuid import uuid4
                                    try:
                                        veriphone_tool_call = {
                                            "name": "veriphone_verify_phone",
                                            "args": {"phone": first_phone, "entity_id": entity_id},
                                            "id": str(uuid4())
                                        }
                                        veriphone_result = await self._execute_tool_with_resilience(veriphone_tool_call, config, input_state=input)
                                        logger.info(f"🔧 ✅ Tool veriphone_verify_phone executed successfully, result type: {type(veriphone_result)}")
                                        
                                        # Serialize result
                                        if isinstance(veriphone_result, (dict, list)):
                                            veriphone_content = json.dumps(veriphone_result, default=str, ensure_ascii=False)
                                        elif isinstance(veriphone_result, str):
                                            veriphone_content = veriphone_result
                                        else:
                                            veriphone_content = str(veriphone_result)
                                        
                                        veriphone_tool_message = ToolMessage(
                                            content=veriphone_content,
                                            tool_call_id=veriphone_tool_call.get("id", ""),
                                            name="veriphone_verify_phone"
                                        )
                                        result_messages.append(veriphone_tool_message)
                                        logger.debug(f"🔧 Created ToolMessage for veriphone_verify_phone")
                                    except Exception as e:
                                        safe_error_msg = sanitize_exception_message(e)
                                        logger.error(f"🔧 ❌ Tool veriphone_verify_phone execution failed: {safe_error_msg}")
                                
                                # Force IPQS Email if available and not used
                                if new_extracted_emails and has_ipqs_email and "ipqs_email_verification" not in tools_used:
                                    logger.warning(f"⚠️ FORCING ipqs_email_verification after Snowflake query for email {first_email}")
                                    from uuid import uuid4
                                    try:
                                        ipqs_tool_call = {
                                            "name": "ipqs_email_verification",
                                            "args": {"email": first_email, "entity_id": entity_id},
                                            "id": str(uuid4())
                                        }
                                        ipqs_result = await self._execute_tool_with_resilience(ipqs_tool_call, config, input_state=input)
                                        logger.info(f"🔧 ✅ Tool ipqs_email_verification executed successfully, result type: {type(ipqs_result)}")
                                        
                                        # Serialize result
                                        if isinstance(ipqs_result, (dict, list)):
                                            ipqs_content = json.dumps(ipqs_result, default=str, ensure_ascii=False)
                                        elif isinstance(ipqs_result, str):
                                            ipqs_content = ipqs_result
                                        else:
                                            ipqs_content = str(ipqs_result)
                                        
                                        ipqs_tool_message = ToolMessage(
                                            content=ipqs_content,
                                            tool_call_id=ipqs_tool_call.get("id", ""),
                                            name="ipqs_email_verification"
                                        )
                                        result_messages.append(ipqs_tool_message)
                                        logger.debug(f"🔧 Created ToolMessage for ipqs_email_verification")
                                    except Exception as e:
                                        safe_error_msg = sanitize_exception_message(e)
                                        logger.error(f"🔧 ❌ Tool ipqs_email_verification execution failed: {safe_error_msg}")
                        
                        # After composio_search completes, check if we should force webcrawl
                        if tool_name == "composio_search" and not force_composio_webcrawl:
                            logger.info(f"🔧 composio_search completed, checking if webcrawl should be forced...")
                            # Re-check webcrawl forcing now that search has completed
                            if (
                                "composio_webcrawl" not in tools_used and 
                                entity_id and 
                                has_composio_webcrawl
                            ):
                                logger.warning(f"⚠️ FORCING composio_webcrawl after composio_search completion for {entity_type}={entity_id}")
                                from uuid import uuid4
                                # Execute webcrawl immediately
                                webcrawl_tool_call = {
                                    "name": "composio_webcrawl",
                                    "args": {
                                        "url": f"https://www.google.com/search?q={entity_id.replace('@', '%40')}",
                                        "max_depth": 1,
                                        "include_links": False,
                                        "entity_id": entity_id
                                    },
                                    "id": str(uuid4())
                                }
                                try:
                                    webcrawl_result = await self._execute_tool_with_resilience(webcrawl_tool_call, config, input_state=input)
                                    logger.info(f"🔧 ✅ Tool composio_webcrawl executed successfully, result type: {type(webcrawl_result)}")
                                    
                                    # Serialize webcrawl result
                                    if isinstance(webcrawl_result, (dict, list)):
                                        webcrawl_content = json.dumps(webcrawl_result, default=str, ensure_ascii=False)
                                    elif isinstance(webcrawl_result, str):
                                        webcrawl_content = webcrawl_result
                                    else:
                                        webcrawl_content = str(webcrawl_result)
                                    
                                    webcrawl_tool_message = ToolMessage(
                                        content=webcrawl_content,
                                        tool_call_id=webcrawl_tool_call.get("id", ""),
                                        name="composio_webcrawl"
                                    )
                                    result_messages.append(webcrawl_tool_message)
                                    logger.debug(f"🔧 Created ToolMessage for composio_webcrawl")
                                except Exception as e:
                                    safe_error_msg = sanitize_exception_message(e)
                                    error_category = get_error_category(e)
                                    logger.error(f"🔧 ❌ Tool composio_webcrawl execution failed - {error_category}: {safe_error_msg}")
                                    webcrawl_error_message = ToolMessage(
                                        content=f"Tool execution failed: {safe_error_msg}",
                                        tool_call_id=webcrawl_tool_call.get("id", ""),
                                        name="composio_webcrawl"
                                    )
                                    result_messages.append(webcrawl_error_message)
>>>>>>> 001-modify-analyzer-method
                        
                    except Exception as e:
                        # Sanitize error message for security
                        safe_error_msg = sanitize_exception_message(e)
                        error_category = get_error_category(e)
                        logger.error(f"🔧 ❌ Tool {tool_name} execution failed - {error_category}: {safe_error_msg}")
                        
                        # Create safe error tool message
                        tool_message = ToolMessage(
                            content=f"Tool execution failed: {safe_error_msg}",
                            tool_call_id=tool_call.get("id", ""),
                            name=tool_call.get("name", "unknown")
                        )
                        result_messages.append(tool_message)
                        logger.debug(f"🔧 Created error ToolMessage for {tool_name}")
            else:
                logger.debug(f"🔧 Message {message_idx + 1} is not an AIMessage with tool_calls")
        
        logger.info(f"🔧 Tool execution summary: {tool_calls_found} tool calls found, {len(result_messages)} results generated")
        
        # If no tool calls were processed, use parent implementation
        if not result_messages:
            logger.info(f"🔧 No tool calls processed, delegating to parent ToolNode")
            return await super().ainvoke(input, config)
        
        # Return updated state
        if isinstance(input, dict):
            result = {"messages": result_messages}
            logger.info(f"🔧 Returning dict result with {len(result_messages)} messages")
            return result
        else:
            logger.info(f"🔧 Returning list result with {len(result_messages)} messages")
            return result_messages
    
    def _infer_agent_name_from_state(self, input: Union[Dict[str, Any], MessagesState]) -> Optional[str]:
        """
        Infer the agent name from graph state.
        
        Checks current_phase, domains_completed, and messages to determine
        which agent is currently executing.
        
        Args:
            input: Graph state or messages
            
        Returns:
            Agent name (e.g., "device_agent", "network_agent") or None if cannot determine
        """
        if not isinstance(input, dict):
            return None
        
        # Check current_phase to infer agent
        current_phase = input.get("current_phase", "")
        domains_completed = input.get("domains_completed", [])
        
        # If in domain_analysis phase, check which domain is active
        if current_phase == "domain_analysis":
            # Domain execution order
            domain_order = ["network", "device", "location", "logs", "authentication", "risk"]
            # Find first domain not yet completed
            for domain in domain_order:
                if domain not in domains_completed:
                    return f"{domain}_agent"
        
        # Check if we're in tool_execution phase (orchestrator is calling tools)
        if current_phase == "tool_execution":
            return "orchestrator_agent"
        
        # Check if we're in snowflake_analysis phase
        if current_phase == "snowflake_analysis":
            return "orchestrator_agent"
        
        # Check messages for agent hints
        messages = input.get("messages", [])
        if messages:
            # Look at recent messages for agent context
            for msg in reversed(messages[-5:]):  # Check last 5 messages
                if hasattr(msg, "additional_kwargs"):
                    kwargs = msg.additional_kwargs or {}
                    agent_name = kwargs.get("agent_name") or kwargs.get("agent")
                    if agent_name:
                        return agent_name
                # Check message content for agent mentions
                if hasattr(msg, "content") and msg.content:
                    content = str(msg.content).lower()
                    for domain in ["network", "device", "location", "logs", "authentication", "risk"]:
                        if domain in content:
                            return f"{domain}_agent"
        
        # Check domain_findings to see which domain was most recently updated
        domain_findings = input.get("domain_findings", {})
        if domain_findings:
            # Return the last domain that has findings
            for domain in reversed(["network", "device", "location", "logs", "authentication", "risk"]):
                if domain in domain_findings:
                    return f"{domain}_agent"
        
        return None
    
    async def _execute_tool_with_resilience(self, tool_call: Dict[str, Any], config: Optional[RunnableConfig], input_state: Optional[Union[Dict[str, Any], MessagesState]] = None) -> Any:
        """
        Execute tool with resilience patterns and emit WebSocket events.

        Args:
            tool_call: Tool invocation details
            config: Runtime configuration
            input_state: Graph state to infer agent name from

        Returns:
            Tool execution result
        """
        tool_name = tool_call.get("name", "unknown")
        
        # Infer agent name from state if available
        agent_name = None
        if input_state:
            agent_name = self._infer_agent_name_from_state(input_state)
            if agent_name:
                logger.info(f"🔧 Inferred agent name from state: {agent_name}")
        
        # Fallback to graph_agent if cannot infer
        if not agent_name:
            agent_name = "graph_agent"
        
        # CRITICAL: Ensure investigation_id is available for persistence
        # Extract from config if not already set
        if not self.investigation_id and config:
            configurable = config.get("configurable", {}) if isinstance(config, dict) else getattr(config, "configurable", {})
            if isinstance(configurable, dict) and "investigation_id" in configurable:
                self.investigation_id = configurable["investigation_id"]
                logger.info(f"🔧 CRITICAL: Extracted investigation_id from config: {self.investigation_id}")
        
        metrics = self.tool_metrics.get(tool_name)

        if not metrics:
            logger.warning(f"No metrics found for tool {tool_name}, executing without resilience")
            # Find and execute tool directly
            tool = self._get_tool_by_name(tool_name)
            if tool:
                # Still persist even without metrics
                if self.investigation_id:
                    try:
                        from app.service.tool_execution_service import ToolExecutionService
                        from app.persistence.database import get_db_session
                        with get_db_session() as db:
                            service = ToolExecutionService(db)
                            tool_exec_id = service.persist_tool_execution(
                                investigation_id=self.investigation_id,
                                agent_name=agent_name,  # Use inferred agent name
                                tool_name=tool_name,
                                status="running",
                                input_parameters=tool_call.get("args", {})
                            )
                            self._current_tool_exec_id = tool_exec_id
                            logger.info(f"🔧 ✅ Tool execution persisted (no metrics): {tool_exec_id}")
                    except Exception as e:
                        logger.warning(f"🔧 Failed to persist tool execution (no metrics): {e}")
                
                result = await tool.ainvoke(tool_call.get("args", {}), config)
                
                # Update completion status
                if self.investigation_id and hasattr(self, '_current_tool_exec_id'):
                    try:
                        from app.service.tool_execution_service import ToolExecutionService
                        from app.persistence.database import get_db_session
                        with get_db_session() as db:
                            service = ToolExecutionService(db)
                            output_result = result if isinstance(result, dict) else {"result": str(result)[:1000]}
                            service.update_tool_execution_status(
                                investigation_id=self.investigation_id,
                                tool_exec_id=self._current_tool_exec_id,
                                status="completed",
                                output_result=output_result,
                                duration_ms=0  # Unknown duration without metrics
                            )
                            logger.info(f"🔧 ✅ Tool execution completion persisted (no metrics)")
                    except Exception as e:
                        logger.warning(f"🔧 Failed to persist tool completion (no metrics): {e}")
                
                return result
            else:
                raise ValueError(f"Tool {tool_name} not found")
        
        # Check circuit breaker (thread-safe)
        with self._state_lock:
            if metrics.circuit_state == CircuitState.OPEN:
                if self._should_attempt_recovery(metrics):
                    metrics.circuit_state = CircuitState.HALF_OPEN
                    logger.info(f"Circuit breaker for {tool_name} entering HALF_OPEN state")
                else:
                    await self._emit_tool_event("tool_execution_skipped", tool_name, {
                        "reason": "circuit_breaker_open",
                        "consecutive_failures": metrics.consecutive_failures,
                        "last_failure_time": metrics.last_failure_time.isoformat() if metrics.last_failure_time else None
                    })
                    raise Exception(f"Circuit breaker OPEN for {tool_name}")
        
        # Execute with retry logic
        start_time = time.time()
        last_exception = None

        # Emit tool execution started event
        await self._emit_tool_event("tool_execution_started", tool_name, {
            "args": tool_call.get("args", {}),
            "attempt": 1,
            "max_retries": self.retry_config['max_retries']
        })

        # Persist to database immediately when tool starts
        logger.info(f"🔧 Attempting to persist tool execution: investigation_id={self.investigation_id}, tool={tool_name}")
        if self.investigation_id:
            try:
                from app.service.tool_execution_service import ToolExecutionService
                from app.persistence.database import get_db_session

                logger.info(f"🔧 Getting database session for tool persistence")
                with get_db_session() as db:
                    logger.info(f"🔧 Database session obtained, creating ToolExecutionService")
                    service = ToolExecutionService(db)
                    logger.info(f"🔧 Persisting tool execution: investigation_id={self.investigation_id}, agent_name={agent_name}, tool_name={tool_name}, status=running")
                    tool_exec_id = service.persist_tool_execution(
                        investigation_id=self.investigation_id,
                        agent_name=agent_name,  # Use inferred agent name from state
                        tool_name=tool_name,
                        status="running",
                        input_parameters=tool_call.get("args", {})
                    )
                    # Store the execution ID for later update
                    self._current_tool_exec_id = tool_exec_id
                    logger.info(f"🔧 ✅ Tool execution persisted successfully: {tool_exec_id}")
            except Exception as e:
                logger.error(f"🔧 ❌ Failed to persist tool execution start to database: {e}", exc_info=True)
        else:
            logger.warning(f"🔧 No investigation_id provided, tool execution persistence skipped")
        
        for attempt in range(self.retry_config['max_retries']):
            try:
                # Find the tool
                tool = self._get_tool_by_name(tool_name)
                if not tool:
                    raise ValueError(f"Tool {tool_name} not found")
                
                # CRITICAL: Map snowflake_query_tool arguments to database_query arguments
                # snowflake_query_tool uses: query, database, db_schema
                # database_query uses: query, parameters, limit
                tool_args = tool_call.get("args", {}).copy()
                if tool_name == "snowflake_query_tool" and tool.name == "database_query":
                    # Extract query from snowflake args and use it directly
                    # Ignore database and db_schema as PostgreSQL doesn't need them
                    mapped_args = {
                        "query": tool_args.get("query", ""),
                        "parameters": None,  # database_query supports optional parameters
                        "limit": 100  # Default limit for safety
                    }
                    logger.info(f"🔧 Mapped snowflake_query_tool args to database_query: query length={len(mapped_args['query'])}")
                    tool_args = mapped_args
                
                # Execute tool with timeout
                result = await self._execute_with_timeout(
                    tool, 
                    tool_args, 
                    config
                )
                
                # Update metrics on success
                elapsed = time.time() - start_time
                metrics.success_count += 1
                metrics.total_latency += elapsed
                metrics.consecutive_failures = 0
                
                # Close circuit if in half-open state (thread-safe)
                circuit_recovered = False
                with self._state_lock:
                    if metrics.circuit_state == CircuitState.HALF_OPEN:
                        metrics.circuit_state = CircuitState.CLOSED
                        circuit_recovered = True
                        logger.info(f"Circuit breaker for {tool_name} CLOSED after successful recovery")
                
                # Warn if slow
                performance_warning = None
                if elapsed > self.performance_threshold:
                    performance_warning = f"Tool execution exceeded threshold: {elapsed:.2f}s > {self.performance_threshold}s"
                    logger.warning(f"Tool {tool_name} took {elapsed:.2f}s (threshold: {self.performance_threshold}s)")
                
                # Emit successful completion event with sanitized data
                await self._emit_tool_event("tool_execution_completed", tool_name, {
                    "result_summary": sanitize_tool_result(result, max_length=200),
                    "result_hash": create_result_hash(result),
                    "execution_time": f"{elapsed:.3f}s",
                    "attempt": attempt + 1,
                    "success_rate": f"{metrics.success_rate * 100:.1f}%",
                    "circuit_recovered": circuit_recovered,
                    "performance_warning": performance_warning
                })

                # Persist successful completion to database
                if self.investigation_id and hasattr(self, '_current_tool_exec_id'):
                    try:
                        from app.service.tool_execution_service import ToolExecutionService
                        from app.persistence.database import get_db_session

                        with get_db_session() as db:
                            service = ToolExecutionService(db)
                            # Parse result for findings and risk score
                            output_result = {}
                            if result:
                                if isinstance(result, dict):
                                    output_result = result
                                elif isinstance(result, str):
                                    # Try to extract meaningful data from string result
                                    output_result = {
                                        "result": result[:1000],  # Limit string length
                                        "summary": sanitize_tool_result(result, max_length=200)
                                    }

                            service.update_tool_execution_status(
                                investigation_id=self.investigation_id,
                                tool_exec_id=self._current_tool_exec_id,
                                status="completed",
                                output_result=output_result,
                                duration_ms=int(elapsed * 1000)
                            )
                    except Exception as e:
                        logger.warning(f"Failed to persist tool execution completion to database: {e}")

                return result
                
            except Exception as e:
                last_exception = e
                elapsed = time.time() - start_time
                
                # Check if exception is retryable
                is_retryable = any(
                    isinstance(e, exc_type) 
                    for exc_type in self.retry_config['retry_exceptions']
                )
                
                if not is_retryable or attempt == self.retry_config['max_retries'] - 1:
                    # Update failure metrics
                    metrics.failure_count += 1
                    metrics.total_latency += elapsed
                    metrics.consecutive_failures += 1
                    metrics.last_failure_time = datetime.now()
                    
                    # Check if circuit should open (thread-safe)
                    circuit_opened = False
                    with self._state_lock:
                        if metrics.consecutive_failures >= self.circuit_config['failure_threshold']:
                            metrics.circuit_state = CircuitState.OPEN
                            circuit_opened = True
                            logger.error(f"Circuit breaker OPEN for {tool_name} after {metrics.consecutive_failures} failures")
                    
                    # Emit failure event with sanitized error information
                    await self._emit_tool_event("tool_execution_failed", tool_name, {
                        "error": sanitize_exception_message(e),
                        "error_category": get_error_category(e),
                        "error_type": type(e).__name__,
                        "execution_time": f"{elapsed:.3f}s",
                        "final_attempt": attempt + 1,
                        "max_retries": self.retry_config['max_retries'],
                        "is_retryable": is_retryable,
                        "consecutive_failures": metrics.consecutive_failures,
                        "circuit_opened": circuit_opened,
                        "success_rate": f"{metrics.success_rate * 100:.1f}%"
                    })

                    # Persist failure to database
                    if self.investigation_id and hasattr(self, '_current_tool_exec_id'):
                        try:
                            from app.service.tool_execution_service import ToolExecutionService
                            from app.persistence.database import get_db_session

                            with get_db_session() as db:
                                service = ToolExecutionService(db)
                                service.update_tool_execution_status(
                                    investigation_id=self.investigation_id,
                                    tool_exec_id=self._current_tool_exec_id,
                                    status="failed",
                                    error_message=sanitize_exception_message(e),
                                    duration_ms=int(elapsed * 1000)
                                )
                        except Exception as db_e:
                            logger.warning(f"Failed to persist tool execution failure to database: {db_e}")

                    raise
                
                # Calculate backoff time
                backoff = min(
                    self.retry_config['backoff_factor'] ** attempt,
                    self.retry_config['max_backoff']
                )
                
                logger.warning(f"Tool {tool_name} failed (attempt {attempt + 1}/{self.retry_config['max_retries']}), "
                             f"retrying in {backoff:.1f}s: {str(e)}")
                
                await asyncio.sleep(backoff)
        
        # All retries exhausted - convert to safe tool message instead of raising
        if last_exception:
            safe_error_msg = sanitize_exception_message(last_exception)
            error_category = get_error_category(last_exception)
            logger.error(f"Tool {tool_name} failed after all retries - {error_category}: {safe_error_msg}")
            
            # Return safe error result instead of raising exception
            return f"Tool execution failed: {safe_error_msg} (after {self.retry_config['max_retries']} retries)"
    
    def _get_tool_by_name(self, name: str) -> Optional[BaseTool]:
        """Get tool by name with input validation and name mapping."""
        if not name or not isinstance(name, str):
            logger.warning(f"🔧 Invalid tool name: {name}")
            return None
        
        logger.debug(f"🔧 Looking for tool: '{name}' among {len(self.tools)} available tools")
        
        # Log all available tool names for debugging
        available_tools = []
<<<<<<< HEAD
        for tool in self.tools:
            if isinstance(tool, BaseTool) and hasattr(tool, 'name'):
                available_tools.append(tool.name)
        logger.debug(f"🔧 Available tools: {available_tools}")
        
        for tool in self.tools:
            if isinstance(tool, BaseTool) and hasattr(tool, 'name') and tool.name == name:
                logger.debug(f"🔧 ✅ Found matching tool: {tool.name}")
                return tool
        
        logger.error(f"🔧 ❌ Tool '{name}' not found in available tools: {available_tools}")
=======
        for tool in self.tools:
            if isinstance(tool, BaseTool) and hasattr(tool, 'name'):
                available_tools.append(tool.name)
        logger.debug(f"🔧 Available tools: {available_tools}")
        
        # CRITICAL: Map snowflake_query_tool to database_query when PostgreSQL is configured
        # This handles LLM prompts that reference snowflake_query_tool but the actual tool is database_query
        tool_name_mapping = {
            "snowflake_query_tool": "database_query",  # Map Snowflake tool name to PostgreSQL tool name
        }
        
        # Try direct match first
        mapped_name = tool_name_mapping.get(name, name)
        if mapped_name != name:
            logger.info(f"🔧 Mapping tool name '{name}' -> '{mapped_name}' (PostgreSQL mode)")
        
        for tool in self.tools:
            if isinstance(tool, BaseTool) and hasattr(tool, 'name'):
                # Check both original name and mapped name
                if tool.name == name or tool.name == mapped_name:
                    logger.debug(f"🔧 ✅ Found matching tool: {tool.name} (requested: {name})")
                    return tool
        
        logger.error(f"🔧 ❌ Tool '{name}' (mapped: '{mapped_name}') not found in available tools: {available_tools}")
>>>>>>> 001-modify-analyzer-method
        return None
    
    async def _execute_with_timeout(self, tool: BaseTool, args: Dict[str, Any], config: Optional[RunnableConfig], timeout: float = 30.0) -> Any:
        """Execute tool with timeout."""
        try:
            return await asyncio.wait_for(
                tool.ainvoke(args, config),
                timeout=timeout
            )
        except asyncio.TimeoutError:
            raise TimeoutError(f"Tool execution timed out after {timeout}s")
    
    def _should_attempt_recovery(self, metrics: ToolHealthMetrics) -> bool:
        """Check if circuit breaker should attempt recovery."""
        if not metrics.last_failure_time:
            return True
        
        recovery_time = metrics.last_failure_time + timedelta(seconds=self.circuit_config['recovery_timeout'])
        return datetime.now() >= recovery_time
    
    def get_health_report(self) -> Dict[str, Dict[str, Any]]:
        """
        Get health report for all tools.
        
        Returns:
            Dictionary with health metrics for each tool
        """
        report = {}
        for tool_name, metrics in self.tool_metrics.items():
            report[tool_name] = {
                'success_rate': f"{metrics.success_rate * 100:.1f}%",
                'average_latency': f"{metrics.average_latency:.2f}s",
                'circuit_state': metrics.circuit_state.value,
                'consecutive_failures': metrics.consecutive_failures,
                'total_requests': metrics.success_count + metrics.failure_count
            }
        return report
    
    def get_working_tools(self) -> List[BaseTool]:
        """
        Get list of currently working tools.
        
        Returns:
            List of tools that are not in OPEN circuit state
        """
        working_tools = []
        for tool in self.tools:
            if isinstance(tool, BaseTool):
                metrics = self.tool_metrics.get(tool.name)
                if not metrics or metrics.circuit_state != CircuitState.OPEN:
                    working_tools.append(tool)
        return working_tools
    
    async def _emit_tool_event(self, event_type: str, tool_name: str, event_data: Dict[str, Any]):
        """
        Emit tool execution event via WebSocket and event handlers.
        
        Args:
            event_type: Type of event (started, completed, failed, skipped)
            tool_name: Name of the tool
            event_data: Additional event data
        """
        try:
            # Sanitize event data before broadcasting
            sanitized_event_data = sanitize_websocket_event_data(event_data)
            
            event = {
                "type": event_type,
                "tool_name": tool_name,
                "timestamp": datetime.now().isoformat(),
                "investigation_id": self.investigation_id,
                "data": sanitized_event_data
            }
            
            # Emit to registered event handlers
            for handler in _tool_event_handlers:
                try:
                    await handler(event)
                except Exception as e:
                    logger.warning(f"Tool event handler failed: {e}")
            
<<<<<<< HEAD
            # Emit via WebSocket if investigation_id is available
            if self.investigation_id:
                try:
                    from app.router.handlers.websocket_handler import notify_websocket_connections
                    await notify_websocket_connections(self.investigation_id, {
                        "type": "tool_execution_event",
                        "event": event
                    })
                except ImportError:
                    logger.debug("WebSocket handler not available for tool events")
                except Exception as e:
                    logger.warning(f"Failed to emit tool event via WebSocket: {e}")
=======
            # WebSocket emission removed per spec 005 - using polling-based updates instead
            # if self.investigation_id:
            #     try:
            #         from app.router.handlers.websocket_handler import notify_websocket_connections
            #         await notify_websocket_connections(self.investigation_id, {
            #             "type": "tool_execution_event",
            #             "event": event
            #         })
            #     except ImportError:
            #         logger.debug("WebSocket handler not available for tool events")
            #     except Exception as e:
            #         logger.warning(f"Failed to emit tool event via WebSocket: {e}")
>>>>>>> 001-modify-analyzer-method
        except Exception as e:
            logger.error(f"Critical error in _emit_tool_event: {e}")


class ToolHealthManager:
    """Manages tool health checking and dynamic filtering."""
    
    def __init__(self):
        """Initialize tool health manager."""
        self.health_checks: Dict[str, ToolHealthMetrics] = {}
        self.performance_metrics: Dict[str, List[float]] = {}
        self.health_check_interval = 60  # Check health every 60 seconds
        self.last_health_check = datetime.now()
        
    async def validate_tool_ecosystem(self, tools: List[BaseTool]) -> List[BaseTool]:
        """
        Validate and filter tools based on health.
        
        Args:
            tools: List of available tools
            
        Returns:
            List of healthy tools
        """
        healthy_tools = []
        
        for tool in tools:
            if await self._check_tool_health(tool):
                healthy_tools.append(tool)
            else:
                logger.warning(f"Tool {tool.name} failed health check")
        
        # Rank tools by performance if we have metrics
        if self.performance_metrics:
            healthy_tools = self._rank_by_performance(healthy_tools)
        
        return healthy_tools
    
    async def _check_tool_health(self, tool: BaseTool) -> bool:
        """
        Check if a tool is healthy.
        
        Args:
            tool: Tool to check
            
        Returns:
            True if tool is healthy
        """
        try:
            # Check if tool has required attributes
            if not hasattr(tool, 'name') or not tool.name:
                return False
            
            # Try to get tool description (basic health check)
            if hasattr(tool, 'description'):
                _ = tool.description
            
            # Tool-specific health checks could be added here
            # For example, checking if external services are reachable
            
            return True
            
        except Exception as e:
            logger.error(f"Health check failed for tool {getattr(tool, 'name', 'unknown')}: {e}")
            return False
    
    def _rank_by_performance(self, tools: List[BaseTool]) -> List[BaseTool]:
        """
        Rank tools by performance metrics.
        
        Args:
            tools: List of tools to rank
            
        Returns:
            Tools sorted by performance (best first)
        """
        def get_avg_latency(tool: BaseTool) -> float:
            """Get average latency for a tool."""
            if tool.name not in self.performance_metrics:
                return 0.0
            latencies = self.performance_metrics[tool.name]
            return sum(latencies) / len(latencies) if latencies else 0.0
        
        return sorted(tools, key=get_avg_latency)


def register_tool_event_handler(handler):
    """
    Register a handler for tool execution events.
    
    Args:
        handler: Async function that takes event dict as parameter
    """
    _tool_event_handlers.append(handler)


def clear_tool_event_handlers():
    """Clear all registered tool event handlers."""
    global _tool_event_handlers
    _tool_event_handlers = []
    
    def record_performance(self, tool_name: str, latency: float):
        """
        Record performance metric for a tool with resource limits.
        
        Args:
            tool_name: Name of the tool
            latency: Execution latency in seconds
        """
        # Enforce maximum number of tracked tools
        if len(self.performance_metrics) >= MAX_TOOL_METRICS and tool_name not in self.performance_metrics:
            # Remove oldest tool metrics to make space
            oldest_tool = next(iter(self.performance_metrics))
            del self.performance_metrics[oldest_tool]
            logger.warning(f"Removed metrics for {oldest_tool} to stay within resource limits")
        
        if tool_name not in self.performance_metrics:
            self.performance_metrics[tool_name] = []
        
        # Keep limited number of performance samples
        self.performance_metrics[tool_name].append(latency)
        if len(self.performance_metrics[tool_name]) > MAX_PERFORMANCE_SAMPLES:
            self.performance_metrics[tool_name].pop(0)
    
    def should_perform_health_check(self) -> bool:
        """Check if it's time for a health check."""
        elapsed = (datetime.now() - self.last_health_check).total_seconds()
        return elapsed >= self.health_check_interval