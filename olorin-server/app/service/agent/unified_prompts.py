"""
<<<<<<< HEAD
Unified Prompt System for Autonomous Agents
=======
Unified Prompt System for Structured Agents
>>>>>>> 001-modify-analyzer-method

Single source of truth for all agent prompts with emphasis on comprehensive tool usage.
Replaces scattered Gaia and Olorin prompt systems.
"""

from typing import List, Dict, Any, Optional
from app.service.logging import get_bridge_logger
from app.service.agent.tools.snowflake_tool.schema_constants import (
    IP, IP_COUNTRY_CODE, DEVICE_ID, USER_AGENT,
    TX_DATETIME, MODEL_SCORE, IS_FRAUD_TX, NSURE_LAST_DECISION
)

logger = get_bridge_logger(__name__)


def get_unified_investigation_prompt(
    domain: str,
    context: Any,
    llm_context: str,
    available_tools: List[str],
<<<<<<< HEAD
    specific_objectives: List[str] = None
=======
    specific_objectives: List[str] = None,
    entity_type: str = None
>>>>>>> 001-modify-analyzer-method
) -> str:
    """
    Generate unified investigation prompt that emphasizes using ALL available tools.
    
    Args:
        domain: Investigation domain (network, device, location, logs, risk)
        context: Investigation context with entity information
        llm_context: Formatted context for LLM
        available_tools: List of ALL available tool names for this agent
        specific_objectives: Optional domain-specific objectives
    
    Returns:
        Comprehensive investigation prompt
    """
    
    # Get domain-specific tool categories and objectives
    domain_config = DOMAIN_CONFIGURATIONS.get(domain, {})
    tool_categories = domain_config.get("tool_categories", [])
    default_objectives = domain_config.get("objectives", [])
    
    # Use specific objectives if provided, otherwise use defaults
    objectives = specific_objectives or default_objectives
    
    # Build the comprehensive prompt
    prompt = f"""
🔍 COMPREHENSIVE {domain.upper()} FRAUD INVESTIGATION
════════════════════════════════════════════════════════════════════════════════

INVESTIGATION CONTEXT:
{llm_context}

📋 YOUR AVAILABLE TOOLS ({len(available_tools)} TOTAL):
You have access to a COMPREHENSIVE suite of {len(available_tools)} specialized tools.
YOU MUST USE AS MANY OF THESE TOOLS AS RELEVANT to conduct a THOROUGH investigation.

{_format_tools_by_category(available_tools, tool_categories)}

⚠️ CRITICAL REQUIREMENTS:
1. 🔴 START WITH SNOWFLAKE - ALWAYS begin by querying snowflake_query_tool for 30 DAYS of historical data:
   - Search for ALL records related to the seed entity (IP address, user_id, device_id, etc.)
   - Look for patterns, anomalies, and related entities over the FULL 30-DAY PERIOD
   - Each domain should query relevant Snowflake columns for their analysis area
2. USE MULTIPLE TOOLS - After Snowflake analysis, use MANY other tools for comprehensive investigation.
3. MAXIMIZE COVERAGE - Use tools from DIFFERENT CATEGORIES to get diverse perspectives.
4. CROSS-VALIDATE - Use multiple tools to verify Snowflake findings (e.g., use VirusTotal AND AbuseIPDB).
5. EXPLORE DEEPLY - Don't stop at surface-level checks. Use advanced tools for deeper analysis.
6. BE EXHAUSTIVE - If a tool might provide relevant information, USE IT.

🎯 INVESTIGATION OBJECTIVES FOR {domain.upper()}:
{_format_objectives(objectives)}

📊 TOOL USAGE STRATEGY:
Based on the entity type and available data, you should:
{_get_tool_usage_strategy(domain, tool_categories)}

⚡ INVESTIGATION WORKFLOW:
1. 🔴 SNOWFLAKE FIRST (30-DAY ANALYSIS):
<<<<<<< HEAD
=======
   - Query transactions WHERE [ENTITY_COLUMN] = [ENTITY_ID]
   - IMPORTANT: Dynamically use the correct column name based on entity_type:
     * If entity_type is 'ip': use {IP} column (WHERE {IP} = entity_id)
     * If entity_type is 'email': use EMAIL column (WHERE EMAIL = entity_id)
     * If entity_type is 'device' or 'device_id': use {DEVICE_ID} column (WHERE {DEVICE_ID} = entity_id)
     * If entity_type is 'user_id': use UNIQUE_USER_ID column (WHERE UNIQUE_USER_ID = entity_id)
   - The entity_type is: {entity_type if entity_type else 'not specified - check investigation context'}
>>>>>>> 001-modify-analyzer-method
   - Network Agent: Query {IP}, {IP_COUNTRY_CODE}, ISP_NAME, VPN_INDICATOR fields
   - Device Agent: Query {DEVICE_ID}, {USER_AGENT}, BROWSER_NAME, OS_NAME fields
   - Location Agent: Query {IP_COUNTRY_CODE} fields
   - Logs Agent: Query {TX_DATETIME}, EVENT_TYPE, ERROR_CODES, SESSION_DATA fields
   - Risk Agent: Query {MODEL_SCORE}, {IS_FRAUD_TX}, {NSURE_LAST_DECISION}, DISPUTE_STATUS
2. START BROAD - Use multiple reconnaissance tools to gather initial data
3. IDENTIFY PATTERNS - Use ML/AI tools to detect anomalies and patterns
4. VERIFY THREATS - Use ALL relevant threat intelligence tools
5. DEEP DIVE - Use specialized tools for detailed analysis
6. CORRELATE - Use database and search tools to find connections
7. ASSESS RISK - Synthesize findings from ALL tools used

📝 EXPECTED OUTPUT:
Your investigation MUST include:
- Tool Usage Report: List ALL tools used and why (minimum 10+ tools expected)
- Comprehensive Findings: Data gathered from EACH tool used
- Cross-Tool Correlation: How findings from different tools relate
- Risk Score: Numerical assessment (0.0-1.0) based on ALL evidence
- Confidence Level: Based on breadth and depth of tool coverage
- Recommendations: Further tools or investigations needed

⚠️ FAILURE CRITERIA:
Your investigation will be considered INCOMPLETE if you:
- Use fewer than 10 tools (unless you explicitly justify why)
- Rely primarily on 1-2 tools
- Fail to use tools from multiple categories
- Don't explore available specialized tools

🚀 BEGIN COMPREHENSIVE INVESTIGATION:
Remember: The quality of your investigation is directly proportional to the breadth and depth of tools utilized.
Use ALL relevant tools at your disposal to ensure nothing is missed.
"""
    
    return prompt


