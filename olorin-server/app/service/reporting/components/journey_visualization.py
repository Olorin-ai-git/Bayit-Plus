#!/usr/bin/env python3
"""
Journey Visualization Component

Generates interactive timeline visualization showing investigation journey progression,
milestones, checkpoints, and phase transitions with detailed progress tracking.

Features:
- Interactive timeline with milestone markers
- Progress visualization with completion percentages
- Checkpoint analysis with detailed breakdowns
- Phase duration tracking and performance metrics
- Interactive hover states with detailed information
- Responsive design with mobile timeline optimization
- Journey insights and pattern analysis
"""

import json
import statistics
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from collections import defaultdict, OrderedDict

from .base_component import BaseVisualizationComponent

class JourneyVisualizationComponent(BaseVisualizationComponent):
    """
    Interactive investigation journey visualization component.
    
    Displays comprehensive journey tracking with timeline visualization,
    milestone tracking, and progress analysis.
    """
    
    @property
    def component_name(self) -> str:
        return "journey_visualization"
        
    @property
    def component_title(self) -> str:
        return "Investigation Journey"
        
    @property
    def component_description(self) -> str:
        return "Interactive timeline showing investigation journey progression, milestones, and checkpoints"
    
    def validate_data(self, data: Dict[str, Any]) -> bool:
        """
        Validate journey data.
        
        Expected data structure:
        {
            'journey_data': {
                'checkpoints': [...],
                'milestones': [...],
                'phases': [...],
                'progress': {...},
                'metadata': {...}
            },
            'investigation_phases': [...]  # Optional backup source
        }
        """
        if not isinstance(data, dict):
            self._add_error("Data must be a dictionary")
            return False
            
        journey_data = data.get('journey_data', {})
        investigation_phases = data.get('investigation_phases', [])
        
        # Check if we have any journey-related data
        has_journey_data = bool(journey_data) or bool(investigation_phases)
        
        if not has_journey_data:
            self._add_warning("No journey data found")
            return True
            
        return True
    
    def process_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process journey data for visualization.
        """
        journey_data = data.get('journey_data', {})
        investigation_phases = data.get('investigation_phases', [])
        
        # If no direct journey data, try to construct from phases
        if not journey_data and investigation_phases:
            journey_data = self._construct_journey_from_phases(investigation_phases)
        
        if not journey_data:
            return {}
            
        # Process journey components
        checkpoints = journey_data.get('checkpoints', [])
        milestones = journey_data.get('milestones', [])
        phases = journey_data.get('phases', [])
        progress = journey_data.get('progress', {})
        metadata = journey_data.get('metadata', {})
        
        # Process timeline events
        timeline_events = self._process_timeline_events(checkpoints, milestones, phases)
        
        # Calculate journey metrics
        journey_metrics = self._calculate_journey_metrics(timeline_events, progress)
        
        # Analyze journey patterns
        journey_patterns = self._analyze_journey_patterns(timeline_events)
        
        # Calculate progress stages
        progress_stages = self._calculate_progress_stages(timeline_events)
        
        # Generate journey insights
        journey_insights = self._generate_journey_insights(timeline_events, journey_metrics, journey_patterns)
        
        return {
            'timeline_events': timeline_events,
            'journey_metrics': journey_metrics,
            'journey_patterns': journey_patterns,
            'progress_stages': progress_stages,
            'journey_insights': journey_insights,
            'original_data': {
                'checkpoints_count': len(checkpoints),
                'milestones_count': len(milestones),
                'phases_count': len(phases)
            },
            'metrics': {
                'total_events': len(timeline_events),
                'journey_duration_ms': journey_metrics.get('total_duration_ms', 0),
                'completion_percentage': progress_stages.get('overall_completion', 0),
                'milestones_achieved': len([e for e in timeline_events if e['type'] == 'milestone']),
                'checkpoints_passed': len([e for e in timeline_events if e['type'] == 'checkpoint']),
                'average_event_duration': journey_metrics.get('avg_event_duration_ms', 0)
            }
        }
    
    def _construct_journey_from_phases(self, phases: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Construct journey data from investigation phases"""
        if not phases:
            return {}
            
        checkpoints = []
        milestones = []
        journey_phases = []
        
        for i, phase in enumerate(phases):
            timestamp = phase.get('timestamp', '')
            to_phase = phase.get('to_phase', f'Phase {i+1}')
            from_phase = phase.get('from_phase')
            progress_type = phase.get('progress_type', 'progress')
            duration_ms = phase.get('duration_ms', 0)
            
            # Create checkpoint for each phase transition
            checkpoint = {
                'id': f'checkpoint_{i}',
                'timestamp': timestamp,
                'name': f'Reached {to_phase}',
                'description': f'Transitioned from {from_phase or "start"} to {to_phase}',
                'status': 'completed',
                'metadata': {
                    'phase_transition': True,
                    'from_phase': from_phase,
                    'to_phase': to_phase,
                    'progress_type': progress_type,
                    'duration_ms': duration_ms
                }
            }
            checkpoints.append(checkpoint)
            
            # Mark significant phases as milestones
            if progress_type in ['start', 'complete', 'major_progress']:
                milestone = {
                    'id': f'milestone_{i}',
                    'timestamp': timestamp,
                    'name': f'Milestone: {to_phase}',
                    'description': f'Major progress: {progress_type}',
                    'importance': 'high' if progress_type in ['start', 'complete'] else 'medium',
                    'metadata': phase.get('metadata', {})
                }
                milestones.append(milestone)
            
            # Add to journey phases
            journey_phases.append({
                'name': to_phase,
                'start_time': timestamp,
                'duration_ms': duration_ms,
                'status': 'completed'
            })
        
        return {
            'checkpoints': checkpoints,
            'milestones': milestones,
            'phases': journey_phases,
            'progress': {'current_phase': journey_phases[-1]['name'] if journey_phases else 'Unknown'},
            'metadata': {'constructed_from_phases': True}
        }
    
    def _process_timeline_events(self, checkpoints: List[Dict], milestones: List[Dict], phases: List[Dict]) -> List[Dict]:
        """Process all events into unified timeline"""
        timeline_events = []
        
        # Process checkpoints
        for checkpoint in checkpoints:
            event = {
                'type': 'checkpoint',
                'timestamp': checkpoint.get('timestamp', ''),
                'parsed_timestamp': self._parse_timestamp(checkpoint.get('timestamp', '')),
                'formatted_time': self._format_timestamp(checkpoint.get('timestamp', '')),
                'name': checkpoint.get('name', 'Checkpoint'),
                'description': checkpoint.get('description', ''),
                'status': checkpoint.get('status', 'completed'),
                'metadata': checkpoint.get('metadata', {}),
                'importance': 'medium',
                'duration_ms': checkpoint.get('metadata', {}).get('duration_ms', 0)
            }
            timeline_events.append(event)
        
        # Process milestones
        for milestone in milestones:
            event = {
                'type': 'milestone',
                'timestamp': milestone.get('timestamp', ''),
                'parsed_timestamp': self._parse_timestamp(milestone.get('timestamp', '')),
                'formatted_time': self._format_timestamp(milestone.get('timestamp', '')),
                'name': milestone.get('name', 'Milestone'),
                'description': milestone.get('description', ''),
                'status': 'achieved',
                'metadata': milestone.get('metadata', {}),
                'importance': milestone.get('importance', 'high'),
                'duration_ms': 0  # Milestones are points in time
            }
            timeline_events.append(event)
        
        # Process phases (if not already captured in checkpoints)
        for phase in phases:
            # Check if this phase is already represented
            phase_name = phase.get('name', 'Unknown Phase')
            existing = any(event['name'] == phase_name for event in timeline_events)
            
            if not existing:
                event = {
                    'type': 'phase',
                    'timestamp': phase.get('start_time', ''),
                    'parsed_timestamp': self._parse_timestamp(phase.get('start_time', '')),
                    'formatted_time': self._format_timestamp(phase.get('start_time', '')),
                    'name': phase_name,
                    'description': f"Phase: {phase_name}",
                    'status': phase.get('status', 'completed'),
                    'metadata': {},
                    'importance': 'medium',
                    'duration_ms': phase.get('duration_ms', 0)
                }
                timeline_events.append(event)
        
        # Sort by timestamp
        timeline_events.sort(key=lambda x: x['parsed_timestamp'] or datetime.min)
        
        # Add sequence numbers and calculate relative positions
        for i, event in enumerate(timeline_events):
            event['sequence'] = i + 1
            event['progress_percentage'] = ((i + 1) / len(timeline_events)) * 100 if timeline_events else 0
        
        return timeline_events
    
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
    
    def _calculate_journey_metrics(self, events: List[Dict], progress_data: Dict) -> Dict[str, Any]:
        """Calculate comprehensive journey metrics"""
        if not events:
            return {}
            
        # Time-based metrics
        timestamps = [e['parsed_timestamp'] for e in events if e['parsed_timestamp']]
        if timestamps:
            start_time = min(timestamps)
            end_time = max(timestamps)
            total_duration_ms = int((end_time - start_time).total_seconds() * 1000)
        else:
            total_duration_ms = 0
            
        # Duration metrics
        event_durations = [e['duration_ms'] for e in events if e['duration_ms'] > 0]
        avg_event_duration = statistics.mean(event_durations) if event_durations else 0
        max_event_duration = max(event_durations) if event_durations else 0
        
        # Progress metrics
        completed_events = len([e for e in events if e['status'] in ['completed', 'achieved']])
        completion_rate = (completed_events / len(events)) * 100 if events else 0
        
        # Event type distribution
        event_types = defaultdict(int)
        importance_distribution = defaultdict(int)
        
        for event in events:
            event_types[event['type']] += 1
            importance_distribution[event['importance']] += 1
        
        return {
            'total_duration_ms': total_duration_ms,
            'avg_event_duration_ms': round(avg_event_duration, 1),
            'max_event_duration_ms': max_event_duration,
            'completion_rate': round(completion_rate, 1),
            'event_type_distribution': dict(event_types),
            'importance_distribution': dict(importance_distribution),
            'timeline_span_hours': round(total_duration_ms / (1000 * 60 * 60), 2) if total_duration_ms and total_duration_ms > 0 else 0
        }
    
    def _analyze_journey_patterns(self, events: List[Dict]) -> Dict[str, Any]:
        """Analyze patterns in the journey"""
        patterns = {
            'event_clustering': {},
            'duration_patterns': {},
            'progress_consistency': {},
            'bottlenecks': []
        }
        
        if not events:
            return patterns
            
        # Analyze event clustering (time gaps between events)
        time_gaps = []
        for i in range(1, len(events)):
            prev_time = events[i-1]['parsed_timestamp']
            curr_time = events[i]['parsed_timestamp']
            
            if prev_time and curr_time:
                gap_seconds = (curr_time - prev_time).total_seconds()
                time_gaps.append(gap_seconds)
        
        if time_gaps:
            avg_gap = statistics.mean(time_gaps)
            patterns['event_clustering'] = {
                'avg_gap_seconds': round(avg_gap, 1),
                'max_gap_seconds': round(max(time_gaps), 1),
                'gap_consistency': 'consistent' if statistics.stdev(time_gaps) < avg_gap else 'variable'
            }
        
        # Analyze duration patterns
        durations = [e['duration_ms'] for e in events if e['duration_ms'] > 0]
        if durations:
            patterns['duration_patterns'] = {
                'avg_duration': round(statistics.mean(durations), 1),
                'duration_trend': self._analyze_duration_trend(events),
                'longest_event': max((e for e in events if e['duration_ms'] > 0), key=lambda x: x['duration_ms'])['name']
            }
        
        # Identify bottlenecks (events that took significantly longer)
        if durations:
            avg_duration = statistics.mean(durations)
            threshold = avg_duration * 2  # Events taking 2x average time
            
            bottlenecks = [
                {
                    'event_name': event['name'],
                    'duration_ms': event['duration_ms'],
                    'severity': 'high' if event['duration_ms'] > threshold * 2 else 'medium'
                }
                for event in events 
                if event['duration_ms'] > threshold
            ]
            patterns['bottlenecks'] = bottlenecks
        
        return patterns
    
    def _analyze_duration_trend(self, events: List[Dict]) -> str:
        """Analyze if event durations are increasing, decreasing, or stable"""
        durations = [e['duration_ms'] for e in events if e['duration_ms'] > 0]
        
        if len(durations) < 3:
            return 'insufficient_data'
            
        # Compare first third with last third
        third = len(durations) // 3
        if third == 0:
            return 'insufficient_data'
            
        first_third_avg = statistics.mean(durations[:third])
        last_third_avg = statistics.mean(durations[-third:])
        
        change_percent = ((last_third_avg - first_third_avg) / first_third_avg) * 100 if first_third_avg > 0 else 0
        
        if change_percent > 25:
            return 'increasing'
        elif change_percent < -25:
            return 'decreasing'
        else:
            return 'stable'
    
    def _calculate_progress_stages(self, events: List[Dict]) -> Dict[str, Any]:
        """Calculate progress through different stages"""
        if not events:
            return {'overall_completion': 0}
            
        total_events = len(events)
        completed_events = len([e for e in events if e['status'] in ['completed', 'achieved']])
        
        # Calculate stage-based progress
        stages = {
            'initiation': 0,
            'development': 0,
            'completion': 0
        }
        
        # Divide events into thirds for stage analysis
        third = total_events // 3
        if third > 0:
            initiation_events = events[:third]
            development_events = events[third:third*2]
            completion_events = events[third*2:]
            
            stages['initiation'] = (len([e for e in initiation_events if e['status'] in ['completed', 'achieved']]) / len(initiation_events)) * 100
            stages['development'] = (len([e for e in development_events if e['status'] in ['completed', 'achieved']]) / len(development_events)) * 100 if development_events else 0
            stages['completion'] = (len([e for e in completion_events if e['status'] in ['completed', 'achieved']]) / len(completion_events)) * 100 if completion_events else 0
        
        return {
            'overall_completion': round((completed_events / total_events) * 100, 1),
            'stage_progress': {k: round(v, 1) for k, v in stages.items()},
            'milestones_progress': round((len([e for e in events if e['type'] == 'milestone']) / max(1, total_events)) * 100, 1)
        }
    
    def _generate_journey_insights(self, events: List[Dict], metrics: Dict, patterns: Dict) -> List[Dict[str, Any]]:
        """Generate insights about the journey"""
        insights = []
        
        if not events:
            return insights
            
        # Duration insight
        if metrics.get('timeline_span_hours', 0) > 0:
            insights.append({
                'type': 'duration_analysis',
                'title': 'Investigation Duration',
                'description': f"Investigation spanned {metrics['timeline_span_hours']} hours with {len(events)} key events",
                'severity': 'info'
            })
        
        # Bottleneck insight
        bottlenecks = patterns.get('bottlenecks', [])
        if bottlenecks:
            high_severity = [b for b in bottlenecks if b['severity'] == 'high']
            insights.append({
                'type': 'bottleneck_analysis',
                'title': 'Performance Bottlenecks',
                'description': f"Found {len(bottlenecks)} bottlenecks ({len(high_severity)} high severity)",
                'severity': 'high' if high_severity else 'medium',
                'details': bottlenecks[:3]  # Show top 3
            })
        
        # Progress consistency insight
        completion_rate = metrics.get('completion_rate', 0)
        if completion_rate >= 90:
            insights.append({
                'type': 'completion_analysis',
                'title': 'High Completion Rate',
                'description': f"Excellent progress with {completion_rate:.1f}% of events completed",
                'severity': 'success'
            })
        elif completion_rate < 70:
            insights.append({
                'type': 'completion_analysis',
                'title': 'Incomplete Journey',
                'description': f"Investigation shows {completion_rate:.1f}% completion rate - may indicate issues",
                'severity': 'warning'
            })
        
        # Milestone achievement
        milestones = [e for e in events if e['type'] == 'milestone']
        if milestones:
            insights.append({
                'type': 'milestone_analysis',
                'title': 'Milestone Achievement',
                'description': f"Achieved {len(milestones)} major milestones during investigation",
                'severity': 'success'
            })
        
        return insights
    
    def generate_html(self, processed_data: Dict[str, Any]) -> str:
        """
        Generate HTML for journey visualization component.
        """
        timeline_events = processed_data.get('timeline_events', [])
        journey_metrics = processed_data.get('journey_metrics', {})
        progress_stages = processed_data.get('progress_stages', {})
        journey_insights = processed_data.get('journey_insights', [])
        metrics = processed_data.get('metrics', {})
        
        # Generate statistics section
        stats_html = ""
        stats_items = [
            ('Total Events', metrics.get('total_events', 0)),
            ('Journey Duration', f"{journey_metrics.get('timeline_span_hours', 0)} hours"),
            ('Completion', f"{progress_stages.get('overall_completion', 0)}%"),
            ('Milestones', metrics.get('milestones_achieved', 0)),
            ('Checkpoints', metrics.get('checkpoints_passed', 0)),
            ('Avg Duration', f"{journey_metrics.get('avg_event_duration_ms', 0):.0f}ms")
        ]
        
        for label, value in stats_items:
            stats_html += f"""
                <div class="viz-stat-item-{self.component_id}">
                    <div class="viz-stat-value-{self.component_id}">{value}</div>
                    <div class="viz-stat-label-{self.component_id}">{label}</div>
                </div>
            """
        
        # Generate progress visualization
        overall_completion = progress_stages.get('overall_completion', 0)
        stage_progress = progress_stages.get('stage_progress', {})
        
        progress_html = f"""
            <div class="progress-overview-{self.component_id}">
                <div class="overall-progress-{self.component_id}">
                    <h4>Overall Progress</h4>
                    <div class="progress-bar-{self.component_id}">
                        <div class="progress-fill-{self.component_id}" style="width: {overall_completion}%">
                            {overall_completion:.1f}%
                        </div>
                    </div>
                </div>
                
                <div class="stage-progress-{self.component_id}">
                    <div class="stage-item-{self.component_id}">
                        <span class="stage-label-{self.component_id}">Initiation</span>
                        <div class="stage-bar-{self.component_id}">
                            <div class="stage-fill-{self.component_id}" style="width: {stage_progress.get('initiation', 0)}%"></div>
                        </div>
                        <span class="stage-value-{self.component_id}">{stage_progress.get('initiation', 0):.1f}%</span>
                    </div>
                    <div class="stage-item-{self.component_id}">
                        <span class="stage-label-{self.component_id}">Development</span>
                        <div class="stage-bar-{self.component_id}">
                            <div class="stage-fill-{self.component_id}" style="width: {stage_progress.get('development', 0)}%"></div>
                        </div>
                        <span class="stage-value-{self.component_id}">{stage_progress.get('development', 0):.1f}%</span>
                    </div>
                    <div class="stage-item-{self.component_id}">
                        <span class="stage-label-{self.component_id}">Completion</span>
                        <div class="stage-bar-{self.component_id}">
                            <div class="stage-fill-{self.component_id}" style="width: {stage_progress.get('completion', 0)}%"></div>
                        </div>
                        <span class="stage-value-{self.component_id}">{stage_progress.get('completion', 0):.1f}%</span>
                    </div>
                </div>
            </div>
        """
        
        # Generate timeline visualization
        timeline_html = ""
        for event in timeline_events:
            event_class = f"{event['type']}-{event['importance']}"
            status_icon = self._get_status_icon(event['status'])
            duration_display = f" ({event['duration_ms']}ms)" if event['duration_ms'] > 0 else ""
            
            timeline_html += f"""
                <div class="timeline-event-{self.component_id} {event_class}-{self.component_id}" data-event-type="{event['type']}">
                    <div class="timeline-marker-{self.component_id}">
                        <div class="marker-icon-{self.component_id}">{status_icon}</div>
                        <div class="marker-line-{self.component_id}"></div>
                    </div>
                    <div class="timeline-content-{self.component_id}">
                        <div class="event-header-{self.component_id}">
                            <div class="event-name-{self.component_id}">{event['name']}</div>
                            <div class="event-time-{self.component_id}">{event['formatted_time']}</div>
                        </div>
                        <div class="event-description-{self.component_id}">
                            {event['description']}{duration_display}
                        </div>
                        <div class="event-meta-{self.component_id}">
                            <span class="event-type-{self.component_id}">{event['type'].title()}</span>
                            <span class="event-progress-{self.component_id}">Progress: {event['progress_percentage']:.1f}%</span>
                        </div>
                    </div>
                </div>
            """
        
        # Generate insights section
        insights_html = ""
        for insight in journey_insights:
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
                🗺️ {self.component_title}
            </div>
            <div class="viz-content-{self.component_id}">
                <div class="viz-stats-grid-{self.component_id}">
                    {stats_html}
                </div>
                
                {progress_html}
                
                <div class="timeline-chart-container-{self.component_id}">
                    <canvas id="journeyChart_{self.component_id}"></canvas>
                </div>
                
                <div class="timeline-section-{self.component_id}">
                    <h4>Journey Timeline</h4>
                    <div class="timeline-container-{self.component_id}">
                        {timeline_html}
                    </div>
                </div>
                
                {f'''
                <div class="insights-section-{self.component_id}">
                    <h4>Journey Insights</h4>
                    <div class="insights-list-{self.component_id}">
                        {insights_html}
                    </div>
                </div>
                ''' if insights_html else ''}
            </div>
        </div>
        """
    
    def _get_status_icon(self, status: str) -> str:
        """Get icon for status"""
        status_icons = {
            'completed': '✅',
            'achieved': '🏆',
            'in_progress': '🔄',
            'pending': '⏳',
            'failed': '❌'
        }
        return status_icons.get(status, '🔵')
    
    def generate_javascript(self, processed_data: Dict[str, Any]) -> str:
        """
        Generate JavaScript for interactive journey chart.
        """
        timeline_events = processed_data.get('timeline_events', [])
        journey_metrics = processed_data.get('journey_metrics', {})
        
        # Prepare chart data for journey progression
        chart_data = {
            'labels': [f"Event {i+1}" for i in range(len(timeline_events))],
            'datasets': [
                {
                    'label': 'Progress %',
                    'data': [event['progress_percentage'] for event in timeline_events],
                    'borderColor': '#28a745',
                    'backgroundColor': 'rgba(40, 167, 69, 0.1)',
                    'tension': 0.4,
                    'fill': True,
                    'pointRadius': 6,
                    'pointHoverRadius': 8,
                    'pointBackgroundColor': [self._get_event_color(event['type']) for event in timeline_events],
                    'pointBorderColor': '#fff',
                    'pointBorderWidth': 2
                }
            ]
        }
        
        return f"""
        // Journey Visualization Component
        (function() {{
            const journeyData = {json.dumps(timeline_events)};
            
            // Journey Progress Chart
            const journeyCtx = document.getElementById('journeyChart_{self.component_id}');
            if (journeyCtx) {{
                new Chart(journeyCtx.getContext('2d'), {{
                    type: 'line',
                    data: {json.dumps(chart_data)},
                    options: {{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {{
                            title: {{
                                display: true,
                                text: 'Investigation Journey Progress',
                                font: {{ size: 16, weight: 'bold' }}
                            }},
                            legend: {{
                                display: false
                            }},
                            tooltip: {{
                                callbacks: {{
                                    title: function(context) {{
                                        const index = context[0].dataIndex;
                                        const event = journeyData[index];
                                        return event ? event.name : 'Unknown Event';
                                    }},
                                    afterBody: function(context) {{
                                        const index = context[0].dataIndex;
                                        const event = journeyData[index];
                                        if (event) {{
                                            return [
                                                `Type: ${{event.type}}`,
                                                `Time: ${{event.formatted_time}}`,
                                                `Status: ${{event.status}}`,
                                                event.duration_ms > 0 ? `Duration: ${{event.duration_ms}}ms` : ''
                                            ].filter(Boolean);
                                        }}
                                        return [];
                                    }}
                                }}
                            }}
                        }},
                        scales: {{
                            y: {{
                                min: 0,
                                max: 100,
                                title: {{
                                    display: true,
                                    text: 'Progress %'
                                }}
                            }},
                            x: {{
                                title: {{
                                    display: true,
                                    text: 'Timeline Events'
                                }}
                            }}
                        }},
                        animation: {{
                            duration: {1000 if self.config.enable_animations else 0}
                        }}
                    }}
                }});
            }}
            
            // Add interactivity to timeline events
            document.querySelectorAll('.timeline-event-{self.component_id}').forEach((eventElement, index) => {{
                eventElement.addEventListener('click', function() {{
                    const event = journeyData[index];
                    if (event) {{
                        console.log('Journey Event Details:', event);
                        
                        // Highlight effect
                        this.style.transform = 'translateX(5px)';
                        this.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
                        
                        setTimeout(() => {{
                            this.style.transform = 'translateX(0)';
                            this.style.boxShadow = '';
                        }}, 300);
                    }}
                }});
                
                eventElement.style.cursor = 'pointer';
            }});
            
            // Add hover effects for timeline markers
            document.querySelectorAll('.timeline-marker-{self.component_id}').forEach(marker => {{
                marker.addEventListener('mouseenter', function() {{
                    this.style.transform = 'scale(1.2)';
                }});
                
                marker.addEventListener('mouseleave', function() {{
                    this.style.transform = 'scale(1)';
                }});
            }});
            
            console.log('Journey Visualization Component loaded successfully');
        }})();
        """
    
    def _get_event_color(self, event_type: str) -> str:
        """Get color for event type"""
        colors = {
            'milestone': '#ffc107',  # Gold
            'checkpoint': '#17a2b8',  # Info blue
            'phase': '#6c757d'  # Gray
        }
        return colors.get(event_type, '#667eea')
    
    def generate_css(self) -> str:
        """
        Generate CSS styles for journey visualization component.
        """
        colors = self._get_theme_colors()
        base_css = super().generate_css()
        
        component_css = f"""
        .progress-overview-{self.component_id} {{
            background: {colors['light']};
            border-radius: 10px;
            padding: 25px;
            margin: 25px 0;
        }}
        
        .overall-progress-{self.component_id} h4 {{
            color: {colors['primary']};
            margin-bottom: 15px;
            font-size: 1.2em;
            font-weight: 600;
        }}
        
        .progress-bar-{self.component_id} {{
            width: 100%;
            height: 35px;
            background: {colors['border']};
            border-radius: 17px;
            overflow: hidden;
            margin-bottom: 20px;
        }}
        
        .progress-fill-{self.component_id} {{
            height: 100%;
            background: linear-gradient(90deg, {colors['success']} 0%, {colors['primary']} 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            transition: width 0.8s ease;
        }}
        
        .stage-progress-{self.component_id} {{
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
        }}
        
        .stage-item-{self.component_id} {{
            text-align: center;
        }}
        
        .stage-label-{self.component_id} {{
            display: block;
            font-weight: 500;
            color: {colors['text']};
            margin-bottom: 8px;
            font-size: 0.9em;
        }}
        
        .stage-bar-{self.component_id} {{
            width: 100%;
            height: 20px;
            background: {colors['border']};
            border-radius: 10px;
            overflow: hidden;
            margin-bottom: 5px;
        }}
        
        .stage-fill-{self.component_id} {{
            height: 100%;
            background: {colors['info']};
            transition: width 0.6s ease;
        }}
        
        .stage-value-{self.component_id} {{
            font-size: 0.85em;
            color: {colors['text']};
            font-weight: 500;
        }}
        
        .timeline-chart-container-{self.component_id} {{
            height: 300px;
            margin: 30px 0;
            background: {colors['light']};
            border-radius: 10px;
            padding: 20px;
        }}
        
        .timeline-section-{self.component_id} {{
            margin: 30px 0;
        }}
        
        .timeline-section-{self.component_id} h4 {{
            color: {colors['primary']};
            margin-bottom: 20px;
            font-size: 1.2em;
            font-weight: 600;
        }}
        
        .timeline-container-{self.component_id} {{
            position: relative;
            max-height: 500px;
            overflow-y: auto;
            padding-left: 20px;
        }}
        
        .timeline-event-{self.component_id} {{
            display: flex;
            margin: 20px 0;
            transition: all 0.3s ease;
        }}
        
        .timeline-event-{self.component_id}:hover {{
            background: {colors['light']};
            border-radius: 8px;
            padding: 10px;
            margin-left: -10px;
            margin-right: -10px;
        }}
        
        .timeline-marker-{self.component_id} {{
            position: relative;
            margin-right: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }}
        
        .marker-icon-{self.component_id} {{
            width: 35px;
            height: 35px;
            border-radius: 50%;
            background: {colors['primary']};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2em;
            color: white;
            z-index: 2;
            transition: transform 0.3s ease;
        }}
        
        .marker-line-{self.component_id} {{
            width: 2px;
            height: 40px;
            background: {colors['border']};
            margin-top: 5px;
        }}
        
        .timeline-event-{self.component_id}:last-child .marker-line-{self.component_id} {{
            display: none;
        }}
        
        .timeline-content-{self.component_id} {{
            flex-grow: 1;
            padding-top: 5px;
        }}
        
        .event-header-{self.component_id} {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
        }}
        
        .event-name-{self.component_id} {{
            font-weight: 600;
            color: {colors['text']};
            font-size: 1.1em;
        }}
        
        .event-time-{self.component_id} {{
            color: {colors['text']};
            opacity: 0.7;
            font-size: 0.9em;
            font-family: monospace;
        }}
        
        .event-description-{self.component_id} {{
            color: {colors['text']};
            margin-bottom: 8px;
            line-height: 1.4;
        }}
        
        .event-meta-{self.component_id} {{
            display: flex;
            gap: 15px;
            font-size: 0.85em;
        }}
        
        .event-type-{self.component_id} {{
            background: {colors['info']};
            color: white;
            padding: 3px 8px;
            border-radius: 10px;
            font-weight: 500;
        }}
        
        .event-progress-{self.component_id} {{
            color: {colors['text']};
            opacity: 0.8;
        }}
        
        /* Event type styling */
        .milestone-high-{self.component_id} .marker-icon-{self.component_id} {{
            background: #ffc107;
            box-shadow: 0 0 10px rgba(255, 193, 7, 0.5);
        }}
        
        .checkpoint-medium-{self.component_id} .marker-icon-{self.component_id} {{
            background: {colors['info']};
        }}
        
        .phase-medium-{self.component_id} .marker-icon-{self.component_id} {{
            background: {colors['secondary']};
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
        
        .info-{self.component_id} {{
            background: rgba(23, 162, 184, 0.1);
            border-left-color: {colors['info']};
        }}
        
        .success-{self.component_id} {{
            background: rgba(40, 167, 69, 0.1);
            border-left-color: {colors['success']};
        }}
        
        .warning-{self.component_id} {{
            background: rgba(255, 193, 7, 0.1);
            border-left-color: {colors['warning']};
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
            .stage-progress-{self.component_id} {{
                grid-template-columns: 1fr;
                gap: 10px;
            }}
            
            .timeline-chart-container-{self.component_id} {{
                height: 250px;
                padding: 15px;
            }}
            
            .timeline-container-{self.component_id} {{
                max-height: 400px;
            }}
            
            .event-header-{self.component_id} {{
                flex-direction: column;
                gap: 5px;
            }}
            
            .insights-list-{self.component_id} {{
                grid-template-columns: 1fr;
            }}
        }}
        """
        
        return base_css + component_css
