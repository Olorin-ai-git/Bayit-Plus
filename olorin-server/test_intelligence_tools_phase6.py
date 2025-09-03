#!/usr/bin/env python3
"""
Test suite for Phase 6 Advanced Intelligence Gathering Tools.
Validates all 8 intelligence tools integrated into Olorin.
Run with: poetry run python test_intelligence_tools_phase6.py
"""

import asyncio
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


async def test_intelligence_tools_registration():
    """Test that all intelligence tools are properly registered."""
    logger.info("=" * 60)
    logger.info("Testing Intelligence Tools Registration")
    logger.info("=" * 60)
    
    try:
        from app.service.agent.tools.tool_registry import initialize_tools, get_intelligence_tools
        
        # Initialize tools
        initialize_tools()
        
        # Test intelligence tools
        intelligence_tools = get_intelligence_tools()
        logger.info(f"\n✅ Intelligence Tools Registered: {len(intelligence_tools)}")
        
        expected_tools = [
            "social_media_profiling",
            "social_network_analysis",
            "social_media_monitoring",
            "osint_data_aggregator",
            "people_search",
            "business_intelligence",
            "darkweb_monitoring",
            "deepweb_search"
        ]
        
        registered_names = [tool.name for tool in intelligence_tools]
        
        for expected in expected_tools:
            found = expected in registered_names
            status = "✅" if found else "❌"
            logger.info(f"  {status} {expected}: {'Registered' if found else 'Missing'}")
        
        return len(intelligence_tools) >= 8
        
    except Exception as e:
        logger.error(f"Intelligence tools registration test failed: {e}")
        return False


async def test_social_media_profiling():
    """Test social media profiling tool."""
    logger.info("\n" + "=" * 60)
    logger.info("Testing Social Media Profiling Tool")
    logger.info("=" * 60)
    
    try:
        from app.service.agent.tools.intelligence_tools.social_media_profiling import SocialMediaProfilingTool
        
        tool = SocialMediaProfilingTool()
        
        # Test social media profiling
        result = tool._run(
            target_identifier="john.doe@example.com",
            identifier_type="email",
            platforms=["twitter", "linkedin", "facebook"],
            include_behavior_analysis=True,
            include_network_mapping=True,
            verification_level="medium"
        )
        
        logger.info(f"✅ Social Media Profiling Result:")
        logger.info(f"  Target: {result['target_identifier']}")
        logger.info(f"  Platforms Searched: {len(result['platforms_searched'])}")
        logger.info(f"  Profiles Found: {len(result['discovered_profiles'])}")
        logger.info(f"  Identity Confidence: {result['identity_verification']['confidence']}")
        logger.info(f"  Verification Score: {result['identity_verification']['identity_score']}")
        
        if result['behavior_analysis']:
            logger.info(f"  Behavioral Profile: {result['behavior_analysis']['behavioral_profile']['posting_frequency']}")
        
        if result['network_mapping']:
            logger.info(f"  Network Size: {result['network_mapping']['network_size']}")
        
        return 'discovered_profiles' in result and 'identity_verification' in result
        
    except Exception as e:
        logger.error(f"Social media profiling test failed: {e}")
        return False


async def test_social_network_analysis():
    """Test social network analysis tool."""
    logger.info("\n" + "=" * 60)
    logger.info("Testing Social Network Analysis Tool")
    logger.info("=" * 60)
    
    try:
        from app.service.agent.tools.intelligence_tools.social_network_analysis import SocialNetworkAnalysisTool
        
        tool = SocialNetworkAnalysisTool()
        
        # Test network analysis
        result = tool._run(
            target_profiles=["user123", "suspect456"],
            analysis_depth=2,
            analysis_types=["centrality", "community"],
            include_influence_mapping=True,
            detect_anomalies=True
        )
        
        logger.info(f"✅ Social Network Analysis Result:")
        logger.info(f"  Target Profiles: {len(result['target_profiles'])}")
        logger.info(f"  Analysis Depth: {result['analysis_depth']}")
        logger.info(f"  Total Nodes: {result['network_metrics']['total_nodes']}")
        logger.info(f"  Total Edges: {result['network_metrics']['total_edges']}")
        logger.info(f"  Network Density: {result['network_metrics']['network_density']}")
        
        if result['community_detection']:
            logger.info(f"  Communities Found: {result['community_detection']['total_communities']}")
            suspicious = [c for c in result['community_detection']['communities'] if c.get('type') == 'suspicious']
            if suspicious:
                logger.info(f"  ⚠️  Suspicious Communities: {len(suspicious)}")
        
        logger.info(f"  Risk Level: {result['risk_assessment']['risk_level']}")
        
        return 'network_metrics' in result and 'risk_assessment' in result
        
    except Exception as e:
        logger.error(f"Social network analysis test failed: {e}")
        return False


