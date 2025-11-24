# Enhanced HTML Report Generator

Comprehensive HTML report generation for investigation folders created by the structured investigation system.

## Overview

The Enhanced HTML Report Generator processes investigation folders and creates interactive HTML reports with detailed visualizations, charts, and analysis. It supports the unified investigation folder structure with pattern `{MODE}_{INVESTIGATION_ID}_{TIMESTAMP}/`.

## Features

### 🔍 Investigation Folder Discovery
- Automatic discovery and validation of investigation folders
- Support for filtering by investigation mode (LIVE, MOCK, DEMO)
- Comprehensive metadata extraction and validation

### 📊 7 Key Report Components
1. **Executive Summary** - Key metrics and statistics
2. **LLM Interactions Timeline** - Token usage and agent activity over time
3. **Investigation Flow Graph** - Phase transitions with Mermaid diagrams
4. **Tools & Agents Analysis** - Usage patterns, success rates, and performance
5. **Risk Analysis Dashboard** - Risk progression and category breakdowns
6. **Investigation Explanations** - Agent reasoning and decision processes
7. **Journey Visualization** - Progress tracking and milestone checkpoints
8. **LangGraph Visualization** - Node execution flow and timing

### 🎨 Professional Design
- Responsive HTML templates with mobile support
- Interactive Chart.js visualizations
- Mermaid.js flow diagrams
- Modern CSS styling with animations
- Professional color schemes and typography

### 📁 File Format Support
- **metadata.json** - Investigation configuration and metadata
- **structured_activities.jsonl** - Structured activity logs
- **journey_tracking.json** - Investigation progress data  
- **investigation.log** - General investigation logs

## Quick Start

### Basic Usage

```python
from app.service.reporting import generate_report_for_folder

# Generate report for a specific investigation folder
report_path = generate_report_for_folder(
    folder_path="/path/to/investigation/folder",
    title="My Investigation Report"
)

print(f"Report generated: {report_path}")
```

### Advanced Usage

```python
from app.service.reporting import EnhancedHTMLReportGenerator
from app.service.logging.investigation_folder_manager import InvestigationMode

# Create generator instance
generator = EnhancedHTMLReportGenerator(
    base_logs_dir="/logs/investigations"
)

# Discover investigation folders
folders = generator.discover_investigation_folders(
    mode_filter=InvestigationMode.LIVE  # Optional filter
)

# Generate reports for all folders
for folder_path, metadata in folders:
    report_path = generator.generate_html_report(
        folder_path=folder_path,
        title=f"Report - {metadata['investigation_id']}"
    )
    print(f"Generated: {report_path}")
```

## API Reference

### EnhancedHTMLReportGenerator

Main class for generating HTML reports from investigation folders.

#### Constructor
```python
EnhancedHTMLReportGenerator(
    base_logs_dir: Optional[Path] = None,
    template_dir: Optional[Path] = None
)
```

#### Key Methods

##### discover_investigation_folders()
```python
discover_investigation_folders(
    mode_filter: Optional[InvestigationMode] = None
) -> List[Tuple[Path, Dict[str, Any]]]
```
Discover and validate investigation folders.

##### generate_html_report()
```python
generate_html_report(
    folder_path: Path,
    output_path: Optional[Path] = None,
    title: Optional[str] = None
) -> Path
```
Generate comprehensive HTML report for an investigation folder.

##### extract_investigation_data()
```python
extract_investigation_data(folder_path: Path) -> Dict[str, Any]
```
Extract all data from investigation folder files.

##### generate_investigation_summary()
```python
generate_investigation_summary(
    extracted_data: Dict[str, Any]
) -> InvestigationSummary
```
Generate comprehensive investigation summary statistics.

### Convenience Functions

##### create_report_generator()
```python
create_report_generator(base_logs_dir: Optional[Path] = None) -> EnhancedHTMLReportGenerator
```
Create a configured report generator instance.

##### generate_report_for_folder()
```python
generate_report_for_folder(
    folder_path: Union[str, Path],
    output_path: Optional[Union[str, Path]] = None,
    title: Optional[str] = None
) -> Path
```
Generate HTML report for a specific investigation folder.

### Data Classes

#### InvestigationSummary
Contains comprehensive statistics and metrics for an investigation:
- `investigation_id`: Unique investigation identifier
- `mode`: Investigation mode (LIVE, MOCK, DEMO)  
- `scenario`: Investigation scenario name
- `total_interactions`: Number of logged interactions
- `duration_seconds`: Total investigation duration
- `llm_calls`: Number of LLM model calls
- `tool_executions`: Number of tool executions
- `total_tokens`: Total LLM tokens consumed
- `final_risk_score`: Final calculated risk score
- `agents_used`: List of agents that participated
- `tools_used`: List of tools that were used
- `error_count`: Number of errors encountered

#### ComponentData
Container for processed component data:
- `llm_interactions`: LLM interaction timeline data
- `investigation_flow`: Investigation phase flow data
- `tools_analysis`: Tools usage analysis data
- `risk_analysis`: Risk assessment data
- `explanations`: Agent explanations and reasoning
- `journey_data`: Investigation journey tracking data
- `langgraph_nodes`: LangGraph node execution data

## File Structure

```
app/service/reporting/
├── __init__.py                          # Module exports
├── enhanced_html_report_generator.py   # Main generator class
├── example_usage.py                     # Usage examples
└── README.md                           # Documentation
```

## Dependencies

The enhanced HTML report generator uses:

- **Chart.js** - Interactive charts and visualizations
- **Mermaid.js** - Flow diagrams and process visualization
- **Python Standard Library** - JSON, datetime, pathlib, etc.
- **Olorin Investigation System** - Folder manager and logging utilities

## Error Handling

The generator includes comprehensive error handling:

- **File Validation** - Checks for required investigation files
- **Data Parsing** - Graceful handling of malformed JSON/JSONL
- **Missing Data** - Fallback displays for incomplete data
- **Performance** - Efficient processing of large investigation files
- **Memory Management** - Streaming processing for large datasets

## Output

Generated HTML reports include:

### Interactive Elements
- **Responsive Charts** - Zoom, pan, and hover interactions
- **Flow Diagrams** - Interactive Mermaid.js visualizations  
- **Smooth Animations** - CSS transitions and scroll effects
- **Mobile Support** - Responsive design for all devices

### Professional Styling
- **Modern Design** - Clean, professional appearance
- **Color Coding** - Intuitive risk levels and status indicators
- **Typography** - Readable fonts optimized for web display
- **Performance** - Optimized CSS and JavaScript loading

## Examples

Run the example script to see the generator in action:

```bash
cd /Users/gklainert/Documents/olorin/olorin-server
python app/service/reporting/example_usage.py
```

This will demonstrate:
- Basic report generation
- Advanced usage patterns
- Folder filtering capabilities
- Data extraction and analysis

## Integration

The enhanced HTML report generator integrates seamlessly with:

- **Investigation Folder Manager** - Unified folder structure
- **Structured Investigation Logger** - Activity data extraction
- **Journey Tracker** - Progress visualization
- **Risk Assessment System** - Risk analysis and scoring

## Performance

Optimized for:
- **Large Investigations** - Handles thousands of interactions efficiently
- **Memory Usage** - Streaming processing for large JSONL files  
- **Generation Speed** - Fast HTML template compilation
- **File I/O** - Efficient reading of investigation files

## Support

For questions or issues with the Enhanced HTML Report Generator:

1. Check the example usage script for common patterns
2. Review the API documentation for method signatures
3. Examine generated reports for expected output format
4. Ensure investigation folders follow the required structure