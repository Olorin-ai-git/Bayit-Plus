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
        
        # Get device data from TMX and Splunk
        try:
            device_data = await self.tmx_client.get_device_info(user_id)
            if not device_data:
                device_data = []
            
            # Query Splunk for additional network data
            spl_query = (
                f'index=fraudprevention sourcetype=kk_investigation olorin_userid="{user_id}" '
                '| rex field=TRUE_IP "(TRUE_IP=(?<TRUE_IP>.+))" '
                '| rex field=INPUT_IP_ADDRESS "(INPUT_IP_ADDRESS=(?<INPUT_IP_ADDRESS>.+))" '
                '| rex field=TRUE_ISP "(TRUE_ISP=(?<TRUE_ISP>.+))" '
                '| eval TRUE_IP=urldecode(TRUE_IP) '
                '| eval INPUT_IP_ADDRESS=urldecode(INPUT_IP_ADDRESS) '
                '| eval TRUE_ISP=urldecode(TRUE_ISP) '
                '| table TRUE_IP, INPUT_IP_ADDRESS, TRUE_ISP, _time'
            )
            splunk_results = await self.splunk_tool.arun({"query": spl_query})
            
            if splunk_results and splunk_results.get("results"):
                device_data.extend(splunk_results["results"])
                
        except Exception as e:
            logger.debug(f"Error retrieving network data for {user_id}: {str(e)}")
            device_data = []
            
        return device_data

    # 2. Does the customer use the same IP address?
    async def get_ip_address_usage(self, user_id: str) -> Dict[str, Any]:
        self._validate_user_id(user_id)
        
        # Get real device data from available sources
        device_data = await self.get_networks_used(user_id)
        
        ip_addresses = set()
        ip_changes = []
        
        for device in device_data:
            ip = device.get("TRUE_IP") or device.get("INPUT_IP_ADDRESS")
            if ip and ip.strip():
                ip_addresses.add(ip.strip())
                ip_changes.append({
                    "ip": ip.strip(),
                    "timestamp": device.get("_time"),
                    "source": "TRUE_IP" if device.get("TRUE_IP") else "INPUT_IP_ADDRESS"
                })
        
        # Calculate risk score based on IP diversity
        ip_count = len(ip_addresses)
        risk_score = 0.0
        if ip_count > self.ip_change_threshold:
            risk_score = min(0.9, 0.3 + (ip_count / 20.0))
        
        return {
            "unique_ip_addresses": list(ip_addresses),
            "ip_count": ip_count,
            "ip_changes": ip_changes,
            "risk_score": risk_score,
            "risk_level": "HIGH" if risk_score > 0.7 else "MEDIUM" if risk_score > 0.4 else "LOW"
        }

    # 3. Does the customer use the same ISP?
    async def get_isp_usage(self, user_id: str) -> Dict[str, Any]:
        self._validate_user_id(user_id)
        
        # Get real device data from available sources
        device_data = await self.get_networks_used(user_id)
        
        isps = set()
        isp_changes = []
        
        for device in device_data:
            isp = device.get("TRUE_ISP") or device.get("INPUT_ISP")
            if isp and isp.strip():
                isps.add(isp.strip())
                isp_changes.append({
                    "isp": isp.strip(),
                    "timestamp": device.get("_time"),
                    "ip": device.get("TRUE_IP") or device.get("INPUT_IP_ADDRESS")
                })
        
        # Calculate risk score based on ISP diversity
        isp_count = len(isps)
        risk_score = 0.0
        if isp_count > 3:  # More than 3 ISPs is suspicious
            risk_score = min(0.8, 0.2 + (isp_count / 15.0))
        
        return {
            "unique_isps": list(isps),
            "isp_count": isp_count,
            "isp_changes": isp_changes,
            "risk_score": risk_score,
            "risk_level": "HIGH" if risk_score > 0.7 else "MEDIUM" if risk_score > 0.4 else "LOW"
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

    # Get device data from real sources (TMX and Splunk)
    async def get_device_data(self, user_id: str) -> List[Dict[str, Any]]:
        """Get device data from TMX and Splunk sources."""
        try:
            # Get data from TMX client
            device_data = await self.tmx_client.get_device_info(user_id)
            
            if not device_data:
                device_data = []
            
            # Enhance with Splunk data if available
            spl_query = (
                f'index=fraudprevention sourcetype=kk_investigation olorin_userid="{user_id}" '
                '| rex field=device_id "(device_id=(?<device_id>.+))" '
                '| rex field=user_agent "(user_agent=(?<user_agent>.+))" '
                '| eval device_id=urldecode(device_id) '
                '| eval user_agent=urldecode(user_agent) '
                '| table device_id, user_agent, _time'
            )
            
            splunk_results = await self.splunk_tool.arun({"query": spl_query})
            if splunk_results and splunk_results.get("results"):
                device_data.extend(splunk_results["results"])
                
        except Exception as e:
            logger.debug(f"Error retrieving device data for {user_id}: {str(e)}")
            device_data = []
            
        return device_data

    # ... (other methods as needed, e.g., analyze_network_patterns, detect_network_anomalies, etc.) ...
