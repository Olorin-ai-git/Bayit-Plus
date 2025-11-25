from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

"""
Example usage of RawDataNode in LangGraph fraud investigation workflows.

This module demonstrates how to integrate the RawDataNode with existing 
LangGraph orchestration and investigation systems.
"""

import asyncio
from typing import Any, Dict, List

from langchain_core.messages import AIMessage, HumanMessage
from langgraph.graph import END, StateGraph

from app.service.agent.nodes.raw_data_node import MessagesState, RawDataNode
from app.service.agent.orchestration.investigation_coordinator import (
    start_investigation,
)


async def create_raw_data_investigation_graph():
    """
    Create a LangGraph that includes the RawDataNode for CSV processing.

    Returns:
        Compiled LangGraph with raw data processing capabilities
    """
    # Initialize the raw data node
    raw_data_node = RawDataNode(
        batch_size=100,
        enable_anomaly_detection=True,
        quality_threshold=0.7,
        max_file_size_mb=25,
    )

    # Create graph builder
    builder = StateGraph(MessagesState)

    # Add nodes
    builder.add_node("start_investigation", start_investigation)
    builder.add_node("process_raw_data", raw_data_node)
    builder.add_node("generate_report", generate_data_quality_report)

    # Define flow
    builder.set_entry_point("start_investigation")
    builder.add_edge("start_investigation", "process_raw_data")
    builder.add_edge("process_raw_data", "generate_report")
    builder.add_edge("generate_report", END)

    # Compile graph
    return builder.compile()


async def generate_data_quality_report(
    state: MessagesState, config=None
) -> MessagesState:
    """
    Generate a comprehensive data quality report from raw data processing results.

    Args:
        state: Current LangGraph state
        config: Optional configuration

    Returns:
        Updated state with quality report
    """
    messages = state.get("messages", [])

    # Find raw data processing results
    raw_data_results = None
    for message in reversed(messages):
        if isinstance(message, AIMessage):
            additional_kwargs = message.additional_kwargs
            if additional_kwargs.get("node_type") == "raw_data_processing":
                raw_data_results = additional_kwargs.get("raw_data_results")
                break

    if not raw_data_results or not raw_data_results.get("success"):
        report_message = AIMessage(
            content="Unable to generate data quality report: No valid raw data processing results found.",
            additional_kwargs={"node_type": "data_quality_report", "success": False},
        )
    else:
        # Generate comprehensive report
        quality_report = raw_data_results["quality_report"]
        data_count = len(raw_data_results["data"])
        anomalies_count = raw_data_results["anomalies_count"]

        report_content = f"""
Data Quality Assessment Report
==============================

Processing Summary:
- Total Records Processed: {quality_report['total_records']}
- Valid Records: {quality_report['valid_records']}
- Invalid Records: {quality_report['invalid_records']}
- Data Quality Score: {quality_report['quality_score']:.2%}

Data Issues Found:
"""

        if quality_report["data_issues"]:
            for issue_type, issues in quality_report["data_issues"].items():
                report_content += f"- {issue_type}: {len(issues)} issues\n"
        else:
            report_content += "- No data quality issues detected\n"

        report_content += f"""
Anomaly Detection:
- Anomalies Detected: {anomalies_count}
- Processing Time: {quality_report['processing_time']:.3f} seconds

Recommendations:
"""

        # Generate recommendations based on quality score
        if quality_report["quality_score"] < 0.5:
            report_content += "- CRITICAL: Data quality is below acceptable threshold\n"
            report_content += "- Review data collection and validation processes\n"
            report_content += "- Consider data cleansing before analysis\n"
        elif quality_report["quality_score"] < 0.8:
            report_content += "- WARNING: Data quality needs improvement\n"
            report_content += "- Address missing and invalid data points\n"
            report_content += "- Validate data sources and formats\n"
        else:
            report_content += "- GOOD: Data quality meets acceptable standards\n"
            report_content += "- Proceed with fraud analysis\n"

        if anomalies_count > 0:
            report_content += f"- Investigate {anomalies_count} detected anomalies\n"
            report_content += "- Review anomalous transactions for fraud indicators\n"

        report_message = AIMessage(
            content=report_content.strip(),
            additional_kwargs={
                "node_type": "data_quality_report",
                "quality_score": quality_report["quality_score"],
                "total_records": quality_report["total_records"],
                "anomalies_count": anomalies_count,
                "success": True,
            },
        )

    # Update state
    updated_messages = messages + [report_message]
    return {"messages": updated_messages}


