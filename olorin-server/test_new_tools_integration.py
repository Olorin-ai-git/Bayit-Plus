#!/usr/bin/env python3
"""
Simple integration test for new MCP client and threat intelligence tools.
Run with: poetry run python test_new_tools_integration.py
"""

import asyncio
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


async def test_tool_registration():
    """Test that all new tools are properly registered."""
    logger.info("=" * 60)
    logger.info("Testing Tool Registration")
    logger.info("=" * 60)
    
    from app.service.agent.tools.tool_registry import initialize_tools, get_mcp_client_tools, get_threat_intelligence_tools
    
    # Initialize tools
    initialize_tools()
    
    # Test MCP client tools
    mcp_tools = get_mcp_client_tools()
    logger.info(f"\n✅ MCP Client Tools Registered: {len(mcp_tools)}")
    for tool in mcp_tools:
        logger.info(f"  - {tool.name}: {tool.description[:80]}...")
    
    # Test threat intelligence tools
    threat_tools = get_threat_intelligence_tools()
    logger.info(f"\n✅ Threat Intelligence Tools Registered: {len(threat_tools)}")
    for tool in threat_tools:
        logger.info(f"  - {tool.name}: {tool.description[:80]}...")
    
    return len(mcp_tools) > 0 and len(threat_tools) > 0


async def test_blockchain_mcp_client():
    """Test blockchain MCP client functionality."""
    logger.info("\n" + "=" * 60)
    logger.info("Testing Blockchain MCP Client")
    logger.info("=" * 60)
    
    from app.service.agent.mcp_client import blockchain_mcp_client
    
    # Test blockchain analysis
    result = blockchain_mcp_client._run(
        address='1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',  # Bitcoin genesis address
        chain='bitcoin',
        depth=2
    )
    
    logger.info(f"✅ Blockchain Analysis Result:")
    logger.info(f"  Address: {result['address']}")
    logger.info(f"  Chain: {result['chain']}")
    logger.info(f"  Analysis providers: {list(result['analysis'].keys())}")
    
    if 'chainalysis' in result['analysis']:
        risk_score = result['analysis']['chainalysis'].get('risk_score', 'N/A')
        logger.info(f"  Risk Score: {risk_score}")
    
    return 'analysis' in result


async def test_intelligence_mcp_client():
    """Test intelligence gathering MCP client."""
    logger.info("\n" + "=" * 60)
    logger.info("Testing Intelligence MCP Client")
    logger.info("=" * 60)
    
    from app.service.agent.mcp_client import intelligence_mcp_client
    from app.service.agent.mcp_client.intelligence_client import IntelligenceType
    
    # Test OSINT gathering
    result = intelligence_mcp_client._run(
        query="john.doe@example.com",
        intel_type=IntelligenceType.OSINT,
        depth=2
    )
    
    logger.info(f"✅ Intelligence Gathering Result:")
    logger.info(f"  Query: {result['query']}")
    logger.info(f"  Type: {result['intel_type']}")
    
    if 'findings' in result and result['findings']:
        findings = result['findings']
        if 'public_records' in findings:
            logger.info(f"  Public records found: {findings['public_records'].get('addresses', 0)} addresses")
        if 'data_breaches' in findings:
            logger.info(f"  Data breach exposure: {findings['data_breaches'].get('exposed_in', [])}")
    
    return 'findings' in result


async def test_ml_ai_mcp_client():
    """Test ML/AI MCP client."""
    logger.info("\n" + "=" * 60)
    logger.info("Testing ML/AI MCP Client")
    logger.info("=" * 60)
    
    from app.service.agent.mcp_client import ml_ai_mcp_client
    from app.service.agent.mcp_client.ml_ai_client import ModelType
    
    # Test fraud detection
    test_transaction = {
        "amount": 10000,
        "velocity": 50,
        "location_change": True,
        "device_trust": 0.3
    }
    
    result = ml_ai_mcp_client._run(
        data=test_transaction,
        model_type=ModelType.FRAUD_DETECTION,
        confidence_threshold=0.7
    )
    
    logger.info(f"✅ ML/AI Analysis Result:")
    logger.info(f"  Model Type: {result['model_type']}")
    
    if 'predictions' in result and result['predictions']:
        predictions = result['predictions']
        logger.info(f"  Is Fraudulent: {predictions.get('is_fraudulent', 'N/A')}")
        logger.info(f"  Confidence: {predictions.get('confidence', 'N/A')}")
        logger.info(f"  Risk Score: {predictions.get('risk_score', 'N/A')}")
    
    return 'predictions' in result


async def test_threat_intelligence_tools():
    """Test threat intelligence tools."""
    logger.info("\n" + "=" * 60)
    logger.info("Testing Threat Intelligence Tools")
    logger.info("=" * 60)
    
    from app.service.agent.tools.tool_registry import get_threat_intelligence_tools
    
    threat_tools = get_threat_intelligence_tools()
    
    # Check for specific tools
    tool_names = [tool.name for tool in threat_tools]
    
    expected_tools = {
        "abuse": "AbuseIPDB",
        "virus": "VirusTotal",
        "shodan": "Shodan",
        "unified": "Unified Threat Intelligence"
    }
    
    found_tools = {}
    for key, name in expected_tools.items():
        found = any(key in tool_name.lower() for tool_name in tool_names)
        found_tools[name] = found
        status = "✅" if found else "❌"
        logger.info(f"  {status} {name}: {'Found' if found else 'Not Found'}")
    
    return all(found_tools.values())


