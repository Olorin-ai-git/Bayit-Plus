"""Network Analysis Agent package."""

from app.service.agent.tools.splunk_tool.splunk_tool import SplunkQueryTool

from .agent import NetworkAnalysisAgentImpl

__all__ = ["NetworkAnalysisAgentImpl"]


class NetworkAnalysisAgentImpl:
    def __init__(self):
        self.splunk_tool = SplunkQueryTool()
