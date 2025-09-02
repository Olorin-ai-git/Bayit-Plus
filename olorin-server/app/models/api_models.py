from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.location_risk import LocationRiskAssessment
from app.service.agent.ato_agents.location_data_agent.client import LocationInfo


class Investigation(BaseModel):
    id: str
    entity_id: str
    entity_type: str
    user_id: Optional[str] = None  # Deprecated, kept for backward compatibility
    status: str = "IN_PROGRESS"
    policy_comments: str = ""
    investigator_comments: str = ""
    overall_risk_score: float = 0.0
    device_llm_thoughts: str = ""
    location_llm_thoughts: str = ""
    network_llm_thoughts: str = ""
    logs_llm_thoughts: str = ""
    device_risk_score: float = 0.0
    location_risk_score: float = 0.0
    network_risk_score: float = 0.0
    logs_risk_score: float = 0.0
    
    # Raw data processing fields
    raw_data_processed: bool = False
    raw_data_filename: Optional[str] = None
    raw_data_quality_score: Optional[float] = None
    raw_data_records_count: Optional[int] = None
    raw_data_anomalies_count: Optional[int] = None
    raw_data_processing_results: Optional[Dict[str, Any]] = None


class InvestigationCreate(BaseModel):
    id: str  # investigationId
    entity_id: str
    entity_type: str = "user_id"  # Default to user_id for backward compatibility


class InvestigationUpdate(BaseModel):
    id: Optional[str] = None  # investigationId is optional for update
    status: Optional[str] = None  # IN_PROGRESS/FAILED/COMPLETED
    policy_comments: str = ""
    investigator_comments: str = ""


class InvestigationOut(BaseModel):
    id: str
    entity_id: str
    entity_type: str
    user_id: Optional[str] = None  # Deprecated, kept for backward compatibility
    status: str = "IN_PROGRESS"
    policy_comments: str = ""
    investigator_comments: str = ""
    overall_risk_score: float = 0.0
    device_llm_thoughts: str = ""
    location_llm_thoughts: str = ""
    network_llm_thoughts: str = ""
    logs_llm_thoughts: str = ""
    device_risk_score: float = 0.0
    location_risk_score: float = 0.0
    network_risk_score: float = 0.0
    logs_risk_score: float = 0.0
    
    # Raw data processing fields
    raw_data_processed: bool = False
    raw_data_filename: Optional[str] = None
    raw_data_quality_score: Optional[float] = None
    raw_data_records_count: Optional[int] = None
    raw_data_anomalies_count: Optional[int] = None
    raw_data_processing_results: Optional[Dict[str, Any]] = None

    # Map chat_messages to policy_comments and investigator_comments
    # Remove chat_messages as a list
    model_config = ConfigDict(from_attributes=True)


class LocationRiskAnalysisResponse(BaseModel):
    entity_id: str
    entity_type: str = "user_id"
    user_id: Optional[str] = None  # Deprecated, kept for backward compatibility
    oii_location_info: Optional["LocationInfo"] = None
    business_location_info: Optional["LocationInfo"] = None
    phone_location_info: Optional["LocationInfo"] = None
    device_analysis_results: Optional[Dict[str, Any]] = None
    overall_location_risk_assessment: Optional[LocationRiskAssessment] = None
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    model_config = {"from_attributes": True}


# Raw Data Node Models

class RawTransactionData(BaseModel):
    """Model for raw transaction data processing requests and responses."""
    transaction_id: str = Field(..., description="Unique transaction identifier")
    amount: float = Field(..., ge=0, le=1000000, description="Transaction amount")
    timestamp: datetime = Field(..., description="Transaction timestamp")
    merchant: Optional[str] = Field(None, max_length=200, description="Merchant name")
    card_number: Optional[str] = Field(None, max_length=20, description="Card number (masked)")
    user_id: Optional[str] = Field(None, max_length=100, description="User identifier")
    location: Optional[str] = Field(None, max_length=200, description="Transaction location")
    currency: str = Field(default="USD", max_length=3, description="Currency code")
    status: str = Field(default="completed", description="Transaction status")
    category: Optional[str] = Field(None, max_length=100, description="Transaction category")
    
    @field_validator('amount')
    @classmethod
    def validate_amount(cls, v):
        if v < 0:
            raise ValueError('Amount cannot be negative')
        if v > 1000000:  # $1M limit
            raise ValueError('Amount exceeds maximum limit')
        return v
    
    @field_validator('transaction_id')
    @classmethod
    def validate_transaction_id(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Transaction ID cannot be empty')
        return v.strip()
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "transaction_id": "TXN-20250102-001",
                "amount": 125.50,
                "timestamp": "2025-01-02T10:30:00Z",
                "merchant": "Coffee Shop Inc",
                "card_number": "**** **** **** 1234",
                "user_id": "user_123",
                "location": "New York, NY",
                "currency": "USD",
                "status": "completed",
                "category": "dining"
            }
        }
    )