async def test_social_media_monitoring():
    """Test social media monitoring tool."""
    logger.info("\n" + "=" * 60)
    logger.info("Testing Social Media Monitoring Tool")
    logger.info("=" * 60)
    
    try:
        from app.service.agent.tools.intelligence_tools.social_media_monitoring import SocialMediaMonitoringTool
        
        tool = SocialMediaMonitoringTool()
        
        # Test monitoring
        result = tool._run(
            monitoring_keywords=["fraud", "scam", "suspicious"],
            platforms=["twitter", "facebook", "instagram"],
            monitoring_duration_hours=24,
            include_sentiment_analysis=True,
            include_threat_detection=True
        )
        
        logger.info(f"✅ Social Media Monitoring Result:")
        logger.info(f"  Keywords Monitored: {len(result['monitoring_keywords'])}")
        logger.info(f"  Duration: {result['duration_hours']} hours")
        logger.info(f"  Total Mentions: {result['content_analysis']['total_mentions']}")
        logger.info(f"  Unique Posts: {result['content_analysis']['unique_posts']}")
        
        if result['sentiment_analysis']:
            sentiment = result['sentiment_analysis']['overall_sentiment']
            logger.info(f"  Sentiment - Positive: {sentiment['positive']:.2%}")
            logger.info(f"  Sentiment - Negative: {sentiment['negative']:.2%}")
        
        if result['threat_detection']:
            threats = result['threat_detection']['detected_threats']
            logger.info(f"  Threats Detected: {len(threats)}")
            for threat in threats[:2]:  # Show first 2 threats
                logger.info(f"    - {threat['type']}: {threat['severity']}")
        
        logger.info(f"  Alerts Generated: {len(result['alerts'])}")
        
        return 'content_analysis' in result and 'alerts' in result
        
    except Exception as e:
        logger.error(f"Social media monitoring test failed: {e}")
        return False


async def test_osint_data_aggregator():
    """Test OSINT data aggregator tool."""
    logger.info("\n" + "=" * 60)
    logger.info("Testing OSINT Data Aggregator Tool")
    logger.info("=" * 60)
    
    try:
        from app.service.agent.tools.intelligence_tools.osint_data_aggregator import OSINTDataAggregatorTool
        
        tool = OSINTDataAggregatorTool()
        
        # Test OSINT aggregation
        result = tool._run(
            target_entity="John Doe",
            entity_type="person",
            sources=["public_records", "news_media", "social_media"],
            correlation_depth="medium",
            include_timeline=True,
            preserve_evidence=True
        )
        
        logger.info(f"✅ OSINT Data Aggregation Result:")
        logger.info(f"  Target Entity: {result['target_entity']}")
        logger.info(f"  Entity Type: {result['entity_type']}")
        logger.info(f"  Sources Searched: {len(result['sources_searched'])}")
        
        collection = result['data_collection']
        logger.info(f"  Sources Queried: {collection['sources_queried']}")
        logger.info(f"  Sources Responded: {collection['sources_responded']}")
        logger.info(f"  Total Records: {collection['total_records_found']}")
        
        if result['data_correlation']:
            logger.info(f"  Correlation Score: {result['data_correlation']['correlation_score']}")
            logger.info(f"  Verified Connections: {result['data_correlation']['verified_connections']}")
        
        if result['timeline_analysis']:
            logger.info(f"  Timeline Events: {result['timeline_analysis']['total_events']}")
        
        reliability = result['reliability_assessment']
        logger.info(f"  Data Reliability: {reliability['overall_reliability']}")
        
        return 'data_collection' in result and 'intelligence_summary' in result
        
    except Exception as e:
        logger.error(f"OSINT data aggregator test failed: {e}")
        return False


