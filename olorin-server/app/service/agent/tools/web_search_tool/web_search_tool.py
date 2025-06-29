"""Web search and scraping tools for LangGraph agents."""

import logging
import re
import requests
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin, urlparse
import time

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field
from bs4 import BeautifulSoup, NavigableString
import html2text

logger = logging.getLogger(__name__)


class _WebSearchArgs(BaseModel):
    """Arguments for the web search tool."""
    
    query: str = Field(
        ..., 
        description="Search query to find relevant web pages"
    )
    num_results: int = Field(
        default=10,
        description="Number of search results to return (1-20)"
    )
    search_engine: str = Field(
        default="duckduckgo",
        description="Search engine to use: 'duckduckgo', 'google', 'bing'"
    )


class WebSearchTool(BaseTool):
    """
    LangChain tool for searching the web and getting relevant results.
    
    Uses multiple search engines to find information on the web.
    """
    
    name: str = "web_search"
    description: str = (
        "Search the web for information using various search engines. "
        "Returns a list of relevant web pages with titles, URLs, and snippets. "
        "Useful for finding current information, news, documentation, and facts."
    )
    args_schema: type[BaseModel] = _WebSearchArgs
    
    def __init__(self, user_agent: Optional[str] = None, **kwargs):
        """Initialize with optional user agent."""
        super().__init__(**kwargs)
        self._user_agent = user_agent or "Mozilla/5.0 (LangGraph Agent)"
        self._session = requests.Session()
        self._session.headers.update({"User-Agent": self._user_agent})
    
    def _search_duckduckgo(self, query: str, num_results: int) -> List[Dict[str, Any]]:
        """Search using DuckDuckGo."""
        try:
            # DuckDuckGo instant answer API
            url = "https://api.duckduckgo.com/"
            params = {
                "q": query,
                "format": "json",
                "no_redirect": "1",
                "no_html": "1",
                "skip_disambig": "1"
            }
            
            response = self._session.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            results = []
            
            # Add abstract if available
            if data.get("Abstract"):
                results.append({
                    "title": data.get("AbstractText", "")[:100],
                    "url": data.get("AbstractURL", ""),
                    "snippet": data.get("Abstract", ""),
                    "source": "DuckDuckGo Abstract"
                })
            
            # Add related topics
            for topic in data.get("RelatedTopics", [])[:num_results]:
                if isinstance(topic, dict) and "Text" in topic:
                    results.append({
                        "title": topic.get("Text", "")[:100],
                        "url": topic.get("FirstURL", ""),
                        "snippet": topic.get("Text", ""),
                        "source": "DuckDuckGo Related"
                    })
            
            return results[:num_results]
            
        except Exception as e:
            logger.error(f"DuckDuckGo search error: {e}")
            return []
    
    def _search_fallback(self, query: str, num_results: int) -> List[Dict[str, Any]]:
        """Fallback search using a simple web scraping approach."""
        try:
            # This is a simplified fallback - in production you'd use proper search APIs
            search_url = f"https://www.google.com/search?q={requests.utils.quote(query)}&num={num_results}"
            
            response = self._session.get(search_url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            results = []
            
            # Extract search results (simplified)
            for item in soup.find_all('div', class_='g')[:num_results]:
                title_elem = item.find('h3')
                link_elem = item.find('a')
                snippet_elem = item.find('span', {'data-ved': True})
                
                if title_elem and link_elem:
                    title = title_elem.get_text()
                    url = link_elem.get('href', '')
                    snippet = snippet_elem.get_text() if snippet_elem else ""
                    
                    if url.startswith('/url?q='):
                        url = url.split('/url?q=')[1].split('&')[0]
                    
                    results.append({
                        "title": title,
                        "url": url,
                        "snippet": snippet,
                        "source": "Web Search"
                    })
            
            return results
            
        except Exception as e:
            logger.error(f"Fallback search error: {e}")
            return []
    
    def _run(
        self, 
        query: str, 
        num_results: int = 10,
        search_engine: str = "duckduckgo"
    ) -> Dict[str, Any]:
        """Execute the web search."""
        try:
            num_results = min(max(num_results, 1), 20)  # Limit between 1-20
            
            if search_engine.lower() == "duckduckgo":
                results = self._search_duckduckgo(query, num_results)
            else:
                results = self._search_fallback(query, num_results)
            
            # If no results, try fallback
            if not results:
                results = self._search_fallback(query, num_results)
            
            return {
                "success": True,
                "query": query,
                "num_results": len(results),
                "results": results,
                "search_engine": search_engine
            }
            
        except Exception as e:
            logger.error(f"Web search error: {e}")
            return {
                "success": False,
                "error": str(e),
                "query": query
            }
    
    async def _arun(
        self, 
        query: str, 
        num_results: int = 10,
        search_engine: str = "duckduckgo"
    ) -> Dict[str, Any]:
        """Async version of web search."""
        return self._run(query, num_results, search_engine)


class _WebScrapeArgs(BaseModel):
    """Arguments for the web scrape tool."""
    
    url: str = Field(
        ..., 
        description="URL of the web page to scrape"
    )
    extract_links: bool = Field(
        default=False,
        description="Whether to extract all links from the page"
    )
    max_length: int = Field(
        default=5000,
        description="Maximum length of extracted text"
    )


class WebScrapeTool(BaseTool):
    """
    LangChain tool for scraping web pages and extracting content.
    
    Can extract text, links, and other structured data from web pages.
    """
    
    name: str = "web_scrape"
    description: str = (
        "Scrape content from web pages. "
        "Extracts clean text, titles, and optionally links from HTML pages. "
        "Useful for getting detailed information from specific web pages."
    )
    args_schema: type[BaseModel] = _WebScrapeArgs
    
    def __init__(self, user_agent: Optional[str] = None, **kwargs):
        """Initialize with optional user agent."""
        super().__init__(**kwargs)
        self._user_agent = user_agent or "Mozilla/5.0 (LangGraph Agent)"
        self._session = requests.Session()
        self._session.headers.update({"User-Agent": self._user_agent})
        self._html_converter = html2text.HTML2Text()
        self._html_converter.ignore_links = False
        self._html_converter.ignore_images = True
    
    def _extract_text(self, soup: BeautifulSoup) -> str:
        """Extract clean text from BeautifulSoup object."""
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.decompose()
        
        # Get text
        text = soup.get_text()
        
        # Clean up text
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = '\n'.join(chunk for chunk in chunks if chunk)
        
        return text
    
    def _extract_links(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, str]]:
        """Extract all links from the page."""
        links = []
        for link in soup.find_all('a', href=True):
            href = link['href']
            text = link.get_text().strip()
            
            # Convert relative URLs to absolute
            if href.startswith('/'):
                href = urljoin(base_url, href)
            elif not href.startswith(('http://', 'https://')):
                href = urljoin(base_url, href)
            
            if href.startswith(('http://', 'https://')) and text:
                links.append({
                    "url": href,
                    "text": text,
                    "title": link.get('title', '')
                })
        
        return links
    
    def _run(
        self, 
        url: str, 
        extract_links: bool = False,
        max_length: int = 5000
    ) -> Dict[str, Any]:
        """Scrape the web page."""
        try:
            # Validate URL
            parsed_url = urlparse(url)
            if not parsed_url.scheme or not parsed_url.netloc:
                return {
                    "success": False,
                    "error": "Invalid URL format",
                    "url": url
                }
            
            # Make request
            response = self._session.get(url, timeout=10)
            response.raise_for_status()
            
            # Parse HTML
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract title
            title_elem = soup.find('title')
            title = title_elem.get_text().strip() if title_elem else ""
            
            # Extract meta description
            meta_desc = ""
            meta_elem = soup.find('meta', attrs={'name': 'description'})
            if meta_elem:
                meta_desc = meta_elem.get('content', '')
            
            # Extract main content
            text = self._extract_text(soup)
            
            # Truncate if too long
            if len(text) > max_length:
                text = text[:max_length] + "... [truncated]"
            
            result = {
                "success": True,
                "url": url,
                "title": title,
                "meta_description": meta_desc,
                "content": text,
                "content_length": len(text),
                "status_code": response.status_code
            }
            
            # Extract links if requested
            if extract_links:
                links = self._extract_links(soup, url)
                result["links"] = links
                result["links_count"] = len(links)
            
            return result
            
        except requests.RequestException as e:
            logger.error(f"Web scraping request error: {e}")
            return {
                "success": False,
                "error": f"Request error: {str(e)}",
                "url": url
            }
        except Exception as e:
            logger.error(f"Web scraping error: {e}")
            return {
                "success": False,
                "error": str(e),
                "url": url
            }
    
    async def _arun(
        self, 
        url: str, 
        extract_links: bool = False,
        max_length: int = 5000
    ) -> Dict[str, Any]:
        """Async version of web scraping."""
        return self._run(url, extract_links, max_length) 