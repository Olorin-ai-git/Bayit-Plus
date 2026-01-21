#!/usr/bin/env python3
"""
Test suite for Phase 5 Blockchain & Cryptocurrency Intelligence Tools.
Validates all 8 blockchain analysis tools integrated into Olorin.
Run with: poetry run python test_blockchain_tools_phase5.py
"""

import asyncio
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def test_blockchain_tools_registration():
    """Test that all blockchain tools are properly registered."""
    logger.info("=" * 60)
    logger.info("Testing Blockchain Tools Registration")
    logger.info("=" * 60)

    try:
        from app.service.agent.tools.tool_registry import (
            get_blockchain_tools,
            initialize_tools,
        )

        # Initialize tools
        initialize_tools()

        # Test blockchain tools
        blockchain_tools = get_blockchain_tools()
        logger.info(f"\n✅ Blockchain Tools Registered: {len(blockchain_tools)}")

        expected_tools = [
            "blockchain_wallet_analysis",
            "cryptocurrency_tracing",
            "defi_protocol_analysis",
            "nft_fraud_detection",
            "blockchain_forensics",
            "crypto_exchange_analysis",
            "darkweb_crypto_monitor",
            "cryptocurrency_compliance",
        ]

        registered_names = [tool.name for tool in blockchain_tools]

        for expected in expected_tools:
            found = expected in registered_names
            status = "✅" if found else "❌"
            logger.info(
                f"  {status} {expected}: {'Registered' if found else 'Missing'}"
            )

        return len(blockchain_tools) >= 8

    except Exception as e:
        logger.error(f"Blockchain tools registration test failed: {e}")
        return False


async def test_blockchain_wallet_analysis():
    """Test blockchain wallet analysis tool."""
    logger.info("\n" + "=" * 60)
    logger.info("Testing Blockchain Wallet Analysis Tool")
    logger.info("=" * 60)

    try:
        from app.service.agent.tools.blockchain_tools.blockchain_wallet_analysis import (
            BlockchainWalletAnalysisTool,
        )

        tool = BlockchainWalletAnalysisTool()

        # Test wallet analysis
        result = tool._run(
            wallet_address="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",  # Bitcoin genesis address
            network="bitcoin",
            depth=10,
            include_sanctions=True,
            include_clustering=True,
        )

        logger.info(f"✅ Wallet Analysis Result:")
        logger.info(f"  Address: {result['wallet_address']}")
        logger.info(f"  Network: {result['network']}")
        logger.info(f"  Risk Level: {result['risk_assessment']['overall_risk']}")
        logger.info(f"  Risk Score: {result['risk_assessment']['risk_score']}")

        if result["compliance_check"]["sanctions_hit"]:
            logger.info(f"  ⚠️  Sanctions Hit Detected")

        if result["clustering_results"]:
            logger.info(
                f"  Cluster Size: {result['clustering_results']['cluster_size']}"
            )

        return "risk_assessment" in result and "compliance_check" in result

    except Exception as e:
        logger.error(f"Blockchain wallet analysis test failed: {e}")
        return False


async def test_cryptocurrency_tracing():
    """Test cryptocurrency tracing tool."""
    logger.info("\n" + "=" * 60)
    logger.info("Testing Cryptocurrency Tracing Tool")
    logger.info("=" * 60)

    try:
        from app.service.agent.tools.blockchain_tools.cryptocurrency_tracing import (
            CryptocurrencyTracingTool,
        )

        tool = CryptocurrencyTracingTool()

        # Test transaction tracing
        result = tool._run(
            transaction_hash="0xabc123def456789",
            source_network="ethereum",
            tracing_depth="medium",
            follow_cross_chain=True,
            detect_mixing=True,
        )

        logger.info(f"✅ Cryptocurrency Tracing Result:")
        logger.info(f"  Transaction: {result['transaction_hash']}")
        logger.info(f"  Network: {result['source_network']}")
        logger.info(f"  Total Value Traced: ${result['summary']['total_value_traced']}")
        logger.info(f"  Hops Analyzed: {result['summary']['hops_analyzed']}")
        logger.info(f"  Mixing Detected: {result['summary']['mixing_detected']}")
        logger.info(
            f"  Exchanges Identified: {result['summary']['exchanges_identified']}"
        )

        return "fund_flow" in result and "summary" in result

    except Exception as e:
        logger.error(f"Cryptocurrency tracing test failed: {e}")
        return False