async def test_people_search():
    """Test people search tool."""
    logger.info("\n" + "=" * 60)
    logger.info("Testing People Search Tool")
    logger.info("=" * 60)
    
    try:
        from app.service.agent.tools.intelligence_tools.people_search import PeopleSearchTool
        
        tool = PeopleSearchTool()
        
        # Test people search
        result = tool._run(
            person_name="John Doe",
            additional_identifiers={"email": "john@example.com"}
        )
        
        logger.info(f"✅ People Search Result:")
        logger.info(f"  Person: {result['person_name']}")
        logger.info(f"  Verification Score: {result['identity_verification']['verification_score']}")
        logger.info(f"  Aliases Found: {len(result['identity_verification']['aliases'])}")
        logger.info(f"  Locations: {len(result['identity_verification']['locations'])}")
        
        background = result['background_records']
        logger.info(f"  Education Records: {len(background['education'])}")
        logger.info(f"  Employment Records: {len(background['employment'])}")
        
        associates = result['associates']
        logger.info(f"  Business Associates: {associates['business_associates']}")
        logger.info(f"  Social Connections: {associates['social_connections']}")
        
        logger.info(f"  Data Sources: {result['data_sources']}")
        
        return 'identity_verification' in result and 'background_records' in result
        
    except Exception as e:
        logger.error(f"People search test failed: {e}")
        return False


async def test_darkweb_monitoring():
    """Test dark web monitoring tool."""
    logger.info("\n" + "=" * 60)
    logger.info("Testing Dark Web Monitoring Tool")
    logger.info("=" * 60)
    
    try:
        from app.service.agent.tools.intelligence_tools.darkweb_monitoring import DarkWebMonitoringTool
        
        tool = DarkWebMonitoringTool()
        
        # Test dark web monitoring
        result = tool._run(
            monitoring_keywords=["credit card", "identity", "fraud"],
            marketplaces=["marketplace_a", "marketplace_b"],
            monitoring_duration_hours=24
        )
        
        logger.info(f"✅ Dark Web Monitoring Result:")
        logger.info(f"  Keywords: {len(result['monitoring_keywords'])}")
        logger.info(f"  Marketplaces: {len(result['marketplaces_monitored'])}")
        logger.info(f"  Duration: {result['monitoring_duration_hours']} hours")
        
        findings = result['findings']
        logger.info(f"  Total Mentions: {findings['total_mentions']}")
        logger.info(f"  Marketplace Listings: {findings['marketplace_listings']}")
        logger.info(f"  Forum Discussions: {findings['forum_discussions']}")
        logger.info(f"  Potential Data Breaches: {findings['potential_data_breaches']}")
        
        threats = result['threat_indicators']
        logger.info(f"  Threat Indicators: {len(threats)}")
        for threat in threats[:2]:  # Show first 2 threats
            logger.info(f"    - {threat['type']}: {threat['severity']} (confidence: {threat['confidence']})")
        
        logger.info(f"  Risk Level: {result['risk_level']}")
        logger.info(f"  Monitoring Score: {result['monitoring_score']}")
        
        return 'findings' in result and 'threat_indicators' in result
        
    except Exception as e:
        logger.error(f"Dark web monitoring test failed: {e}")
        return False


async def test_tools_in_investigation_graph():
    """Test that intelligence tools are available in investigation graph."""
    logger.info("\n" + "=" * 60)
    logger.info("Testing Intelligence Tools in Investigation Graph")
    logger.info("=" * 60)
    
    try:
        from app.service.agent.orchestration.graph_builder import _get_configured_tools
        
        tools = _get_configured_tools()
        tool_names = [tool.name for tool in tools]
        
        # Count different tool categories
        intelligence_count = len([t for t in tool_names if any(x in t for x in ['social_media', 'osint', 'people_search', 'business_intelligence', 'darkweb', 'deepweb'])])
        blockchain_count = len([t for t in tool_names if any(x in t for x in ['blockchain', 'crypto', 'defi', 'nft'])])
        threat_count = len([t for t in tool_names if any(x in t for x in ['threat', 'virus', 'abuse', 'shodan'])])
        mcp_count = len([t for t in tool_names if 'mcp' in t])
        
        logger.info(f"✅ Investigation Graph Tool Statistics:")
        logger.info(f"  Total Tools: {len(tools)}")
        logger.info(f"  Intelligence Tools: {intelligence_count}")
        logger.info(f"  Blockchain Tools: {blockchain_count}")
        logger.info(f"  Threat Intelligence Tools: {threat_count}")
        logger.info(f"  MCP Client Tools: {mcp_count}")
        
        # Check for specific intelligence tools
        intelligence_tools = [
            "social_media_profiling",
            "social_network_analysis",
            "osint_data_aggregator",
            "darkweb_monitoring"
        ]
        
        for tool_name in intelligence_tools:
            found = tool_name in tool_names
            status = "✅" if found else "❌"
            logger.info(f"  {status} {tool_name}: {'Available' if found else 'Missing'}")
        
        return intelligence_count >= 6
        
    except Exception as e:
        logger.error(f"Investigation graph tools test failed: {e}")
        return False


