"""
Librarian request/response models.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class TriggerAuditRequest(BaseModel):
    """
    Audit configuration request model.

    All capability options are ADDITIVE - when multiple are enabled, all selected
    capabilities are combined into the audit prompt. Disabling all options runs
    a comprehensive audit that checks everything.
    """

    audit_type: str = "daily_incremental"
    dry_run: bool = False
    use_ai_agent: bool = False
    max_iterations: int = 999999  # Effectively unlimited - budget is the real constraint
    budget_limit_usd: float = 1.0
    last_24_hours_only: bool = False
    validate_integrity: bool = True
    cyb_titles_only: bool = False
    tmdb_posters_only: bool = False
    opensubtitles_enabled: bool = False
    classify_only: bool = False
    remove_duplicates: bool = False
    reapply_first: bool = True  # First try to reapply fixes from most recent audit (no LLM needed)
    force_updates: bool = False  # If False, skip items that already have metadata/posters (no API calls)


class TriggerAuditResponse(BaseModel):
    audit_id: str
    status: str
    message: str


class AuditReportResponse(BaseModel):
    audit_id: str
    audit_date: datetime
    audit_type: str
    execution_time_seconds: float
    status: str
    summary: dict
    content_results: Optional[dict] = None
    issues_count: int
    fixes_count: int


class ActionResponse(BaseModel):
    action_id: str
    audit_id: str
    timestamp: datetime
    action_type: str
    content_id: str
    content_type: str
    issue_type: str
    description: Optional[str]
    before_state: dict
    after_state: dict
    confidence_score: Optional[float]
    auto_approved: bool
    rolled_back: bool
    content_title: Optional[str]


class LibrarianStatusResponse(BaseModel):
    last_audit_date: Optional[datetime]
    last_audit_status: Optional[str]
    total_audits_last_30_days: int
    avg_execution_time: float
    total_issues_fixed: int
    system_health: str


class ScheduleConfig(BaseModel):
    cron: str
    time: str
    mode: str
    cost: str
    status: str
    description: str


class AuditLimits(BaseModel):
    max_iterations: int
    default_budget_usd: float
    min_budget_usd: float
    max_budget_usd: float
    budget_step_usd: float


class PaginationConfig(BaseModel):
    reports_limit: int
    actions_limit: int
    activity_page_size: int


class UIConfig(BaseModel):
    id_truncate_length: int
    modal_max_height: int


class ActionTypeConfig(BaseModel):
    value: str
    label: str
    color: str
    icon: str


class LibrarianConfigResponse(BaseModel):
    daily_schedule: ScheduleConfig
    weekly_schedule: ScheduleConfig
    audit_limits: AuditLimits
    pagination: PaginationConfig
    ui: UIConfig
    action_types: List[ActionTypeConfig]
    gcp_project_id: str


class InterjectMessageRequest(BaseModel):
    """Request model for injecting a message into a running audit."""

    message: str
    source: str = "admin"


class InterjectMessageResponse(BaseModel):
    """Response model for interject message endpoint."""

    success: bool
    message: str
    audit_id: str


class VoiceCommandRequest(BaseModel):
    command: str
    language: str = "en"


class VoiceCommandResponse(BaseModel):
    message: str
    spoken_response: str
    audit_id: Optional[str] = None
    status: str
    action_taken: Optional[str] = None


class LinkEpisodeRequest(BaseModel):
    episode_id: str
    series_id: str
    season: Optional[int] = None
    episode: Optional[int] = None
    reason: str = ""
    dry_run: bool = False


class ResolveDuplicatesRequest(BaseModel):
    episode_ids: List[str]
    keep_id: Optional[str] = None
    action: str = "unpublish"
    reason: str = ""
    dry_run: bool = False


class ReapplyFixesRequest(BaseModel):
    """Request model for reapplying fixes from a completed audit."""

    dry_run: bool = False
    fix_types: List[str] = [
        "titles",
        "metadata",
        "posters",
        "subtitles",
        "misclassifications",
        "broken_streams",
    ]


class ReapplyFixesResponse(BaseModel):
    """Response model for reapply fixes endpoint."""

    fix_audit_id: str
    source_audit_id: str
    status: str
    message: str
    stats: Optional[dict] = None
