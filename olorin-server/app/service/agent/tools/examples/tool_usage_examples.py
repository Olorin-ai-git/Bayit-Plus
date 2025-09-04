from app.service.logging import get_bridge_logger
logger = get_bridge_logger(__name__)

"""
Examples of how to use LangChain tools with LangGraph agents.

This file demonstrates various usage patterns and best practices for integrating
the available tools into your LangGraph agent workflows.
"""

import asyncio
from typing import Any, Dict, List

from langchain_core.tools import BaseTool

# Import the tool registry
from ..tool_registry import (
    get_api_tools,
    get_database_tools,
    get_essential_tools,
    get_file_system_tools,
    get_tools_for_agent,
    get_web_tools,
    initialize_tools,
    tool_registry,
)


def setup_tools_example():
    """Example of how to set up tools for your agents."""

    # Initialize tools with configuration
    initialize_tools(
        # Database configuration (optional)
        database_connection_string="sqlite:///example.db",
        # Web search configuration (optional)
        web_search_user_agent="MyApp/1.0 (contact@myapp.com)",
        # File system configuration (optional - restricts access to specific directory)
        file_system_base_path="/allowed/path",
        # API configuration (optional)
        api_default_headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    )

    logger.info("✅ Tools initialized successfully!")

    # Get summary of available tools
    summary = tool_registry.get_tools_summary()
    logger.info(f"📊 Available tools: {summary['total_tools']}")

    for category, info in summary["categories"].items():
        logger.info(f"  {category}: {info['count']} tools")
        for tool in info["tools"]:
            logger.info(f"    - {tool['name']}: {tool['description'][:60]}...")


def get_tools_for_different_agent_types():
    """Examples of how to get tools for different types of agents."""

    # 1. Research Agent - needs web search and file capabilities
    research_tools = get_tools_for_agent(
        categories=["web", "file_system"],
        tool_names=["database_query"],  # Plus specific database access
    )
    logger.info(f"🔍 Research Agent Tools: {[t.name for t in research_tools]}")

    # 2. API Integration Agent - needs API and database tools
    api_agent_tools = get_tools_for_agent(categories=["api", "database"])
    logger.info(f"🔌 API Agent Tools: {[t.name for t in api_agent_tools]}")

    # 3. Data Analysis Agent - needs database, file, and search tools
    data_analysis_tools = get_tools_for_agent(
        categories=["database", "file_system", "search"]
    )
    logger.info(f"📊 Data Analysis Tools: {[t.name for t in data_analysis_tools]}")

    # 4. General Purpose Agent - essential tools only
    general_tools = get_essential_tools()
    logger.info(f"🛠️ General Purpose Tools: {[t.name for t in general_tools]}")


async def tool_usage_examples():
    """Examples of using individual tools."""

    # Web Search Example
    web_search = tool_registry.get_tool("web_search")
    if web_search:
        logger.info("\n🌐 Web Search Example:")
        result = await web_search._arun(query="LangGraph tutorial", num_results=3)
        logger.info(f"Found {result.get('num_results', 0)} results")

        if result.get("success") and result.get("results"):
            for i, item in enumerate(result["results"][:2], 1):
                logger.info(f"  {i}. {item.get('title', 'No title')}")
                logger.info(f"     {item.get('url', 'No URL')}")

    # File System Example
    file_read = tool_registry.get_tool("file_read")
    if file_read:
        logger.info("\n📁 File Read Example:")
        # This would read a file if it exists
        result = await file_read._arun(file_path="example.txt", max_size=1000)
        if result.get("success"):
            logger.info(f"File content: {result.get('content', '')[:100]}...")
        else:
            logger.error(f"Error: {result.get('error')}")

    # HTTP Request Example
    http_tool = tool_registry.get_tool("http_request")
    if http_tool:
        logger.info("\n🌍 HTTP Request Example:")
        result = await http_tool._arun(url="https://httpbin.org/json", method="GET")
        if result.get("success"):
            logger.info(f"Response status: {result.get('status_code')}")
            logger.info(f"Response data type: {type(result.get('data'))}")
        else:
            logger.error(f"Error: {result.get('error')}")


def create_langgraph_agent_with_tools():
    """Example of how to create a LangGraph agent with tools."""

    try:
        from langchain_core.messages import AIMessage, HumanMessage
        from langchain_openai import ChatOpenAI
        from langgraph import StateGraph

        # Get tools for the agent
        tools = get_tools_for_agent(
            categories=["web", "api"], tool_names=["file_read", "directory_list"]
        )

        # Create LLM with tools
        llm = ChatOpenAI(model="gpt-4o-mini")
        llm_with_tools = llm.bind_tools(tools)

        # Define agent state
        class AgentState:
            messages: List[Dict[str, Any]]

        # Define agent node
        def agent_node(state: AgentState):
            messages = state["messages"]
            response = llm_with_tools.invoke(messages)
            return {"messages": messages + [response]}

        # Create graph
        graph = StateGraph(AgentState)
        graph.add_node("agent", agent_node)
        graph.set_entry_point("agent")
        graph.set_finish_point("agent")

        # Compile graph
        app = graph.compile()

        logger.info("🤖 LangGraph Agent created with tools:")
        for tool in tools:
            logger.info(f"  - {tool.name}: {tool.description[:50]}...")

        return app

    except ImportError as e:
        logger.info(f"⚠️ Cannot create LangGraph agent: {e}")
        logger.info("Install required packages: pip install langgraph langchain-openai")
        return None


