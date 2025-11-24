#!/usr/bin/env python3
"""
Investigation Data Processor Example Script

This script demonstrates how to use the InvestigationDataProcessor to extract 
and structure data from investigation folders for HTML report generation.

Usage:
    poetry run python scripts/examples/investigation_data_processor_example.py [folder_path]
    
If no folder_path is provided, the script will discover investigation folders 
in the default logs directory.
"""

import sys
import logging
from pathlib import Path
from typing import List
import json

# Add the app module to the path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "app"))

from service.reporting.investigation_data_processor import (
    InvestigationDataProcessor,
    ProcessedInvestigationData,
    ProcessingStatus,
    create_data_processor,
    process_investigation_folder
)
from service.logging.investigation_folder_manager import get_folder_manager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def discover_investigation_folders() -> List[Path]:
    """Discover available investigation folders"""
    folder_manager = get_folder_manager()
    
    if not folder_manager.base_logs_dir.exists():
        logger.warning(f"Logs directory does not exist: {folder_manager.base_logs_dir}")
        return []
    
    folders = []
    for folder_path in folder_manager.base_logs_dir.iterdir():
        if folder_path.is_dir() and (folder_path / "metadata.json").exists():
            folders.append(folder_path)
    
    return sorted(folders, key=lambda p: p.name)

def print_processing_summary(result: ProcessedInvestigationData):
    """Print a summary of processed investigation data"""
    print("\n" + "="*80)
    print(f"INVESTIGATION DATA PROCESSING SUMMARY")
    print("="*80)
    
    # Basic info
    print(f"Investigation ID: {result.investigation_id}")
    print(f"Mode: {result.mode}")
    print(f"Scenario: {result.scenario}")
    print(f"Status: {result.status}")
    print(f"Processing Status: {result.processing_status.value}")
    
    # Statistics
    print(f"\nDATA STATISTICS:")
    print(f"  Total Interactions: {result.total_interactions}")
    print(f"  LLM Interactions: {len(result.llm_interactions)}")
    print(f"  Tool Executions: {len(result.tool_executions)}")
    print(f"  Agent Decisions: {len(result.agent_decisions)}")
    print(f"  LangGraph Nodes: {len(result.langgraph_nodes)}")
    print(f"  Investigation Phases: {len(result.investigation_phases)}")
    print(f"  Risk Score Entries: {len(result.risk_score_entries)}")
    print(f"  Log Entries: {len(result.log_entries)}")
    
    # Aggregated metrics
    print(f"\nAGGREGATED METRICS:")
    print(f"  Duration: {result.duration_seconds:.1f} seconds")
    print(f"  Total Tokens Used: {result.total_tokens_used:,}")
    print(f"  Agents Used: {len(result.agents_used)} ({', '.join(result.agents_used[:3])}{'...' if len(result.agents_used) > 3 else ''})")
    print(f"  Tools Used: {len(result.tools_used)} ({', '.join(result.tools_used[:3])}{'...' if len(result.tools_used) > 3 else ''})")
    print(f"  Error Count: {result.error_count}")
    
    # Processing metrics
    if result.processing_metrics:
        metrics = result.processing_metrics
        print(f"\nPROCESSING PERFORMANCE:")
        print(f"  Files Processed: {metrics.files_processed}")
        print(f"  Processing Time: {metrics.processing_time_ms}ms")
        print(f"  Records per Second: {metrics.records_per_second:.1f}")
        print(f"  Peak Memory Usage: {metrics.memory_peak_mb:.1f} MB")
    
    # Errors
    if result.processing_errors:
        print(f"\nPROCESSING ERRORS ({len(result.processing_errors)}):")
        for error in result.processing_errors[:5]:  # Show first 5 errors
            print(f"  - {error}")
        if len(result.processing_errors) > 5:
            print(f"  ... and {len(result.processing_errors) - 5} more errors")

