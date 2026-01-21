#!/usr/bin/env python3
"""
Risk Analysis Dashboard Component

Generates interactive dashboard showing risk score progression, risk category analysis,
confidence levels, and threat assessment visualizations.

Features:
- Dynamic risk score progression line chart
- Risk category radar chart with confidence mapping
- Risk level indicators and threshold analysis
- Historical risk trend analysis with volatility metrics
- Color-coded risk severity levels with accessibility support
- Interactive tooltips with detailed risk factors
"""

import json
import statistics
from collections import Counter, defaultdict
from datetime import datetime
from typing import Any, Dict, List, Optional

from .base_component import BaseVisualizationComponent


class RiskDashboardComponent(BaseVisualizationComponent):
    """
    Interactive risk analysis dashboard component.

    Displays comprehensive risk analysis with progression tracking,
    category breakdown, and confidence assessment.
    """

    @property
    def component_name(self) -> str:
        return "risk_dashboard"

    @property
    def component_title(self) -> str:
        return "Risk Analysis Dashboard"

    @property
    def component_description(self) -> str:
        return "Interactive dashboard showing risk score progression, categories, and threat assessment"

    def validate_data(self, data: Dict[str, Any]) -> bool:
        """
        Validate risk analysis data.

        Expected data structure:
        {
            'risk_score_entries': [
                {
                    'timestamp': str,
                    'risk_score': float,
                    'risk_factors': [str],
                    'confidence': float,
                    'category': str,
                    'details': dict
                }
            ],
            'agent_decisions': [...]  # Optional for additional risk context
        }
        """
        if not isinstance(data, dict):
            self._add_error("Data must be a dictionary")
            return False

        risk_entries = data.get("risk_score_entries", [])
        if not isinstance(risk_entries, list):
            self._add_error("risk_score_entries must be a list")
            return False

        if not risk_entries:
            self._add_warning("No risk score entries found")
            return True

        # Validate risk entry structure
        for i, entry in enumerate(risk_entries[:3]):
            if not isinstance(entry, dict):
                self._add_error(f"Risk entry {i} must be a dictionary")
                return False

            if "risk_score" not in entry:
                self._add_warning(f"Risk entry {i} missing risk_score field")
            elif not isinstance(entry["risk_score"], (int, float)):
                self._add_warning(f"Risk entry {i} risk_score must be numeric")

        return True

    def process_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process risk analysis data for visualization.
        """
        risk_entries = data.get("risk_score_entries", [])
        agent_decisions = data.get("agent_decisions", [])

        if not risk_entries:
            return {}

        # Process risk score progression
        processed_entries = []
        risk_scores = []
        risk_categories = defaultdict(list)
        risk_factors_counter = Counter()
        confidence_scores = []

        for i, entry in enumerate(risk_entries):
            timestamp = entry.get("timestamp", "")
            risk_score = entry.get("risk_score", 0.0)
            risk_factors = entry.get("risk_factors", [])
            confidence = entry.get("confidence", 0.0)
            category = entry.get("category", "Unknown")
            details = entry.get("details", {})

            # Validate and normalize risk score
            if isinstance(risk_score, (int, float)):
                risk_score = max(0.0, min(1.0, float(risk_score)))
            else:
                risk_score = 0.0

            # Validate and normalize confidence
            if isinstance(confidence, (int, float)):
                confidence = max(0.0, min(1.0, float(confidence)))
            else:
                confidence = 0.0

            processed_entry = {
                "index": i,
                "timestamp": timestamp,
                "formatted_time": self._format_timestamp(timestamp),
                "risk_score": risk_score,
                "risk_factors": risk_factors if isinstance(risk_factors, list) else [],
                "confidence": confidence,
                "category": category,
                "details": details,
                "risk_level": self._determine_risk_level(risk_score),
                "confidence_level": self._determine_confidence_level(confidence),
            }

            processed_entries.append(processed_entry)
            risk_scores.append(risk_score)
            confidence_scores.append(confidence)
            risk_categories[category].append(risk_score)

            # Count risk factors
            for factor in risk_factors if isinstance(risk_factors, list) else []:
                risk_factors_counter[factor] += 1

        # Calculate risk statistics
        current_risk = risk_scores[-1] if risk_scores else 0.0
        max_risk = max(risk_scores) if risk_scores else 0.0
        min_risk = min(risk_scores) if risk_scores else 0.0
        avg_risk = statistics.mean(risk_scores) if risk_scores else 0.0
        risk_volatility = statistics.stdev(risk_scores) if len(risk_scores) > 1 else 0.0

        # Calculate confidence statistics
        avg_confidence = (
            statistics.mean(confidence_scores) if confidence_scores else 0.0
        )
        min_confidence = min(confidence_scores) if confidence_scores else 0.0

        # Analyze risk trend
        risk_trend = self._analyze_risk_trend(risk_scores)

        # Process risk categories with average scores
        processed_categories = {}
        for category, scores in risk_categories.items():
            processed_categories[category] = {
                "avg_score": statistics.mean(scores),
                "max_score": max(scores),
                "count": len(scores),
                "latest_score": scores[-1],
            }

        # Get top risk factors
        top_risk_factors = risk_factors_counter.most_common(10)

        # Risk level distribution
        risk_level_distribution = Counter(
            entry["risk_level"] for entry in processed_entries
        )

        # Detect risk alerts (significant changes or high risk periods)
        risk_alerts = self._detect_risk_alerts(processed_entries)

        return {
            "processed_entries": processed_entries,
            "risk_scores": risk_scores,
            "confidence_scores": confidence_scores,
            "timestamps": [entry["formatted_time"] for entry in processed_entries],
            "processed_categories": processed_categories,
            "top_risk_factors": top_risk_factors,
            "risk_level_distribution": dict(risk_level_distribution),
            "risk_alerts": risk_alerts,
            "metrics": {
                "current_risk_score": round(current_risk, 3),
                "max_risk_score": round(max_risk, 3),
                "min_risk_score": round(min_risk, 3),
                "avg_risk_score": round(avg_risk, 3),
                "risk_volatility": round(risk_volatility, 3),
                "avg_confidence": round(avg_confidence, 3),
                "min_confidence": round(min_confidence, 3),
                "total_assessments": len(processed_entries),
                "risk_categories_count": len(processed_categories),
                "risk_trend": risk_trend,
                "current_risk_level": self._determine_risk_level(current_risk),
                "overall_risk_status": self._determine_overall_status(
                    current_risk, risk_trend, avg_confidence
                ),
            },
        }

    def _determine_risk_level(self, risk_score: float) -> str:
        """Determine risk level based on score"""
        if risk_score >= 0.8:
            return "Critical"
        elif risk_score >= 0.6:
            return "High"
        elif risk_score >= 0.4:
            return "Medium"
        elif risk_score >= 0.2:
            return "Low"
        else:
            return "Minimal"

    def _determine_confidence_level(self, confidence: float) -> str:
        """Determine confidence level based on score"""
        if confidence >= 0.9:
            return "Very High"
        elif confidence >= 0.7:
            return "High"
        elif confidence >= 0.5:
            return "Medium"
        elif confidence >= 0.3:
            return "Low"
        else:
            return "Very Low"

    def _analyze_risk_trend(self, risk_scores: List[float]) -> str:
        """Analyze risk trend over time"""
        if len(risk_scores) < 3:
            return "insufficient_data"

        # Compare first third with last third
        third = len(risk_scores) // 3
        first_third_avg = (
            statistics.mean(risk_scores[:third]) if third > 0 else risk_scores[0]
        )
        last_third_avg = (
            statistics.mean(risk_scores[-third:]) if third > 0 else risk_scores[-1]
        )

        change_percent = (
            ((last_third_avg - first_third_avg) / first_third_avg) * 100
            if first_third_avg > 0
            else 0
        )

        if change_percent > 15:
            return "increasing"
        elif change_percent < -15:
            return "decreasing"
        else:
            return "stable"

    def _determine_overall_status(
        self, current_risk: float, trend: str, avg_confidence: float
    ) -> str:
        """Determine overall risk status"""
        if current_risk >= 0.7:
            if trend == "increasing":
                return "critical_escalating"
            else:
                return "critical_stable"
        elif current_risk >= 0.5:
            if trend == "increasing":
                return "high_escalating"
            elif trend == "decreasing":
                return "high_improving"
            else:
                return "high_stable"
        elif current_risk >= 0.3:
            if trend == "increasing":
                return "medium_escalating"
            elif trend == "decreasing":
                return "medium_improving"
            else:
                return "medium_stable"
        else:
            if avg_confidence > 0.7:
                return "low_confident"
            else:
                return "low_uncertain"

    def _detect_risk_alerts(
        self, entries: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Detect significant risk events or patterns"""
        alerts = []

        if len(entries) < 2:
            return alerts

        # Check for sudden spikes
        for i in range(1, len(entries)):
            current_score = entries[i]["risk_score"]
            previous_score = entries[i - 1]["risk_score"]

            # Risk spike detection
            if current_score - previous_score > 0.3:
                alerts.append(
                    {
                        "type": "risk_spike",
                        "severity": "high",
                        "timestamp": entries[i]["timestamp"],
                        "message": f"Risk increased by {(current_score - previous_score):.2f} points",
                        "details": {
                            "previous_score": previous_score,
                            "current_score": current_score,
                            "factors": entries[i]["risk_factors"],
                        },
                    }
                )

            # Risk drop detection
            elif previous_score - current_score > 0.3:
                alerts.append(
                    {
                        "type": "risk_drop",
                        "severity": "info",
                        "timestamp": entries[i]["timestamp"],
                        "message": f"Risk decreased by {(previous_score - current_score):.2f} points",
                        "details": {
                            "previous_score": previous_score,
                            "current_score": current_score,
                        },
                    }
                )

        # Check for sustained high risk
        high_risk_count = sum(1 for entry in entries[-5:] if entry["risk_score"] >= 0.7)
        if high_risk_count >= 3:
            alerts.append(
                {
                    "type": "sustained_high_risk",
                    "severity": "critical",
                    "timestamp": entries[-1]["timestamp"],
                    "message": f"High risk maintained for {high_risk_count} consecutive assessments",
                    "details": {
                        "consecutive_count": high_risk_count,
                        "latest_score": entries[-1]["risk_score"],
                    },
                }
            )

        return alerts[-10:]  # Return last 10 alerts

    def generate_html(self, processed_data: Dict[str, Any]) -> str:
        """
        Generate HTML for risk dashboard component.
        """
        metrics = processed_data.get("metrics", {})
        processed_categories = processed_data.get("processed_categories", {})
        top_risk_factors = processed_data.get("top_risk_factors", [])
        risk_level_distribution = processed_data.get("risk_level_distribution", {})
        risk_alerts = processed_data.get("risk_alerts", [])

        current_risk = metrics.get("current_risk_score", 0.0)
        current_level = metrics.get("current_risk_level", "Unknown")
        overall_status = metrics.get("overall_risk_status", "unknown")

        # Generate statistics section
        stats_html = ""
        stats_items = [
            ("Current Risk", f"{current_risk:.3f}", self._get_risk_class(current_risk)),
            (
                "Peak Risk",
                f"{metrics.get('max_risk_score', 0):.3f}",
                self._get_risk_class(metrics.get("max_risk_score", 0)),
            ),
            (
                "Average Risk",
                f"{metrics.get('avg_risk_score', 0):.3f}",
                self._get_risk_class(metrics.get("avg_risk_score", 0)),
            ),
            ("Risk Volatility", f"{metrics.get('risk_volatility', 0):.3f}", "neutral"),
            ("Avg Confidence", f"{metrics.get('avg_confidence', 0):.3f}", "neutral"),
            ("Assessments", str(metrics.get("total_assessments", 0)), "neutral"),
        ]

        for label, value, risk_class in stats_items:
            stats_html += f"""
                <div class="viz-stat-item-{self.component_id}">
                    <div class="viz-stat-value-{self.component_id} risk-{risk_class}-{self.component_id}">{value}</div>
                    <div class="viz-stat-label-{self.component_id}">{label}</div>
                </div>
            """

        # Generate risk level indicator
        risk_indicator_html = f"""
            <div class="risk-indicator-{self.component_id}">
                <div class="risk-level-{self.component_id} risk-{self._get_risk_class(current_risk)}-{self.component_id}">
                    {current_level} Risk
                </div>
                <div class="risk-progress-{self.component_id}">
                    <div class="risk-progress-bar-{self.component_id}">
                        <div class="risk-progress-fill-{self.component_id} risk-{self._get_risk_class(current_risk)}-{self.component_id}" 
                             style="width: {current_risk * 100}%">
                            {current_risk:.1%}
                        </div>
                    </div>
                </div>
                <div class="risk-status-{self.component_id}">
                    Status: {overall_status.replace('_', ' ').title()}
                </div>
            </div>
        """

        # Generate risk categories breakdown
        categories_html = ""
        for category, data in list(processed_categories.items())[:6]:
            avg_score = data["avg_score"]
            count = data["count"]
            risk_class = self._get_risk_class(avg_score)

            categories_html += f"""
                <div class="category-item-{self.component_id}">
                    <div class="category-header-{self.component_id}">
                        <span class="category-name-{self.component_id}">{category}</span>
                        <span class="category-score-{self.component_id} risk-{risk_class}-{self.component_id}">{avg_score:.3f}</span>
                    </div>
                    <div class="category-meta-{self.component_id}">
                        {count} assessments • Max: {data['max_score']:.3f}
                    </div>
                </div>
            """

        # Generate top risk factors
        factors_html = ""
        for factor, count in top_risk_factors[:8]:
            factors_html += f"""
                <div class="factor-item-{self.component_id}">
                    <span class="factor-name-{self.component_id}">{factor}</span>
                    <span class="factor-count-{self.component_id}">{count}</span>
                </div>
            """

        # Generate risk alerts
        alerts_html = ""
        for alert in risk_alerts[:5]:
            severity_class = alert.get("severity", "info")
            alert_time = self._format_timestamp(alert.get("timestamp", ""))

            alerts_html += f"""
                <div class="alert-item-{self.component_id} alert-{severity_class}-{self.component_id}">
                    <div class="alert-header-{self.component_id}">
                        <span class="alert-type-{self.component_id}">{alert['type'].replace('_', ' ').title()}</span>
                        <span class="alert-time-{self.component_id}">{alert_time}</span>
                    </div>
                    <div class="alert-message-{self.component_id}">{alert['message']}</div>
                </div>
            """

        return f"""
        <div class="viz-component-{self.component_id} viz-animate-{self.component_id}">
            <div class="viz-header-{self.component_id}">
                ⚠️ {self.component_title}
            </div>
            <div class="viz-content-{self.component_id}">
                <div class="risk-overview-{self.component_id}">
                    {risk_indicator_html}
                </div>
                
                <div class="viz-stats-grid-{self.component_id}">
                    {stats_html}
                </div>
                
                <div class="charts-grid-{self.component_id}">
                    <div class="viz-chart-container-{self.component_id}">
                        <canvas id="riskProgressionChart_{self.component_id}"></canvas>
                    </div>
                    <div class="viz-chart-container-{self.component_id}">
                        <canvas id="riskCategoriesChart_{self.component_id}"></canvas>
                    </div>
                </div>
                
                <div class="analysis-grid-{self.component_id}">
                    <div class="analysis-section-{self.component_id}">
                        <h4>Risk Categories</h4>
                        <div class="categories-list-{self.component_id}">
                            {categories_html}
                        </div>
                    </div>
                    
                    <div class="analysis-section-{self.component_id}">
                        <h4>Top Risk Factors</h4>
                        <div class="factors-list-{self.component_id}">
                            {factors_html}
                        </div>
                    </div>
                </div>
                
                {f'''
                <div class="alerts-section-{self.component_id}">
                    <h4>Risk Alerts</h4>
                    <div class="alerts-list-{self.component_id}">
                        {alerts_html}
                    </div>
                </div>
                ''' if alerts_html else ''}
            </div>
        </div>
        """

    def _get_risk_class(self, risk_score: float) -> str:
        """Get CSS class based on risk score"""
        if risk_score >= 0.8:
            return "critical"
        elif risk_score >= 0.6:
            return "high"
        elif risk_score >= 0.4:
            return "medium"
        elif risk_score >= 0.2:
            return "low"
        else:
            return "minimal"

    def generate_javascript(self, processed_data: Dict[str, Any]) -> str:
        """
        Generate JavaScript for interactive risk charts.
        """
        risk_scores = processed_data.get("risk_scores", [])
        confidence_scores = processed_data.get("confidence_scores", [])
        timestamps = processed_data.get("timestamps", [])
        processed_categories = processed_data.get("processed_categories", {})
        processed_entries = processed_data.get("processed_entries", [])

        # Risk progression chart data
        progression_chart_data = {
            "labels": timestamps,
            "datasets": [
                {
                    "label": "Risk Score",
                    "data": risk_scores,
                    "borderColor": "#dc3545",
                    "backgroundColor": "rgba(220, 53, 69, 0.1)",
                    "tension": 0.4,
                    "fill": True,
                    "pointRadius": 4,
                    "pointHoverRadius": 6,
                    "pointBackgroundColor": [
                        self._get_point_color(score) for score in risk_scores
                    ],
                    "pointBorderColor": "#fff",
                    "pointBorderWidth": 2,
                },
                {
                    "label": "Confidence",
                    "data": confidence_scores,
                    "borderColor": "#17a2b8",
                    "backgroundColor": "rgba(23, 162, 184, 0.1)",
                    "tension": 0.4,
                    "fill": False,
                    "pointRadius": 3,
                    "pointHoverRadius": 5,
                    "yAxisID": "y1",
                },
            ],
        }

        # Risk categories chart data (radar)
        categories_data = {
            "labels": list(processed_categories.keys())[:8],
            "datasets": [
                {
                    "label": "Average Risk Score",
                    "data": [
                        data["avg_score"]
                        for data in list(processed_categories.values())[:8]
                    ],
                    "borderColor": "#667eea",
                    "backgroundColor": "rgba(102, 126, 234, 0.2)",
                    "pointBackgroundColor": "#667eea",
                    "pointBorderColor": "#fff",
                    "pointHoverBackgroundColor": "#fff",
                    "pointHoverBorderColor": "#667eea",
                }
            ],
        }

        return f"""
        // Risk Dashboard Component
        (function() {{
            const riskData = {json.dumps(processed_entries)};
            
            // Risk Progression Chart
            const progressionCtx = document.getElementById('riskProgressionChart_{self.component_id}');
            if (progressionCtx) {{
                new Chart(progressionCtx.getContext('2d'), {{
                    type: 'line',
                    data: {json.dumps(progression_chart_data)},
                    options: {{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {{
                            title: {{
                                display: true,
                                text: 'Risk Score Progression Over Time',
                                font: {{ size: 16, weight: 'bold' }}
                            }},
                            legend: {{
                                display: true,
                                position: 'top'
                            }},
                            tooltip: {{
                                callbacks: {{
                                    afterBody: function(context) {{
                                        const index = context[0].dataIndex;
                                        const entry = riskData[index];
                                        if (entry && entry.risk_factors.length > 0) {{
                                            return ['Risk Factors:', ...entry.risk_factors.slice(0, 3)];
                                        }}
                                        return [];
                                    }}
                                }}
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
                            }},
                            y1: {{
                                type: 'linear',
                                display: true,
                                position: 'right',
                                min: 0,
                                max: 1,
                                title: {{
                                    display: true,
                                    text: 'Confidence'
                                }},
                                grid: {{
                                    drawOnChartArea: false
                                }}
                            }},
                            x: {{
                                title: {{
                                    display: true,
                                    text: 'Timeline'
                                }}
                            }}
                        }},
                        animation: {{
                            duration: {1000 if self.config.enable_animations else 0}
                        }}
                    }}
                }});
            }}
            
            // Risk Categories Chart
            const categoriesCtx = document.getElementById('riskCategoriesChart_{self.component_id}');
            if (categoriesCtx) {{
                new Chart(categoriesCtx.getContext('2d'), {{
                    type: 'radar',
                    data: {json.dumps(categories_data)},
                    options: {{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {{
                            title: {{
                                display: true,
                                text: 'Risk Categories Analysis',
                                font: {{ size: 16, weight: 'bold' }}
                            }}
                        }},
                        scales: {{
                            r: {{
                                beginAtZero: true,
                                max: 1,
                                ticks: {{
                                    stepSize: 0.2,
                                    callback: function(value) {{
                                        return value.toFixed(1);
                                    }}
                                }}
                            }}
                        }},
                        animation: {{
                            duration: {1000 if self.config.enable_animations else 0}
                        }}
                    }}
                }});
            }}
            
            // Add interactivity to risk elements
            document.querySelectorAll('.category-item-{self.component_id}').forEach(item => {{
                item.addEventListener('click', function() {{
                    const categoryName = this.querySelector('.category-name-{self.component_id}').textContent;
                    console.log('Risk Category Details:', categoryName);
                    
                    // Highlight effect
                    this.style.transform = 'scale(1.02)';
                    setTimeout(() => {{
                        this.style.transform = 'scale(1)';
                    }}, 200);
                }});
                item.style.cursor = 'pointer';
            }});
            
            document.querySelectorAll('.alert-item-{self.component_id}').forEach(alert => {{
                alert.addEventListener('click', function() {{
                    // Expand alert details
                    this.style.opacity = '0.7';
                    setTimeout(() => {{
                        this.style.opacity = '1';
                    }}, 300);
                }});
                alert.style.cursor = 'pointer';
            }});
            
            console.log('Risk Dashboard Component loaded successfully');
        }})();
        """

    def _get_point_color(self, score: float) -> str:
        """Get point color based on risk score"""
        if score >= 0.8:
            return "#dc3545"  # Critical - red
        elif score >= 0.6:
            return "#fd7e14"  # High - orange
        elif score >= 0.4:
            return "#ffc107"  # Medium - yellow
        elif score >= 0.2:
            return "#28a745"  # Low - green
        else:
            return "#6c757d"  # Minimal - gray

    def generate_css(self) -> str:
        """
        Generate CSS styles for risk dashboard component.
        """
        colors = self._get_theme_colors()
        base_css = super().generate_css()

        component_css = f"""
        .risk-overview-{self.component_id} {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 10px;
            margin: 20px 0;
            text-align: center;
        }}
        
        .risk-level-{self.component_id} {{
            font-size: 1.8em;
            font-weight: bold;
            margin-bottom: 15px;
        }}
        
        .risk-progress-{self.component_id} {{
            margin: 15px 0;
        }}
        
        .risk-progress-bar-{self.component_id} {{
            width: 100%;
            height: 30px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 15px;
            overflow: hidden;
            backdrop-filter: blur(10px);
        }}
        
        .risk-progress-fill-{self.component_id} {{
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 0.9em;
            transition: width 0.8s ease;
        }}
        
        .risk-status-{self.component_id} {{
            font-size: 1.1em;
            margin-top: 10px;
            opacity: 0.9;
        }}
        
        .risk-critical-{self.component_id} {{ background: #dc3545 !important; color: white !important; }}
        .risk-high-{self.component_id} {{ background: #fd7e14 !important; color: white !important; }}
        .risk-medium-{self.component_id} {{ background: #ffc107 !important; color: #212529 !important; }}
        .risk-low-{self.component_id} {{ background: #28a745 !important; color: white !important; }}
        .risk-minimal-{self.component_id} {{ background: #6c757d !important; color: white !important; }}
        .risk-neutral-{self.component_id} {{ background: {colors['primary']} !important; color: white !important; }}
        
        .charts-grid-{self.component_id} {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 30px 0;
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
        
        .categories-list-{self.component_id}, .factors-list-{self.component_id} {{
            background: {colors['light']};
            border-radius: 8px;
            padding: 15px;
            max-height: 300px;
            overflow-y: auto;
        }}
        
        .category-item-{self.component_id}, .factor-item-{self.component_id} {{
            padding: 10px;
            margin: 8px 0;
            background: {colors['background']};
            border-radius: 6px;
            border-left: 4px solid {colors['primary']};
            transition: all 0.3s ease;
        }}
        
        .category-item-{self.component_id}:hover, .factor-item-{self.component_id}:hover {{
            transform: translateX(3px);
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
        }}
        
        .category-header-{self.component_id} {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5px;
        }}
        
        .category-name-{self.component_id}, .factor-name-{self.component_id} {{
            font-weight: 500;
            flex-grow: 1;
        }}
        
        .category-score-{self.component_id}, .factor-count-{self.component_id} {{
            padding: 3px 8px;
            border-radius: 10px;
            font-size: 0.9em;
            font-weight: 600;
            color: white;
        }}
        
        .category-meta-{self.component_id} {{
            font-size: 0.85em;
            color: {colors['text']};
            opacity: 0.7;
        }}
        
        .factor-item-{self.component_id} {{
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        
        .factor-count-{self.component_id} {{
            background: {colors['info']};
        }}
        
        .alerts-section-{self.component_id} {{
            margin-top: 30px;
        }}
        
        .alerts-section-{self.component_id} h4 {{
            color: {colors['danger']};
            margin-bottom: 15px;
            font-size: 1.2em;
            font-weight: 600;
        }}
        
        .alerts-list-{self.component_id} {{
            max-height: 250px;
            overflow-y: auto;
        }}
        
        .alert-item-{self.component_id} {{
            padding: 12px;
            margin: 10px 0;
            border-radius: 6px;
            border-left: 4px solid;
            transition: all 0.3s ease;
        }}
        
        .alert-critical-{self.component_id} {{
            background: rgba(220, 53, 69, 0.1);
            border-left-color: #dc3545;
        }}
        
        .alert-high-{self.component_id} {{
            background: rgba(253, 126, 20, 0.1);
            border-left-color: #fd7e14;
        }}
        
        .alert-info-{self.component_id} {{
            background: rgba(23, 162, 184, 0.1);
            border-left-color: #17a2b8;
        }}
        
        .alert-header-{self.component_id} {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5px;
        }}
        
        .alert-type-{self.component_id} {{
            font-weight: 600;
            font-size: 0.95em;
        }}
        
        .alert-time-{self.component_id} {{
            font-family: monospace;
            font-size: 0.85em;
            opacity: 0.7;
        }}
        
        .alert-message-{self.component_id} {{
            font-size: 0.9em;
            line-height: 1.4;
        }}
        
        @media (max-width: 768px) {{
            .charts-grid-{self.component_id} {{
                grid-template-columns: 1fr;
                gap: 15px;
            }}
            
            .analysis-grid-{self.component_id} {{
                grid-template-columns: 1fr;
                gap: 15px;
            }}
            
            .risk-level-{self.component_id} {{
                font-size: 1.5em;
            }}
            
            .categories-list-{self.component_id}, .factors-list-{self.component_id} {{
                max-height: 200px;
            }}
        }}
        """

        return base_css + component_css
