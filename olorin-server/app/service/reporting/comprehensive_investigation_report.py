#!/usr/bin/env python3
"""
Comprehensive Investigation HTML Report Generator

This module creates a unified HTML report that combines investigation analysis
and test results into a single comprehensive document. It processes ALL files
in the investigation folder to provide complete insights.

Features:
- Executive summary with key findings
- Investigation timeline and flow
- Agent analysis results
- Risk assessment dashboard
- Performance metrics
- Tool execution details
- Chain of thought analysis
- Evidence collection
- Geographic and behavioral insights
- Interactive visualizations

Generated after investigation completion, this report provides stakeholders
with complete visibility into the fraud detection investigation process.
"""

import base64
import json
import logging
import re
import statistics
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

from app.service.reporting.olorin_logo import OLORIN_FOOTER, get_olorin_header

logger = logging.getLogger(__name__)


@dataclass
class InvestigationSummary:
    """Summary of investigation key metrics and findings."""

    investigation_id: str
    scenario: str
    entity_id: str
    entity_type: str
    final_risk_score: float
    confidence_score: float
    duration_seconds: float
    status: str
    agents_executed: List[str]
    tools_used: int
    evidence_points: int
    geographic_countries: int
    geographic_cities: int
    critical_findings: List[str]
    recommendations: List[str]


