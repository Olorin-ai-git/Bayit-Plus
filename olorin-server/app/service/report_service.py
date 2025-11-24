"""
Report Service
Manages report CRUD operations and report-related business logic.
All configuration from environment variables - no hardcoded values.
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_, func
from datetime import datetime, timedelta
from pathlib import Path
import json
import os
import asyncio

from app.persistence.models import ReportRecord
from app.schemas.report_schemas import (
    ReportCreate,
    ReportUpdate,
    ReportResponse,
    InvestigationStatisticsResponse,
    InvestigationReportGenerateResponse,
)
from app.service.logging import get_bridge_logger
from app.service.reporting.comprehensive_investigation_report import (
    ComprehensiveInvestigationReportGenerator
)
from langchain_core.messages import SystemMessage, HumanMessage

logger = get_bridge_logger(__name__)


class ReportService:
    """Service for managing reports."""

    def __init__(self, db: Session):
        """Initialize service with database session."""
        self.db = db

    def create_report(
        self, owner: str, data: ReportCreate
    ) -> ReportResponse:
        """Create a new report."""
        report = ReportRecord(
            owner=owner,
            title=data.title,
            content=data.content,
            status="Draft",
            tags=data.tags or [],
        )
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)
        logger.info(f"Created report: {report.id} by {owner}")
        return ReportResponse.model_validate(report)

    def get_report(self, report_id: str, owner: Optional[str] = None) -> Optional[ReportResponse]:
        """Get report by ID, optionally filtered by owner."""
        query = select(ReportRecord).where(ReportRecord.id == report_id)
        if owner:
            query = query.where(ReportRecord.owner == owner)
        result = self.db.execute(query)
        report = result.scalar_one_or_none()
        if report:
            return ReportResponse.model_validate(report)
        return None

    def list_reports(
        self,
        owner: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[ReportResponse]:
        """List reports, optionally filtered by owner."""
        query = select(ReportRecord)
        if owner:
            query = query.where(ReportRecord.owner == owner)
        query = query.order_by(ReportRecord.created_at.desc()).offset(skip).limit(limit)
        result = self.db.execute(query)
        reports = result.scalars().all()
        return [ReportResponse.model_validate(report) for report in reports]

    def update_report(
        self, report_id: str, owner: str, data: ReportUpdate
    ) -> Optional[ReportResponse]:
        """Update an existing report."""
        query = select(ReportRecord).where(
            and_(ReportRecord.id == report_id, ReportRecord.owner == owner)
        )
        result = self.db.execute(query)
        report = result.scalar_one_or_none()
        if not report:
            return None

        if data.title is not None:
            report.title = data.title
        if data.content is not None:
            report.content = data.content
        if data.status is not None:
            report.status = data.status
        if data.tags is not None:
            report.tags = data.tags

        self.db.commit()
        self.db.refresh(report)
        logger.info(f"Updated report: {report_id} by {owner}")
        return ReportResponse.model_validate(report)

    def delete_report(self, report_id: str, owner: str) -> bool:
        """Delete a report."""
        query = select(ReportRecord).where(
            and_(ReportRecord.id == report_id, ReportRecord.owner == owner)
        )
        result = self.db.execute(query)
        report = result.scalar_one_or_none()
        if not report:
            return False

        self.db.delete(report)
        self.db.commit()
        logger.info(f"Deleted report: {report_id} by {owner}")
        return True

    def get_investigation_statistics(self) -> InvestigationStatisticsResponse:
        """Get investigation statistics for reporting."""
        # Try investigation_states table first (primary source)
        from app.models.investigation_state import InvestigationState

        # Query investigation_states (primary table)
        total_query = select(func.count()).select_from(InvestigationState)
        total_result = self.db.execute(total_query)
        total_investigations = total_result.scalar() or 0

        completed_query = select(
            InvestigationState
        ).where(InvestigationState.status == "COMPLETED")
        completed_result = self.db.execute(completed_query)
        completed_investigations = len(completed_result.scalars().all())

        # If no data in investigation_states, try investigations table as fallback
        if total_investigations == 0:
            from app.persistence.models import Investigation
            total_query = select(func.count()).select_from(Investigation)
            total_result = self.db.execute(total_query)
            total_investigations = total_result.scalar() or 0

            completed_query = select(Investigation).where(Investigation.status == "COMPLETED")
            completed_result = self.db.execute(completed_query)
            completed_investigations = len(completed_result.scalars().all())

        # Get recent investigations (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_query = (
            select(InvestigationState)
            .where(InvestigationState.created_at >= thirty_days_ago)
            .order_by(InvestigationState.created_at.desc())
        )
        recent_result = self.db.execute(recent_query)
        recent_investigations = len(recent_result.scalars().all())

        # If no recent investigations from investigation_states, try investigations table
        if recent_investigations == 0:
            from app.persistence.models import Investigation
            recent_query = (
                select(Investigation)
                .where(Investigation.created_at >= thirty_days_ago)
                .order_by(Investigation.created_at.desc())
            )
            recent_result = self.db.execute(recent_query)
            recent_investigations = len(recent_result.scalars().all())

        return InvestigationStatisticsResponse(
            total_investigations=total_investigations,
            completed_investigations=completed_investigations,
            recent_investigations=recent_investigations
        )

    async def generate_investigation_report(
        self, investigation_id: str, title: Optional[str] = None
    ) -> InvestigationReportGenerateResponse:
        """
        Generate comprehensive investigation report.
        
        Retrieves investigation state/progress from database, augments with folder data,
        and uses LLM to generate HTML report.

        Args:
            investigation_id: Investigation identifier
            title: Optional report title

        Returns:
            InvestigationReportGenerateResponse with report details

        Raises:
            ValueError: If investigation folder not found
        """
        # Try to find investigation folder using InvestigationFolderManager (supports new structure)
        investigation_folder = None
        
        try:
            from app.service.logging.investigation_folder_manager import get_folder_manager
            folder_manager = get_folder_manager()
            investigation_folder = folder_manager.get_investigation_folder(investigation_id)
            if investigation_folder and investigation_folder.exists():
                logger.debug(f"Found investigation folder via InvestigationFolderManager: {investigation_folder}")
        except Exception as e:
            logger.debug(f"InvestigationFolderManager lookup failed: {e}, trying legacy structure")
        
        # Fall back to legacy structure if not found
        if not investigation_folder or not investigation_folder.exists():
            base_logs_dir = os.getenv("INVESTIGATION_LOGS_DIR", "investigation_logs")
            
            # Resolve relative to server root if path is relative
            if not Path(base_logs_dir).is_absolute():
                # This file is at: app/service/report_service.py
                # Server root is 2 levels up
                server_root = Path(__file__).parent.parent.parent
                base_path = server_root / base_logs_dir
            else:
                base_path = Path(base_logs_dir)
            
            investigation_folder = base_path / investigation_id
            
            # Also check if it's a folder with timestamp format
            if not investigation_folder.exists() and base_path.exists():
                # Search for folders containing the investigation_id
                for folder in base_path.iterdir():
                    if folder.is_dir() and investigation_id in folder.name:
                        investigation_folder = folder
                        logger.debug(f"Found investigation folder in legacy structure: {investigation_folder}")
                        break
            
            # Also check other common log locations
            if not investigation_folder or not investigation_folder.exists():
                server_root = Path(__file__).parent.parent.parent
                alternative_locations = [
                    server_root / "logs" / "structured_investigations",
                    server_root / "logs" / "autonomous_investigations",
                    server_root / "logs" / "journey_tracking",
                ]
                
                for alt_base in alternative_locations:
                    if alt_base.exists():
                        # Search for folders/files containing the investigation_id
                        for item in alt_base.iterdir():
                            if investigation_id in item.name:
                                if item.is_dir():
                                    investigation_folder = item
                                    logger.debug(f"Found investigation folder in alternative location: {investigation_folder}")
                                    break
                                elif item.is_file() and item.suffix == '.json':
                                    # If it's a JSON file, check if parent directory exists
                                    parent_folder = alt_base / investigation_id
                                    if parent_folder.exists():
                                        investigation_folder = parent_folder
                                        logger.debug(f"Found investigation folder via JSON file: {investigation_folder}")
                                        break
                        if investigation_folder and investigation_folder.exists():
                            break
            
            # If still not found, try to create folder from journey file (investigation ran but folder wasn't created)
            if not investigation_folder or not investigation_folder.exists():
                journey_file = server_root / "logs" / "journey_tracking" / f"journey_{investigation_id}.json"
                if journey_file.exists():
                    try:
                        import json
                        from app.service.logging.investigation_folder_manager import get_folder_manager, InvestigationMode
                        from datetime import datetime
                        
                        # Read journey file to get timestamp
                        with open(journey_file, 'r') as f:
                            journey_data = json.load(f)
                        
                        start_ts = journey_data.get('start_timestamp')
                        timestamp = None
                        if start_ts:
                            try:
                                dt = datetime.fromisoformat(start_ts.replace('Z', '+00:00'))
                                timestamp = dt.strftime("%Y%m%d_%H%M%S")
                            except Exception:
                                pass
                        
                        # Create folder using existing InvestigationFolderManager
                        folder_manager = get_folder_manager()
                        folder_path, metadata = folder_manager.create_investigation_folder(
                            investigation_id=investigation_id,
                            mode=InvestigationMode.LIVE,  # Default to LIVE
                            scenario="",
                            custom_timestamp=timestamp
                        )
                        
                        # Copy journey file to the folder
                        import shutil
                        dest_journey = folder_path / "journey_tracking.json"
                        if not dest_journey.exists():
                            shutil.copy2(journey_file, dest_journey)
                        
                        # Copy chain of thought files if they exist
                        chain_dir = server_root / "logs" / "chain_of_thought"
                        if chain_dir.exists():
                            for file in chain_dir.iterdir():
                                if file.is_file() and investigation_id in file.name:
                                    dest_file = folder_path / file.name
                                    if not dest_file.exists():
                                        shutil.copy2(file, dest_file)
                        
                        investigation_folder = folder_path
                        logger.info(f"✅ Created investigation folder from journey file: {investigation_folder}")
                    except Exception as e:
                        logger.warning(f"Failed to create folder from journey file: {e}")

        if not investigation_folder or not investigation_folder.exists():
            raise ValueError(
                f"Investigation folder not found for ID '{investigation_id}'. "
                f"Searched in: InvestigationFolderManager, {os.getenv('INVESTIGATION_LOGS_DIR', 'investigation_logs')}, "
                f"and alternative log locations. Journey file also not found to create folder from."
            )

        # Check if LLM-based reporting is enabled
        use_llm_reporting = os.getenv("LLM_BASED_REPORTING", "false").lower() == "true"
        
        if use_llm_reporting:
            logger.info(f"Using LLM-based report generation for investigation {investigation_id}")
            
            # Retrieve investigation state/progress from database (needed for LLM-based generation)
            from app.models.investigation_state import InvestigationState
            investigation_state = self.db.query(InvestigationState).filter(
                InvestigationState.investigation_id == investigation_id
            ).first()
            
            if not investigation_state:
                logger.warning(f"Investigation state not found in database for {investigation_id}, proceeding with folder data only")
                investigation_progress = {}
                investigation_settings = {}
            else:
                # Get progress and settings data
                investigation_progress = investigation_state.get_progress_data()
                investigation_settings = investigation_state.settings or {}
                logger.info(f"Retrieved investigation state from database for {investigation_id}")
            
            # Collect all raw data from investigation folder
            folder_data = self._collect_investigation_folder_data(investigation_folder)
            
            # Extract risk analyzer information (top 3 entities and selected entity)
            risk_analyzer_info = self._extract_risk_analyzer_info(
                investigation_settings=investigation_settings,
                investigation_progress=investigation_progress,
                folder_data=folder_data
            )
            
            # Generate HTML report using LLM
            report_path = await self._generate_llm_html_report(
                investigation_id=investigation_id,
                investigation_progress=investigation_progress,
                investigation_settings=investigation_settings,
                folder_data=folder_data,
                investigation_folder=investigation_folder,
                title=title,
                risk_analyzer_info=risk_analyzer_info
            )
        else:
            logger.info(f"Using template-based report generation for investigation {investigation_id} (LLM_BASED_REPORTING=false)")
            # Try to get investigation state for risk analyzer info even in template mode
            risk_analyzer_info = {}
            try:
                from app.models.investigation_state import InvestigationState
                investigation_state = self.db.query(InvestigationState).filter(
                    InvestigationState.investigation_id == investigation_id
                ).first()
                if investigation_state:
                    investigation_settings = investigation_state.settings or {}
                    investigation_progress = investigation_state.get_progress_data()
                    folder_data = self._collect_investigation_folder_data(investigation_folder)
                    risk_analyzer_info = self._extract_risk_analyzer_info(
                        investigation_settings=investigation_settings,
                        investigation_progress=investigation_progress,
                        folder_data=folder_data
                    )
            except Exception as e:
                logger.debug(f"Could not extract risk analyzer info for template report: {e}")
            
            # Use template-based generation (doesn't need database state)
            generator = ComprehensiveInvestigationReportGenerator(
                base_logs_dir=investigation_folder.parent
            )
            report_path = generator.generate_comprehensive_report(
                investigation_folder=investigation_folder,
                output_path=None,
                title=title,
                risk_analyzer_info=risk_analyzer_info
            )

        # Get file size
        file_size = report_path.stat().st_size if report_path.exists() else 0

        # Extract summary data (if available)
        summary = {
            "investigation_id": investigation_id,
            "report_path": str(report_path),
            "file_size_bytes": file_size
        }

        logger.info(
            f"Generated investigation report: {investigation_id} "
            f"({file_size} bytes) at {report_path}"
        )

        # Use datetime from module import
        from datetime import datetime as dt_module
        return InvestigationReportGenerateResponse(
            investigation_id=investigation_id,
            report_path=str(report_path),
            file_size_bytes=file_size,
            generated_at=dt_module.utcnow().isoformat(),
            summary=summary
        )

    def _collect_investigation_folder_data(self, investigation_folder: Path) -> Dict[str, Any]:
        """
        Collect all raw data from investigation folder.
        
        Args:
            investigation_folder: Path to investigation folder
            
        Returns:
            Dictionary containing all folder data organized by file type
        """
        folder_data = {
            "metadata": {},
            "journey_tracking": {},
            "thought_processes": [],
            "structured_activities": [],
            "investigation_log": [],
            "server_logs": {},
            "other_files": {}
        }
        
        # Process all files in folder
        for file_path in investigation_folder.rglob("*"):
            if not file_path.is_file():
                continue
                
            try:
                filename = file_path.name.lower()
                
                if filename == "metadata.json":
                    with open(file_path, 'r', encoding='utf-8') as f:
                        folder_data["metadata"] = json.load(f)
                        
                elif filename == "journey_tracking.json":
                    with open(file_path, 'r', encoding='utf-8') as f:
                        folder_data["journey_tracking"] = json.load(f)
                        
                elif filename.startswith("thought_process_"):
                    with open(file_path, 'r', encoding='utf-8') as f:
                        folder_data["thought_processes"].append(json.load(f))
                        
                elif filename == "structured_activities.jsonl":
                    with open(file_path, 'r', encoding='utf-8') as f:
                        for line in f:
                            if line.strip():
                                folder_data["structured_activities"].append(json.loads(line))
                                
                elif filename == "investigation.log" or filename.endswith(".log"):
                    with open(file_path, 'r', encoding='utf-8') as f:
                        folder_data["investigation_log"] = f.readlines()
                        
                elif filename == "server_logs" or filename == "server_logs.json":
                    with open(file_path, 'r', encoding='utf-8') as f:
                        folder_data["server_logs"] = json.load(f)
                        
                else:
                    # Store other files as JSON if possible, otherwise as text
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            if filename.endswith('.json'):
                                folder_data["other_files"][file_path.name] = json.load(f)
                            else:
                                folder_data["other_files"][file_path.name] = f.read()
                    except Exception:
                        pass
                        
            except Exception as e:
                logger.warning(f"Error reading file {file_path.name}: {e}")
        
        return folder_data

    async def _generate_llm_html_report(
        self,
        investigation_id: str,
        investigation_progress: Dict[str, Any],
        investigation_settings: Dict[str, Any],
        folder_data: Dict[str, Any],
        investigation_folder: Path,
        title: Optional[str] = None,
        risk_analyzer_info: Optional[Dict[str, Any]] = None
    ) -> Path:
        """
        Generate HTML report using LLM.
        
        Args:
            investigation_id: Investigation ID
            investigation_progress: Progress data from database
            investigation_settings: Settings data from database
            folder_data: All data collected from folder
            investigation_folder: Path to investigation folder
            title: Optional report title
            
        Returns:
            Path to generated HTML report
        """
        from app.service.llm_manager import LLMManager
        
        # Get LLM instance
        llm_manager = LLMManager()
        llm = llm_manager.selected_model
        
        # Prepare prompt with all investigation data
        prompt = self._build_llm_report_prompt(
            investigation_id=investigation_id,
            investigation_progress=investigation_progress,
            investigation_settings=investigation_settings,
            folder_data=folder_data,
            title=title,
            risk_analyzer_info=risk_analyzer_info or {}
        )
        
        # Call LLM to generate HTML
        logger.info(f"Calling LLM to generate HTML report for investigation {investigation_id}")
        messages = [
            SystemMessage(content="You are an expert at generating comprehensive HTML investigation reports. Generate a complete, professional HTML report with embedded CSS and JavaScript. The report should be well-structured, visually appealing, and include all relevant investigation data."),
            HumanMessage(content=prompt)
        ]
        
        try:
            response = await llm.ainvoke(messages)
            html_content = response.content if hasattr(response, 'content') else str(response)
            
            # Ensure HTML content is valid
            if not html_content.strip().startswith('<!DOCTYPE html>') and not html_content.strip().startswith('<html'):
                # LLM might have wrapped it in markdown, extract HTML
                import re
                html_match = re.search(r'```html\n(.*?)\n```', html_content, re.DOTALL)
                if html_match:
                    html_content = html_match.group(1)
                else:
                    html_match = re.search(r'```\n(.*?)\n```', html_content, re.DOTALL)
                    if html_match:
                        html_content = html_match.group(1)
            
            # Save HTML report
            report_path = investigation_folder / "comprehensive_investigation_report.html"
            with open(report_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            logger.info(f"✅ LLM-generated HTML report saved to {report_path}")
            return report_path
            
        except Exception as e:
            logger.error(f"❌ LLM report generation failed: {e}")
            # Fallback to template-based generation
            logger.info("Falling back to template-based report generation")
            generator = ComprehensiveInvestigationReportGenerator(
                base_logs_dir=investigation_folder.parent
            )
            return generator.generate_comprehensive_report(
                investigation_folder=investigation_folder,
                output_path=None,
                title=title
            )

    def _build_llm_report_prompt(
        self,
        investigation_id: str,
        investigation_progress: Dict[str, Any],
        investigation_settings: Dict[str, Any],
        folder_data: Dict[str, Any],
        title: Optional[str] = None,
        risk_analyzer_info: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Build comprehensive prompt for LLM report generation.

        Args:
            investigation_id: Investigation ID
            investigation_progress: Progress data from database
            investigation_settings: Settings data from database
            folder_data: All folder data
            title: Optional report title
            
        Returns:
            Formatted prompt string
        """
        import json as json_module
        
        # Summarize large data structures to fit within context window
        def summarize_dict(data: Dict[str, Any], max_depth: int = 2, max_items: int = 10) -> Dict[str, Any]:
            """Recursively summarize a dictionary to reduce size."""
            if max_depth <= 0:
                return {"_truncated": True, "_summary": "Deep nesting truncated"}
            
            result = {}
            items_processed = 0
            for key, value in list(data.items())[:max_items]:
                if isinstance(value, dict):
                    result[key] = summarize_dict(value, max_depth - 1, max_items)
                elif isinstance(value, list):
                    if len(value) > max_items:
                        result[key] = {
                            "_count": len(value),
                            "_items": summarize_list(value[:max_items], max_depth - 1)
                        }
                    else:
                        result[key] = summarize_list(value, max_depth - 1)
                elif isinstance(value, str) and len(value) > 500:
                    result[key] = value[:500] + "... [truncated]"
                else:
                    result[key] = value
                items_processed += 1
            
            if len(data) > max_items:
                result["_truncated"] = True
                result["_total_items"] = len(data)
            
            return result
        
        def summarize_list(data: list, max_depth: int = 2) -> list:
            """Summarize a list to reduce size."""
            if max_depth <= 0:
                return [{"_truncated": True}]
            
            result = []
            for item in data[:10]:  # Limit to first 10 items
                if isinstance(item, dict):
                    result.append(summarize_dict(item, max_depth - 1, 5))
                elif isinstance(item, str) and len(item) > 200:
                    result.append(item[:200] + "... [truncated]")
                else:
                    result.append(item)
            
            if len(data) > 10:
                result.append({"_truncated": True, "_total_count": len(data)})
            
            return result
        
        # Summarize progress data
        progress_summary = summarize_dict(investigation_progress, max_depth=2, max_items=15)
        
        # Summarize settings
        settings_summary = summarize_dict(investigation_settings, max_depth=2, max_items=10)
        
        # Summarize metadata
        metadata_summary = summarize_dict(folder_data.get("metadata", {}), max_depth=2, max_items=10)
        
        # Summarize journey tracking - keep key fields, truncate node_executions
        journey = folder_data.get("journey_tracking", {})
        journey_summary = {
            "investigation_id": journey.get("investigation_id"),
            "start_timestamp": journey.get("start_timestamp"),
            "end_timestamp": journey.get("end_timestamp"),
            "status": journey.get("status"),
            "node_executions_count": len(journey.get("node_executions", [])),
            "node_executions_sample": summarize_list(journey.get("node_executions", [])[:5], max_depth=1)
        }
        
        # Summarize thought processes - extract key info only
        thought_processes = folder_data.get("thought_processes", [])
        thought_summary = []
        for tp in thought_processes[:5]:  # Limit to first 5
            if isinstance(tp, dict):
                summary = {
                    "agent_name": tp.get("agent_name"),
                    "domain": tp.get("domain"),
                    "start_timestamp": tp.get("start_timestamp"),
                    "end_timestamp": tp.get("end_timestamp"),
                    "final_assessment": {
                        "risk_score": tp.get("final_assessment", {}).get("risk_score"),
                        "confidence": tp.get("final_assessment", {}).get("confidence"),
                        "risk_indicators_count": len(tp.get("final_assessment", {}).get("risk_indicators", [])),
                        "recommendations_preview": tp.get("final_assessment", {}).get("llm_analysis", {}).get("recommendations", "")[:300] if tp.get("final_assessment", {}).get("llm_analysis", {}).get("recommendations") else None
                    },
                    "reasoning_steps_count": len(tp.get("reasoning_steps", []))
                }
                thought_summary.append(summary)
        
        # Summarize structured activities
        activities = folder_data.get("structured_activities", [])
        activities_summary = {
            "total_count": len(activities),
            "sample": summarize_list(activities[:5], max_depth=1)
        }
        
        # Format risk analyzer info for prompt
        risk_info_text = ""
        if risk_analyzer_info:
            top_entities = risk_analyzer_info.get("top_3_entities", [])
            selected_entity = risk_analyzer_info.get("selected_entity")
            selected_type = risk_analyzer_info.get("selected_entity_type")
            time_window = risk_analyzer_info.get("time_window_used", "7d or 14d")
            group_by = risk_analyzer_info.get("group_by", "email")
            
            if top_entities or selected_entity:
                risk_info_text = "\n=== RISK ANALYZER INFORMATION ===\n"
                if top_entities:
                    risk_info_text += f"Top 3 Entities Identified:\n"
                    for i, entity in enumerate(top_entities[:3], 1):
                        entity_val = entity.get("entity") or entity.get("entity_value", "N/A")
                        entity_type = entity.get("entity_type") or "unknown"
                        risk_score = entity.get("risk_score") or entity.get("avg_risk_score", "N/A")
                        tx_count = entity.get("transaction_count", "N/A")
                        risk_info_text += f"  {i}. Entity: {entity_val} | Type: {entity_type} | Risk Score: {risk_score} | Transactions: {tx_count}\n"
                if selected_entity:
                    risk_info_text += f"\nSelected Entity for Investigation:\n"
                    risk_info_text += f"  Entity: {selected_entity} | Type: {selected_type or 'unknown'}\n"
                risk_info_text += f"\nTime Window Used: {time_window}\n"
                risk_info_text += f"Grouped By: {group_by}\n"
        
        # Build prompt sections with summarized data
        prompt_parts = [
            "Generate a comprehensive HTML investigation report with the following data:",
            "",
            "=== INVESTIGATION METADATA ===",
            f"Investigation ID: {investigation_id}",
            f"Title: {title or 'Investigation Report'}",
            "",
            risk_info_text,
            "",
            "=== INVESTIGATION PROGRESS (from database - summarized) ===",
            json_module.dumps(progress_summary, indent=2, default=str),
            "",
            "=== INVESTIGATION SETTINGS (from database - summarized) ===",
            json_module.dumps(settings_summary, indent=2, default=str),
            "",
            "=== INVESTIGATION FOLDER DATA (summarized) ===",
            "",
            "METADATA:",
            json_module.dumps(metadata_summary, indent=2, default=str),
            "",
            "JOURNEY TRACKING (summary):",
            json_module.dumps(journey_summary, indent=2, default=str),
            "",
            f"THOUGHT PROCESSES (summary of {len(thought_processes)} files, showing first 5):",
            json_module.dumps(thought_summary, indent=2, default=str),
            "",
            f"STRUCTURED ACTIVITIES (summary of {len(activities)} entries):",
            json_module.dumps(activities_summary, indent=2, default=str),
            "",
            "=== REQUIREMENTS ===",
            "1. Generate a complete, standalone HTML document with embedded CSS and JavaScript",
            "2. **MANDATORY PREFACE SECTION**: Include a collapsible preface section immediately after the header and before the executive summary that describes the Risk Analyzer flow:",
            "   - Make it collapsible using the same collapsible pattern as other sections (with chevron icon that rotates when expanded)",
            "   - Explain how the Risk Analyzer retrieves transaction records from Snowflake for the past 7 days (or 14 days if configured)",
            "   - Describe how entities are ranked by risk-weighted transaction value (risk score × transaction amount)",
            "   - Explain how the system narrows down to the top 3 highest-risk entities",
            "   - Describe how the highest-ranked entity from the top 3 is selected as the investigation target",
            "   - Note that the Risk Analyzer uses fallback mechanisms (expanding to 14d, 30d, 60d, 90d if needed)",
            "   - Format this preface as a professional, well-styled collapsible section with clear headings and numbered steps",
            "   - Include actual entity data if available from risk_analyzer_info (top_3_entities, selected_entity, selected_entity_type)",
            "3. Include an executive summary with key metrics and findings",
            "4. Display investigation progress, agent results, and risk assessments",
            "5. Show timeline of investigation activities",
            "6. Include visualizations where appropriate (use Chart.js or similar)",
            "7. Make it professional, readable, and well-formatted",
            "8. Include all relevant data from both database and folder sources",
            "9. Use responsive design for mobile compatibility",
            "10. Note: Some data has been summarized due to size constraints - use available summaries",
            "",
            "Generate the complete HTML report now:"
        ]
        
        prompt_text = "\n".join(prompt_parts)
        
        # Ensure prompt doesn't exceed reasonable size (approximately 50K chars should be safe)
        max_prompt_size = 50000
        if len(prompt_text) > max_prompt_size:
            logger.warning(f"Prompt size ({len(prompt_text)} chars) exceeds limit, truncating further")
            # Further truncate thought processes
            thought_summary = thought_summary[:3]  # Reduce to 3
            prompt_parts[15] = f"THOUGHT PROCESSES (summary of {len(thought_processes)} files, showing first 3):"
            prompt_parts[16] = json_module.dumps(thought_summary, indent=2, default=str)
            prompt_text = "\n".join(prompt_parts)
        
        return prompt_text

    def list_investigation_reports(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        List all investigation reports with metadata.
        
        Scans both new structure (logs/investigations/) and legacy structure (investigation_logs/)
        for generated reports.

        Returns:
            List of report metadata dictionaries
        """
        reports = []
        
        # Collect all investigation folders with generated reports from both structures
        investigation_folders = []
        
        # Check new structure via InvestigationFolderManager
        try:
            from app.service.logging.investigation_folder_manager import get_folder_manager
            folder_manager = get_folder_manager()
            new_structure_path = folder_manager.base_logs_dir
            
            if new_structure_path.exists():
                for investigation_folder in new_structure_path.iterdir():
                    if not investigation_folder.is_dir():
                        continue
                    
                    report_file = investigation_folder / "comprehensive_investigation_report.html"
                    if report_file.exists():
                        # Extract investigation_id from folder name (format: {MODE}_{ID}_{TIMESTAMP})
                        folder_name = investigation_folder.name
                        parts = folder_name.split('_')
                        
                        # Try to get ID from metadata.json first
                        metadata_file = investigation_folder / "metadata.json"
                        inv_id = None
                        if metadata_file.exists():
                            try:
                                with open(metadata_file, 'r') as f:
                                    metadata = json.load(f)
                                    inv_id = metadata.get('investigation_id')
                            except Exception:
                                pass
                        
                        # Fallback to parsing folder name
                        if not inv_id and len(parts) >= 2:
                            # UUID format: might be split across parts
                            # Try to find UUID pattern
                            import re
                            uuid_pattern = r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
                            match = re.search(uuid_pattern, folder_name, re.IGNORECASE)
                            if match:
                                inv_id = match.group(0)
                            else:
                                # Fallback: use middle parts as ID
                                inv_id = '_'.join(parts[1:-1]) if len(parts) > 2 else parts[1]
                        
                        if inv_id:
                            metadata = self._extract_report_metadata(investigation_folder, inv_id)
                            reports.append(metadata)
        except Exception as e:
            logger.warning(f"Error scanning new structure: {e}")
        
        # Check legacy structure
        base_logs_dir = os.getenv("INVESTIGATION_LOGS_DIR", "investigation_logs")
        server_root = Path(__file__).parent.parent.parent
        if not Path(base_logs_dir).is_absolute():
            base_path = server_root / base_logs_dir
        else:
            base_path = Path(base_logs_dir)

        if base_path.exists():
            for investigation_folder in base_path.iterdir():
                if not investigation_folder.is_dir():
                    continue

                inv_id = investigation_folder.name
                report_file = investigation_folder / "comprehensive_investigation_report.html"

                if report_file.exists():
                    metadata = self._extract_report_metadata(investigation_folder, inv_id)
                    reports.append(metadata)
        
        # Sort by generated_at descending and apply pagination
        reports.sort(key=lambda x: x.get("generated_at", ""), reverse=True)
        return reports[skip:skip + limit]

    def _extract_report_metadata(self, investigation_folder: Path, inv_id: str) -> Dict[str, Any]:
        """
        Extract metadata from investigation folder.

        Args:
            investigation_folder: Path to investigation folder
            inv_id: Investigation ID
            
        Returns:
            Dictionary with report metadata
        """
        report_file = investigation_folder / "comprehensive_investigation_report.html"
        
        # Try to read metadata.json
        metadata = {}
        state_file = investigation_folder / "investigation_state_initial.json"
        if state_file.exists():
            try:
                with open(state_file, 'r') as f:
                    metadata = json.load(f)
            except Exception:
                pass
        
        # Get file stats
        file_size = report_file.stat().st_size if report_file.exists() else 0
        from datetime import datetime as dt_module
        generated_at = dt_module.fromtimestamp(
            report_file.stat().st_mtime
        ).isoformat() if report_file.exists() else None
        
        return {
            "investigation_id": inv_id,
            "report_path": str(report_file),
            "file_size_bytes": file_size,
            "generated_at": generated_at,
            "folder_path": str(investigation_folder),
            "metadata": metadata
        }


def get_report_service(db: Session) -> ReportService:
    """Get report service instance."""
    return ReportService(db)