def _format_tools_by_category(tools: List[str], priority_categories: List[str]) -> str:
    """Format tools grouped by category with emphasis on comprehensive usage."""
    
    # Categorize tools
    categorized = {
        "🛡️ Threat Intelligence": [],
        "🔗 Blockchain & Crypto": [],
        "🤖 ML/AI Analysis": [],
        "🔍 OSINT & Intelligence": [],
        "🌐 Web & Network": [],
        "💾 Database & Logs": [],
        "📁 File System": [],
        "🔧 Utility & Other": []
    }
    
    for tool in sorted(tools):
        tool_lower = tool.lower()
        if any(x in tool_lower for x in ['abuse', 'virus', 'shodan', 'threat']):
            categorized["🛡️ Threat Intelligence"].append(tool)
        elif any(x in tool_lower for x in ['blockchain', 'crypto', 'nft', 'defi', 'wallet']):
            categorized["🔗 Blockchain & Crypto"].append(tool)
        elif any(x in tool_lower for x in ['ml', 'anomaly', 'pattern', 'behavioral', 'risk_scoring', 'fraud_detection']):
            categorized["🤖 ML/AI Analysis"].append(tool)
        elif any(x in tool_lower for x in ['osint', 'social', 'people', 'dark', 'deep', 'business_intel']):
            categorized["🔍 OSINT & Intelligence"].append(tool)
        elif any(x in tool_lower for x in ['web', 'http', 'scrape']):
            categorized["🌐 Web & Network"].append(tool)
        elif any(x in tool_lower for x in ['snowflake', 'splunk', 'sumo', 'database', 'query']):
            categorized["💾 Database & Logs"].append(tool)
        elif any(x in tool_lower for x in ['file', 'directory']):
            categorized["📁 File System"].append(tool)
        else:
            categorized["🔧 Utility & Other"].append(tool)
    
    # Format output with emphasis
    output = []
    for category, cat_tools in categorized.items():
        if cat_tools:
            output.append(f"\n{category} ({len(cat_tools)} tools) - USE ALL RELEVANT:")
            for tool in cat_tools:
                output.append(f"  ✓ {tool}")
    
    return "\n".join(output)


def _format_objectives(objectives: List[str]) -> str:
    """Format objectives with numbering."""
    return "\n".join([f"{i+1}. {obj}" for i, obj in enumerate(objectives)])


