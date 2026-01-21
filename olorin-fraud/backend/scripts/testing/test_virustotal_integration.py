#!/usr/bin/env python3
"""
Test script to verify VirusTotal API integration
"""

import asyncio
import json

from app.service.agent.tools.threat_intelligence_tool.virustotal.models import (
    VirusTotalConfig,
)
from app.service.agent.tools.threat_intelligence_tool.virustotal.virustotal_client import (
    VirusTotalClient,
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def test_virustotal():
    """Test VirusTotal API with a known domain"""

    logger.info("=" * 80)
    logger.info("Testing VirusTotal API Integration")
    logger.info("=" * 80)

    try:
        # Create VirusTotal client
        config = VirusTotalConfig(
            api_key_secret="VIRUSTOTAL_API_KEY", timeout=30, max_retries=3
        )

        client = VirusTotalClient(config)

        # Test with a known safe domain
        test_domain = "google.com"
        logger.info(f"Testing with domain: {test_domain}")

        result = await client.analyze_domain(test_domain)

        if result.success:
            logger.info("✅ VirusTotal API key is working!")
            logger.info(
                f"Domain analysis result: {json.dumps(result.dict(), indent=2, default=str)}"
            )
        else:
            logger.error(f"❌ VirusTotal API test failed: {result.error}")

    except Exception as e:
        logger.error(f"❌ Error testing VirusTotal: {e}")

    logger.info("=" * 80)


if __name__ == "__main__":
    asyncio.run(test_virustotal())
