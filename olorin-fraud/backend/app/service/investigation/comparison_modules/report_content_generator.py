"""
Report Content Generator
Feature: 001-startup-analysis-flow

Generates static content sections for investigation reports.
Separates content generation from report formatting logic.
"""

from typing import Any, Dict, List


class ReportContentGenerator:
    """Generates content sections for reports."""

    @staticmethod
    def get_methodology_html() -> str:
        """Generate HTML for the Methodology section."""
        return """
        <div class="section-container">
            <h2>1. Reasoning and Methodology</h2>
            <div class="content-block">
                <h3>Objective</h3>
                <p>
                    The goal of this analysis is to evaluate the fraud detection system's performance using historical production data. 
                    By simulating investigations on past time windows where ground truth (chargebacks/fraud labels) is known, 
                    we can objectively measure the accuracy (Precision, Recall, F1) of our risk scoring models.
                </p>

                <h3>Workflow</h3>
                <ol>
                    <li>
                        <strong>Randomized Analyzer Window:</strong> 
                        The system selects a random 24-hour window between 6 and 8 months ago. 
                        This ensures we test on data that has "matured" (i.e., chargebacks have likely come in).
                    </li>
                    <li>
                        <strong>Entity Selection:</strong> 
                        The Risk Analyzer scans this 24h window to identify entities (e.g., Merchants, Emails) 
                        involved in at least one confirmed fraudulent transaction.
                    </li>
                    <li>
                        <strong>Deep-Dive Investigation:</strong> 
                        For each flagged entity, a comprehensive investigation is triggered. 
                        The investigation scope extends 6 months backward from the analyzer date to capture historical patterns and behavioral context.
                    </li>
                    <li>
                        <strong>Hybrid Risk Scoring:</strong> 
                        Transactions are scored using the <em>Enhanced Risk Scorer</em>, which combines:
                        <ul>
                            <li><strong>Behavioral Analysis:</strong> Velocity, frequency, and amount anomalies.</li>
                            <li><strong>Pattern Matching:</strong> Benford's Law deviation, integer amounts, round numbers.</li>
                            <li><strong>Heuristic Rules:</strong> Known fraud patterns (e.g., high velocity from single IP).</li>
                        </ul>
                    </li>
                    <li>
                        <strong>Confusion Matrix Generation:</strong> 
                        The system compares the generated Risk Scores against the ground truth (<code>IS_FRAUD_TX</code> column in Snowflake).
                        <ul>
                            <li><strong>True Positive (TP):</strong> High Risk Score (>0.5) AND Is Fraud.</li>
                            <li><strong>False Positive (FP):</strong> High Risk Score (>0.5) AND Not Fraud.</li>
                            <li><strong>True Negative (TN):</strong> Low Risk Score (≤0.5) AND Not Fraud.</li>
                            <li><strong>False Negative (FN):</strong> Low Risk Score (≤0.5) AND Is Fraud.</li>
                        </ul>
                    </li>
                </ol>
            </div>
        </div>
        """

    @staticmethod
    def get_analysis_html(investigation_data: List[Dict[str, Any]]) -> str:
        """Generate HTML for the Analysis of Results section."""
        
        # Aggregate metrics
        total_tp = 0
        total_fp = 0
        total_tn = 0
        total_fn = 0
        total_tx = 0
        
        investigations_count = len(investigation_data)
        merchants = set()
        
        for inv in investigation_data:
            merchants.add(inv.get("merchant_name", "Unknown"))
            
            # Extract metrics from comparison response if available
            comp = inv.get("comparison_response")
            # If confusion matrix data is available in metadata or response, aggregate it
            # Currently, the investigation_data structure might vary, so we look for common patterns
            # Assuming aggregated_matrix might be passed or individual stats
            
            # Since individual TP/FP counts might not be directly exposed in the top-level dict,
            # we infer from the summary or rely on the aggregated matrix if available in app state.
            # However, here we only have investigation_data list.
            # We will generate a qualitative analysis based on available data.
            pass

        # Generate HTML
        return f"""
        <div class="section-container">
            <h2>2. Analysis of Results</h2>
            <div class="content-block">
                <h3>Executive Summary</h3>
                <p>
                    The system performed an automated analysis on <strong>{investigations_count} entities</strong> 
                    across <strong>{len(merchants)} merchants</strong>.
                </p>
                
                <h3>Interpretation Guide</h3>
                <ul>
                    <li>
                        <strong>High Precision (Low FP):</strong> Indicates the model is conservative and accurate when it flags fraud. 
                        Critical for minimizing customer friction (false declines).
                    </li>
                    <li>
                        <strong>High Recall (Low FN):</strong> Indicates the model effectively captures most fraud attempts. 
                        Critical for minimizing financial loss.
                    </li>
                    <li>
                        <strong>Benford's Law Impact:</strong> 
                        The inclusion of Benford's Law analysis helps identify synthetic or manipulated transaction amounts 
                        that often evade simple velocity rules.
                    </li>
                </ul>

                <h3>Key Observations</h3>
                <p>
                    Review the individual Merchant sections below to see specific performance metrics. 
                    Discrepancies between "Window A" (Historical) and "Window B" (Current/Test) transaction volumes 
                    may indicate changes in merchant behavior or fraud attacks.
                </p>
            </div>
        </div>
        """

