"""
IP to Domain mapper using Snowflake data.
Maps IP addresses to their associated domains for threat intelligence.
"""

import asyncio
import os
from typing import Any, Dict, Optional

from app.service.agent.tools.snowflake_tool.client import SnowflakeClient
from app.service.agent.tools.snowflake_tool.schema_constants import (
    EMAIL,
    IP,
    get_full_table_name,
    get_required_env_var,
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class IPDomainMapper:
    """Maps IP addresses to domains using Snowflake transaction data."""

    def __init__(self):
        self.client = SnowflakeClient()
        self._cache: Dict[str, str] = {}

    async def get_domain_for_ip(self, ip: str) -> Optional[str]:
        """
        Get the most common domain associated with an IP address.

        Args:
            ip: The IP address to look up

        Returns:
            The domain associated with the IP, or None if not found
        """
        # Check cache first
        if ip in self._cache:
            return self._cache[ip]

        try:
            # Get database and schema from environment - no defaults!
            database = get_required_env_var("SNOWFLAKE_DATABASE")
            schema = get_required_env_var("SNOWFLAKE_SCHEMA")
            await self.client.connect(database=database, schema=schema)

            # Query to find the most common email domain for this IP
            query = f"""
            WITH ip_domains AS (
                SELECT
                    {IP} as ip,
                    {EMAIL} as email,
                    SUBSTRING({EMAIL}, POSITION('@' IN {EMAIL}) + 1) as domain,
                    COUNT(*) as occurrence_count
                FROM {get_full_table_name()}
                WHERE {IP} = '{ip}'
                    AND {EMAIL} IS NOT NULL
                    AND {EMAIL} LIKE '%@%'
                GROUP BY {IP}, {EMAIL}, domain
            )
            SELECT 
                domain,
                SUM(occurrence_count) as total_count
            FROM ip_domains
            GROUP BY domain
            ORDER BY total_count DESC
            LIMIT 1
            """

            # Handle both sync (Snowflake) and async (PostgreSQL) execute_query methods
            import inspect

            if inspect.iscoroutinefunction(self.client.execute_query):
                results = await self.client.execute_query(query)
            else:
                results = self.client.execute_query(query)

            if results and len(results) > 0:
                domain = results[0].get("DOMAIN") or results[0].get("domain")
                if domain:
                    # Cache the result
                    self._cache[ip] = domain
                    logger.info(f"Found domain {domain} for IP {ip}")
                    return domain

            logger.warning(f"No domain found for IP {ip}")
            return None

        except Exception as e:
            logger.error(f"Error getting domain for IP {ip}: {e}")
            return None
        finally:
            try:
                await self.client.disconnect()
            except:
                pass

    async def get_domains_for_ips(self, ip_addresses: list) -> Dict[str, Optional[str]]:
        """
        Get domains for multiple IP addresses.

        Args:
            ip_addresses: List of IP addresses to look up

        Returns:
            Dictionary mapping IP addresses to domains
        """
        results = {}
        for ip in ip_addresses:
            results[ip] = await self.get_domain_for_ip(ip)
        return results


# Global instance
_ip_domain_mapper = None


def get_ip_domain_mapper() -> IPDomainMapper:
    """Get or create the global IP domain mapper instance."""
    global _ip_domain_mapper
    if _ip_domain_mapper is None:
        _ip_domain_mapper = IPDomainMapper()
    return _ip_domain_mapper
