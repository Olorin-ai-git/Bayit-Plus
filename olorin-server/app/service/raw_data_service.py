"""
Raw Data Processing Service Module.

This module provides service layer functionality for processing raw CSV transaction data
in fraud investigations. It encapsulates the business logic for file validation,
data processing, and integration with the RawDataNode.
"""

import logging
import uuid
from typing import Tuple, Optional

from fastapi import HTTPException, status, UploadFile

from app.models.api_models import (
    InvestigationCreate,
    RawDataUploadResponse,
    RawDataProcessingResult,
    DataQualityMetrics,
    RawTransactionData,
)
from app.persistence import get_investigation, create_investigation

logger = logging.getLogger(__name__)


class RawDataService:
    """Service class for handling raw data processing operations."""
    
    def __init__(self):
        """Initialize the raw data service."""
        self.max_file_size = 50 * 1024 * 1024  # 50MB in bytes
    
    def validate_file_upload(self, file: UploadFile) -> None:
        """
        Validate uploaded file meets requirements.
        
        Args:
            file: The uploaded file to validate
            
        Raises:
            HTTPException: If file validation fails
        """
        # Validate file type
        if not file.filename or not file.filename.lower().endswith('.csv'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only CSV files are supported"
            )
        
        # Validate file size (50MB limit)
        if file.size and file.size > self.max_file_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File size {file.size} bytes exceeds maximum allowed size "
                       f"of {self.max_file_size} bytes (50MB)"
            )
    
    def ensure_investigation_exists(self, investigation_id: str) -> None:
        """
        Ensure investigation exists or create a new one.
        
        Args:
            investigation_id: The investigation identifier
        """
        existing_investigation = get_investigation(investigation_id)
        if not existing_investigation:
            logger.info(f"Creating new investigation {investigation_id} for raw data upload")
            create_investigation(InvestigationCreate(
                id=investigation_id,
                entity_id=investigation_id,
                entity_type="raw_data_analysis"
            ))
    
    async def process_raw_data_file(
        self, 
        file_content: bytes, 
        filename: str,
        investigation_id: str
    ) -> Tuple[bool, dict]:
        """
        Process raw CSV data file using RawDataNode.
        
        Args:
            file_content: The file content as bytes
            filename: The original filename
            investigation_id: The investigation identifier
            
        Returns:
            Tuple of (success, processing_result)
        """
        try:
            # Import and initialize the RawDataNode
            from app.service.agent.nodes.raw_data_node import RawDataNode
            
            raw_data_processor = RawDataNode(
                batch_size=1000,
                enable_anomaly_detection=True,
                quality_threshold=0.8,
                max_file_size_mb=50
            )
            
            logger.info(f"Processing CSV file {filename} for investigation {investigation_id}")
            
            # Process the CSV data
            processing_result = await raw_data_processor.process_csv_data(
                csv_content=file_content,
                filename=filename
            )
            
            return processing_result['success'], processing_result
            
        except Exception as e:
            logger.error(f"Error processing raw data file: {str(e)}", exc_info=True)
            return False, {'error': str(e), 'processing_time_seconds': 0.0}
    
    def convert_to_api_models(
        self,
        processing_result: dict,
        investigation_id: str,
        filename: Optional[str] = None
    ) -> RawDataProcessingResult:
        """
        Convert processing result to API response models.
        
        Args:
            processing_result: Raw processing result from RawDataNode
            investigation_id: Investigation identifier
            filename: Optional filename
            
        Returns:
            RawDataProcessingResult with converted data
        """
        if processing_result.get('success', False):
            # Convert processing result to API models
            processed_data = []
            for record in processing_result.get('data', []):
                try:
                    processed_data.append(RawTransactionData(**record))
                except Exception as e:
                    logger.warning(f"Failed to convert record to RawTransactionData: {e}")
                    continue
            
            quality_metrics = DataQualityMetrics(**processing_result['quality_report'])
            
            return RawDataProcessingResult(
                success=True,
                investigation_id=investigation_id,
                filename=filename,
                data=processed_data[:100],  # Limit response size, return first 100 records
                quality_metrics=quality_metrics,
                batches_processed=processing_result.get('batches_processed', 0),
                anomalies_count=processing_result.get('anomalies_count', 0),
                processing_time_seconds=processing_result.get('processing_time_seconds', 0.0)
            )
        else:
            # Processing failed
            return RawDataProcessingResult(
                success=False,
                investigation_id=investigation_id,
                filename=filename,
                data=[],
                quality_metrics=DataQualityMetrics(
                    total_records=0,
                    valid_records=0,
                    invalid_records=0,
                    quality_score=0.0,
                    processing_time=processing_result.get('processing_time_seconds', 0.0)
                ),
                batches_processed=0,
                anomalies_count=0,
                processing_time_seconds=processing_result.get('processing_time_seconds', 0.0),
                error=processing_result.get('error', 'Unknown processing error')
            )
    
    def create_success_response(
        self,
        investigation_id: str,
        upload_id: str,
        processing_result: RawDataProcessingResult
    ) -> RawDataUploadResponse:
        """
        Create success response for successful upload.
        
        Args:
            investigation_id: Investigation identifier
            upload_id: Upload identifier
            processing_result: Processing results
            
        Returns:
            RawDataUploadResponse with success details
        """
        quality_metrics = processing_result.quality_metrics
        
        logger.info(
            f"Successfully processed {len(processing_result.data)} records "
            f"with quality score {quality_metrics.quality_score}"
        )
        
        return RawDataUploadResponse(
            success=True,
            message=f"Successfully processed {quality_metrics.valid_records} valid records "
                   f"out of {quality_metrics.total_records} total records. "
                   f"Data quality score: {quality_metrics.quality_score:.2f}",
            investigation_id=investigation_id,
            upload_id=upload_id,
            processing_result=processing_result
        )
    
    def create_error_response(
        self,
        investigation_id: str,
        upload_id: str,
        error_message: str,
        processing_result: Optional[RawDataProcessingResult] = None
    ) -> RawDataUploadResponse:
        """
        Create error response for failed upload.
        
        Args:
            investigation_id: Investigation identifier
            upload_id: Upload identifier
            error_message: Error message
            processing_result: Optional processing results
            
        Returns:
            RawDataUploadResponse with error details
        """
        return RawDataUploadResponse(
            success=False,
            message=error_message,
            investigation_id=investigation_id,
            upload_id=upload_id,
            processing_result=processing_result
        )


# Singleton service instance
raw_data_service = RawDataService()