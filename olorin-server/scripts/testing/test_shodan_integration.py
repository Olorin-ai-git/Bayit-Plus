#!/usr/bin/env python3
"""
Test script to verify Shodan API integration
"""

import asyncio
import json
from app.service.agent.tools.threat_intelligence_tool.shodan.shodan_client import ShodanClient
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

async def test_shodan():
    """Test Shodan API with a known IP"""
    
    logger.info("=" * 80)
    logger.info("Testing Shodan API Integration")
    logger.info("=" * 80)
    
    try:
        # Create Shodan client
        client = ShodanClient()
        
        # Test with Google's public DNS (well-known IP)
        test_ip = "8.8.8.8"
        logger.info(f"Testing with IP: {test_ip}")
        
        result = await client.host_info(ip=test_ip, history=False, minify=False)
        
        if result and result.ip_str:
            logger.info("✅ Shodan API key is working!")
            logger.info(f"Host info result summary:")
            logger.info(f"  - IP: {result.ip_str}")
            logger.info(f"  - Organization: {result.org}")
            logger.info(f"  - Open ports: {result.ports[:10] if result.ports else 'None'}")
            logger.info(f"  - Country: {result.country_name}")
            logger.info(f"  - ISP: {result.isp}")
        else:
            logger.error(f"❌ Shodan API test failed")
            
    except Exception as e:
        logger.error(f"❌ Error testing Shodan: {e}")
    
    logger.info("=" * 80)

if __name__ == "__main__":
    asyncio.run(test_shodan())