# Vector Search Tool

The Vector Search Tool is a LangChain-compatible tool that performs similarity search on transaction records using a custom distance function. It's designed to find similar transaction records based on various behavioral and technical features.

## Features

The distance function evaluates similarity based on the following features:

### Core Identity Features (High Weight)
- **Smart ID** (weight: 2) - Unique device/session identifier
- **True IP Geolocation** (weight: 3) - Geographic location of the true IP
- **True IP Address** (weight: 1) - The actual IP address

### Behavioral Features
- **Proxy Usage** (weight: 2) - Whether a proxy is being used
- **Time of Day** - Hour of the transaction (normalized to 0-1)
- **Page Time On** - Time spent on page (normalized)

### Device/OS Features (Weight: 2 each)
- **OS Anomaly** - Operating system anomaly detection
- **OS Signature** - Detailed OS detection (Windows, Mac, Linux, iOS, Android)

### Geographic Features
- **Longitude/Latitude** - Geographic coordinates (normalized)

### Security Features (Weight: 2 each)
- **Suspicious Color Depth** - Screen color depth anomalies
- **Agent Public Key Hash Type** - Cryptographic signature anomalies
- **Bot Score** - Behavioral bot detection score

## Usage

### Basic Usage

```python
from app.service.agent.tools.vector_search_tool import VectorSearchTool

# Create the tool
tool = VectorSearchTool()

# Define target record
target_record = {
    "tm_smart_id": "user123",
    "tm_true_ip_geo": "US",
    "tm_true_ip": "192.168.1.100",
    "tm_http_os_signature": "windows 10",
    # ... other fields
}

# Define candidate records to search
candidate_records = [
    {
        "id": "candidate1",
        "tm_smart_id": "user123",
        "tm_true_ip": "192.168.1.101",
        # ... other fields
    },
    # ... more candidates
]

# Perform search
result = await tool._arun(
    target_record=target_record,
    candidate_records=candidate_records,
    max_results=10,
    distance_threshold=5.0
)
```

### Parameters

- **target_record**: The transaction record to find similar records for
- **candidate_records**: List of candidate records to compare against
- **max_results** (optional): Maximum number of results to return (default: 10)
- **distance_threshold** (optional): Maximum distance for similarity (default: None)

### Response Format

```python
{
    "target_record": {...},
    "similar_records": [
        {
            "record": {...},
            "distance": 1.23,
            "index": 0
        }
    ],
    "total_candidates": 100,
    "total_results": 5,
    "max_results": 10,
    "distance_threshold": 5.0,
    "metadata": {
        "distance_range": {
            "min": 0.5,
            "max": 4.8,
            "avg": 2.1
        }
    }
}
```

## Distance Function

The distance function returns a value between 0 and 21, where:
- **0** = Identical records
- **Lower values** = More similar records
- **Higher values** = Less similar records
- **Maximum possible distance** = 21

### Distance Calculation

The total distance is calculated as:
```
distance = smartIdDistance * 2 
         + trueIpGeoDistance * 3 
         + trueIpDistance 
         + hasProxyDistance * 2 
         + timeOfDayDistance 
         + osAnomalyDistance * 2 
         + osDistance * 2 
         + longitudeDistance 
         + latitudeDistance 
         + pageTimeOnDistance 
         + suspiciousColorDepthDistance * 2 
         + suspiciousAgentPublicKeyHashTypeDistance * 2 
         + suspiciousBotScoreDistance * 2
```

## Field Reference

### Required Fields (for optimal results)
- `tm_smart_id`: Device/session identifier
- `tm_true_ip_geo`: Country code (e.g., "US", "CA")
- `tm_true_ip`: IP address
- `tm_http_os_signature`: OS signature string
- `rss_epoch_time`: Timestamp in milliseconds

### Optional Fields
- `tm_proxy_ip`: Proxy IP address (if any)
- `tm_os_anomaly`: OS anomaly status
- `tm_screen_color_depth`: Screen color depth
- `tm_agent_public_key_hash_type`: Cryptographic signature type
- `tm_bb_bot_score`: Bot detection score
- `tm_true_ip_longitude`, `tm_input_ip_longitude`: Longitude coordinates
- `tm_true_ip_latitude`, `tm_input_ip_latitude`: Latitude coordinates
- `tm_page_time_on`: Time spent on page in milliseconds

## Examples

### Finding Similar User Sessions
```python
# Find sessions from the same user with similar characteristics
target = {
    "tm_smart_id": "device_abc123",
    "tm_true_ip_geo": "US",
    "tm_http_os_signature": "windows 10"
}

result = await tool._arun(target, candidates, distance_threshold=3.0)
```

### Fraud Detection
```python
# Find potentially fraudulent transactions with similar patterns
suspicious_transaction = {
    "tm_proxy_ip": "proxy.suspicious.com",
    "tm_bb_bot_score": "800",
    "tm_screen_color_depth": "24"
}

result = await tool._arun(suspicious_transaction, candidates, max_results=20)
```

## Testing

Unit tests are available in `app/test/unit/service/agent/tools/test_vector_search_tool.py`.

Run tests with:
```bash
python -m pytest app/test/unit/service/agent/tools/test_vector_search_tool.py -v
``` 