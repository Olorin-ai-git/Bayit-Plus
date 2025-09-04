"""Network Analysis Agent implementation."""

import json
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from agents import Agent
from app.service.agent.tools.splunk_tool.splunk_tool import SplunkQueryTool

from ..clients.databricks_client import DatabricksClient
from ..clients.splunk_client import SplunkClient
from ..clients.tmx_client import TMXClient
from ..interfaces import NetworkAnalysisAgent, NetworkInfo, RiskAssessment
from ..utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class NetworkContext:
    tmx_client: TMXClient
    splunk_client: SplunkClient
    databricks_client: DatabricksClient
    config: Dict[str, Any]


class NetworkAnalysisAgentImpl(Agent[NetworkContext]):
    """Implementation of NetworkAnalysisAgent."""

    def __init__(
        self,
        tmx_client: TMXClient,
        databricks_client: DatabricksClient,
        config: Dict[str, Any],
    ):
        self.tmx_client = tmx_client
        self.databricks_client = databricks_client
        self.config = config

        self.splunk_tool = SplunkQueryTool()

        # Configure thresholds
        self.vpn_risk_threshold = config.get("vpn_risk_threshold", 0.7)
        self.proxy_risk_threshold = config.get("proxy_risk_threshold", 0.8)
        self.ip_change_threshold = config.get("ip_change_threshold", 5)


        super().__init__(
            name="NetworkAnalysisAgent",
            instructions="""I am a network analysis agent that can help you analyze network patterns and detect anomalies.
            I can:
            1. Get current network information
            2. Analyze network patterns over time
            3. Detect network anomalies
            4. Monitor VPN and proxy usage
            5. Track IP address changes
            
            When analyzing network data:
            1. Check for suspicious VPN/proxy usage
            2. Monitor rapid IP address changes
            3. Analyze network traffic patterns
            4. Identify potential network-based attacks""",
            model="gpt-4",
            handoffs=[],  # This agent doesn't need to hand off to other agents
        )

    def _validate_user_id(self, user_id: str) -> None:
        if not user_id or not user_id.strip():
            raise ValueError("User ID cannot be empty")
        if not re.match(r"^[a-zA-Z0-9_]+$", user_id):
            raise ValueError("User ID contains invalid characters")

    async def initialize(self) -> None:
        logger.info("Initializing NetworkAnalysisAgent...")
        await self.tmx_client.connect()
        await self.databricks_client.connect()
        logger.info("NetworkAnalysisAgent initialized successfully")

    async def shutdown(self) -> None:
        """Clean up connections."""
        logger.info("Shutting down NetworkAnalysisAgent...")
        await self.tmx_client.disconnect()
        await self.databricks_client.disconnect()
        logger.info("NetworkAnalysisAgent shut down successfully")

    # 1. What networks does the customer use?
    async def get_networks_used(self, user_id: str) -> List[Dict[str, Any]]:
        """Get the networks used by a customer."""
        logger.info(f"Getting current network info for user_id: {user_id}")
        self._validate_user_id(user_id)
        # TODO: Implement device data retrieval
        device_data = []
        # TODO: Add Databricks for PYs
        return device_data

    # 2. Does the customer use the same IP address?
    async def get_ip_address_usage(self, user_id: str) -> Dict[str, Any]:
        self._validate_user_id(user_id)
        # TODO: Implement device data retrieval
        device_data = []
        ip_addresses = set()
        for device in device_data:
            ip = device.get("TRUE_IP") or device.get("INPUT_IP_ADDRESS")
            if ip:
                ip_addresses.add(ip)
        # TODO: Add Databricks for PYs
        return {
            "unique_ip_addresses": list(ip_addresses),
            "ip_count": len(ip_addresses),
        }

    # 3. Does the customer use the same ISP?
    async def get_isp_usage(self, user_id: str) -> Dict[str, Any]:
        self._validate_user_id(user_id)
        # TODO: Implement device data retrieval
        device_data = []
        isps = set()
        for device in device_data:
            isp = device.get("TRUE_ISP") or device.get("INPUT_ISP")
            if isp:
                isps.add(isp)
        # TODO: Add Databricks for PYs
        return {
            "unique_isps": list(isps),
            "isp_count": len(isps),
        }

    # 4. Does the customer use a VPN or proxy?
    async def get_vpn_proxy_usage(self, user_id: str) -> Dict[str, Any]:
        self._validate_user_id(user_id)
        spl_query = (
            f'index=fraudprevention sourcetype=kk_investigation olorin_userid="{user_id}" '
            '| rex field=smartId "(smartId=(?<smartId>.+))" '
            '| rex field=proxyType "(proxyType=(?<proxyType>.+))" '
            '| rex field=dnsIpGeo "(dnsIpGeo=(?<dnsIpGeo>.+))" '
            "| eval smartId=urldecode(smartId) "
            "| eval proxyType=urldecode(proxyType) "
            "| eval dnsIpGeo=urldecode(dnsIpGeo) "
            "| table smartId, proxyType, dnsIpGeo, _time"
        )
        proxy_results = await self.splunk_tool.arun({"query": spl_query})
        return {
            "proxy_results": proxy_results.get("results", []) if proxy_results else []
        }

    # Example: OII Tool integration (if needed for network context)
    async def _get_oii_location_info(self, user_id: str) -> dict:
        # Placeholder for network info
        # In production, this would fetch from actual network services
        network_info = {}
        location_info = (
            oii_result.get("data", {})
            .get("account", {})
            .get("accountProfile", {})
            .get("personInfo", {})
            .get("contactInfo", {})
        )
        return location_info

    # Example: Get device data (KKDash)
    async def get_device_data(self, user_id: str) -> List[Dict[str, Any]]:
        # TODO: Implement device data retrieval
        device_data = []
        return device_data

    # ... (other methods as needed, e.g., analyze_network_patterns, detect_network_anomalies, etc.) ...
