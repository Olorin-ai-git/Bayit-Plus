#!/usr/bin/env python3
"""
LangGraph Visualization Component

Generates interactive Mermaid network diagram showing LangGraph node execution flow,
state transitions, and agent coordination patterns.

Features:
- Interactive Mermaid.js network diagram with node relationships
- Node execution timeline with performance metrics
- State transition analysis and flow patterns
- Agent coordination visualization
- Performance bottleneck identification
- Interactive hover states with detailed node information
- Execution path highlighting and flow analysis
"""

import json
import statistics
from typing import Dict, List, Any, Optional, Set, Tuple
from datetime import datetime
from collections import defaultdict, Counter

from .base_component import BaseVisualizationComponent

class LangGraphVisualizationComponent(BaseVisualizationComponent):
    """
    Interactive LangGraph execution visualization component.
    
    Displays comprehensive LangGraph node execution flow with network diagrams,
    performance metrics, and state transition analysis.
    """
    
    @property
    def component_name(self) -> str:
        return "langgraph_visualization"
        
    @property
    def component_title(self) -> str:
        return "LangGraph Execution Flow"
        
    @property
    def component_description(self) -> str:
        return "Interactive network diagram showing LangGraph node execution, state transitions, and coordination"
    
    def validate_data(self, data: Dict[str, Any]) -> bool:
        """
        Validate LangGraph data.
        
        Expected data structure:
        {
            'langgraph_nodes': [
                {
                    'timestamp': str,
                    'node_name': str,
                    'node_type': str,
                    'node_id': str,
                    'execution_time_ms': int,
                    'next_nodes': [str],
                    'input_data': dict,
                    'output_data': dict,
                    'success': bool,
                    'error_message': str | None
                }
            ]
        }
        """
        if not isinstance(data, dict):
            self._add_error("Data must be a dictionary")
            return False
            
        langgraph_nodes = data.get('langgraph_nodes', [])
        if not isinstance(langgraph_nodes, list):
            self._add_error("langgraph_nodes must be a list")
            return False
            
        if not langgraph_nodes:
            self._add_warning("No LangGraph nodes found")
            return True
            
        # Validate sample nodes
        for i, node in enumerate(langgraph_nodes[:3]):
            if not isinstance(node, dict):
                self._add_error(f"LangGraph node {i} must be a dictionary")
                return False
                
            required_fields = ['node_name', 'node_type']
            for field in required_fields:
                if field not in node:
                    self._add_warning(f"LangGraph node {i} missing field: {field}")
                    
        return True
    
    def process_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process LangGraph data for visualization.
        """
        langgraph_nodes = data.get('langgraph_nodes', [])
        
        if not langgraph_nodes:
            return {}
            
        # Limit data points for performance
        if len(langgraph_nodes) > self.config.max_data_points:
            langgraph_nodes = langgraph_nodes[:self.config.max_data_points]
            self._add_warning(f"Limited to {self.config.max_data_points} nodes for performance")
        
        # Process individual nodes
        processed_nodes = []
        node_stats = defaultdict(lambda: {
            'executions': 0,
            'total_time': 0,
            'success_count': 0,
            'error_count': 0,
            'execution_times': []
        })
        
        for i, node in enumerate(langgraph_nodes):
            timestamp = node.get('timestamp', '')
            node_name = node.get('node_name', f'Node_{i}')
            node_type = node.get('node_type', 'Unknown')
            node_id = node.get('node_id', f'id_{i}')
            execution_time = node.get('execution_time_ms', 0)
            next_nodes = node.get('next_nodes', [])
            input_data = node.get('input_data', {})
            output_data = node.get('output_data', {})
            success = node.get('success', True)
            error_message = node.get('error_message')
            
            processed_node = {
                'index': i,
                'timestamp': timestamp,
                'formatted_time': self._format_timestamp(timestamp),
                'node_name': node_name,
                'node_type': node_type,
                'node_id': node_id,
                'execution_time_ms': execution_time,
                'next_nodes': next_nodes if isinstance(next_nodes, list) else [],
                'input_data': input_data,
                'output_data': output_data,
                'success': success,
                'error_message': error_message,
                'input_size': len(str(input_data)) if input_data else 0,
                'output_size': len(str(output_data)) if output_data else 0,
                'has_next_nodes': bool(next_nodes),
                'performance_category': self._categorize_performance(execution_time)
            }
            
            processed_nodes.append(processed_node)
            
            # Update statistics
            node_stats[node_name]['executions'] += 1
            node_stats[node_name]['total_time'] += execution_time
            if success:
                node_stats[node_name]['success_count'] += 1
            else:
                node_stats[node_name]['error_count'] += 1
            
            if execution_time > 0:
                node_stats[node_name]['execution_times'].append(execution_time)
        
        # Build execution graph
        execution_graph = self._build_execution_graph(processed_nodes)
        
        # Analyze execution patterns
        execution_patterns = self._analyze_execution_patterns(processed_nodes)
        
        # Calculate performance metrics
        performance_metrics = self._calculate_performance_metrics(processed_nodes, node_stats)
        
        # Identify critical paths
        critical_paths = self._identify_critical_paths(processed_nodes)
        
        # Generate execution insights
        execution_insights = self._generate_execution_insights(processed_nodes, performance_metrics, execution_patterns)
        
        return {
            'processed_nodes': processed_nodes,
            'execution_graph': execution_graph,
            'node_statistics': dict(node_stats),
            'execution_patterns': execution_patterns,
            'performance_metrics': performance_metrics,
            'critical_paths': critical_paths,
            'execution_insights': execution_insights,
            'metrics': {
                'total_nodes_executed': len(processed_nodes),
                'unique_node_types': len(set(node['node_type'] for node in processed_nodes)),
                'unique_node_names': len(set(node['node_name'] for node in processed_nodes)),
                'total_execution_time_ms': sum(node['execution_time_ms'] for node in processed_nodes),
                'avg_execution_time_ms': statistics.mean([node['execution_time_ms'] for node in processed_nodes if node['execution_time_ms'] > 0]) if processed_nodes else 0,
                'success_rate': (sum(1 for node in processed_nodes if node['success']) / len(processed_nodes)) * 100 if processed_nodes else 0,
                'error_count': sum(1 for node in processed_nodes if not node['success']),
                'max_execution_time_ms': max((node['execution_time_ms'] for node in processed_nodes), default=0),
                'nodes_with_transitions': len([node for node in processed_nodes if node['has_next_nodes']])
            }
        }
    
    def _categorize_performance(self, execution_time: int) -> str:
        """Categorize node performance based on execution time"""
        if execution_time == 0:
            return 'unknown'
        elif execution_time < 100:
            return 'fast'
        elif execution_time < 1000:
            return 'medium'
        elif execution_time < 5000:
            return 'slow'
        else:
            return 'very_slow'
    
    def _build_execution_graph(self, nodes: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Build execution graph structure"""
        # Create node map
        node_map = {}
        for node in nodes:
            node_id = node['node_id']
            node_map[node_id] = {
                'id': node_id,
                'name': node['node_name'],
                'type': node['node_type'],
                'execution_time': node['execution_time_ms'],
                'success': node['success'],
                'performance_category': node['performance_category']
            }
        
        # Create edges
        edges = []
        edge_id = 0
        
        for node in nodes:
            source_id = node['node_id']
            for next_node in node['next_nodes']:
                # Find the actual node ID for this node name
                target_id = None
                for n in nodes:
                    if n['node_name'] == next_node:
                        target_id = n['node_id']
                        break
                
                if target_id and source_id != target_id:
                    edges.append({
                        'id': f'edge_{edge_id}',
                        'source': source_id,
                        'target': target_id,
                        'type': 'transition'
                    })
                    edge_id += 1
        
        return {
            'nodes': list(node_map.values()),
            'edges': edges,
            'node_count': len(node_map),
            'edge_count': len(edges)
        }
    
    def _analyze_execution_patterns(self, nodes: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze execution patterns in the graph"""
        patterns = {
            'execution_sequence': 'linear',
            'branching_factor': 0,
            'parallel_executions': [],
            'execution_clusters': {},
            'bottlenecks': []
        }
        
        if not nodes:
            return patterns
            
        # Analyze branching
        node_with_multiple_next = [node for node in nodes if len(node['next_nodes']) > 1]
        if node_with_multiple_next:
            patterns['execution_sequence'] = 'branching'
            patterns['branching_factor'] = max(len(node['next_nodes']) for node in node_with_multiple_next)
        
        # Look for parallel executions (nodes with same timestamp)
        timestamp_groups = defaultdict(list)
        for node in nodes:
            if node['timestamp']:
                timestamp_groups[node['timestamp']].append(node['node_name'])
        
        patterns['parallel_executions'] = [group for group in timestamp_groups.values() if len(group) > 1]
        
        # Identify performance bottlenecks
        execution_times = [node['execution_time_ms'] for node in nodes if node['execution_time_ms'] > 0]
        if execution_times:
            avg_time = statistics.mean(execution_times)
            threshold = avg_time * 2  # 2x average execution time
            
            bottlenecks = [
                {
                    'node_name': node['node_name'],
                    'execution_time_ms': node['execution_time_ms'],
                    'slowdown_factor': node['execution_time_ms'] / avg_time if avg_time > 0 else 1
                }
                for node in nodes
                if node['execution_time_ms'] > threshold
            ]
            patterns['bottlenecks'] = sorted(bottlenecks, key=lambda x: x['execution_time_ms'], reverse=True)
        
        return patterns
    
    def _calculate_performance_metrics(self, nodes: List[Dict], node_stats: Dict) -> Dict[str, Any]:
        """Calculate comprehensive performance metrics"""
        if not nodes:
            return {}
            
        execution_times = [node['execution_time_ms'] for node in nodes if node['execution_time_ms'] > 0]
        
        metrics = {
            'total_execution_time': sum(execution_times),
            'avg_execution_time': statistics.mean(execution_times) if execution_times else 0,
            'median_execution_time': statistics.median(execution_times) if execution_times else 0,
            'execution_time_std': statistics.stdev(execution_times) if len(execution_times) > 1 else 0,
            'performance_distribution': {},
            'node_efficiency_scores': {}
        }
        
        # Performance distribution
        perf_categories = Counter(node['performance_category'] for node in nodes)
        metrics['performance_distribution'] = dict(perf_categories)
        
        # Node efficiency scores (considering execution count and average time)
        for node_name, stats in node_stats.items():
            avg_time = stats['total_time'] / stats['executions'] if stats['executions'] > 0 else 0
            success_rate = stats['success_count'] / stats['executions'] if stats['executions'] > 0 else 0
            
            # Efficiency score: higher success rate and lower execution time = better
            if avg_time > 0:
                efficiency = (success_rate * 100) / (avg_time / 1000)  # Success rate per second
            else:
                efficiency = success_rate * 100
            
            metrics['node_efficiency_scores'][node_name] = round(efficiency, 2)
        
        return metrics
    
    def _identify_critical_paths(self, nodes: List[Dict]) -> List[Dict[str, Any]]:
        """Identify critical execution paths"""
        paths = []
        
        if not nodes:
            return paths
            
        # Find paths with high execution times
        high_time_nodes = [node for node in nodes if node['execution_time_ms'] > 1000]
        
        for node in high_time_nodes[:5]:  # Top 5 critical nodes
            path = {
                'node_name': node['node_name'],
                'execution_time_ms': node['execution_time_ms'],
                'criticality': 'high' if node['execution_time_ms'] > 5000 else 'medium',
                'next_nodes': node['next_nodes'],
                'impact_factor': node['execution_time_ms'] / 1000  # Impact in seconds
            }
            paths.append(path)
        
        return sorted(paths, key=lambda x: x['execution_time_ms'], reverse=True)
    
    def _generate_execution_insights(self, nodes: List[Dict], metrics: Dict, patterns: Dict) -> List[Dict[str, Any]]:
        """Generate insights about execution patterns"""
        insights = []
        
        if not nodes:
            return insights
            
        # Execution efficiency insight
        success_rate = sum(1 for node in nodes if node['success']) / len(nodes) * 100
        if success_rate >= 95:
            insights.append({
                'type': 'execution_efficiency',
                'title': 'High Success Rate',
                'description': f"Excellent execution with {success_rate:.1f}% success rate across {len(nodes)} nodes",
                'severity': 'success'
            })
        elif success_rate < 85:
            insights.append({
                'type': 'execution_efficiency',
                'title': 'Execution Issues Detected',
                'description': f"Lower success rate of {success_rate:.1f}% indicates potential execution issues",
                'severity': 'warning'
            })
        
        # Performance bottleneck insight
        bottlenecks = patterns.get('bottlenecks', [])
        if bottlenecks:
            high_impact = [b for b in bottlenecks if b['slowdown_factor'] > 5]
            insights.append({
                'type': 'performance_bottlenecks',
                'title': 'Performance Bottlenecks',
                'description': f"Found {len(bottlenecks)} slow nodes ({len(high_impact)} high impact)",
                'severity': 'high' if high_impact else 'medium',
                'details': bottlenecks[:3]
            })
        
        # Execution complexity insight
        if patterns.get('execution_sequence') == 'branching':
            branching_factor = patterns.get('branching_factor', 0)
            insights.append({
                'type': 'execution_complexity',
                'title': 'Complex Execution Flow',
                'description': f"Branching execution with max {branching_factor} parallel paths",
                'severity': 'info'
            })
        
        # Parallel execution insight
        parallel_executions = patterns.get('parallel_executions', [])
        if parallel_executions:
            total_parallel = sum(len(group) for group in parallel_executions)
            insights.append({
                'type': 'parallel_execution',
                'title': 'Parallel Processing Detected',
                'description': f"Found {total_parallel} nodes executing in parallel across {len(parallel_executions)} time slots",
                'severity': 'info'
            })
        
        return insights
    
    def generate_html(self, processed_data: Dict[str, Any]) -> str:
        """
        Generate HTML for LangGraph visualization component.
        """
        processed_nodes = processed_data.get('processed_nodes', [])
        execution_graph = processed_data.get('execution_graph', {})
        performance_metrics = processed_data.get('performance_metrics', {})
        critical_paths = processed_data.get('critical_paths', [])
        execution_insights = processed_data.get('execution_insights', [])
        metrics = processed_data.get('metrics', {})
        
        # Generate statistics section
        stats_html = ""
        stats_items = [
            ('Nodes Executed', metrics.get('total_nodes_executed', 0)),
            ('Unique Types', metrics.get('unique_node_types', 0)),
            ('Success Rate', f"{metrics.get('success_rate', 0):.1f}%"),
            ('Total Time', f"{metrics.get('total_execution_time_ms', 0):,}ms"),
            ('Avg Time', f"{metrics.get('avg_execution_time_ms', 0):.0f}ms"),
            ('Errors', metrics.get('error_count', 0))
        ]
        
        for label, value in stats_items:
            stats_html += f"""
                <div class="viz-stat-item-{self.component_id}">
                    <div class="viz-stat-value-{self.component_id}">{value}</div>
                    <div class="viz-stat-label-{self.component_id}">{label}</div>
                </div>
            """
        
        # Generate Mermaid diagram
        mermaid_diagram = self._generate_mermaid_diagram(execution_graph, processed_nodes)
        
        # Generate node performance table
        nodes_table_html = ""
        for node in processed_nodes[:15]:  # Top 15 nodes
            perf_class = self._get_performance_class(node['performance_category'])
            success_icon = '✅' if node['success'] else '❌'
            next_nodes_display = ', '.join(node['next_nodes'][:3]) if node['next_nodes'] else 'None'
            if len(node['next_nodes']) > 3:
                next_nodes_display += f' (+{len(node["next_nodes"]) - 3})'
            
            nodes_table_html += f"""
                <tr class="node-row-{self.component_id}" data-node="{node['node_name']}">
                    <td><strong>{node['node_name']}</strong></td>
                    <td>{node['node_type']}</td>
                    <td>{node['formatted_time']}</td>
                    <td><span class="perf-badge-{self.component_id} {perf_class}-{self.component_id}">{node['execution_time_ms']}ms</span></td>
                    <td>{success_icon}</td>
                    <td class="next-nodes-{self.component_id}">{next_nodes_display}</td>
                </tr>
            """
        
        # Generate critical paths section
        critical_paths_html = ""
        for path in critical_paths[:5]:
            criticality_class = path.get('criticality', 'medium')
            critical_paths_html += f"""
                <div class="critical-path-{self.component_id} {criticality_class}-{self.component_id}">
                    <div class="path-name-{self.component_id}">{path['node_name']}</div>
                    <div class="path-metrics-{self.component_id}">
                        <span class="path-time-{self.component_id}">{path['execution_time_ms']:,}ms</span>
                        <span class="path-impact-{self.component_id}">Impact: {path['impact_factor']:.1f}s</span>
                    </div>
                    <div class="path-next-{self.component_id}">
                        Next: {', '.join(path['next_nodes'][:2]) if path['next_nodes'] else 'End'}
                    </div>
                </div>
            """
        
        # Generate insights section
        insights_html = ""
        for insight in execution_insights:
            severity_class = insight.get('severity', 'info')
            insights_html += f"""
                <div class="insight-item-{self.component_id} {severity_class}-{self.component_id}">
                    <div class="insight-title-{self.component_id}">{insight['title']}</div>
                    <div class="insight-description-{self.component_id}">{insight['description']}</div>
                </div>
            """
        
        return f"""
        <div class="viz-component-{self.component_id} viz-animate-{self.component_id}">
            <div class="viz-header-{self.component_id}">
                📊 {self.component_title}
            </div>
            <div class="viz-content-{self.component_id}">
                <div class="viz-stats-grid-{self.component_id}">
                    {stats_html}
                </div>
                
                <div class="mermaid-container-{self.component_id}">
                    <div class="mermaid">
                        {mermaid_diagram}
                    </div>
                </div>
                
                <div class="analysis-grid-{self.component_id}">
                    <div class="analysis-section-{self.component_id}">
                        <h4>Execution Performance Chart</h4>
                        <div class="viz-chart-container-{self.component_id} chart-small">
                            <canvas id="langgraphChart_{self.component_id}"></canvas>
                        </div>
                    </div>
                    
                    {f'''
                    <div class="analysis-section-{self.component_id}">
                        <h4>Critical Execution Paths</h4>
                        <div class="critical-paths-list-{self.component_id}">
                            {critical_paths_html}
                        </div>
                    </div>
                    ''' if critical_paths_html else ''}
                </div>
                
                <div class="nodes-table-section-{self.component_id}">
                    <h4>Node Execution Details</h4>
                    <div class="table-container-{self.component_id}">
                        <table class="nodes-table-{self.component_id}">
                            <thead>
                                <tr>
                                    <th>Node Name</th>
                                    <th>Type</th>
                                    <th>Executed At</th>
                                    <th>Duration</th>
                                    <th>Status</th>
                                    <th>Next Nodes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {nodes_table_html}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                {f'''
                <div class="insights-section-{self.component_id}">
                    <h4>Execution Insights</h4>
                    <div class="insights-list-{self.component_id}">
                        {insights_html}
                    </div>
                </div>
                ''' if insights_html else ''}
            </div>
        </div>
        """
    
    def _generate_mermaid_diagram(self, execution_graph: Dict, nodes: List[Dict]) -> str:
        """Generate Mermaid network diagram"""
        if not execution_graph.get('nodes'):
            return "graph TD\n    A[No LangGraph Data Available]"
            
        diagram_lines = ["graph TD"]
        
        # Add nodes
        for node in execution_graph['nodes']:
            node_id = node['id']
            node_name = node['name']
            node_type = node['type']
            
            # Determine node shape based on performance
            perf_category = node.get('performance_category', 'medium')
            if perf_category == 'fast':
                node_shape = f"({node_name})"
            elif perf_category in ['slow', 'very_slow']:
                node_shape = f"{{{node_name}}}"
            elif not node['success']:
                node_shape = f"[{node_name}]"
            else:
                node_shape = f"[{node_name}]"
                
            diagram_lines.append(f"    {node_id}{node_shape}")
        
        # Add edges
        for edge in execution_graph.get('edges', []):
            source = edge['source']
            target = edge['target']
            diagram_lines.append(f"    {source} --> {target}")
        
        # Add styling
        diagram_lines.extend([
            "    classDef fast fill:#28a745,stroke:#fff,stroke-width:2px,color:#fff",
            "    classDef medium fill:#17a2b8,stroke:#fff,stroke-width:2px,color:#fff",
            "    classDef slow fill:#ffc107,stroke:#333,stroke-width:2px,color:#333",
            "    classDef error fill:#dc3545,stroke:#fff,stroke-width:2px,color:#fff"
        ])
        
        return "\n".join(diagram_lines)
    
    def _get_performance_class(self, performance_category: str) -> str:
        """Get CSS class for performance category"""
        return {
            'fast': 'fast',
            'medium': 'medium',
            'slow': 'slow',
            'very_slow': 'very-slow',
            'unknown': 'unknown'
        }.get(performance_category, 'medium')
    
    def generate_javascript(self, processed_data: Dict[str, Any]) -> str:
        """
        Generate JavaScript for interactive LangGraph chart.
        """
        processed_nodes = processed_data.get('processed_nodes', [])
        metrics = processed_data.get('metrics', {})
        
        # Prepare chart data for node execution times
        node_names = [node['node_name'] for node in processed_nodes[:10]]  # Top 10 nodes
        execution_times = [node['execution_time_ms'] for node in processed_nodes[:10]]
        
        chart_data = {
            'labels': node_names,
            'datasets': [{
                'label': 'Execution Time (ms)',
                'data': execution_times,
                'backgroundColor': [self._get_node_color(node['performance_category']) for node in processed_nodes[:10]],
                'borderColor': 'rgba(102, 126, 234, 0.8)',
                'borderWidth': 1
            }]
        }
        
        return f"""
        // LangGraph Visualization Component
        (function() {{
            const nodesData = {json.dumps(processed_nodes)};
            
            // LangGraph Execution Chart
            const langgraphCtx = document.getElementById('langgraphChart_{self.component_id}');
            if (langgraphCtx) {{
                new Chart(langgraphCtx.getContext('2d'), {{
                    type: 'bar',
                    data: {json.dumps(chart_data)},
                    options: {{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {{
                            title: {{
                                display: true,
                                text: 'Node Execution Times',
                                font: {{ size: 16, weight: 'bold' }}
                            }},
                            legend: {{
                                display: false
                            }},
                            tooltip: {{
                                callbacks: {{
                                    afterBody: function(context) {{
                                        const index = context[0].dataIndex;
                                        const node = nodesData[index];
                                        if (node) {{
                                            return [
                                                `Type: ${{node.node_type}}`,
                                                `Success: ${{node.success ? 'Yes' : 'No'}}`,
                                                `Next Nodes: ${{node.next_nodes.length}}`,
                                                `Input Size: ${{node.input_size}} chars`,
                                                `Output Size: ${{node.output_size}} chars`
                                            ];
                                        }}
                                        return [];
                                    }}
                                }}
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
                        }},
                        animation: {{
                            duration: {1000 if self.config.enable_animations else 0}
                        }}
                    }}
                }});
            }}
            
            // Initialize Mermaid with custom configuration
            if (typeof mermaid !== 'undefined') {{
                mermaid.initialize({{
                    startOnLoad: true,
                    theme: 'default',
                    themeVariables: {{
                        primaryColor: '#667eea',
                        primaryTextColor: '#2c3e50',
                        primaryBorderColor: '#667eea',
                        lineColor: '#667eea'
                    }},
                    flowchart: {{
                        htmlLabels: true,
                        curve: 'basis'
                    }}
                }});
            }}
            
            // Add click handlers for node table rows
            document.querySelectorAll('.node-row-{self.component_id}').forEach((row, index) => {{
                row.addEventListener('click', function() {{
                    const node = nodesData[index];
                    if (node) {{
                        console.log('LangGraph Node Details:', node);
                        
                        // Highlight effect
                        this.style.backgroundColor = '#667eea';
                        this.style.color = 'white';
                        setTimeout(() => {{
                            this.style.backgroundColor = '';
                            this.style.color = '';
                        }}, 1500);
                    }}
                }});
                row.style.cursor = 'pointer';
            }});
            
            // Add hover effects for critical paths
            document.querySelectorAll('.critical-path-{self.component_id}').forEach(path => {{
                path.addEventListener('mouseenter', function() {{
                    this.style.transform = 'translateX(3px)';
                    this.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                }});
                
                path.addEventListener('mouseleave', function() {{
                    this.style.transform = 'translateX(0)';
                    this.style.boxShadow = '';
                }});
            }});
            
            console.log('LangGraph Visualization Component loaded successfully');
        }})();
        """
    
    def _get_node_color(self, performance_category: str) -> str:
        """Get color for node based on performance"""
        colors = {
            'fast': '#28a745',      # Green
            'medium': '#17a2b8',    # Blue
            'slow': '#ffc107',      # Yellow
            'very_slow': '#fd7e14', # Orange
            'unknown': '#6c757d'    # Gray
        }
        return colors.get(performance_category, '#667eea')
    
    def generate_css(self) -> str:
        """
        Generate CSS styles for LangGraph visualization component.
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
            min-height: 400px;
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
        
        .chart-small {{
            height: 300px;
        }}
        
        .critical-paths-list-{self.component_id} {{
            max-height: 300px;
            overflow-y: auto;
        }}
        
        .critical-path-{self.component_id} {{
            background: {colors['light']};
            border-radius: 8px;
            padding: 15px;
            margin: 10px 0;
            border-left: 4px solid;
            transition: all 0.3s ease;
        }}
        
        .critical-path-{self.component_id}:hover {{
            cursor: pointer;
        }}
        
        .high-{self.component_id} {{ border-left-color: {colors['danger']}; }}
        .medium-{self.component_id} {{ border-left-color: {colors['warning']}; }}
        .low-{self.component_id} {{ border-left-color: {colors['info']}; }}
        
        .path-name-{self.component_id} {{
            font-weight: 600;
            color: {colors['text']};
            margin-bottom: 8px;
            font-size: 1.05em;
        }}
        
        .path-metrics-{self.component_id} {{
            display: flex;
            gap: 15px;
            margin-bottom: 5px;
        }}
        
        .path-time-{self.component_id} {{
            background: {colors['danger']};
            color: white;
            padding: 3px 8px;
            border-radius: 10px;
            font-size: 0.85em;
            font-weight: 600;
        }}
        
        .path-impact-{self.component_id} {{
            background: {colors['warning']};
            color: #333;
            padding: 3px 8px;
            border-radius: 10px;
            font-size: 0.85em;
            font-weight: 600;
        }}
        
        .path-next-{self.component_id} {{
            color: {colors['text']};
            font-size: 0.9em;
            opacity: 0.8;
        }}
        
        .nodes-table-section-{self.component_id} {{
            margin-top: 30px;
        }}
        
        .nodes-table-section-{self.component_id} h4 {{
            color: {colors['primary']};
            margin-bottom: 20px;
            font-size: 1.2em;
            font-weight: 600;
        }}
        
        .table-container-{self.component_id} {{
            overflow-x: auto;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-height: 400px;
            overflow-y: auto;
        }}
        
        .nodes-table-{self.component_id} {{
            width: 100%;
            border-collapse: collapse;
            background: white;
            font-size: 0.9em;
        }}
        
        .nodes-table-{self.component_id} th {{
            background: {colors['primary']};
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: 600;
            font-size: 0.9em;
            position: sticky;
            top: 0;
            z-index: 10;
        }}
        
        .nodes-table-{self.component_id} td {{
            padding: 10px 8px;
            border-bottom: 1px solid {colors['border']};
        }}
        
        .node-row-{self.component_id}:hover {{
            background: {colors['light']};
        }}
        
        .perf-badge-{self.component_id} {{
            display: inline-block;
            padding: 3px 6px;
            border-radius: 10px;
            font-weight: 600;
            font-size: 0.8em;
            color: white;
        }}
        
        .fast-{self.component_id} {{ background: #28a745; }}
        .medium-{self.component_id} {{ background: #17a2b8; }}
        .slow-{self.component_id} {{ background: #ffc107; color: #333; }}
        .very-slow-{self.component_id} {{ background: #fd7e14; }}
        .unknown-{self.component_id} {{ background: #6c757d; }}
        
        .next-nodes-{self.component_id} {{
            font-size: 0.85em;
            color: {colors['text']};
            opacity: 0.8;
        }}
        
        .insights-section-{self.component_id} {{
            margin-top: 30px;
        }}
        
        .insights-section-{self.component_id} h4 {{
            color: {colors['primary']};
            margin-bottom: 15px;
            font-size: 1.2em;
            font-weight: 600;
        }}
        
        .insights-list-{self.component_id} {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 15px;
        }}
        
        .insight-item-{self.component_id} {{
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid;
        }}
        
        .success-{self.component_id} {{
            background: rgba(40, 167, 69, 0.1);
            border-left-color: {colors['success']};
        }}
        
        .warning-{self.component_id} {{
            background: rgba(255, 193, 7, 0.1);
            border-left-color: {colors['warning']};
        }}
        
        .info-{self.component_id} {{
            background: rgba(23, 162, 184, 0.1);
            border-left-color: {colors['info']};
        }}
        
        .high-{self.component_id} {{
            background: rgba(220, 53, 69, 0.1);
            border-left-color: {colors['danger']};
        }}
        
        .insight-title-{self.component_id} {{
            font-weight: 600;
            color: {colors['text']};
            margin-bottom: 8px;
        }}
        
        .insight-description-{self.component_id} {{
            color: {colors['text']};
            font-size: 0.9em;
            line-height: 1.4;
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
            
            .nodes-table-{self.component_id} {{
                font-size: 0.8em;
            }}
            
            .insights-list-{self.component_id} {{
                grid-template-columns: 1fr;
            }}
        }}
        """
        
        return base_css + component_css