class CSVUploadRequest(BaseModel):
    """Model for CSV file upload metadata."""
    investigation_id: str = Field(..., description="Investigation identifier")
    filename: Optional[str] = Field(None, description="Original filename")
    file_size: Optional[int] = Field(None, ge=0, description="File size in bytes")
    
    @field_validator('investigation_id')
    @classmethod
    def validate_investigation_id(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Investigation ID cannot be empty')
        return v.strip()


class DataQualityMetrics(BaseModel):
    """Model for data quality assessment metrics."""
    total_records: int = Field(..., ge=0, description="Total number of records")
    valid_records: int = Field(..., ge=0, description="Number of valid records")
    invalid_records: int = Field(..., ge=0, description="Number of invalid records")
    missing_fields: Dict[str, int] = Field(default_factory=dict, description="Missing field counts")
    data_issues: Dict[str, List[str]] = Field(default_factory=dict, description="Data quality issues")
    anomalies_detected: List[Dict[str, Any]] = Field(default_factory=list, description="Detected anomalies")
    quality_score: float = Field(..., ge=0.0, le=1.0, description="Overall quality score (0.0-1.0)")
    processing_time: float = Field(..., ge=0.0, description="Processing time in seconds")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "total_records": 1000,
                "valid_records": 950,
                "invalid_records": 50,
                "missing_fields": {"merchant": 25, "location": 10},
                "data_issues": {
                    "invalid_format": ["Row 45: Amount cannot be negative"],
                    "duplicate_transaction": ["Row 123: Duplicate transaction ID"]
                },
                "anomalies_detected": [
                    {
                        "type": "amount_outlier",
                        "transaction_id": "TXN-999",
                        "amount": 50000.0,
                        "z_score": 4.2,
                        "description": "Amount $50,000.00 is statistically unusual"
                    }
                ],
                "quality_score": 0.85,
                "processing_time": 2.5
            }
        }
    )


class RawDataProcessingResult(BaseModel):
    """Model for raw data processing results."""
    success: bool = Field(..., description="Processing success status")
    investigation_id: str = Field(..., description="Investigation identifier")
    filename: Optional[str] = Field(None, description="Processed filename")
    data: List[RawTransactionData] = Field(default_factory=list, description="Processed transaction data")
    quality_metrics: DataQualityMetrics = Field(..., description="Data quality assessment")
    batches_processed: int = Field(..., ge=0, description="Number of data batches processed")
    anomalies_count: int = Field(..., ge=0, description="Total anomalies detected")
    processing_time_seconds: float = Field(..., ge=0.0, description="Total processing time")
    error: Optional[str] = Field(None, description="Error message if processing failed")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success": True,
                "investigation_id": "INV-20250102-001",
                "filename": "transactions.csv",
                "data": [
                    {
                        "transaction_id": "TXN-001",
                        "amount": 25.99,
                        "timestamp": "2025-01-02T09:15:00Z",
                        "merchant": "Amazon",
                        "currency": "USD",
                        "status": "completed"
                    }
                ],
                "quality_metrics": {
                    "total_records": 100,
                    "valid_records": 95,
                    "invalid_records": 5,
                    "quality_score": 0.92,
                    "processing_time": 1.2
                },
                "batches_processed": 1,
                "anomalies_count": 2,
                "processing_time_seconds": 1.5
            }
        }
    )


# Raw Data Upload Response Models

class RawDataUploadResponse(BaseModel):
    """Response model for raw data upload operations."""
    success: bool = Field(..., description="Upload success status")
    message: str = Field(..., description="Status message")
    investigation_id: str = Field(..., description="Investigation identifier")
    upload_id: Optional[str] = Field(None, description="Unique upload identifier")
    processing_result: Optional[RawDataProcessingResult] = Field(None, description="Processing results")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success": True,
                "message": "CSV file processed successfully",
                "investigation_id": "INV-20250102-001",
                "upload_id": "upload_123456",
                "processing_result": {
                    "success": True,
                    "quality_metrics": {
                        "total_records": 500,
                        "valid_records": 485,
                        "quality_score": 0.87
                    },
                    "batches_processed": 1,
                    "anomalies_count": 3
                }
            }
        }
    )


# Ensure forward references are resolved for OpenAPI
LocationRiskAnalysisResponse.model_rebuild()
RawDataProcessingResult.model_rebuild()
DataQualityMetrics.model_rebuild()