def print_detailed_data_samples(result: ProcessedInvestigationData):
    """Print detailed samples of processed data"""
    print(f"\nDETAILED DATA SAMPLES:")
    print("-" * 80)
    
    # LLM Interaction Sample
    if result.llm_interactions:
        interaction = result.llm_interactions[0]
        print(f"LLM Interaction Sample:")
        print(f"  Agent: {interaction.agent_name}")
        print(f"  Model: {interaction.model_name}")
        print(f"  Tokens: {interaction.tokens_used.total_tokens}")
        print(f"  Response Time: {interaction.response_time_ms}ms")
        print(f"  Tools Used: {', '.join(interaction.tools_used)}")
        print(f"  Reasoning: {interaction.reasoning_chain[:100]}...")
        print()
    
    # Tool Execution Sample
    if result.tool_executions:
        execution = result.tool_executions[0]
        print(f"Tool Execution Sample:")
        print(f"  Tool: {execution.tool_name}")
        print(f"  Agent: {execution.agent_name}")
        print(f"  Execution Time: {execution.execution_time_ms}ms")
        print(f"  Success: {execution.success}")
        print(f"  Input Parameters: {json.dumps(execution.input_parameters, indent=2)[:200]}...")
        print()
    
    # Agent Decision Sample
    if result.agent_decisions:
        decision = result.agent_decisions[0]
        print(f"Agent Decision Sample:")
        print(f"  Agent: {decision.agent_name}")
        print(f"  Decision Type: {decision.decision_type}")
        print(f"  Confidence: {decision.confidence_score}")
        print(f"  Next Action: {decision.next_action}")
        print(f"  Handover Target: {decision.handover_target}")
        print(f"  Reasoning: {decision.reasoning[:100]}...")
        print()
    
    # Risk Score Sample
    if result.risk_score_entries:
        risk_entry = result.risk_score_entries[0]
        print(f"Risk Score Entry Sample:")
        print(f"  Risk Score: {risk_entry.risk_score}")
        print(f"  Category: {risk_entry.category}")
        print(f"  Confidence: {risk_entry.confidence}")
        print(f"  Risk Factors: {', '.join(risk_entry.risk_factors)}")
        print()

def demonstrate_visualization_data(result: ProcessedInvestigationData):
    """Demonstrate visualization data generation"""
    print(f"\nVISUALIZATION DATA GENERATION:")
    print("-" * 80)
    
    # Timeline data
    timeline_data = result.get_timeline_data()
    print(f"Timeline Events: {len(timeline_data)}")
    if timeline_data:
        event = timeline_data[0]
        print(f"  Sample Event: {event['title']} ({event['type']})")
        print(f"  Description: {event['description'][:50]}...")
        print()
    
    # Agent network data
    network_data = result.get_agent_network_data()
    print(f"Agent Network Data:")
    print(f"  Nodes: {len(network_data['nodes'])}")
    print(f"  Edges: {len(network_data['edges'])}")
    if network_data['nodes']:
        node = network_data['nodes'][0]
        print(f"  Sample Node: {node['label']} ({node['interactions']} interactions)")
    print()
    
    # Performance metrics
    perf_metrics = result.get_performance_metrics()
    print(f"Performance Metrics: {len(perf_metrics)} available")
    for key, value in list(perf_metrics.items())[:3]:  # Show first 3 metrics
        print(f"  {key}: {value:.3f}")
    print()

def process_investigation_example(folder_path: Path):
    """Process a single investigation folder and show results"""
    logger.info(f"Processing investigation folder: {folder_path}")
    
    try:
        # Create processor with custom configuration
        processor = create_data_processor(
            memory_limit_mb=100,  # Limit for large file streaming
            batch_size=1000,      # Batch size for JSONL processing
            enable_performance_monitoring=True
        )
        
        # Process the investigation folder
        result = processor.process_investigation_folder(folder_path)
        
        # Print summary
        print_processing_summary(result)
        
        # Print detailed samples
        print_detailed_data_samples(result)
        
        # Demonstrate visualization data
        demonstrate_visualization_data(result)
        
        logger.info("Investigation processing completed successfully")
        return result
        
    except Exception as e:
        logger.error(f"Failed to process investigation folder: {e}")
        raise

def main():
    """Main function"""
    print("Investigation Data Processor Example")
    print("=" * 80)
    
    # Check for command line argument
    if len(sys.argv) > 1:
        folder_path = Path(sys.argv[1])
        if not folder_path.exists() or not folder_path.is_dir():
            logger.error(f"Invalid folder path: {folder_path}")
            sys.exit(1)
        
        # Process specific folder
        process_investigation_example(folder_path)
        
    else:
        # Discover and list available folders
        folders = discover_investigation_folders()
        
        if not folders:
            logger.warning("No investigation folders found in logs directory")
<<<<<<< HEAD
            logger.info("To create sample data, run the autonomous investigation tests")
=======
            logger.info("To create sample data, run the structured investigation tests")
>>>>>>> 001-modify-analyzer-method
            return
        
        print(f"Found {len(folders)} investigation folders:")
        for i, folder in enumerate(folders, 1):
            # Try to load metadata for folder info
            try:
                with open(folder / "metadata.json") as f:
                    metadata = json.load(f)
                print(f"  {i}. {folder.name}")
                print(f"     ID: {metadata.get('investigation_id', 'unknown')}")
                print(f"     Mode: {metadata.get('mode', 'unknown')}")
                print(f"     Scenario: {metadata.get('scenario', 'unknown')}")
                print(f"     Status: {metadata.get('status', 'unknown')}")
            except Exception:
                print(f"  {i}. {folder.name} (metadata unavailable)")
        
        # Process the most recent folder as an example
        if folders:
            print(f"\nProcessing most recent folder as example...")
            most_recent = folders[-1]  # Folders are sorted, so last is most recent
            process_investigation_example(most_recent)
    
    print("\n" + "="*80)
    print("Example completed successfully!")
    print("="*80)

if __name__ == "__main__":
    main()