async def test_domain_objectives_intelligence_integration():
    """Test that domain objectives include intelligence tools."""
    logger.info("\n" + "=" * 60)
    logger.info("Testing Domain Agent Objectives - Intelligence Integration")
    logger.info("=" * 60)
    
    try:
        from app.service.agent.agent_factory import get_default_domain_objectives
        
        domains = ["network", "device", "location", "logs", "risk"]
        intelligence_keywords = [
            "social_media", "social_network", "osint", "people_search", 
            "business_intelligence", "darkweb", "deepweb", "monitoring"
        ]
        
        integrated_domains = 0
        
        for domain in domains:
            objectives = get_default_domain_objectives(domain)
            objectives_text = " ".join(objectives).lower()
            
            # Check for intelligence tool mentions
            intelligence_mentions = [kw for kw in intelligence_keywords if kw in objectives_text]
            
            if intelligence_mentions:
                integrated_domains += 1
                logger.info(f"\n  {domain.upper()} domain intelligence integration:")
                for mention in intelligence_mentions:
                    logger.info(f"    - Found: '{mention}'")
            else:
                logger.info(f"\n  {domain.upper()} domain: No intelligence integration found")
        
        logger.info(f"\n✅ Intelligence Integration Summary:")
        logger.info(f"  Domains with intelligence tools: {integrated_domains}/{len(domains)}")
        logger.info(f"  Integration coverage: {(integrated_domains/len(domains)*100):.1f}%")
        
        return integrated_domains >= 4  # At least 80% of domains should have intelligence integration
        
    except Exception as e:
        logger.error(f"Domain objectives intelligence integration test failed: {e}")
        return False


async def main():
    """Run all Phase 6 intelligence tools tests."""
    logger.info("\n" + "🕵️ " * 20)
    logger.info("PHASE 6: ADVANCED INTELLIGENCE GATHERING TOOLS TESTING")
    logger.info("🕵️ " * 20)
    
    test_results = {}
    
    # Run all tests
    test_functions = [
        ("Intelligence Tools Registration", test_intelligence_tools_registration),
        ("Social Media Profiling", test_social_media_profiling),
        ("Social Network Analysis", test_social_network_analysis),
        ("Social Media Monitoring", test_social_media_monitoring),
        ("OSINT Data Aggregator", test_osint_data_aggregator),
        ("People Search", test_people_search),
        ("Dark Web Monitoring", test_darkweb_monitoring),
        ("Investigation Graph Integration", test_tools_in_investigation_graph),
        ("Domain Objectives Integration", test_domain_objectives_intelligence_integration)
    ]
    
    for test_name, test_func in test_functions:
        try:
            test_results[test_name] = await test_func()
        except Exception as e:
            logger.error(f"{test_name} test failed: {e}")
            test_results[test_name] = False
    
    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("PHASE 6 TEST SUMMARY")
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
    logger.info(f"PHASE 6 FINAL RESULT: {passed} passed, {failed} failed")
    
    if failed == 0:
        logger.info("🎉 ALL PHASE 6 TESTS PASSED! Intelligence tools successfully integrated.")
        logger.info("✅ Phase 6: Advanced Intelligence Gathering Tools - COMPLETED")
    else:
        logger.warning(f"⚠️ {failed} Phase 6 tests failed. Please review the issues above.")
    
    logger.info("=" * 60)
    
    return failed == 0


if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)