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

    print("✅ Tools initialized successfully!")

    # Get summary of available tools
    summary = tool_registry.get_tools_summary()
    print(f"📊 Available tools: {summary['total_tools']}")

    for category, info in summary["categories"].items():
        print(f"  {category}: {info['count']} tools")
        for tool in info["tools"]:
            print(f"    - {tool['name']}: {tool['description'][:60]}...")


def get_tools_for_different_agent_types():
    """Examples of how to get tools for different types of agents."""

    # 1. Research Agent - needs web search and file capabilities
    research_tools = get_tools_for_agent(
        categories=["web", "file_system"],
        tool_names=["database_query"],  # Plus specific database access
    )
    print(f"🔍 Research Agent Tools: {[t.name for t in research_tools]}")

    # 2. API Integration Agent - needs API and database tools
    api_agent_tools = get_tools_for_agent(categories=["api", "database"])
    print(f"🔌 API Agent Tools: {[t.name for t in api_agent_tools]}")

    # 3. Data Analysis Agent - needs database, file, and search tools
    data_analysis_tools = get_tools_for_agent(
        categories=["database", "file_system", "search"]
    )
    print(f"📊 Data Analysis Tools: {[t.name for t in data_analysis_tools]}")

    # 4. General Purpose Agent - essential tools only
    general_tools = get_essential_tools()
    print(f"🛠️ General Purpose Tools: {[t.name for t in general_tools]}")


async def tool_usage_examples():
    """Examples of using individual tools."""

    # Web Search Example
    web_search = tool_registry.get_tool("web_search")
    if web_search:
        print("\n🌐 Web Search Example:")
        result = await web_search._arun(query="LangGraph tutorial", num_results=3)
        print(f"Found {result.get('num_results', 0)} results")

        if result.get("success") and result.get("results"):
            for i, item in enumerate(result["results"][:2], 1):
                print(f"  {i}. {item.get('title', 'No title')}")
                print(f"     {item.get('url', 'No URL')}")

    # File System Example
    file_read = tool_registry.get_tool("file_read")
    if file_read:
        print("\n📁 File Read Example:")
        # This would read a file if it exists
        result = await file_read._arun(file_path="example.txt", max_size=1000)
        if result.get("success"):
            print(f"File content: {result.get('content', '')[:100]}...")
        else:
            print(f"Error: {result.get('error')}")

    # HTTP Request Example
    http_tool = tool_registry.get_tool("http_request")
    if http_tool:
        print("\n🌍 HTTP Request Example:")
        result = await http_tool._arun(url="https://httpbin.org/json", method="GET")
        if result.get("success"):
            print(f"Response status: {result.get('status_code')}")
            print(f"Response data type: {type(result.get('data'))}")
        else:
            print(f"Error: {result.get('error')}")


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

        print("🤖 LangGraph Agent created with tools:")
        for tool in tools:
            print(f"  - {tool.name}: {tool.description[:50]}...")

        return app

    except ImportError as e:
        print(f"⚠️ Cannot create LangGraph agent: {e}")
        print("Install required packages: pip install langgraph langchain-openai")
        return None


def database_tool_examples():
    """Examples of using database tools."""

    db_tools = get_database_tools()
    if not db_tools:
        print("⚠️ Database tools not available (connection string not provided)")
        return

    print("\n🗄️ Database Tool Examples:")

    # Schema inspection example
    schema_tool = tool_registry.get_tool("database_schema")
    if schema_tool:
        print("Example schema query:")
        print("  result = schema_tool._run()")
        print("  # Returns all tables and their columns")

    # Query example
    query_tool = tool_registry.get_tool("database_query")
    if query_tool:
        print("Example database query:")
        print("  result = query_tool._run(")
        print("    query='SELECT * FROM users WHERE age > :min_age',")
        print("    parameters={'min_age': 18},")
        print("    limit=10")
        print("  )")


def web_scraping_examples():
    """Examples of web scraping and search."""

    print("\n🕷️ Web Scraping Examples:")

    # Web search
    print("1. Search for information:")
    print("   search_tool._run(")
    print("     query='Python web scraping tutorial',")
    print("     num_results=5")
    print("   )")

    # Web scraping
    print("2. Scrape a specific page:")
    print("   scrape_tool._run(")
    print("     url='https://example.com/article',")
    print("     extract_links=True,")
    print("     max_length=5000")
    print("   )")


def file_system_examples():
    """Examples of file system operations."""

    print("\n📂 File System Examples:")

    print("1. List directory contents:")
    print("   list_tool._run(")
    print("     directory_path='/path/to/dir',")
    print("     pattern='*.py',")
    print("     recursive=True")
    print("   )")

    print("2. Search for text in files:")
    print("   search_tool._run(")
    print("     search_path='/path/to/search',")
    print("     search_term='function definition',")
    print("     file_pattern='*.py',")
    print("     max_results=20")
    print("   )")

    print("3. Read configuration file:")
    print("   read_tool._run(")
    print("     file_path='config.json',")
    print("     encoding='utf-8',")
    print("     max_size=10000")
    print("   )")


def api_integration_examples():
    """Examples of API integration."""

    print("\n🔌 API Integration Examples:")

    print("1. Generic HTTP request:")
    print("   http_tool._run(")
    print("     url='https://api.example.com/data',")
    print("     method='POST',")
    print("     headers={'Authorization': 'Bearer token'},")
    print("     data={'key': 'value'}")
    print("   )")

    print("2. JSON API with authentication:")
    print("   api_tool._run(")
    print("     base_url='https://api.service.com',")
    print("     endpoint='/v1/users',")
    print("     method='GET',")
    print("     auth_token='your-bearer-token',")
    print("     query_params={'limit': 10}")
    print("   )")


def main():
    """Run all examples."""
    print("🚀 LangChain Tools for LangGraph Agents - Examples\n")

    print("=" * 60)
    print("1. TOOL SETUP")
    print("=" * 60)
    setup_tools_example()

    print("\n" + "=" * 60)
    print("2. AGENT-SPECIFIC TOOL SELECTION")
    print("=" * 60)
    get_tools_for_different_agent_types()

    print("\n" + "=" * 60)
    print("3. LANGGRAPH INTEGRATION")
    print("=" * 60)
    create_langgraph_agent_with_tools()

    print("\n" + "=" * 60)
    print("4. TOOL USAGE EXAMPLES")
    print("=" * 60)
    database_tool_examples()
    web_scraping_examples()
    file_system_examples()
    api_integration_examples()

    print("\n" + "=" * 60)
    print("5. ASYNC TOOL USAGE")
    print("=" * 60)
    print("Run the following to test async tools:")
    print("  asyncio.run(tool_usage_examples())")


if __name__ == "__main__":
    main()

    # Uncomment to run async examples
    # asyncio.run(tool_usage_examples())
