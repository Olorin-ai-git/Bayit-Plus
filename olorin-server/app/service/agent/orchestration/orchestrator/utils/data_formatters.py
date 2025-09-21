"""
Data Formatters

Formats different types of data for LLM analysis and processing.
"""

from typing import Dict, Any, List


class DataFormatters:
    """Formats various data types for LLM consumption."""

    @staticmethod
    def format_snowflake_for_llm(snowflake_data) -> str:
        """Format Snowflake data for LLM analysis."""
        if not snowflake_data:
            return "No Snowflake data available"

        if isinstance(snowflake_data, dict) and "results" in snowflake_data:
            results = snowflake_data["results"]
            if not results:
                return "No transaction records found"

            # Extract key metrics
            model_scores = [r.get("MODEL_SCORE", 0) for r in results if "MODEL_SCORE" in r]
            fraud_flags = [r for r in results if r.get("IS_FRAUD_TX")]

            summary = f"""- Total transactions: {len(results)}
- Average MODEL_SCORE: {sum(model_scores)/len(model_scores) if model_scores else 0:.3f}
- High risk transactions (MODEL_SCORE > 0.7): {len([s for s in model_scores if s > 0.7])}
- Confirmed fraud transactions: {len(fraud_flags)}
- Date range: {results[0].get('TX_DATETIME', 'N/A')} to {results[-1].get('TX_DATETIME', 'N/A') if results else 'N/A'}"""

            return summary

        return f"Raw data: {str(snowflake_data)[:500]}"

    @staticmethod
    def format_tools_for_llm(tool_results: Dict) -> str:
        """Format tool results for LLM analysis."""
        if not tool_results:
            return "No additional tools executed"

        formatted = []
        for tool_name, result in tool_results.items():
            if isinstance(result, dict):
                # Extract key findings from each tool
                if "risk_score" in result:
                    formatted.append(f"- {tool_name}: Risk score {result['risk_score']}")
                elif "is_malicious" in result:
                    formatted.append(f"- {tool_name}: {'Malicious' if result['is_malicious'] else 'Clean'}")
                else:
                    formatted.append(f"- {tool_name}: {str(result)[:100]}")
            else:
                formatted.append(f"- {tool_name}: {str(result)[:100]}")

        return "\n".join(formatted)

    @staticmethod
    def format_domains_for_llm(domain_findings: Dict) -> str:
        """Format domain findings for LLM analysis."""
        if not domain_findings:
            return "No domain analysis completed"

        formatted = []
        for domain, findings in domain_findings.items():
            if isinstance(findings, dict):
                risk = findings.get("risk_score", 0.0)
                indicators = findings.get("risk_indicators", [])
                formatted.append(f"""### {domain.title()} Domain
- Risk Score: {risk:.2f}
- Indicators: {', '.join(indicators[:3]) if indicators else 'None'}
- Confidence: {findings.get('confidence', 0.0):.2f}""")

        return "\n\n".join(formatted) if formatted else "No domain findings"

    @staticmethod
    def format_risk_indicators_for_llm(indicators: List) -> str:
        """Format risk indicators for LLM analysis."""
        if not indicators:
            return "No specific risk indicators identified"

        unique = list(set(indicators))[:15]  # Top 15 unique indicators
        return "\n".join([f"- {ind}" for ind in unique])

    @staticmethod
    def summarize_snowflake_data(snowflake_data) -> str:
        """Create a summary of Snowflake data for analysis."""
        if not snowflake_data:
            return "No data available for analysis"

        try:
            if isinstance(snowflake_data, str):
                return f"Raw data summary: {snowflake_data[:200]}..."

            if isinstance(snowflake_data, dict):
                if "results" in snowflake_data:
                    results = snowflake_data["results"]
                    return f"Transaction data: {len(results)} records found"
                else:
                    return f"Structured data: {len(snowflake_data)} fields"

            if isinstance(snowflake_data, list):
                return f"List data: {len(snowflake_data)} items"

            return f"Data type: {type(snowflake_data).__name__}"

        except Exception as e:
            return f"Data parsing error: {str(e)}"

    @staticmethod
    def format_risk_indicators(indicators: List[str]) -> str:
        """Format risk indicators for display."""
        if not indicators:
            return "No risk indicators detected"

        # Remove duplicates and limit to most important
        unique_indicators = list(set(indicators))[:10]

        if len(unique_indicators) == 1:
            return f"Primary risk indicator: {unique_indicators[0]}"
        else:
            return f"Risk indicators ({len(unique_indicators)}): " + ", ".join(unique_indicators)

    @staticmethod
    def format_domain_findings(domain_findings: Dict[str, Any]) -> str:
        """Format domain findings for display."""
        if not domain_findings:
            return "No domain analysis completed"

        domain_summary = []
        for domain, findings in domain_findings.items():
            if isinstance(findings, dict):
                risk_score = findings.get("risk_score", 0.0)
                confidence = findings.get("confidence", 0.0)
                domain_summary.append(f"{domain.title()}: {risk_score:.2f} (confidence: {confidence:.2f})")

        return "Domain analysis: " + " | ".join(domain_summary) if domain_summary else "No valid domain findings"