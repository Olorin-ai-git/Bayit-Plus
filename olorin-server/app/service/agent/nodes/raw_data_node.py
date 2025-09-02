"""
Raw Data Node - LangGraph node for CSV data processing and transaction analysis.

This module implements the RawDataNode class as part of the LangGraph investigation 
system in the Olorin fraud detection platform. It handles CSV file parsing, 
transaction data validation, and data quality assessment.
"""

import logging
import asyncio
from datetime import datetime, timedelta
from io import StringIO, BytesIO
from typing import Dict, List, Optional, Union, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import pandas as pd
import numpy as np
from pydantic import BaseModel, ValidationError, field_validator

from langchain_core.messages import BaseMessage, AIMessage, HumanMessage
from typing_extensions import TypedDict, Annotated
from langgraph.graph.message import add_messages

logger = logging.getLogger(__name__)

# LangGraph MessagesState integration
class MessagesState(TypedDict):
    """State for LangGraph message handling."""
    messages: Annotated[List[BaseMessage], add_messages]


class DataQualityIssue(Enum):
    """Types of data quality issues detected."""
    MISSING_VALUES = "missing_values"
    INVALID_FORMAT = "invalid_format"
    DUPLICATE_RECORDS = "duplicate_records"
    OUTLIER_VALUES = "outlier_values"
    INCONSISTENT_DATA = "inconsistent_data"
    TIMESTAMP_ISSUES = "timestamp_issues"


@dataclass
class TransactionValidationRule:
    """Rule for validating transaction data."""
    field_name: str
    required: bool = False
    data_type: type = str
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    allowed_values: Optional[List[str]] = None
    regex_pattern: Optional[str] = None
    custom_validator: Optional[callable] = None


@dataclass
class DataQualityReport:
    """Report of data quality assessment."""
    total_records: int = 0
    valid_records: int = 0
    invalid_records: int = 0
    missing_fields: Dict[str, int] = field(default_factory=dict)
    data_issues: Dict[DataQualityIssue, List[str]] = field(default_factory=dict)
    anomalies_detected: List[Dict[str, Any]] = field(default_factory=list)
    quality_score: float = 0.0
    processing_time: float = 0.0


class TransactionRecord(BaseModel):
    """Pydantic model for transaction validation."""
    transaction_id: str
    amount: float
    timestamp: datetime
    merchant: Optional[str] = None
    card_number: Optional[str] = None
    user_id: Optional[str] = None
    location: Optional[str] = None
    currency: str = "USD"
    status: str = "completed"
    category: Optional[str] = None
    
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


