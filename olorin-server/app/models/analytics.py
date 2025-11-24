"""
Analytics data models for fraud detection analytics.
NO HARDCODED VALUES - All configuration from environment variables.
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class FraudDecision(BaseModel):
    """Fraud decision model."""
    id: str
    transaction_id: str
    investigation_id: Optional[str] = None
    timestamp: datetime

    decision: str  # 'approved' | 'declined' | 'review'
    model_score: float
    rule_score: Optional[float] = None
    final_score: float

    model_version: str
    rule_version: Optional[str] = None
    model_provider: str

    merchant_id: Optional[str] = None
    channel: str
    device_id: Optional[str] = None
    ip_country: Optional[str] = None
    ip_region: Optional[str] = None

    model_latency_ms: Optional[int] = None
    rule_latency_ms: Optional[int] = None
    total_latency_ms: int

    is_fraud_tx: Optional[bool] = None
    fraud_type: Optional[str] = None
    chargeback_occurred: Optional[bool] = None
    chargeback_date: Optional[datetime] = None

    experiment_id: Optional[str] = None
    variant_id: Optional[str] = None

    features: Optional[Dict[str, Any]] = None
    feature_attributions: Optional[Dict[str, float]] = None


class FraudMetrics(BaseModel):
    """Fraud metrics model."""
    start_time: datetime
    end_time: datetime
    time_window: str

    precision: float
    recall: float
    f1_score: float

    true_positives: int
    false_positives: int
    true_negatives: int
    false_negatives: int
    total_decisions: int

    capture_rate: float
    approval_rate: float
    chargeback_rate: float

    false_positive_cost: float
    false_positive_count: int
    average_false_positive_cost: float

    model_latency: Dict[str, float]
    rule_latency: Dict[str, float]
    decision_throughput: float

    labeled_data_count: int
    unlabeled_data_count: int
    label_delay_hours: Optional[float] = None


class DashboardKPIs(BaseModel):
    """Dashboard KPI model."""
    precision: float
    recall: float
    f1_score: float
    capture_rate: float
    approval_rate: float
    false_positive_cost: float
    chargeback_rate: float
    decision_throughput: float


class TrendDataPoint(BaseModel):
    """Trend data point model."""
    timestamp: datetime
    value: float


class TrendSeries(BaseModel):
    """Trend series model."""
    metric: str
    data_points: List[TrendDataPoint]


class PrecisionRecallResponse(BaseModel):
    """Precision/recall response model."""
    precision: float
    recall: float
    f1_score: float
    true_positives: int
    false_positives: int
    true_negatives: int
    false_negatives: int


class Cohort(BaseModel):
    """Cohort model."""
    id: str
    name: str
    dimension: str
    value: str
    metrics: FraudMetrics
    transactionCount: int
    meetsMinimumThreshold: bool
    comparisonToOverall: Optional[Dict[str, Any]] = None


class CohortComparison(BaseModel):
    """Cohort comparison model."""
    bestPerformer: Optional[Cohort] = None
    worstPerformer: Optional[Cohort] = None
    significantDifferences: List[Dict[str, Any]] = []


class CohortAnalysisResponse(BaseModel):
    """Cohort analysis response model."""
    dimension: str
    cohorts: List[Cohort]
    overallMetrics: FraudMetrics
    comparison: CohortComparison


class AnalyticsDashboardResponse(BaseModel):
    """Analytics dashboard response model."""
    kpis: DashboardKPIs
    trends: List[TrendSeries]
    recent_decisions: List[FraudDecision]
    pipeline_health: List[Dict[str, Any]]


class ExperimentVariant(BaseModel):
    """Experiment variant model."""
    id: str
    name: str
    description: Optional[str] = None
    configuration: Dict[str, Any] = Field(default_factory=dict)
    metrics: Optional[FraudMetrics] = None
    lift: Optional[float] = None
    statisticalSignificance: Optional[Dict[str, Any]] = None


class Guardrail(BaseModel):
    """Guardrail model."""
    metric: str
    threshold: float
    direction: str
    action: str
    currentValue: Optional[float] = None
    status: str


class ExperimentResults(BaseModel):
    """Experiment results model."""
    winner: Optional[str] = None
    conclusion: Optional[str] = None
    recommendation: Optional[str] = None
    impactEstimate: Optional[Dict[str, Any]] = None


class Experiment(BaseModel):
    """Experiment model."""
    id: str
    name: str
    description: Optional[str] = None
    status: str
    startDate: datetime
    endDate: Optional[datetime] = None
    trafficSplit: Dict[str, int] = Field(default_factory=dict)
    variants: List[ExperimentVariant] = Field(default_factory=list)
    successMetrics: List[str] = Field(default_factory=list)
    guardrails: List[Guardrail] = Field(default_factory=list)
    results: Optional[ExperimentResults] = None
    createdAt: datetime
    createdBy: str
    updatedAt: datetime