def database_tool_examples():
    """Examples of using database tools."""

    db_tools = get_database_tools()
    if not db_tools:
        logger.info("⚠️ Database tools not available (connection string not provided)")
        return

    logger.info("\n🗄️ Database Tool Examples:")

    # Schema inspection example
    schema_tool = tool_registry.get_tool("database_schema")
    if schema_tool:
        logger.info("Example schema query:")
        logger.info("  result = schema_tool._run()")
        logger.info("  # Returns all tables and their columns")

    # Query example
    query_tool = tool_registry.get_tool("database_query")
    if query_tool:
        logger.info("Example database query:")
        logger.info("  result = query_tool._run(")
        logger.info("    query='SELECT * FROM users WHERE age > :min_age',")
        logger.info("    parameters={'min_age': 18},")
        logger.info("    limit=10")
        logger.info("  )")


def web_scraping_examples():
    """Examples of web scraping and search."""

    logger.info("\n🕷️ Web Scraping Examples:")

    # Web search
    logger.info("1. Search for information:")
    logger.info("   search_tool._run(")
    logger.info("     query='Python web scraping tutorial',")
    logger.info("     num_results=5")
    logger.info("   )")

    # Web scraping
    logger.info("2. Scrape a specific page:")
    logger.info("   scrape_tool._run(")
    logger.info("     url='https://example.com/article',")
    logger.info("     extract_links=True,")
    logger.info("     max_length=5000")
    logger.info("   )")


def file_system_examples():
    """Examples of file system operations."""

    logger.info("\n📂 File System Examples:")

    logger.info("1. List directory contents:")
    logger.info("   list_tool._run(")
    logger.info("     directory_path='/path/to/dir',")
    logger.info("     pattern='*.py',")
    logger.info("     recursive=True")
    logger.info("   )")

    logger.info("2. Search for text in files:")
    logger.info("   search_tool._run(")
    logger.info("     search_path='/path/to/search',")
    logger.info("     search_term='function definition',")
    logger.info("     file_pattern='*.py',")
    logger.info("     max_results=20")
    logger.info("   )")

    logger.info("3. Read configuration file:")
    logger.info("   read_tool._run(")
    logger.info("     file_path='config.json',")
    logger.info("     encoding='utf-8',")
    logger.info("     max_size=10000")
    logger.info("   )")


def api_integration_examples():
    """Examples of API integration."""

    logger.info("\n🔌 API Integration Examples:")

    logger.info("1. Generic HTTP request:")
    logger.info("   http_tool._run(")
    logger.info("     url='https://api.example.com/data',")
    logger.info("     method='POST',")
    logger.info("     headers={'Authorization': 'Bearer token'},")
    logger.info("     data={'key': 'value'}")
    logger.info("   )")

    logger.info("2. JSON API with authentication:")
    logger.info("   api_tool._run(")
    logger.info("     base_url='https://api.service.com',")
    logger.info("     endpoint='/v1/users',")
    logger.info("     method='GET',")
    logger.info("     auth_token='your-bearer-token',")
    logger.info("     query_params={'limit': 10}")
    logger.info("   )")


def main():
    """Run all examples."""
    logger.info("🚀 LangChain Tools for LangGraph Agents - Examples\n")

    logger.info("=" * 60)
    logger.info("1. TOOL SETUP")
    logger.info("=" * 60)
    setup_tools_example()

    logger.info("\n" + "=" * 60)
    logger.info("2. AGENT-SPECIFIC TOOL SELECTION")
    logger.info("=" * 60)
    get_tools_for_different_agent_types()

    logger.info("\n" + "=" * 60)
    logger.info("3. LANGGRAPH INTEGRATION")
    logger.info("=" * 60)
    create_langgraph_agent_with_tools()

    logger.info("\n" + "=" * 60)
    logger.info("4. TOOL USAGE EXAMPLES")
    logger.info("=" * 60)
    database_tool_examples()
    web_scraping_examples()
    file_system_examples()
    api_integration_examples()

    logger.info("\n" + "=" * 60)
    logger.info("5. ASYNC TOOL USAGE")
    logger.info("=" * 60)
    logger.info("Run the following to test async tools:")
    logger.info("  asyncio.run(tool_usage_examples())")


if __name__ == "__main__":
    main()

    # Uncomment to run async examples
    # asyncio.run(tool_usage_examples())
