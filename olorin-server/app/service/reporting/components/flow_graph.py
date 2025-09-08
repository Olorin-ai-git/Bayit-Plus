#!/usr/bin/env python3
"""
Investigation Flow Graph Component

Generates interactive Mermaid flowchart visualization showing investigation phase
progressions, state transitions, and workflow patterns.

Features:
- Mermaid.js flowchart with dynamic phase transitions
- Interactive node clicking and navigation
- Phase duration and timing analysis
- Responsive design with mobile optimization
- Error state handling for incomplete flows
- Progress indicators and completion status
"""

import json
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from collections import defaultdict, OrderedDict

from .base_component import BaseVisualizationComponent

class InvestigationFlowComponent(BaseVisualizationComponent):
    """
    Interactive investigation flow graph component.
    
    Displays investigation phases, transitions, and workflow patterns
    using Mermaid.js flowchart diagrams.
    """
    
    @property
    def component_name(self) -> str:
        return "investigation_flow"
        
    @property
    def component_title(self) -> str:
        return "Investigation Flow Graph"
        
    @property
    def component_description(self) -> str:
        return "Interactive flowchart showing investigation phases, transitions, and workflow progression"
    
    def validate_data(self, data: Dict[str, Any]) -> bool:
        """
        Validate investigation flow data.
        
        Expected data structure:
        {
            'investigation_phases': [
                {
                    'timestamp': str,
                    'from_phase': str | None,
                    'to_phase': str,
                    'progress_type': str,
                    'duration_ms': int,
                    'metadata': dict
                }
            ]
        }
        """
        if not isinstance(data, dict):
            self._add_error("Data must be a dictionary")
            return False
            
        phases = data.get('investigation_phases', [])
        if not isinstance(phases, list):
            self._add_error("investigation_phases must be a list")
            return False
            
        if not phases:
            self._add_warning("No investigation phases found")
            return True
            
        # Validate phase structure
        for i, phase in enumerate(phases[:3]):  # Check first 3
            if not isinstance(phase, dict):
                self._add_error(f"Phase {i} must be a dictionary")
                return False
                
            required_fields = ['timestamp', 'to_phase']
            for field in required_fields:
                if field not in phase:
                    self._add_warning(f"Phase {i} missing field: {field}")
                    
        return True
    
    def process_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process investigation flow data for visualization.
        """
        phases = data.get('investigation_phases', [])
        
        if not phases:
            return {}
            
        # Process phase transitions
        processed_phases = []
        phase_durations = {}
        phase_counts = defaultdict(int)
        unique_phases = set()
        total_duration = 0
        
        previous_timestamp = None
        
        for i, phase in enumerate(phases):
            timestamp_str = phase.get('timestamp', '')
            from_phase = phase.get('from_phase')
            to_phase = phase.get('to_phase', f'Phase_{i}')
            progress_type = phase.get('progress_type', 'transition')
            duration_ms = phase.get('duration_ms', 0)
            metadata = phase.get('metadata', {})
            
            # Parse timestamp
            try:
                if timestamp_str:
                    timestamp = self._parse_timestamp(timestamp_str)
                else:
                    timestamp = None
            except:
                timestamp = None
            
            # Calculate time between phases
            time_since_previous = 0
            if previous_timestamp and timestamp:
                time_diff = timestamp - previous_timestamp
                time_since_previous = int(time_diff.total_seconds() * 1000)
            
            processed_phase = {
                'index': i,
                'timestamp': timestamp_str,
                'parsed_timestamp': timestamp,
                'formatted_time': self._format_timestamp(timestamp_str),
                'from_phase': from_phase,
                'to_phase': to_phase,
                'progress_type': progress_type,
                'duration_ms': duration_ms,
                'time_since_previous_ms': time_since_previous,
                'metadata': metadata
            }
            
            processed_phases.append(processed_phase)
            
            # Update statistics
            phase_counts[to_phase] += 1
            unique_phases.add(to_phase)
            if from_phase:
                unique_phases.add(from_phase)
            
            if duration_ms > 0:
                phase_durations[to_phase] = duration_ms
                total_duration += duration_ms
            
            previous_timestamp = timestamp
        
        # Calculate flow metrics
        flow_complexity = len(unique_phases)
        avg_phase_duration = total_duration / len(phase_durations) if phase_durations else 0
        transition_count = len(processed_phases)
        
        # Identify critical path (phases with longest durations)
        critical_phases = sorted(phase_durations.items(), key=lambda x: x[1], reverse=True)[:3]
        
        # Build phase sequence for flow diagram
        phase_sequence = []
        for phase in processed_phases:
            if phase['from_phase'] and phase['to_phase']:
                phase_sequence.append({
                    'from': phase['from_phase'],
                    'to': phase['to_phase'],
                    'type': phase['progress_type'],
                    'duration': phase['duration_ms']
                })
        
        # Detect flow patterns
        flow_patterns = self._analyze_flow_patterns(processed_phases)
        
        return {
            'processed_phases': processed_phases,
            'phase_sequence': phase_sequence,
            'unique_phases': list(unique_phases),
            'phase_counts': dict(phase_counts),
            'phase_durations': phase_durations,
            'critical_phases': critical_phases,
            'flow_patterns': flow_patterns,
            'metrics': {
                'total_phases': len(processed_phases),
                'unique_phases': flow_complexity,
                'total_duration_ms': total_duration,
                'avg_phase_duration_ms': round(avg_phase_duration, 1),
                'transition_count': transition_count,
                'completion_status': self._determine_completion_status(processed_phases)
            }
        }
    
    def _parse_timestamp(self, timestamp_str: str) -> Optional[datetime]:
        """Parse timestamp string to datetime object"""
        if not timestamp_str:
            return None
            
        try:
            if 'T' in timestamp_str:
                return datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            elif ',' in timestamp_str:
                return datetime.strptime(timestamp_str.split(',')[0], "%Y-%m-%d %H:%M:%S")
            else:
                return datetime.fromisoformat(timestamp_str)
        except (ValueError, AttributeError):
            return None
    
    def _analyze_flow_patterns(self, phases: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze flow patterns and detect common sequences"""
        patterns = {
            'linear_flow': True,
            'has_loops': False,
            'has_branches': False,
            'parallel_phases': [],
            'bottlenecks': []
        }
        
        phase_transitions = defaultdict(list)
        
        # Build transition map
        for phase in phases:
            from_phase = phase.get('from_phase')
            to_phase = phase.get('to_phase')
            
            if from_phase and to_phase:
                phase_transitions[from_phase].append(to_phase)
        
        # Detect branching (one phase leads to multiple phases)
        for from_phase, to_phases in phase_transitions.items():
            if len(set(to_phases)) > 1:
                patterns['has_branches'] = True
                patterns['linear_flow'] = False
        
        # Detect loops (revisiting phases)
        visited_phases = set()
        for phase in phases:
            to_phase = phase.get('to_phase')
            if to_phase in visited_phases:
                patterns['has_loops'] = True
                patterns['linear_flow'] = False
            visited_phases.add(to_phase)
        
        # Detect bottlenecks (phases that take significantly longer)
        durations = [p.get('duration_ms', 0) for p in phases if p.get('duration_ms', 0) > 0]
        if durations:
            avg_duration = sum(durations) / len(durations)
            for phase in phases:
                if phase.get('duration_ms', 0) > avg_duration * 2:
                    patterns['bottlenecks'].append(phase.get('to_phase'))
        
        return patterns
    
    def _determine_completion_status(self, phases: List[Dict[str, Any]]) -> str:
        """Determine investigation completion status"""
        if not phases:
            return 'not_started'
            
        last_phase = phases[-1]
        last_phase_name = last_phase.get('to_phase', '').lower()
        
        completion_indicators = ['complete', 'finished', 'done', 'concluded', 'final']
        error_indicators = ['error', 'failed', 'aborted', 'cancelled']
        
        if any(indicator in last_phase_name for indicator in completion_indicators):
            return 'completed'
        elif any(indicator in last_phase_name for indicator in error_indicators):
            return 'failed'
        else:
            return 'in_progress'
    
    def generate_html(self, processed_data: Dict[str, Any]) -> str:
        """
        Generate HTML for investigation flow component.
        """
        metrics = processed_data.get('metrics', {})
        processed_phases = processed_data.get('processed_phases', [])
        critical_phases = processed_data.get('critical_phases', [])
        flow_patterns = processed_data.get('flow_patterns', {})
        
        # Generate statistics section
        stats_html = ""
        stats_items = [
            ('Total Phases', metrics.get('total_phases', 0)),
            ('Unique Phases', metrics.get('unique_phases', 0)),
            ('Transitions', metrics.get('transition_count', 0)),
            ('Avg Duration', f"{metrics.get('avg_phase_duration_ms', 0):.0f}ms"),
            ('Status', metrics.get('completion_status', 'unknown').replace('_', ' ').title())
        ]
        
        for label, value in stats_items:
            stats_html += f"""
                <div class="viz-stat-item-{self.component_id}">
                    <div class="viz-stat-value-{self.component_id}">{value}</div>
                    <div class="viz-stat-label-{self.component_id}">{label}</div>
                </div>
            """
        
        # Generate flow diagram
        flow_diagram = self._generate_mermaid_diagram(processed_data)
        
        # Generate phase timeline table
        timeline_rows_html = ""
        for phase in processed_phases[:15]:  # Limit to first 15
            duration_display = f"{phase['duration_ms']}ms" if phase['duration_ms'] > 0 else "N/A"
            from_phase_display = phase['from_phase'] or "Initial"
            
            # Status badge based on progress type
            status_class = {
                'start': 'success',
                'progress': 'info', 
                'complete': 'success',
                'error': 'danger',
                'transition': 'info'
            }.get(phase['progress_type'], 'info')
            
            timeline_rows_html += f"""
                <tr class="phase-row-{self.component_id}" data-phase="{phase['to_phase']}">
                    <td>{phase['formatted_time']}</td>
                    <td>{from_phase_display}</td>
                    <td><strong>{phase['to_phase']}</strong></td>
                    <td><span class="status-badge-{self.component_id} status-{status_class}-{self.component_id}">{phase['progress_type']}</span></td>
                    <td>{duration_display}</td>
                </tr>
            """
        
        # Generate critical phases section
        critical_html = ""
        for phase_name, duration in critical_phases:
            critical_html += f"""
                <div class="critical-phase-{self.component_id}">
                    <span class="phase-name-{self.component_id}">{phase_name}</span>
                    <span class="phase-duration-{self.component_id}">{duration:,}ms</span>
                </div>
            """
        
        # Generate flow patterns summary
        patterns_html = ""
        pattern_items = [
            ('Linear Flow', '✅' if flow_patterns.get('linear_flow') else '❌'),
            ('Has Branches', '✅' if flow_patterns.get('has_branches') else '❌'),
            ('Has Loops', '✅' if flow_patterns.get('has_loops') else '❌'),
            ('Bottlenecks', len(flow_patterns.get('bottlenecks', [])))
        ]
        
        for label, value in pattern_items:
            patterns_html += f"""
                <div class="pattern-item-{self.component_id}">
                    <span class="pattern-label-{self.component_id}">{label}</span>
                    <span class="pattern-value-{self.component_id}">{value}</span>
                </div>
            """
        
        return f"""
        <div class="viz-component-{self.component_id} viz-animate-{self.component_id}">
            <div class="viz-header-{self.component_id}">
                🔄 {self.component_title}
            </div>
            <div class="viz-content-{self.component_id}">
                <div class="viz-stats-grid-{self.component_id}">
                    {stats_html}
                </div>
                
                <div class="mermaid-container-{self.component_id}">
                    <div class="mermaid">
                        {flow_diagram}
                    </div>
                </div>
                
                <div class="analysis-grid-{self.component_id}">
                    <div class="analysis-section-{self.component_id}">
                        <h4>Flow Patterns</h4>
                        <div class="patterns-list-{self.component_id}">
                            {patterns_html}
                        </div>
                    </div>
                    
                    <div class="analysis-section-{self.component_id}">
                        <h4>Critical Phases (Longest Duration)</h4>
                        <div class="critical-phases-list-{self.component_id}">
                            {critical_html}
                        </div>
                    </div>
                </div>
                
                <div class="timeline-table-section-{self.component_id}">
                    <h4>Phase Timeline</h4>
                    <div class="table-container-{self.component_id}">
                        <table class="phase-timeline-table-{self.component_id}">
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>From Phase</th>
                                    <th>To Phase</th>
                                    <th>Type</th>
                                    <th>Duration</th>
                                </tr>
                            </thead>
                            <tbody>
                                {timeline_rows_html}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        """
    
    def _generate_mermaid_diagram(self, processed_data: Dict[str, Any]) -> str:
        """Generate Mermaid flowchart diagram"""
        processed_phases = processed_data.get('processed_phases', [])
        
        if not processed_phases:
            return "graph TD\n    A[No Phase Data Available]"
        
        # Build the flow diagram
        diagram_lines = ["graph TD"]
        node_counter = 0
        node_map = {}  # Map phase names to node IDs
        
        # Add start node
        diagram_lines.append("    Start([Investigation Started])")
        previous_node = "Start"
        
        for phase in processed_phases:
            from_phase = phase.get('from_phase')
            to_phase = phase.get('to_phase', f'Phase_{phase["index"]}')
            progress_type = phase.get('progress_type', 'transition')
            
            # Create node ID for to_phase
            if to_phase not in node_map:
                node_counter += 1
                node_id = f"Node_{node_counter}"
                node_map[to_phase] = node_id
                
                # Determine node shape based on progress type
                if progress_type == 'start':
                    node_shape = f"({to_phase})"
                elif progress_type == 'complete':
                    node_shape = f"[{to_phase}]"
                elif progress_type == 'error':
                    node_shape = f"{{{to_phase}}}"
                else:
                    node_shape = f"[{to_phase}]"
                
                diagram_lines.append(f"    {node_id}{node_shape}")
            
            # Add connection
            to_node_id = node_map[to_phase]
            
            # Determine connection style based on progress type
            if progress_type == 'error':
                connection = f"    {previous_node} -.->|ERROR| {to_node_id}"
            elif progress_type == 'complete':
                connection = f"    {previous_node} ==>|COMPLETE| {to_node_id}"
            else:
                connection = f"    {previous_node} --> {to_node_id}"
            
            diagram_lines.append(connection)
            previous_node = to_node_id
        
        # Add end node if the last phase looks complete
        last_phase = processed_phases[-1]
        completion_status = processed_data.get('metrics', {}).get('completion_status', 'in_progress')
        
        if completion_status == 'completed':
            diagram_lines.append("    End([Investigation Completed])")
            diagram_lines.append(f"    {previous_node} --> End")
        elif completion_status == 'failed':
            diagram_lines.append("    Error{{Investigation Failed}}")
            diagram_lines.append(f"    {previous_node} -.-> Error")
        
        # Add styling
        diagram_lines.extend([
            "    classDef startEnd fill:#667eea,stroke:#333,stroke-width:2px,color:#fff",
            "    classDef process fill:#f9f9f9,stroke:#667eea,stroke-width:2px",
            "    classDef error fill:#dc3545,stroke:#333,stroke-width:2px,color:#fff",
            "    class Start,End startEnd",
            "    class Error error"
        ])
        
        return "\n".join(diagram_lines)
    
    def generate_javascript(self, processed_data: Dict[str, Any]) -> str:
        """
        Generate JavaScript for interactive flow diagram.
        """
        processed_phases = processed_data.get('processed_phases', [])
        
        return f"""
        // Investigation Flow Component
        (function() {{
            const phaseData = {json.dumps(processed_phases)};
            
            // Initialize Mermaid with custom configuration
            if (typeof mermaid !== 'undefined') {{
                mermaid.initialize({{
                    startOnLoad: true,
                    theme: 'default',
                    themeVariables: {{
                        primaryColor: '#667eea',
                        primaryTextColor: '#2c3e50',
                        primaryBorderColor: '#667eea',
                        lineColor: '#667eea',
                        secondaryColor: '#f8f9fa',
                        tertiaryColor: '#ffffff'
                    }},
                    flowchart: {{
                        htmlLabels: true,
                        curve: 'basis'
                    }}
                }});
            }}
            
            // Add click handlers for phase table rows
            document.querySelectorAll('.phase-row-{self.component_id}').forEach((row, index) => {{
                row.addEventListener('click', function() {{
                    const phase = phaseData[index];
                    if (phase) {{
                        // Highlight the corresponding phase
                        this.style.backgroundColor = '#667eea';
                        this.style.color = 'white';
                        
                        // Reset after delay
                        setTimeout(() => {{
                            this.style.backgroundColor = '';
                            this.style.color = '';
                        }}, 1500);
                        
                        console.log('Phase Details:', phase);
                    }}
                }});
                
                row.style.cursor = 'pointer';
            }});
            
            // Add hover effects for critical phases
            document.querySelectorAll('.critical-phase-{self.component_id}').forEach(phase => {{
                phase.addEventListener('mouseenter', function() {{
                    this.style.transform = 'scale(1.05)';
                }});
                
                phase.addEventListener('mouseleave', function() {{
                    this.style.transform = 'scale(1)';
                }});
            }});
            
            console.log('Investigation Flow Component loaded successfully');
        }})();
        """
    
    def generate_css(self) -> str:
        """
        Generate CSS styles for investigation flow component.
        """
        colors = self._get_theme_colors()
        base_css = super().generate_css()
        
        component_css = f"""
        .mermaid-container-{self.component_id} {{
            background: white;
            border-radius: 10px;
            padding: 30px;
            margin: 30px 0;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow-x: auto;
        }}
        
        .analysis-grid-{self.component_id} {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 30px 0;
        }}
        
        .analysis-section-{self.component_id} h4 {{
            color: {colors['primary']};
            margin-bottom: 15px;
            font-size: 1.1em;
            font-weight: 600;
        }}
        
        .patterns-list-{self.component_id}, .critical-phases-list-{self.component_id} {{
            background: {colors['light']};
            border-radius: 8px;
            padding: 15px;
        }}
        
        .pattern-item-{self.component_id}, .critical-phase-{self.component_id} {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid {colors['border']};
            transition: all 0.3s ease;
        }}
        
        .pattern-item-{self.component_id}:last-child, .critical-phase-{self.component_id}:last-child {{
            border-bottom: none;
        }}
        
        .pattern-item-{self.component_id}:hover, .critical-phase-{self.component_id}:hover {{
            background: {colors['background']};
            border-radius: 4px;
        }}
        
        .pattern-label-{self.component_id}, .phase-name-{self.component_id} {{
            font-weight: 500;
        }}
        
        .pattern-value-{self.component_id}, .phase-duration-{self.component_id} {{
            background: {colors['primary']};
            color: white;
            padding: 3px 8px;
            border-radius: 10px;
            font-size: 0.9em;
            font-weight: 600;
        }}
        
        .timeline-table-section-{self.component_id} {{
            margin-top: 30px;
        }}
        
        .timeline-table-section-{self.component_id} h4 {{
            color: {colors['primary']};
            margin-bottom: 20px;
            font-size: 1.2em;
            font-weight: 600;
        }}
        
        .table-container-{self.component_id} {{
            overflow-x: auto;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        
        .phase-timeline-table-{self.component_id} {{
            width: 100%;
            border-collapse: collapse;
            background: white;
            margin: 0;
        }}
        
        .phase-timeline-table-{self.component_id} th {{
            background: {colors['primary']};
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            font-size: 0.95em;
        }}
        
        .phase-timeline-table-{self.component_id} td {{
            padding: 10px 12px;
            border-bottom: 1px solid {colors['border']};
        }}
        
        .phase-row-{self.component_id}:hover {{
            background: {colors['light']};
        }}
        
        .phase-timeline-table-{self.component_id} tr:last-child td {{
            border-bottom: none;
        }}
        
        .status-badge-{self.component_id} {{
            display: inline-block;
            padding: 4px 8px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 0.8em;
            text-transform: uppercase;
        }}
        
        .status-success-{self.component_id} {{
            background: {colors['success']};
            color: white;
        }}
        
        .status-info-{self.component_id} {{
            background: {colors['info']};
            color: white;
        }}
        
        .status-danger-{self.component_id} {{
            background: {colors['danger']};
            color: white;
        }}
        
        @media (max-width: 768px) {{
            .analysis-grid-{self.component_id} {{
                grid-template-columns: 1fr;
                gap: 15px;
            }}
            
            .mermaid-container-{self.component_id} {{
                padding: 20px;
                overflow-x: scroll;
            }}
            
            .phase-timeline-table-{self.component_id} {{
                font-size: 0.9em;
            }}
        }}
        """
        
        return base_css + component_css