async def test_graph_builder_integration():
    """Test that new tools are integrated in graph builder."""
    logger.info("\n" + "=" * 60)
    logger.info("Testing Graph Builder Integration")
    logger.info("=" * 60)
    
    from app.service.agent.orchestration.graph_builder import _get_configured_tools
    
    tools = _get_configured_tools()
    tool_names = [tool.name for tool in tools]
    
    # Count different tool categories
    mcp_count = len([t for t in tool_names if 'mcp' in t])
    threat_count = len([t for t in tool_names if any(x in t for x in ['threat', 'virus', 'abuse', 'shodan'])])
    traditional_count = len([t for t in tool_names if any(x in t.lower() for x in ['splunk', 'sumologic'])])
    
    logger.info(f"✅ Graph Builder Tool Statistics:")
    logger.info(f"  Total Tools: {len(tools)}")
    logger.info(f"  MCP Client Tools: {mcp_count}")
    logger.info(f"  Threat Intelligence Tools: {threat_count}")
    logger.info(f"  Traditional Tools: {traditional_count}")
    
    return len(tools) > 0 and mcp_count > 0 and threat_count > 0


async def test_domain_objectives_updated():
    """Test that domain objectives include new tools."""
    logger.info("\n" + "=" * 60)
    logger.info("Testing Domain Agent Objectives")
    logger.info("=" * 60)
    
    from app.service.agent.agent_factory import get_default_domain_objectives
    
    domains = ["network", "device", "location", "logs", "risk"]
    tools_mentioned = {
        "blockchain_mcp_client": False,
        "intelligence_mcp_client": False,
        "ml_ai_mcp_client": False,
        "threat intelligence": False
    }
    
    for domain in domains:
        objectives = get_default_domain_objectives(domain)
        objectives_text = " ".join(objectives).lower()
        
        # Check for tool mentions
        if "blockchain" in objectives_text:
            tools_mentioned["blockchain_mcp_client"] = True
        if "intelligence_mcp_client" in objectives_text or "osint" in objectives_text:
            tools_mentioned["intelligence_mcp_client"] = True
        if "ml_ai_mcp_client" in objectives_text:
            tools_mentioned["ml_ai_mcp_client"] = True
        if "threat intelligence" in objectives_text or "abuseipdb" in objectives_text or "virustotal" in objectives_text:
            tools_mentioned["threat intelligence"] = True
        
        # Log domain objectives summary
        tool_objectives = [obj for obj in objectives if any(tool in obj.lower() for tool in ["mcp", "threat", "virustotal", "abuseipdb", "shodan", "blockchain", "osint", "ml"])]
        if tool_objectives:
            logger.info(f"\n  {domain.upper()} domain tool objectives:")
            for obj in tool_objectives:
                logger.info(f"    - {obj[:100]}...")
    
    logger.info(f"\n✅ Tool Integration in Objectives:")
    for tool, mentioned in tools_mentioned.items():
        status = "✅" if mentioned else "⚠️"
        logger.info(f"  {status} {tool}: {'Integrated' if mentioned else 'Not explicitly mentioned'}")
    
    return any(tools_mentioned.values())


async def main():
    """Run all tests."""
    logger.info("\n" + "🚀 " * 20)
    logger.info("TESTING NEW TOOLS INTEGRATION")
    logger.info("🚀 " * 20)
    
    test_results = {}
    
    # Run tests
    try:
        test_results["Tool Registration"] = await test_tool_registration()
    except Exception as e:
        logger.error(f"Tool Registration test failed: {e}")
        test_results["Tool Registration"] = False
    
    try:
        test_results["Blockchain MCP Client"] = await test_blockchain_mcp_client()
    except Exception as e:
        logger.error(f"Blockchain MCP Client test failed: {e}")
        test_results["Blockchain MCP Client"] = False
    
    try:
        test_results["Intelligence MCP Client"] = await test_intelligence_mcp_client()
    except Exception as e:
        logger.error(f"Intelligence MCP Client test failed: {e}")
        test_results["Intelligence MCP Client"] = False
    
    try:
        test_results["ML/AI MCP Client"] = await test_ml_ai_mcp_client()
    except Exception as e:
        logger.error(f"ML/AI MCP Client test failed: {e}")
        test_results["ML/AI MCP Client"] = False
    
    try:
        test_results["Threat Intelligence Tools"] = await test_threat_intelligence_tools()
    except Exception as e:
        logger.error(f"Threat Intelligence Tools test failed: {e}")
        test_results["Threat Intelligence Tools"] = False
    
    try:
        test_results["Graph Builder Integration"] = await test_graph_builder_integration()
    except Exception as e:
        logger.error(f"Graph Builder Integration test failed: {e}")
        test_results["Graph Builder Integration"] = False
    
    try:
        test_results["Domain Objectives"] = await test_domain_objectives_updated()
    except Exception as e:
        logger.error(f"Domain Objectives test failed: {e}")
        test_results["Domain Objectives"] = False
    
    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("TEST SUMMARY")
    logger.info("=" * 60)
    
    passed = 0
    failed = 0
    
    for test_name, result in test_results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        logger.info(f"  {test_name}: {status}")
        if result:
            passed += 1
        else:
            failed += 1
    
    logger.info("\n" + "=" * 60)
    logger.info(f"FINAL RESULT: {passed} passed, {failed} failed")
    
    if failed == 0:
        logger.info("🎉 ALL TESTS PASSED! New tools are successfully integrated.")
    else:
        logger.warning(f"⚠️ {failed} tests failed. Please review the issues above.")
    
    logger.info("=" * 60)
    
    return failed == 0


if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)