async def test_defi_protocol_analysis():
    """Test DeFi protocol analysis tool."""
    logger.info("\n" + "=" * 60)
    logger.info("Testing DeFi Protocol Analysis Tool")
    logger.info("=" * 60)

    try:
        from app.service.agent.tools.blockchain_tools.defi_protocol_analysis import (
            DeFiProtocolAnalysisTool,
        )

        tool = DeFiProtocolAnalysisTool()

        # Test DeFi protocol analysis
        result = tool._run(
            protocol_address="0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9",  # Aave lending pool
            protocol_type="lending",
            analysis_period_hours=24,
            detect_attacks=True,
            analyze_liquidity=True,
        )

        logger.info(f"✅ DeFi Protocol Analysis Result:")
        logger.info(f"  Protocol: {result['protocol_address']}")
        logger.info(f"  Type: {result['protocol_type']}")
        logger.info(f"  TVL: ${result['protocol_metrics']['total_value_locked']:,}")
        logger.info(f"  24h Volume: ${result['protocol_metrics']['24h_volume']:,}")
        logger.info(f"  Risk Score: {result['risk_assessment']['overall_risk_score']}")
        logger.info(f"  Risk Level: {result['risk_assessment']['risk_level']}")

        if result["attack_detection"]["attacks_detected"]:
            logger.info(
                f"  ⚠️  Attacks Detected: {len(result['attack_detection']['attacks_detected'])}"
            )

        return "protocol_metrics" in result and "risk_assessment" in result

    except Exception as e:
        logger.error(f"DeFi protocol analysis test failed: {e}")
        return False


async def test_nft_fraud_detection():
    """Test NFT fraud detection tool."""
    logger.info("\n" + "=" * 60)
    logger.info("Testing NFT Fraud Detection Tool")
    logger.info("=" * 60)

    try:
        from app.service.agent.tools.blockchain_tools.nft_fraud_detection import (
            NFTFraudDetectionTool,
        )

        tool = NFTFraudDetectionTool()

        # Test NFT fraud detection
        result = tool._run(
            collection_address="0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",  # Bored Ape Yacht Club
            token_id="1234",
            check_authenticity=True,
            detect_wash_trading=True,
            analyze_metadata=True,
            check_copyright=True,
        )

        logger.info(f"✅ NFT Fraud Detection Result:")
        logger.info(f"  Collection: {result['collection_address']}")
        logger.info(f"  Token ID: {result['token_id']}")
        logger.info(f"  Fraud Score: {result['fraud_assessment']['fraud_score']}")
        logger.info(f"  Risk Level: {result['fraud_assessment']['risk_level']}")
        logger.info(f"  Confidence: {result['fraud_assessment']['confidence']:.2f}")

        if result["authenticity_check"]:
            logger.info(f"  Verified: {result['authenticity_check']['is_verified']}")
            logger.info(
                f"  Authenticity Score: {result['authenticity_check']['authenticity_score']}"
            )

        if result["fraud_assessment"]["detected_fraud_types"]:
            logger.info(
                f"  Fraud Types: {result['fraud_assessment']['detected_fraud_types']}"
            )

        return "fraud_assessment" in result and "authenticity_check" in result

    except Exception as e:
        logger.error(f"NFT fraud detection test failed: {e}")
        return False


async def test_blockchain_forensics():
    """Test blockchain forensics tool."""
    logger.info("\n" + "=" * 60)
    logger.info("Testing Blockchain Forensics Tool")
    logger.info("=" * 60)

    try:
        from app.service.agent.tools.blockchain_tools.blockchain_forensics import (
            BlockchainForensicsTool,
        )

        tool = BlockchainForensicsTool()

        # Test forensics analysis
        result = tool._run(
            case_id="CASE-2025-001",
            evidence_addresses=[
                "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
                "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5",
            ],
            evidence_type="wallet_activity",
            preserve_evidence=True,
            generate_report=True,
            forensics_standard="iso_27037",
        )

        logger.info(f"✅ Blockchain Forensics Result:")
        logger.info(f"  Case ID: {result['case_id']}")
        logger.info(
            f"  Evidence Items: {result['evidence_collection']['evidence_items']}"
        )
        logger.info(f"  Forensics Standard: {result['forensics_standard']}")
        logger.info(
            f"  Chain of Custody ID: {result['chain_of_custody']['custody_id']}"
        )
        logger.info(f"  Evidence Hash: {result['evidence_hash'][:16]}...")

        if result["report"]:
            logger.info(f"  Report ID: {result['report']['report_id']}")
            logger.info(f"  Report Type: {result['report']['report_type']}")

        return "evidence_collection" in result and "chain_of_custody" in result

    except Exception as e:
        logger.error(f"Blockchain forensics test failed: {e}")
        return False


