# Raw Data Node API Documentation

## Overview

The Raw Data Node API provides endpoints for uploading and processing CSV files containing transaction data for fraud investigation purposes. This API integrates with the existing Olorin investigation system and leverages the RawDataNode from the LangGraph investigation pipeline.

## API Endpoint

### Upload Raw CSV Data

**Endpoint:** `POST /api/investigation/raw-data`

**Description:** Uploads and processes raw CSV transaction data for fraud investigation analysis.

**Authentication:** Requires write access authentication

**Content Type:** `multipart/form-data`

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `investigation_id` | `string` (form) | Yes | Unique identifier for the investigation |
| `file` | `file` (form) | Yes | CSV file containing transaction data |

#### File Requirements

- **Format:** CSV (Comma Separated Values)
- **Size:** Maximum 50MB
- **Encoding:** UTF-8
- **Required Headers:** 
  - `transaction_id` - Unique transaction identifier
  - `amount` - Transaction amount (positive number)
  - `timestamp` - Transaction timestamp (ISO format)

#### Optional Headers

- `merchant` - Merchant name
- `card_number` - Card number (masked recommended)
- `user_id` - User identifier
- `location` - Transaction location
- `currency` - Currency code (defaults to "USD")
- `status` - Transaction status (defaults to "completed")
- `category` - Transaction category

#### Response Model

```json
{
  "success": boolean,
  "message": string,
  "investigation_id": string,
  "upload_id": string,
  "processing_result": {
    "success": boolean,
    "investigation_id": string,
    "filename": string,
    "data": [
      {
        "transaction_id": string,
        "amount": number,
        "timestamp": string,
        "merchant": string,
        "card_number": string,
        "user_id": string,
        "location": string,
        "currency": string,
        "status": string,
        "category": string
      }
    ],
    "quality_metrics": {
      "total_records": number,
      "valid_records": number,
      "invalid_records": number,
      "missing_fields": object,
      "data_issues": object,
      "anomalies_detected": array,
      "quality_score": number,
      "processing_time": number
    },
    "batches_processed": number,
    "anomalies_count": number,
    "processing_time_seconds": number,
    "error": string
  }
}
```

#### Example Request

```bash
curl -X POST "http://localhost:8000/api/investigation/raw-data" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "investigation_id=INV-20250102-001" \
  -F "file=@transactions.csv"
```

#### Example Response (Success)

```json
{
  "success": true,
  "message": "Successfully processed 95 valid records out of 100 total records. Data quality score: 0.95",
  "investigation_id": "INV-20250102-001",
  "upload_id": "upload_123456",
  "processing_result": {
    "success": true,
    "investigation_id": "INV-20250102-001",
    "filename": "transactions.csv",
    "data": [
      {
        "transaction_id": "TXN-001",
        "amount": 125.50,
        "timestamp": "2025-01-02T10:30:00Z",
        "merchant": "Coffee Shop Inc",
        "currency": "USD",
        "status": "completed"
      }
    ],
    "quality_metrics": {
      "total_records": 100,
      "valid_records": 95,
      "invalid_records": 5,
      "missing_fields": {
        "merchant": 2,
        "location": 3
      },
      "data_issues": {
        "invalid_format": [
          "Row 45: Amount cannot be negative"
        ]
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
      "quality_score": 0.95,
      "processing_time": 2.5
    },
    "batches_processed": 1,
    "anomalies_count": 1,
    "processing_time_seconds": 2.8
  }
}
```

#### Example Response (Error)

```json
{
  "success": false,
  "message": "Failed to process CSV file: Invalid CSV format",
  "investigation_id": "INV-20250102-001",
  "upload_id": "upload_123456",
  "processing_result": {
    "success": false,
    "investigation_id": "INV-20250102-001",
    "filename": "invalid.csv",
    "data": [],
    "quality_metrics": {
      "total_records": 0,
      "valid_records": 0,
      "invalid_records": 0,
      "quality_score": 0.0,
      "processing_time": 0.1
    },
    "batches_processed": 0,
    "anomalies_count": 0,
    "processing_time_seconds": 0.1,
    "error": "Invalid CSV format"
  }
}
```

## Error Responses

### HTTP Status Codes

- `200` - Success
- `400` - Bad Request (invalid file format, empty file, validation errors)
- `401` - Unauthorized (missing or invalid authentication)
- `403` - Forbidden (insufficient permissions)
- `413` - Payload Too Large (file exceeds 50MB limit)
- `422` - Unprocessable Entity (validation errors)
- `500` - Internal Server Error

### Common Error Messages

| Error | Description | Solution |
|-------|-------------|----------|
| "Only CSV files are supported" | File is not a CSV format | Upload a file with .csv extension |
| "File size exceeds maximum allowed size" | File is larger than 50MB | Reduce file size or split into smaller files |
| "Uploaded file is empty" | File contains no data | Upload a file with valid content |
| "Transaction ID cannot be empty" | Missing transaction identifiers | Ensure all rows have valid transaction_id values |
| "Amount cannot be negative" | Invalid transaction amounts | Fix negative amounts in the CSV |

