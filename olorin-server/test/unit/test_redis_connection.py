#!/usr/bin/env python3
"""
Test Redis Cloud connection with the provided credentials.
"""

import os
import sys
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Redis credentials should be set via environment variables or Firebase Secrets
# Do NOT hardcode credentials in source code
# Set these environment variables before running:
# REDIS_API_KEY=<your-api-key>
# REDIS_HOST=redis-13848.c253.us-central1-1.gce.redns.redis-cloud.com
# REDIS_PORT=13848
# REDIS_USERNAME=default

if not os.environ.get("REDIS_API_KEY"):
    logger.error("REDIS_API_KEY environment variable not set")
    logger.error("Please set REDIS_API_KEY before running this test")
    sys.exit(1)

# Add the app directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.service.config import LocalSettings
from app.service.redis_client import test_redis_connection, RedisCloudClient

def main():
    """Test Redis connection."""
    logger.info("Testing Redis Cloud connection...")
    
    # Create settings with Redis configuration
    settings = LocalSettings()
    
    # Test connection
    if test_redis_connection(settings):
        logger.info("✅ Redis connection test PASSED")
        
        # Additional test with direct client
        client = RedisCloudClient(settings)
        redis_client = client.get_client()
        
        # Test some operations
        test_key = "olorin:test:manual"
        test_value = "Hello from Olorin!"
        
        logger.info(f"Setting test key: {test_key}")
        client.set(test_key, test_value, ex=60)
        
        logger.info(f"Getting test key: {test_key}")
        retrieved = client.get(test_key)
        logger.info(f"Retrieved value: {retrieved}")
        
        if retrieved == test_value:
            logger.info("✅ Manual test PASSED")
        else:
            logger.error("❌ Manual test FAILED - values don't match")
        
        # Clean up
        client.delete(test_key)
        client.close()
        
        return 0
    else:
        logger.error("❌ Redis connection test FAILED")
        return 1

if __name__ == "__main__":
    sys.exit(main())