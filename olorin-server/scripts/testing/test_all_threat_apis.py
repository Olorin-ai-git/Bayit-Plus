#!/usr/bin/env python3
"""
Test all threat intelligence API integrations
"""

import asyncio
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

async def test_all_apis():
    """Test all threat intelligence APIs"""
    
    logger.info("=" * 80)
    logger.info("TESTING ALL THREAT INTELLIGENCE API INTEGRATIONS")
    logger.info("=" * 80)
    
    results = {
        "AbuseIPDB": False,
        "VirusTotal": False,
        "Shodan": False
    }
    
    # Test AbuseIPDB
    try:
        from app.service.agent.tools.threat_intelligence_tool.abuseipdb.abuseipdb_client import AbuseIPDBClient
        from app.service.agent.tools.threat_intelligence_tool.abuseipdb.models import AbuseIPDBConfig
        
        config = AbuseIPDBConfig(
            api_key_secret="ABUSEIPDB_API_KEY",
            timeout=30,
            max_retries=3
        )
        client = AbuseIPDBClient(config)
        
        # Test with Google DNS
        result = await client.check_ip_reputation("8.8.8.8", max_age_days=90, verbose=False)
        if result.success:
            logger.info("✅ AbuseIPDB API: WORKING")
            results["AbuseIPDB"] = True
        else:
            logger.error(f"❌ AbuseIPDB API: FAILED - {result.error}")
    except Exception as e:
        logger.error(f"❌ AbuseIPDB API: ERROR - {e}")
    
    # Test VirusTotal
    try:
        from app.service.agent.tools.threat_intelligence_tool.virustotal.virustotal_client import VirusTotalClient
        from app.service.agent.tools.threat_intelligence_tool.virustotal.models import VirusTotalConfig
        
        config = VirusTotalConfig(
            api_key_secret="VIRUSTOTAL_API_KEY",
            timeout=30,
            max_retries=3
        )
        client = VirusTotalClient(config)
        
        # Test with safe domain
        result = await client.analyze_domain("google.com")
        if result.success:
            logger.info("✅ VirusTotal API: WORKING")
            results["VirusTotal"] = True
        else:
            logger.error(f"❌ VirusTotal API: FAILED - {result.error}")
    except Exception as e:
        logger.error(f"❌ VirusTotal API: ERROR - {e}")
    
    # Test Shodan
    try:
        from app.service.agent.tools.threat_intelligence_tool.shodan.shodan_client import ShodanClient
        
        client = ShodanClient()
        
        # Test with Google DNS
        result = await client.host_info(ip="8.8.8.8", history=False, minify=False)
        if result and result.ip_str:
            logger.info("✅ Shodan API: WORKING")
            results["Shodan"] = True
        else:
            logger.error("❌ Shodan API: FAILED")
    except Exception as e:
        logger.error(f"❌ Shodan API: ERROR - {e}")
    
    # Summary
    logger.info("=" * 80)
    logger.info("SUMMARY")
    logger.info("=" * 80)
    
    working = sum(1 for v in results.values() if v)
    total = len(results)
    
    for api, status in results.items():
        status_emoji = "✅" if status else "❌"
        logger.info(f"{status_emoji} {api}: {'WORKING' if status else 'NOT WORKING'}")
    
    logger.info("-" * 80)
    logger.info(f"APIs Working: {working}/{total}")
    
    if working == total:
        logger.info("🎉 ALL THREAT INTELLIGENCE APIs ARE CONFIGURED AND WORKING!")
    else:
        logger.warning(f"⚠️  {total - working} API(s) still need configuration")
    
    logger.info("=" * 80)

if __name__ == "__main__":
    asyncio.run(test_all_apis())