## Data Processing Features

### Validation

- **Field Validation:** Ensures required fields are present and valid
- **Data Type Validation:** Validates amounts, timestamps, and other field types
- **Business Rule Validation:** Applies fraud detection business rules
- **Format Validation:** Validates CSV structure and encoding

### Quality Assessment

- **Completeness Score:** Measures missing field ratios
- **Validity Score:** Measures data format compliance
- **Overall Quality Score:** Composite score (0.0-1.0) indicating data quality
- **Issue Categorization:** Groups data issues by type for easier remediation

### Anomaly Detection

- **Statistical Outliers:** Detects unusual transaction amounts using Z-scores
- **Temporal Anomalies:** Identifies suspicious timing patterns
- **Frequency Anomalies:** Detects duplicate transactions and unusual patterns
- **Business Rule Violations:** Flags transactions that violate business rules

### Performance Features

- **Batch Processing:** Processes large files in configurable batches
- **Memory Efficiency:** Streams large files to avoid memory issues
- **Async Processing:** Non-blocking processing for better API performance
- **Progress Tracking:** Provides processing statistics and timing

## Security Features

### Input Validation

- File type and extension validation
- File size limits (50MB maximum)
- Content sanitization and validation
- SQL injection prevention

### Access Control

- Authentication required (JWT tokens)
- Write permission enforcement
- Investigation-based access control
- Rate limiting on uploads

### Data Protection

- Input sanitization
- Secure file handling
- No persistent file storage
- Audit logging

## Integration Points

### Investigation System

- Creates investigations automatically if they don't exist
- Links uploaded data to existing investigations
- Maintains investigation audit trail
- Supports investigation lifecycle management

### LangGraph Pipeline

- Integrates with RawDataNode from the investigation graph
- Supports message-based processing
- Maintains processing state and context
- Enables further analysis pipeline integration

### Existing API Structure

- Follows established API patterns
- Uses consistent authentication mechanisms
- Integrates with existing error handling
- Maintains API versioning standards

## Usage Examples

### Basic Upload

```python
import requests

url = "http://localhost:8000/api/investigation/raw-data"
headers = {"Authorization": "Bearer YOUR_TOKEN"}
files = {"file": open("transactions.csv", "rb")}
data = {"investigation_id": "INV-001"}

response = requests.post(url, headers=headers, files=files, data=data)
result = response.json()

print(f"Upload successful: {result['success']}")
print(f"Quality score: {result['processing_result']['quality_metrics']['quality_score']}")
```

### Processing Large Files

For files larger than 50MB, split them into smaller chunks:

```bash
# Split large CSV file into 40MB chunks
split -b 40m large_transactions.csv chunk_

# Upload each chunk separately
for chunk in chunk_*; do
  curl -X POST "http://localhost:8000/api/investigation/raw-data" \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -F "investigation_id=INV-LARGE-001" \
    -F "file=@$chunk"
done
```

## Implementation Details

### Architecture Components

- **RawDataService:** Business logic layer handling file processing
- **API Models:** Pydantic models for request/response validation
- **Router Integration:** FastAPI router with endpoint definition
- **RawDataNode:** Core processing engine from LangGraph system

### File Structure

```
app/
├── models/
│   └── api_models.py          # Pydantic models for raw data API
├── router/
│   └── investigations_router.py # API endpoint definition
├── service/
│   ├── raw_data_service.py    # Business logic service
│   └── agent/nodes/
│       └── raw_data_node.py   # Core processing node (Phase 1)
└── test/
    └── unit/
        └── test_raw_data_api.py # Unit tests
```

### Configuration Options

The RawDataNode can be configured with the following parameters:

- `batch_size`: Number of records per processing batch (default: 1000)
- `enable_anomaly_detection`: Enable/disable anomaly detection (default: True)
- `quality_threshold`: Minimum acceptable quality score (default: 0.8)
- `max_file_size_mb`: Maximum file size in MB (default: 50)

## Monitoring and Observability

### Metrics

- Upload success/failure rates
- Processing times by file size
- Data quality score distributions
- Anomaly detection statistics

### Logging

- File upload events
- Processing start/completion
- Validation errors and warnings
- Performance metrics

### Health Checks

- Service availability
- Processing queue status
- Database connectivity
- External service dependencies

## Future Enhancements

### Phase 3 Planned Features

- Real-time processing status updates
- WebSocket-based progress notifications
- Advanced anomaly detection algorithms
- Integration with external fraud detection services
- Batch processing optimization
- Enhanced data visualization

### API Versioning

The current implementation is part of API v1 (`/api/investigation/raw-data`). Future versions will maintain backward compatibility while adding enhanced features.