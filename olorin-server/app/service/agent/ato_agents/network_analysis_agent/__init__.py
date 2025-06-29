"""Network Analysis Agent package."""

from app.service.agent.ato_agents.clients.kk_dash_client import KKDashClient
from app.service.agent.tools.oii_tool.oii_tool import OIITool
from app.service.agent.tools.splunk_tool.splunk_tool import SplunkQueryTool

from .agent import NetworkAnalysisAgentImpl

__all__ = ["NetworkAnalysisAgentImpl", "OIITool", "KKDashClient"]


class NetworkAnalysisAgentImpl:
    def __init__(self):
        self.splunk_tool = SplunkQueryTool()