async def example_csv_processing_workflow():
    """
    Example workflow demonstrating CSV processing in fraud investigation.

    Returns:
        Results of the investigation workflow
    """
    # Sample transaction data
    sample_csv_data = """transaction_id,amount,timestamp,merchant,user_id,location,card_number
TXN001,1250.00,2024-01-15 14:30:00,Electronics Superstore,USER123,San Francisco,****1234
TXN002,25.99,2024-01-15 14:35:00,Coffee Bean,USER123,San Francisco,****1234
TXN003,89.50,2024-01-15 15:00:00,Gas Station,USER123,Oakland,****1234
TXN004,15000.00,2024-01-15 15:15:00,Jewelry Store,USER456,New York,****5678
TXN005,45.30,2024-01-15 15:20:00,Grocery Store,USER456,New York,****5678
TXN006,-100.00,2024-01-15 15:30:00,Invalid Transaction,USER789,Chicago,****9999
TXN007,500.00,2025-12-31 23:59:59,Future Transaction,USER789,Chicago,****9999"""

    # Create the investigation graph
    graph = await create_raw_data_investigation_graph()

    # Create initial state with CSV data
    initial_state = MessagesState(
        messages=[
            HumanMessage(
                content="Process transaction data for fraud investigation",
                additional_kwargs={
                    "csv_data": sample_csv_data,
                    "filename": "transaction_sample.csv",
                    "investigation_type": "fraud_detection",
                },
            )
        ]
    )

    # Run the workflow
    result = await graph.ainvoke(initial_state)

    return result


# Integration with existing fraud detection agents
async def integrate_with_fraud_agents():
    """
    Example of integrating RawDataNode with existing fraud detection agents.
    """
    from app.service.agent.structured_agents import structured_risk_agent

    # Create enhanced graph with raw data and risk assessment
    builder = StateGraph(MessagesState)

    # Initialize components
    raw_data_node = RawDataNode(enable_anomaly_detection=True, quality_threshold=0.8)

    # Add nodes
    builder.add_node("process_raw_data", raw_data_node)
    builder.add_node("risk_assessment", structured_risk_agent)
    builder.add_node("final_report", generate_investigation_summary)

    # Define flow
    builder.set_entry_point("process_raw_data")
    builder.add_edge("process_raw_data", "risk_assessment")
    builder.add_edge("risk_assessment", "final_report")
    builder.add_edge("final_report", END)

    return builder.compile()


async def generate_investigation_summary(
    state: MessagesState, config=None
) -> MessagesState:
    """Generate final investigation summary combining data quality and risk assessment."""
    messages = state.get("messages", [])

    # Extract results from different phases
    raw_data_results = None
    risk_results = None

    for message in reversed(messages):
        if isinstance(message, AIMessage):
            kwargs = message.additional_kwargs
            if (
                kwargs.get("node_type") == "raw_data_processing"
                and not raw_data_results
            ):
                raw_data_results = kwargs.get("raw_data_results")
            elif "risk" in message.content.lower() and not risk_results:
                risk_results = message.content

    # Generate comprehensive summary
    summary_content = "Fraud Investigation Summary\n" + "=" * 30 + "\n\n"

    if raw_data_results:
        quality_score = raw_data_results["quality_report"]["quality_score"]
        summary_content += f"Data Quality: {quality_score:.1%}\n"
        summary_content += f"Records Processed: {len(raw_data_results['data'])}\n"
        summary_content += (
            f"Anomalies Detected: {raw_data_results['anomalies_count']}\n\n"
        )

    if risk_results:
        summary_content += f"Risk Assessment:\n{risk_results}\n\n"

    summary_content += "Investigation Status: Complete\n"

    summary_message = AIMessage(
        content=summary_content,
        additional_kwargs={"node_type": "investigation_summary", "status": "complete"},
    )

    return {"messages": messages + [summary_message]}


if __name__ == "__main__":
    # Example usage
    async def main():
        logger.info("Running RawDataNode example workflow...")
        result = await example_csv_processing_workflow()

        logger.info("\nWorkflow Results:")
        for message in result["messages"]:
            if isinstance(message, AIMessage):
                logger.info(
                    f"\n--- {message.additional_kwargs.get('node_type', 'Unknown')} ---"
                )
                logger.info(
                    message.content[:500] + "..."
                    if len(message.content) > 500
                    else message.content
                )

    asyncio.run(main())