async def test_tools_in_investigation_graph():
    """Test that blockchain tools are available in investigation graph."""
    logger.info("\n" + "=" * 60)
    logger.info("Testing Blockchain Tools in Investigation Graph")
    logger.info("=" * 60)

    try:
        from app.service.agent.orchestration.graph_builder import _get_configured_tools

        tools = _get_configured_tools()
        tool_names = [tool.name for tool in tools]

        # Count different tool categories
        blockchain_count = len(
            [
                t
                for t in tool_names
                if any(x in t for x in ["blockchain", "crypto", "defi", "nft"])
            ]
        )
        threat_count = len(
            [
                t
                for t in tool_names
                if any(x in t for x in ["threat", "virus", "abuse", "shodan"])
            ]
        )
        mcp_count = len([t for t in tool_names if "mcp" in t])

        logger.info(f"✅ Investigation Graph Tool Statistics:")
        logger.info(f"  Total Tools: {len(tools)}")
        logger.info(f"  Blockchain Tools: {blockchain_count}")
        logger.info(f"  Threat Intelligence Tools: {threat_count}")
        logger.info(f"  MCP Client Tools: {mcp_count}")

        # Check for specific blockchain tools
        blockchain_tools = [
            "blockchain_wallet_analysis",
            "cryptocurrency_tracing",
            "defi_protocol_analysis",
            "nft_fraud_detection",
        ]

        for tool_name in blockchain_tools:
            found = tool_name in tool_names
            status = "✅" if found else "❌"
            logger.info(
                f"  {status} {tool_name}: {'Available' if found else 'Missing'}"
            )

        return blockchain_count >= 4

    except Exception as e:
        logger.error(f"Investigation graph tools test failed: {e}")
        return False


async def test_domain_objectives_blockchain_integration():
    """Test that domain objectives include blockchain tools."""
    logger.info("\n" + "=" * 60)
    logger.info("Testing Domain Agent Objectives - Blockchain Integration")
    logger.info("=" * 60)

    try:
        from app.service.agent.agent_factory import get_default_domain_objectives

        domains = ["network", "device", "location", "logs", "risk"]
        blockchain_keywords = [
            "blockchain",
            "cryptocurrency",
            "crypto",
            "defi",
            "nft",
            "forensics",
            "compliance",
            "darkweb",
            "tracing",
        ]

        integrated_domains = 0

        for domain in domains:
            objectives = get_default_domain_objectives(domain)
            objectives_text = " ".join(objectives).lower()

            # Check for blockchain tool mentions
            blockchain_mentions = [
                kw for kw in blockchain_keywords if kw in objectives_text
            ]

            if blockchain_mentions:
                integrated_domains += 1
                logger.info(f"\n  {domain.upper()} domain blockchain integration:")
                for mention in blockchain_mentions:
                    logger.info(f"    - Found: '{mention}'")
            else:
                logger.info(
                    f"\n  {domain.upper()} domain: No blockchain integration found"
                )

        logger.info(f"\n✅ Blockchain Integration Summary:")
        logger.info(
            f"  Domains with blockchain tools: {integrated_domains}/{len(domains)}"
        )
        logger.info(
            f"  Integration coverage: {(integrated_domains/len(domains)*100):.1f}%"
        )

        return (
            integrated_domains >= 3
        )  # At least 60% of domains should have blockchain integration

    except Exception as e:
        logger.error(f"Domain objectives blockchain integration test failed: {e}")
        return False


async def main():
    """Run all Phase 5 blockchain tools tests."""
    logger.info("\n" + "🚀 " * 20)
    logger.info("PHASE 5: BLOCKCHAIN & CRYPTOCURRENCY TOOLS TESTING")
    logger.info("🚀 " * 20)

    test_results = {}

    # Run all tests
    test_functions = [
        ("Blockchain Tools Registration", test_blockchain_tools_registration),
        ("Blockchain Wallet Analysis", test_blockchain_wallet_analysis),
        ("Cryptocurrency Tracing", test_cryptocurrency_tracing),
        ("DeFi Protocol Analysis", test_defi_protocol_analysis),
        ("NFT Fraud Detection", test_nft_fraud_detection),
        ("Blockchain Forensics", test_blockchain_forensics),
        ("Investigation Graph Integration", test_tools_in_investigation_graph),
        (
            "Domain Objectives Integration",
            test_domain_objectives_blockchain_integration,
        ),
    ]

    for test_name, test_func in test_functions:
        try:
            test_results[test_name] = await test_func()
        except Exception as e:
            logger.error(f"{test_name} test failed: {e}")
            test_results[test_name] = False

    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("PHASE 5 TEST SUMMARY")
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
    logger.info(f"PHASE 5 FINAL RESULT: {passed} passed, {failed} failed")

    if failed == 0:
        logger.info(
            "🎉 ALL PHASE 5 TESTS PASSED! Blockchain tools successfully integrated."
        )
        logger.info(
            "✅ Phase 5: Blockchain & Cryptocurrency Intelligence Tools - COMPLETED"
        )
    else:
        logger.warning(
            f"⚠️ {failed} Phase 5 tests failed. Please review the issues above."
        )

    logger.info("=" * 60)

    return failed == 0


if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)