def _get_tool_usage_strategy(domain: str, categories: List[str]) -> str:
    """Get domain-specific tool usage strategy."""
    
    strategies = {
        "network": """
- Use ALL threat intelligence tools (VirusTotal, AbuseIPDB, Shodan) for IP/domain analysis
- Apply ALL ML/AI tools for anomaly detection and pattern recognition
- Use blockchain tools if crypto-related activity detected
- Query ALL available databases (Snowflake, Splunk, SumoLogic) for historical data
- Use OSINT tools to gather additional context about entities
""",
        "device": """
- Use ALL ML/AI tools for behavioral analysis and anomaly detection
- Query ALL databases for device history and patterns
- Use threat intelligence tools for any associated IPs or domains
- Apply pattern recognition across multiple data sources
- Use file system tools to analyze any uploaded content
""",
        "location": """
- Use ALL geolocation and IP-based tools for location verification
- Apply ML/AI tools for travel pattern analysis
- Query databases for historical location data
- Use OSINT tools for location context and verification
- Cross-reference with threat intelligence for suspicious locations
""",
        "logs": """
- Query ALL log databases (Splunk, SumoLogic, Snowflake)
- Use ALL ML/AI tools for log pattern analysis
- Apply anomaly detection across log entries
- Use file system tools for log file analysis
- Correlate with threat intelligence for suspicious activities
""",
        "risk": """
- Synthesize findings from ALL previous domain investigations
- Apply ALL risk scoring and fraud detection ML tools
- Use behavioral analysis tools for comprehensive assessment
- Query all databases for historical risk patterns
- Generate risk metrics using multiple calculation methods
"""
    }
    
    return strategies.get(domain, "- Use ALL available tools relevant to the investigation")


# Domain configurations with comprehensive tool requirements
DOMAIN_CONFIGURATIONS = {
    "network": {
        "tool_categories": ["threat_intelligence", "web", "blockchain", "ml_ai", "database"],
        "objectives": [
            "Analyze ALL IP addresses using EVERY available threat intelligence tool",
            "Check ALL domains/URLs with MULTIPLE verification tools",
            "Detect network anomalies using ALL ML/AI tools",
            "Query ALL databases for historical network patterns",
            "Identify suspicious connections using OSINT tools",
            "Analyze cryptocurrency transactions if detected",
            "Cross-validate findings across multiple tool categories"
        ]
    },
    "device": {
        "tool_categories": ["ml_ai", "database", "threat_intelligence", "file_system"],
        "objectives": [
            "Profile device behavior using ALL behavioral analysis tools",
            "Detect anomalies with EVERY available ML model",
            "Query ALL databases for device history",
            "Check associated IPs/domains with threat intelligence",
            "Analyze device fingerprints comprehensively",
            "Identify device spoofing using multiple detection methods",
            "Verify device consistency across ALL data sources"
        ]
    },
    "location": {
        "tool_categories": ["threat_intelligence", "ml_ai", "database", "osint"],
        "objectives": [
            "Verify location using MULTIPLE geolocation tools",
            "Detect impossible travel using ALL pattern analysis tools",
            "Check location reputation with threat intelligence",
            "Analyze location patterns with ML/AI tools",
            "Query ALL databases for location history",
            "Use OSINT to verify location claims",
            "Cross-reference location data across sources"
        ]
    },
    "logs": {
        "tool_categories": ["database", "ml_ai", "file_system", "threat_intelligence"],
        "objectives": [
            "Query ALL log sources (Splunk, SumoLogic, Snowflake)",
            "Detect anomalies using EVERY ML/AI tool",
            "Identify suspicious patterns across log types",
            "Correlate logs with threat intelligence",
            "Analyze authentication patterns comprehensively",
            "Track user behavior across ALL systems",
            "Find hidden indicators using deep analysis"
        ]
    },
    "risk": {
        "tool_categories": ["ml_ai", "database", "threat_intelligence"],
        "objectives": [
            "Calculate risk using ALL available scoring models",
            "Apply EVERY fraud detection algorithm",
            "Synthesize findings from ALL domain investigations",
            "Query historical risk patterns from ALL databases",
            "Generate comprehensive risk metrics",
            "Identify risk factors using multiple methodologies",
            "Provide confidence scores based on tool coverage"
        ]
    }
}


def validate_tool_usage(response: str, minimum_tools: int = 10) -> Dict[str, Any]:
    """
    Validate that the agent used sufficient tools in their investigation.
    
    Args:
        response: Agent's investigation response
        minimum_tools: Minimum number of tools that should be used
    
    Returns:
        Validation result with tool count and recommendations
    """
    import re
    
    # Look for tool mentions in the response
    tool_pattern = r'(?:using|used|calling|called|invoking|invoked|applying|applied)\s+(\w+(?:_\w+)*)'
    tools_mentioned = re.findall(tool_pattern, response.lower())
    unique_tools = set(tools_mentioned)
    
    validation = {
        "tools_used": len(unique_tools),
        "minimum_required": minimum_tools,
        "sufficient_coverage": len(unique_tools) >= minimum_tools,
        "unique_tools": list(unique_tools),
        "recommendation": ""
    }
    
    if not validation["sufficient_coverage"]:
        validation["recommendation"] = (
            f"⚠️ INSUFFICIENT TOOL COVERAGE: Only {len(unique_tools)} tools used. "
            f"A comprehensive investigation requires at least {minimum_tools} tools. "
            "Please expand your investigation to use more tools from different categories."
        )
    else:
        validation["recommendation"] = (
            f"✅ Good tool coverage with {len(unique_tools)} tools used."
        )
    
    return validation