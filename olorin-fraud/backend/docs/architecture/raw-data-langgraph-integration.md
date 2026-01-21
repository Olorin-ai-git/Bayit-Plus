# Raw Data Node LangGraph Integration

## Overview

This document describes the Phase 3 implementation of the Raw Data Node feature, which integrates raw CSV data processing capabilities into the existing LangGraph fraud investigation workflow.

## Architecture Integration

### 1. Graph Structure Updates

The raw data node has been integrated into all LangGraph configurations:

- **Parallel Agent Graph**: Includes raw data processing before parallel domain analysis
- **Sequential Agent Graph**: Processes raw data before sequential domain analysis  
- **Modular Subgraph**: Integrates with subgraph architecture
- **MCP-Enhanced Graph**: Works with MCP server tools

### 2. Routing Logic

#### Primary Routing Function
```python
raw_data_or_investigation_routing(state: Dict[str, Any]) -> str
```

This function serves as the main decision point after investigation initialization:
- Analyzes messages for CSV data indicators
- Routes to `raw_data_node` if CSV data is detected
- Routes to `fraud_investigation` for standard investigations

#### CSV Detection Algorithm

The system detects CSV data through multiple indicators:
- Direct CSV data in `additional_kwargs` (API uploads)
- CSV filename patterns (`.csv` extension)
- Content structure analysis (comma patterns)
- Transaction-specific headers (`transaction_id`, `amount`, `timestamp`)

### 3. State Management

#### Investigation Model Updates

The Investigation models now include raw data fields:
- `raw_data_processed: bool` - Whether raw data was processed
- `raw_data_filename: Optional[str]` - Original filename
- `raw_data_quality_score: Optional[float]` - Data quality score (0.0-1.0)
- `raw_data_records_count: Optional[int]` - Number of processed records
- `raw_data_anomalies_count: Optional[int]` - Detected anomalies count
- `raw_data_processing_results: Optional[Dict]` - Full processing results

#### Message Flow

1. **Investigation Start**: `start_investigation` creates initial message
2. **CSV Detection**: Routing functions analyze message content
3. **Raw Data Processing**: `RawDataNode` processes CSV data
4. **Results Integration**: Investigation record updated with results
5. **Flow Continuation**: Standard fraud investigation proceeds

## Implementation Details

### 1. Graph Builder Changes

All graph creation functions now include:
```python
# Add raw data node
builder.add_node("raw_data_node", raw_data_node)

# Add conditional routing after investigation start
builder.add_conditional_edges(
    "start_investigation",
    raw_data_or_investigation_routing,
    {
        "raw_data_node": "raw_data_node",
        "fraud_investigation": "fraud_investigation"
    }
)

# Raw data results feed back to main investigation
builder.add_edge("raw_data_node", "fraud_investigation")
```

### 2. Investigation Coordinator Updates

The coordinator now:
- Detects CSV data in agent context metadata
- Preserves CSV data in message `additional_kwargs`
- Updates investigation records with processing results
- Emits WebSocket progress updates for raw data processing

### 3. Enhanced Routing Functions

New routing functions added:
- `csv_data_routing()` - Basic CSV detection routing
- `raw_data_or_investigation_routing()` - Primary routing logic
- `_detect_csv_data_in_messages()` - CSV detection implementation

### 4. Database Integration

Raw data results are automatically persisted:
- Processing success/failure status
- Data quality metrics and scores
- Anomaly detection results
- Full processing metadata

## Usage Examples

### 1. API Upload with Raw Data

```python
# CSV data uploaded via API
response = requests.post("/api/investigation/raw-data", 
    files={"file": csv_file},
    data={"investigation_id": "INV-001"}
)

# Investigation automatically includes raw data processing
# in the LangGraph workflow
```

### 2. Programmatic Investigation Start

```python
metadata = AgentMetadata(
    entity_id="user_123",
    additional_metadata={
        'csv_data': csv_content,
        'filename': 'transactions.csv'
    }
)

# LangGraph will automatically detect and process CSV data
graph = await create_parallel_agent_graph()
result = await graph.ainvoke(initial_state, config)
```

### 3. Mixed Investigation Types

The system seamlessly handles:
- Standard fraud investigations (no CSV data)
- Raw data investigations (CSV provided)
- Hybrid investigations (CSV + additional context)

## Quality Assurance

### 1. CSV Data Validation

- Pydantic model validation for transaction records
- Business rule validation (amounts, timestamps)
- Data completeness and consistency checks
- Anomaly detection with statistical analysis

### 2. Error Handling

- Graceful fallback for invalid CSV data
- Investigation continues even if raw data processing fails
- Comprehensive error logging and user feedback
- WebSocket progress updates for all scenarios

### 3. Performance Considerations

- Batch processing for large datasets (configurable batch size)
- Memory-efficient streaming for large files
- Async processing to avoid blocking investigation flow
- Timeout handling for processing operations

## Testing

### 1. Integration Tests

The implementation includes comprehensive tests:
- CSV detection accuracy
- Routing logic validation  
- End-to-end workflow testing
- Error scenario handling
- Performance with large datasets

### 2. Test Coverage Areas

- Message format variations
- Multiple CSV data sources
- Edge cases (malformed data, empty files)
- Concurrent investigation handling
- Database integration

## Configuration

### 1. Raw Data Node Settings

```python
raw_data_node = RawDataNode(
    batch_size=1000,                    # Records per batch
    enable_anomaly_detection=True,      # Enable anomaly detection
    quality_threshold=0.8,              # Minimum quality score
    max_file_size_mb=50                 # Maximum file size
)
```

### 2. Graph Configuration

Raw data integration is enabled by default in all graph types. No additional configuration required.

## Monitoring and Observability

### 1. Progress Updates

WebSocket progress updates for:
- Raw data processing start/completion
- Quality assessment results
- Anomaly detection results
- Error conditions and recovery

### 2. Logging

Structured logging includes:
- CSV detection decisions
- Processing performance metrics
- Data quality assessments
- Integration success/failure

### 3. Metrics

Key metrics tracked:
- Raw data processing success rate
- Average processing time by file size
- Data quality score distributions
- Anomaly detection accuracy

## Security Considerations

### 1. Input Validation

- File size limits (50MB default)
- Content type validation
- SQL injection prevention
- Data sanitization

### 2. Access Control

- Authentication required for CSV uploads
- Investigation-based access control
- Audit logging for all operations
- Rate limiting on file uploads

## Future Enhancements

### 1. Phase 4 Planned Features

- Real-time processing progress visualization
- Advanced anomaly detection algorithms
- Integration with external fraud databases
- Machine learning model integration

### 2. Performance Improvements

- Distributed processing for very large files
- Caching of processing results
- Optimized memory usage patterns
- Parallel anomaly detection

## Troubleshooting

### Common Issues

1. **CSV Not Detected**: Check message format and CSV indicators
2. **Processing Failures**: Verify data format and validation rules
3. **Performance Issues**: Adjust batch size for large files
4. **Memory Issues**: Reduce file size or enable streaming mode

### Debug Steps

1. Enable debug logging for routing decisions
2. Check message `additional_kwargs` for CSV data
3. Verify investigation database updates
4. Monitor WebSocket progress updates

## Conclusion

The Raw Data Node LangGraph integration provides seamless CSV data processing within the existing fraud investigation workflow. The implementation maintains backward compatibility while adding powerful new capabilities for transaction data analysis.

The integration is production-ready with comprehensive testing, error handling, and monitoring capabilities.