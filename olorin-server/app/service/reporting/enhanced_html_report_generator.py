#!/usr/bin/env python3
"""
Enhanced HTML Report Generator for Investigation Folders

This module provides comprehensive HTML report generation for investigation folders
created by the autonomous investigation system. It processes all investigation files
and generates interactive HTML reports with visualizations.

Investigation Folder Structure:
- {MODE}_{INVESTIGATION_ID}_{TIMESTAMP}/
  - metadata.json
  - autonomous_activities.jsonl  
  - journey_tracking.json
  - investigation.log
  - results/ (directory)

Generated Report Components:
1. LLM interactions timeline
2. Investigation flow graph
3. Tools/agents usage analysis
4. Risk analysis dashboard
5. Investigation explanations
6. Journey visualization  
7. LangGraph visualization

Dependencies:
- Chart.js for interactive charts
- Mermaid.js for flow diagrams
- Responsive CSS framework
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Union
import base64
import re
from collections import defaultdict, Counter
from dataclasses import dataclass, asdict
import statistics

from ..logging.investigation_folder_manager import (
    InvestigationFolderManager, 
    InvestigationMode,
    get_folder_manager
)
from .investigation_data_processor import (
    InvestigationDataProcessor,
    create_data_processor,
)
from .components import (
    LLMTimelineComponent,
    InvestigationFlowComponent,
    ToolsAnalysisComponent,
    RiskDashboardComponent,
    ExplanationsComponent,
    JourneyVisualizationComponent,
    LangGraphVisualizationComponent,
    get_all_components,
    get_component,
    COMPONENT_REGISTRY,
    ComponentConfig
)
from .components.base_component import ComponentTheme

logger = logging.getLogger(__name__)

@dataclass
class InvestigationSummary:
    """Summary statistics for an investigation"""
    investigation_id: str
    mode: str
    scenario: str
    created_at: str
    status: str
    total_interactions: int
    duration_seconds: float
    llm_calls: int
    tool_executions: int
    agent_decisions: int
    total_tokens: int
    risk_scores: List[float]
    final_risk_score: Optional[float]
    agents_used: List[str]
    tools_used: List[str]
    error_count: int

@dataclass  
class ComponentData:
    """Container for processed component data"""
    llm_interactions: List[Dict[str, Any]]
    investigation_flow: List[Dict[str, Any]]
    tools_analysis: Dict[str, Any]
    risk_analysis: Dict[str, Any]
    explanations: List[Dict[str, Any]]
    journey_data: Dict[str, Any]
    langgraph_nodes: List[Dict[str, Any]]

class EnhancedHTMLReportGenerator:
    """
    Enhanced HTML report generator for investigation folders.
    
    Processes investigation folders and generates comprehensive interactive
    HTML reports with all 7 visualization components, using the investigation
    data processor for seamless data flow and structured processing.
    
    Features:
    - Integration with all 7 visualization components
    - Investigation data processor integration
    - Theme support (default, dark, high contrast, colorblind-friendly)
    - Component configuration options
    - Performance optimization for large datasets
    - Complete HTML template generation
    - Automatic report generation workflow
    """
    
    def __init__(
        self, 
        base_logs_dir: Optional[Path] = None,
        template_dir: Optional[Path] = None,
        theme: Union[str, ComponentTheme] = "default",
        enable_components: Optional[List[str]] = None,
        component_config: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize the enhanced HTML report generator.
        
        Args:
            base_logs_dir: Base directory for investigation logs
            template_dir: Directory containing HTML templates
            theme: Theme for visualization components
            enable_components: List of component names to enable (all by default)
            component_config: Configuration for visualization components
        """
        self.folder_manager = get_folder_manager()
        if base_logs_dir:
            self.folder_manager.base_logs_dir = base_logs_dir
            
        self.template_dir = template_dir or Path(__file__).parent / "templates"
        self.generated_reports_dir = Path("reports/generated")
        self.generated_reports_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize data processor
        self.data_processor = create_data_processor(
            memory_limit_mb=500,
            batch_size=1000,
            enable_performance_monitoring=True
        )
        
        # Configure visualization components
        # Convert string theme to ComponentTheme enum
        if isinstance(theme, str):
            try:
                self.theme = ComponentTheme(theme)
            except ValueError:
                logger.warning(f"Invalid theme '{theme}', using default")
                self.theme = ComponentTheme.DEFAULT
        else:
            self.theme = theme
            
        self.component_config = component_config or ComponentConfig(
            theme=self.theme,
            enable_animations=True,
            enable_tooltips=True,
            responsive=True,
            accessibility_enabled=True,
            max_data_points=1000,
            chart_height=400,
            enable_export=True,
            debug_mode=False
        )
        
        # Configure enabled components
        self.enabled_components = enable_components or list(COMPONENT_REGISTRY.keys())
        
        # Initialize components
        self.components = {}
        for component_name in self.enabled_components:
            try:
                component = get_component(component_name)
                component.config = self.component_config
                self.components[component_name] = component
            except Exception as e:
                logger.warning(f"Failed to initialize component {component_name}: {e}")
        
        logger.info(f"Initialized EnhancedHTMLReportGenerator with logs: {self.folder_manager.base_logs_dir}")
        logger.info(f"Enabled components: {list(self.components.keys())}")
        logger.info(f"Theme: {self.theme.value}")

    def discover_investigation_folders(
        self, 
        mode_filter: Optional[InvestigationMode] = None
    ) -> List[Tuple[Path, Dict[str, Any]]]:
        """
        Discover and validate investigation folders.
        
        Args:
            mode_filter: Optional filter by investigation mode
            
        Returns:
            List of tuples (folder_path, metadata)
        """
        folders = []
        
        if not self.folder_manager.base_logs_dir.exists():
            logger.warning(f"Logs directory does not exist: {self.folder_manager.base_logs_dir}")
            return folders
            
        for folder_path in self.folder_manager.base_logs_dir.iterdir():
            if not folder_path.is_dir():
                continue
                
            # Check for investigation folder naming pattern
            if not re.match(r'^(LIVE|MOCK|DEMO)_.*_\d{8}_\d{6}$', folder_path.name):
                continue
                
            # Load and validate metadata
            metadata_file = folder_path / "metadata.json"
            if not metadata_file.exists():
                logger.warning(f"No metadata.json found in {folder_path}")
                continue
                
            try:
                with open(metadata_file, 'r', encoding='utf-8') as f:
                    metadata = json.load(f)
                    
                # Apply mode filter
                if mode_filter:
                    folder_mode = metadata.get('mode', '')
                    if folder_mode != mode_filter.value:
                        continue
                        
                folders.append((folder_path, metadata))
                
            except (json.JSONDecodeError, Exception) as e:
                logger.error(f"Failed to load metadata from {metadata_file}: {e}")
                continue
                
        # Sort by creation date (newest first)
        folders.sort(key=lambda x: x[1].get('created_at', ''), reverse=True)
        
        logger.info(f"Discovered {len(folders)} investigation folders")
        return folders

    def extract_investigation_data(self, folder_path: Path) -> Dict[str, Any]:
        """
        Extract all data from investigation folder files.
        
        Args:
            folder_path: Path to investigation folder
            
        Returns:
            Dictionary containing extracted data from all files
        """
        data = {
            'metadata': {},
            'autonomous_activities': [],
            'journey_tracking': {},
            'investigation_log': [],
            'files_info': {}
        }
        
        # Extract metadata
        metadata_file = folder_path / "metadata.json"
        if metadata_file.exists():
            try:
                with open(metadata_file, 'r', encoding='utf-8') as f:
                    data['metadata'] = json.load(f)
            except Exception as e:
                logger.error(f"Failed to load metadata: {e}")
                
        # Extract autonomous activities (JSONL format)
        activities_file = folder_path / "autonomous_activities.jsonl"
        if activities_file.exists():
            try:
                with open(activities_file, 'r', encoding='utf-8') as f:
                    for line_no, line in enumerate(f, 1):
                        line = line.strip()
                        if line:
                            try:
                                activity = json.loads(line)
                                data['autonomous_activities'].append(activity)
                            except json.JSONDecodeError as e:
                                logger.warning(f"Invalid JSON on line {line_no} in {activities_file}: {e}")
            except Exception as e:
                logger.error(f"Failed to load autonomous activities: {e}")
                
        # Extract journey tracking
        journey_file = folder_path / "journey_tracking.json"
        if journey_file.exists():
            try:
                with open(journey_file, 'r', encoding='utf-8') as f:
                    data['journey_tracking'] = json.load(f)
            except Exception as e:
                logger.error(f"Failed to load journey tracking: {e}")
                
        # Extract investigation log (text format)
        log_file = folder_path / "investigation.log"
        if log_file.exists():
            try:
                with open(log_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line:
                            # Parse log line (basic parsing)
                            log_entry = self._parse_log_line(line)
                            if log_entry:
                                data['investigation_log'].append(log_entry)
            except Exception as e:
                logger.error(f"Failed to load investigation log: {e}")
                
        # Get file information
        for file_name in ['metadata.json', 'autonomous_activities.jsonl', 
                         'journey_tracking.json', 'investigation.log']:
            file_path = folder_path / file_name
            if file_path.exists():
                stat = file_path.stat()
                data['files_info'][file_name] = {
                    'size_bytes': stat.st_size,
                    'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    'exists': True
                }
            else:
                data['files_info'][file_name] = {'exists': False}
                
        logger.info(f"Extracted data from {folder_path.name}: "
                   f"{len(data['autonomous_activities'])} activities, "
                   f"{len(data['investigation_log'])} log entries")
                   
        return data

    def _parse_log_line(self, line: str) -> Optional[Dict[str, Any]]:
        """
        Parse a single log line into structured data.
        
        Args:
            line: Raw log line
            
        Returns:
            Parsed log entry or None if parsing fails
        """
        # Basic log line parsing (can be enhanced based on actual log format)
        patterns = [
            # ISO timestamp pattern
            r'(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.?\d*Z?)\s+(\w+)\s+(.+)',
            # Standard timestamp pattern  
            r'(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+)\s+(\w+)\s+(.+)',
            # Simple timestamp pattern
            r'(\d{2}:\d{2}:\d{2})\s+(\w+)\s+(.+)'
        ]
        
        for pattern in patterns:
            match = re.match(pattern, line)
            if match:
                timestamp_str, level, message = match.groups()
                return {
                    'timestamp': timestamp_str,
                    'level': level.upper(),
                    'message': message.strip(),
                    'raw_line': line
                }
                
        # Fallback: return raw line
        return {
            'timestamp': datetime.now().isoformat(),
            'level': 'INFO',
            'message': line,
            'raw_line': line
        }

    def process_component_data(self, extracted_data: Dict[str, Any]) -> ComponentData:
        """
        Process extracted data into component-specific data structures.
        
        Args:
            extracted_data: Raw extracted data from investigation files
            
        Returns:
            Processed component data ready for visualization
        """
        activities = extracted_data.get('autonomous_activities', [])
        
        # Process LLM interactions
        llm_interactions = []
        tools_analysis = defaultdict(lambda: {'count': 0, 'success': 0, 'total_time': 0})
        risk_scores = []
        agents_used = set()
        langgraph_nodes = []
        
        for activity in activities:
            if activity.get('interaction_type') == 'llm_call':
                data = activity.get('data', {})
                llm_interactions.append({
                    'timestamp': data.get('timestamp'),
                    'agent_name': data.get('agent_name'),
                    'model_name': data.get('model_name'),
                    'tokens_used': data.get('tokens_used', {}),
                    'tools_used': data.get('tools_used', []),
                    'reasoning_chain': data.get('reasoning_chain', ''),
                    'response_time_ms': data.get('response_time_ms', 0),
                    'confidence_score': data.get('confidence_score')
                })
                agents_used.add(data.get('agent_name', 'Unknown'))
                
            elif activity.get('interaction_type') == 'tool_execution':
                data = activity.get('data', {})
                tool_name = data.get('tool_name', 'Unknown')
                tools_analysis[tool_name]['count'] += 1
                if data.get('success'):
                    tools_analysis[tool_name]['success'] += 1
                tools_analysis[tool_name]['total_time'] += data.get('execution_time_ms', 0)
                
            elif activity.get('interaction_type') == 'langgraph_node':
                data = activity.get('data', {})
                langgraph_nodes.append({
                    'timestamp': data.get('timestamp'),
                    'node_name': data.get('node_name'),
                    'node_type': data.get('node_type'),
                    'execution_time_ms': data.get('execution_time_ms', 0),
                    'next_nodes': data.get('next_nodes', [])
                })
                
            elif activity.get('interaction_type') == 'investigation_progress':
                data = activity.get('data', {})
                risk_progression = data.get('risk_score_progression', [])
                for risk_entry in risk_progression:
                    if isinstance(risk_entry, dict) and 'risk_score' in risk_entry:
                        risk_scores.append(risk_entry['risk_score'])
        
        # Process investigation flow
        investigation_flow = self._build_investigation_flow(activities)
        
        # Process risk analysis
        risk_analysis = {
            'risk_scores': risk_scores,
            'final_risk_score': risk_scores[-1] if risk_scores else None,
            'risk_categories': self._analyze_risk_categories(activities),
            'risk_progression': risk_scores
        }
        
        # Process explanations
        explanations = self._extract_explanations(activities)
        
        # Process journey data
        journey_data = extracted_data.get('journey_tracking', {})
        
        return ComponentData(
            llm_interactions=llm_interactions,
            investigation_flow=investigation_flow,
            tools_analysis=dict(tools_analysis),
            risk_analysis=risk_analysis,
            explanations=explanations,
            journey_data=journey_data,
            langgraph_nodes=langgraph_nodes
        )

    def _build_investigation_flow(self, activities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Build investigation flow graph data from activities."""
        flow = []
        phase_transitions = []
        
        current_phase = None
        for activity in activities:
            if activity.get('interaction_type') == 'investigation_progress':
                data = activity.get('data', {})
                new_phase = data.get('current_phase')
                if new_phase != current_phase:
                    phase_transitions.append({
                        'timestamp': data.get('timestamp'),
                        'from_phase': current_phase,
                        'to_phase': new_phase,
                        'progress_type': data.get('progress_type')
                    })
                    current_phase = new_phase
        
        return phase_transitions

    def _analyze_risk_categories(self, activities: List[Dict[str, Any]]) -> Dict[str, float]:
        """Analyze risk scores by category."""
        categories = defaultdict(list)
        
        for activity in activities:
            if activity.get('interaction_type') == 'agent_decision':
                data = activity.get('data', {})
                decision_type = data.get('decision_type', 'unknown')
                confidence = data.get('confidence_score', 0)
                categories[decision_type].append(confidence)
        
        # Calculate average confidence by category
        return {
            category: statistics.mean(scores) if scores else 0
            for category, scores in categories.items()
        }

    def _extract_explanations(self, activities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract explanation and reasoning data."""
        explanations = []
        
        for activity in activities:
            data = activity.get('data', {})
            reasoning = data.get('reasoning_chain') or data.get('reasoning') or data.get('selection_reasoning')
            
            if reasoning:
                explanations.append({
                    'timestamp': data.get('timestamp'),
                    'type': activity.get('interaction_type'),
                    'agent': data.get('agent_name', 'System'),
                    'reasoning': reasoning,
                    'confidence': data.get('confidence_score')
                })
        
        return explanations

    def generate_investigation_summary(self, extracted_data: Dict[str, Any]) -> InvestigationSummary:
        """
        Generate comprehensive investigation summary statistics.
        
        Args:
            extracted_data: Raw extracted investigation data
            
        Returns:
            Investigation summary with key metrics
        """
        metadata = extracted_data.get('metadata', {})
        activities = extracted_data.get('autonomous_activities', [])
        
        # Calculate timing
        start_time = None
        end_time = None
        for activity in activities:
            timestamp_str = activity.get('data', {}).get('timestamp')
            if timestamp_str:
                try:
                    timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                    if start_time is None or timestamp < start_time:
                        start_time = timestamp
                    if end_time is None or timestamp > end_time:
                        end_time = timestamp
                except ValueError:
                    continue
        
        duration_seconds = 0
        if start_time and end_time:
            duration_seconds = (end_time - start_time).total_seconds()
        
        # Count interaction types
        interaction_counts = Counter(
            activity.get('interaction_type') for activity in activities
        )
        
        # Extract tokens and other metrics
        total_tokens = 0
        risk_scores = []
        agents_used = set()
        tools_used = set()
        error_count = 0
        
        for activity in activities:
            data = activity.get('data', {})
            
            # Count tokens
            if 'tokens_used' in data:
                tokens = data['tokens_used']
                if isinstance(tokens, dict):
                    total_tokens += tokens.get('total_tokens', 0)
            
            # Collect risk scores
            if 'risk_score_progression' in data:
                for risk_entry in data['risk_score_progression']:
                    if isinstance(risk_entry, dict) and 'risk_score' in risk_entry:
                        risk_scores.append(risk_entry['risk_score'])
            
            # Collect agents and tools
            if 'agent_name' in data:
                agents_used.add(data['agent_name'])
            if 'tool_name' in data:
                tools_used.add(data['tool_name'])
            if 'tools_used' in data:
                tools_used.update(data['tools_used'])
                
            # Count errors
            if activity.get('interaction_type') == 'error_condition':
                error_count += 1
            elif data.get('success') is False:
                error_count += 1
        
        return InvestigationSummary(
            investigation_id=metadata.get('investigation_id', 'Unknown'),
            mode=metadata.get('mode', 'Unknown'),
            scenario=metadata.get('scenario', 'Unknown'),
            created_at=metadata.get('created_at', ''),
            status=metadata.get('status', 'Unknown'),
            total_interactions=len(activities),
            duration_seconds=duration_seconds,
            llm_calls=interaction_counts.get('llm_call', 0),
            tool_executions=interaction_counts.get('tool_execution', 0),
            agent_decisions=interaction_counts.get('agent_decision', 0),
            total_tokens=total_tokens,
            risk_scores=risk_scores,
            final_risk_score=risk_scores[-1] if risk_scores else None,
            agents_used=list(agents_used),
            tools_used=list(tools_used),
            error_count=error_count
        )

    def generate_html_report(
        self,
        folder_path: Path,
        output_path: Optional[Path] = None,
        title: Optional[str] = None,
        include_components: Optional[List[str]] = None
    ) -> Path:
        """
        Generate comprehensive HTML report for an investigation folder.
        
        Args:
            folder_path: Path to investigation folder
            output_path: Optional custom output path for report
            title: Optional custom report title
            include_components: List of specific components to include
            
        Returns:
            Path to generated HTML report
        """
        logger.info(f"Generating HTML report for: {folder_path}")
        
        # Process investigation data using the data processor
        processed_data = self.data_processor.process_investigation_folder(folder_path)
        
        if processed_data.processing_status.value == "failed":
            logger.error(f"Failed to process investigation data: {processed_data.processing_errors}")
            raise ValueError(f"Investigation data processing failed: {', '.join(processed_data.processing_errors)}")
        
        # Generate component-specific visualizations
        active_components = include_components or list(self.components.keys())
        generated_components = self._generate_all_components(processed_data, active_components)
        
        # Generate output path if not provided
        if output_path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"investigation_report_{processed_data.investigation_id}_{timestamp}.html"
            output_path = self.generated_reports_dir / filename
        
        # Generate complete HTML report
        html_content = self._build_integrated_html_report(
            processed_data=processed_data,
            generated_components=generated_components,
            title=title or f"Investigation Report - {processed_data.investigation_id}"
        )
        
        # Write report
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        logger.info(f"Generated HTML report: {output_path}")
        return output_path

    def _generate_all_components(self, processed_data, active_components: List[str]) -> Dict[str, str]:
        """
        Generate HTML content for all requested visualization components.
        
        Args:
            processed_data: Processed investigation data (dataclass)
            active_components: List of component names to generate
            
        Returns:
            Dictionary mapping component names to their HTML content
        """
        generated_components = {}
        
        # Convert dataclass to dictionary format expected by components
        # Create a combined activities list from all interaction types
        combined_activities = []
        
        # Add all interactions in chronological order
        for interaction in processed_data.llm_interactions:
            combined_activities.append(vars(interaction))
        for execution in processed_data.tool_executions:
            combined_activities.append(vars(execution))
        for decision in processed_data.agent_decisions:
            combined_activities.append(vars(decision))
        for node in processed_data.langgraph_nodes:
            combined_activities.append(vars(node))
        for phase in processed_data.investigation_phases:
            combined_activities.append(vars(phase))
            
        data_dict = {
            'investigation_id': processed_data.investigation_id,
            'mode': processed_data.mode,
            'scenario': processed_data.scenario,
            'created_at': processed_data.created_at,
            'status': processed_data.status,
            'activities': combined_activities,
            'llm_interactions': [vars(interaction) for interaction in processed_data.llm_interactions],
            'tool_executions': [vars(execution) for execution in processed_data.tool_executions],
            'agent_decisions': [vars(decision) for decision in processed_data.agent_decisions],
            'langgraph_nodes': [vars(node) for node in processed_data.langgraph_nodes],
            'investigation_phases': [vars(phase) for phase in processed_data.investigation_phases],
            'risk_score_entries': [vars(entry) for entry in processed_data.risk_score_entries],
            'journey_data': processed_data.journey_data,
            'investigation_results': processed_data.investigation_results,
            'metrics': {
                'duration_seconds': processed_data.duration_seconds,
                'total_tokens': processed_data.total_tokens_used,  # Fixed attribute name
                'final_risk_score': getattr(processed_data, 'final_risk_score', None),
                'agents_used': processed_data.agents_used,
                'tools_used': processed_data.tools_used,
                'error_count': processed_data.error_count
            }
        }
        
        for component_name in active_components:
            if component_name in self.components:
                try:
                    component = self.components[component_name]
                    # Generate HTML for this component using dictionary format
                    component_html = component.generate_html(data_dict)
                    generated_components[component_name] = component_html
                    logger.debug(f"Generated HTML for component: {component_name}")
                except Exception as e:
                    logger.warning(f"Failed to generate component {component_name}: {e}")
                    generated_components[component_name] = f"<div class='error'>Failed to generate {component_name}: {str(e)}</div>"
            else:
                logger.warning(f"Component {component_name} not available in initialized components")
                generated_components[component_name] = f"<div class='error'>Component {component_name} not available</div>"
        
        return generated_components

    def _build_integrated_html_report(self, processed_data, generated_components: Dict[str, str], title: str) -> str:
        """
        Build complete integrated HTML report using generated components.
        
        Args:
            processed_data: Processed investigation data
            generated_components: Dictionary of component HTML content
            title: Report title
            
        Returns:
            Complete HTML report content
        """
        # Extract summary information
        summary = InvestigationSummary(
            investigation_id=processed_data.investigation_id,
            mode=processed_data.mode,
            scenario=processed_data.scenario or "Unknown",
            created_at=processed_data.created_at if processed_data.created_at else "Unknown",  # It's already a string
            status=processed_data.status,
            total_interactions=processed_data.total_interactions,  # Use the existing field
            duration_seconds=processed_data.duration_seconds,
            llm_calls=len(processed_data.llm_interactions),  # Count of LLM interactions
            tool_executions=len(processed_data.tool_executions),  # Count of tool executions 
            agent_decisions=len(processed_data.agent_decisions),  # Count of agent decisions
            total_tokens=processed_data.total_tokens_used,  # Fixed attribute name
            risk_scores=getattr(processed_data, 'risk_scores', []),  # May not exist
            final_risk_score=getattr(processed_data, 'final_risk_score', None),  # May not exist
            agents_used=processed_data.agents_used,
            tools_used=processed_data.tools_used,
            error_count=processed_data.error_count
        )
        
        # Create combined activities for component data
        combined_activities = []
        for interaction in processed_data.llm_interactions:
            combined_activities.append(vars(interaction))
        for execution in processed_data.tool_executions:
            combined_activities.append(vars(execution))
        for decision in processed_data.agent_decisions:
            combined_activities.append(vars(decision))
        for node in processed_data.langgraph_nodes:
            combined_activities.append(vars(node))
        for phase in processed_data.investigation_phases:
            combined_activities.append(vars(phase))
        
        # Create component data structure
        component_data = ComponentData(
            llm_interactions=combined_activities,
            investigation_flow=combined_activities,
            tools_analysis=processed_data.investigation_results.get('tools_analysis', {}),
            risk_analysis=processed_data.investigation_results.get('risk_analysis', {}),
            explanations=combined_activities,
            journey_data=processed_data.journey_data,
            langgraph_nodes=combined_activities
        )
        
        # Use existing _build_html_report method
        return self._build_html_report(summary, component_data, title)

    def _build_html_report(
        self,
        summary: InvestigationSummary,
        component_data: ComponentData,
        title: str
    ) -> str:
        """
        Build the complete HTML report with all components.
        
        Args:
            summary: Investigation summary statistics
            component_data: Processed component data
            title: Report title
            
        Returns:
            Complete HTML report content
        """
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")
        
        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>{self._get_css_styles()}</style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>
</head>
<body>
    <div class="container">
        {self._generate_header(summary, title, timestamp)}
        {self._generate_executive_summary(summary)}
        {self._generate_llm_interactions_timeline(component_data.llm_interactions)}
        {self._generate_investigation_flow_graph(component_data.investigation_flow)}
        {self._generate_tools_analysis(component_data.tools_analysis)}
        {self._generate_risk_dashboard(component_data.risk_analysis)}
        {self._generate_explanations_section(component_data.explanations)}
        {self._generate_journey_visualization(component_data.journey_data)}
        {self._generate_langgraph_visualization(component_data.langgraph_nodes)}
        {self._generate_footer()}
    </div>
    
    <script>
        {self._generate_javascript_code(summary, component_data)}
    </script>
</body>
</html>"""
        
        return html_content

    def _get_css_styles(self) -> str:
        """Return comprehensive CSS styles for the enhanced report."""
        return """
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            line-height: 1.6;
            color: #2c3e50;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1600px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        
        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .header-grid {
            display: grid;
            grid-template-columns: 1fr 2fr 1fr;
            gap: 20px;
            align-items: center;
            margin-top: 20px;
        }
        
        .investigation-badge {
            background: rgba(255, 255, 255, 0.2);
            padding: 10px 20px;
            border-radius: 25px;
            font-size: 0.9em;
            backdrop-filter: blur(10px);
        }
        
        h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .subtitle {
            font-size: 1.2em;
            opacity: 0.9;
        }
        
        .section {
            padding: 40px;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .section:last-child {
            border-bottom: none;
        }
        
        h2 {
            color: #667eea;
            margin-bottom: 30px;
            font-size: 1.8em;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        h3 {
            color: #34495e;
            margin: 20px 0 15px 0;
            font-size: 1.3em;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 25px;
            margin-top: 30px;
        }
        
        .metric-card {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            transition: all 0.3s ease;
            border: 1px solid #dee2e6;
        }
        
        .metric-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        
        .metric-value {
            font-size: 2.8em;
            font-weight: bold;
            color: #667eea;
            margin: 15px 0;
        }
        
        .metric-label {
            color: #6c757d;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 600;
        }
        
        .metric-description {
            color: #868e96;
            font-size: 0.85em;
            margin-top: 8px;
        }
        
        .chart-container {
            position: relative;
            height: 450px;
            margin: 30px 0;
            background: #fafafa;
            border-radius: 10px;
            padding: 20px;
        }
        
        .chart-small {
            height: 300px;
        }
        
        .timeline {
            margin: 30px 0;
        }
        
        .timeline-item {
            padding: 25px;
            border-left: 4px solid #667eea;
            margin: 20px 0 20px 30px;
            position: relative;
            background: #f8f9fa;
            border-radius: 0 10px 10px 0;
        }
        
        .timeline-item::before {
            content: '';
            position: absolute;
            left: -10px;
            top: 30px;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #667eea;
            border: 3px solid white;
        }
        
        .timeline-content {
            margin-left: 20px;
        }
        
        .timeline-timestamp {
            color: #6c757d;
            font-size: 0.9em;
            margin-bottom: 8px;
        }
        
        .timeline-title {
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 5px;
        }
        
        .timeline-description {
            color: #495057;
            font-size: 0.95em;
            line-height: 1.5;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        th {
            background: #667eea;
            color: white;
            padding: 15px 12px;
            text-align: left;
            font-weight: 600;
            font-size: 0.95em;
        }
        
        td {
            padding: 12px;
            border-bottom: 1px solid #dee2e6;
        }
        
        tr:hover {
            background: #f8f9fa;
        }
        
        tr:last-child td {
            border-bottom: none;
        }
        
        .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 0.85em;
            text-transform: uppercase;
        }
        
        .status-success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .status-error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .status-warning {
            background: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
        }
        
        .status-info {
            background: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }
        
        .risk-score-high {
            color: #dc3545;
            font-weight: bold;
        }
        
        .risk-score-medium {
            color: #fd7e14;
            font-weight: bold;
        }
        
        .risk-score-low {
            color: #28a745;
            font-weight: bold;
        }
        
        .code-block {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 20px;
            font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
            overflow-x: auto;
            margin: 20px 0;
            font-size: 0.9em;
            line-height: 1.4;
        }
        
        .mermaid-container {
            background: white;
            border-radius: 10px;
            padding: 30px;
            margin: 30px 0;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .progress-bar {
            width: 100%;
            height: 35px;
            background: #e9ecef;
            border-radius: 20px;
            overflow: hidden;
            margin: 25px 0;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            transition: width 0.8s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 0.9em;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 25px 0;
        }
        
        .stat-item {
            text-align: center;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
            border: 1px solid #dee2e6;
        }
        
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 5px;
        }
        
        .stat-label {
            color: #6c757d;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .explanation-item {
            background: #f8f9fa;
            border-left: 4px solid #17a2b8;
            padding: 20px;
            margin: 15px 0;
            border-radius: 0 8px 8px 0;
        }
        
        .explanation-meta {
            color: #6c757d;
            font-size: 0.9em;
            margin-bottom: 10px;
        }
        
        .explanation-text {
            color: #495057;
            line-height: 1.6;
        }
        
        .footer {
            background: #f8f9fa;
            padding: 40px;
            text-align: center;
            color: #6c757d;
            border-top: 1px solid #dee2e6;
        }
        
        .footer-logo {
            font-size: 1.5em;
            color: #667eea;
            margin-bottom: 10px;
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
            .container {
                margin: 10px;
                border-radius: 10px;
            }
            
            .section {
                padding: 25px 20px;
            }
            
            .header-grid {
                grid-template-columns: 1fr;
                text-align: center;
            }
            
            .metrics-grid {
                grid-template-columns: 1fr;
            }
            
            .chart-container {
                height: 300px;
                padding: 15px;
            }
            
            h1 {
                font-size: 2em;
            }
            
            h2 {
                font-size: 1.5em;
            }
        }
        
        /* Animation classes */
        .fade-in {
            animation: fadeIn 0.6s ease-in;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        """

    def _generate_header(self, summary: InvestigationSummary, title: str, timestamp: str) -> str:
        """Generate the enhanced report header."""
        status_class = {
            'completed': 'success',
            'failed': 'error',
            'running': 'warning'
        }.get(summary.status.lower(), 'info')
        
        return f"""
        <header class="fade-in">
            <h1>🔍 {title}</h1>
            <div class="subtitle">Generated: {timestamp}</div>
            
            <div class="header-grid">
                <div class="investigation-badge">
                    <strong>Mode:</strong> {summary.mode or "Unknown"}
                </div>
                <div class="investigation-badge">
                    <strong>Investigation ID:</strong> {summary.investigation_id or "Unknown"}
                </div>
                <div class="investigation-badge status-{status_class}">
                    <strong>Status:</strong> {summary.status or "Unknown"}
                </div>
            </div>
            
            <div style="margin-top: 20px;">
                <div class="investigation-badge">
                    <strong>Scenario:</strong> {summary.scenario or "Unknown"}
                </div>
            </div>
        </header>
        """

    def _generate_executive_summary(self, summary: InvestigationSummary) -> str:
        """Generate executive summary with key metrics."""
        duration_str = f"{summary.duration_seconds:.1f}s" if summary.duration_seconds is not None else "0.0s"
        if summary.duration_seconds and summary.duration_seconds > 60:
            minutes = int(summary.duration_seconds // 60)
            seconds = summary.duration_seconds % 60
            duration_str = f"{minutes}m {seconds:.1f}s"
            
        risk_class = "low"
        if summary.final_risk_score:
            if summary.final_risk_score > 0.7:
                risk_class = "high"
            elif summary.final_risk_score > 0.3:
                risk_class = "medium"
        
        return f"""
        <section class="section fade-in">
            <h2>📊 Executive Summary</h2>
            
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-label">Total Interactions</div>
                    <div class="metric-value">{summary.total_interactions if summary.total_interactions is not None else 0}</div>
                    <div class="metric-description">All logged activities</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-label">Investigation Duration</div>
                    <div class="metric-value">{duration_str}</div>
                    <div class="metric-description">Total execution time</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-label">LLM Calls</div>
                    <div class="metric-value">{summary.llm_calls if summary.llm_calls is not None else 0}</div>
                    <div class="metric-description">AI model invocations</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-label">Tool Executions</div>
                    <div class="metric-value">{summary.tool_executions if summary.tool_executions is not None else 0}</div>
                    <div class="metric-description">Tools and functions used</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-label">Total Tokens</div>
                    <div class="metric-value">{(summary.total_tokens if summary.total_tokens else 0):,d}</div>
                    <div class="metric-description">LLM tokens consumed</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-label">Final Risk Score</div>
                    <div class="metric-value risk-score-{risk_class}">
                        {f"{summary.final_risk_score:.3f}" if summary.final_risk_score is not None else "N/A"}
                    </div>
                    <div class="metric-description">Calculated risk level</div>
                </div>
            </div>
            
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">{len(summary.agents_used)}</div>
                    <div class="stat-label">Agents Used</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">{len(summary.tools_used)}</div>
                    <div class="stat-label">Unique Tools</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">{summary.agent_decisions if summary.agent_decisions is not None else 0}</div>
                    <div class="stat-label">Agent Decisions</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">{summary.error_count if summary.error_count is not None else 0}</div>
                    <div class="stat-label">Errors</div>
                </div>
            </div>
        </section>
        """

    def _generate_llm_interactions_timeline(self, llm_interactions: List[Dict[str, Any]]) -> str:
        """Generate LLM interactions timeline component."""
        if not llm_interactions:
            return f"""
            <section class="section">
                <h2>🧠 LLM Interactions Timeline</h2>
                <p>No LLM interactions found in this investigation.</p>
            </section>
            """
        
        timeline_html = ""
        for i, interaction in enumerate(llm_interactions[:20]):  # Limit to first 20
            timestamp = interaction.get('timestamp', '')
            formatted_time = self._format_timestamp(timestamp)
            
            agent = interaction.get('agent_name', 'Unknown Agent')
            model = interaction.get('model_name', 'Unknown Model')
            tokens = interaction.get('tokens_used', {})
            total_tokens = tokens.get('total_tokens', 0)
            tools_used = ', '.join(interaction.get('tools_used', []))
            reasoning = interaction.get('reasoning_chain', '')[:200]
            
            timeline_html += f"""
            <div class="timeline-item">
                <div class="timeline-content">
                    <div class="timeline-timestamp">{formatted_time}</div>
                    <div class="timeline-title">{agent} → {model}</div>
                    <div class="timeline-description">
                        <strong>Tokens:</strong> {total_tokens:,}<br>
                        <strong>Tools:</strong> {tools_used or 'None'}<br>
                        <strong>Reasoning:</strong> {reasoning}{'...' if len(reasoning) == 200 else ''}
                    </div>
                </div>
            </div>
            """
            
        return f"""
        <section class="section">
            <h2>🧠 LLM Interactions Timeline</h2>
            
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">{len(llm_interactions)}</div>
                    <div class="stat-label">Total LLM Calls</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">{sum(i.get('tokens_used', {}).get('total_tokens', 0) for i in llm_interactions):,}</div>
                    <div class="stat-label">Total Tokens</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">{len(set(i.get('agent_name', '') for i in llm_interactions))}</div>
                    <div class="stat-label">Unique Agents</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">{len(set(i.get('model_name', '') for i in llm_interactions))}</div>
                    <div class="stat-label">Models Used</div>
                </div>
            </div>
            
            <div class="chart-container chart-small">
                <canvas id="llmTimelineChart"></canvas>
            </div>
            
            <div class="timeline">
                {timeline_html}
            </div>
        </section>
        """

    def _generate_investigation_flow_graph(self, investigation_flow: List[Dict[str, Any]]) -> str:
        """Generate investigation flow graph component."""
        if not investigation_flow:
            flow_diagram = "graph TD\n    A[Investigation Started] --> B[No Phase Data Available]"
        else:
            # Build Mermaid diagram
            flow_diagram = "graph TD\n    Start([Investigation Started])\n"
            previous_node = "Start"
            
            for i, transition in enumerate(investigation_flow):
                to_phase = transition.get('to_phase', f'Phase_{i}')
                node_id = f"Phase_{i}"
                flow_diagram += f"    {previous_node} --> {node_id}[{to_phase}]\n"
                previous_node = node_id
            
            flow_diagram += f"    {previous_node} --> End([Investigation Completed])"
        
        return f"""
        <section class="section">
            <h2>🔄 Investigation Flow Graph</h2>
            
            <div class="mermaid-container">
                <div class="mermaid">
                {flow_diagram}
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Timestamp</th>
                        <th>From Phase</th>
                        <th>To Phase</th>
                        <th>Transition Type</th>
                    </tr>
                </thead>
                <tbody>
        """
        
        for transition in investigation_flow:
            timestamp = self._format_timestamp(transition.get('timestamp', ''))
            from_phase = transition.get('from_phase') or 'Initial'
            to_phase = transition.get('to_phase', 'Unknown')
            progress_type = transition.get('progress_type', 'Unknown')
            
            flow_html = f"""
                    <tr>
                        <td>{timestamp}</td>
                        <td>{from_phase}</td>
                        <td><strong>{to_phase}</strong></td>
                        <td><span class="status-badge status-info">{progress_type}</span></td>
                    </tr>
            """
        
        return flow_html + """
                </tbody>
            </table>
        </section>
        """

    def _generate_tools_analysis(self, tools_analysis: Dict[str, Any]) -> str:
        """Generate tools and agents usage analysis component."""
        if not tools_analysis:
            return f"""
            <section class="section">
                <h2>🔧 Tools & Agents Analysis</h2>
                <p>No tool usage data found in this investigation.</p>
            </section>
            """
        
        # Build tools table
        tools_html = ""
        for tool_name, tool_data in tools_analysis.items():
            count = tool_data.get('count', 0)
            success = tool_data.get('success', 0)
            success_rate = (success / count * 100) if count > 0 else 0
            avg_time = tool_data.get('total_time', 0) / max(count, 1)
            
            success_class = "success" if success_rate >= 80 else "warning" if success_rate >= 50 else "error"
            
            tools_html += f"""
                <tr>
                    <td><strong>{tool_name}</strong></td>
                    <td>{count}</td>
                    <td>{success}</td>
                    <td><span class="status-badge status-{success_class}">{success_rate:.1f}%</span></td>
                    <td>{avg_time:.0f}ms</td>
                </tr>
            """
        
        return f"""
        <section class="section">
            <h2>🔧 Tools & Agents Analysis</h2>
            
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">{len(tools_analysis)}</div>
                    <div class="stat-label">Unique Tools</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">{sum(t.get('count', 0) for t in tools_analysis.values())}</div>
                    <div class="stat-label">Total Executions</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">{sum(t.get('success', 0) for t in tools_analysis.values())}</div>
                    <div class="stat-label">Successful Runs</div>
                </div>
            </div>
            
            <div class="chart-container chart-small">
                <canvas id="toolsUsageChart"></canvas>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Tool Name</th>
                        <th>Total Uses</th>
                        <th>Successful</th>
                        <th>Success Rate</th>
                        <th>Avg Duration</th>
                    </tr>
                </thead>
                <tbody>
                    {tools_html}
                </tbody>
            </table>
        </section>
        """

    def _generate_risk_dashboard(self, risk_analysis: Dict[str, Any]) -> str:
        """Generate risk analysis dashboard component."""
        risk_scores = risk_analysis.get('risk_scores', [])
        final_risk = risk_analysis.get('final_risk_score')
        risk_categories = risk_analysis.get('risk_categories', {})
        
        if not risk_scores and not risk_categories:
            return f"""
            <section class="section">
                <h2>⚠️ Risk Analysis Dashboard</h2>
                <p>No risk analysis data found in this investigation.</p>
            </section>
            """
        
        # Calculate risk statistics
        avg_risk = statistics.mean(risk_scores) if risk_scores else 0
        max_risk = max(risk_scores) if risk_scores else 0
        min_risk = min(risk_scores) if risk_scores else 0
        
        # Risk level classification
        def get_risk_class(score):
            if score > 0.7:
                return "high"
            elif score > 0.3:
                return "medium"
            return "low"
        
        final_risk_class = get_risk_class(final_risk) if final_risk else "low"
        
        return f"""
        <section class="section">
            <h2>⚠️ Risk Analysis Dashboard</h2>
            
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-label">Final Risk Score</div>
                    <div class="metric-value risk-score-{final_risk_class}">
                        {f"{final_risk:.3f}" if final_risk is not None else "N/A"}
                    </div>
                    <div class="metric-description">Overall calculated risk</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-label">Average Risk</div>
                    <div class="metric-value risk-score-{get_risk_class(avg_risk)}">
                        {avg_risk:.3f}
                    </div>
                    <div class="metric-description">Mean risk score</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-label">Peak Risk</div>
                    <div class="metric-value risk-score-{get_risk_class(max_risk)}">
                        {max_risk:.3f}
                    </div>
                    <div class="metric-description">Highest risk detected</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-label">Risk Samples</div>
                    <div class="metric-value">{len(risk_scores)}</div>
                    <div class="metric-description">Risk measurements taken</div>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                <div class="chart-container chart-small">
                    <canvas id="riskProgressionChart"></canvas>
                </div>
                
                <div class="chart-container chart-small">
                    <canvas id="riskCategoriesChart"></canvas>
                </div>
            </div>
        </section>
        """

    def _generate_explanations_section(self, explanations: List[Dict[str, Any]]) -> str:
        """Generate investigation explanations and reasoning section."""
        if not explanations:
            return f"""
            <section class="section">
                <h2>💭 Investigation Explanations</h2>
                <p>No explanations or reasoning data found in this investigation.</p>
            </section>
            """
        
        explanations_html = ""
        for explanation in explanations[:10]:  # Limit to first 10
            timestamp = self._format_timestamp(explanation.get('timestamp', ''))
            agent = explanation.get('agent', 'System')
            reasoning = explanation.get('reasoning', '')
            confidence = explanation.get('confidence')
            interaction_type = explanation.get('type', 'unknown')
            
            explanations_html += f"""
            <div class="explanation-item">
                <div class="explanation-meta">
                    <strong>{agent}</strong> • {timestamp} • {interaction_type}
                    {f' • Confidence: {confidence:.2f}' if confidence is not None else ''}
                </div>
                <div class="explanation-text">{reasoning}</div>
            </div>
            """
        
        return f"""
        <section class="section">
            <h2>💭 Investigation Explanations</h2>
            
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">{len(explanations)}</div>
                    <div class="stat-label">Total Explanations</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">{len(set(e.get('agent', '') for e in explanations))}</div>
                    <div class="stat-label">Contributing Agents</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">{len(set(e.get('type', '') for e in explanations))}</div>
                    <div class="stat-label">Explanation Types</div>
                </div>
            </div>
            
            {explanations_html}
        </section>
        """

    def _generate_journey_visualization(self, journey_data: Dict[str, Any]) -> str:
        """Generate journey tracking visualization component."""
        if not journey_data:
            return f"""
            <section class="section">
                <h2>🗺️ Investigation Journey</h2>
                <p>No journey tracking data found in this investigation.</p>
            </section>
            """
        
        # Extract journey statistics
        journey_stats = {}
        if 'checkpoints' in journey_data:
            checkpoints = journey_data['checkpoints']
            journey_stats['checkpoints'] = len(checkpoints)
        if 'duration' in journey_data:
            journey_stats['duration'] = journey_data['duration']
        if 'phases' in journey_data:
            journey_stats['phases'] = len(journey_data['phases'])
            
        stats_html = ""
        for key, value in journey_stats.items():
            stats_html += f"""
                <div class="stat-item">
                    <div class="stat-value">{value}</div>
                    <div class="stat-label">{key.title()}</div>
                </div>
            """
        
        return f"""
        <section class="section">
            <h2>🗺️ Investigation Journey</h2>
            
            <div class="stats-grid">
                {stats_html}
            </div>
            
            <div class="chart-container">
                <canvas id="journeyChart"></canvas>
            </div>
            
            <div class="code-block">
                {json.dumps(journey_data, indent=2)[:1000]}
                {'...' if len(json.dumps(journey_data)) > 1000 else ''}
            </div>
        </section>
        """

    def _generate_langgraph_visualization(self, langgraph_nodes: List[Dict[str, Any]]) -> str:
        """Generate LangGraph node execution visualization."""
        if not langgraph_nodes:
            return f"""
            <section class="section">
                <h2>📊 LangGraph Execution Flow</h2>
                <p>No LangGraph node execution data found in this investigation.</p>
            </section>
            """
        
        # Build node execution timeline
        timeline_html = ""
        for node in langgraph_nodes[:15]:  # Limit to first 15 nodes
            timestamp = self._format_timestamp(node.get('timestamp', ''))
            node_name = node.get('node_name', 'Unknown Node')
            node_type = node.get('node_type', 'Unknown')
            execution_time = node.get('execution_time_ms', 0)
            next_nodes = ', '.join(node.get('next_nodes', []))
            
            timeline_html += f"""
            <div class="timeline-item">
                <div class="timeline-content">
                    <div class="timeline-timestamp">{timestamp}</div>
                    <div class="timeline-title">{node_name} ({node_type})</div>
                    <div class="timeline-description">
                        <strong>Execution Time:</strong> {execution_time}ms<br>
                        <strong>Next Nodes:</strong> {next_nodes or 'End'}
                    </div>
                </div>
            </div>
            """
        
        # Build Mermaid flow diagram
        flow_diagram = "graph TD\n"
        processed_nodes = set()
        
        for i, node in enumerate(langgraph_nodes):
            node_name = node.get('node_name', f'Node_{i}')
            node_id = node_name.replace(' ', '_')
            
            if node_id not in processed_nodes:
                flow_diagram += f"    {node_id}[{node_name}]\n"
                processed_nodes.add(node_id)
                
                for next_node in node.get('next_nodes', []):
                    next_id = next_node.replace(' ', '_')
                    flow_diagram += f"    {node_id} --> {next_id}\n"
        
        return f"""
        <section class="section">
            <h2>📊 LangGraph Execution Flow</h2>
            
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">{len(langgraph_nodes)}</div>
                    <div class="stat-label">Nodes Executed</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">{len(set(n.get('node_type', '') for n in langgraph_nodes))}</div>
                    <div class="stat-label">Node Types</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">{sum(n.get('execution_time_ms', 0) for n in langgraph_nodes):,}ms</div>
                    <div class="stat-label">Total Execution Time</div>
                </div>
            </div>
            
            <div class="mermaid-container">
                <div class="mermaid">
                {flow_diagram}
                </div>
            </div>
            
            <div class="chart-container chart-small">
                <canvas id="langgraphChart"></canvas>
            </div>
            
            <div class="timeline">
                {timeline_html}
            </div>
        </section>
        """

    def _generate_footer(self) -> str:
        """Generate report footer."""
        return """
        <footer class="footer">
            <div class="footer-logo">🚀 Olorin Fraud Investigation Platform</div>
            <p>Enhanced Investigation Report Generator</p>
            <p>Comprehensive analysis with interactive visualizations</p>
            <p style="margin-top: 15px; font-size: 0.9em;">
                Generated with Python • Powered by Chart.js & Mermaid.js
            </p>
        </footer>
        """

    def _format_timestamp(self, timestamp_str: str) -> str:
        """Format timestamp string for display."""
        if not timestamp_str:
            return "Unknown Time"
            
        try:
            # Handle various timestamp formats
            if 'T' in timestamp_str:
                # ISO format
                dt = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                return dt.strftime("%H:%M:%S")
            elif ',' in timestamp_str:
                # Log format with milliseconds
                parts = timestamp_str.split(',')[0]
                dt = datetime.strptime(parts, "%Y-%m-%d %H:%M:%S")
                return dt.strftime("%H:%M:%S")
            else:
                return timestamp_str
        except (ValueError, AttributeError):
            return timestamp_str[:20] if len(timestamp_str) > 20 else timestamp_str

    def _generate_javascript_code(
        self, 
        summary: InvestigationSummary, 
        component_data: ComponentData
    ) -> str:
        """Generate JavaScript code for interactive charts and visualizations."""
        
        # Prepare data for charts
        llm_interactions = component_data.llm_interactions
        tools_analysis = component_data.tools_analysis
        risk_analysis = component_data.risk_analysis
        langgraph_nodes = component_data.langgraph_nodes
        
        # LLM Timeline Chart data
        llm_timestamps = [i.get('timestamp', '') for i in llm_interactions]
        llm_tokens = [i.get('tokens_used', {}).get('total_tokens', 0) for i in llm_interactions]
        
        # Tools Usage Chart data
        tool_names = list(tools_analysis.keys()) if tools_analysis else []
        tool_counts = [tools_analysis[name].get('count', 0) for name in tool_names]
        
        # Risk Progression data
        risk_scores = risk_analysis.get('risk_scores', [])
        risk_categories = risk_analysis.get('risk_categories', {})
        
        # LangGraph execution times
        langgraph_times = [node.get('execution_time_ms', 0) for node in langgraph_nodes]
        langgraph_names = [node.get('node_name', f'Node {i}') for i, node in enumerate(langgraph_nodes)]
        
        return f"""
        // Initialize Mermaid
        mermaid.initialize({{ 
            startOnLoad: true, 
            theme: 'default',
            themeVariables: {{
                primaryColor: '#667eea',
                primaryTextColor: '#2c3e50',
                primaryBorderColor: '#667eea',
                lineColor: '#667eea'
            }}
        }});
        
        // Chart.js default configuration
        Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        Chart.defaults.color = '#495057';
        Chart.defaults.borderColor = '#dee2e6';
        
        // LLM Interactions Timeline Chart
        const llmCtx = document.getElementById('llmTimelineChart');
        if (llmCtx) {{
            new Chart(llmCtx.getContext('2d'), {{
                type: 'line',
                data: {{
                    labels: {json.dumps([self._format_timestamp(ts) for ts in llm_timestamps])},
                    datasets: [{{
                        label: 'Tokens Used',
                        data: {json.dumps(llm_tokens)},
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }}]
                }},
                options: {{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {{
                        title: {{
                            display: true,
                            text: 'Token Usage Over Time',
                            font: {{ size: 16, weight: 'bold' }}
                        }},
                        legend: {{
                            display: true,
                            position: 'top'
                        }}
                    }},
                    scales: {{
                        y: {{
                            beginAtZero: true,
                            title: {{
                                display: true,
                                text: 'Tokens'
                            }}
                        }},
                        x: {{
                            title: {{
                                display: true,
                                text: 'Timeline'
                            }}
                        }}
                    }}
                }}
            }});
        }}
        
        // Tools Usage Chart
        const toolsCtx = document.getElementById('toolsUsageChart');
        if (toolsCtx) {{
            new Chart(toolsCtx.getContext('2d'), {{
                type: 'bar',
                data: {{
                    labels: {json.dumps(tool_names[:10])},
                    datasets: [{{
                        label: 'Usage Count',
                        data: {json.dumps(tool_counts[:10])},
                        backgroundColor: [
                            '#667eea', '#764ba2', '#f093fb', '#f5576c',
                            '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
                            '#ffecd2', '#fcb69f'
                        ],
                        borderColor: 'rgba(102, 126, 234, 0.8)',
                        borderWidth: 1
                    }}]
                }},
                options: {{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {{
                        title: {{
                            display: true,
                            text: 'Tool Usage Distribution',
                            font: {{ size: 16, weight: 'bold' }}
                        }},
                        legend: {{
                            display: false
                        }}
                    }},
                    scales: {{
                        y: {{
                            beginAtZero: true,
                            title: {{
                                display: true,
                                text: 'Usage Count'
                            }}
                        }},
                        x: {{
                            title: {{
                                display: true,
                                text: 'Tools'
                            }}
                        }}
                    }}
                }}
            }});
        }}
        
        // Risk Progression Chart
        const riskProgressionCtx = document.getElementById('riskProgressionChart');
        if (riskProgressionCtx) {{
            new Chart(riskProgressionCtx.getContext('2d'), {{
                type: 'line',
                data: {{
                    labels: Array.from({{length: {len(risk_scores)}}}, (_, i) => `Sample ${{i+1}}`),
                    datasets: [{{
                        label: 'Risk Score',
                        data: {json.dumps(risk_scores)},
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: function(context) {{
                            const value = context.parsed.y;
                            if (value > 0.7) return '#dc3545';
                            if (value > 0.3) return '#fd7e14';
                            return '#28a745';
                        }}
                    }}]
                }},
                options: {{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {{
                        title: {{
                            display: true,
                            text: 'Risk Score Progression',
                            font: {{ size: 16, weight: 'bold' }}
                        }}
                    }},
                    scales: {{
                        y: {{
                            min: 0,
                            max: 1,
                            title: {{
                                display: true,
                                text: 'Risk Score'
                            }}
                        }}
                    }}
                }}
            }});
        }}
        
        // Risk Categories Chart
        const riskCategoriesCtx = document.getElementById('riskCategoriesChart');
        if (riskCategoriesCtx) {{
            new Chart(riskCategoriesCtx.getContext('2d'), {{
                type: 'radar',
                data: {{
                    labels: {json.dumps(list(risk_categories.keys())[:8])},
                    datasets: [{{
                        label: 'Confidence Score',
                        data: {json.dumps(list(risk_categories.values())[:8])},
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.2)',
                        pointBackgroundColor: '#667eea',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: '#667eea'
                    }}]
                }},
                options: {{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {{
                        title: {{
                            display: true,
                            text: 'Decision Confidence by Category',
                            font: {{ size: 16, weight: 'bold' }}
                        }}
                    }},
                    scales: {{
                        r: {{
                            beginAtZero: true,
                            max: 1
                        }}
                    }}
                }}
            }});
        }}
        
        // Journey Chart (Timeline visualization)
        const journeyCtx = document.getElementById('journeyChart');
        if (journeyCtx) {{
            new Chart(journeyCtx.getContext('2d'), {{
                type: 'line',
                data: {{
                    labels: ['Start', 'Phase 1', 'Phase 2', 'Phase 3', 'Complete'],
                    datasets: [{{
                        label: 'Investigation Progress',
                        data: [0, 25, 50, 75, 100],
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }}]
                }},
                options: {{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {{
                        title: {{
                            display: true,
                            text: 'Investigation Journey Progress',
                            font: {{ size: 16, weight: 'bold' }}
                        }}
                    }},
                    scales: {{
                        y: {{
                            beginAtZero: true,
                            max: 100,
                            title: {{
                                display: true,
                                text: 'Progress %'
                            }}
                        }}
                    }}
                }}
            }});
        }}
        
        // LangGraph Execution Chart
        const langgraphCtx = document.getElementById('langgraphChart');
        if (langgraphCtx) {{
            new Chart(langgraphCtx.getContext('2d'), {{
                type: 'bar',
                data: {{
                    labels: {json.dumps(langgraph_names[:10])},
                    datasets: [{{
                        label: 'Execution Time (ms)',
                        data: {json.dumps(langgraph_times[:10])},
                        backgroundColor: 'rgba(102, 126, 234, 0.7)',
                        borderColor: '#667eea',
                        borderWidth: 2
                    }}]
                }},
                options: {{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {{
                        title: {{
                            display: true,
                            text: 'LangGraph Node Execution Times',
                            font: {{ size: 16, weight: 'bold' }}
                        }},
                        legend: {{
                            display: false
                        }}
                    }},
                    scales: {{
                        y: {{
                            beginAtZero: true,
                            title: {{
                                display: true,
                                text: 'Execution Time (ms)'
                            }}
                        }},
                        x: {{
                            title: {{
                                display: true,
                                text: 'Nodes'
                            }}
                        }}
                    }}
                }}
            }});
        }}
        
        // Add smooth scrolling and animations
        document.addEventListener('DOMContentLoaded', function() {{
            // Fade in sections on scroll
            const sections = document.querySelectorAll('.section');
            const observer = new IntersectionObserver((entries) => {{
                entries.forEach(entry => {{
                    if (entry.isIntersecting) {{
                        entry.target.classList.add('fade-in');
                    }}
                }});
            }}, {{ threshold: 0.1 }});
            
            sections.forEach(section => {{
                observer.observe(section);
            }});
            
            // Add click handlers for metric cards
            document.querySelectorAll('.metric-card').forEach(card => {{
                card.addEventListener('click', function() {{
                    this.style.transform = 'translateY(-10px)';
                    setTimeout(() => {{
                        this.style.transform = 'translateY(-5px)';
                    }}, 150);
                }});
            }});
        }});
        
        console.log('Enhanced Investigation Report loaded successfully');
        console.log('Investigation ID: {summary.investigation_id or "Unknown"}');
        console.log('Total Interactions: {summary.total_interactions if summary.total_interactions is not None else 0}');
        console.log('Final Risk Score: {summary.final_risk_score if summary.final_risk_score is not None else "N/A"}');
        """

# Convenience functions for easy import and usage
def create_report_generator(base_logs_dir: Optional[Path] = None) -> EnhancedHTMLReportGenerator:
    """
    Create an enhanced HTML report generator instance.
    
    Args:
        base_logs_dir: Optional base directory for investigation logs
        
    Returns:
        Configured EnhancedHTMLReportGenerator instance
    """
    return EnhancedHTMLReportGenerator(base_logs_dir=base_logs_dir)

def generate_report_for_folder(
    folder_path: Union[str, Path],
    output_path: Optional[Union[str, Path]] = None,
    title: Optional[str] = None
) -> Path:
    """
    Generate an HTML report for a specific investigation folder.
    
    Args:
        folder_path: Path to investigation folder
        output_path: Optional custom output path for report
        title: Optional custom report title
        
    Returns:
        Path to generated HTML report
        
    Raises:
        FileNotFoundError: If investigation folder doesn't exist
        ValueError: If folder is not a valid investigation folder
    """
    folder_path = Path(folder_path)
    
    if not folder_path.exists():
        raise FileNotFoundError(f"Investigation folder not found: {folder_path}")
        
    if not folder_path.is_dir():
        raise ValueError(f"Path is not a directory: {folder_path}")
        
    # Check for metadata file to validate it's an investigation folder
    metadata_file = folder_path / "metadata.json"
    if not metadata_file.exists():
        raise ValueError(f"Not a valid investigation folder (no metadata.json): {folder_path}")
    
    generator = create_report_generator(base_logs_dir=folder_path.parent)
    return generator.generate_html_report(
        folder_path=folder_path,
        output_path=Path(output_path) if output_path else None,
        title=title
    )