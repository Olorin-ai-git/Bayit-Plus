"""Shodan Search Tool for discovering infrastructure across the internet."""

import json
import logging
from typing import Any, Dict, List, Optional

from langchain.tools import BaseTool
from pydantic import BaseModel, Field, validator

from .models import ShodanSearchResponse
from .shodan_client import ShodanClient


logger = logging.getLogger(__name__)


class ShodanSearchInput(BaseModel):
    """Input schema for Shodan search."""
    
    query: str = Field(
        ...,
        description="Shodan search query (e.g., 'apache', 'port:22', 'country:US')"
    )
    facets: Optional[str] = Field(
        None,
        description="Comma-separated facets to return (e.g., 'country,port,org')"
    )
    page: int = Field(
        default=1,
        description="Page number for pagination"
    )
    
    @validator('page')
    def validate_page(cls, v):
        """Validate page number."""
        if v < 1:
            raise ValueError("Page number must be 1 or greater")
        return v


class ShodanSearchTool(BaseTool):
    """Shodan search tool for discovering internet-connected infrastructure."""
    
    name: str = "shodan_search"
    description: str = (
        "Search for internet-connected devices and infrastructure using Shodan. "
        "Find hosts by service, port, country, organization, or custom queries. "
        "Useful for discovering related infrastructure, identifying attack patterns, "
        "and investigating fraud networks. Supports Shodan query syntax."
    )
    args_schema: type = ShodanSearchInput
    
    def __init__(self):
        """Initialize the Shodan search tool."""
        super().__init__()
        self._client: Optional[ShodanClient] = None
    
    @property
    def client(self) -> ShodanClient:
        """Get or create Shodan client instance."""
        if self._client is None:
            self._client = ShodanClient()
        return self._client
    
    def _run(self, **kwargs) -> str:
        """Execute search synchronously."""
        import asyncio
        return asyncio.run(self._arun(**kwargs))
    
    async def _arun(
        self,
        query: str,
        facets: Optional[str] = None,
        page: int = 1,
        **kwargs
    ) -> str:
        """Execute search asynchronously."""
        try:
            # Perform search
            search_results = await self.client.search(
                query=query,
                facets=facets,
                page=page,
                minify=True
            )
            
            # Build analysis result
            analysis_result = await self._build_search_analysis(
                search_results=search_results,
                query=query,
                page=page
            )
            
            return json.dumps(analysis_result, indent=2, default=str)
            
        except Exception as e:
            error_msg = f"Shodan search failed for query '{query}': {str(e)}"
            logger.error(error_msg, exc_info=True)
            return json.dumps({
                "error": error_msg,
                "query": query,
                "source": "Shodan"
            }, indent=2)
    
    async def _build_search_analysis(
        self,
        search_results: ShodanSearchResponse,
        query: str,
        page: int
    ) -> Dict[str, Any]:
        """Build comprehensive search analysis result."""
        
        result = {
            "search_analysis": {
                "query": query,
                "total_results": search_results.total,
                "page": page,
                "results_on_page": len(search_results.matches),
                "source": "Shodan"
            }
        }
        
        # Add top results summary
        if search_results.matches:
            result["search_analysis"]["top_results"] = []
            for match in search_results.matches[:10]:  # Top 10 results
                result_summary = {
                    "ip": match.ip_str,
                    "port": match.port,
                    "organization": match.org,
                    "product": match.product,
                    "version": match.version
                }
                
                # Add location if available
                if match.location:
                    result_summary["location"] = {
                        "country": match.location.country_name or match.location.country_code,
                        "city": match.location.city
                    }
                
                # Add snippet of banner data
                if match.data:
                    result_summary["banner_excerpt"] = match.data[:100]
                
                result["search_analysis"]["top_results"].append(result_summary)
        
        # Add unique IPs and organizations
        result["search_analysis"]["unique_ips"] = search_results.unique_ips[:20]
        result["search_analysis"]["unique_organizations"] = search_results.unique_organizations[:10]
        
        # Add port distribution
        if search_results.port_distribution:
            result["search_analysis"]["port_distribution"] = dict(
                list(search_results.port_distribution.items())[:10]
            )
        
        # Add country distribution
        if search_results.country_distribution:
            result["search_analysis"]["country_distribution"] = dict(
                list(search_results.country_distribution.items())[:10]
            )
        
        # Add facet results if available
        if search_results.facets:
            result["search_analysis"]["facets"] = {}
            for facet_name, facet_data in search_results.facets.items():
                if facet_data and isinstance(facet_data, list):
                    result["search_analysis"]["facets"][facet_name] = facet_data[:5]
        
        # Add investigation recommendations
        result["investigation_recommendations"] = self._generate_search_recommendations(
            search_results, query
        )
        
        return result
    
    def _generate_search_recommendations(
        self,
        search_results: ShodanSearchResponse,
        query: str
    ) -> List[str]:
        """Generate recommendations based on search results."""
        recommendations = []
        
        if search_results.total > 100:
            recommendations.append(
                f"Large number of results ({search_results.total}). Consider refining search with additional filters."
            )
        
        if search_results.unique_organizations:
            recommendations.append(
                f"Found {len(search_results.unique_organizations)} unique organizations. "
                "Investigate common patterns across organizations."
            )
        
        # Port-specific recommendations
        port_dist = search_results.port_distribution
        if port_dist:
            critical_ports = {22, 3389, 1433, 3306, 27017, 6379}
            exposed_critical = [p for p in port_dist.keys() if p in critical_ports]
            if exposed_critical:
                recommendations.append(
                    f"Critical services exposed on ports: {exposed_critical}. "
                    "High risk for unauthorized access."
                )
        
        # Country distribution recommendations
        if search_results.country_distribution:
            top_countries = list(search_results.country_distribution.keys())[:3]
            recommendations.append(
                f"Infrastructure concentrated in: {', '.join(top_countries)}. "
                "Check if geographic distribution aligns with legitimate operations."
            )
        
        # General recommendations
        recommendations.extend([
            "Analyze banner data for version information and vulnerabilities",
            "Cross-reference IPs with threat intelligence databases",
            "Investigate any unexpected or suspicious infrastructure"
        ])
        
        return recommendations[:7]  # Limit to 7 recommendations