class RawDataNode:
    """
    LangGraph node for processing raw CSV transaction data.
    
    Provides CSV parsing, data validation, quality assessment, and anomaly detection
    capabilities for fraud investigation workflows.
    """
    
    def __init__(
        self,
        batch_size: int = 1000,
        enable_anomaly_detection: bool = True,
        quality_threshold: float = 0.8,
        max_file_size_mb: int = 50
    ):
        """
        Initialize RawDataNode.
        
        Args:
            batch_size: Number of records to process in each batch
            enable_anomaly_detection: Whether to perform anomaly detection
            quality_threshold: Minimum acceptable data quality score (0.0-1.0)
            max_file_size_mb: Maximum allowed file size in MB
        """
        self.batch_size = batch_size
        self.enable_anomaly_detection = enable_anomaly_detection
        self.quality_threshold = quality_threshold
        self.max_file_size_bytes = max_file_size_mb * 1024 * 1024
        
        # Validation rules for transaction data
        self.validation_rules = self._initialize_validation_rules()
        
        # Statistics tracking
        self.processing_stats = {
            'files_processed': 0,
            'total_records_processed': 0,
            'average_quality_score': 0.0,
            'anomalies_detected': 0
        }
        
        self.logger = logging.getLogger(f"{__name__}.RawDataNode")
    
    async def process_csv_data(
        self,
        csv_content: Union[str, bytes],
        filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process CSV data and return structured analysis.
        
        Args:
            csv_content: CSV file content as string or bytes
            filename: Optional filename for logging
            
        Returns:
            Dictionary containing processed data and quality report
        """
        start_time = datetime.now()
        
        try:
            # Convert bytes to string if necessary
            if isinstance(csv_content, bytes):
                if len(csv_content) > self.max_file_size_bytes:
                    raise ValueError(f"File size {len(csv_content)} exceeds limit")
                csv_content = csv_content.decode('utf-8')
            
            self.logger.info(f"Processing CSV data: {filename or 'unnamed'}")
            
            # Parse CSV data
            df = await self._parse_csv_content(csv_content)
            
            # Validate and clean data
            validated_data, quality_report = await self._validate_transaction_data(df)
            
            # Perform batch processing
            processed_batches = await self._process_data_batches(validated_data)
            
            # Detect anomalies if enabled
            anomalies = []
            if self.enable_anomaly_detection:
                anomalies = await self._detect_anomalies(validated_data)
                quality_report.anomalies_detected = anomalies
            
            # Calculate processing time
            processing_time = (datetime.now() - start_time).total_seconds()
            quality_report.processing_time = processing_time
            
            # Update statistics
            self._update_processing_stats(quality_report)
            
            return {
                'success': True,
                'filename': filename,
                'data': validated_data.to_dict('records'),
                'quality_report': self._quality_report_to_dict(quality_report),
                'batches_processed': len(processed_batches),
                'anomalies_count': len(anomalies),
                'processing_time_seconds': processing_time
            }
            
        except Exception as e:
            self.logger.error(f"Error processing CSV data: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'filename': filename,
                'processing_time_seconds': (datetime.now() - start_time).total_seconds()
            }
    
    async def __call__(self, state: MessagesState, config=None) -> MessagesState:
        """
        LangGraph node entry point.
        
        Args:
            state: Current LangGraph state
            config: Optional configuration
            
        Returns:
            Updated LangGraph state with processing results
        """
        try:
            self.logger.info("RawDataNode processing started")
            
            # Extract CSV content from messages
            csv_content = None
            filename = None
            
            for message in state.get('messages', []):
                if isinstance(message, HumanMessage):
                    content = message.content
                    
                    # Check additional_kwargs first for structured data
                    if hasattr(message, 'additional_kwargs') and message.additional_kwargs:
                        csv_content = message.additional_kwargs.get('csv_data') or message.additional_kwargs.get('file_content')
                        filename = message.additional_kwargs.get('filename')
                        if csv_content:
                            break
                    
                    # Then check content string
                    if isinstance(content, str):
                        if ('csv' in content.lower() or ',' in content):
                            csv_content = content
                            break
                        # Try to parse as dict string
                        try:
                            import ast
                            parsed_content = ast.literal_eval(content)
                            if isinstance(parsed_content, dict):
                                csv_content = parsed_content.get('csv_data') or parsed_content.get('file_content')
                                filename = parsed_content.get('filename')
                                if csv_content:
                                    break
                        except:
                            pass
            
            if not csv_content:
                raise ValueError("No CSV content found in state messages")
            
            # Process the CSV data
            result = await self.process_csv_data(csv_content, filename)
            
            # Create response message
            if result['success']:
                response_content = (
                    f"Successfully processed CSV data with {len(result['data'])} records. "
                    f"Data quality score: {result['quality_report']['quality_score']:.2f}. "
                    f"Found {result['anomalies_count']} anomalies."
                )
                
                # Add detailed results to message
                response_message = AIMessage(
                    content=response_content,
                    additional_kwargs={
                        'raw_data_results': result,
                        'node_type': 'raw_data_processing',
                        'processed_records': len(result['data'])
                    }
                )
            else:
                response_message = AIMessage(
                    content=f"Failed to process CSV data: {result['error']}",
                    additional_kwargs={
                        'error': result['error'],
                        'node_type': 'raw_data_processing',
                        'success': False
                    }
                )
            
            # Update state with new message
            updated_messages = state.get('messages', []) + [response_message]
            
            return {'messages': updated_messages}
            
        except Exception as e:
            self.logger.error(f"RawDataNode execution failed: {str(e)}")
            
            error_message = AIMessage(
                content=f"Raw data processing failed: {str(e)}",
                additional_kwargs={
                    'error': str(e),
                    'node_type': 'raw_data_processing',
                    'success': False
                }
            )
            
            updated_messages = state.get('messages', []) + [error_message]
            return {'messages': updated_messages}
    
    async def _parse_csv_content(self, csv_content: str) -> pd.DataFrame:
        """Parse CSV content into pandas DataFrame."""
        try:
            # Try different encodings and delimiters
            delimiters = [',', ';', '\t', '|']
            
            for delimiter in delimiters:
                try:
                    df = pd.read_csv(
                        StringIO(csv_content),
                        delimiter=delimiter,
                        encoding='utf-8',
                        low_memory=False
                    )
                    
                    if len(df.columns) > 1:  # Successfully parsed
                        self.logger.info(f"Successfully parsed CSV with {len(df)} rows, {len(df.columns)} columns")
                        return df
                        
                except Exception:
                    continue
            
            # Fallback: try reading as simple comma-separated
            df = pd.read_csv(StringIO(csv_content), low_memory=False)
            return df
            
        except Exception as e:
            raise ValueError(f"Failed to parse CSV content: {str(e)}")
    
    async def _validate_transaction_data(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, DataQualityReport]:
        """Validate transaction data and generate quality report."""
        quality_report = DataQualityReport()
        quality_report.total_records = len(df)
        
        # Standardize column names
        df = self._standardize_column_names(df)
        
        # Validate required fields
        validated_records = []
        invalid_count = 0
        
        for idx, row in df.iterrows():
            try:
                # Convert row to transaction record
                transaction_data = self._row_to_transaction_dict(row)
                
                # Validate using Pydantic model
                transaction = TransactionRecord(**transaction_data)
                validated_records.append(transaction.model_dump())
                
            except (ValidationError, ValueError, TypeError) as e:
                invalid_count += 1
                if DataQualityIssue.INVALID_FORMAT not in quality_report.data_issues:
                    quality_report.data_issues[DataQualityIssue.INVALID_FORMAT] = []
                quality_report.data_issues[DataQualityIssue.INVALID_FORMAT].append(
                    f"Row {idx}: {str(e)}"
                )
        
        # Create validated DataFrame
        validated_df = pd.DataFrame(validated_records) if validated_records else pd.DataFrame()
        
        # Update quality report
        quality_report.valid_records = len(validated_records)
        quality_report.invalid_records = invalid_count
        
        # Check for missing values
        if not validated_df.empty:
            quality_report.missing_fields = validated_df.isnull().sum().to_dict()
        
        # Calculate quality score
        quality_report.quality_score = self._calculate_quality_score(quality_report, validated_df)
        
        return validated_df, quality_report
    
    def _standardize_column_names(self, df: pd.DataFrame) -> pd.DataFrame:
        """Standardize column names to expected format."""
        column_mapping = {
            'id': 'transaction_id',
            'txn_id': 'transaction_id',
            'transaction id': 'transaction_id',
            'amt': 'amount',
            'value': 'amount',
            'time': 'timestamp',
            'date': 'timestamp',
            'datetime': 'timestamp',
            'merchant_name': 'merchant',
            'shop': 'merchant',
            'card': 'card_number',
            'card_num': 'card_number',
            'user': 'user_id',
            'customer_id': 'user_id',
            'loc': 'location',
            'place': 'location'
        }
        
        # Apply mapping with case-insensitive matching
        df_columns = df.columns.str.lower().str.strip()
        for old_name, new_name in column_mapping.items():
            if old_name in df_columns.values:
                matching_indices = df_columns == old_name
                if matching_indices.any():
                    old_col = df.columns[matching_indices][0]
                    df = df.rename(columns={old_col: new_name})
        
        return df
    
    def _row_to_transaction_dict(self, row: pd.Series) -> Dict[str, Any]:
        """Convert DataFrame row to transaction dictionary."""
        data = {}
        
        # Required fields with defaults
        data['transaction_id'] = str(row.get('transaction_id', ''))
        data['amount'] = float(row.get('amount', 0.0))
        
        # Handle timestamp
        timestamp_value = row.get('timestamp')
        if pd.isna(timestamp_value):
            data['timestamp'] = datetime.now()
        elif isinstance(timestamp_value, str):
            try:
                data['timestamp'] = pd.to_datetime(timestamp_value)
            except:
                data['timestamp'] = datetime.now()
        else:
            data['timestamp'] = pd.to_datetime(timestamp_value)
        
        # Optional fields
        optional_fields = ['merchant', 'card_number', 'user_id', 'location', 'currency', 'status', 'category']
        for field in optional_fields:
            value = row.get(field)
            if pd.notna(value):
                data[field] = str(value).strip()
        
        return data
    
    async def _process_data_batches(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Process data in batches for memory efficiency."""
        if df.empty:
            return []
        
        batches = []
        
        for start_idx in range(0, len(df), self.batch_size):
            end_idx = min(start_idx + self.batch_size, len(df))
            batch = df.iloc[start_idx:end_idx]
            
            batch_summary = {
                'batch_id': len(batches) + 1,
                'start_index': start_idx,
                'end_index': end_idx - 1,
                'record_count': len(batch),
                'amount_sum': batch['amount'].sum() if 'amount' in batch.columns else 0,
                'amount_avg': batch['amount'].mean() if 'amount' in batch.columns else 0,
                'unique_merchants': batch['merchant'].nunique() if 'merchant' in batch.columns else 0,
                'date_range': {
                    'start': batch['timestamp'].min().isoformat() if 'timestamp' in batch.columns else None,
                    'end': batch['timestamp'].max().isoformat() if 'timestamp' in batch.columns else None
                }
            }
            
            batches.append(batch_summary)
            
            # Yield control for async processing
            await asyncio.sleep(0.001)
        
        self.logger.info(f"Processed {len(batches)} data batches")
        return batches
    
    async def _detect_anomalies(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Detect anomalies in transaction data."""
        if df.empty or not self.enable_anomaly_detection:
            return []
        
        anomalies = []
        
        try:
            # Amount-based anomalies
            if 'amount' in df.columns:
                amount_outliers = self._detect_amount_outliers(df)
                anomalies.extend(amount_outliers)
            
            # Time-based anomalies
            if 'timestamp' in df.columns:
                time_anomalies = self._detect_time_anomalies(df)
                anomalies.extend(time_anomalies)
            
            # Frequency-based anomalies
            frequency_anomalies = self._detect_frequency_anomalies(df)
            anomalies.extend(frequency_anomalies)
            
        except Exception as e:
            self.logger.warning(f"Anomaly detection failed: {str(e)}")
        
        return anomalies
    
    def _detect_amount_outliers(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Detect amount-based outliers."""
        outliers = []
        amounts = df['amount']
        
        # Statistical outliers (Z-score > 3)
        z_scores = np.abs((amounts - amounts.mean()) / amounts.std())
        outlier_mask = z_scores > 3
        
        for idx in df[outlier_mask].index:
            outliers.append({
                'type': 'amount_outlier',
                'transaction_id': df.loc[idx, 'transaction_id'],
                'amount': df.loc[idx, 'amount'],
                'z_score': z_scores[idx],
                'description': f'Amount ${df.loc[idx, "amount"]:,.2f} is statistically unusual'
            })
        
        return outliers
    
    def _detect_time_anomalies(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Detect time-based anomalies."""
        anomalies = []
        
        # Check for future dates
        now = datetime.now()
        future_mask = df['timestamp'] > now
        
        for idx in df[future_mask].index:
            anomalies.append({
                'type': 'future_timestamp',
                'transaction_id': df.loc[idx, 'transaction_id'],
                'timestamp': df.loc[idx, 'timestamp'].isoformat(),
                'description': 'Transaction timestamp is in the future'
            })
        
        return anomalies
    
    def _detect_frequency_anomalies(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Detect frequency-based anomalies."""
        anomalies = []
        
        # Check for duplicate transaction IDs
        if 'transaction_id' in df.columns:
            duplicates = df['transaction_id'].value_counts()
            duplicate_ids = duplicates[duplicates > 1]
            
            for txn_id, count in duplicate_ids.items():
                anomalies.append({
                    'type': 'duplicate_transaction',
                    'transaction_id': txn_id,
                    'duplicate_count': count,
                    'description': f'Transaction ID appears {count} times'
                })
        
        return anomalies
    
    def _calculate_quality_score(self, quality_report: DataQualityReport, df: pd.DataFrame) -> float:
        """Calculate overall data quality score (0.0 - 1.0)."""
        if quality_report.total_records == 0:
            return 0.0
        
        # Base score from valid records ratio
        validity_score = quality_report.valid_records / quality_report.total_records
        
        # Penalty for missing critical fields
        completeness_score = 1.0
        if not df.empty:
            critical_fields = ['transaction_id', 'amount', 'timestamp']
            for field in critical_fields:
                if field in df.columns:
                    missing_ratio = df[field].isnull().sum() / len(df)
                    completeness_score *= (1.0 - missing_ratio)
        
        # Penalty for data issues
        issue_penalty = len(quality_report.data_issues) * 0.1
        
        # Combined score
        final_score = max(0.0, min(1.0, (validity_score + completeness_score) / 2 - issue_penalty))
        
        return round(final_score, 3)
    
    def _initialize_validation_rules(self) -> List[TransactionValidationRule]:
        """Initialize default validation rules."""
        return [
            TransactionValidationRule('transaction_id', required=True, data_type=str),
            TransactionValidationRule('amount', required=True, data_type=float, min_value=0.0),
            TransactionValidationRule('timestamp', required=True, data_type=datetime),
        ]
    
    def _quality_report_to_dict(self, report: DataQualityReport) -> Dict[str, Any]:
        """Convert quality report to dictionary."""
        return {
            'total_records': report.total_records,
            'valid_records': report.valid_records,
            'invalid_records': report.invalid_records,
            'missing_fields': report.missing_fields,
            'data_issues': {k.value: v for k, v in report.data_issues.items()},
            'anomalies_detected': report.anomalies_detected,
            'quality_score': report.quality_score,
            'processing_time': report.processing_time
        }
    
    def _update_processing_stats(self, quality_report: DataQualityReport) -> None:
        """Update processing statistics."""
        self.processing_stats['files_processed'] += 1
        self.processing_stats['total_records_processed'] += quality_report.total_records
        
        # Update average quality score
        old_avg = self.processing_stats['average_quality_score']
        files_processed = self.processing_stats['files_processed']
        new_avg = ((old_avg * (files_processed - 1)) + quality_report.quality_score) / files_processed
        self.processing_stats['average_quality_score'] = round(new_avg, 3)
        
        self.processing_stats['anomalies_detected'] += len(quality_report.anomalies_detected)
    
    def get_processing_statistics(self) -> Dict[str, Any]:
        """Get current processing statistics."""
        return self.processing_stats.copy()


# Node instance for LangGraph integration
raw_data_node = RawDataNode()