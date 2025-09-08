#!/usr/bin/env python3
"""
LLM Interactions Timeline Component

Generates interactive timeline visualization showing LLM interactions over time,
including token usage, agent activity, model performance, and reasoning chains.

Features:
- Interactive Chart.js timeline with token usage progression
- Detailed interaction cards with hover effects
- Agent and model breakdowns
- Performance metrics visualization
- Responsive design with mobile optimization
- Accessible tooltips and keyboard navigation
"""

import json
import statistics
from typing import Dict, List, Any, Optional
from datetime import datetime
from collections import Counter, defaultdict

from .base_component import BaseVisualizationComponent

class LLMTimelineComponent(BaseVisualizationComponent):
    """
    Interactive LLM interactions timeline component.
    
    Displays LLM interactions over time with detailed metrics,
    interactive charts, and comprehensive breakdowns.
    """
    
    @property
    def component_name(self) -> str:
        return "llm_timeline"
        
    @property
    def component_title(self) -> str:
        return "LLM Interactions Timeline"
        
    @property
    def component_description(self) -> str:
        return "Interactive timeline showing LLM interactions, token usage, and agent activity over time"
    
    def validate_data(self, data: Dict[str, Any]) -> bool:
        """
        Validate LLM interactions data.
        
        Expected data structure:
        {
            'llm_interactions': [
                {
                    'timestamp': str,
                    'agent_name': str,
                    'model_name': str,
                    'tokens_used': {'total_tokens': int, 'prompt_tokens': int, 'completion_tokens': int},
                    'tools_used': [str],
                    'reasoning_chain': str,
                    'response_time_ms': int,
                    'confidence_score': float,
                    'success': bool
                }
            ]
        }
        """
        if not isinstance(data, dict):
            self._add_error("Data must be a dictionary")
            return False
            
        interactions = data.get('llm_interactions', [])
        if not isinstance(interactions, list):
            self._add_error("llm_interactions must be a list")
            return False
            
        if not interactions:
            self._add_warning("No LLM interactions found")
            return True  # Empty data is valid, just shows empty state
            
        # Validate sample interactions
        for i, interaction in enumerate(interactions[:5]):  # Check first 5
            if not isinstance(interaction, dict):
                self._add_error(f"Interaction {i} must be a dictionary")
                return False
                
            required_fields = ['timestamp', 'agent_name', 'model_name']
            for field in required_fields:
                if field not in interaction:
                    self._add_warning(f"Interaction {i} missing field: {field}")
                    
        return True
    
    def process_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process LLM interactions data for visualization.
        """
        interactions = data.get('llm_interactions', [])
        
        if not interactions:
            return {}
            
        # Limit data points for performance
        if len(interactions) > self.config.max_data_points:
            interactions = interactions[:self.config.max_data_points]
            self._add_warning(f"Limited to {self.config.max_data_points} interactions for performance")
        
        # Process timeline data
        timeline_data = []
        token_progression = []
        agent_stats = Counter()
        model_stats = Counter()
        response_times = []
        success_count = 0
        
        for i, interaction in enumerate(interactions):
            # Extract basic info
            timestamp = interaction.get('timestamp', '')
            agent_name = interaction.get('agent_name', 'Unknown')
            model_name = interaction.get('model_name', 'Unknown')
            tokens_used = interaction.get('tokens_used', {})
            tools_used = interaction.get('tools_used', [])
            reasoning = interaction.get('reasoning_chain', '')
            response_time = interaction.get('response_time_ms', 0)
            confidence = interaction.get('confidence_score')
            success = interaction.get('success', True)
            
            # Format timestamp
            formatted_time = self._format_timestamp(timestamp)
            
            # Process tokens
            total_tokens = tokens_used.get('total_tokens', 0) if isinstance(tokens_used, dict) else 0
            prompt_tokens = tokens_used.get('prompt_tokens', 0) if isinstance(tokens_used, dict) else 0
            completion_tokens = tokens_used.get('completion_tokens', 0) if isinstance(tokens_used, dict) else 0
            
            # Timeline entry
            timeline_entry = {
                'index': i,
                'timestamp': timestamp,
                'formatted_time': formatted_time,
                'agent_name': agent_name,
                'model_name': model_name,
                'total_tokens': total_tokens,
                'prompt_tokens': prompt_tokens,
                'completion_tokens': completion_tokens,
                'tools_used': tools_used,
                'reasoning': self._sanitize_string(reasoning, 200),
                'response_time_ms': response_time,
                'confidence_score': confidence,
                'success': success
            }
            
            timeline_data.append(timeline_entry)
            token_progression.append(total_tokens)
            
            # Update statistics
            agent_stats[agent_name] += 1
            model_stats[model_name] += 1
            
            if response_time > 0:
                response_times.append(response_time)
                
            if success:
                success_count += 1
        
        # Calculate aggregate metrics
        total_tokens = sum(token_progression)
        avg_tokens = statistics.mean(token_progression) if token_progression else 0
        max_tokens = max(token_progression) if token_progression else 0
        avg_response_time = statistics.mean(response_times) if response_times else 0
        success_rate = (success_count / len(interactions)) * 100 if interactions else 0
        
        # Calculate token usage trend
        token_trend = 'stable'
        if len(token_progression) > 3:
            first_half = statistics.mean(token_progression[:len(token_progression)//2])
            second_half = statistics.mean(token_progression[len(token_progression)//2:])
            change_percent = ((second_half - first_half) / first_half) * 100 if first_half > 0 else 0
            
            if change_percent > 20:
                token_trend = 'increasing'
            elif change_percent < -20:
                token_trend = 'decreasing'
        
        return {
            'timeline_data': timeline_data,
            'token_progression': token_progression,
            'timestamps': [self._format_timestamp(item['timestamp']) for item in timeline_data],
            'agents': dict(agent_stats.most_common()),
            'models': dict(model_stats.most_common()),
            'metrics': {
                'total_interactions': len(interactions),
                'total_tokens': total_tokens,
                'avg_tokens_per_interaction': round(avg_tokens, 1),
                'max_tokens_single_interaction': max_tokens,
                'avg_response_time_ms': round(avg_response_time, 1),
                'success_rate': round(success_rate, 1),
                'unique_agents': len(agent_stats),
                'unique_models': len(model_stats),
                'token_trend': token_trend
            }
        }
    
    def generate_html(self, processed_data: Dict[str, Any]) -> str:
        """
        Generate HTML for LLM timeline component.
        """
        metrics = processed_data.get('metrics', {})
        timeline_data = processed_data.get('timeline_data', [])
        agents = processed_data.get('agents', {})
        models = processed_data.get('models', {})
        
        # Generate statistics section
        stats_html = ""
        stats_items = [
            ('Total Interactions', metrics.get('total_interactions', 0)),
            ('Total Tokens', f"{metrics.get('total_tokens', 0):,}"),
            ('Avg Tokens/Call', metrics.get('avg_tokens_per_interaction', 0)),
            ('Success Rate', f"{metrics.get('success_rate', 0)}%"),
            ('Unique Agents', metrics.get('unique_agents', 0)),
            ('Avg Response Time', f"{metrics.get('avg_response_time_ms', 0):.0f}ms")
        ]
        
        for label, value in stats_items:
            stats_html += f"""
                <div class="viz-stat-item-{self.component_id}">
                    <div class="viz-stat-value-{self.component_id}">{value}</div>
                    <div class="viz-stat-label-{self.component_id}">{label}</div>
                </div>
            """
        
        # Generate timeline cards for key interactions
        timeline_cards_html = ""
        key_interactions = timeline_data[:10] if len(timeline_data) > 10 else timeline_data
        
        for interaction in key_interactions:
            confidence_display = f" • Confidence: {interaction['confidence_score']:.2f}" if interaction['confidence_score'] is not None else ""
            tools_display = f"Tools: {', '.join(interaction['tools_used'])}" if interaction['tools_used'] else "No tools used"
            success_badge = "✅" if interaction['success'] else "❌"
            
            timeline_cards_html += f"""
                <div class="timeline-card-{self.component_id}">
                    <div class="timeline-card-header-{self.component_id}">
                        <span class="timeline-time-{self.component_id}">{interaction['formatted_time']}</span>
                        <span class="timeline-badge-{self.component_id}">{success_badge}</span>
                    </div>
                    <div class="timeline-card-content-{self.component_id}">
                        <div class="timeline-card-title-{self.component_id}">
                            {interaction['agent_name']} → {interaction['model_name']}
                        </div>
                        <div class="timeline-card-meta-{self.component_id}">
                            Tokens: {interaction['total_tokens']:,} • Response: {interaction['response_time_ms']}ms{confidence_display}
                        </div>
                        <div class="timeline-card-tools-{self.component_id}">
                            {tools_display}
                        </div>
                        <div class="timeline-card-reasoning-{self.component_id}">
                            {interaction['reasoning'][:150]}{'...' if len(interaction['reasoning']) > 150 else ''}
                        </div>
                    </div>
                </div>
            """
        
        # Generate agent/model breakdown
        agents_html = ""
        for agent, count in list(agents.items())[:6]:  # Top 6 agents
            agents_html += f"""
                <div class="breakdown-item-{self.component_id}">
                    <span class="breakdown-label-{self.component_id}">{agent}</span>
                    <span class="breakdown-count-{self.component_id}">{count}</span>
                </div>
            """
        
        models_html = ""
        for model, count in list(models.items())[:4]:  # Top 4 models
            models_html += f"""
                <div class="breakdown-item-{self.component_id}">
                    <span class="breakdown-label-{self.component_id}">{model}</span>
                    <span class="breakdown-count-{self.component_id}">{count}</span>
                </div>
            """
        
        return f"""
        <div class="viz-component-{self.component_id} viz-animate-{self.component_id}">
            <div class="viz-header-{self.component_id}">
                🧠 {self.component_title}
            </div>
            <div class="viz-content-{self.component_id}">
                <div class="viz-stats-grid-{self.component_id}">
                    {stats_html}
                </div>
                
                <div class="viz-chart-container-{self.component_id}">
                    <canvas id="llmTimelineChart_{self.component_id}"></canvas>
                </div>
                
                <div class="breakdown-section-{self.component_id}">
                    <div class="breakdown-column-{self.component_id}">
                        <h4>Top Agents</h4>
                        {agents_html}
                    </div>
                    <div class="breakdown-column-{self.component_id}">
                        <h4>Models Used</h4>
                        {models_html}
                    </div>
                </div>
                
                <div class="timeline-section-{self.component_id}">
                    <h4>Recent Interactions</h4>
                    <div class="timeline-cards-{self.component_id}">
                        {timeline_cards_html}
                    </div>
                </div>
            </div>
        </div>
        """
    
    def generate_javascript(self, processed_data: Dict[str, Any]) -> str:
        """
        Generate JavaScript for interactive LLM timeline chart.
        """
        timestamps = processed_data.get('timestamps', [])
        token_progression = processed_data.get('token_progression', [])
        timeline_data = processed_data.get('timeline_data', [])
        
        # Prepare chart data
        chart_data = {
            'labels': timestamps,
            'datasets': [{
                'label': 'Token Usage',
                'data': token_progression,
                'borderColor': '#667eea',
                'backgroundColor': 'rgba(102, 126, 234, 0.1)',
                'tension': 0.4,
                'fill': True,
                'pointRadius': 4,
                'pointHoverRadius': 6,
                'pointBackgroundColor': '#667eea',
                'pointBorderColor': '#fff',
                'pointBorderWidth': 2
            }]
        }
        
        return f"""
        // LLM Timeline Chart
        (function() {{
            const ctx = document.getElementById('llmTimelineChart_{self.component_id}');
            if (!ctx) return;
            
            const timelineData = {json.dumps(timeline_data)};
            
            new Chart(ctx.getContext('2d'), {{
                type: 'line',
                data: {json.dumps(chart_data)},
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
                        }},
                        tooltip: {{
                            callbacks: {{
                                title: function(context) {{
                                    const index = context[0].dataIndex;
                                    const interaction = timelineData[index];
                                    return `${{interaction.agent_name}} → ${{interaction.model_name}}`;
                                }},
                                afterBody: function(context) {{
                                    const index = context[0].dataIndex;
                                    const interaction = timelineData[index];
                                    let info = [];
                                    info.push(`Response Time: ${{interaction.response_time_ms}}ms`);
                                    if (interaction.confidence_score !== null) {{
                                        info.push(`Confidence: ${{interaction.confidence_score.toFixed(2)}}`);
                                    }}
                                    if (interaction.tools_used.length > 0) {{
                                        info.push(`Tools: ${{interaction.tools_used.join(', ')}}`);
                                    }}
                                    return info;
                                }}
                            }}
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
                    }},
                    interaction: {{
                        intersect: false,
                        mode: 'index'
                    }},
                    animation: {{
                        duration: {1000 if self.config.enable_animations else 0}
                    }}
                }}
            }});
            
            // Add click handler for timeline cards
            document.querySelectorAll('.timeline-card-{self.component_id}').forEach((card, index) => {{
                card.addEventListener('click', function() {{
                    const interaction = timelineData[index];
                    if (interaction) {{
                        // Show detailed interaction info
                        console.log('LLM Interaction Details:', interaction);
                    }}
                }});
                
                card.style.cursor = 'pointer';
            }});
            
            console.log('LLM Timeline Component loaded successfully');
        }})();
        """
    
    def generate_css(self) -> str:
        """
        Generate CSS styles for LLM timeline component.
        """
        colors = self._get_theme_colors()
        base_css = super().generate_css()
        
        component_css = f"""
        .breakdown-section-{self.component_id} {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 30px 0;
        }}
        
        .breakdown-column-{self.component_id} h4 {{
            color: {colors['primary']};
            margin-bottom: 15px;
            font-size: 1.1em;
            font-weight: 600;
        }}
        
        .breakdown-item-{self.component_id} {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            background: {colors['light']};
            border-radius: 6px;
            margin: 8px 0;
            border-left: 4px solid {colors['primary']};
            transition: all 0.3s ease;
        }}
        
        .breakdown-item-{self.component_id}:hover {{
            transform: translateX(5px);
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
        }}
        
        .breakdown-label-{self.component_id} {{
            font-weight: 500;
        }}
        
        .breakdown-count-{self.component_id} {{
            background: {colors['primary']};
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.9em;
            font-weight: 600;
        }}
        
        .timeline-section-{self.component_id} {{
            margin-top: 30px;
        }}
        
        .timeline-section-{self.component_id} h4 {{
            color: {colors['primary']};
            margin-bottom: 20px;
            font-size: 1.2em;
            font-weight: 600;
        }}
        
        .timeline-cards-{self.component_id} {{
            max-height: 400px;
            overflow-y: auto;
        }}
        
        .timeline-card-{self.component_id} {{
            background: {colors['light']};
            border: 1px solid {colors['border']};
            border-radius: 8px;
            margin: 12px 0;
            transition: all 0.3s ease;
            cursor: pointer;
        }}
        
        .timeline-card-{self.component_id}:hover {{
            transform: translateY(-2px);
            box-shadow: 0 6px 15px rgba(0, 0, 0, 0.1);
            border-color: {colors['primary']};
        }}
        
        .timeline-card-header-{self.component_id} {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 15px;
            background: {colors['primary']};
            color: white;
            border-radius: 8px 8px 0 0;
        }}
        
        .timeline-time-{self.component_id} {{
            font-weight: 600;
            font-family: monospace;
        }}
        
        .timeline-badge-{self.component_id} {{
            font-size: 1.2em;
        }}
        
        .timeline-card-content-{self.component_id} {{
            padding: 15px;
        }}
        
        .timeline-card-title-{self.component_id} {{
            font-weight: 600;
            color: {colors['text']};
            margin-bottom: 8px;
            font-size: 1.05em;
        }}
        
        .timeline-card-meta-{self.component_id} {{
            color: {colors['text']};
            opacity: 0.8;
            font-size: 0.9em;
            margin: 5px 0;
        }}
        
        .timeline-card-tools-{self.component_id} {{
            color: {colors['info']};
            font-size: 0.85em;
            margin: 5px 0;
            font-style: italic;
        }}
        
        .timeline-card-reasoning-{self.component_id} {{
            color: {colors['text']};
            font-size: 0.9em;
            line-height: 1.4;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid {colors['border']};
        }}
        
        @media (max-width: 768px) {{
            .breakdown-section-{self.component_id} {{
                grid-template-columns: 1fr;
                gap: 15px;
            }}
            
            .timeline-cards-{self.component_id} {{
                max-height: 300px;
            }}
        }}
        """
        
        return base_css + component_css
