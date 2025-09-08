#!/usr/bin/env python3
"""
Investigation Explanations Component

Generates formatted display of AI reasoning chains, decision explanations,
and investigation logic with searchable, categorized explanations.

Features:
- Formatted reasoning chains with syntax highlighting
- Categorized explanations by agent, confidence, and type
- Search and filter functionality
- Expandable explanation cards with full details
- Confidence score visualization
- Timeline-based explanation ordering
- Accessible design with proper semantic markup
"""

import json
import re
from typing import Dict, List, Any, Optional
from collections import Counter, defaultdict
from datetime import datetime

from .base_component import BaseVisualizationComponent

class ExplanationsComponent(BaseVisualizationComponent):
    """
    Investigation explanations component.
    
    Displays formatted AI reasoning chains, decision explanations,
    and investigation logic with search and categorization.
    """
    
    @property
    def component_name(self) -> str:
        return "explanations"
        
    @property
    def component_title(self) -> str:
        return "Investigation Explanations"
        
    @property
    def component_description(self) -> str:
        return "Formatted AI reasoning chains, decision explanations, and investigation logic"
    
    def validate_data(self, data: Dict[str, Any]) -> bool:
        """
        Validate explanations data.
        
        Expected data structure:
        {
            'llm_interactions': [...],  # For reasoning chains
            'agent_decisions': [...],   # For decision explanations
            'investigation_phases': [...] # For phase explanations
        }
        """
        if not isinstance(data, dict):
            self._add_error("Data must be a dictionary")
            return False
            
        # Check for any source of explanations
        sources = ['llm_interactions', 'agent_decisions', 'investigation_phases']
        has_explanations = any(data.get(source) for source in sources)
        
        if not has_explanations:
            self._add_warning("No explanation sources found")
            return True
            
        return True
    
    def process_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process explanations data for visualization.
        """
        llm_interactions = data.get('llm_interactions', [])
        agent_decisions = data.get('agent_decisions', [])
        investigation_phases = data.get('investigation_phases', [])
        
        all_explanations = []
        explanation_stats = {
            'by_agent': Counter(),
            'by_type': Counter(),
            'by_confidence_range': Counter(),
            'total_explanations': 0
        }
        
        # Extract explanations from LLM interactions
        for interaction in llm_interactions:
            reasoning = interaction.get('reasoning_chain', '')
            if reasoning and reasoning.strip():
                explanation = self._create_explanation_entry(
                    source='llm_interaction',
                    timestamp=interaction.get('timestamp', ''),
                    agent_name=interaction.get('agent_name', 'Unknown'),
                    title=f"LLM Reasoning - {interaction.get('model_name', 'Unknown Model')}",
                    content=reasoning,
                    confidence=interaction.get('confidence_score'),
                    metadata={
                        'model_name': interaction.get('model_name'),
                        'tokens_used': interaction.get('tokens_used', {}),
                        'tools_used': interaction.get('tools_used', []),
                        'response_time_ms': interaction.get('response_time_ms', 0)
                    }
                )
                all_explanations.append(explanation)
                self._update_stats(explanation, explanation_stats)
        
        # Extract explanations from agent decisions
        for decision in agent_decisions:
            reasoning = decision.get('reasoning', '')
            if reasoning and reasoning.strip():
                explanation = self._create_explanation_entry(
                    source='agent_decision',
                    timestamp=decision.get('timestamp', ''),
                    agent_name=decision.get('agent_name', 'Unknown'),
                    title=f"Decision: {decision.get('decision_type', 'Unknown')}",
                    content=reasoning,
                    confidence=decision.get('confidence_score'),
                    metadata={
                        'decision_type': decision.get('decision_type'),
                        'decision_id': decision.get('decision_id'),
                        'next_action': decision.get('next_action'),
                        'handover_target': decision.get('handover_target')
                    }
                )
                all_explanations.append(explanation)
                self._update_stats(explanation, explanation_stats)
        
        # Extract explanations from investigation phases
        for phase in investigation_phases:
            if phase.get('metadata', {}):
                metadata = phase.get('metadata', {})
                reasoning = metadata.get('reasoning') or metadata.get('explanation') or metadata.get('notes')
                
                if reasoning and reasoning.strip():
                    explanation = self._create_explanation_entry(
                        source='phase_transition',
                        timestamp=phase.get('timestamp', ''),
                        agent_name='Investigation System',
                        title=f"Phase Transition: {phase.get('to_phase', 'Unknown')}",
                        content=reasoning,
                        confidence=None,
                        metadata={
                            'from_phase': phase.get('from_phase'),
                            'to_phase': phase.get('to_phase'),
                            'progress_type': phase.get('progress_type'),
                            'duration_ms': phase.get('duration_ms')
                        }
                    )
                    all_explanations.append(explanation)
                    self._update_stats(explanation, explanation_stats)
        
        if not all_explanations:
            return {}
        
        # Sort explanations by timestamp (most recent first)
        all_explanations.sort(key=lambda x: x['parsed_timestamp'] or datetime.min, reverse=True)
        
        # Create explanation categories
        categories = self._categorize_explanations(all_explanations)
        
        # Find key insights and patterns
        key_insights = self._extract_key_insights(all_explanations)
        
        # Calculate explanation quality metrics
        quality_metrics = self._calculate_quality_metrics(all_explanations)
        
        return {
            'all_explanations': all_explanations,
            'categories': categories,
            'key_insights': key_insights,
            'explanation_stats': explanation_stats,
            'quality_metrics': quality_metrics,
            'metrics': {
                'total_explanations': len(all_explanations),
                'unique_agents': len(set(exp['agent_name'] for exp in all_explanations)),
                'avg_confidence': self._calculate_avg_confidence(all_explanations),
                'most_active_agent': explanation_stats['by_agent'].most_common(1)[0][0] if explanation_stats['by_agent'] else 'None',
                'most_common_type': explanation_stats['by_type'].most_common(1)[0][0] if explanation_stats['by_type'] else 'None'
            }
        }
    
    def _create_explanation_entry(self, source: str, timestamp: str, agent_name: str, 
                                title: str, content: str, confidence: Optional[float], 
                                metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Create standardized explanation entry"""
        parsed_timestamp = self._parse_timestamp(timestamp)
        
        return {
            'source': source,
            'timestamp': timestamp,
            'parsed_timestamp': parsed_timestamp,
            'formatted_time': self._format_timestamp(timestamp),
            'agent_name': agent_name,
            'title': title,
            'content': self._sanitize_string(content, 2000),
            'content_preview': self._create_preview(content),
            'confidence': confidence,
            'confidence_level': self._get_confidence_level(confidence) if confidence is not None else 'Unknown',
            'metadata': metadata,
            'word_count': len(content.split()) if content else 0,
            'contains_code': self._contains_code_patterns(content),
            'urgency_indicators': self._detect_urgency_indicators(content),
            'explanation_type': self._classify_explanation_type(content, source)
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
    
    def _create_preview(self, content: str, max_length: int = 150) -> str:
        """Create preview text for explanation content"""
        if not content:
            return ""
            
        # Clean up content for preview
        preview = re.sub(r'\s+', ' ', content.strip())
        
        if len(preview) <= max_length:
            return preview
            
        # Try to cut at sentence boundary
        sentences = re.split(r'[.!?]', preview[:max_length])
        if len(sentences) > 1:
            return sentences[0] + '...'
        else:
            return preview[:max_length] + '...'
    
    def _get_confidence_level(self, confidence: float) -> str:
        """Get confidence level string"""
        if confidence >= 0.9:
            return 'Very High'
        elif confidence >= 0.7:
            return 'High'
        elif confidence >= 0.5:
            return 'Medium'
        elif confidence >= 0.3:
            return 'Low'
        else:
            return 'Very Low'
    
    def _contains_code_patterns(self, content: str) -> bool:
        """Check if content contains code patterns"""
        code_patterns = [
            r'\bfunction\s+\w+\s*\(',
            r'\bclass\s+\w+',
            r'\bif\s+.*:',
            r'\bfor\s+.*in\s+.*:',
            r'\bdef\s+\w+\s*\(',
            r'\breturn\s+',
            r'\{.*\}',
            r'\[.*\]',
            r'\b\w+\.\w+\(',
            r'\b(True|False|None)\b'
        ]
        
        return any(re.search(pattern, content, re.IGNORECASE) for pattern in code_patterns)
    
    def _detect_urgency_indicators(self, content: str) -> List[str]:
        """Detect urgency indicators in content"""
        urgency_patterns = {
            'high': [r'\burgent\b', r'\bcritical\b', r'\bemergency\b', r'\bimmediate\b'],
            'medium': [r'\bimportant\b', r'\bsignificant\b', r'\bnotable\b', r'\bwarning\b'],
            'low': [r'\bminor\b', r'\boptional\b', r'\bsuggestion\b']
        }
        
        indicators = []
        for level, patterns in urgency_patterns.items():
            for pattern in patterns:
                if re.search(pattern, content, re.IGNORECASE):
                    indicators.append(level)
                    break
        
        return indicators
    
    def _classify_explanation_type(self, content: str, source: str) -> str:
        """Classify explanation type based on content and source"""
        content_lower = content.lower()
        
        # Type classification patterns
        if 'error' in content_lower or 'exception' in content_lower or 'failed' in content_lower:
            return 'error_analysis'
        elif 'decision' in content_lower or 'choose' in content_lower or 'selected' in content_lower:
            return 'decision_logic'
        elif 'risk' in content_lower or 'threat' in content_lower or 'security' in content_lower:
            return 'risk_assessment'
        elif 'analyze' in content_lower or 'investigation' in content_lower or 'examine' in content_lower:
            return 'analysis_reasoning'
        elif 'tool' in content_lower or 'function' in content_lower or 'execute' in content_lower:
            return 'tool_usage'
        elif source == 'phase_transition':
            return 'phase_logic'
        else:
            return 'general_reasoning'
    
    def _update_stats(self, explanation: Dict[str, Any], stats: Dict[str, Any]) -> None:
        """Update explanation statistics"""
        stats['total_explanations'] += 1
        stats['by_agent'][explanation['agent_name']] += 1
        stats['by_type'][explanation['explanation_type']] += 1
        
        if explanation['confidence'] is not None:
            conf_range = self._get_confidence_range(explanation['confidence'])
            stats['by_confidence_range'][conf_range] += 1
    
    def _get_confidence_range(self, confidence: float) -> str:
        """Get confidence range for statistics"""
        if confidence >= 0.8:
            return '0.8-1.0'
        elif confidence >= 0.6:
            return '0.6-0.8'
        elif confidence >= 0.4:
            return '0.4-0.6'
        elif confidence >= 0.2:
            return '0.2-0.4'
        else:
            return '0.0-0.2'
    
    def _categorize_explanations(self, explanations: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Categorize explanations by different criteria"""
        categories = {
            'by_type': defaultdict(list),
            'by_agent': defaultdict(list),
            'by_confidence': defaultdict(list),
            'by_urgency': defaultdict(list)
        }
        
        for explanation in explanations:
            categories['by_type'][explanation['explanation_type']].append(explanation)
            categories['by_agent'][explanation['agent_name']].append(explanation)
            
            if explanation['confidence'] is not None:
                conf_level = explanation['confidence_level']
                categories['by_confidence'][conf_level].append(explanation)
            
            urgency = 'low'
            if 'high' in explanation['urgency_indicators']:
                urgency = 'high'
            elif 'medium' in explanation['urgency_indicators']:
                urgency = 'medium'
            
            categories['by_urgency'][urgency].append(explanation)
        
        # Convert defaultdicts to regular dicts
        return {key: dict(value) for key, value in categories.items()}
    
    def _extract_key_insights(self, explanations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract key insights from explanations"""
        insights = []
        
        # Find explanations with high confidence and complexity
        high_quality = [
            exp for exp in explanations 
            if (exp['confidence'] or 0) >= 0.8 and exp['word_count'] >= 50
        ]
        
        if high_quality:
            insights.append({
                'type': 'high_confidence_reasoning',
                'title': 'High-Confidence Reasoning',
                'description': f"Found {len(high_quality)} high-confidence explanations with detailed reasoning",
                'examples': high_quality[:3]
            })
        
        # Find critical decisions
        critical_decisions = [
            exp for exp in explanations
            if exp['explanation_type'] == 'decision_logic' and 'high' in exp['urgency_indicators']
        ]
        
        if critical_decisions:
            insights.append({
                'type': 'critical_decisions',
                'title': 'Critical Decision Points',
                'description': f"Identified {len(critical_decisions)} critical decision points in the investigation",
                'examples': critical_decisions[:3]
            })
        
        # Find error analysis patterns
        error_analyses = [exp for exp in explanations if exp['explanation_type'] == 'error_analysis']
        if error_analyses:
            insights.append({
                'type': 'error_patterns',
                'title': 'Error Analysis Patterns',
                'description': f"Found {len(error_analyses)} error analysis explanations",
                'examples': error_analyses[:3]
            })
        
        return insights
    
    def _calculate_quality_metrics(self, explanations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate explanation quality metrics"""
        if not explanations:
            return {}
            
        total = len(explanations)
        with_confidence = len([exp for exp in explanations if exp['confidence'] is not None])
        high_confidence = len([exp for exp in explanations if (exp['confidence'] or 0) >= 0.7])
        detailed = len([exp for exp in explanations if exp['word_count'] >= 100])
        with_code = len([exp for exp in explanations if exp['contains_code']])
        
        avg_word_count = sum(exp['word_count'] for exp in explanations) / total
        
        return {
            'confidence_coverage': (with_confidence / total) * 100 if total > 0 else 0,
            'high_confidence_rate': (high_confidence / with_confidence) * 100 if with_confidence > 0 else 0,
            'detailed_explanations_rate': (detailed / total) * 100 if total > 0 else 0,
            'technical_explanations_rate': (with_code / total) * 100 if total > 0 else 0,
            'avg_word_count': round(avg_word_count, 1)
        }
    
    def _calculate_avg_confidence(self, explanations: List[Dict[str, Any]]) -> float:
        """Calculate average confidence score"""
        confidences = [exp['confidence'] for exp in explanations if exp['confidence'] is not None]
        return round(sum(confidences) / len(confidences), 3) if confidences else 0.0
    
    def generate_html(self, processed_data: Dict[str, Any]) -> str:
        """
        Generate HTML for explanations component.
        """
        all_explanations = processed_data.get('all_explanations', [])
        categories = processed_data.get('categories', {})
        key_insights = processed_data.get('key_insights', [])
        metrics = processed_data.get('metrics', {})
        quality_metrics = processed_data.get('quality_metrics', {})
        
        # Generate statistics section
        stats_html = ""
        stats_items = [
            ('Total Explanations', metrics.get('total_explanations', 0)),
            ('Unique Agents', metrics.get('unique_agents', 0)),
            ('Avg Confidence', f"{metrics.get('avg_confidence', 0):.3f}"),
            ('Most Active Agent', metrics.get('most_active_agent', 'None')),
            ('Coverage', f"{quality_metrics.get('confidence_coverage', 0):.1f}%"),
            ('High Confidence', f"{quality_metrics.get('high_confidence_rate', 0):.1f}%")
        ]
        
        for label, value in stats_items:
            stats_html += f"""
                <div class="viz-stat-item-{self.component_id}">
                    <div class="viz-stat-value-{self.component_id}">{value}</div>
                    <div class="viz-stat-label-{self.component_id}">{label}</div>
                </div>
            """
        
        # Generate key insights section
        insights_html = ""
        for insight in key_insights[:3]:
            insights_html += f"""
                <div class="insight-card-{self.component_id}">
                    <div class="insight-title-{self.component_id}">{insight['title']}</div>
                    <div class="insight-description-{self.component_id}">{insight['description']}</div>
                </div>
            """
        
        # Generate category filters
        filters_html = """
            <div class="filters-section-{self.component_id}">
                <div class="filter-group-{self.component_id}">
                    <button class="filter-btn-{self.component_id} active" data-filter="all">All</button>
                    <button class="filter-btn-{self.component_id}" data-filter="llm_interaction">LLM Reasoning</button>
                    <button class="filter-btn-{self.component_id}" data-filter="agent_decision">Agent Decisions</button>
                    <button class="filter-btn-{self.component_id}" data-filter="phase_transition">Phase Logic</button>
                </div>
                <div class="search-group-{self.component_id}">
                    <input type="text" class="search-input-{self.component_id}" placeholder="Search explanations..." />
                </div>
            </div>
        """
        
        # Generate explanation cards
        explanations_html = ""
        for i, explanation in enumerate(all_explanations[:20]):  # Limit to 20
            confidence_display = ""
            if explanation['confidence'] is not None:
                conf_class = self._get_confidence_class(explanation['confidence'])
                confidence_display = f"""
                    <div class="confidence-badge-{self.component_id} {conf_class}-{self.component_id}">
                        {explanation['confidence']:.3f} ({explanation['confidence_level']})
                    </div>
                """
            
            type_class = explanation['explanation_type'].replace('_', '-')
            urgency_indicators = ', '.join(explanation['urgency_indicators']) if explanation['urgency_indicators'] else 'Normal'
            
            explanations_html += f"""
                <div class="explanation-card-{self.component_id} {type_class}-{self.component_id}" 
                     data-source="{explanation['source']}" data-agent="{explanation['agent_name']}">
                    <div class="card-header-{self.component_id}">
                        <div class="card-title-{self.component_id}">{explanation['title']}</div>
                        <div class="card-meta-{self.component_id}">
                            <span class="agent-badge-{self.component_id}">{explanation['agent_name']}</span>
                            <span class="time-badge-{self.component_id}">{explanation['formatted_time']}</span>
                            {confidence_display}
                        </div>
                    </div>
                    
                    <div class="card-content-{self.component_id}">
                        <div class="content-preview-{self.component_id}">
                            {explanation['content_preview']}
                        </div>
                        <div class="content-full-{self.component_id}" style="display: none;">
                            <pre class="explanation-text-{self.component_id}">{explanation['content']}</pre>
                        </div>
                        
                        <div class="card-footer-{self.component_id}">
                            <div class="card-stats-{self.component_id}">
                                <span>Words: {explanation['word_count']}</span>
                                <span>Type: {explanation['explanation_type'].replace('_', ' ').title()}</span>
                                <span>Urgency: {urgency_indicators}</span>
                                {'<span class="code-indicator-{self.component_id}">Contains Code</span>' if explanation['contains_code'] else ''}
                            </div>
                            <button class="expand-btn-{self.component_id}" data-index="{i}">Show Full</button>
                        </div>
                    </div>
                </div>
            """
        
        return f"""
        <div class="viz-component-{self.component_id} viz-animate-{self.component_id}">
            <div class="viz-header-{self.component_id}">
                📝 {self.component_title}
            </div>
            <div class="viz-content-{self.component_id}">
                <div class="viz-stats-grid-{self.component_id}">
                    {stats_html}
                </div>
                
                {f'''
                <div class="insights-section-{self.component_id}">
                    <h4>Key Insights</h4>
                    <div class="insights-grid-{self.component_id}">
                        {insights_html}
                    </div>
                </div>
                ''' if insights_html else ''}
                
                {filters_html}
                
                <div class="explanations-container-{self.component_id}">
                    {explanations_html}
                </div>
                
                {f'<div class="no-results-{self.component_id}" style="display: none;">No explanations found matching your criteria.</div>' if explanations_html else ''}
            </div>
        </div>
        """
    
    def _get_confidence_class(self, confidence: float) -> str:
        """Get CSS class for confidence level"""
        if confidence >= 0.8:
            return 'high-confidence'
        elif confidence >= 0.6:
            return 'medium-confidence'
        else:
            return 'low-confidence'
    
    def generate_javascript(self, processed_data: Dict[str, Any]) -> str:
        """
        Generate JavaScript for interactive explanations.
        """
        all_explanations = processed_data.get('all_explanations', [])
        
        return f"""
        // Explanations Component
        (function() {{
            const explanationsData = {json.dumps(all_explanations)};
            
            // Filter functionality
            const filterButtons = document.querySelectorAll('.filter-btn-{self.component_id}');
            const explanationCards = document.querySelectorAll('.explanation-card-{self.component_id}');
            const searchInput = document.querySelector('.search-input-{self.component_id}');
            const noResults = document.querySelector('.no-results-{self.component_id}');
            
            function filterExplanations() {{
                const activeFilter = document.querySelector('.filter-btn-{self.component_id}.active')?.dataset.filter || 'all';
                const searchTerm = searchInput?.value.toLowerCase() || '';
                
                let visibleCount = 0;
                
                explanationCards.forEach((card, index) => {{
                    const source = card.dataset.source;
                    const agent = card.dataset.agent;
                    const explanation = explanationsData[index];
                    
                    let showCard = true;
                    
                    // Apply source filter
                    if (activeFilter !== 'all' && source !== activeFilter) {{
                        showCard = false;
                    }}
                    
                    // Apply search filter
                    if (searchTerm && explanation) {{
                        const searchableText = (
                            explanation.title + ' ' + 
                            explanation.content + ' ' + 
                            explanation.agent_name
                        ).toLowerCase();
                        
                        if (!searchableText.includes(searchTerm)) {{
                            showCard = false;
                        }}
                    }}
                    
                    card.style.display = showCard ? 'block' : 'none';
                    if (showCard) visibleCount++;
                }});
                
                if (noResults) {{
                    noResults.style.display = visibleCount === 0 ? 'block' : 'none';
                }}
            }}
            
            // Add filter button event listeners
            filterButtons.forEach(button => {{
                button.addEventListener('click', function() {{
                    filterButtons.forEach(btn => btn.classList.remove('active'));
                    this.classList.add('active');
                    filterExplanations();
                }});
            }});
            
            // Add search event listener
            if (searchInput) {{
                searchInput.addEventListener('input', filterExplanations);
            }}
            
            // Expand/collapse functionality
            document.querySelectorAll('.expand-btn-{self.component_id}').forEach((button, index) => {{
                button.addEventListener('click', function() {{
                    const card = this.closest('.explanation-card-{self.component_id}');
                    const preview = card.querySelector('.content-preview-{self.component_id}');
                    const full = card.querySelector('.content-full-{self.component_id}');
                    
                    if (full.style.display === 'none') {{
                        preview.style.display = 'none';
                        full.style.display = 'block';
                        this.textContent = 'Show Less';
                        card.classList.add('expanded');
                    }} else {{
                        preview.style.display = 'block';
                        full.style.display = 'none';
                        this.textContent = 'Show Full';
                        card.classList.remove('expanded');
                    }}
                }});
            }});
            
            // Add click handlers for cards
            explanationCards.forEach((card, index) => {{
                card.addEventListener('click', function(e) {{
                    if (e.target.classList.contains('expand-btn-{self.component_id}')) return;
                    
                    const explanation = explanationsData[index];
                    console.log('Explanation Details:', explanation);
                    
                    // Highlight effect
                    this.style.transform = 'scale(1.01)';
                    setTimeout(() => {{
                        this.style.transform = 'scale(1)';
                    }}, 200);
                }});
                
                card.style.cursor = 'pointer';
            }});
            
            console.log('Explanations Component loaded successfully');
        }})();
        """
    
    def generate_css(self) -> str:
        """
        Generate CSS styles for explanations component.
        """
        colors = self._get_theme_colors()
        base_css = super().generate_css()
        
        component_css = f"""
        .insights-section-{self.component_id} {{
            margin: 30px 0;
        }}
        
        .insights-section-{self.component_id} h4 {{
            color: {colors['primary']};
            margin-bottom: 15px;
            font-size: 1.2em;
            font-weight: 600;
        }}
        
        .insights-grid-{self.component_id} {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 15px;
        }}
        
        .insight-card-{self.component_id} {{
            background: {colors['light']};
            border-radius: 8px;
            padding: 15px;
            border-left: 4px solid {colors['info']};
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
        
        .filters-section-{self.component_id} {{
            background: {colors['light']};
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 20px;
            align-items: center;
        }}
        
        .filter-group-{self.component_id} {{
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }}
        
        .filter-btn-{self.component_id} {{
            padding: 8px 16px;
            border: 2px solid {colors['primary']};
            background: {colors['background']};
            color: {colors['primary']};
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
        }}
        
        .filter-btn-{self.component_id}:hover {{
            background: {colors['primary']};
            color: white;
        }}
        
        .filter-btn-{self.component_id}.active {{
            background: {colors['primary']};
            color: white;
        }}
        
        .search-input-{self.component_id} {{
            padding: 10px 15px;
            border: 2px solid {colors['border']};
            border-radius: 20px;
            font-size: 0.9em;
            min-width: 250px;
            transition: border-color 0.3s ease;
        }}
        
        .search-input-{self.component_id}:focus {{
            outline: none;
            border-color: {colors['primary']};
        }}
        
        .explanations-container-{self.component_id} {{
            max-height: 600px;
            overflow-y: auto;
        }}
        
        .explanation-card-{self.component_id} {{
            background: {colors['background']};
            border: 1px solid {colors['border']};
            border-radius: 8px;
            margin: 15px 0;
            overflow: hidden;
            transition: all 0.3s ease;
        }}
        
        .explanation-card-{self.component_id}:hover {{
            border-color: {colors['primary']};
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }}
        
        .explanation-card-{self.component_id}.expanded {{
            border-color: {colors['primary']};
        }}
        
        .card-header-{self.component_id} {{
            background: {colors['light']};
            padding: 15px;
            border-bottom: 1px solid {colors['border']};
        }}
        
        .card-title-{self.component_id} {{
            font-weight: 600;
            color: {colors['text']};
            margin-bottom: 8px;
            font-size: 1.05em;
        }}
        
        .card-meta-{self.component_id} {{
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
        }}
        
        .agent-badge-{self.component_id}, .time-badge-{self.component_id} {{
            background: {colors['primary']};
            color: white;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: 500;
        }}
        
        .time-badge-{self.component_id} {{
            background: {colors['info']};
            font-family: monospace;
        }}
        
        .confidence-badge-{self.component_id} {{
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: 600;
            color: white;
        }}
        
        .high-confidence-{self.component_id} {{ background: {colors['success']}; }}
        .medium-confidence-{self.component_id} {{ background: {colors['warning']}; }}
        .low-confidence-{self.component_id} {{ background: {colors['danger']}; }}
        
        .card-content-{self.component_id} {{
            padding: 15px;
        }}
        
        .content-preview-{self.component_id}, .content-full-{self.component_id} {{
            margin-bottom: 15px;
        }}
        
        .explanation-text-{self.component_id} {{
            background: {colors['dark']};
            color: {colors['light']};
            padding: 15px;
            border-radius: 6px;
            font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
            font-size: 0.85em;
            line-height: 1.5;
            white-space: pre-wrap;
            word-wrap: break-word;
            margin: 0;
            overflow-x: auto;
        }}
        
        .card-footer-{self.component_id} {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 10px;
            border-top: 1px solid {colors['border']};
        }}
        
        .card-stats-{self.component_id} {{
            display: flex;
            gap: 15px;
            font-size: 0.8em;
            color: {colors['text']};
            opacity: 0.7;
        }}
        
        .code-indicator-{self.component_id} {{
            background: {colors['info']};
            color: white;
            padding: 2px 6px;
            border-radius: 8px;
            font-size: 0.75em;
        }}
        
        .expand-btn-{self.component_id} {{
            background: {colors['primary']};
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 15px;
            font-size: 0.85em;
            cursor: pointer;
            transition: all 0.3s ease;
        }}
        
        .expand-btn-{self.component_id}:hover {{
            background: {colors['secondary']};
            transform: translateY(-1px);
        }}
        
        .no-results-{self.component_id} {{
            text-align: center;
            padding: 40px;
            color: {colors['text']};
            opacity: 0.6;
            font-style: italic;
        }}
        
        /* Explanation type styling */
        .error-analysis-{self.component_id} {{ border-left: 4px solid {colors['danger']}; }}
        .decision-logic-{self.component_id} {{ border-left: 4px solid {colors['primary']}; }}
        .risk-assessment-{self.component_id} {{ border-left: 4px solid {colors['warning']}; }}
        .analysis-reasoning-{self.component_id} {{ border-left: 4px solid {colors['info']}; }}
        .tool-usage-{self.component_id} {{ border-left: 4px solid {colors['success']}; }}
        .phase-logic-{self.component_id} {{ border-left: 4px solid {colors['secondary']}; }}
        
        @media (max-width: 768px) {{
            .filters-section-{self.component_id} {{
                grid-template-columns: 1fr;
                gap: 15px;
            }}
            
            .search-input-{self.component_id} {{
                min-width: 200px;
                width: 100%;
            }}
            
            .card-footer-{self.component_id} {{
                flex-direction: column;
                align-items: flex-start;
                gap: 10px;
            }}
            
            .card-stats-{self.component_id} {{
                flex-wrap: wrap;
                gap: 8px;
            }}
        }}
        """
        
        return base_css + component_css