class ComprehensiveInvestigationReportGenerator:
    """
    Generates comprehensive HTML reports from investigation folders.

    Processes all investigation files to create a unified report containing:
    - Investigation analysis
    - Test execution results
    - Performance metrics
    - Interactive visualizations
    """

    def __init__(self, base_logs_dir: Optional[Path] = None):
        """Initialize the comprehensive report generator."""
        self.base_logs_dir = Path(base_logs_dir) if base_logs_dir else Path.cwd()
        self.logger = logging.getLogger(self.__class__.__name__)

    def generate_comprehensive_report(
        self,
        investigation_folder: Path,
        output_path: Optional[Path] = None,
        title: Optional[str] = None,
        risk_analyzer_info: Optional[Dict[str, Any]] = None,
    ) -> Path:
        """
        Generate comprehensive HTML report from investigation folder.

        Args:
            investigation_folder: Path to investigation folder
            output_path: Output path for HTML report (optional)
            title: Report title (optional)

        Returns:
            Path to generated HTML report
        """
        self.logger.info(
            f"🔄 Generating comprehensive report for: {investigation_folder}"
        )

        # Set output path
        if not output_path:
            output_path = (
                investigation_folder / "comprehensive_investigation_report.html"
            )

        # Set default title
        if not title:
            title = f"Comprehensive Investigation Report - {investigation_folder.name}"

        try:
            # Process all investigation files
            investigation_data = self._process_investigation_folder(
                investigation_folder
            )

            # Add risk analyzer info to investigation data
            if risk_analyzer_info:
                investigation_data["risk_analyzer_info"] = risk_analyzer_info

            # Generate HTML content
            html_content = self._generate_html_report(investigation_data, title)

            # Write to file
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(html_content)

            self.logger.info(f"✅ Comprehensive report generated: {output_path}")
            return output_path

        except Exception as e:
            self.logger.error(f"❌ Failed to generate comprehensive report: {e}")
            raise

    def _process_investigation_folder(self, folder_path: Path) -> Dict[str, Any]:
        """Process all files in investigation folder."""
        self.logger.info(f"📁 Processing investigation folder: {folder_path}")

        data = {
            "folder_path": folder_path,
            "folder_name": folder_path.name,
            "metadata": {},
            "summary": None,
            "agents": {},
            "tools": {},
            "journey": {},
            "thought_processes": [],
            "activities": [],
            "performance": {},
            "validation": {},
            "test_results": {},
            "server_logs": {},
            "files_processed": 0,
            "processing_errors": [],
        }

        # Process each file type
        for file_path in folder_path.rglob("*"):
            if file_path.is_file():
                try:
                    self._process_file(file_path, data)
                    data["files_processed"] += 1
                except Exception as e:
                    error_msg = f"Error processing {file_path.name}: {str(e)}"
                    data["processing_errors"].append(error_msg)
                    self.logger.warning(error_msg)

        # Generate investigation summary
        data["summary"] = self._generate_investigation_summary(data)

        self.logger.info(
            f"📊 Processed {data['files_processed']} files with {len(data['processing_errors'])} errors"
        )
        return data

    def _process_file(self, file_path: Path, data: Dict[str, Any]) -> None:
        """Process individual file based on its type."""
        filename = file_path.name.lower()

        if filename == "metadata.json":
            data["metadata"] = self._load_json_file(file_path)

        elif filename == "summary.json":
            data["summary_raw"] = self._load_json_file(file_path)

        elif filename.startswith("investigation_result"):
            data["agents"] = self._load_json_file(file_path)

        elif filename == "performance_metrics.json":
            data["performance"] = self._load_json_file(file_path)

        elif filename == "validation_results.json":
            data["validation"] = self._load_json_file(file_path)

        elif filename == "merchant_validation_results.json":
            # Load merchant validation results
            merchant_validation = self._load_json_file(file_path)
            if "validation" not in data:
                data["validation"] = {}
            data["validation"]["merchant"] = merchant_validation

        elif filename == "journey_tracking.json":
            data["journey"] = self._load_json_file(file_path)

        elif filename.startswith("thought_process_"):
            thought_data = self._load_json_file(file_path)
            if thought_data:
                data["thought_processes"].append(thought_data)

        elif filename == "structured_activities.jsonl":
            data["activities"] = self._load_jsonl_file(file_path)

        elif filename.startswith("unified_test_report") and filename.endswith(".json"):
            data["test_results"] = self._load_json_file(file_path)

        elif filename == "server_logs" or filename == "server_logs.json":
            data["server_logs"] = self._load_json_file(file_path)

        elif filename == "server_logs.txt" or filename.endswith("_logs.txt"):
            # Handle text-based log files
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    log_content = f.read()
                    data["server_logs"] = {
                        "raw_logs": log_content,
                        "log_count": len(log_content.split("\n")),
                    }
            except Exception as e:
                self.logger.warning(f"Failed to load text log file {file_path}: {e}")
                data["server_logs"] = {}

    def _load_json_file(self, file_path: Path) -> Dict[str, Any]:
        """Load JSON file safely."""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            self.logger.warning(f"Failed to load JSON file {file_path}: {e}")
            return {}

    def _load_jsonl_file(self, file_path: Path) -> List[Dict[str, Any]]:
        """Load JSONL file safely."""
        try:
            data = []
            with open(file_path, "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip():
                        data.append(json.loads(line))
            return data
        except Exception as e:
            self.logger.warning(f"Failed to load JSONL file {file_path}: {e}")
            return []

    def _generate_investigation_summary(
        self, data: Dict[str, Any]
    ) -> InvestigationSummary:
        """Generate investigation summary from processed data."""
        metadata = data.get("metadata", {})
        agents_data = data.get("agents", {})
        performance = data.get("performance", {})
        validation = data.get("validation", {})
        test_results = data.get("test_results", {})
        journey = data.get("journey", {})
        thought_processes = data.get("thought_processes", [])

        # Extract key metrics
        investigation_id = metadata.get("investigation_id", "unknown")
        if investigation_id == "unknown" and journey:
            investigation_id = journey.get("investigation_id", "unknown")

        scenario = metadata.get("scenario", "unknown")
        entity_id = metadata.get("config", {}).get("entity_id", "unknown")
        entity_type = metadata.get("config", {}).get("entity_type", "unknown")

        # CRITICAL FIX: Check nested config structure (metadata.config.config.entity_type)
        if entity_type == "unknown" and "config" in metadata.get("config", {}):
            nested_config = metadata.get("config", {}).get("config", {})
            if entity_id == "unknown":
                entity_id = nested_config.get("entity_id") or entity_id
            entity_type = nested_config.get("entity_type") or entity_type

        # Extract entity info from agents_data (investigation_result.json) if available
        if (entity_id == "unknown" or entity_type == "unknown") and agents_data:
            # Try to get entity_id from agent_results first
            agent_results = agents_data.get("agent_results", {})
            if agent_results:
                # Check first agent result for entity info
                first_agent = next(iter(agent_results.values()), {})
                findings = first_agent.get("findings", {})
                if entity_id == "unknown":
                    # Try to extract from investigation_id or entity_id in findings
                    entity_id = findings.get("entity_id") or agents_data.get(
                        "investigation_id", entity_id
                    )
                if entity_type == "unknown":
                    entity_type = (
                        findings.get("entity_type")
                        or findings.get("domain")
                        or entity_type
                    )

            if entity_id == "unknown":
                entity_id = agents_data.get(
                    "investigation_id", entity_id
                )  # Fallback to investigation_id

            # CRITICAL FIX: Infer entity_type from entity_id format (IPv6/IPv4 detection)
            if entity_type == "unknown" and entity_id != "unknown":
                # IPv6 addresses contain multiple colons
                if ":" in entity_id and entity_id.count(":") >= 2:
                    entity_type = "ip"
                # IPv4 addresses have 3 dots
                elif "." in entity_id and entity_id.count(".") == 3:
                    entity_type = "ip"
                elif "@" in entity_id:
                    entity_type = "email"
                elif len(entity_id) == 36 and "-" in entity_id:  # UUID format
                    entity_type = "device_id"
                else:
                    entity_type = "user_id"

        # Extract entity info from journey if still unknown
        if (entity_id == "unknown" or entity_type == "unknown") and journey:
            node_executions = journey.get("node_executions", [])
            if node_executions:
                first_node = node_executions[0]
                input_state = first_node.get("input_state", {})
                if entity_id == "unknown":
                    entity_id = input_state.get("entity_id", entity_id)
                if entity_type == "unknown":
                    entity_type = input_state.get("entity_type", entity_type)

        # Risk and confidence scores - get from agents_data (investigation_result.json)
        final_risk_score = agents_data.get("final_risk_score", 0.0)
        confidence_score = agents_data.get("confidence", 0.0)

        # If no agent data, try to extract from thought processes
        if final_risk_score == 0.0 and thought_processes:
            # Extract risk scores from thought processes
            risk_scores = []
            for tp in thought_processes:
                if isinstance(tp, dict):
                    final_assessment = tp.get("final_assessment", {})
                    if isinstance(final_assessment, dict):
                        risk = final_assessment.get(
                            "risk_score"
                        ) or final_assessment.get("risk")
                        if risk:
                            risk_scores.append(float(risk))
            if risk_scores:
                final_risk_score = sum(risk_scores) / len(risk_scores)

        # Extract confidence from thought processes if not found in agents_data
        if confidence_score == 0.0 and thought_processes:
            confidence_scores = []
            for tp in thought_processes:
                if isinstance(tp, dict):
                    final_assessment = tp.get("final_assessment", {})
                    if isinstance(final_assessment, dict):
                        # Try multiple possible confidence field names
                        conf = (
                            final_assessment.get("confidence")
                            or final_assessment.get("confidence_score")
                            or final_assessment.get("confidence_level")
                        )
                        if conf:
                            try:
                                conf_float = float(conf)
                                if conf_float > 0:
                                    confidence_scores.append(conf_float)
                            except (ValueError, TypeError):
                                pass
            if confidence_scores:
                confidence_score = sum(confidence_scores) / len(confidence_scores)

        # Duration - check multiple sources
        duration = 0.0
        if performance:
            # Check for total_duration or calculate from agent_timings
            duration = performance.get("total_duration", 0.0)
            if duration == 0.0 and "agent_timings" in performance:
                # Calculate total duration from agent timings
                agent_timings = performance.get("agent_timings", {})
                for agent_name, timing_data in agent_timings.items():
                    if isinstance(timing_data, dict) and "duration" in timing_data:
                        duration += timing_data.get("duration", 0.0)

        # Calculate duration from journey if not available
        if duration == 0.0 and journey:
            start_ts = journey.get("start_timestamp")
            end_ts = journey.get("end_timestamp")
            if start_ts and end_ts:
                try:
                    from datetime import datetime

                    start = datetime.fromisoformat(start_ts.replace("Z", "+00:00"))
                    end = datetime.fromisoformat(end_ts.replace("Z", "+00:00"))
                    duration = (end - start).total_seconds()
                except Exception:
                    pass

        # Status - determine from multiple sources (prioritize journey over metadata)
        status = "unknown"

        # First check journey (most reliable source)
        if journey:
            journey_status = journey.get("status", "unknown")
            # Normalize status values
            if journey_status in ["COMPLETED", "completed", "SUCCESS", "success"]:
                status = "completed"
            elif journey_status in ["FAILED", "failed", "ERROR", "error"]:
                status = "failed"
            elif journey_status in ["IN_PROGRESS", "in_progress", "RUNNING", "running"]:
                status = "in_progress"
            elif journey_status != "unknown":
                status = journey_status.lower()
            # Also check if journey has end_timestamp (indicates completion)
            elif journey.get("end_timestamp"):
                status = "completed"

        # Fallback to metadata if journey status is unknown
        if status == "unknown":
            metadata_status = metadata.get("status", "unknown")
            if metadata_status not in ["unknown", "initialized", "INITIALIZED"]:
                status = metadata_status.lower()

        # Fallback to test results
        if status == "unknown" and test_results:
            investigation_results = test_results.get("investigation_results", {})
            test_status = investigation_results.get("status", "unknown")
            if test_status != "unknown":
                status = test_status.lower()

        # Final fallback: if we have successful agents, mark as completed
        if status in ["unknown", "initialized", "INITIALIZED"]:
            # This will be checked after agents_executed is populated below
            pass

        # Agent execution info - check multiple data sources
        agents_executed = []
        agent_results = {}
        tools_used = 0

        # Try to get agent results from investigation data first
        if agents_data and "agent_results" in agents_data:
            agent_results = agents_data.get("agent_results", {})
            for agent_name, result in agent_results.items():
                if result.get("status") == "success":
                    agents_executed.append(agent_name)

            # Count tools from agent findings (specifically risk_aggregation)
            risk_agg = agent_results.get("risk_aggregation", {})
            if risk_agg and "findings" in risk_agg:
                tools_used = risk_agg["findings"].get("tools_used", 0)
            else:
                # Fallback: count tools across all agents
                tools_used = 0
                for agent_name, agent_data in agent_results.items():
                    if isinstance(agent_data, dict) and "findings" in agent_data:
                        findings = agent_data["findings"]
                        if "tools_used" in findings:
                            tools_used += findings["tools_used"]

        # If no agents found, extract from thought processes
        if not agents_executed and thought_processes:
            for tp in thought_processes:
                if isinstance(tp, dict):
                    agent_name = tp.get("agent_name", "")
                    if agent_name:
                        # Extract agent name (e.g., "device_agent" -> "device")
                        clean_name = agent_name.replace("_agent", "").replace("_", " ")
                        if clean_name not in agents_executed:
                            agents_executed.append(clean_name)
                            # Create agent result entry from thought process
                            final_assessment = tp.get("final_assessment", {})
                            risk_score = 0.0
                            if isinstance(final_assessment, dict):
                                risk_score = float(
                                    final_assessment.get(
                                        "risk_score", final_assessment.get("risk", 0.0)
                                    )
                                )

                            agent_results[clean_name] = {
                                "status": "success",
                                "risk_score": risk_score,
                                "findings": final_assessment,
                            }

        # If no agents found, try from journey node executions
        if not agents_executed and journey:
            node_executions = journey.get("node_executions", [])
            for node in node_executions:
                node_name = node.get("node_name", "")
                if (
                    node_name
                    and "agent" in node_name.lower()
                    and node.get("status") != "NodeStatus.FAILED"
                ):
                    # Extract agent name from node
                    agent_name = node_name.replace("_agent", "").replace("_", " ")
                    if agent_name not in agents_executed:
                        agents_executed.append(agent_name)

        # If no agents found, try from test_results
        if (
            not agents_executed
            and test_results
            and "investigation_results" in test_results
        ):
            investigation_results = test_results.get("investigation_results", {})
            # Check for agent execution data in test results
            if "agent_executions" in investigation_results:
                for agent_name, status in investigation_results[
                    "agent_executions"
                ].items():
                    if status == "success":
                        agents_executed.append(agent_name)
            # Count tools from test results if available
            if "tools_used" in investigation_results:
                tools_used = investigation_results.get("tools_used", 0)

        # If still no results, try direct agents_data structure
        if not agents_executed and agents_data:
            # Check if agents_data itself contains agent execution info
            for key, value in agents_data.items():
                if isinstance(value, dict) and value.get("status") == "success":
                    agents_executed.append(key)
                    agent_results[key] = value

        # Count tools from journey node executions if not already counted
        if tools_used == 0 and journey:
            node_executions = journey.get("node_executions", [])
            tool_names = set()
            for node in node_executions:
                tool_name = node.get("tool_name")
                if tool_name:
                    tool_names.add(tool_name)
            if tool_names:
                tools_used = len(tool_names)

        # Count tools from thought processes if not already counted
        if tools_used == 0 and thought_processes:
            tool_names = set()
            for tp in thought_processes:
                if isinstance(tp, dict):
                    reasoning_steps = tp.get("reasoning_steps", [])
                    for step in reasoning_steps:
                        if step.get("reasoning_type") == "tool_use":
                            # Extract tool name from premise (format: "tool_name: description")
                            premise = step.get("premise", "")
                            if ":" in premise:
                                tool_name = premise.split(":")[0].strip()
                                if tool_name:
                                    tool_names.add(tool_name)
                            else:
                                tool_names.add("Tool")
                    # Also check for implicit tool usage (Snowflake queries, etc.)
                    final_assessment = tp.get("final_assessment", {})
                    if isinstance(final_assessment, dict):
                        metrics = final_assessment.get("metrics", {})
                        evidence = final_assessment.get("evidence", [])
                        # Check for Snowflake usage
                        if metrics.get("snowflake_records_count", 0) > 0:
                            tool_names.add("snowflake_query")
                        # Check evidence for tool mentions
                        for ev in evidence:
                            if isinstance(ev, str):
                                ev_lower = ev.lower()
                                if "snowflake" in ev_lower or "query" in ev_lower:
                                    tool_names.add("snowflake_query")
                                if "virustotal" in ev_lower:
                                    tool_names.add("virustotal")
                                if "shodan" in ev_lower:
                                    tool_names.add("shodan")
            if tool_names:
                tools_used = len(tool_names)

        # Count tools from structured activities if not already counted
        if tools_used == 0:
            structured_activities = data.get("structured_activities", [])
            tool_names = set()
            for activity in structured_activities:
                if isinstance(activity, dict):
                    tool = activity.get("tool") or activity.get("tool_name")
                    if tool:
                        tool_names.add(tool)
                    # Also check interaction_type
                    if activity.get("interaction_type") == "tool_call":
                        tool_name = activity.get("data", {}).get("tool_name")
                        if tool_name:
                            tool_names.add(tool_name)
            if tool_names:
                tools_used = len(tool_names)

        # Tools and evidence
        evidence_points = len(
            agents_executed
        )  # Use number of successful agents as evidence points

        # Geographic info
        geographic_countries = 0
        geographic_cities = 0

        # Extract from location agent
        location_data = agent_results.get("location", {})
        if location_data:
            location_findings = location_data.get("findings", {})
            geographic_countries = location_findings.get("metrics", {}).get(
                "unique_countries", 0
            )
            geographic_cities = location_findings.get("metrics", {}).get(
                "unique_cities", 0
            )

        # Critical findings and recommendations
        critical_findings = []
        recommendations = []

        # Extract from agent results
        for agent_name, result in agent_results.items():
            findings = result.get("findings", {})
            if isinstance(findings, dict):
                if "risk_indicators" in findings:
                    risk_indicators = findings["risk_indicators"]
                    if isinstance(risk_indicators, list):
                        critical_findings.extend(risk_indicators)
                    elif isinstance(risk_indicators, str):
                        critical_findings.append(risk_indicators)

                llm_analysis = findings.get("llm_analysis", {})
                if isinstance(llm_analysis, dict) and "recommendations" in llm_analysis:
                    rec_text = llm_analysis["recommendations"]
                    if isinstance(rec_text, str):
                        # Split multi-line recommendations
                        rec_lines = [
                            line.strip()
                            for line in rec_text.split("\n")
                            if line.strip() and line.strip().startswith("-")
                        ]
                        if rec_lines:
                            recommendations.extend(rec_lines[:5])  # Limit to first 5
                        else:
                            recommendations.append(
                                f"{agent_name.title()}: {rec_text[:200]}"
                            )

        # Extract from thought processes if not found
        if not critical_findings and not recommendations and thought_processes:
            for tp in thought_processes:
                if isinstance(tp, dict):
                    agent_name = (
                        tp.get("agent_name", "").replace("_agent", "").replace("_", " ")
                    )
                    final_assessment = tp.get("final_assessment", {})
                    if isinstance(final_assessment, dict):
                        # Extract risk indicators
                        risk_indicators = final_assessment.get("risk_indicators", [])
                        if isinstance(risk_indicators, list):
                            critical_findings.extend(risk_indicators[:5])  # Limit to 5
                        elif isinstance(risk_indicators, str):
                            critical_findings.append(risk_indicators)

                        # Extract recommendations from llm_analysis
                        llm_analysis = final_assessment.get("llm_analysis", {})
                        if isinstance(llm_analysis, dict):
                            rec_text = llm_analysis.get("recommendations", "")
                            if rec_text:
                                # Split multi-line recommendations (they start with "- [PRIORITY]")
                                rec_lines = [
                                    line.strip()
                                    for line in rec_text.split("\n")
                                    if line.strip() and line.strip().startswith("-")
                                ]
                                if rec_lines:
                                    recommendations.extend(
                                        rec_lines[:5]
                                    )  # Limit to first 5
                                else:
                                    # If no bullet points, use first 200 chars
                                    recommendations.append(
                                        f"{agent_name.title()}: {rec_text[:200]}"
                                    )

        # Final status check: if still initialized/unknown but agents executed, mark as completed
        if status in ["unknown", "initialized", "INITIALIZED"] and agents_executed:
            # Check if journey has end_timestamp (indicates completion)
            if journey and journey.get("end_timestamp"):
                status = "completed"
            elif len(agents_executed) > 0:
                # If agents executed successfully, likely completed
                status = "completed"

        return InvestigationSummary(
            investigation_id=investigation_id,
            scenario=scenario,
            entity_id=entity_id,
            entity_type=entity_type,
            final_risk_score=final_risk_score,
            confidence_score=confidence_score,
            duration_seconds=duration,
            status=status,
            agents_executed=agents_executed,
            tools_used=tools_used,
            evidence_points=evidence_points,
            geographic_countries=geographic_countries,
            geographic_cities=geographic_cities,
            critical_findings=critical_findings[:10],  # Top 10
            recommendations=recommendations,
        )

    def _generate_html_report(self, data: Dict[str, Any], title: str) -> str:
        """Generate comprehensive HTML report."""
        summary = data["summary"]
        risk_analyzer_info = data.get("risk_analyzer_info", {})

        # Determine risk level and color
        # CRITICAL FIX: Handle None values to prevent TypeError: '>' not supported between instances of 'NoneType' and 'float'
        final_risk_score = (
            summary.final_risk_score if summary.final_risk_score is not None else 0.0
        )
        risk_level = (
            "HIGH"
            if final_risk_score > 0.7
            else "MEDIUM" if final_risk_score > 0.4 else "LOW"
        )
        risk_color = (
            "#dc3545"
            if risk_level == "HIGH"
            else "#fd7e14" if risk_level == "MEDIUM" else "#28a745"
        )

        # Generate header with logo
        header_html = get_olorin_header(title)

        html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            background: #f8f9fa; 
        }}
        .container {{ max-width: 1200px; margin: 0 auto; padding: 20px; }}
        
        /* Header */
        .header {{ 
            background: linear-gradient(135deg, #1e3c72, #2a5298); 
            color: white; 
            padding: 30px 0; 
            margin-bottom: 30px; 
            border-radius: 10px; 
        }}
        .header h1 {{ font-size: 2.5rem; text-align: center; margin-bottom: 10px; }}
        .header p {{ text-align: center; opacity: 0.9; font-size: 1.1rem; }}
        
        /* Executive Summary */
        .executive-summary {{ 
            background: white; 
            padding: 30px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
            margin-bottom: 30px; 
        }}
        .risk-badge {{ 
            display: inline-block; 
            padding: 8px 16px; 
            border-radius: 20px; 
            color: white; 
            font-weight: bold; 
            font-size: 0.9rem; 
            margin: 5px 0; 
            background: {risk_color}; 
        }}
        
        /* Metrics Grid */
        .metrics-grid {{ 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 20px; 
            margin: 20px 0; 
        }}
        .metric-card {{ 
            background: white; 
            padding: 20px; 
            border-radius: 8px; 
            box-shadow: 0 2px 5px rgba(0,0,0,0.1); 
            text-align: center; 
        }}
        .metric-value {{ 
            font-size: 2rem; 
            font-weight: bold; 
            color: #2a5298; 
            display: block; 
        }}
        .metric-label {{ 
            color: #666; 
            font-size: 0.9rem; 
            margin-top: 5px; 
        }}
        
        /* Sections */
        .section {{ 
            background: white; 
            margin-bottom: 30px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
            overflow: hidden; 
        }}
        .section-header {{ 
            background: #f8f9fa; 
            padding: 20px; 
            border-bottom: 1px solid #dee2e6; 
        }}
        .section-header h2 {{ 
            color: #2a5298; 
            margin-bottom: 5px; 
        }}
        .section-content {{ padding: 20px; }}
        
        /* Tables */
        .data-table {{ 
            width: 100%; 
            border-collapse: collapse; 
            margin: 15px 0; 
        }}
        .data-table th, .data-table td {{ 
            padding: 12px; 
            text-align: left; 
            border-bottom: 1px solid #dee2e6; 
        }}
        .data-table th {{ 
            background: #f8f9fa; 
            font-weight: 600; 
            color: #2a5298; 
        }}
        .data-table tr:hover {{ background: #f8f9fa; }}
        
        /* Lists */
        .finding-list {{ 
            list-style: none; 
            padding: 0; 
        }}
        .finding-item {{ 
            padding: 10px; 
            margin: 5px 0; 
            background: #f8f9fa; 
            border-left: 4px solid #2a5298; 
            border-radius: 4px; 
        }}
        .critical-finding {{ border-left-color: #dc3545; }}
        
        /* Progress bars */
        .progress {{ 
            width: 100%; 
            height: 20px; 
            background: #e9ecef; 
            border-radius: 10px; 
            overflow: hidden; 
            margin: 10px 0; 
        }}
        .progress-bar {{ 
            height: 100%; 
            background: linear-gradient(90deg, #28a745, #20c997); 
            transition: width 0.3s ease; 
        }}
        
        /* Agent status */
        .agent-status {{ 
            display: inline-block; 
            padding: 4px 8px; 
            border-radius: 12px; 
            font-size: 0.8rem; 
            font-weight: bold; 
            color: white; 
        }}
        .status-success {{ background: #28a745; }}
        .status-partial {{ background: #fd7e14; }}
        .status-failed {{ background: #dc3545; }}
        
        /* Responsive */
        @media (max-width: 768px) {{
            .container {{ padding: 10px; }}
            .metrics-grid {{ grid-template-columns: 1fr; }}
            .header h1 {{ font-size: 2rem; }}
        }}
        
        /* Collapsible sections */
        .collapsible {{ 
            cursor: pointer; 
            user-select: none; 
            position: relative;
            padding-right: 40px;
        }}
        .collapsible:hover {{ background: #f0f0f0; }}
        .chevron-icon {{
            position: absolute;
            right: 20px;
            top: 50%;
            transform: translateY(-50%);
            transition: transform 0.3s ease;
            font-size: 1.2rem;
            color: #2a5298;
        }}
        .collapsible.active .chevron-icon {{
            transform: translateY(-50%) rotate(90deg);
        }}
        .collapsible-content {{ 
            max-height: 0; 
            overflow: hidden; 
            transition: max-height 0.3s ease; 
        }}
        .collapsible-content.active {{ max-height: 2000px; }}
        
        .timestamp {{ 
            color: #666; 
            font-size: 0.85rem; 
            margin-top: 20px; 
        }}
        
        /* Preface Section */
        .preface {{ 
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); 
            padding: 30px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
            margin-bottom: 30px; 
            border-left: 5px solid #2a5298;
        }}
        .preface h2 {{
            color: #2a5298; 
            margin-bottom: 15px; 
            font-size: 1.5rem;
        }}
        .preface p {{
            margin-bottom: 12px; 
            line-height: 1.8; 
            color: #495057;
        }}
        .preface ul {{
            margin-left: 20px; 
            margin-top: 10px; 
            margin-bottom: 10px;
        }}
        .preface li {{
            margin-bottom: 8px; 
            line-height: 1.6;
        }}
        .preface strong {{
            color: #1e3c72;
        }}
    </style>
</head>
<body>
    <div class="container">
        <!-- Header with Logo -->
        {header_html}
        <div style="margin-top: 20px; margin-bottom: 20px;">
            <p style="text-align: center; color: #666;">Investigation ID: {summary.investigation_id}</p>
        </div>
        
        <!-- Preface: Risk Analyzer Flow -->
        <div class="section">
            <div class="section-header collapsible" onclick="toggleSection('preface')">
                <h2>📋 Investigation Selection Process</h2>
                <p>Risk Analyzer flow and entity selection details</p>
                <span class="chevron-icon">▶</span>
            </div>
            <div class="section-content collapsible-content" id="preface">
                <div class="preface">
                    <p>
                        This investigation was initiated through the Risk Analyzer flow, which systematically identifies 
                        high-risk entities for fraud investigation. The process follows these key steps:
                    </p>
                    <ol style="margin-left: 20px; margin-top: 10px; margin-bottom: 10px;">
                        <li>
                            <strong>Risk Data Retrieval:</strong> The Risk Analyzer queries the Snowflake data warehouse 
                            to retrieve transaction records from the past 7 days (or 14 days if configured). These records 
                            are analyzed to identify entities with the highest risk-weighted transaction values, calculated 
                            as the product of risk score and transaction amount.
                        </li>
                        <li>
                            <strong>Entity Ranking:</strong> All entities are ranked based on their risk-weighted value, 
                            which combines both the frequency and severity of risk indicators. The system groups transactions 
                            by entity (email, device_id, IP address, etc.) and calculates aggregate risk metrics including 
                            average risk score, total transaction amount, transaction count, and fraud count.
                        </li>
                        <li>
                            <strong>Top Entity Selection:</strong> From the ranked list, the top 3 highest-risk entities 
                            are identified. These entities represent the most significant fraud risk based on the analysis 
                            of recent transaction patterns.
                        </li>
                        <li>
                            <strong>Investigation Target Selection:</strong> The highest-ranked entity from the top 3 is 
                            automatically selected as the investigation target. This entity becomes the focus of the 
                            comprehensive multi-agent investigation process, which deploys specialized domain agents to 
                            analyze various aspects of fraud risk.
                        </li>
                    </ol>
                    <div style="margin-top: 20px; padding: 15px; background: #e7f3ff; border-left: 4px solid #2a5298; border-radius: 4px;">
                        <h3 style="margin-top: 0; color: #1e3c72;">Investigated Entity:</h3>
                        <p><strong>Entity ID:</strong> {summary.entity_id}</p>
                        <p><strong>Entity Type:</strong> {summary.entity_type.replace('_', ' ').title() if summary.entity_type != 'unknown' else 'IP Address'}</p>
                        {"".join([
                            f'<p><strong>Time Window Used:</strong> {risk_analyzer_info.get("time_window_used", "7d or 14d")}</p>',
                            f'<p><strong>Grouped By:</strong> {risk_analyzer_info.get("group_by", "email")}</p>',
                            '<h4 style="margin-top: 15px;">Top 3 Highest-Risk Entities Identified:</h4>',
                            '<ol style="margin-left: 20px;">',
                            "".join([
                                f'<li><strong>Entity:</strong> {entity.get("entity") or entity.get("entity_value", "N/A")} | '
                                f'<strong>Type:</strong> {entity.get("entity_type") or "unknown"} | '
                                f'<strong>Risk Score:</strong> {entity.get("risk_score") or entity.get("avg_risk_score", "N/A")} | '
                                f'<strong>Transactions:</strong> {entity.get("transaction_count", "N/A")}</li>'
                                for entity in risk_analyzer_info.get("top_3_entities", [])[:3]
                            ]) if risk_analyzer_info.get("top_3_entities") else '<li>Top 3 entity data not available</li>',
                            '</ol>',
                            f'<p style="margin-top: 10px;"><strong>Selected Entity for Investigation:</strong> {risk_analyzer_info.get("selected_entity", summary.entity_id)} (<strong>Type:</strong> {risk_analyzer_info.get("selected_entity_type", summary.entity_type)})</p>'
                        ]) if risk_analyzer_info and (risk_analyzer_info.get("top_3_entities") or risk_analyzer_info.get("selected_entity")) else ""}
                    </div>
                    <p style="margin-top: 20px;">
                        <strong>Note:</strong> The Risk Analyzer employs intelligent fallback mechanisms. If insufficient 
                        data is found in the primary time window (7 days), it automatically expands to 14 days, then 30 days, 
                        60 days, and 90 days to ensure meaningful risk analysis can be performed.
                    </p>
                </div>
            </div>
        </div>
        
        <!-- Executive Summary -->
        <div class="executive-summary">
            <h2>🎯 Executive Summary</h2>
            <div class="risk-badge">{risk_level} RISK - {final_risk_score:.2f}</div>
            
            <div class="metrics-grid">
                <div class="metric-card">
                    <span class="metric-value">{final_risk_score:.2f}</span>
                    <div class="metric-label">Risk Score</div>
                </div>
                <div class="metric-card">
                    <span class="metric-value">{(summary.confidence_score if summary.confidence_score is not None else 0.0):.2f}</span>
                    <div class="metric-label">Confidence</div>
                </div>
                <div class="metric-card">
                    <span class="metric-value">{len(summary.agents_executed)}</span>
                    <div class="metric-label">Agents Executed</div>
                </div>
                <div class="metric-card">
                    <span class="metric-value">{summary.tools_used}</span>
                    <div class="metric-label">Tools Used</div>
                </div>
                <div class="metric-card">
                    <span class="metric-value">{summary.duration_seconds:.1f}s</span>
                    <div class="metric-label">Duration</div>
                </div>
                <div class="metric-card">
                    <span class="metric-value">{summary.geographic_countries}</span>
                    <div class="metric-label">Countries</div>
                </div>
            </div>
            
            <p><strong>Target:</strong> {summary.entity_type.replace('_', ' ').title()} - {summary.entity_id}</p>
            <p><strong>Scenario:</strong> {summary.scenario.replace('_', ' ').title()}</p>
            <p><strong>Status:</strong> {summary.status.upper()}</p>
        </div>
        
        <!-- Critical Findings -->
        <div class="section">
            <div class="section-header">
                <h2>🚨 Critical Findings</h2>
                <p>High-priority risk indicators identified during investigation</p>
            </div>
            <div class="section-content">
                <ul class="finding-list">
                    {"".join([f'<li class="finding-item critical-finding">{finding}</li>' for finding in summary.critical_findings[:5]])}
                </ul>
            </div>
        </div>
        
        <!-- Agent Analysis Results -->
        <div class="section">
            <div class="section-header collapsible" onclick="toggleSection('agents')">
                <h2>🤖 Agent Analysis Results</h2>
                <p>Detailed analysis from domain-specific agents</p>
                <span class="chevron-icon">▶</span>
            </div>
            <div class="section-content collapsible-content" id="agents">
                {self._generate_agent_results_html(data)}
            </div>
        </div>
        
        <!-- Merchant Validation -->
        {self._generate_merchant_validation_html(data)}
        
        <!-- Performance Metrics -->
        <div class="section">
            <div class="section-header collapsible" onclick="toggleSection('performance')">
                <h2>⚡ Performance Metrics</h2>
                <p>Investigation execution performance and timing</p>
                <span class="chevron-icon">▶</span>
            </div>
            <div class="section-content collapsible-content" id="performance">
                {self._generate_performance_html(data)}
            </div>
        </div>
        
        <!-- Risk Score Over Time Chart -->
        <div class="section">
            <div class="section-header collapsible" onclick="toggleSection('riskChart')">
                <h2>📈 Risk Score Over Time</h2>
                <p>Risk score progression throughout the investigation</p>
                <span class="chevron-icon">▶</span>
            </div>
            <div class="section-content collapsible-content" id="riskChart">
                <div id="riskChartContent" style="width: 100%; overflow-x: auto;">
                    <p style="padding: 20px; color: #666; text-align: center;">Loading chart...</p>
                </div>
            </div>
        </div>
        
        <!-- Agent Execution Timeline Chart -->
        <div class="section">
            <div class="section-header collapsible" onclick="toggleSection('timelineChart')">
                <h2>⏱️ Agent Execution Timeline</h2>
                <p>Timeline of agent execution and duration</p>
                <span class="chevron-icon">▶</span>
            </div>
            <div class="section-content collapsible-content" id="timelineChart">
                <div id="timelineChartContent" style="width: 100%; overflow-x: auto;">
                    <p style="padding: 20px; color: #666; text-align: center;">Loading chart...</p>
                </div>
            </div>
        </div>
        
        <!-- Tool Execution Details -->
        <div class="section">
            <div class="section-header collapsible" onclick="toggleSection('tools')">
                <h2>🔧 Tool Execution Details</h2>
                <p>External API calls and threat intelligence sources</p>
                <span class="chevron-icon">▶</span>
            </div>
            <div class="section-content collapsible-content" id="tools">
                {self._generate_tools_html(data)}
            </div>
        </div>
        
        <!-- Agent Thought Processes -->
        <div class="section">
            <div class="section-header collapsible" onclick="toggleSection('thoughts')">
                <h2>🧠 Agent Thought Processes</h2>
                <p>Detailed reasoning chain and decision-making process for each domain agent</p>
                <span class="chevron-icon">▶</span>
            </div>
            <div class="section-content collapsible-content" id="thoughts">
                {self._generate_thought_process_html(data)}
            </div>
        </div>
        
        <!-- Recommendations -->
        <div class="section">
            <div class="section-header">
                <h2>💡 Recommendations</h2>
                <p>Suggested actions based on investigation findings</p>
            </div>
            <div class="section-content">
                <ul class="finding-list">
                    {"".join([f'<li class="finding-item">{rec}</li>' for rec in summary.recommendations[:5]])}
                </ul>
            </div>
        </div>
        
        <!-- Technical Details -->
        <div class="section">
            <div class="section-header collapsible" onclick="toggleSection('technical')">
                <h2>📊 Journey Tracking Summary</h2>
                <p>Chain of thought, validation results, and technical metadata</p>
                <span class="chevron-icon">▶</span>
            </div>
            <div class="section-content collapsible-content" id="technical">
                {self._generate_technical_details_html(data)}
            </div>
        </div>
        
        <div class="timestamp">
            Report generated on {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}
        </div>
    </div>
    
    <script>
        function toggleSection(sectionId) {{
            const content = document.getElementById(sectionId);
            const header = content.previousElementSibling;
            const isActive = content.classList.contains('active');
            
            // Toggle current section
            if (isActive) {{
                content.classList.remove('active');
                header.classList.remove('active');
            }} else {{
                content.classList.add('active');
                header.classList.add('active');
            }}
        }}
        
        // Auto-expand first section if it has content
        document.addEventListener('DOMContentLoaded', function() {{
            const agentsSection = document.getElementById('agents');
            if (agentsSection && agentsSection.textContent.trim() !== 'No agent results available.') {{
                agentsSection.classList.add('active');
                agentsSection.previousElementSibling.classList.add('active');
            }}
        }});
    </script>
    
    {self._generate_charts_script(data)}
    {OLORIN_FOOTER}
</body>
</html>
        """

        return html_content

    def _generate_agent_results_html(self, data: Dict[str, Any]) -> str:
        """Generate agent results section HTML."""
        agents_data = data.get("agents", {})
        if isinstance(agents_data, dict):
            agents_data = agents_data.get("agent_results", {})
        else:
            agents_data = {}

        thought_processes = data.get("thought_processes", [])
        journey = data.get("journey", {})

        # If no agent data, extract from thought processes
        if not agents_data and thought_processes:
            agents_data = {}
            for tp in thought_processes:
                if isinstance(tp, dict):
                    agent_name = tp.get("agent_name", "")
                    if agent_name:
                        clean_name = agent_name.replace("_agent", "").replace("_", " ")
                        final_assessment = tp.get("final_assessment", {})
                        risk_score = 0.0
                        if isinstance(final_assessment, dict):
                            risk_score = float(
                                final_assessment.get(
                                    "risk_score", final_assessment.get("risk", 0.0)
                                )
                            )

                        # Calculate duration from timestamps
                        duration = 0.0
                        start_ts = tp.get("start_timestamp")
                        end_ts = tp.get("end_timestamp")
                        if start_ts and end_ts:
                            try:
                                from datetime import datetime

                                start = datetime.fromisoformat(
                                    start_ts.replace("Z", "+00:00")
                                )
                                end = datetime.fromisoformat(
                                    end_ts.replace("Z", "+00:00")
                                )
                                duration = (end - start).total_seconds()
                            except Exception:
                                pass

                        agents_data[clean_name] = {
                            "status": "success",
                            "risk_score": risk_score,
                            "duration": duration,
                            "findings": final_assessment,
                        }

        # If still no agents, try to extract from journey node executions
        if not agents_data and journey:
            node_executions = journey.get("node_executions", [])
            agents_data = {}
            for node in node_executions:
                node_name = node.get("node_name", "")
                if (
                    node_name
                    and "agent" in node_name.lower()
                    and node.get("status") != "NodeStatus.FAILED"
                ):
                    agent_name = node_name.replace("_agent", "").replace("_", " ")
                    duration_ms = node.get("duration_ms", 0)
                    agents_data[agent_name] = {
                        "status": "success",
                        "risk_score": 0.0,
                        "duration": duration_ms / 1000.0,
                        "findings": {},
                    }

        if not agents_data:
            return "<p>No agent results available. Check investigation folder for thought_process_*.json files or journey_tracking.json.</p>"

        html = "<table class='data-table'><thead><tr><th>Agent</th><th>Status</th><th>Risk Score</th><th>Duration</th><th>Key Findings</th></tr></thead><tbody>"

        for agent_name, result in agents_data.items():
            status = result.get("status", "unknown")
            risk_score = result.get("risk_score", 0.0)
            duration = result.get("duration", 0.0)

            # Get key findings
            findings = result.get("findings", {})
            if isinstance(findings, dict):
                # Try multiple ways to extract key finding
                evidence = findings.get("evidence", [])
                risk_indicators = findings.get("risk_indicators", [])
                conclusion = findings.get("conclusion", "")

                if evidence:
                    key_finding = str(evidence[0])[:100] if evidence else ""
                elif risk_indicators:
                    key_finding = (
                        str(risk_indicators[0])[:100] if risk_indicators else ""
                    )
                elif conclusion:
                    key_finding = conclusion[:100]
                else:
                    key_finding = "Analysis completed"
            else:
                key_finding = "Analysis completed"

            status_class = f"agent-status status-{status}"

            html += f"""
            <tr>
                <td><strong>{agent_name.replace('_', ' ').title()}</strong></td>
                <td><span class="{status_class}">{status.upper()}</span></td>
                <td>{risk_score:.2f}</td>
                <td>{duration:.1f}s</td>
                <td>{key_finding}</td>
            </tr>
            """

        html += "</tbody></table>"
        return html

    def _generate_performance_html(self, data: Dict[str, Any]) -> str:
        """Generate performance metrics section HTML."""
        performance = data.get("performance", {})
        journey = data.get("journey", {})
        thought_processes = data.get("thought_processes", [])
        agents_data = data.get("agents", {})
        agent_results = (
            agents_data.get("agent_results", {})
            if isinstance(agents_data, dict)
            else {}
        )

        # Initialize agent_timings from existing performance data
        agent_timings = (
            performance.get("agent_timings", {}).copy() if performance else {}
        )

        # Calculate total duration from journey (most reliable)
        total_duration = performance.get("total_duration", 0.0)
        if not total_duration and journey:
            start_ts = journey.get("start_timestamp")
            end_ts = journey.get("end_timestamp")
            if start_ts and end_ts:
                try:
                    from datetime import datetime

                    start = datetime.fromisoformat(start_ts.replace("Z", "+00:00"))
                    end = datetime.fromisoformat(end_ts.replace("Z", "+00:00"))
                    total_duration = (end - start).total_seconds()
                except Exception:
                    pass

        # Extract agent timings from journey node executions (merge with existing)
        if journey:
            node_executions = journey.get("node_executions", [])
            for node in node_executions:
                node_name = node.get("node_name", "")
                if "agent" in node_name.lower():
                    # Extract agent name (handle various formats)
                    agent_name = (
                        node_name.replace("_agent", "").replace("_", " ").strip()
                    )
                    if not agent_name:
                        agent_name = node_name.replace("_", " ").strip()

                    duration_ms = node.get("duration_ms", 0)
                    node_status = node.get("status", "")
                    is_completed = (
                        node_status == "NodeStatus.COMPLETED"
                        or "COMPLETED" in node_status
                    )
                    is_failed = (
                        node_status == "NodeStatus.FAILED" or "FAILED" in node_status
                    )

                    # Use duration from node if available, otherwise keep existing
                    if agent_name not in agent_timings:
                        agent_timings[agent_name] = {
                            "duration": (
                                duration_ms / 1000.0 if duration_ms > 0 else 0.0
                            ),
                            "status": (
                                "success"
                                if is_completed
                                else ("failed" if is_failed else "unknown")
                            ),
                            "performance_category": "normal",
                        }
                    elif (
                        duration_ms > 0
                        and agent_timings[agent_name].get("duration", 0) == 0
                    ):
                        # Update duration if we have a better value
                        agent_timings[agent_name]["duration"] = duration_ms / 1000.0

        # Extract agent timings from thought processes (merge with existing)
        if thought_processes:
            for tp in thought_processes:
                if isinstance(tp, dict):
                    agent_name = (
                        tp.get("agent_name", "")
                        .replace("_agent", "")
                        .replace("_", " ")
                        .strip()
                    )
                    if not agent_name:
                        continue

                    # Try to get duration from timestamps
                    start_ts = tp.get("start_timestamp")
                    end_ts = tp.get("end_timestamp")
                    duration = 0.0
                    if start_ts and end_ts:
                        try:
                            from datetime import datetime

                            start = datetime.fromisoformat(
                                start_ts.replace("Z", "+00:00")
                            )
                            end = datetime.fromisoformat(end_ts.replace("Z", "+00:00"))
                            duration = (end - start).total_seconds()
                        except Exception:
                            pass

                    # Also check duration_ms field
                    if duration == 0.0:
                        duration_ms = tp.get("duration_ms", 0)
                        if duration_ms > 0:
                            duration = duration_ms / 1000.0

                    # Add or update agent timing
                    if agent_name not in agent_timings:
                        agent_timings[agent_name] = {
                            "duration": duration,
                            "status": "success",
                            "performance_category": "normal",
                        }
                    elif (
                        duration > 0
                        and agent_timings[agent_name].get("duration", 0) == 0
                    ):
                        # Update duration if we have a better value
                        agent_timings[agent_name]["duration"] = duration

        # Extract agent timings from agent_results (merge with existing)
        if agent_results:
            for agent_name, result in agent_results.items():
                if isinstance(result, dict):
                    clean_name = (
                        agent_name.replace("_agent", "").replace("_", " ").strip()
                    )
                    duration = result.get("duration", 0.0)
                    status = result.get("status", "success")

                    if clean_name not in agent_timings:
                        agent_timings[clean_name] = {
                            "duration": duration,
                            "status": status,
                            "performance_category": "normal",
                        }
                    elif (
                        duration > 0
                        and agent_timings[clean_name].get("duration", 0) == 0
                    ):
                        # Update duration if we have a better value
                        agent_timings[clean_name]["duration"] = duration

        # Calculate success rate
        success_count = sum(
            1 for timing in agent_timings.values() if timing.get("status") == "success"
        )
        total_agents = len(agent_timings) if agent_timings else 1
        success_rate = success_count / total_agents if total_agents > 0 else 1.0

        # Calculate average agent time
        agent_durations = [
            t.get("duration", 0)
            for t in agent_timings.values()
            if t.get("duration", 0) > 0
        ]
        avg_agent_time = (
            sum(agent_durations) / len(agent_durations)
            if agent_durations
            else (total_duration / total_agents if total_agents > 0 else 0)
        )

        # Build performance dict
        performance = {
            "total_duration": total_duration,
            "agent_timings": agent_timings,
            "error_rates": {"overall_success_rate": success_rate},
            "throughput_metrics": {"average_agent_time": avg_agent_time},
        }

        if not agent_timings and not total_duration:
            return "<p>No performance data available.</p>"

        html = f"""
        <div class="metrics-grid">
            <div class="metric-card">
                <span class="metric-value">{performance.get('total_duration', 0):.1f}s</span>
                <div class="metric-label">Total Duration</div>
            </div>
            <div class="metric-card">
                <span class="metric-value">{performance.get('error_rates', {}).get('overall_success_rate', 0)*100:.1f}%</span>
                <div class="metric-label">Success Rate</div>
            </div>
            <div class="metric-card">
                <span class="metric-value">{performance.get('throughput_metrics', {}).get('average_agent_time', 0):.1f}s</span>
                <div class="metric-label">Avg Agent Time</div>
            </div>
        </div>
        """

        # Agent timings table - show all agents
        agent_timings = performance.get("agent_timings", {})
        if agent_timings:
            html += "<h4>Agent Performance Breakdown</h4><table class='data-table'><thead><tr><th>Agent</th><th>Duration</th><th>Status</th><th>Performance</th></tr></thead><tbody>"

            # Sort agents by duration (descending) for better readability
            sorted_agents = sorted(
                agent_timings.items(),
                key=lambda x: x[1].get("duration", 0),
                reverse=True,
            )

            for agent, metrics in sorted_agents:
                duration = metrics.get("duration", 0)
                status = metrics.get("status", "unknown")
                perf_category = metrics.get("performance_category", "normal")

                # Format duration display
                if duration == 0:
                    duration_str = "< 0.1s"
                else:
                    duration_str = f"{duration:.1f}s"

                # Format status display
                status_display = status.title() if status != "unknown" else "Completed"
                status_class = (
                    f"agent-status status-{status}"
                    if status != "unknown"
                    else "agent-status status-success"
                )

                html += f"""
                <tr>
                    <td><strong>{agent.replace('_', ' ').title()}</strong></td>
                    <td>{duration_str}</td>
                    <td><span class="{status_class}">{status_display}</span></td>
                    <td>{perf_category.title()}</td>
                </tr>
                """

            html += "</tbody></table>"
        else:
            html += "<p>No agent performance data available.</p>"

        return html

    def _generate_tools_html(self, data: Dict[str, Any]) -> str:
        """Generate tools execution section HTML."""
        agents_data = data.get("agents", {})
        agent_results = (
            agents_data.get("agent_results", {})
            if isinstance(agents_data, dict)
            else {}
        )
        thought_processes = data.get("thought_processes", [])
        journey = data.get("journey", {})

        # Extract tool execution data from agent evidence
        tools_found = {}

        # Extract tools from journey node executions
        if journey:
            node_executions = journey.get("node_executions", [])
            for node in node_executions:
                tool_name = node.get("tool_name")
                agent_name = node.get("agent_name", "")
                if tool_name:
                    clean_agent = (
                        agent_name.replace("_agent", "").replace("_", " ")
                        if agent_name
                        else "Unknown"
                    )
                    if tool_name not in tools_found:
                        tools_found[tool_name] = {
                            "agent": clean_agent,
                            "purpose": f"Tool execution for {node.get('node_name', 'investigation')}",
                            "status": (
                                "Success"
                                if node.get("status") != "NodeStatus.FAILED"
                                else "Failed"
                            ),
                            "key_result": f"Executed at {node.get('timestamp', '')[:19]}",
                        }

        # Extract tools from thought processes if agent_results is empty
        if not tools_found and thought_processes:
            for tp in thought_processes:
                if isinstance(tp, dict):
                    agent_name = (
                        tp.get("agent_name", "").replace("_agent", "").replace("_", " ")
                    )
                    reasoning_steps = tp.get("reasoning_steps", [])
                    for step in reasoning_steps:
                        if step.get("reasoning_type") == "tool_use":
                            tool_name = (
                                step.get("premise", "").split(":")[0]
                                if ":" in step.get("premise", "")
                                else "Tool"
                            )
                            if tool_name not in tools_found:
                                tools_found[tool_name] = {
                                    "agent": agent_name,
                                    "purpose": step.get("premise", "Tool execution"),
                                    "status": "Success",
                                    "key_result": step.get("conclusion", ""),
                                }

                    # Also check for Snowflake usage in evidence
                    final_assessment = tp.get("final_assessment", {})
                    if isinstance(final_assessment, dict):
                        evidence = final_assessment.get("evidence", [])
                        for ev in evidence:
                            if isinstance(ev, str) and "snowflake" in ev.lower():
                                if "snowflake_query" not in tools_found:
                                    tools_found["snowflake_query"] = {
                                        "agent": agent_name,
                                        "purpose": "Transaction Data Analysis",
                                        "status": "Success",
                                        "key_result": "Retrieved transaction records",
                                    }

        for agent_name, agent_data in agent_results.items():
            if isinstance(agent_data, dict) and "findings" in agent_data:
                findings = agent_data["findings"]
                if isinstance(findings, dict) and "evidence" in findings:
                    evidence = findings["evidence"]
                    if isinstance(evidence, list):
                        for evidence_item in evidence:
                            if isinstance(evidence_item, str):
                                # Look for tool execution patterns
                                if "virustotal_ip_analysis:" in evidence_item:
                                    tools_found["virustotal_ip_analysis"] = {
                                        "agent": agent_name,
                                        "purpose": "IP Reputation & Malware Scanning",
                                        "status": "Success",
                                        "result": (
                                            evidence_item.split(": ", 1)[1]
                                            if ": " in evidence_item
                                            else evidence_item
                                        ),
                                    }
                                elif "abuseipdb" in evidence_item.lower():
                                    tools_found["abuseipdb_analysis"] = {
                                        "agent": agent_name,
                                        "purpose": "IP Abuse Database Check",
                                        "status": "Success",
                                        "result": evidence_item,
                                    }
                                elif "snowflake" in evidence_item.lower() and (
                                    "record" in evidence_item.lower()
                                    or "transaction" in evidence_item.lower()
                                ):
                                    tools_found["snowflake_query"] = {
                                        "agent": agent_name,
                                        "purpose": "Transaction Data Analysis",
                                        "status": "Success",
                                        "result": evidence_item,
                                    }

        # Also check Snowflake agent specifically
        snowflake_agent = agent_results.get("snowflake", {})
        if isinstance(snowflake_agent, dict) and "findings" in snowflake_agent:
            findings = snowflake_agent["findings"]
            if isinstance(findings, dict):
                row_count = findings.get("row_count", 0)
                if row_count > 0:
                    tools_found["snowflake_database"] = {
                        "agent": "snowflake",
                        "purpose": "Database Query Execution",
                        "status": "Success",
                        "result": f"Retrieved {row_count} transaction records",
                    }

        # If still no tools found, check for implicit tool usage in evidence
        if not tools_found and thought_processes:
            for tp in thought_processes:
                if isinstance(tp, dict):
                    agent_name = (
                        tp.get("agent_name", "").replace("_agent", "").replace("_", " ")
                    )
                    final_assessment = tp.get("final_assessment", {})
                    if isinstance(final_assessment, dict):
                        # Check metrics for Snowflake usage
                        metrics = final_assessment.get("metrics", {})
                        if metrics.get("snowflake_records_count", 0) > 0:
                            if "snowflake_query" not in tools_found:
                                tools_found["snowflake_query"] = {
                                    "agent": agent_name,
                                    "purpose": "Transaction Data Analysis",
                                    "status": "Success",
                                    "key_result": f"Retrieved {metrics.get('snowflake_records_count', 0)} transaction records",
                                }

        if not tools_found:
            # Show a helpful message with what data is available
            if thought_processes:
                return "<p>No explicit tool execution data found. Tools may have been used implicitly during agent analysis. Check Thought Processes section for detailed agent reasoning.</p>"
            elif journey:
                return "<p>No tool execution data found in journey tracking. Tools may have been used during agent execution phases.</p>"
            else:
                return "<p>No tool execution data available.</p>"

        html = "<table class='data-table'><thead><tr><th>Tool</th><th>Agent</th><th>Purpose</th><th>Status</th><th>Key Result</th></tr></thead><tbody>"

        for tool_name, tool_data in tools_found.items():
            agent = tool_data.get("agent", "Unknown")
            purpose = tool_data.get("purpose", "Data analysis")
            key_result = tool_data.get("key_result", "Analysis completed")
            status = tool_data.get("status", "Success")

            html += f"""
            <tr>
                <td><strong>{tool_name.replace('_', ' ').title()}</strong></td>
                <td>{agent}</td>
                <td>{purpose}</td>
                <td>{status}</td>
                <td>{key_result}</td>
            </tr>
            """

        html += "</tbody></table>"
        return html

    def _generate_charts_script(self, data: Dict[str, Any]) -> str:
        """Generate Chart.js scripts for time series charts."""
        journey = data.get("journey", {})
        thought_processes = data.get("thought_processes", [])

        # Extract risk score over time from thought processes
        risk_score_data = []
        if thought_processes:
            for tp in thought_processes:
                if isinstance(tp, dict):
                    timestamp = tp.get("start_timestamp") or tp.get("end_timestamp")
                    final_assessment = tp.get("final_assessment", {})
                    if isinstance(final_assessment, dict):
                        risk_score = final_assessment.get(
                            "risk_score", final_assessment.get("risk", 0.0)
                        )
                        if timestamp and risk_score is not None:
                            try:
                                from datetime import datetime

                                dt = datetime.fromisoformat(
                                    timestamp.replace("Z", "+00:00")
                                )
                                risk_score_data.append(
                                    {"x": dt.isoformat(), "y": float(risk_score)}
                                )
                            except Exception:
                                pass

        # Extract agent execution timeline
        agent_timeline_data = []
        if journey:
            node_executions = journey.get("node_executions", [])
            for node in node_executions:
                node_name = node.get("node_name", "")
                if "agent" in node_name.lower():
                    timestamp = node.get("timestamp")
                    duration_ms = node.get("duration_ms", 0)
                    if timestamp:
                        try:
                            from datetime import datetime

                            dt = datetime.fromisoformat(
                                timestamp.replace("Z", "+00:00")
                            )
                            agent_timeline_data.append(
                                {
                                    "x": dt.isoformat(),
                                    "y": duration_ms / 1000.0,  # Convert to seconds
                                    "label": node_name.replace("_agent", "")
                                    .replace("_", " ")
                                    .title(),
                                }
                            )
                        except Exception:
                            pass

        # If no timeline data from journey, use thought processes
        if not agent_timeline_data and thought_processes:
            for tp in thought_processes:
                if isinstance(tp, dict):
                    agent_name = tp.get("agent_name", "")
                    start_ts = tp.get("start_timestamp")
                    end_ts = tp.get("end_timestamp")
                    if start_ts and end_ts:
                        try:
                            from datetime import datetime

                            start = datetime.fromisoformat(
                                start_ts.replace("Z", "+00:00")
                            )
                            end = datetime.fromisoformat(end_ts.replace("Z", "+00:00"))
                            duration = (end - start).total_seconds()
                            agent_timeline_data.append(
                                {
                                    "x": start.isoformat(),
                                    "y": duration,
                                    "label": agent_name.replace("_agent", "")
                                    .replace("_", " ")
                                    .title(),
                                }
                            )
                        except Exception:
                            pass

        # Sort data by timestamp
        risk_score_data.sort(key=lambda x: x["x"])
        agent_timeline_data.sort(key=lambda x: x["x"])

        # Generate JavaScript for charts
        risk_labels = [d["x"][:19] for d in risk_score_data]  # Format timestamp
        risk_values = [d["y"] for d in risk_score_data]

        timeline_labels = [d["x"][:19] for d in agent_timeline_data]
        timeline_values = [d["y"] for d in agent_timeline_data]
        timeline_agent_names = [d.get("label", "Agent") for d in agent_timeline_data]

        # Generate SVG-based charts matching analytics TimeSeriesChart
        risk_chart_svg = self._generate_svg_time_series_chart(
            risk_score_data,
            title="Risk Score Over Time",
            y_label="Risk Score",
            width=800,
            height=300,
            chart_id="riskChart",
        )

        timeline_chart_svg = self._generate_svg_time_series_chart(
            agent_timeline_data,
            title="Agent Execution Duration Over Time",
            y_label="Duration (seconds)",
            width=800,
            height=300,
            show_points=True,
            chart_id="timelineChart",
        )

        script = f"""
    <script>
        // Update chart containers with SVG charts
        document.addEventListener('DOMContentLoaded', function() {{
            const riskContainer = document.getElementById('riskChartContent');
            const timelineContainer = document.getElementById('timelineChartContent');
            
            if (riskContainer) {{
                riskContainer.innerHTML = {json.dumps(risk_chart_svg)};
            }}
            
            if (timelineContainer) {{
                timelineContainer.innerHTML = {json.dumps(timeline_chart_svg)};
            }}
        }});
    </script>
        """

        return script

    def _generate_svg_time_series_chart(
        self,
        data_points: List[Dict[str, Any]],
        title: str,
        y_label: str,
        width: int = 800,
        height: int = 300,
        show_points: bool = False,
        chart_id: str = "chart",
    ) -> str:
        """Generate SVG time series chart matching analytics TimeSeriesChart component."""
        if not data_points:
            return f'<div style="padding: 40px; text-align: center; color: #666;">No data available for {title}</div>'

        # Extract values and timestamps
        values = [d["y"] for d in data_points]
        timestamps = [d["x"] for d in data_points]

        # Calculate min/max for scaling
        min_val = min(values) if values else 0
        max_val = max(values) if values else 1
        range_val = max_val - min_val if max_val != min_val else 1

        # Padding for chart area
        padding = {"top": 40, "right": 40, "bottom": 60, "left": 80}
        chart_width = width - padding["left"] - padding["right"]
        chart_height = height - padding["top"] - padding["bottom"]

        # Generate path for line
        path_points = []
        for i, (timestamp, value) in enumerate(zip(timestamps, values)):
            x = (
                i / (len(data_points) - 1) if len(data_points) > 1 else 0
            ) * chart_width + padding["left"]
            y = (
                chart_height
                - ((value - min_val) / range_val) * chart_height
                + padding["top"]
            )
            path_points.append(f"{x},{y}")

        path_d = f"M {' L '.join(path_points)}" if path_points else ""

        # Generate grid lines
        grid_lines = []
        for ratio in [0, 0.25, 0.5, 0.75, 1]:
            y = chart_height - ratio * chart_height + padding["top"]
            grid_lines.append(
                f'<line x1="{padding["left"]}" y1="{y}" x2="{width - padding["right"]}" '
                f'y2="{y}" stroke="#6B21A8" stroke-width="1" stroke-dasharray="4 4" opacity="0.3"/>'
            )

        # Generate points if requested
        points_svg = ""
        if show_points:
            for i, (timestamp, value) in enumerate(zip(timestamps, values)):
                x = (
                    i / (len(data_points) - 1) if len(data_points) > 1 else 0
                ) * chart_width + padding["left"]
                y = (
                    chart_height
                    - ((value - min_val) / range_val) * chart_height
                    + padding["top"]
                )
                points_svg += f'<circle cx="{x}" cy="{y}" r="3" fill="#A855F7"/>'

        # Format timestamps for labels
        def format_timestamp(ts_str: str) -> str:
            try:
                from datetime import datetime

                dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                return dt.strftime("%H:%M:%S")
            except:
                return ts_str[:19] if len(ts_str) > 19 else ts_str

        # Generate x-axis labels (show every nth label to avoid crowding)
        x_labels = []
        label_interval = max(1, len(data_points) // 8)  # Show ~8 labels
        for i in range(0, len(data_points), label_interval):
            x = (
                i / (len(data_points) - 1) if len(data_points) > 1 else 0
            ) * chart_width + padding["left"]
            label = format_timestamp(timestamps[i])
            x_labels.append(
                f'<text x="{x}" y="{height - 15}" fill="#D8B4FE" font-size="10" text-anchor="middle">{label}</text>'
            )

        # Generate y-axis labels
        y_labels = []
        for ratio in [0, 0.25, 0.5, 0.75, 1]:
            y = chart_height - ratio * chart_height + padding["top"]
            val = min_val + ratio * range_val
            y_labels.append(
                f'<text x="{padding["left"] - 10}" y="{y + 4}" fill="#D8B4FE" font-size="10" text-anchor="end">{val:.2f}</text>'
            )

        svg = f"""
        <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 16px; width: 100%;">
            <svg viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid meet" style="width: 100%; height: auto; max-height: 100%;">
                <defs>
                    <linearGradient id="lineGradient{chart_id}" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#A855F7" stop-opacity="0.8" />
                        <stop offset="100%" stop-color="#C084FC" stop-opacity="0.8" />
                    </linearGradient>
                </defs>
                
                <!-- Grid lines -->
                <g>
                    {''.join(grid_lines)}
                </g>
                
                <!-- Line path -->
                <path d="{path_d}" fill="none" stroke="url(#lineGradient{chart_id})" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                
                <!-- Points -->
                {points_svg}
                
                <!-- Labels -->
                <g>
                    <text x="{padding['left']}" y="{padding['top'] - 10}" fill="#D8B4FE" font-size="12" font-weight="600">{y_label}</text>
                    <text x="{width / 2}" y="{height - 10}" fill="#D8B4FE" font-size="12" font-weight="600" text-anchor="middle">Time</text>
                </g>
                
                <!-- X-axis labels -->
                <g>
                    {''.join(x_labels)}
                </g>
                
                <!-- Y-axis labels -->
                <g>
                    {''.join(y_labels)}
                </g>
            </svg>
        </div>
        """

        return svg

    def _generate_technical_details_html(self, data: Dict[str, Any]) -> str:
        """Generate technical details section HTML."""
        validation = data.get("validation", {})
        metadata = data.get("metadata", {})
        journey = data.get("journey", {})
        thought_processes = data.get("thought_processes", [])

        html = "<h4>Investigation Metadata</h4>"

        # Show metadata
        if metadata:
            html += f"""
            <div class="metrics-grid">
                <div class="metric-card">
                    <span class="metric-value">{metadata.get('investigation_id', 'N/A')[:8]}...</span>
                    <div class="metric-label">Investigation ID</div>
                </div>
                <div class="metric-card">
                    <span class="metric-value">{metadata.get('mode', 'Unknown')}</span>
                    <div class="metric-label">Mode</div>
                </div>
                <div class="metric-card">
                    <span class="metric-value">{metadata.get('scenario', 'N/A') or 'None'}</span>
                    <div class="metric-label">Scenario</div>
                </div>
            </div>
            """

        html += "<h4>Validation Results</h4>"

        if validation:
            html += f"""
            <div class="metrics-grid">
                <div class="metric-card">
                    <span class="metric-value">{validation.get('overall_score', 0)}/100</span>
                    <div class="metric-label">Overall Score</div>
                </div>
                <div class="metric-card">
                    <span class="metric-value">{validation.get('quality_score', 0)}/100</span>
                    <div class="metric-label">Quality Score</div>
                </div>
                <div class="metric-card">
                    <span class="metric-value">{validation.get('performance_score', 0)}/100</span>
                    <div class="metric-label">Performance Score</div>
                </div>
            </div>
            """

            # Warnings and recommendations
            warnings = validation.get("warnings", [])
            recommendations = validation.get("recommendations", [])

            if warnings:
                html += "<h5>Validation Warnings</h5><ul class='finding-list'>"
                for warning in warnings:
                    html += f'<li class="finding-item" style="border-left-color: #fd7e14;">{warning}</li>'
                html += "</ul>"

            if recommendations:
                html += "<h5>Technical Recommendations</h5><ul class='finding-list'>"
                for rec in recommendations:
                    html += f'<li class="finding-item">{rec}</li>'
                html += "</ul>"

        # Journey tracking summary
        if journey:
            node_executions = journey.get("node_executions", [])
            html += f"""
            <h4>Journey Tracking Summary</h4>
            <div class="metrics-grid">
                <div class="metric-card">
                    <span class="metric-value">{len(node_executions)}</span>
                    <div class="metric-label">Node Executions</div>
                </div>
                <div class="metric-card">
                    <span class="metric-value">{journey.get('status', 'Unknown')}</span>
                    <div class="metric-label">Status</div>
                </div>
            </div>
            """

            # Show node execution summary
            if node_executions:
                html += "<h5>Node Execution Timeline</h5><table class='data-table'><thead><tr><th>Node</th><th>Status</th><th>Duration</th><th>Timestamp</th></tr></thead><tbody>"
                for node in node_executions[:10]:  # Limit to first 10
                    node_name = node.get("node_name", "Unknown")
                    status = node.get("status", "Unknown")
                    duration_ms = node.get("duration_ms", 0)
                    timestamp = (
                        node.get("timestamp", "")[:19]
                        if node.get("timestamp")
                        else "N/A"
                    )
                    html += f"""
                    <tr>
                        <td>{node_name.replace('_', ' ').title()}</td>
                        <td>{status.replace('NodeStatus.', '')}</td>
                        <td>{duration_ms}ms</td>
                        <td>{timestamp}</td>
                    </tr>
                    """
                html += "</tbody></table>"

        # Thought processes summary
        if thought_processes:
            html += f"""
            <h4>Thought Processes Summary</h4>
            <p><strong>Agents Analyzed:</strong> {len(thought_processes)}</p>
            <ul class="finding-list">
            """
            for tp in thought_processes:
                agent_name = (
                    tp.get("agent_name", "Unknown")
                    .replace("_agent", "")
                    .replace("_", " ")
                    .title()
                )
                domain = tp.get("domain", "unknown").title()
                risk_score = 0.0
                final_assessment = tp.get("final_assessment", {})
                if isinstance(final_assessment, dict):
                    risk_score = float(final_assessment.get("risk_score", 0.0))
                html += f'<li class="finding-item">{agent_name} ({domain}): Risk Score {risk_score:.2f}</li>'
                html += "</ul>"

        # Processing summary
        html += f"""
        <h4>Processing Summary</h4>
        <p><strong>Files Processed:</strong> {data.get('files_processed', 0)}</p>
        <p><strong>Processing Errors:</strong> {len(data.get('processing_errors', []))}</p>
        <p><strong>Investigation Mode:</strong> {metadata.get('mode', 'Unknown')}</p>
        """

        errors = data.get("processing_errors", [])
        if errors:
            html += "<h5>Processing Errors</h5><ul>"
            for error in errors:
                html += f"<li>{error}</li>"
            html += "</ul>"

        return html

    def _generate_merchant_validation_html(self, data: Dict[str, Any]) -> str:
        """Generate merchant validation section HTML."""
        validation = data.get("validation", {})
        merchant_validation = validation.get("merchant", {})

        if not merchant_validation or not merchant_validation.get(
            "validation_complete"
        ):
            return ""

        predicted_risk = merchant_validation.get("predicted_risk_score", 0.0)
        actual_fraud_rate = merchant_validation.get("actual_fraud_rate", 0.0)
        prediction_correct = merchant_validation.get("prediction_correct", False)
        risk_correlation_error = merchant_validation.get("risk_correlation_error")
        validation_quality = merchant_validation.get("validation_quality", "unknown")
        historical_date = merchant_validation.get("historical_date", "")
        historical_transactions = merchant_validation.get("historical_transactions", 0)
        actual_fraud_count = merchant_validation.get("actual_fraud_count", 0)
        actual_total = merchant_validation.get("actual_total_transactions", 0)

        # Determine quality color
        quality_colors = {
            "excellent": "#28a745",
            "good": "#17a2b8",
            "fair": "#ffc107",
            "poor": "#dc3545",
            "insufficient_data": "#6c757d",
            "no_prediction": "#6c757d",
        }
        quality_color = quality_colors.get(validation_quality, "#6c757d")

        # Format historical date
        try:
            from datetime import datetime

            hist_date = datetime.fromisoformat(historical_date.replace("Z", "+00:00"))
            hist_date_str = hist_date.strftime("%Y-%m-%d")
        except:
            hist_date_str = (
                historical_date[:10] if len(historical_date) >= 10 else historical_date
            )

        return f"""
        <!-- Merchant Validation -->
        <div class="section">
            <div class="section-header collapsible" onclick="toggleSection('merchantValidation')">
                <h2>✅ Merchant Agent Validation</h2>
                <p>Historical prediction validation comparing merchant agent predictions with actual outcomes</p>
                <span class="chevron-icon">▶</span>
            </div>
            <div class="section-content collapsible-content" id="merchantValidation">
                <div style="padding: 20px; background: #f8f9fa; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="color: #2a5298; margin-top: 0;">Validation Overview</h3>
                    <p style="margin-bottom: 15px;">
                        The merchant agent validation framework compares predictions made on historical data 
                        (24h window from 6 months ago) with actual fraud outcomes that occurred after that period. 
                        This validates the effectiveness of the merchant agent's risk assessment strategy.
                    </p>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 20px;">
                        <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid {quality_color};">
                            <div style="font-size: 1.5rem; font-weight: bold; color: {quality_color};">
                                {validation_quality.upper()}
                            </div>
                            <div style="color: #666; font-size: 0.9rem; margin-top: 5px;">Validation Quality</div>
                        </div>
                        <div style="background: white; padding: 15px; border-radius: 6px;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: #2a5298;">
                                {'✓' if prediction_correct else '✗'}
                            </div>
                            <div style="color: #666; font-size: 0.9rem; margin-top: 5px;">Prediction Accuracy</div>
                        </div>
                        <div style="background: white; padding: 15px; border-radius: 6px;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: #2a5298;">
                                {risk_correlation_error:.3f if risk_correlation_error is not None else 'N/A'}
                            </div>
                            <div style="color: #666; font-size: 0.9rem; margin-top: 5px;">Risk Correlation Error</div>
                        </div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                    <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6;">
                        <h4 style="color: #2a5298; margin-top: 0;">Predicted Risk</h4>
                        <div style="font-size: 2rem; font-weight: bold; color: #dc3545; margin: 10px 0;">
                            {predicted_risk:.3f}
                        </div>
                        <div style="color: #666; font-size: 0.9rem;">
                            High Risk: {'Yes' if predicted_risk > 0.6 else 'No'} (threshold: 0.6)
                        </div>
                        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #dee2e6;">
                            <div style="font-size: 0.85rem; color: #666;">
                                <strong>Historical Date:</strong> {hist_date_str}
                            </div>
                            <div style="font-size: 0.85rem; color: #666; margin-top: 5px;">
                                <strong>Historical Transactions:</strong> {historical_transactions}
                            </div>
                        </div>
                    </div>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6;">
                        <h4 style="color: #2a5298; margin-top: 0;">Actual Outcomes</h4>
                        <div style="font-size: 2rem; font-weight: bold; color: #dc3545; margin: 10px 0;">
                            {actual_fraud_rate:.3f}
                        </div>
                        <div style="color: #666; font-size: 0.9rem;">
                            High Fraud: {'Yes' if actual_fraud_rate > 0.2 else 'No'} (threshold: 0.2)
                        </div>
                        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #dee2e6;">
                            <div style="font-size: 0.85rem; color: #666;">
                                <strong>Fraud Transactions:</strong> {actual_fraud_count} / {actual_total}
                            </div>
                            <div style="font-size: 0.85rem; color: #666; margin-top: 5px;">
                                <strong>Fraud Rate:</strong> {(actual_fraud_rate * 100):.1f}%
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 20px; padding: 15px; background: {'#d4edda' if prediction_correct else '#f8d7da'}; border-left: 4px solid {'#28a745' if prediction_correct else '#dc3545'}; border-radius: 4px;">
                    <h4 style="margin-top: 0; color: {'#155724' if prediction_correct else '#721c24'};">
                        {'✓ Prediction Validated' if prediction_correct else '✗ Prediction Mismatch'}
                    </h4>
                    <p style="margin-bottom: 0; color: {'#155724' if prediction_correct else '#721c24'};">
                        {'The merchant agent correctly predicted ' + ('high' if predicted_risk > 0.6 else 'low') + ' risk, which matches the actual ' + ('high' if actual_fraud_rate > 0.2 else 'low') + ' fraud rate observed.' if prediction_correct 
                         else 'The merchant agent predicted ' + ('high' if predicted_risk > 0.6 else 'low') + ' risk, but the actual fraud rate was ' + ('high' if actual_fraud_rate > 0.2 else 'low') + '. This indicates a need to refine the merchant agent strategy.'}
                    </p>
                </div>
                
                {f'''
                <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                    <h4 style="margin-top: 0; color: #856404;">Validation Quality Assessment</h4>
                    <p style="margin-bottom: 0; color: #856404;">
                        Risk correlation error: {risk_correlation_error:.3f if risk_correlation_error is not None else 'N/A'}. 
                        {'Excellent correlation' if risk_correlation_error is not None and risk_correlation_error < 0.1 
                         else 'Good correlation' if risk_correlation_error is not None and risk_correlation_error < 0.3 
                         else 'Fair correlation' if risk_correlation_error is not None and risk_correlation_error < 0.5 
                         else 'Poor correlation - strategy needs refinement' if risk_correlation_error is not None 
                         else 'Unable to assess correlation'}
                    </p>
                </div>
                ''' if risk_correlation_error is not None else ''}
            </div>
        </div>
        """

    def _generate_thought_process_html(self, data: Dict[str, Any]) -> str:
        """Generate HTML for agent thought processes."""
        thought_processes = data.get("thought_processes", [])

        if not thought_processes:
            # Check if we have journey data that we can use
            journey = data.get("journey", {})
            if journey:
                return f"<p>Journey tracking data available with {len(journey.get('node_executions', []))} node executions. Thought process files not found in folder.</p>"
            return "<p>No thought process data available.</p>"

        html = ""

        # Sort thought processes by agent name for better organization
        sorted_thoughts = sorted(
            thought_processes, key=lambda x: x.get("agent_name", "unknown")
        )

        for thought_data in sorted_thoughts:
            agent_name = thought_data.get("agent_name", "Unknown Agent")
            domain = thought_data.get("domain", "unknown")
            start_time = thought_data.get("start_timestamp", "")
            end_time = thought_data.get("end_timestamp", "")
            reasoning_steps = thought_data.get("reasoning_steps", [])

            # Agent header
            html += f"""
            <div class="thought-process-container">
                <h4 class="agent-thought-header">🤖 {agent_name.title().replace('_', ' ')} ({domain.title()} Domain)</h4>
                <div class="thought-metadata">
                    <span class="timestamp">⏰ {start_time[:19] if start_time else 'N/A'} - {end_time[:19] if end_time else 'N/A'}</span>
                </div>
            """

            if reasoning_steps:
                html += "<div class='reasoning-chain'>"

                for i, step in enumerate(reasoning_steps, 1):
                    step_type = step.get("reasoning_type", "analysis")
                    premise = step.get("premise", "")
                    reasoning = step.get("reasoning", "")
                    conclusion = step.get("conclusion", "")
                    confidence = step.get("confidence", 0)
                    evidence = step.get("supporting_evidence", [])

                    # Step icon based on type
                    step_icon = (
                        "🔍"
                        if step_type == "analysis"
                        else "💡" if step_type == "conclusion" else "⚡"
                    )

                    html += f"""
                    <div class="reasoning-step">
                        <div class="step-header">
                            <span class="step-number">{step_icon} Step {i}</span>
                            <span class="step-type">{step_type.title()}</span>
                            <span class="confidence-badge" style="background: {'#28a745' if confidence > 0.7 else '#fd7e14' if confidence > 0.4 else '#dc3545'}">
                                {confidence:.0%} confidence
                            </span>
                        </div>
                        <div class="step-content">
                            <div class="premise"><strong>Premise:</strong> {premise}</div>
                            <div class="reasoning"><strong>Reasoning:</strong> {reasoning}</div>
                            <div class="conclusion"><strong>Conclusion:</strong> {conclusion}</div>
                        </div>
                    """

                    if evidence:
                        html += "<div class='evidence'><strong>Supporting Evidence:</strong><ul>"
                        for ev in evidence[:3]:  # Limit to first 3 pieces of evidence
                            ev_type = ev.get("type", "unknown")
                            ev_data = str(ev.get("data", ""))[
                                :100
                            ]  # Truncate long data
                            html += f"<li><em>{ev_type}:</em> {ev_data}</li>"
                        html += "</ul></div>"

                    html += "</div>"

                html += "</div>"
            else:
                html += "<p>No detailed reasoning steps available for this agent.</p>"

            html += "</div><hr class='agent-separator'>"

        # Add CSS styles for thought process visualization
        html = f"""
        <style>
            .thought-process-container {{ 
                margin: 20px 0; 
                border-left: 4px solid #2a5298; 
                padding-left: 15px; 
            }}
            .agent-thought-header {{ 
                color: #2a5298; 
                margin-bottom: 10px; 
                font-size: 1.2rem; 
            }}
            .thought-metadata {{ 
                color: #666; 
                font-size: 0.85rem; 
                margin-bottom: 15px; 
            }}
            .reasoning-chain {{ 
                margin-top: 15px; 
            }}
            .reasoning-step {{ 
                background: #f8f9fa; 
                border: 1px solid #e9ecef; 
                border-radius: 8px; 
                padding: 15px; 
                margin: 10px 0; 
            }}
            .step-header {{ 
                display: flex; 
                justify-content: space-between; 
                align-items: center; 
                margin-bottom: 10px; 
            }}
            .step-number {{ 
                font-weight: bold; 
                color: #2a5298; 
            }}
            .step-type {{ 
                background: #e9ecef; 
                padding: 2px 8px; 
                border-radius: 12px; 
                font-size: 0.8rem; 
                color: #495057; 
            }}
            .confidence-badge {{ 
                color: white; 
                padding: 2px 8px; 
                border-radius: 12px; 
                font-size: 0.75rem; 
                font-weight: bold; 
            }}
            .step-content div {{ 
                margin: 8px 0; 
                line-height: 1.4; 
            }}
            .evidence {{ 
                background: #fff; 
                border-left: 3px solid #28a745; 
                padding: 10px; 
                margin-top: 10px; 
            }}
            .evidence ul {{ 
                margin: 5px 0 0 20px; 
            }}
            .evidence li {{ 
                margin: 3px 0; 
                font-size: 0.9rem; 
            }}
            .agent-separator {{ 
                border: none; 
                height: 2px; 
                background: linear-gradient(to right, #2a5298, transparent); 
                margin: 30px 0; 
            }}
        </style>
        {html}
        """

        return html

    def _generate_server_logs_html(self, data: Dict[str, Any]) -> str:
        """Generate HTML for server logs."""
        server_logs = data.get("server_logs", {})

        if not server_logs:
            return "<p>No server logs available.</p>"

        # Handle raw logs format
        if "raw_logs" in server_logs:
            raw_logs = server_logs.get("raw_logs", "")
            log_count = server_logs.get("log_count", 0)

            html = f"""
            <div class="metrics-grid">
                <div class="metric-card">
                    <strong>Total Log Lines</strong>
                    <span>{log_count:,}</span>
                </div>
                <div class="metric-card">
                    <strong>Log Size</strong>
                    <span>{len(raw_logs):,} chars</span>
                </div>
            </div>
            <div class="log-container">
                <pre style="max-height: 400px; overflow-y: auto; background: #f8f9fa; padding: 15px; border-radius: 5px; font-family: 'Courier New', monospace; font-size: 12px;">{raw_logs[:10000]}{'...[truncated]' if len(raw_logs) > 10000 else ''}</pre>
            </div>
            """
            return html

        capture_session = server_logs.get("capture_session", {})
        logs = server_logs.get("server_logs", [])

        html = ""

        # Capture session summary
        if capture_session:
            start_time = capture_session.get("start_time", "")
            end_time = capture_session.get("end_time", "")
            duration = capture_session.get("duration_seconds", 0)
            total_count = capture_session.get("total_log_count", 0)
            level_counts = capture_session.get("level_counts", {})

            html += f"""
            <div class="logs-summary">
                <h4>📊 Logging Session Summary</h4>
                <div class="log-stats">
                    <div class="stat-item">
                        <span class="stat-label">Session Duration:</span>
                        <span class="stat-value">{duration:.1f} seconds</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total Log Entries:</span>
                        <span class="stat-value">{total_count}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Time Range:</span>
                        <span class="stat-value">{start_time[:19] if start_time else 'N/A'} - {end_time[:19] if end_time else 'N/A'}</span>
                    </div>
                </div>
                
                <div class="level-breakdown">
                    <strong>Log Level Breakdown:</strong>
            """

            for level, count in level_counts.items():
                color = {
                    "DEBUG": "#6c757d",
                    "INFO": "#17a2b8",
                    "WARNING": "#ffc107",
                    "ERROR": "#dc3545",
                    "CRITICAL": "#721c24",
                }.get(level, "#6c757d")

                html += f"""
                <span class="level-badge" style="background: {color}">
                    {level}: {count}
                </span>
                """

            html += "</div></div>"

        # Server logs table
        if logs:
            html += """
            <div class="logs-container">
                <h4>📋 Server Log Entries</h4>
                <div class="logs-table-container">
                    <table class="logs-table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>Level</th>
                                <th>Logger</th>
                                <th>Message</th>
                                <th>Source</th>
                            </tr>
                        </thead>
                        <tbody>
            """

            # Show only recent logs (limit to 50 for performance)
            display_logs = logs[-50:] if len(logs) > 50 else logs

            for log_entry in display_logs:
                timestamp = log_entry.get("timestamp", "")[
                    :19
                ]  # Remove microseconds and timezone
                level = log_entry.get("level", "INFO")
                logger_name = log_entry.get("logger_name", "")
                message = log_entry.get("message", "")
                source_file = log_entry.get("source_file", "")
                line_number = log_entry.get("line_number", "")

                # Truncate long messages
                display_message = (
                    message[:100] + "..." if len(message) > 100 else message
                )

                # Source info
                source_info = ""
                if source_file:
                    source_name = (
                        source_file.split("/")[-1]
                        if "/" in source_file
                        else source_file
                    )
                    source_info = (
                        f"{source_name}:{line_number}" if line_number else source_name
                    )

                # Level color
                level_color = {
                    "DEBUG": "#6c757d",
                    "INFO": "#17a2b8",
                    "WARNING": "#ffc107",
                    "ERROR": "#dc3545",
                    "CRITICAL": "#721c24",
                }.get(level, "#6c757d")

                html += f"""
                <tr>
                    <td class="timestamp">{timestamp}</td>
                    <td><span class="log-level" style="background: {level_color}">{level}</span></td>
                    <td class="logger">{logger_name}</td>
                    <td class="message" title="{message}">{display_message}</td>
                    <td class="source">{source_info}</td>
                </tr>
                """

            if len(logs) > 50:
                html += f"""
                <tr class="logs-truncated">
                    <td colspan="5">
                        <em>Showing last 50 of {len(logs)} total log entries...</em>
                    </td>
                </tr>
                """

            html += """
                        </tbody>
                    </table>
                </div>
            </div>
            """

        # Add CSS styles for server logs
        html = f"""
        <style>
            .logs-summary {{ 
                background: #f8f9fa; 
                border: 1px solid #e9ecef; 
                border-radius: 8px; 
                padding: 20px; 
                margin-bottom: 20px; 
            }}
            .log-stats {{ 
                display: grid; 
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
                gap: 15px; 
                margin: 15px 0; 
            }}
            .stat-item {{ 
                display: flex; 
                justify-content: space-between; 
                align-items: center; 
            }}
            .stat-label {{ 
                font-weight: bold; 
                color: #495057; 
            }}
            .stat-value {{ 
                color: #2a5298; 
                font-weight: bold; 
            }}
            .level-breakdown {{ 
                margin-top: 15px; 
            }}
            .level-badge {{ 
                display: inline-block; 
                color: white; 
                padding: 4px 8px; 
                border-radius: 12px; 
                font-size: 0.75rem; 
                font-weight: bold; 
                margin: 2px 5px 2px 0; 
            }}
            .logs-container {{ 
                background: white; 
                border: 1px solid #e9ecef; 
                border-radius: 8px; 
                padding: 20px; 
            }}
            .logs-table-container {{ 
                max-height: 500px; 
                overflow-y: auto; 
                border: 1px solid #e9ecef; 
                border-radius: 4px; 
            }}
            .logs-table {{ 
                width: 100%; 
                border-collapse: collapse; 
                font-size: 0.85rem; 
            }}
            .logs-table th {{ 
                background: #e9ecef; 
                padding: 10px 8px; 
                text-align: left; 
                font-weight: bold; 
                position: sticky; 
                top: 0; 
                z-index: 1; 
            }}
            .logs-table td {{ 
                padding: 8px; 
                border-bottom: 1px solid #e9ecef; 
                vertical-align: top; 
            }}
            .logs-table tr:hover {{ 
                background: #f8f9fa; 
            }}
            .timestamp {{ 
                white-space: nowrap; 
                font-family: monospace; 
                font-size: 0.8rem; 
            }}
            .log-level {{ 
                color: white; 
                padding: 2px 6px; 
                border-radius: 10px; 
                font-size: 0.7rem; 
                font-weight: bold; 
                display: inline-block; 
                min-width: 50px; 
                text-align: center; 
            }}
            .logger {{ 
                font-weight: bold; 
                color: #495057; 
                max-width: 120px; 
                word-break: break-word; 
            }}
            .message {{ 
                max-width: 300px; 
                word-break: break-word; 
                line-height: 1.3; 
            }}
            .source {{ 
                font-family: monospace; 
                font-size: 0.8rem; 
                color: #6c757d; 
            }}
            .logs-truncated td {{ 
                text-align: center; 
                font-style: italic; 
                color: #6c757d; 
                background: #f8f9fa; 
            }}
        </style>
        {html}
        """

        return html


def generate_comprehensive_investigation_report(
    investigation_folder: Path,
    output_path: Optional[Path] = None,
    title: Optional[str] = None,
) -> Path:
    """
    Generate comprehensive investigation report from investigation folder.

    Args:
        investigation_folder: Path to investigation folder
        output_path: Output path for HTML report (optional)
        title: Report title (optional)

    Returns:
        Path to generated HTML report
    """
    generator = ComprehensiveInvestigationReportGenerator()
    return generator.generate_comprehensive_report(
        investigation_folder=investigation_folder, output_path=output_path, title=title
    )
